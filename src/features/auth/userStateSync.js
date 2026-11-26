import { DEFAULT_WORKOUT_GOALS, useWorkoutStore } from '../workout/useWorkoutStore.js'
import { useFavoritesStore } from '../favorites/useFavoritesStore.js'
import { useRecentStore } from '../recent/useRecentStore.js'
import { DEFAULT_PROFILE, sanitizeProfile, useProfileStore } from './useProfileStore.js'
import { fetchUserState, saveUserState } from '../../services/userStateApi.js'

const SYNC_DEBOUNCE_MS = 150

let isHydrating = false
let pendingTimer = null
let activeBridge = {
  getAccessToken: () => '',
  rotateSession: async () => null,
  updateUser: () => {},
}

function dedupeById(primary, secondary) {
  const result = []
  const seen = new Set()

  for (const list of [primary, secondary]) {
    if (!Array.isArray(list)) continue
    for (const item of list) {
      if (!item || typeof item !== 'object' || item.id == null) continue
      const key = String(item.id)
      if (seen.has(key)) continue
      seen.add(key)
      result.push(item)
    }
  }

  return result
}

function hasAnyProfileData(profile) {
  if (!profile) return false
  return Object.entries(DEFAULT_PROFILE).some(([key, fallback]) => profile[key] !== fallback)
}

function hasAnyLocalState(snapshot) {
  if (!snapshot) return false
  if (snapshot.favorites?.length || snapshot.recentExercises?.length) return true
  if (hasAnyProfileData(snapshot.profile)) return true
  const w = snapshot.workout
  if (!w) return false
  return Boolean(
    w.exercises?.length ||
      w.plans?.length ||
      w.history?.length ||
      w.scheduledWorkouts?.length ||
      w.activeSession ||
      w.goals?.weekly !== DEFAULT_WORKOUT_GOALS.weekly ||
      w.goals?.monthly !== DEFAULT_WORKOUT_GOALS.monthly ||
      Object.keys(w.settings?.configs || {}).length > 0,
  )
}

export function buildLocalUserStateSnapshot() {
  const favoritesState = useFavoritesStore.getState()
  const recentState = useRecentStore.getState()
  const workoutState = useWorkoutStore.getState()
  const profileState = useProfileStore.getState()

  return {
    favorites: favoritesState.favorites,
    recentExercises: recentState.exercises,
    profile: profileState.profile,
    workout: {
      exercises: workoutState.exercises,
      goals: workoutState.goals,
      settings: workoutState.settings,
      plans: workoutState.plans,
      history: workoutState.history,
      scheduledWorkouts: workoutState.scheduledWorkouts,
      activeSession: workoutState.activeSession,
    },
  }
}

function mergeProfileData(remoteProfile, localProfile) {
  const remote = sanitizeProfile(remoteProfile)
  const local = sanitizeProfile(localProfile)
  const merged = { ...DEFAULT_PROFILE }

  for (const key of Object.keys(DEFAULT_PROFILE)) {
    if (key === 'units') {
      merged.units = remote.units !== 'metric' ? remote.units : local.units
      continue
    }
    const remoteVal = remote[key]
    const localVal = local[key]
    merged[key] =
      remoteVal !== null && remoteVal !== '' && remoteVal !== undefined ? remoteVal : localVal
  }
  return merged
}

export function mergeUserStates(remoteState, localState) {
  if (!remoteState) return localState
  if (!localState) return remoteState

  const remoteWorkout = remoteState.workout || {}
  const localWorkout = localState.workout || {}

  const remoteGoals = remoteWorkout.goals || { ...DEFAULT_WORKOUT_GOALS }
  const localGoals = localWorkout.goals || { ...DEFAULT_WORKOUT_GOALS }
  const remoteGoalsAreDefault =
    remoteGoals.weekly === DEFAULT_WORKOUT_GOALS.weekly &&
    remoteGoals.monthly === DEFAULT_WORKOUT_GOALS.monthly
  const localGoalsAreCustom =
    localGoals.weekly !== DEFAULT_WORKOUT_GOALS.weekly ||
    localGoals.monthly !== DEFAULT_WORKOUT_GOALS.monthly

  const remoteSettings = remoteWorkout.settings || {}
  const localSettings = localWorkout.settings || {}

  return {
    favorites: dedupeById(remoteState.favorites, localState.favorites),
    recentExercises: dedupeById(localState.recentExercises, remoteState.recentExercises).slice(0, 6),
    profile: mergeProfileData(remoteState.profile, localState.profile),
    workout: {
      exercises: dedupeById(remoteWorkout.exercises, localWorkout.exercises),
      goals: remoteGoalsAreDefault && localGoalsAreCustom ? localGoals : remoteGoals,
      settings: {
        name:
          remoteSettings.name && remoteSettings.name !== 'My training session'
            ? remoteSettings.name
            : localSettings.name || remoteSettings.name || 'My training session',
        goalMinutes:
          remoteSettings.goalMinutes && remoteSettings.goalMinutes !== 45
            ? remoteSettings.goalMinutes
            : localSettings.goalMinutes || remoteSettings.goalMinutes || 45,
        configs: {
          ...(localSettings.configs || {}),
          ...(remoteSettings.configs || {}),
        },
        completed: [
          ...new Set([
            ...(Array.isArray(remoteSettings.completed) ? remoteSettings.completed : []),
            ...(Array.isArray(localSettings.completed) ? localSettings.completed : []),
          ]),
        ],
      },
      plans: dedupeById(remoteWorkout.plans, localWorkout.plans),
      history: dedupeById(remoteWorkout.history, localWorkout.history),
      scheduledWorkouts: dedupeById(remoteWorkout.scheduledWorkouts, localWorkout.scheduledWorkouts),
      activeSession: remoteWorkout.activeSession || localWorkout.activeSession || null,
    },
  }
}

function applyUserStateSnapshot(snapshot, remoteUser = null) {
  if (!snapshot) return
  isHydrating = true
  try {
    useFavoritesStore.getState().replaceFavorites(snapshot.favorites)
    useRecentStore.getState().replaceRecentExercises(snapshot.recentExercises)
    useWorkoutStore.getState().replaceWorkoutState(snapshot.workout)
    const nextProfile = sanitizeProfile(snapshot.profile)
    if (!nextProfile.avatarUrl && remoteUser?.avatarUrl) {
      nextProfile.avatarUrl = remoteUser.avatarUrl
    }
    useProfileStore.getState().replaceProfile(nextProfile)
  } finally {
    isHydrating = false
  }
}

async function persistSnapshotWithRetry({ accessToken, snapshot, keepalive = false }) {
  try {
    const result = await saveUserState({ accessToken, state: snapshot, keepalive })
    if (result?.user) {
      activeBridge.updateUser(result.user)
    }
    return result
  } catch (error) {
    if (error?.status === 401 && !keepalive && activeBridge.rotateSession) {
      const rotated = await activeBridge.rotateSession()
      if (rotated?.accessToken) {
        const retryResult = await saveUserState({
          accessToken: rotated.accessToken,
          state: snapshot,
          keepalive: false,
        })
        if (retryResult?.user) {
          activeBridge.updateUser(retryResult.user)
        }
        return retryResult
      }
    }
    throw error
  }
}

export async function hydrateUserState({
  accessToken,
  mergeLocal = false,
  onUserUpdate = null,
} = {}) {
  if (!accessToken) return null

  try {
    const remote = await fetchUserState({ accessToken })
    if (remote?.user) {
      if (onUserUpdate) onUserUpdate(remote.user)
      else activeBridge.updateUser(remote.user)
    }

    const localSnapshot = buildLocalUserStateSnapshot()

    if (remote?.state) {
      const nextSnapshot = mergeLocal
        ? mergeUserStates(remote.state, localSnapshot)
        : remote.state

      applyUserStateSnapshot(nextSnapshot, remote.user)

      if (mergeLocal && JSON.stringify(nextSnapshot) !== JSON.stringify(remote.state)) {
        try {
          await persistSnapshotWithRetry({ accessToken, snapshot: nextSnapshot })
        } catch {
          // Non-fatal; next store mutation will retry sync.
        }
      }
      return nextSnapshot
    }

    if (hasAnyLocalState(localSnapshot)) {
      try {
        await persistSnapshotWithRetry({ accessToken, snapshot: localSnapshot })
      } catch {
        // Non-fatal; next store mutation will retry sync.
      }
    }
    return localSnapshot
  } catch {
    return null
  }
}

export async function flushUserStateSync({ accessToken = '', keepalive = false } = {}) {
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer)
    pendingTimer = null
  }

  const token = accessToken || activeBridge.getAccessToken()
  if (!token) return null

  try {
    return await persistSnapshotWithRetry({
      accessToken: token,
      snapshot: buildLocalUserStateSnapshot(),
      keepalive,
    })
  } catch {
    return null
  }
}

function scheduleSync() {
  if (isHydrating || !activeBridge.getAccessToken()) return
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer)
  }
  pendingTimer = setTimeout(() => {
    pendingTimer = null
    flushUserStateSync()
  }, SYNC_DEBOUNCE_MS)
}

export function startUserStateSync(bridge) {
  if (bridge) {
    activeBridge = bridge
  }

  const unsubFavorites = useFavoritesStore.subscribe(() => scheduleSync())
  const unsubWorkout = useWorkoutStore.subscribe(() => scheduleSync())
  const unsubRecent = useRecentStore.subscribe(() => scheduleSync())
  const unsubProfile = useProfileStore.subscribe(() => scheduleSync())

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden' && pendingTimer !== null) {
      flushUserStateSync({ keepalive: true })
    }
  }

  const handlePageHide = () => {
    if (pendingTimer !== null) {
      flushUserStateSync({ keepalive: true })
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', handlePageHide)
  }

  return () => {
    unsubFavorites()
    unsubWorkout()
    unsubRecent()
    unsubProfile()
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', handlePageHide)
    }
  }
}

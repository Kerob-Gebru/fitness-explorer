import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DEFAULT_SETTINGS = { name: 'My training session', goalMinutes: 45, configs: {}, completed: [] }
const DEFAULT_CONFIG = { sets: 3, reps: 12, rest: 60 }
export const DEFAULT_WORKOUT_GOALS = { weekly: 3, monthly: 12 }
const WORKOUT_GOAL_LIMITS = { weekly: 14, monthly: 60 }

function sanitizeGoals(value) {
  const goals = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return Object.fromEntries(Object.entries(DEFAULT_WORKOUT_GOALS).map(([period, fallback]) => {
    const target = goals[period]
    return [period, Number.isInteger(target) && target >= 1 && target <= WORKOUT_GOAL_LIMITS[period] ? target : fallback]
  }))
}

function sanitizeConfig(value) {
  const config = { ...DEFAULT_CONFIG, ...(value && typeof value === 'object' ? value : {}) }
  const numberOrDefault = (input, fallback, min, max) => {
    const number = Number(input)
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback
  }
  return {
    sets: numberOrDefault(config.sets, DEFAULT_CONFIG.sets, 1, 10),
    reps: numberOrDefault(config.reps, DEFAULT_CONFIG.reps, 1, 100),
    rest: numberOrDefault(config.rest, DEFAULT_CONFIG.rest, 0, 600),
  }
}

function sanitizeSettings(value) {
  const settings = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const configs = settings.configs && typeof settings.configs === 'object' && !Array.isArray(settings.configs)
    ? Object.fromEntries(Object.entries(settings.configs).map(([id, config]) => [id, sanitizeConfig(config)]))
    : {}
  const completed = Array.isArray(settings.completed)
    ? [...new Set(settings.completed.filter((id) => typeof id === 'string' || typeof id === 'number'))]
    : []
  const goal = Number(settings.goalMinutes)
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    name: typeof settings.name === 'string' && settings.name.trim() ? settings.name.trim().slice(0, 60) : DEFAULT_SETTINGS.name,
    goalMinutes: Number.isFinite(goal) ? Math.min(240, Math.max(5, goal)) : DEFAULT_SETTINGS.goalMinutes,
    configs,
    completed,
  }
}

function isValidExercise(exercise) {
  return Boolean(exercise && typeof exercise === 'object' && exercise.id != null && typeof exercise.name === 'string' && exercise.name.trim())
}

function sanitizeExercises(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  return value.filter((exercise) => {
    if (!isValidExercise(exercise)) return false
    const id = String(exercise.id)
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

function sanitizePlan(value) {
  if (!value || typeof value !== 'object' || typeof value.id !== 'string' || typeof value.name !== 'string' || !value.name.trim()) return null
  const exercises = sanitizeExercises(value.exercises).map((exercise) => ({
    ...exercise,
    config: sanitizeConfig(exercise.config),
  }))
  const createdAt = typeof value.createdAt === 'string' && !Number.isNaN(Date.parse(value.createdAt)) ? value.createdAt : new Date().toISOString()
  const updatedAt = typeof value.updatedAt === 'string' && !Number.isNaN(Date.parse(value.updatedAt)) ? value.updatedAt : createdAt
  return {
    id: value.id,
    name: value.name.trim().slice(0, 60),
    description: typeof value.description === 'string' ? value.description.slice(0, 300) : '',
    exercises,
    createdAt,
    updatedAt,
  }
}

function sanitizeSets(value) {
  if (!Array.isArray(value)) return []
  return value.filter((set) => set && typeof set === 'object').slice(0, 10).map((set, index) => ({
    setNumber: Number.isInteger(set.setNumber) && set.setNumber > 0 ? set.setNumber : index + 1,
    reps: Number.isFinite(Number(set.reps)) && Number(set.reps) >= 0 ? Number(set.reps) : 0,
    targetReps: Number.isFinite(Number(set.targetReps)) && Number(set.targetReps) >= 0
      ? Math.min(100, Number(set.targetReps))
      : null,
    weight: set.weight === '' || set.weight == null
      ? null
      : Number.isFinite(Number(set.weight)) && Number(set.weight) >= 0 ? Number(set.weight) : null,
    note: typeof set.note === 'string' ? set.note.slice(0, 200) : '',
    completed: set.completed === true,
  }))
}

function validTimestamp(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null
}

function sanitizeRestTimer(value) {
  if (!value || typeof value !== 'object') return null
  const durationSeconds = Number(value.durationSeconds)
  const remainingSeconds = Number(value.remainingSeconds)
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0 ||
    !Number.isFinite(remainingSeconds) || remainingSeconds < 0) return null
  return {
    durationSeconds: Math.min(600, durationSeconds),
    remainingSeconds: Math.min(600, remainingSeconds),
    endsAt: validTimestamp(value.endsAt),
    paused: value.paused === true || !validTimestamp(value.endsAt),
  }
}

function sanitizeSession(value) {
  if (!value || typeof value !== 'object' || typeof value.id !== 'string' || typeof value.name !== 'string') return null
  const startedAt = validTimestamp(value.startedAt)
  if (!startedAt) return null
  const knownStatus = value.status === 'active' || value.status === 'paused'
  const elapsedSeconds = Number(value.elapsedSeconds)
  const status = knownStatus ? value.status : 'paused'
  const resumedAt = status === 'active' ? validTimestamp(value.resumedAt) : null
  const exercises = sanitizeExercises(value.exercises).map((exercise) => ({
    ...exercise,
    config: sanitizeConfig(exercise.config),
    status: ['completed', 'skipped'].includes(exercise.status) ? exercise.status : 'pending',
    sets: sanitizeSets(exercise.sets).map((set, index) => ({
      ...set,
      setNumber: index + 1,
      targetReps: set.targetReps ?? exercise.config.reps,
    })),
  }))
  return {
    ...value,
    name: value.name.trim().slice(0, 60) || 'Workout session',
    startedAt,
    status: resumedAt ? status : 'paused',
    resumedAt,
    elapsedSeconds: Number.isFinite(elapsedSeconds) && elapsedSeconds >= 0 ? elapsedSeconds : 0,
    currentExerciseIndex: Number.isInteger(value.currentExerciseIndex)
      ? Math.min(Math.max(0, value.currentExerciseIndex), Math.max(0, exercises.length - 1))
      : 0,
    restTimer: sanitizeRestTimer(value.restTimer),
    exercises,
  }
}

function sanitizeHistory(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  return value.flatMap((session) => {
    if (!session || !['completed', 'ended-early'].includes(session.status) || typeof session.id !== 'string' || seen.has(session.id)) return []
    const completedAt = validTimestamp(session.completedAt)
    if (!completedAt) return []
    seen.add(session.id)
    const startedAt = typeof session.startedAt === 'string' && !Number.isNaN(Date.parse(session.startedAt)) ? session.startedAt : completedAt
    const durationSeconds = Number(session.durationSeconds)
    return [{
      ...session,
      startedAt,
      completedAt,
      durationSeconds: Number.isFinite(durationSeconds) && durationSeconds >= 0 ? durationSeconds : null,
      exercises: sanitizeExercises(session.exercises).map((exercise) => {
        const sets = sanitizeSets(exercise.sets)
        const status = ['completed', 'skipped'].includes(exercise.status)
          ? exercise.status
          : exercise.status == null && sets.some((set) => set.completed) ? 'completed' : 'pending'
        return { ...exercise, config: sanitizeConfig(exercise.config), status, sets }
      }),
    }]
  })
}

function snapshotExercises(exercises, configs = {}) {
  return sanitizeExercises(exercises).map((exercise) => ({
    ...exercise,
    config: sanitizeConfig(exercise.config ?? configs[exercise.id]),
  }))
}

function sanitizePlans(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  return value.flatMap((item) => {
    const plan = sanitizePlan(item)
    if (!plan || seen.has(plan.id)) return []
    seen.add(plan.id)
    return [plan]
  })
}

function isValidDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function sanitizeScheduledWorkouts(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || seen.has(item.id) ||
      typeof item.planId !== 'string' || !isValidDateKey(item.date) ||
      !['scheduled', 'in-progress', 'completed', 'cancelled'].includes(item.status)) return []
    const time = typeof item.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(item.time) ? item.time : ''
    const createdAt = typeof item.createdAt === 'string' && !Number.isNaN(Date.parse(item.createdAt))
      ? item.createdAt
      : new Date().toISOString()
    const updatedAt = typeof item.updatedAt === 'string' && !Number.isNaN(Date.parse(item.updatedAt))
      ? item.updatedAt
      : createdAt
    const exercises = snapshotExercises(item.exercises)
    if (!exercises.length || typeof item.name !== 'string' || !item.name.trim()) return []
    seen.add(item.id)
    return [{
      id: item.id,
      planId: item.planId,
      name: item.name.trim().slice(0, 60),
      exercises,
      date: item.date,
      time,
      note: typeof item.note === 'string' ? item.note.slice(0, 300) : '',
      status: item.status,
      completedSessionId: typeof item.completedSessionId === 'string' ? item.completedSessionId : null,
      createdAt,
      updatedAt,
    }]
  })
}

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `workout-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function migrateWorkoutState(persistedState, persistedVersion) {
  if (!persistedState || typeof persistedState !== 'object') return persistedState
  if (persistedVersion < 2) {
    return {
      ...persistedState,
      plans: Array.isArray(persistedState.plans) ? persistedState.plans : [],
      history: Array.isArray(persistedState.history) ? persistedState.history : [],
      activeSession: persistedState.activeSession ?? null,
      scheduledWorkouts: Array.isArray(persistedState.scheduledWorkouts) ? persistedState.scheduledWorkouts : [],
    }
  }
  if (persistedVersion < 3) {
    return {
      ...persistedState,
      scheduledWorkouts: Array.isArray(persistedState.scheduledWorkouts) ? persistedState.scheduledWorkouts : [],
    }
  }
  if (persistedVersion < 4) return { ...persistedState }
  if (persistedVersion < 5) return { ...persistedState, goals: sanitizeGoals(persistedState.goals) }
  return persistedState
}

export const useWorkoutStore = create(persist((set, get) => ({
  exercises: [],
  goals: { ...DEFAULT_WORKOUT_GOALS },
  settings: { ...DEFAULT_SETTINGS },
  plans: [],
  history: [],
  scheduledWorkouts: [],
  activeSession: null,
  addExercise: (exercise) => {
    if (get().exercises.some((item) => String(item.id) === String(exercise.id))) return
    set((state) => ({ exercises: [...state.exercises, exercise] }))
  },
  removeExercise: (id) => set((state) => ({
    exercises: state.exercises.filter((item) => String(item.id) !== String(id)),
    settings: { ...state.settings, completed: state.settings.completed.filter((itemId) => String(itemId) !== String(id)) },
  })),
  toggleExercise: (exercise) => {
    const exists = get().exercises.some((item) => String(item.id) === String(exercise.id))
    if (exists) get().removeExercise(exercise.id)
    else get().addExercise(exercise)
  },
  updateSession: (updates) => set((state) => ({ settings: { ...state.settings, ...updates } })),
  updateWorkoutGoals: (updates) => set((state) => {
    if (!updates || typeof updates !== 'object') return state
    const goals = { ...state.goals }
    for (const period of Object.keys(DEFAULT_WORKOUT_GOALS)) {
      if (!(period in updates)) continue
      const target = updates[period]
      if (!Number.isInteger(target) || target < 1 || target > WORKOUT_GOAL_LIMITS[period]) return state
      goals[period] = target
    }
    return { goals }
  }),
  updateExerciseConfig: (id, updates) => set((state) => ({
    settings: { ...state.settings, configs: { ...state.settings.configs, [id]: { sets: 3, reps: 12, rest: 60, ...state.settings.configs[id], ...updates } } },
  })),
  toggleCompleted: (id) => set((state) => {
    const completed = state.settings.completed.some((itemId) => String(itemId) === String(id))
      ? state.settings.completed.filter((itemId) => String(itemId) !== String(id))
      : [...state.settings.completed, id]
    return { settings: { ...state.settings, completed } }
  }),
  moveExercise: (id, direction) => set((state) => {
    const exercises = [...state.exercises]
    const index = exercises.findIndex((item) => String(item.id) === String(id))
    const target = index + direction
    if (index < 0 || target < 0 || target >= exercises.length) return state
    ;[exercises[index], exercises[target]] = [exercises[target], exercises[index]]
    return { exercises }
  }),
  clearWorkout: () => set((state) => ({ exercises: [], settings: { ...state.settings, completed: [] } })),
  savePlan: (plan) => set((state) => {
    const now = new Date().toISOString()
    const existing = plan.id ? state.plans.find((item) => item.id === plan.id) : null
    const saved = sanitizePlan({
      ...plan,
      id: existing?.id ?? plan.id ?? newId(),
      exercises: snapshotExercises(plan.exercises, plan.configs),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    })
    if (!saved) return state
    return {
      plans: existing
        ? state.plans.map((item) => item.id === saved.id ? saved : item)
        : [saved, ...state.plans],
    }
  }),
  duplicatePlan: (id) => set((state) => {
    const plan = state.plans.find((item) => item.id === id)
    if (!plan) return state
    const now = new Date().toISOString()
    const copy = sanitizePlan({ ...plan, id: newId(), name: `${plan.name} (copy)`.slice(0, 60), createdAt: now, updatedAt: now })
    return { plans: [copy, ...state.plans] }
  }),
  deletePlan: (id) => set((state) => ({ plans: state.plans.filter((item) => item.id !== id) })),
  replaceExerciseInPlan: (planId, exerciseId, replacement) => {
    if (!isValidExercise(replacement)) return false
    const state = get()
    const plan = state.plans.find((item) => item.id === planId)
    if (!plan) return false
    const exerciseIndex = plan.exercises.findIndex((item) => String(item.id) === String(exerciseId))
    if (exerciseIndex < 0 || plan.exercises.some((item) => String(item.id) === String(replacement.id))) return false

    const exercises = [...plan.exercises]
    exercises[exerciseIndex] = { ...replacement, config: exercises[exerciseIndex].config }
    set((current) => ({
      plans: current.plans.map((item) => item.id === planId
        ? { ...item, exercises, updatedAt: new Date().toISOString() }
        : item),
    }))
    return true
  },
  saveScheduledWorkout: ({ id, planId, date, time = '', note = '' }) => {
    if (typeof planId !== 'string' || !isValidDateKey(date) ||
      (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) return false
    const state = get()
    const existing = id ? state.scheduledWorkouts.find((item) => item.id === id && item.status === 'scheduled') : null
    if (id && !existing) return false
    const plan = state.plans.find((item) => item.id === planId)
    const planSnapshot = plan ?? (existing?.planId === planId ? existing : null)
    if (!planSnapshot || !planSnapshot.exercises.length) return false
    const now = new Date().toISOString()
    const scheduledWorkout = {
      id: existing?.id ?? newId(),
      planId,
      name: planSnapshot.name,
      exercises: snapshotExercises(planSnapshot.exercises),
      date,
      time,
      note: typeof note === 'string' ? note.trim().slice(0, 300) : '',
      status: 'scheduled',
      completedSessionId: null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    set((current) => ({
      scheduledWorkouts: existing
        ? current.scheduledWorkouts.map((item) => item.id === existing.id ? scheduledWorkout : item)
        : [scheduledWorkout, ...current.scheduledWorkouts],
    }))
    return true
  },
  cancelScheduledWorkout: (id) => set((state) => ({
    scheduledWorkouts: state.scheduledWorkouts.map((item) =>
      item.id === id && item.status === 'scheduled'
        ? { ...item, status: 'cancelled', updatedAt: new Date().toISOString() }
        : item),
  })),
  deleteScheduledWorkout: (id) => set((state) => ({
    scheduledWorkouts: state.scheduledWorkouts.filter((item) => item.id !== id),
  })),
  startSession: (plan, scheduledWorkoutId = null) => {
    const current = get()
    const scheduledWorkout = scheduledWorkoutId
      ? current.scheduledWorkouts.find((item) => item.id === scheduledWorkoutId)
      : null
    if (scheduledWorkoutId) {
      if (!scheduledWorkout || scheduledWorkout.status !== 'scheduled') return false
    }
    const startedAt = new Date().toISOString()
    const exercises = snapshotExercises(plan.exercises).map((exercise) => ({
      ...exercise,
      status: 'pending',
      sets: Array.from({ length: Math.min(10, Math.max(1, Number(exercise.config.sets) || DEFAULT_CONFIG.sets)) }, () => ({
        reps: Math.min(100, Math.max(0, Number(exercise.config.reps) || DEFAULT_CONFIG.reps)),
        targetReps: Math.min(100, Math.max(0, Number(exercise.config.reps) || DEFAULT_CONFIG.reps)),
        weight: null,
        note: '',
        completed: false,
      })),
    }))
    if (!exercises.length) return false
    set((state) => ({
      scheduledWorkouts: state.scheduledWorkouts.map((item) => {
        if (scheduledWorkoutId && item.id === scheduledWorkoutId && item.status === 'scheduled') {
          return { ...item, status: 'in-progress', updatedAt: startedAt }
        }
        if (state.activeSession?.scheduledWorkoutId === item.id && item.status === 'in-progress') {
          return { ...item, status: 'scheduled', updatedAt: startedAt }
        }
        return item
      }),
      activeSession: {
        id: newId(),
        planId: plan.planId ?? plan.id ?? null,
        scheduledWorkoutId,
        scheduledFor: scheduledWorkout?.date ?? null,
        name: plan.name,
        startedAt,
        status: 'active',
        resumedAt: startedAt,
        elapsedSeconds: 0,
        currentExerciseIndex: 0,
        restTimer: null,
        exercises,
      },
    }))
    return true
  },
  setCurrentExercise: (index) => set((state) => {
    if (!state.activeSession || !Number.isInteger(index) ||
      index < 0 || index >= state.activeSession.exercises.length) return state
    return {
      activeSession: { ...state.activeSession, currentExerciseIndex: index, restTimer: null },
    }
  }),
  setActiveExerciseStatus: (exerciseId, status) => {
    if (!['pending', 'completed', 'skipped'].includes(status)) return false
    const session = get().activeSession
    if (!session || !session.exercises.some((exercise) => String(exercise.id) === String(exerciseId))) return false
    set((state) => ({
      activeSession: {
        ...state.activeSession,
        exercises: state.activeSession.exercises.map((exercise) =>
          String(exercise.id) === String(exerciseId) ? { ...exercise, status } : exercise),
      },
    }))
    return true
  },
  pauseSession: () => set((state) => {
    const session = state.activeSession
    if (!session || session.status !== 'active') return state
    const now = new Date()
    const resumedAt = validTimestamp(session.resumedAt)
    const elapsed = resumedAt ? Math.max(0, Math.floor((now.getTime() - Date.parse(resumedAt)) / 1000)) : 0
    const timer = session.restTimer
    const remaining = timer && !timer.paused && timer.endsAt
      ? Math.max(0, Math.ceil((Date.parse(timer.endsAt) - now.getTime()) / 1000))
      : timer?.remainingSeconds
    return {
      activeSession: {
        ...session,
        status: 'paused',
        resumedAt: null,
        elapsedSeconds: session.elapsedSeconds + elapsed,
        restTimer: timer ? { ...timer, remainingSeconds: remaining, endsAt: null, paused: true } : null,
      },
    }
  }),
  resumeSession: () => set((state) => {
    const session = state.activeSession
    if (!session || session.status !== 'paused') return state
    const now = new Date().toISOString()
    const timer = session.restTimer
    return {
      activeSession: {
        ...session,
        status: 'active',
        resumedAt: now,
        restTimer: timer
          ? { ...timer, endsAt: new Date(Date.now() + timer.remainingSeconds * 1000).toISOString(), paused: false }
          : null,
      },
    }
  }),
  startRestTimer: (durationSeconds) => set((state) => {
    if (!state.activeSession || state.activeSession.status !== 'active') return state
    const duration = Number(durationSeconds)
    if (!Number.isFinite(duration) || duration < 0 || duration > 600) return state
    const now = Date.now()
    return {
      activeSession: {
        ...state.activeSession,
        restTimer: {
          durationSeconds: duration,
          remainingSeconds: duration,
          endsAt: new Date(now + duration * 1000).toISOString(),
          paused: false,
        },
      },
    }
  }),
  pauseRestTimer: () => set((state) => {
    const timer = state.activeSession?.restTimer
    if (!timer || timer.paused || !timer.endsAt) return state
    return {
      activeSession: {
        ...state.activeSession,
        restTimer: {
          ...timer,
          remainingSeconds: Math.max(0, Math.ceil((Date.parse(timer.endsAt) - Date.now()) / 1000)),
          endsAt: null,
          paused: true,
        },
      },
    }
  }),
  resumeRestTimer: () => set((state) => {
    const timer = state.activeSession?.restTimer
    if (!timer || !timer.paused) return state
    return {
      activeSession: {
        ...state.activeSession,
        restTimer: { ...timer, endsAt: new Date(Date.now() + timer.remainingSeconds * 1000).toISOString(), paused: false },
      },
    }
  }),
  resetRestTimer: (durationSeconds) => {
    const state = get()
    if (!state.activeSession) return
    const currentExercise = state.activeSession.exercises[state.activeSession.currentExerciseIndex]
    const duration = Number(durationSeconds ?? currentExercise?.config?.rest ?? DEFAULT_CONFIG.rest)
    if (!Number.isFinite(duration) || duration < 0 || duration > 600) return
    set((current) => ({
      activeSession: current.activeSession
        ? {
          ...current.activeSession,
          restTimer: { durationSeconds: duration, remainingSeconds: duration, endsAt: null, paused: true },
        }
        : null,
    }))
  },
  skipRestTimer: () => set((state) => state.activeSession
    ? { activeSession: { ...state.activeSession, restTimer: null } }
    : state),
  toggleActiveSet: (exerciseId, setIndex) => set((state) => {
    if (!state.activeSession) return state
    return {
      activeSession: {
        ...state.activeSession,
        exercises: state.activeSession.exercises.map((exercise) => String(exercise.id) !== String(exerciseId)
          ? exercise
          : { ...exercise, sets: exercise.sets.map((setItem, index) => index === setIndex ? { ...setItem, completed: !setItem.completed } : setItem) }),
      },
    }
  }),
  updateActiveSetReps: (exerciseId, setIndex, reps) => set((state) => {
    if (!state.activeSession) return state
    const value = Number(reps)
    if (!Number.isFinite(value) || value < 0 || value > 100) return state
    return {
      activeSession: {
        ...state.activeSession,
        exercises: state.activeSession.exercises.map((exercise) => String(exercise.id) !== String(exerciseId)
          ? exercise
          : { ...exercise, sets: exercise.sets.map((setItem, index) => index === setIndex ? { ...setItem, reps: value } : setItem) }),
      },
    }
  }),
  updateActiveSetWeight: (exerciseId, setIndex, weight) => set((state) => {
    if (!state.activeSession) return state
    const value = weight === '' || weight == null ? null : Number(weight)
    if (value !== null && (!Number.isFinite(value) || value < 0 || value > 10000)) return state
    return {
      activeSession: {
        ...state.activeSession,
        exercises: state.activeSession.exercises.map((exercise) => String(exercise.id) !== String(exerciseId)
          ? exercise
          : { ...exercise, sets: exercise.sets.map((setItem, index) => index === setIndex ? { ...setItem, weight: value } : setItem) }),
      },
    }
  }),
  updateActiveSetNote: (exerciseId, setIndex, note) => set((state) => {
    if (!state.activeSession || typeof note !== 'string') return state
    return {
      activeSession: {
        ...state.activeSession,
        exercises: state.activeSession.exercises.map((exercise) => String(exercise.id) !== String(exerciseId)
          ? exercise
          : { ...exercise, sets: exercise.sets.map((setItem, index) => index === setIndex ? { ...setItem, note: note.slice(0, 200) } : setItem) }),
      },
    }
  }),
  finishSession: (outcome = 'completed') => set((state) => {
    if (!state.activeSession || !['completed', 'ended-early'].includes(outcome)) return state
    const completedAt = new Date().toISOString()
    const resumedAt = validTimestamp(state.activeSession.resumedAt)
    const elapsed = state.activeSession.elapsedSeconds +
      (state.activeSession.status === 'active' && resumedAt ? Math.floor((Date.parse(completedAt) - Date.parse(resumedAt)) / 1000) : 0)
    const session = {
      ...state.activeSession,
      status: outcome,
      completedAt,
      durationSeconds: Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : 0,
      resumedAt: null,
      restTimer: null,
    }
    return {
      history: [session, ...state.history.filter((item) => item.id !== session.id)],
      scheduledWorkouts: session.scheduledWorkoutId
        ? state.scheduledWorkouts.map((item) => item.id === session.scheduledWorkoutId && item.status === 'in-progress'
          ? outcome === 'completed'
            ? { ...item, status: 'completed', completedSessionId: session.id, updatedAt: completedAt }
            : { ...item, status: 'scheduled', updatedAt: completedAt }
          : item)
        : state.scheduledWorkouts,
      activeSession: null,
    }
  }),
  cancelSession: () => set((state) => ({
    scheduledWorkouts: state.activeSession?.scheduledWorkoutId
      ? state.scheduledWorkouts.map((item) => item.id === state.activeSession.scheduledWorkoutId && item.status === 'in-progress'
        ? { ...item, status: 'scheduled', updatedAt: new Date().toISOString() }
        : item)
      : state.scheduledWorkouts,
    activeSession: null,
  })),
  deleteHistorySession: (id) => set((state) => ({ history: state.history.filter((session) => session.id !== id) })),
}), {
  name: 'fitness-explorer-workout',
  version: 5,
  migrate: migrateWorkoutState,
  partialize: (state) => ({
    exercises: state.exercises,
    goals: state.goals,
    settings: state.settings,
    plans: state.plans,
    history: state.history,
    scheduledWorkouts: state.scheduledWorkouts,
    activeSession: state.activeSession,
  }),
  merge: (persisted, current) => ({
    ...current,
    exercises: sanitizeExercises(persisted?.exercises),
    goals: sanitizeGoals(persisted?.goals),
    settings: sanitizeSettings(persisted?.settings),
    plans: sanitizePlans(persisted?.plans),
    history: sanitizeHistory(persisted?.history),
    scheduledWorkouts: sanitizeScheduledWorkouts(persisted?.scheduledWorkouts),
    activeSession: sanitizeSession(persisted?.activeSession),
  }),
}))

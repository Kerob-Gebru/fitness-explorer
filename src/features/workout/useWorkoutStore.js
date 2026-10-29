import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DEFAULT_SETTINGS = { name: 'My training session', goalMinutes: 45, configs: {}, completed: [] }
const DEFAULT_CONFIG = { sets: 3, reps: 12, rest: 60 }

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
    completed: set.completed === true,
  }))
}

function sanitizeSession(value) {
  if (!value || typeof value !== 'object' || typeof value.id !== 'string' || typeof value.name !== 'string') return null
  const startedAt = typeof value.startedAt === 'string' && !Number.isNaN(Date.parse(value.startedAt)) ? value.startedAt : null
  if (!startedAt) return null
  return {
    ...value,
    name: value.name.trim().slice(0, 60) || 'Workout session',
    startedAt,
    exercises: sanitizeExercises(value.exercises).map((exercise) => ({
      ...exercise,
      config: sanitizeConfig(exercise.config),
      sets: sanitizeSets(exercise.sets),
    })),
  }
}

function sanitizeHistory(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  return value.flatMap((session) => {
    if (!session || session.status !== 'completed' || typeof session.id !== 'string' || seen.has(session.id)) return []
    const completedAt = typeof session.completedAt === 'string' && !Number.isNaN(Date.parse(session.completedAt)) ? session.completedAt : null
    if (!completedAt) return []
    seen.add(session.id)
    const startedAt = typeof session.startedAt === 'string' && !Number.isNaN(Date.parse(session.startedAt)) ? session.startedAt : completedAt
    const durationSeconds = Number(session.durationSeconds)
    return [{
      ...session,
      startedAt,
      completedAt,
      durationSeconds: Number.isFinite(durationSeconds) && durationSeconds >= 0 ? durationSeconds : null,
      exercises: sanitizeExercises(session.exercises).map((exercise) => ({
        ...exercise,
        config: sanitizeConfig(exercise.config),
        sets: sanitizeSets(exercise.sets),
      })),
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
    }
  }
  return persistedState
}

export const useWorkoutStore = create(persist((set, get) => ({
  exercises: [],
  settings: { ...DEFAULT_SETTINGS },
  plans: [],
  history: [],
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
  startSession: (plan) => {
    const startedAt = new Date().toISOString()
    const exercises = snapshotExercises(plan.exercises).map((exercise) => ({
      ...exercise,
      sets: Array.from({ length: Math.min(10, Math.max(1, Number(exercise.config.sets) || DEFAULT_CONFIG.sets)) }, () => ({
        reps: Math.min(100, Math.max(0, Number(exercise.config.reps) || DEFAULT_CONFIG.reps)),
        completed: false,
      })),
    }))
    if (!exercises.length) return false
    set({ activeSession: { id: newId(), planId: plan.id ?? null, name: plan.name, startedAt, exercises } })
    return true
  },
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
  finishSession: () => set((state) => {
    if (!state.activeSession) return state
    const completedAt = new Date().toISOString()
    const elapsed = Math.floor((Date.parse(completedAt) - Date.parse(state.activeSession.startedAt)) / 1000)
    const session = {
      ...state.activeSession,
      status: 'completed',
      completedAt,
      durationSeconds: Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : null,
    }
    return { history: [session, ...state.history.filter((item) => item.id !== session.id)], activeSession: null }
  }),
  cancelSession: () => set({ activeSession: null }),
  deleteHistorySession: (id) => set((state) => ({ history: state.history.filter((session) => session.id !== id) })),
}), {
  name: 'fitness-explorer-workout',
  version: 2,
  migrate: migrateWorkoutState,
  partialize: (state) => ({
    exercises: state.exercises,
    settings: state.settings,
    plans: state.plans,
    history: state.history,
    activeSession: state.activeSession,
  }),
  merge: (persisted, current) => ({
    ...current,
    exercises: sanitizeExercises(persisted?.exercises),
    settings: sanitizeSettings(persisted?.settings),
    plans: sanitizePlans(persisted?.plans),
    history: sanitizeHistory(persisted?.history),
    activeSession: sanitizeSession(persisted?.activeSession),
  }),
}))

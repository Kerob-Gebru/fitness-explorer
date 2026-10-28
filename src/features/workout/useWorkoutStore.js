import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DEFAULT_SETTINGS = { name: 'My training session', goalMinutes: 45, configs: {}, completed: [] }

export const useWorkoutStore = create(persist((set, get) => ({
  exercises: [],
  settings: { ...DEFAULT_SETTINGS },
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
}), {
  name: 'fitness-explorer-workout',
  version: 2,
  partialize: (state) => ({ exercises: state.exercises, settings: state.settings }),
  merge: (persisted, current) => ({
    ...current,
    exercises: Array.isArray(persisted?.exercises) ? persisted.exercises.filter((item) => item && item.id != null && item.name) : [],
    settings: { ...DEFAULT_SETTINGS, ...(persisted?.settings ?? {}), configs: persisted?.settings?.configs ?? {}, completed: Array.isArray(persisted?.settings?.completed) ? persisted.settings.completed : [] },
  }),
}))

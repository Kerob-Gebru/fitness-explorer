import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useRecentStore = create(persist((set) => ({
  exercises: [],
  rememberExercise: (exercise) => set((state) => ({
    exercises: [exercise, ...state.exercises.filter((item) => String(item.id) !== String(exercise.id))].slice(0, 6),
  })),
}), {
  name: 'fitness-explorer-recent',
  version: 1,
  partialize: (state) => ({ exercises: state.exercises }),
  merge: (persisted, current) => ({ ...current, exercises: Array.isArray(persisted?.exercises) ? persisted.exercises.filter((item) => item && item.id != null && item.name).slice(0, 6) : [] }),
}))

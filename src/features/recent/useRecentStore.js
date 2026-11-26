import { create } from 'zustand'
import { persist } from 'zustand/middleware'

function sanitizeRecent(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  return value
    .filter((item) => {
      if (!item || typeof item !== 'object' || item.id == null || !item.name) return false
      const id = String(item.id)
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
    .slice(0, 6)
}

export const useRecentStore = create(persist((set) => ({
  exercises: [],
  updateExerciseImage: (exerciseId, gifUrl) => set((state) => ({
    exercises: state.exercises.map((item) =>
      String(item.id) === String(exerciseId) ? { ...item, gifUrl } : item),
  })),
  rememberExercise: (exercise) => set((state) => ({
    exercises: [exercise, ...state.exercises.filter((item) => String(item.id) !== String(exercise.id))].slice(0, 6),
  })),
  replaceRecentExercises: (nextExercises) => set({ exercises: sanitizeRecent(nextExercises) }),
}), {
  name: 'fitness-explorer-recent',
  version: 1,
  partialize: (state) => ({ exercises: state.exercises }),
  merge: (persisted, current) => ({ ...current, exercises: sanitizeRecent(persisted?.exercises) }),
}))

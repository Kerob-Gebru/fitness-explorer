import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Keep only valid, non-duplicate favorites from whatever is in localStorage.
function sanitizeFavorites(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  return value.filter((item) => {
    if (!item || typeof item !== 'object' || item.id == null || !item.name) return false
    const id = String(item.id)
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

// Favorites are saved as full exercise copies, so the Favorites page still works
// after a refresh (even if an API's image links expire later).
export const useFavoritesStore = create(
  persist(
    (set, get) => ({
      favorites: [],

      addFavorite: (exercise) => {
        if (get().favorites.some((item) => String(item.id) === String(exercise.id))) return
        set({ favorites: [...get().favorites, exercise] })
      },

      removeFavorite: (exerciseId) =>
        set({ favorites: get().favorites.filter((item) => String(item.id) !== String(exerciseId)) }),

      toggleFavorite: (exercise) => {
        const { favorites, addFavorite, removeFavorite } = get()
        const exists = favorites.some((item) => String(item.id) === String(exercise.id))
        if (exists) removeFavorite(exercise.id)
        else addFavorite(exercise)
      },

      isFavorite: (exerciseId) =>
        get().favorites.some((item) => String(item.id) === String(exerciseId)),
    }),
    {
      name: 'fitness-explorer-favorites',
      version: 1,
      partialize: (state) => ({ favorites: state.favorites }),
      merge: (persisted, current) => ({
        ...current,
        favorites: sanitizeFavorites(persisted?.favorites),
      }),
    },
  ),
)

// Reactive helper for components: re-renders when this exercise is added/removed.
export function useIsFavorite(exerciseId) {
  return useFavoritesStore((state) =>
    state.favorites.some((item) => String(item.id) === String(exerciseId)),
  )
}

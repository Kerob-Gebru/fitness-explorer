import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const STORAGE_KEY = 'fitness-explorer-uploaded-images'
const VALID_SOURCES = new Set(['backend', 'mock', 'api'])

let inFlightHydration = null

function createSafeStorage() {
  return {
    getItem(name) {
      try {
        return typeof window !== 'undefined' && window.localStorage
          ? window.localStorage.getItem(name)
          : null
      } catch {
        return null
      }
    },
    setItem(name, value) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(name, value)
        }
      } catch {
        // Ignore storage quota or private browsing write failures.
      }
    },
    removeItem(name) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(name)
        }
      } catch {
        // Ignore storage removal errors.
      }
    },
  }
}

export function inferExerciseSource(exerciseId, explicitSource) {
  const source = typeof explicitSource === 'string' ? explicitSource.trim().toLowerCase() : ''
  if (VALID_SOURCES.has(source)) return source
  const id = String(exerciseId ?? '').trim()
  if (id.startsWith('demo-')) return 'mock'
  if (/^\d+$/.test(id)) return 'backend'
  return 'api'
}

export function getExerciseImageKey(exerciseOrId, explicitSource) {
  const isObject = exerciseOrId && typeof exerciseOrId === 'object'
  const id = String(isObject ? exerciseOrId.id ?? '' : exerciseOrId ?? '').trim()
  if (!id) return ''
  const source = inferExerciseSource(id, explicitSource ?? (isObject ? exerciseOrId.source : undefined))
  return `${source}:${id}`
}

export function resolveUploadedImageUrl(value) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''

  try {
    const base = typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost:3000'
    const url = new URL(trimmed, base)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
    if (url.username || url.password) return ''
    if (trimmed.startsWith('/') && (typeof window === 'undefined' || !window.location?.origin)) {
      return trimmed
    }
    return url.href
  } catch {
    return ''
  }
}

function sanitizeImageMap(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const cleaned = {}
  for (const [key, value] of Object.entries(raw)) {
    if (typeof key !== 'string' || !key.includes(':')) continue
    const url = resolveUploadedImageUrl(value)
    if (url) cleaned[key] = url
  }
  return cleaned
}

export const useUploadedImagesStore = create(
  persist(
    (set) => ({
      images: {},
      hydrated: false,

      setUploadedImage: (exerciseOrId, imageUrl, explicitSource) => {
        const key = getExerciseImageKey(exerciseOrId, explicitSource)
        const resolvedUrl = resolveUploadedImageUrl(imageUrl)
        if (!key || !resolvedUrl) return
        set((state) => ({
          images: {
            ...state.images,
            [key]: resolvedUrl,
          },
        }))
      },

      hydrateFromManifest: (manifest) => {
        const nextEntries = {}
        if (manifest && typeof manifest === 'object' && !Array.isArray(manifest)) {
          for (const [key, entry] of Object.entries(manifest)) {
            if (!entry || typeof entry !== 'object') continue
            const storageKey = key.includes(':')
              ? key
              : getExerciseImageKey(entry.exerciseId, entry.source)
            const resolvedUrl = resolveUploadedImageUrl(entry.imageUrl)
            if (storageKey && resolvedUrl) {
              nextEntries[storageKey] = resolvedUrl
            }
          }
        }
        set((state) => ({
          images: { ...state.images, ...nextEntries },
          hydrated: true,
        }))
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(createSafeStorage),
      partialize: (state) => ({ images: state.images }),
      merge: (persisted, current) => ({
        ...current,
        images: sanitizeImageMap(persisted?.images),
      }),
    },
  ),
)

export function getUploadedImageFromMap(imagesMap, exerciseOrId, explicitSource) {
  if (!imagesMap || typeof imagesMap !== 'object' || !exerciseOrId) return ''
  const key = getExerciseImageKey(exerciseOrId, explicitSource)
  if (key && imagesMap[key]) {
    return resolveUploadedImageUrl(imagesMap[key])
  }

  const isObject = exerciseOrId && typeof exerciseOrId === 'object'
  const id = String(isObject ? exerciseOrId.id ?? '' : exerciseOrId ?? '').trim()
  if (!id) return ''

  for (const source of ['mock', 'backend', 'api']) {
    const candidate = imagesMap[`${source}:${id}`]
    if (candidate) return resolveUploadedImageUrl(candidate)
  }
  return ''
}

export function setUploadedExerciseImage(exerciseOrId, imageUrl, explicitSource) {
  useUploadedImagesStore.getState().setUploadedImage(exerciseOrId, imageUrl, explicitSource)
}

export function applyUploadedExerciseImage(exercise) {
  if (!exercise || typeof exercise !== 'object') return exercise
  const uploadedUrl = getUploadedImageFromMap(useUploadedImagesStore.getState().images, exercise)
  if (!uploadedUrl || exercise.gifUrl === uploadedUrl) return exercise
  return {
    ...exercise,
    gifUrl: uploadedUrl,
  }
}

export function useExerciseDisplayImage(exercise) {
  const images = useUploadedImagesStore((state) => state.images)
  if (!exercise) return null
  return getUploadedImageFromMap(images, exercise) || exercise.gifUrl || null
}

export function useHasUploadedExerciseImage(exercise) {
  const images = useUploadedImagesStore((state) => state.images)
  return Boolean(exercise && getUploadedImageFromMap(images, exercise))
}

export async function hydrateUploadedImagesFromBackend(fetchManifest, { force = false } = {}) {
  const state = useUploadedImagesStore.getState()
  if (!force && state.hydrated) return state.images
  if (!force && inFlightHydration) return inFlightHydration

  inFlightHydration = (async () => {
    try {
      const manifest = await fetchManifest()
      useUploadedImagesStore.getState().hydrateFromManifest(manifest)
    } catch {
      // Backend manifest hydration is best-effort so local mock/offline browsing keeps working.
    } finally {
      inFlightHydration = null
    }
    return useUploadedImagesStore.getState().images
  })()

  return inFlightHydration
}

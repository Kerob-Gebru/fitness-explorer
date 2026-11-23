
import { ApiRequestError, NotFoundError } from './errors.js'

const RAW_BASE_URL = (import.meta.env.VITE_BACKEND_API_URL || '/api').trim()
const BASE_URL = RAW_BASE_URL.endsWith('/') && RAW_BASE_URL.length > 1
  ? RAW_BASE_URL.slice(0, -1)
  : RAW_BASE_URL

function resolveBackendUrl(pathOrUrl) {
  if (typeof pathOrUrl !== 'string' || !pathOrUrl.trim()) return null
  const value = pathOrUrl.trim()

  try {
    if (/^https?:\/\//i.test(BASE_URL)) {
      return new URL(value, BASE_URL).toString()
    }
    if (typeof window !== 'undefined' && window.location?.origin) {
      return new URL(value, window.location.origin).toString()
    }
    return value
  } catch {
    return null
  }
}

// Convert backend database records into the format
// already expected by the React frontend.
function normalizeExercise(raw) {
  return {
    id: String(raw.id),
    name: raw.name || 'Unnamed exercise',
    bodyPart: raw.body_part || '',
    target: raw.target_muscle || '',
    equipment: raw.equipment || '',
    secondaryMuscles: [],
    instructions: raw.instructions
      ? [raw.instructions]
      : [],
    gifUrl: resolveBackendUrl(raw.gif_url),
    imageUrl: null,
    videoUrl: null,
    source: 'backend',
  }
}

// Send requests to the Express backend.
async function request(path) {
  let response

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: {
        Accept: 'application/json',
      },
    })
  } catch {
    throw new ApiRequestError(
      'Could not connect to the upload server. Make sure the backend server is running.',
    )
  }

  if (response.status === 404) {
    throw new NotFoundError()
  }

  if (!response.ok) {
    throw new ApiRequestError(
      `Backend request failed (${response.status}).`,
      response.status,
    )
  }

  try {
    return await response.json()
  } catch {
    throw new ApiRequestError('Invalid JSON response from backend.')
  }
}

// Get exercises with filtering, searching, sorting, and pagination.
export async function getExercises({
  search = '',
  bodyPart = '',
  target = '',
  equipment = '',
  page = 1,
  limit = 100,
  sortBy = 'id',
  order = 'DESC',
} = {}) {
  const params = new URLSearchParams()

  if (search) params.set('search', search)
  if (bodyPart) params.set('body_part', bodyPart)
  if (target) params.set('target_muscle', target)
  if (equipment) params.set('equipment', equipment)

  params.set('page', page)
  params.set('limit', limit)
  params.set('sortBy', sortBy)
  params.set('order', order)

  const result = await request(`/exercises?${params.toString()}`)

  if (!result.success || !Array.isArray(result.data)) {
    throw new ApiRequestError('Unexpected exercises response from backend.')
  }

  return result.data.map(normalizeExercise)
}

// Get one exercise by its database ID.
export async function getExerciseById(id) {
  const result = await request(`/exercises/${encodeURIComponent(id)}`)

  if (!result.success || !result.data) {
    throw new NotFoundError()
  }

  return normalizeExercise(result.data)
}

export async function getUploadedImagesManifest() {
  const result = await request('/exercises/uploads/manifest')
  return result?.success && result.data && typeof result.data === 'object' ? result.data : {}
}

// Upload one exercise image without setting Content-Type so the browser adds
// the multipart boundary for FormData.
export async function uploadExerciseImage(id, file, exercise = null) {
  const formData = new FormData()
  if (exercise?.source) formData.append('source', String(exercise.source))
  if (exercise?.name) formData.append('name', String(exercise.name))
  if (exercise?.bodyPart) formData.append('bodyPart', String(exercise.bodyPart))
  if (exercise?.target) formData.append('target', String(exercise.target))
  if (exercise?.equipment) formData.append('equipment', String(exercise.equipment))
  formData.append('image', file)

  let response
  try {
    response = await fetch(`${BASE_URL}/exercises/${encodeURIComponent(id)}/upload`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
      body: formData,
    })
  } catch {
    throw new ApiRequestError(
      'Could not connect to the upload server. Make sure the server is running and try again.',
    )
  }

  let result
  try {
    result = await response.json()
  } catch {
    throw new ApiRequestError(
      response.status === 413
        ? 'Image is too large. Maximum allowed size is 5 MB.'
        : `Upload failed with an unexpected server response (${response.status}).`,
      response.status,
    )
  }

  const resolvedUrl = resolveBackendUrl(result?.data?.imageUrl)
  if (!response.ok || !result?.success || !resolvedUrl) {
    throw new ApiRequestError(
      result?.message || `Image upload failed (${response.status}).`,
      response.status,
    )
  }

  return {
    ...result.data,
    imageUrl: resolvedUrl,
  }
}

// Get available filter options from the database.
export async function getFilterOptions() {
  const exercises = await getExercises({ limit: 100 })

  return {
    bodyParts: [...new Set(exercises.map((item) => item.bodyPart).filter(Boolean))],
    targets: [...new Set(exercises.map((item) => item.target).filter(Boolean))],
    equipment: [...new Set(exercises.map((item) => item.equipment).filter(Boolean))],
  }
}

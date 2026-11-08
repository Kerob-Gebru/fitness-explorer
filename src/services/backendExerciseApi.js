
import { ApiRequestError, NotFoundError } from './errors.js'

const BASE_URL = (
  import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:5000/api'
).trim()

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
    gifUrl: raw.gif_url
  ? new URL(raw.gif_url, BASE_URL).toString()
  : null,
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
      'Could not connect to your backend. Make sure the backend server is running.',
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

// Upload one exercise image without setting Content-Type so the browser adds
// the multipart boundary for FormData.
export async function uploadExerciseImage(id, file) {
  const formData = new FormData()
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
      'Could not connect to your backend. Make sure the backend server is running.',
    )
  }

  let result
  try {
    result = await response.json()
  } catch {
    throw new ApiRequestError('Invalid JSON response from backend.', response.status)
  }

  if (!response.ok || !result.success || typeof result.data?.imageUrl !== 'string') {
    throw new ApiRequestError(
      result.message || `Image upload failed (${response.status}).`,
      response.status,
    )
  }

  return {
    ...result.data,
    imageUrl: new URL(result.data.imageUrl, BASE_URL).toString(),
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

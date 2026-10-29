// LIVE ExerciseDB (RapidAPI) integration.
//
// Endpoint paths, parameters and response fields follow the official OpenAPI
// document at https://v2.exercisedb.io/docs/json (v2.1.0).
// The full library is fetched once with limit=0 (documented as "return full
// list") and cached for the session, so typing in the search box does not spend
// one RapidAPI request per keystroke.
//
// SECURITY: any VITE_ variable is included in the browser bundle, so the key
// is visible to anyone using the site. Fine for local learning, not for a
// public deployment.
import { ApiNotVerifiedError, ApiRequestError, NotFoundError } from './errors.js'
import { filterExercisesBySearch, normalizeText } from '../utils/exerciseSearch.js'

const API_KEY = (import.meta.env.VITE_RAPIDAPI_KEY ?? '').trim()
const API_HOST = (import.meta.env.VITE_RAPIDAPI_HOST ?? '').trim()
const BASE_URL = (import.meta.env.VITE_RAPIDAPI_BASE_URL ?? '').trim()

const ENDPOINTS = {
  list: '/exercises',
  byId: (id) => `/exercises/exercise/${encodeURIComponent(id)}`,
  bodyPartList: '/exercises/bodyPartList',
  targetList: '/exercises/targetList',
  equipmentList: '/exercises/equipmentList',
}

function ensureConfigured() {
  if (
    !API_KEY ||
    API_KEY.startsWith('your_') ||
    !API_HOST ||
    !BASE_URL ||
    BASE_URL.includes('your_')
  ) {
    throw new ApiNotVerifiedError(
      'Live mode needs RapidAPI settings. Add VITE_RAPIDAPI_KEY, VITE_RAPIDAPI_HOST and VITE_RAPIDAPI_BASE_URL to .env, then restart the dev server.',
    )
  }
}

async function request(path, params = {}) {
  ensureConfigured()
  const url = new URL(path, BASE_URL)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  })

  let response
  try {
    response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': API_HOST,
        Accept: 'application/json',
      },
    })
  } catch {
    // fetch throws a TypeError for network problems AND for CORS blocks.
    throw new ApiRequestError(
      'The request could not be sent. Check your connection. If it persists, the browser may be blocking the API (CORS).',
    )
  }

  if (response.status === 401 || response.status === 403) {
    throw new ApiRequestError('The API rejected the key or your subscription.', response.status)
  }
  if (response.status === 404) throw new NotFoundError()
  if (response.status === 429) {
    throw new ApiRequestError('Request limit reached. Try again later.', 429)
  }
  if (!response.ok) {
    throw new ApiRequestError(`The API returned an error (${response.status}).`, response.status)
  }

  try {
    return await response.json()
  } catch {
    throw new ApiRequestError('The API response was not valid JSON.', response.status)
  }
}

function normalizeExercise(raw) {
  const textList = (value) => {
    const entries = Array.isArray(value) ? value : typeof value === 'string' ? [value] : []
    return entries.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim())
  }
  const optionalText = (value) => {
    if (typeof value === 'string') return value.trim()
    if (Array.isArray(value)) return textList(value)
    return null
  }
  const category = optionalText(raw.category)
  const difficulty = optionalText(raw.difficulty)
  return {
    id: raw.id == null ? '' : String(raw.id).trim(),
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Unnamed exercise',
    bodyPart: raw.bodyPart ?? '',
    target: raw.target ?? '',
    equipment: raw.equipment ?? '',
    secondaryMuscles: textList(raw.secondaryMuscles),
    instructions: Array.isArray(raw.instructions)
      ? textList(raw.instructions)
      : typeof raw.instructions === 'string' ? raw.instructions : [],
    gifUrl: typeof raw.gifUrl === 'string' && raw.gifUrl.trim() ? raw.gifUrl : null,
    ...(category?.length ? { category } : {}),
    ...(difficulty?.length ? { difficulty } : {}),
    ...(textList(raw.tips).length ? { tips: textList(raw.tips) } : {}),
    ...(textList(raw.commonMistakes).length ? { commonMistakes: textList(raw.commonMistakes) } : {}),
    ...(textList(raw.safetyConsiderations).length ? { safetyConsiderations: textList(raw.safetyConsiderations) } : {}),
    source: 'api',
  }
}

let libraryPromise = null
let libraryCache = null
const exerciseRequests = new Map()

function loadLibrary() {
  if (!libraryPromise) {
    libraryPromise = request(ENDPOINTS.list, { limit: 0 })
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new ApiRequestError('Unexpected response format from the API.')
        }
        libraryCache = data.map(normalizeExercise).filter((exercise) => exercise.id)
        return libraryCache
      })
      .catch((error) => {
        libraryPromise = null
        throw error
      })
  }
  return libraryPromise
}

// Mirrors mockExerciseApi: the API has no combined text+multi-filter query, so
// the cached library is filtered locally with the same rules.
export async function getExercises({ search = '', bodyPart = '', target = '', equipment = '' } = {}) {
  const exercises = await loadLibrary()
  return filterExercisesBySearch(exercises, search).filter(
    (exercise) =>
      (!bodyPart || normalizeText(exercise.bodyPart) === normalizeText(bodyPart)) &&
      (!target || normalizeText(exercise.target) === normalizeText(target)) &&
      (!equipment || normalizeText(exercise.equipment) === normalizeText(equipment)),
  )
}

// Uses the cached library when it is already loaded (most detail pages are
// opened from Explore), otherwise asks the API for that one exercise.
export async function getExerciseById(id) {
  const exerciseId = String(id)
  const cached = libraryCache?.find((exercise) => exercise.id === exerciseId)
  if (cached) return cached

  if (!exerciseRequests.has(exerciseId)) {
    const requestPromise = request(ENDPOINTS.byId(exerciseId))
      .then((data) => {
        if (!data || typeof data !== 'object' || String(data.id).trim() !== exerciseId) throw new NotFoundError()
        return normalizeExercise(data)
      })
      .finally(() => exerciseRequests.delete(exerciseId))
    exerciseRequests.set(exerciseId, requestPromise)
  }
  return exerciseRequests.get(exerciseId)
}

function asList(value, label) {
  if (!Array.isArray(value)) throw new ApiRequestError(`Unexpected ${label} list from the API.`)
  return value
}

export async function getFilterOptions() {
  const [bodyParts, targets, equipment] = await Promise.all([
    request(ENDPOINTS.bodyPartList),
    request(ENDPOINTS.targetList),
    request(ENDPOINTS.equipmentList),
  ])
  return {
    bodyParts: asList(bodyParts, 'body part'),
    targets: asList(targets, 'target'),
    equipment: asList(equipment, 'equipment'),
  }
}

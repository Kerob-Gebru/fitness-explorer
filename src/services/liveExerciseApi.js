// LIVE ExerciseDB (RapidAPI) integration: NOT VERIFIED, NOT TESTED.
//
// Nothing in this file has been tested against the real service.
// The endpoint paths and the response fields below are intentionally left empty
// so we never guess them. To finish this file:
//   1. Subscribe to ExerciseDB on RapidAPI and read the official docs.
//   2. Copy the real endpoint paths into ENDPOINTS below.
//   3. Check one real response, then adjust normalizeExercise().
//   4. Test in the browser. If you see a CORS error, the API cannot be called
//      directly from a browser and a small server-side proxy would be needed
//      (ask before adding one; the project is frontend-only for now).
//
// SECURITY: any VITE_ variable is included in the browser bundle, so the key
// below is visible to anyone using the site. Fine for local learning, not for
// a public deployment.
import { ApiNotVerifiedError, ApiRequestError, NotFoundError } from './errors.js'

const API_KEY = import.meta.env.VITE_RAPIDAPI_KEY
const API_HOST = import.meta.env.VITE_RAPIDAPI_HOST
const BASE_URL = import.meta.env.VITE_RAPIDAPI_BASE_URL

// TODO: fill these in from the official documentation. null = not verified yet.
const ENDPOINTS = {
  list: null, // e.g. a path that returns a list of exercises
  byId: null, // a function (id) => path for one exercise
  filterOptions: null, // where body parts / targets / equipment lists come from
}

function ensureReady(endpoint) {
  if (!endpoint) throw new ApiNotVerifiedError()
  if (!API_KEY || API_KEY.startsWith('your_') || !BASE_URL || BASE_URL.includes('your_')) {
    throw new ApiNotVerifiedError(
      'Live mode needs your RapidAPI settings. Add them to .env.local (see .env.example).',
    )
  }
}

// Generic request helper. RapidAPI normally expects these two headers;
// confirm against the ExerciseDB docs before relying on it.
async function request(path, params = {}) {
  const url = new URL(path, BASE_URL)
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value)
  })

  let response
  try {
    response = await fetch(url, {
      headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': API_HOST },
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

// UNVERIFIED mapping. Only "gifUrl" is mentioned in the official RapidAPI listing;
// every other field name is an assumption to check against a real response.
function normalizeExercise(raw) {
  return {
    id: String(raw.id),
    name: raw.name ?? 'Unnamed exercise',
    bodyPart: raw.bodyPart ?? '',
    target: raw.target ?? '',
    equipment: raw.equipment ?? '',
    secondaryMuscles: Array.isArray(raw.secondaryMuscles) ? raw.secondaryMuscles : [],
    instructions: Array.isArray(raw.instructions) ? raw.instructions : [],
    gifUrl: raw.gifUrl ?? null,
    source: 'api',
  }
}

export async function getExercises(filters = {}) {
  ensureReady(ENDPOINTS.list)
  const data = await request(ENDPOINTS.list, filters)
  if (!Array.isArray(data)) throw new ApiRequestError('Unexpected response format from the API.')
  return data.map(normalizeExercise)
}

export async function getExerciseById(id) {
  ensureReady(ENDPOINTS.byId)
  const data = await request(ENDPOINTS.byId(id))
  if (!data || typeof data !== 'object') throw new NotFoundError()
  return normalizeExercise(data)
}

export async function getFilterOptions() {
  ensureReady(ENDPOINTS.filterOptions)
  const data = await request(ENDPOINTS.filterOptions)
  return {
    bodyParts: data?.bodyParts ?? [],
    targets: data?.targets ?? [],
    equipment: data?.equipment ?? [],
  }
}

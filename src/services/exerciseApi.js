// The ONLY file that components and hooks should import for exercise data.
// It picks demo data or live data based on VITE_USE_MOCK_DATA (see services/config.js).
//
// Every function returns exercises in the same shape (see utils/formatExercise.js):
// { id, name, bodyPart, target, equipment, secondaryMuscles, instructions, gifUrl, source }
import { USE_MOCK_DATA } from './config.js'
import * as mockApi from './mockExerciseApi.js'
import * as liveApi from './liveExerciseApi.js'
import { NotFoundError } from './errors.js'

const api = USE_MOCK_DATA ? mockApi : liveApi

// filters: { search, bodyPart, target, equipment } (empty string means "any")
export function getExercises(filters = {}) {
  return api.getExercises(filters)
}

export function getLocalExercises(filters = {}) {
  return mockApi.getExercises(filters)
}

// Throws NotFoundError when the id does not exist.
export function getExerciseById(id) {
  const exerciseId = String(id)
  if (exerciseId.startsWith('demo-')) {
    const localExercise = mockApi.findLocalExerciseById(exerciseId)
    return localExercise
      ? Promise.resolve(localExercise)
      : Promise.reject(new NotFoundError('This sample exercise is no longer available in the local exercise library.'))
  }
  return api.getExerciseById(id)
}

// Returns { bodyParts: string[], targets: string[], equipment: string[] }
export function getFilterOptions() {
  return api.getFilterOptions()
}

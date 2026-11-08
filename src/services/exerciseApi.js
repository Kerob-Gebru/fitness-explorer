
import {
  USE_MOCK_DATA,
  USE_BACKEND_DATA,
} from './config.js'

import * as mockApi from './mockExerciseApi.js'
import * as liveApi from './liveExerciseApi.js'
import * as backendApi from './backendExerciseApi.js'

import { ApiRequestError, NotFoundError } from './errors.js'

// Select the correct data source.
const api = USE_MOCK_DATA
  ? mockApi
  : USE_BACKEND_DATA
    ? backendApi
    : liveApi

// Get exercises using the selected data source.
export function getExercises(filters = {}) {
  return api.getExercises(filters)
}

// Always retrieve local demo exercises when explicitly requested.
export function getLocalExercises(filters = {}) {
  return mockApi.getExercises(filters)
}

// Get one exercise by ID.
export function getExerciseById(id) {
  const exerciseId = String(id)

  // Demo exercises always come from the local demo library.
  if (exerciseId.startsWith('demo-')) {
    const localExercise = mockApi.findLocalExerciseById(exerciseId)

    return localExercise
      ? Promise.resolve(localExercise)
      : Promise.reject(
          new NotFoundError(
            'This sample exercise is no longer available in the local exercise library.',
          ),
        )
  }

  return api.getExerciseById(id)
}

// Get filter options.
export function getFilterOptions() {
  return api.getFilterOptions()
}

export function uploadExerciseImage(id, file) {
  if (!USE_BACKEND_DATA) {
    return Promise.reject(new ApiRequestError('Image uploads are only available when the backend data source is selected.'))
  }

  return backendApi.uploadExerciseImage(id, file)
}

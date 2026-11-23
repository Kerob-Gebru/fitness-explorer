
import {
  USE_MOCK_DATA,
  USE_BACKEND_DATA,
} from './config.js'

import * as mockApi from './mockExerciseApi.js'
import * as liveApi from './liveExerciseApi.js'
import * as backendApi from './backendExerciseApi.js'

import { NotFoundError } from './errors.js'
import {
  applyUploadedExerciseImage,
  hydrateUploadedImagesFromBackend,
  setUploadedExerciseImage,
} from '../features/exercises/uploadedExerciseImages.js'

// Select the correct data source.
const api = USE_MOCK_DATA
  ? mockApi
  : USE_BACKEND_DATA
    ? backendApi
    : liveApi

async function ensureUploadedImagesHydrated() {
  await hydrateUploadedImagesFromBackend(() => backendApi.getUploadedImagesManifest())
}

// Get exercises using the selected data source.
export async function getExercises(filters = {}) {
  const [exercises] = await Promise.all([
    api.getExercises(filters),
    ensureUploadedImagesHydrated(),
  ])
  return Array.isArray(exercises) ? exercises.map(applyUploadedExerciseImage) : []
}

// Always retrieve local demo exercises when explicitly requested.
export async function getLocalExercises(filters = {}) {
  const [exercises] = await Promise.all([
    mockApi.getExercises(filters),
    ensureUploadedImagesHydrated(),
  ])
  return Array.isArray(exercises) ? exercises.map(applyUploadedExerciseImage) : []
}

// Get one exercise by ID.
export async function getExerciseById(id) {
  const exerciseId = String(id)

  // Demo exercises always come from the local demo library.
  if (exerciseId.startsWith('demo-')) {
    await ensureUploadedImagesHydrated()
    const localExercise = mockApi.findLocalExerciseById(exerciseId)

    if (!localExercise) {
      throw new NotFoundError(
        'This sample exercise is no longer available in the local exercise library.',
      )
    }

    return applyUploadedExerciseImage(localExercise)
  }

  const [exercise] = await Promise.all([
    api.getExerciseById(id),
    ensureUploadedImagesHydrated(),
  ])
  return applyUploadedExerciseImage(exercise)
}

// Get filter options.
export function getFilterOptions() {
  return api.getFilterOptions()
}

export async function uploadExerciseImage(id, file, exercise = null) {
  const uploaded = await backendApi.uploadExerciseImage(id, file, exercise)
  setUploadedExerciseImage(exercise ?? { id }, uploaded.imageUrl, uploaded.source)
  return uploaded
}

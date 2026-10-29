// DEMO DATA ONLY. These exercises are hand-written samples, not from ExerciseDB.
// The functions mimic a real API (they are async and slightly delayed) so the
// loading and error states can be tried out.
import { mockExercises } from './mockExercises.js'
import { MOCK_SIMULATE_ERROR } from './config.js'
import { NotFoundError } from './errors.js'
import { filterExercisesBySearch, normalizeText } from '../utils/exerciseSearch.js'

const DELAY_MS = 450

function wait(value) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (MOCK_SIMULATE_ERROR) {
        reject(new Error('Simulated error: demo data was told to fail (VITE_MOCK_SIMULATE_ERROR=true).'))
      } else {
        resolve(value)
      }
    }, DELAY_MS)
  })
}

const unique = (values) => [...new Set(values)].sort()

export function getExercises({ search = '', bodyPart = '', target = '', equipment = '' } = {}) {
  const results = filterExercisesBySearch(mockExercises, search).filter(
    (exercise) =>
      (!bodyPart || normalizeText(exercise.bodyPart) === normalizeText(bodyPart)) &&
      (!target || normalizeText(exercise.target) === normalizeText(target)) &&
      (!equipment || normalizeText(exercise.equipment) === normalizeText(equipment)),
  )
  return wait(results)
}

export function getExerciseById(id) {
  const exercise = mockExercises.find((item) => item.id === String(id))
  if (!exercise) {
    return new Promise((_, reject) => setTimeout(() => reject(new NotFoundError()), DELAY_MS / 2))
  }
  return wait(exercise)
}

export function findLocalExerciseById(id) {
  return mockExercises.find((item) => item.id === String(id)) ?? null
}

export function getFilterOptions() {
  return wait({
    bodyParts: unique(mockExercises.map((e) => e.bodyPart)),
    targets: unique(mockExercises.map((e) => e.target)),
    equipment: unique(mockExercises.map((e) => e.equipment)),
  })
}

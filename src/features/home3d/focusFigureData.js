import { getCompletedWorkoutSessions, localDateKey } from '../workout/workoutProgress.js'

// The six zones match the exercise library's bodyPart values exactly, so
// selecting a zone can reuse the existing Explore bodyPart filter.
export const FOCUS_ZONES = [
  { id: 'chest', label: 'Chest', bodyPart: 'chest' },
  { id: 'back', label: 'Back', bodyPart: 'back' },
  { id: 'shoulders', label: 'Shoulders', bodyPart: 'shoulders' },
  { id: 'arms', label: 'Arms', bodyPart: 'arms' },
  { id: 'core', label: 'Core', bodyPart: 'core' },
  { id: 'legs', label: 'Legs', bodyPart: 'legs' },
]

const ZONE_BY_BODY_PART = new Map(FOCUS_ZONES.map((zone) => [zone.bodyPart, zone.id]))

export function normalizeBodyPart(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function mapBodyPartToZone(bodyPart) {
  return ZONE_BY_BODY_PART.get(normalizeBodyPart(bodyPart)) ?? null
}

function resolveNow(now) {
  if (now instanceof Date && !Number.isNaN(now.getTime())) return now
  if (typeof now === 'string' || typeof now === 'number') {
    const parsed = new Date(now)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}

function startOfLocalWeek(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return start
}

function addLocalDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function isCompletedExercise(exercise) {
  if (!exercise || typeof exercise !== 'object') return false
  if (exercise.status === 'completed') return true
  if (exercise.status === 'skipped') return false
  if (exercise.status == null) {
    return Array.isArray(exercise.sets) && exercise.sets.some((set) => set?.completed === true)
  }
  return false
}

// Pure: derives Monday–Sunday counts for the local week containing `now`.
// Only completed sessions and completed exercise entries are counted. Exercises
// whose bodyPart is missing or outside the six zones are reported, never guessed.
export function getWeeklyFocusData(history, now = new Date()) {
  const currentDate = resolveNow(now)
  const weekStart = startOfLocalWeek(currentDate)
  const weekEnd = addLocalDays(weekStart, 6)
  const weekStartKey = localDateKey(weekStart)
  const weekEndKey = localDateKey(weekEnd)
  const counts = Object.fromEntries(FOCUS_ZONES.map((zone) => [zone.id, 0]))
  let completedExercises = 0
  let mappedExercises = 0

  for (const session of getCompletedWorkoutSessions(history, currentDate)) {
    const sessionKey = localDateKey(session.completedAt)
    if (sessionKey < weekStartKey || sessionKey > weekEndKey) continue

    for (const exercise of Array.isArray(session.exercises) ? session.exercises : []) {
      if (!isCompletedExercise(exercise)) continue
      completedExercises += 1
      const zoneId = mapBodyPartToZone(exercise.bodyPart)
      if (!zoneId) continue
      counts[zoneId] += 1
      mappedExercises += 1
    }
  }

  return {
    weekStartKey,
    weekEndKey,
    counts,
    mappedExercises,
    completedExercises,
    unmappedExercises: completedExercises - mappedExercises,
    hasMappedActivity: mappedExercises > 0,
  }
}

import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateWorkoutProgress } from './workoutProgress.js'

function localTimestamp(year, month, day, hour = 12) {
  return new Date(year, month, day, hour).toISOString()
}

function completedSession(id, year, month, day, durationSeconds = 1800) {
  return {
    id,
    status: 'completed',
    completedAt: localTimestamp(year, month, day),
    durationSeconds,
    exercises: [{ status: 'completed', sets: [
      { completed: true, reps: 10 },
      { completed: false, reps: 8 },
    ] }],
  }
}

test('calculates session counts consistently across Monday and month boundaries', () => {
  const now = new Date(2026, 2, 1, 12)
  const history = [
    completedSession('monday', 2026, 1, 23),
    completedSession('saturday-1', 2026, 1, 28),
    completedSession('saturday-2', 2026, 1, 28),
    completedSession('sunday', 2026, 2, 1),
    { ...completedSession('early', 2026, 2, 1), status: 'ended-early' },
    { ...completedSession('planned', 2026, 2, 1), status: 'scheduled' },
    { ...completedSession('cancelled', 2026, 2, 1), status: 'cancelled' },
    completedSession('future', 2026, 2, 2),
    { ...completedSession('bad-date', 2026, 2, 1), completedAt: 'not a date' },
    completedSession('saturday-1', 2026, 2, 1),
  ]
  const stats = calculateWorkoutProgress(history, now)

  assert.equal(stats.totalWorkouts, 4)
  assert.equal(stats.weeklyWorkouts, 4)
  assert.equal(stats.monthlyWorkouts, 1)
  assert.equal(stats.completedDaysThisWeek, 3)
  assert.equal(stats.currentStreak, 2)
  assert.equal(stats.longestStreak, 2)
  assert.equal(stats.trackedSets, 4)
  assert.equal(stats.trackedReps, 40)
  assert.equal(stats.averageDurationMinutes, 30)
  assert.equal(stats.weekDays.find((day) => day.date === '2026-03-01').count, 1)
  assert.equal(stats.weeklyTrends.at(-1).count, 4)
  assert.equal(stats.monthlyTrends.at(-1).count, 1)
})

test('counts one active workout day for multiple sessions and resets after missed days', () => {
  const history = [
    completedSession('one', 2026, 2, 2),
    completedSession('two', 2026, 2, 2),
    completedSession('three', 2026, 2, 3),
  ]
  const current = calculateWorkoutProgress(history, new Date(2026, 2, 3, 12))
  assert.equal(current.currentStreak, 2)
  assert.equal(current.completedDaysThisWeek, 2)

  const afterMissedDay = calculateWorkoutProgress(history, new Date(2026, 2, 5, 12))
  assert.equal(afterMissedDay.currentStreak, 0)
  assert.equal(afterMissedDay.longestStreak, 2)
})

test('returns no fabricated duration or trends when there are no completed sessions', () => {
  const stats = calculateWorkoutProgress([], new Date(2026, 0, 1, 12))
  assert.equal(stats.totalWorkouts, 0)
  assert.equal(stats.averageDurationMinutes, null)
  assert.equal(stats.trackedSets, 0)
  assert.ok(stats.weeklyTrends.every((item) => item.count === 0))
  assert.ok(stats.monthlyTrends.every((item) => item.count === 0))
})

test('persists validated goals in store state without accepting invalid targets', async () => {
  const originalWindow = globalThis.window
  const values = new Map()
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
  globalThis.window = { localStorage: storage }
  const { DEFAULT_WORKOUT_GOALS, useWorkoutStore } = await import('./useWorkoutStore.js')
  const store = useWorkoutStore.getState()
  store.updateWorkoutGoals(DEFAULT_WORKOUT_GOALS)
  useWorkoutStore.getState().updateWorkoutGoals({ weekly: 4, monthly: 16 })
  assert.deepEqual(useWorkoutStore.getState().goals, { weekly: 4, monthly: 16 })
  useWorkoutStore.getState().updateWorkoutGoals({ weekly: 0 })
  assert.deepEqual(useWorkoutStore.getState().goals, { weekly: 4, monthly: 16 })
  useWorkoutStore.getState().updateWorkoutGoals({ monthly: 15.5 })
  assert.deepEqual(useWorkoutStore.getState().goals, { weekly: 4, monthly: 16 })
  assert.deepEqual(JSON.parse(values.get('fitness-explorer-workout')).state.goals, { weekly: 4, monthly: 16 })
  if (originalWindow === undefined) delete globalThis.window
  else globalThis.window = originalWindow
})

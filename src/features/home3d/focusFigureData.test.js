import assert from 'node:assert/strict'
import test from 'node:test'
import { getWeeklyFocusData, mapBodyPartToZone } from './focusFigureData.js'

function localTimestamp(year, month, day, hour = 12) {
  return new Date(year, month, day, hour).toISOString()
}

function session(id, year, month, day, exercises, status = 'completed') {
  return {
    id,
    status,
    completedAt: localTimestamp(year, month, day),
    exercises,
  }
}

function exercises(...entries) {
  return entries.map(([bodyPart, exerciseStatus = 'completed'], index) => ({
    id: `exercise-${index}`,
    bodyPart,
    status: exerciseStatus,
    sets: [],
  }))
}

test('uses the local Monday–Sunday week and excludes neighbouring weeks', () => {
  const now = new Date(2026, 10, 22, 20)
  const data = getWeeklyFocusData([
    session('previous-sunday', 2026, 10, 15, exercises(['chest'])),
    session('monday', 2026, 10, 16, exercises(['chest'])),
    session('wednesday', 2026, 10, 18, exercises(['legs'])),
    session('sunday', 2026, 10, 22, exercises(['back'])),
    session('next-monday', 2026, 10, 23, exercises(['arms'])),
  ], now)

  assert.equal(data.weekStartKey, '2026-11-16')
  assert.equal(data.weekEndKey, '2026-11-22')
  assert.deepEqual(data.counts, { chest: 1, back: 1, shoulders: 0, arms: 0, core: 0, legs: 1 })
  assert.equal(data.mappedExercises, 3)
  assert.equal(data.completedExercises, 3)
})

test('handles Monday weeks across a year boundary', () => {
  const data = getWeeklyFocusData([
    session('previous-sunday', 2026, 11, 27, exercises(['chest'])),
    session('monday', 2026, 11, 28, exercises(['core'])),
    session('friday', 2027, 0, 1, exercises(['shoulders'])),
  ], new Date(2027, 0, 1, 18))

  assert.equal(data.weekStartKey, '2026-12-28')
  assert.equal(data.weekEndKey, '2027-01-03')
  assert.equal(data.counts.core, 1)
  assert.equal(data.counts.shoulders, 1)
  assert.equal(data.counts.chest, 0)
})

test('counts completed sessions only, not ended-early, planned or duplicate entries', () => {
  const data = getWeeklyFocusData([
    session('done', 2026, 10, 17, exercises(['chest'])),
    session('ended-early', 2026, 10, 17, exercises(['back']), 'ended-early'),
    session('planned', 2026, 10, 17, exercises(['legs']), 'scheduled'),
    session('cancelled', 2026, 10, 17, exercises(['arms']), 'cancelled'),
    session('done', 2026, 10, 18, exercises(['core'])),
  ], new Date(2026, 10, 20, 12))

  assert.deepEqual(data.counts, { chest: 1, back: 0, shoulders: 0, arms: 0, core: 0, legs: 0 })
  assert.equal(data.mappedExercises, 1)
})

test('counts completed exercise entries and skips pending or skipped ones', () => {
  const data = getWeeklyFocusData([
    session('mixed', 2026, 10, 17, [
      ...exercises(['chest', 'completed'], ['back', 'skipped'], ['legs', 'pending']),
      { id: 'legacy', bodyPart: 'core', sets: [{ completed: true }] },
      { id: 'legacy-open', bodyPart: 'arms', sets: [{ completed: false }] },
    ]),
  ], new Date(2026, 10, 20, 12))

  assert.equal(data.counts.chest, 1)
  assert.equal(data.counts.core, 1)
  assert.equal(data.counts.back, 0)
  assert.equal(data.counts.legs, 0)
  assert.equal(data.counts.arms, 0)
  assert.equal(data.completedExercises, 2)
})

test('maps only the real bodyPart values and reports unmapped entries', () => {
  const data = getWeeklyFocusData([
    session('mixed', 2026, 10, 17, exercises(
      [' Chest '], ['shoulders'], ['cardio'], ['neck'], [undefined], ['LEGS'],
    )),
  ], new Date(2026, 10, 20, 12))

  assert.equal(data.counts.chest, 1)
  assert.equal(data.counts.shoulders, 1)
  assert.equal(data.counts.legs, 1)
  assert.equal(data.mappedExercises, 3)
  assert.equal(data.completedExercises, 6)
  assert.equal(data.unmappedExercises, 3)
  assert.equal(mapBodyPartToZone('cardio'), null)
  assert.equal(mapBodyPartToZone('  Back '), 'back')
})

test('returns a useful zero state without fabricating distribution', () => {
  const data = getWeeklyFocusData([], new Date(2026, 10, 20, 12))

  assert.deepEqual(data.counts, { chest: 0, back: 0, shoulders: 0, arms: 0, core: 0, legs: 0 })
  assert.equal(data.mappedExercises, 0)
  assert.equal(data.completedExercises, 0)
  assert.equal(data.hasMappedActivity, false)
})

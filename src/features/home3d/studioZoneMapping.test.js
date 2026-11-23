import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSingleExerciseZoneState,
  getZoneLabel,
  mapExerciseToZones,
  mapMuscleNameToZone,
  resolveZoneBodyPartFilter,
  summarizeExercisesZones,
} from './studioZoneMapping.js'

test('maps standard body parts and specific muscles onto the six 3D zones', () => {
  assert.equal(mapMuscleNameToZone('upper legs'), 'legs')
  assert.equal(mapMuscleNameToZone('quadriceps'), 'legs')
  assert.equal(mapMuscleNameToZone('pectorals'), 'chest')
  assert.equal(mapMuscleNameToZone('lats'), 'back')
  assert.equal(mapMuscleNameToZone('delts'), 'shoulders')
  assert.equal(mapMuscleNameToZone('biceps'), 'arms')
  assert.equal(mapMuscleNameToZone('waist'), 'core')
  assert.equal(mapMuscleNameToZone('abdominals'), 'core')
})

test('extracts primary and secondary 3D zones from exercise metadata', () => {
  const result = mapExerciseToZones({
    id: 'bench-press',
    bodyPart: 'chest',
    target: 'pectorals',
    secondaryMuscles: ['triceps', 'anterior delts'],
  })

  assert.equal(result.primaryZone, 'chest')
  assert.deepEqual(result.secondaryZones, ['arms', 'shoulders'])
  assert.deepEqual(result.allZones, ['chest', 'arms', 'shoulders'])
})

test('aggregates workout builder and plan exercises with set weights and balance gaps', () => {
  const summary = summarizeExercisesZones(
    [
      { id: '1', bodyPart: 'chest', target: 'pectorals', config: { sets: 4 } },
      { id: '2', bodyPart: 'shoulders', target: 'delts', config: { sets: 3 } },
      { id: '3', bodyPart: 'chest', target: 'pectorals', config: { sets: 3 } },
    ],
    { 1: { sets: 4 }, 2: { sets: 3 }, 3: { sets: 3 } },
  )

  assert.equal(summary.dominantZone, 'chest')
  assert.equal(summary.setVolume.chest, 7)
  assert.equal(summary.setVolume.shoulders, 3)
  assert.ok(summary.missingZones.includes('legs'))
  assert.ok(summary.missingZones.includes('back'))
})

test('builds primary zone and secondary count glow for a single exercise', () => {
  const state = buildSingleExerciseZoneState({
    bodyPart: 'back',
    target: 'lats',
    secondaryMuscles: ['biceps'],
  })

  assert.equal(state.primaryZone, 'back')
  assert.deepEqual(state.secondaryZones, ['arms'])
  assert.equal(state.counts.arms, 1)
  assert.equal(state.counts.legs, 0)
})

test('resolves 3D zone clicks to dataset bodyPart options and readable labels', () => {
  assert.equal(getZoneLabel('shoulders'), 'Shoulders')
  assert.equal(resolveZoneBodyPartFilter('arms', ['chest', 'upper arms', 'lower arms']), 'upper arms')
  assert.equal(resolveZoneBodyPartFilter('core', ['chest', 'waist']), 'waist')
  assert.equal(resolveZoneBodyPartFilter('legs', ['chest', 'legs']), 'legs')
  assert.equal(resolveZoneBodyPartFilter('chest', []), 'chest')
})


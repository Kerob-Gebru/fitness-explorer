import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeExerciseInstructions, normalizeExerciseMedia, normalizeExerciseValues } from './exerciseDetails.js'
import { getVerifiedExerciseDemo } from './exerciseDemoLibrary.js'

test('normalizes ordered instruction strings and supported structured entries', () => {
  assert.deepEqual(normalizeExerciseInstructions([
    '1. Set your starting position.',
    { instruction: 'Perform the movement with control.' },
    { text: 'Return to the start.' },
    null,
    12,
    {},
  ]), [
    'Set your starting position.',
    'Perform the movement with control.',
    'Return to the start.',
  ])
  assert.deepEqual(normalizeExerciseInstructions('First step.\n2) Second step.'), [
    'First step.',
    'Second step.',
  ])
  assert.deepEqual(normalizeExerciseInstructions(null), [])
})

test('accepts only absolute HTTP(S) exercise media URLs from known fields', () => {
  const media = normalizeExerciseMedia({
    gifUrl: 'https://cdn.example.test/demo.gif',
    videoUrl: 'https://cdn.example.test/demo.mp4',
    imageUrl: 'https://cdn.example.test/demo.jpg',
    instructions: ['Not a media field'],
    previewUrl: 'https://cdn.example.test/other.jpg',
  })
  assert.deepEqual(media, [
    { type: 'gif', url: 'https://cdn.example.test/demo.gif', source: 'exercise-record' },
    { type: 'video', url: 'https://cdn.example.test/demo.mp4', source: 'exercise-record' },
    { type: 'image', url: 'https://cdn.example.test/demo.jpg', source: 'exercise-record' },
  ])
  assert.equal(media[0].type, 'gif')
  assert.deepEqual(normalizeExerciseMedia({
    gifUrl: 'javascript:alert(1)',
    videoUrl: '//cdn.example.test/demo.mp4',
    imageUrl: 'not a url',
  }), [])
  assert.deepEqual(normalizeExerciseMedia({
    videoUrl: 'data:video/mp4;base64,AAAA',
    imageUrl: 'https://user:pass@cdn.example.test/demo.jpg',
  }), [])
  assert.deepEqual(normalizeExerciseMedia({
    gifUrl: 'https://user:pass@cdn.example.test/demo.gif',
  }), [])
  assert.deepEqual(normalizeExerciseMedia(null), [])
})

test('prefers API GIFs, then exact verified local matches, before video or image', () => {
  const localFirst = normalizeExerciseMedia({
    id: 'demo-001',
    name: 'push-up',
    videoUrl: 'https://cdn.example.test/demo.mp4',
    imageUrl: 'https://cdn.example.test/demo.jpg',
  })
  assert.deepEqual(localFirst.map(({ type, source }) => ({ type, source })), [
    { type: 'gif', source: 'verified-local' },
    { type: 'video', source: 'exercise-record' },
    { type: 'image', source: 'exercise-record' },
  ])
  assert.equal(localFirst[0].url, '/exercise-demos/pushups.gif')
  assert.equal(localFirst[0].attribution.license, 'CC BY-SA 4.0')

  const apiFirst = normalizeExerciseMedia({
    id: 'live-123',
    name: 'Push-up',
    gifUrl: 'https://cdn.example.test/live.gif',
  })
  assert.equal(apiFirst[0].url, 'https://cdn.example.test/live.gif')
  assert.equal(apiFirst[1].url, '/exercise-demos/pushups.gif')
})

test('matches verified demos by exact IDs and explicit normalized aliases only', () => {
  assert.equal(getVerifiedExerciseDemo({ id: 'demo-001', name: 'push-up' }).id, 'push-up')
  assert.equal(getVerifiedExerciseDemo({ id: 'live-123', name: 'PUSH UPS' }).id, 'push-up')
  assert.equal(getVerifiedExerciseDemo({ id: 'live-124', name: 'decline push-up' }), null)
  assert.equal(getVerifiedExerciseDemo({ id: 'live-125', name: 'dumbbell push-up' }), null)
  assert.equal(getVerifiedExerciseDemo({ id: 'other-id', name: 'jumping jack' }), null)
})

test('normalizes optional muscle and equipment values without inventing fields', () => {
  assert.deepEqual(normalizeExerciseValues(['Pectorals', '', null, 'Pectorals']), ['Pectorals'])
  assert.deepEqual(normalizeExerciseValues(undefined), [])
})

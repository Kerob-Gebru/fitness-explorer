import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeExerciseInstructions, normalizeExerciseMedia, normalizeExerciseValues } from './exerciseDetails.js'

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
    { type: 'gif', url: 'https://cdn.example.test/demo.gif' },
    { type: 'video', url: 'https://cdn.example.test/demo.mp4' },
    { type: 'image', url: 'https://cdn.example.test/demo.jpg' },
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

test('normalizes optional muscle and equipment values without inventing fields', () => {
  assert.deepEqual(normalizeExerciseValues(['Pectorals', '', null, 'Pectorals']), ['Pectorals'])
  assert.deepEqual(normalizeExerciseValues(undefined), [])
})

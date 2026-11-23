import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyUploadedExerciseImage,
  getExerciseImageKey,
  getUploadedImageFromMap,
  hydrateUploadedImagesFromBackend,
  inferExerciseSource,
  resolveUploadedImageUrl,
  useUploadedImagesStore,
} from './uploadedExerciseImages.js'

test('infers exercise source consistently for mock, backend, and live API ids', () => {
  assert.equal(inferExerciseSource('demo-001'), 'mock')
  assert.equal(inferExerciseSource('42'), 'backend')
  assert.equal(inferExerciseSource(42), 'backend')
  assert.equal(inferExerciseSource('0009'), 'backend')
  assert.equal(inferExerciseSource('ab-12'), 'api')
  assert.equal(inferExerciseSource('42', 'mock'), 'mock')
  assert.equal(inferExerciseSource('demo-001', 'invalid'), 'mock')
})

test('builds canonical exercise image storage keys', () => {
  assert.equal(getExerciseImageKey({ id: 'demo-001', source: 'mock' }), 'mock:demo-001')
  assert.equal(getExerciseImageKey({ id: 7, source: 'backend' }), 'backend:7')
  assert.equal(getExerciseImageKey('demo-010'), 'mock:demo-010')
  assert.equal(getExerciseImageKey(''), '')
})

test('validates and resolves uploaded image URLs safely', () => {
  assert.equal(resolveUploadedImageUrl('https://example.test/uploads/pic.jpg'), 'https://example.test/uploads/pic.jpg')
  assert.equal(resolveUploadedImageUrl('/uploads/pic.png'), '/uploads/pic.png')
  assert.equal(resolveUploadedImageUrl('javascript:alert(1)'), '')
  assert.equal(resolveUploadedImageUrl('data:image/png;base64,AAAA'), '')
  assert.equal(resolveUploadedImageUrl('https://user:pass@example.test/pic.jpg'), '')
  assert.equal(resolveUploadedImageUrl(''), '')
})

test('looks up uploaded images by exact key or fallback source', () => {
  const map = {
    'mock:demo-001': 'http://localhost:3000/uploads/demo.jpg',
    'backend:12': 'http://localhost:3000/uploads/backend.png',
  }

  assert.equal(
    getUploadedImageFromMap(map, { id: 'demo-001', source: 'mock' }),
    'http://localhost:3000/uploads/demo.jpg',
  )
  assert.equal(
    getUploadedImageFromMap(map, { id: '12' }),
    'http://localhost:3000/uploads/backend.png',
  )
  assert.equal(
    getUploadedImageFromMap(map, { id: '12', source: 'api' }),
    'http://localhost:3000/uploads/backend.png',
  )
  assert.equal(getUploadedImageFromMap(map, { id: 'missing' }), '')
})

test('hydrates manifest and applies uploaded gifUrl to exercise records', async () => {
  useUploadedImagesStore.setState({ images: {}, hydrated: false })

  const images = await hydrateUploadedImagesFromBackend(async () => ({
    'mock:demo-001': {
      exerciseId: 'demo-001',
      source: 'mock',
      imageUrl: 'http://localhost:3000/uploads/custom-pushup.png',
    },
  }), { force: true })

  assert.equal(images['mock:demo-001'], 'http://localhost:3000/uploads/custom-pushup.png')

  const original = {
    id: 'demo-001',
    source: 'mock',
    name: 'push-up',
    gifUrl: null,
  }
  const patched = applyUploadedExerciseImage(original)
  assert.equal(patched.gifUrl, 'http://localhost:3000/uploads/custom-pushup.png')
  assert.equal(original.gifUrl, null)
})

import { getVerifiedExerciseDemo } from './exerciseDemoLibrary.js'

export function normalizeExerciseValues(value) {
  const values = Array.isArray(value) ? value : [value]
  const seen = new Set()
  return values.flatMap((item) => {
    if (typeof item !== 'string' || !item.trim()) return []
    const text = item.trim()
    const key = text.toLocaleLowerCase()
    if (seen.has(key)) return []
    seen.add(key)
    return [text]
  })
}

export function normalizeExerciseInstructions(value) {
  const entries = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/\r?\n/) : []
  return entries.flatMap((entry) => {
    const text = typeof entry === 'string'
      ? entry
      : entry && typeof entry === 'object'
        ? [entry.instruction, entry.text, entry.description].find((item) => typeof item === 'string')
        : null
    if (typeof text !== 'string') return []
    const instruction = text.trim().replace(/^\s*\d+\s*[.)]\s*/, '')
    return instruction ? [instruction] : []
  })
}

export function normalizeExerciseMedia(exercise) {
  if (!exercise || typeof exercise !== 'object') return []
  const media = []
  const validUrl = (value) => {
    if (typeof value !== 'string' || !value.trim()) return null
    try {
      const url = new URL(value.trim())
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
      if (url.username || url.password) return null
      return url.href
    } catch {
      return null
    }
  }
  const apiGif = validUrl(exercise.gifUrl)
  if (apiGif) media.push({ type: 'gif', url: apiGif, source: 'exercise-record' })

  const localDemo = getVerifiedExerciseDemo(exercise)
  if (localDemo) {
    media.push({
      type: 'gif',
      url: localDemo.url,
      source: 'verified-local',
      attribution: localDemo.attribution,
    })
  }

  for (const [type, field] of [['video', 'videoUrl'], ['image', 'imageUrl']]) {
    const value = exercise[field]
    const url = validUrl(value)
    if (url) media.push({ type, url, source: 'exercise-record' })
  }
  return media
}

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
  for (const [type, field] of [['gif', 'gifUrl'], ['video', 'videoUrl'], ['image', 'imageUrl']]) {
    const value = exercise[field]
    if (typeof value !== 'string' || !value.trim()) continue
    try {
      const url = new URL(value.trim())
      if (url.protocol !== 'https:' && url.protocol !== 'http:') continue
      if (url.username || url.password) continue
      media.push({ type, url: url.href })
    } catch {
      continue
    }
  }
  return media
}

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
    if (typeof entry !== 'string') return []
    const instruction = entry.trim().replace(/^\s*\d+\s*[.)]\s*/, '')
    return instruction ? [instruction] : []
  })
}

// Small helpers for showing exercise data nicely.

// "upper legs" -> "Upper legs"; empty values become a friendly fallback.
export function formatLabel(value, fallback = 'Not listed') {
  if (!value || typeof value !== 'string') return fallback
  const text = value.trim()
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : fallback
}

// Only keep non-empty text steps so a bad response never breaks the page.
export function cleanInstructions(instructions) {
  if (!Array.isArray(instructions)) return []
  return instructions.filter((step) => typeof step === 'string' && step.trim())
}

export function countBy(items, key) {
  return items.reduce((counts, item) => {
    counts[item[key]] = (counts[item[key]] || 0) + 1
    return counts
  }, {})
}

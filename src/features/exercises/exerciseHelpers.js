import { normalizeText } from '../../utils/exerciseSearch.js'

// Picks up to `count` exercises, one per body part first, so the home page
// shows a mix instead of six chest exercises.
export function pickFeatured(exercises, count = 6) {
  const seen = new Set()
  const picked = []
  for (const exercise of exercises) {
    if (!seen.has(exercise.bodyPart)) {
      seen.add(exercise.bodyPart)
      picked.push(exercise)
    }
  }
  for (const exercise of exercises) {
    if (picked.length >= count) break
    if (!picked.includes(exercise)) picked.push(exercise)
  }
  return picked.slice(0, count)
}

// Scores every other exercise by shared attributes (target muscle first, then
// body part, equipment and secondary muscles) and returns the best `limit`.
// Ties fall back to name, so the same exercise always gets the same list.
export function rankRelatedExercises(current, pool, limit = 6) {
  return rankExerciseAlternatives(current, pool)
    .slice(0, limit)
    .map(({ exercise }) => exercise)
}

function comparableValues(value) {
  const entries = Array.isArray(value) ? value : [value]
  return [...new Set(entries
    .filter((item) => typeof item === 'string' && item.trim())
    .map(normalizeText))]
}

function sharedValues(first, second) {
  const secondValues = new Set(comparableValues(second))
  return comparableValues(first).filter((value) => secondValues.has(value))
}

export function rankExerciseAlternatives(current, pool) {
  if (!current || !Array.isArray(pool)) return []

  const currentTargets = comparableValues(current.target)
  const currentBodyParts = comparableValues(current.bodyPart)
  const currentEquipment = comparableValues(current.equipment)
  const currentCategories = comparableValues(current.category)
  const currentSecondary = comparableValues(current.secondaryMuscles)
  const seen = new Set([String(current.id)])
  const candidates = []

  pool.forEach((exercise, index) => {
    if (!exercise || exercise.id == null || !normalizeText(exercise.name)) return
    const id = String(exercise.id)
    if (!id || id === 'undefined' || id === 'null' || seen.has(id)) return
    seen.add(id)

    const sharedTargets = sharedValues(currentTargets, exercise.target)
    const sharedBodyParts = sharedValues(currentBodyParts, exercise.bodyPart)
    const sharedSecondary = sharedValues(currentSecondary, exercise.secondaryMuscles)
    const sharedCategories = sharedValues(currentCategories, exercise.category)
    const sameEquipment = sharedValues(currentEquipment, exercise.equipment).length > 0

    if (!sharedTargets.length && !(sharedBodyParts.length && (sharedSecondary.length || sharedCategories.length))) return

    const reasons = []
    let score = 0
    if (sharedTargets.length) {
      score += 12
      reasons.push('Shares the primary target muscle.')
    }
    if (sharedBodyParts.length) {
      score += 5
      if (!sharedTargets.length) reasons.push('Shares the body part and secondary muscle or category.')
    }
    if (sameEquipment) {
      score += 2
      if (reasons.length < 2) reasons.push('Uses similar equipment.')
    } else if (currentEquipment.length && comparableValues(exercise.equipment).length) {
      reasons.push('Uses different equipment.')
    }
    if (sharedCategories.length) score += 3
    score += Math.min(sharedSecondary.length, 3)

    candidates.push({ exercise, score, reasons, index })
  })

  candidates.sort((first, second) =>
    second.score - first.score ||
    normalizeText(first.exercise.name).localeCompare(normalizeText(second.exercise.name)) ||
    first.index - second.index)

  return candidates.map(({ exercise, reasons }) => ({ exercise, reasons }))
}

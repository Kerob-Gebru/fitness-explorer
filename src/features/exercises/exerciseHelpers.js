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
  if (!current || !Array.isArray(pool)) return []

  const target = normalizeText(current.target)
  const bodyPart = normalizeText(current.bodyPart)
  const equipment = normalizeText(current.equipment)
  const secondary = new Set(
    (Array.isArray(current.secondaryMuscles) ? current.secondaryMuscles : []).map(normalizeText),
  )

  const scored = []
  pool.forEach((exercise, index) => {
    if (!exercise || String(exercise.id) === String(current.id)) return

    let score = 0
    if (target && normalizeText(exercise.target) === target) score += 8
    if (bodyPart && normalizeText(exercise.bodyPart) === bodyPart) score += 4
    if (equipment && normalizeText(exercise.equipment) === equipment) score += 2
    const sharedSecondary = (Array.isArray(exercise.secondaryMuscles) ? exercise.secondaryMuscles : [])
      .filter((muscle) => secondary.has(normalizeText(muscle))).length
    score += Math.min(sharedSecondary, 3)

    if (score > 0) scored.push({ exercise, score, index })
  })

  scored.sort((a, b) =>
    b.score - a.score ||
    normalizeText(a.exercise.name).localeCompare(normalizeText(b.exercise.name)) ||
    a.index - b.index,
  )

  return scored.slice(0, limit).map((item) => item.exercise)
}

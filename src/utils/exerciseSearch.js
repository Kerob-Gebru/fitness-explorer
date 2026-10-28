// Reusable, local search and sorting for exercise objects.
// Works on the plain shape the API already returns:
// { id, name, target, bodyPart, equipment, secondaryMuscles, instructions, ... }

export function normalizeText(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function textList(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === 'string').map(normalizeText)
    : []
}

// Every field in the current exercise model that is worth searching.
function searchableFields(exercise) {
  return {
    name: normalizeText(exercise?.name),
    target: normalizeText(exercise?.target),
    bodyPart: normalizeText(exercise?.bodyPart),
    equipment: normalizeText(exercise?.equipment),
    category: normalizeText(exercise?.category),
    secondary: textList(exercise?.secondaryMuscles),
    instructions: textList(exercise?.instructions),
  }
}

export function splitQuery(query) {
  return normalizeText(query).split(/\s+/).filter(Boolean)
}

// 0 means "not a match"; higher is a better match.
// Every word in the query must appear somewhere in the exercise text.
export function scoreExercise(exercise, query) {
  const tokens = splitQuery(query)
  if (tokens.length === 0) return 0

  const fields = searchableFields(exercise)
  const haystack = [
    fields.name,
    fields.target,
    fields.bodyPart,
    fields.equipment,
    fields.category,
    ...fields.secondary,
    ...fields.instructions,
  ].join(' ')

  if (!tokens.every((token) => haystack.includes(token))) return 0

  let score = 1
  for (const token of tokens) {
    if (fields.name === token) score += 12
    else if (fields.name.startsWith(token)) score += 8
    else if (fields.name.includes(token)) score += 6
    if (fields.target.includes(token)) score += 4
    if (fields.bodyPart.includes(token)) score += 3
    if (fields.equipment.includes(token)) score += 2
    if (fields.category.includes(token)) score += 2
    if (fields.secondary.some((muscle) => muscle.includes(token))) score += 1
    if (fields.instructions.some((step) => step.includes(token))) score += 1
  }
  return score
}

export function filterExercisesBySearch(exercises, query) {
  if (!Array.isArray(exercises)) return []
  if (splitQuery(query).length === 0) return exercises
  return exercises.filter((exercise) => scoreExercise(exercise, query) > 0)
}

// Returns a new array; the input array is never mutated.
// Missing optional fields sort after present ones, and ties keep their
// incoming order so the result is deterministic.
export function sortExercises(exercises, { sortBy = 'recommended', query = '' } = {}) {
  if (!Array.isArray(exercises)) return []

  const items = exercises.map((exercise, index) => ({ exercise, index }))
  const nameOf = (exercise) => normalizeText(exercise?.name)

  const byName = (a, b) => nameOf(a).localeCompare(nameOf(b)) || normalizeText(a?.id).localeCompare(normalizeText(b?.id))

  const compareField = (key) => (a, b) => {
    const first = normalizeText(a?.[key])
    const second = normalizeText(b?.[key])
    if (first !== second) {
      if (!first) return 1
      if (!second) return -1
      return first.localeCompare(second)
    }
    return byName(a, b)
  }

  let compare = null
  if (sortBy === 'recommended') {
    if (splitQuery(query).length > 0) {
      const scores = new Map(items.map(({ exercise }) => [exercise, scoreExercise(exercise, query)]))
      compare = (a, b) => scores.get(b.exercise) - scores.get(a.exercise) || byName(a.exercise, b.exercise)
    }
  } else if (sortBy === 'name-asc') {
    compare = (a, b) => byName(a.exercise, b.exercise)
  } else if (sortBy === 'name-desc') {
    compare = (a, b) => byName(b.exercise, a.exercise)
  } else if (sortBy === 'body-part') {
    const compareBodyPart = compareField('bodyPart')
    compare = (a, b) => compareBodyPart(a.exercise, b.exercise)
  } else if (sortBy === 'target') {
    const compareTarget = compareField('target')
    compare = (a, b) => compareTarget(a.exercise, b.exercise)
  } else if (sortBy === 'equipment') {
    const compareEquipment = compareField('equipment')
    compare = (a, b) => compareEquipment(a.exercise, b.exercise)
  }

  if (!compare) return items.map((item) => item.exercise)
  items.sort((a, b) => compare(a, b) || a.index - b.index)
  return items.map((item) => item.exercise)
}

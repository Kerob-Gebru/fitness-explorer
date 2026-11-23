import { FOCUS_ZONES, normalizeBodyPart } from './focusFigureData.js'

const ZONE_IDS = FOCUS_ZONES.map((zone) => zone.id)

const EXACT_BODYPART_TO_ZONE = {
  chest: 'chest',
  pectorals: 'chest',
  pecs: 'chest',
  back: 'back',
  lats: 'back',
  traps: 'back',
  'upper back': 'back',
  'lower back': 'back',
  spine: 'back',
  rhomboids: 'back',
  shoulders: 'shoulders',
  delts: 'shoulders',
  deltoids: 'shoulders',
  arms: 'arms',
  'upper arms': 'arms',
  'lower arms': 'arms',
  biceps: 'arms',
  triceps: 'arms',
  forearms: 'arms',
  core: 'core',
  waist: 'core',
  abs: 'core',
  abdominals: 'core',
  obliques: 'core',
  legs: 'legs',
  'upper legs': 'legs',
  'lower legs': 'legs',
  quads: 'legs',
  quadriceps: 'legs',
  hamstrings: 'legs',
  glutes: 'legs',
  calves: 'legs',
  adductors: 'legs',
  abductors: 'legs',
}

export function createEmptyZoneCounts() {
  return Object.fromEntries(ZONE_IDS.map((id) => [id, 0]))
}

export function mapMuscleNameToZone(rawValue) {
  const normalized = normalizeBodyPart(rawValue)
  if (!normalized) return null

  if (EXACT_BODYPART_TO_ZONE[normalized]) {
    return EXACT_BODYPART_TO_ZONE[normalized]
  }

  if (/(chest|pec)/.test(normalized)) return 'chest'
  if (/(back|lat|trap|rhomboid|erector|spine|teres)/.test(normalized)) return 'back'
  if (/(shoulder|delt|rotator|neck)/.test(normalized)) return 'shoulders'
  if (/(arm|bicep|tricep|forearm|brachial|wrist)/.test(normalized)) return 'arms'
  if (/(core|ab|waist|oblique|serratus|hip flexor)/.test(normalized)) return 'core'
  if (/(leg|quad|hamstring|glute|calf|calves|adductor|abductor|thigh|shin)/.test(normalized)) return 'legs'

  return null
}

function toStringList(value) {
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string' && item.trim())
  if (typeof value === 'string' && value.trim()) return [value]
  return []
}

// Extracts the primary anatomical zone and optional secondary zones from any exercise object.
export function mapExerciseToZones(exercise) {
  if (!exercise || typeof exercise !== 'object') {
    return { primaryZone: null, secondaryZones: [], allZones: [] }
  }

  const primaryCandidates = [
    ...toStringList(exercise.bodyPart),
    ...toStringList(exercise.target),
  ]

  let primaryZone = null
  for (const candidate of primaryCandidates) {
    const mapped = mapMuscleNameToZone(candidate)
    if (mapped) {
      primaryZone = mapped
      break
    }
  }

  const secondarySet = new Set()
  const secondaryCandidates = [
    ...toStringList(exercise.target),
    ...toStringList(exercise.secondaryMuscles),
  ]
  for (const candidate of secondaryCandidates) {
    const mapped = mapMuscleNameToZone(candidate)
    if (mapped && mapped !== primaryZone) {
      secondarySet.add(mapped)
    }
  }

  if (!primaryZone && normalizeBodyPart(exercise.bodyPart) === 'cardio') {
    primaryZone = 'legs'
    secondarySet.add('core')
  }

  const secondaryZones = [...secondarySet]
  const allZones = primaryZone ? [primaryZone, ...secondaryZones] : secondaryZones

  return { primaryZone, secondaryZones, allZones }
}

// Aggregates muscle coverage across a collection of exercises (library results, favorites,
// workout builder, saved plan, or scheduled workouts). Optional `configs` weights by set count.
export function summarizeExercisesZones(exercises, configs = null) {
  const counts = createEmptyZoneCounts()
  const setVolume = createEmptyZoneCounts()
  let mappedExercises = 0

  for (const exercise of Array.isArray(exercises) ? exercises : []) {
    if (!exercise || typeof exercise !== 'object') continue
    const { primaryZone, secondaryZones } = mapExerciseToZones(exercise)
    if (!primaryZone && secondaryZones.length === 0) continue

    mappedExercises += 1
    const rawSets = Number(configs?.[exercise.id]?.sets ?? exercise?.config?.sets ?? 1)
    const sets = Number.isFinite(rawSets) && rawSets > 0 ? rawSets : 1

    if (primaryZone) {
      counts[primaryZone] += 1
      setVolume[primaryZone] += sets
    }
    for (const secZone of secondaryZones) {
      if (counts[secZone] === 0) counts[secZone] += 0.5
      setVolume[secZone] += Math.round(sets * 0.5)
    }
  }

  let dominantZone = null
  let maxScore = 0
  for (const id of ZONE_IDS) {
    const score = configs ? setVolume[id] : counts[id]
    if (score > maxScore) {
      maxScore = score
      dominantZone = id
    }
  }

  const activeZones = ZONE_IDS.filter((id) => counts[id] > 0)
  const missingZones = ZONE_IDS.filter((id) => counts[id] === 0)

  return {
    counts,
    setVolume,
    mappedExercises,
    dominantZone,
    activeZones,
    missingZones,
  }
}

export function buildSingleExerciseZoneState(exercise) {
  const counts = createEmptyZoneCounts()
  const { primaryZone, secondaryZones } = mapExerciseToZones(exercise)
  for (const secZone of secondaryZones) {
    counts[secZone] = 1
  }
  return {
    primaryZone,
    secondaryZones,
    counts,
  }
}

export function getZoneLabel(zoneId) {
  return FOCUS_ZONES.find((zone) => zone.id === zoneId)?.label ?? ''
}

// Resolves a 3D zone ID (e.g. 'arms', 'core', 'legs') to an exact bodyPart string
// supported by the current exercise dataset options (or falls back to zoneId).
export function resolveZoneBodyPartFilter(zoneId, availableBodyParts = []) {
  if (!zoneId) return ''
  const options = Array.isArray(availableBodyParts) ? availableBodyParts.filter((v) => typeof v === 'string' && v.trim()) : []
  const exact = options.find((opt) => normalizeBodyPart(opt) === zoneId)
  if (exact) return exact
  const mapped = options.find((opt) => mapMuscleNameToZone(opt) === zoneId)
  return mapped || zoneId
}


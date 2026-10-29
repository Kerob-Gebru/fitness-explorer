import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ExerciseCard from './ExerciseCard.jsx'
import useAsyncData from '../../hooks/useAsyncData.js'
import { getExercises, getLocalExercises } from '../../services/exerciseApi.js'
import { rankExerciseAlternatives } from '../../features/exercises/exerciseHelpers.js'
import { useWorkoutStore } from '../../features/workout/useWorkoutStore.js'
import { formatLabel } from '../../utils/formatExercise.js'

const MAX_ALTERNATIVES = 6

export default function RelatedExercises({ exercise }) {
  const [equipmentFilter, setEquipmentFilter] = useState('')
  const [targetFilter, setTargetFilter] = useState('')
  const [bodyPartFilter, setBodyPartFilter] = useState('')
  const [bodyweightOnly, setBodyweightOnly] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const plans = useWorkoutStore((state) => state.plans)
  const replaceExerciseInPlan = useWorkoutStore((state) => state.replaceExerciseInPlan)
  const plansContainingExercise = useMemo(
    () => plans.filter((plan) => plan.exercises.some((item) => String(item.id) === String(exercise.id))),
    [plans, exercise.id],
  )
  const selectedPlan = plansContainingExercise.find((plan) => plan.id === selectedPlanId) ?? plansContainingExercise[0]
  const isLocalExercise = exercise.source === 'mock' || String(exercise.id).startsWith('demo-')
  const { data: exercises, loading, error, retry } = useAsyncData(
    () => isLocalExercise ? getLocalExercises() : getExercises(),
    [isLocalExercise],
  )
  const alternatives = useMemo(
    () => (exercises ? rankExerciseAlternatives(exercise, exercises) : []),
    [exercise, exercises],
  )
  const equipmentOptions = useMemo(() => getOptions(alternatives, 'equipment'), [alternatives])
  const targetOptions = useMemo(() => getOptions(alternatives, 'target'), [alternatives])
  const bodyPartOptions = useMemo(() => getOptions(alternatives, 'bodyPart'), [alternatives])
  const supportsBodyweight = alternatives.some(({ exercise: item }) => isBodyweight(item.equipment))
  const filteredAlternatives = useMemo(() => alternatives.filter(({ exercise: item }) =>
    (!equipmentFilter || matches(item.equipment, equipmentFilter)) &&
    (!targetFilter || matches(item.target, targetFilter)) &&
    (!bodyPartFilter || matches(item.bodyPart, bodyPartFilter)) &&
    (!bodyweightOnly || isBodyweight(item.equipment)),
  ).slice(0, MAX_ALTERNATIVES), [
    alternatives, equipmentFilter, targetFilter, bodyPartFilter, bodyweightOnly,
  ])

  function replaceExercise(alternative, announce) {
    if (!selectedPlan) {
      announce('Save a plan containing this exercise to replace it.')
      return
    }
    const replaced = replaceExerciseInPlan(selectedPlan.id, exercise.id, alternative)
    announce(replaced ? `Replaced in ${selectedPlan.name}. History and scheduled workouts were not changed.` : 'This plan could not be updated.')
  }

  const hasFilters = equipmentOptions.length > 1 || targetOptions.length > 1 ||
    bodyPartOptions.length > 1 || supportsBodyweight

  if (loading) {
    return (
      <section className="section" aria-labelledby="alternatives-title" aria-busy="true">
        <h2 id="alternatives-title">Alternative exercises</h2>
        <p className="muted">Finding exercises with matching muscle information…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="section" aria-labelledby="alternatives-title">
        <h2 id="alternatives-title">Alternative exercises</h2>
        <p className="muted">Alternatives could not be loaded right now. Please try again later.</p>
        <button type="button" className="btn" onClick={retry}>Try again</button>
      </section>
    )
  }

  return (
    <section className="section" aria-labelledby="alternatives-title">
      <div className="section__head alternative-section-head">
        <div>
          <p className="eyebrow">EXPLORE OTHER OPTIONS</p>
          <h2 id="alternatives-title">Alternative exercises</h2>
          <p className="muted">Suggestions are matched by exercise data; they are not claims of medical or biomechanical equivalence.</p>
        </div>
        <Link to="/explore">Browse all</Link>
      </div>

      {hasFilters && (
        <div className="alternative-filters" role="group" aria-label="Filter alternative exercises">
          {equipmentOptions.length > 1 && (
            <label className="field">
              <span>Equipment</span>
              <select className="input" value={equipmentFilter} onChange={(event) => setEquipmentFilter(event.target.value)}>
                <option value="">Any equipment</option>
                {equipmentOptions.map((option) => <option key={option.value} value={option.value}>{formatLabel(option.label)}</option>)}
              </select>
            </label>
          )}
          {targetOptions.length > 1 && (
            <label className="field">
              <span>Target muscle</span>
              <select className="input" value={targetFilter} onChange={(event) => setTargetFilter(event.target.value)}>
                <option value="">Any target</option>
                {targetOptions.map((option) => <option key={option.value} value={option.value}>{formatLabel(option.label)}</option>)}
              </select>
            </label>
          )}
          {bodyPartOptions.length > 1 && (
            <label className="field">
              <span>Body part</span>
              <select className="input" value={bodyPartFilter} onChange={(event) => setBodyPartFilter(event.target.value)}>
                <option value="">Any body part</option>
                {bodyPartOptions.map((option) => <option key={option.value} value={option.value}>{formatLabel(option.label)}</option>)}
              </select>
            </label>
          )}
          {supportsBodyweight && (
            <label className="alternative-filter-checkbox">
              <input type="checkbox" checked={bodyweightOnly} onChange={(event) => setBodyweightOnly(event.target.checked)} />
              Bodyweight only
            </label>
          )}
        </div>
      )}

      <div className="alternative-replacement">
        {plansContainingExercise.length > 0 ? (
          <>
            <label className="field" htmlFor="alternative-plan">
              Replace this exercise in a saved plan
              <select id="alternative-plan" className="input" value={selectedPlan?.id ?? ''} onChange={(event) => setSelectedPlanId(event.target.value)}>
                {plansContainingExercise.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
              </select>
            </label>
            <p className="muted">Replacement affects only the selected plan. Completed sessions and scheduled workouts keep their saved exercise details.</p>
          </>
        ) : plans.length === 0 ? (
          <p className="muted">To replace an exercise in a plan, <Link to="/workout">build and save a workout plan</Link> containing this exercise.</p>
        ) : (
          <p className="muted">None of your saved plans currently contain this exercise, so they cannot be changed here.</p>
        )}
      </div>

      <p className="result-count" aria-live="polite">
        {filteredAlternatives.length} alternative{filteredAlternatives.length === 1 ? '' : 's'} shown
      </p>
      {filteredAlternatives.length > 0 ? (
        <ul className="grid">
          {filteredAlternatives.map(({ exercise: alternative, reasons }) => (
            <li key={alternative.id}>
              <ExerciseCard
                exercise={alternative}
                reason={reasons.join(' ')}
                onReplace={plansContainingExercise.length ? replaceExercise : undefined}
                replaceDisabled={!selectedPlan}
              />
            </li>
          ))}
        </ul>
      ) : alternatives.length > 0 ? (
        <p className="muted">No alternatives match these filters. Try changing equipment or broadening the target or body-part selection.</p>
      ) : (
        <p className="muted">No suitable alternatives were found from the available exercise data. Try browsing exercises with a different equipment or muscle-group filter.</p>
      )}
    </section>
  )
}

function getOptions(alternatives, key) {
  const values = new Map()
  alternatives.forEach(({ exercise }) => {
    const entries = Array.isArray(exercise[key]) ? exercise[key] : [exercise[key]]
    entries.forEach((value) => {
      if (typeof value !== 'string' || !value.trim()) return
      const normalized = value.trim().toLocaleLowerCase()
      if (!values.has(normalized)) values.set(normalized, value.trim())
    })
  })
  return [...values].map(([value, label]) => ({ value, label }))
    .sort((first, second) => first.label.localeCompare(second.label))
}

function matches(value, expected) {
  const values = Array.isArray(value) ? value : [value]
  return values.some((item) => typeof item === 'string' && item.trim().toLocaleLowerCase() === expected)
}

function isBodyweight(value) {
  return matches(value, 'body weight') || matches(value, 'bodyweight')
}

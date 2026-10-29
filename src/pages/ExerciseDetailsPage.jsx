import { Link, useParams } from 'react-router-dom'
import ExerciseImage from '../components/exercises/ExerciseImage.jsx'
import FavoriteButton from '../components/exercises/FavoriteButton.jsx'
import WorkoutButton from '../components/exercises/WorkoutButton.jsx'
import RelatedExercises from '../components/exercises/RelatedExercises.jsx'
import { useEffect } from 'react'
import { useRecentStore } from '../features/recent/useRecentStore.js'
import { normalizeExerciseInstructions, normalizeExerciseValues } from '../features/exercises/exerciseDetails.js'
import Loader from '../components/common/Loader.jsx'
import ErrorMessage from '../components/common/ErrorMessage.jsx'
import NotFoundPage from './NotFoundPage.jsx'
import useAsyncData from '../hooks/useAsyncData.js'
import useDocumentTitle from '../hooks/useDocumentTitle.js'
import { getExerciseById } from '../services/exerciseApi.js'
import { formatLabel } from '../utils/formatExercise.js'

export default function ExerciseDetailsPage() {
  const { id } = useParams()
  const { data: exercise, loading, error, retry } = useAsyncData(() => getExerciseById(id), [id])
  useDocumentTitle(exercise ? formatLabel(exercise.name) : 'Exercise')
  const rememberExercise = useRecentStore((state) => state.rememberExercise)
  useEffect(() => { if (exercise) rememberExercise(exercise) }, [exercise, rememberExercise])

  if (loading) return <Loader label="Loading exercise..." />

  if (error?.name === 'NotFoundError') {
    return (
      <NotFoundPage
        title="Exercise not found"
        text="We could not find an exercise with that link. It may have been removed or the address is mistyped."
        linkTo="/explore"
        linkLabel="Browse exercises"
      />
    )
  }
  if (error) return <ErrorMessage error={error} onRetry={retry} />
  if (!exercise) return null

  const steps = normalizeExerciseInstructions(exercise.instructions)
  const primaryMuscles = normalizeExerciseValues(exercise.target)
  const primaryKeys = new Set(primaryMuscles.map((muscle) => muscle.toLocaleLowerCase()))
  const secondaryMuscles = normalizeExerciseValues(exercise.secondaryMuscles)
    .filter((muscle) => !primaryKeys.has(muscle.toLocaleLowerCase()))
  const bodyParts = normalizeExerciseValues(exercise.bodyPart)
  const equipment = normalizeExerciseValues(exercise.equipment)
  const categories = normalizeExerciseValues(exercise.category)
  const difficulty = normalizeExerciseValues(exercise.difficulty)
  const tips = normalizeExerciseInstructions(exercise.tips)
  const safetyConsiderations = normalizeExerciseInstructions(exercise.safetyConsiderations)
  const commonMistakes = normalizeExerciseInstructions(exercise.commonMistakes)

  return (
    <article className="exercise-details">
      <nav className="details-breadcrumb" aria-label="Breadcrumb">
        <Link to="/explore">Explore</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{formatLabel(exercise.name)}</span>
      </nav>

      <header className="details-heading">
        <div>
          <p className="eyebrow">EXERCISE OVERVIEW</p>
          <h1>{formatLabel(exercise.name)}</h1>
          {exercise.source === 'mock' && <span className="chip chip--accent">Sample exercise</span>}
        </div>
        <div className="details__actions">
          <FavoriteButton exercise={exercise} variant="full" />
          <WorkoutButton exercise={exercise} />
        </div>
      </header>

      <div className="details-hero">
        <section className="demonstration-panel" aria-labelledby="demonstration-title">
          <h2 id="demonstration-title">Demonstration</h2>
          <ExerciseImage key={exercise.gifUrl ?? exercise.id} src={exercise.gifUrl} name={formatLabel(exercise.name)} className="details__image" />
        </section>

        <section className="details-overview-panel" aria-labelledby="muscle-title">
          <h2 id="muscle-title">Muscles and equipment</h2>
          {primaryMuscles.length > 0 && (
            <div className="details-info-group">
              <h3>Primary target</h3>
              <ul className="chips">{primaryMuscles.map((muscle) => <li className="chip chip--accent" key={muscle}>{formatLabel(muscle)}</li>)}</ul>
            </div>
          )}
          {secondaryMuscles.length > 0 && (
            <div className="details-info-group">
              <h3>Secondary muscles</h3>
              <ul className="chips">{secondaryMuscles.map((muscle) => <li className="chip" key={muscle}>{formatLabel(muscle)}</li>)}</ul>
            </div>
          )}
          <dl className="facts details-facts">
            {bodyParts.length > 0 && <div><dt>Body part</dt><dd>{bodyParts.map(formatLabel).join(', ')}</dd></div>}
            {equipment.length > 0 && <div><dt>Equipment</dt><dd>{equipment.map(formatLabel).join(', ')}</dd></div>}
            {categories.length > 0 && <div><dt>Category</dt><dd>{categories.map(formatLabel).join(', ')}</dd></div>}
            {difficulty.length > 0 && <div><dt>Difficulty</dt><dd>{difficulty.map(formatLabel).join(', ')}</dd></div>}
          </dl>
          {primaryMuscles.length === 0 && secondaryMuscles.length === 0 && bodyParts.length === 0 && equipment.length === 0 && categories.length === 0 && difficulty.length === 0 && (
            <p className="muted">Muscle and equipment information is not available for this exercise.</p>
          )}
        </section>
      </div>

      <section className="section details-instructions" aria-labelledby="steps-title">
        <div className="details-section-heading"><p className="eyebrow">STEP BY STEP</p><h2 id="steps-title">Instructions</h2></div>
        {steps.length > 0 ? (
          <ol className="steps details-steps">{steps.map((step, index) => <li key={`${index}-${step}`}><span className="details-step-number" aria-hidden="true">{index + 1}</span><p>{step}</p></li>)}</ol>
        ) : (
          <p className="muted">Instructions are not available for this exercise.</p>
        )}
      </section>

      {(tips.length > 0 || safetyConsiderations.length > 0 || commonMistakes.length > 0) && (
        <section className="section details-guidance" aria-labelledby="guidance-title">
          <div className="details-section-heading"><p className="eyebrow">SOURCE-PROVIDED INFORMATION</p><h2 id="guidance-title">Tips and considerations</h2></div>
          {tips.length > 0 && <GuidanceList title="Tips" items={tips} />}
          {safetyConsiderations.length > 0 && <GuidanceList title="Safety considerations" items={safetyConsiderations} />}
          {commonMistakes.length > 0 && <GuidanceList title="Common mistakes" items={commonMistakes} />}
        </section>
      )}

      <RelatedExercises exercise={exercise} />
    </article>
  )
}

function GuidanceList({ title, items }) {
  return (
    <div className="details-guidance__group">
      <h3>{title}</h3>
      <ul>{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
    </div>
  )
}

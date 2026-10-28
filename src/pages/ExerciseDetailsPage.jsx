import { Link, useParams } from 'react-router-dom'
import ExerciseImage from '../components/exercises/ExerciseImage.jsx'
import FavoriteButton from '../components/exercises/FavoriteButton.jsx'
import WorkoutButton from '../components/exercises/WorkoutButton.jsx'
import RelatedExercises from '../components/exercises/RelatedExercises.jsx'
import { useEffect } from 'react'
import { useRecentStore } from '../features/recent/useRecentStore.js'
import Loader from '../components/common/Loader.jsx'
import ErrorMessage from '../components/common/ErrorMessage.jsx'
import NotFoundPage from './NotFoundPage.jsx'
import useAsyncData from '../hooks/useAsyncData.js'
import useDocumentTitle from '../hooks/useDocumentTitle.js'
import { getExerciseById } from '../services/exerciseApi.js'
import { cleanInstructions, formatLabel } from '../utils/formatExercise.js'

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

  const steps = cleanInstructions(exercise.instructions)
  const secondary = Array.isArray(exercise.secondaryMuscles) ? exercise.secondaryMuscles : []

  return (
    <article className="details">
      <Link to="/explore" className="back-link">
        Back to exercises
      </Link>
      <div className="details__layout">
        <ExerciseImage src={exercise.gifUrl} name={exercise.name} className="details__image" />
        <div>
          <h1>{formatLabel(exercise.name)}</h1>
          <dl className="facts">
            <div>
              <dt>Body part</dt>
              <dd>{formatLabel(exercise.bodyPart)}</dd>
            </div>
            <div>
              <dt>Target muscle</dt>
              <dd>{formatLabel(exercise.target)}</dd>
            </div>
            <div>
              <dt>Equipment</dt>
              <dd>{formatLabel(exercise.equipment)}</dd>
            </div>
          </dl>
          {secondary.length > 0 && (
            <>
              <h2 className="details__subtitle">Also works</h2>
              <ul className="chips">
                {secondary.map((muscle) => (
                  <li key={muscle} className="chip">
                    {formatLabel(muscle)}
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="details__actions">
            <FavoriteButton exercise={exercise} variant="full" />
            <WorkoutButton exercise={exercise} />
          </div>
        </div>
      </div>

      <section className="section" aria-labelledby="steps-title">
        <h2 id="steps-title">How to do it</h2>
        {steps.length > 0 ? (
          <ol className="steps">
            {steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        ) : (
          <p className="muted">Instructions are not available for this exercise.</p>
        )}
      </section>

      <RelatedExercises exercise={exercise} />
    </article>
  )
}

import { Link, useParams } from 'react-router-dom'
import ExerciseLearningCenter from '../components/exercises/ExerciseLearningCenter.jsx'
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

      <ExerciseLearningCenter key={exercise.id} exercise={exercise} />

      <RelatedExercises exercise={exercise} />
    </article>
  )
}

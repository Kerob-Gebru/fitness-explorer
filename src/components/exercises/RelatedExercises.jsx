import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import ExerciseGrid from './ExerciseGrid.jsx'
import useAsyncData from '../../hooks/useAsyncData.js'
import { getExercises } from '../../services/exerciseApi.js'
import { rankRelatedExercises } from '../../features/exercises/exerciseHelpers.js'

const MAX_RELATED = 6

export default function RelatedExercises({ exercise }) {
  const { data: exercises, error } = useAsyncData(() => getExercises(), [])
  const related = useMemo(
    () => (exercises ? rankRelatedExercises(exercise, exercises, MAX_RELATED) : []),
    [exercise, exercises],
  )

  if (error) {
    return (
      <section className="section" aria-labelledby="related-title">
        <h2 id="related-title">Related exercises</h2>
        <p className="muted">Similar exercises could not be loaded right now. Please try again later.</p>
      </section>
    )
  }

  if (related.length === 0) return null

  return (
    <section className="section" aria-labelledby="related-title">
      <div className="section__head">
        <div>
          <p className="eyebrow">KEEP THE MOMENTUM</p>
          <h2 id="related-title">Related exercises</h2>
        </div>
        <Link to="/explore">Browse all</Link>
      </div>
      <ExerciseGrid exercises={related} />
    </section>
  )
}

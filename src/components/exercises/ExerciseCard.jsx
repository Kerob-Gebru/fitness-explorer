import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ExerciseImage from './ExerciseImage.jsx'
import FavoriteButton from './FavoriteButton.jsx'
import WorkoutButton from './WorkoutButton.jsx'
import { formatLabel } from '../../utils/formatExercise.js'

const FEEDBACK_MS = 2200

export default function ExerciseCard({ exercise }) {
  const [feedback, setFeedback] = useState('')
  const feedbackTimer = useRef(null)

  useEffect(() => () => clearTimeout(feedbackTimer.current), [])

  function announce(message) {
    clearTimeout(feedbackTimer.current)
    setFeedback(message)
    feedbackTimer.current = setTimeout(() => setFeedback(''), FEEDBACK_MS)
  }

  return (
    <article className="card">
      <Link to={`/exercises/${exercise.id}`} className="card__link">
        <ExerciseImage src={exercise.gifUrl} name={exercise.name} />
        <div className="card__body">
          <h3 className="card__title">{formatLabel(exercise.name)}</h3>
          <ul className="chips">
            <li className="chip chip--accent">{formatLabel(exercise.target, 'Target unknown')}</li>
            <li className="chip">{formatLabel(exercise.bodyPart, 'Body part unknown')}</li>
            <li className="chip">{formatLabel(exercise.equipment, 'Equipment unknown')}</li>
          </ul>
        </div>
      </Link>
      <div className="card__fav">
        <FavoriteButton exercise={exercise} onToggle={(saved) => announce(saved ? 'Saved to favorites' : 'Removed from favorites')} />
      </div>
      <div className="card__workout">
        <WorkoutButton exercise={exercise} compact onToggle={(selected) => announce(selected ? 'Added to your workout' : 'Removed from your workout')} />
      </div>
      {feedback && (
        <p className="card__feedback" role="status">
          {feedback}
        </p>
      )}
    </article>
  )
}

import ExerciseCard from './ExerciseCard.jsx'

export default function ExerciseGrid({ exercises, onHoverExercise = null }) {
  return (
    <ul className="grid">
      {exercises.map((exercise) => (
        <li key={exercise.id}>
          <ExerciseCard exercise={exercise} onHoverExercise={onHoverExercise} />
        </li>
      ))}
    </ul>
  )
}

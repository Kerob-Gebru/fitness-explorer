import ExerciseCard from './ExerciseCard.jsx'

export default function ExerciseGrid({ exercises }) {
  return (
    <ul className="grid">
      {exercises.map((exercise) => (
        <li key={exercise.id}>
          <ExerciseCard exercise={exercise} />
        </li>
      ))}
    </ul>
  )
}

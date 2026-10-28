import { useWorkoutStore } from '../../features/workout/useWorkoutStore.js'
import { formatLabel } from '../../utils/formatExercise.js'

export default function WorkoutButton({ exercise, compact = false, onToggle }) {
  const selected = useWorkoutStore((state) => state.exercises.some((item) => String(item.id) === String(exercise.id)))
  const toggleExercise = useWorkoutStore((state) => state.toggleExercise)

  function handleClick() {
    toggleExercise(exercise)
    if (onToggle) onToggle(!selected)
  }

  return (
    <button
      type="button"
      className={`workout-btn ${selected ? 'workout-btn--selected' : ''} ${compact ? 'workout-btn--compact' : ''}`}
      aria-pressed={selected}
      aria-label={`${selected ? 'Remove' : 'Add'} ${formatLabel(exercise.name)} ${selected ? 'from' : 'to'} workout`}
      onClick={handleClick}
    >
      <span aria-hidden="true">{selected ? '✓' : '+'}</span>{!compact && <span>{selected ? 'In workout' : 'Add to workout'}</span>}
    </button>
  )
}

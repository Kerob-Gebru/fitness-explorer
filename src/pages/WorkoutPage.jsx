import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import ExerciseImage from '../components/exercises/ExerciseImage.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import useDocumentTitle from '../hooks/useDocumentTitle.js'
import { useWorkoutStore } from '../features/workout/useWorkoutStore.js'
import { formatLabel } from '../utils/formatExercise.js'

const defaults = { sets: 3, reps: 12, rest: 60 }

export default function WorkoutPage() {
  useDocumentTitle('Workout dashboard')
  const exercises = useWorkoutStore((state) => state.exercises)
  const settings = useWorkoutStore((state) => state.settings)
  const removeExercise = useWorkoutStore((state) => state.removeExercise)
  const clearWorkout = useWorkoutStore((state) => state.clearWorkout)
  const updateSession = useWorkoutStore((state) => state.updateSession)
  const updateExerciseConfig = useWorkoutStore((state) => state.updateExerciseConfig)
  const toggleCompleted = useWorkoutStore((state) => state.toggleCompleted)
  const moveExercise = useWorkoutStore((state) => state.moveExercise)

  const stats = useMemo(() => {
    const totalSets = exercises.reduce((sum, exercise) => sum + Number(settings.configs[exercise.id]?.sets ?? defaults.sets), 0)
    const restSeconds = exercises.reduce((sum, exercise) => {
      const config = { ...defaults, ...settings.configs[exercise.id] }
      return sum + Math.max(0, Number(config.sets) - 1) * Math.max(0, Number(config.rest))
    }, 0)
    const liftingMinutes = exercises.reduce((sum, exercise) => {
      const config = { ...defaults, ...settings.configs[exercise.id] }
      return sum + Number(config.sets) * Number(config.reps) * 3 / 60
    }, 0)
    return { totalSets, minutes: Math.max(0, Math.round((restSeconds / 60) + liftingMinutes + exercises.length * 1.5)) }
  }, [exercises, settings.configs])

  const completedCount = exercises.filter((exercise) => settings.completed.some((id) => String(id) === String(exercise.id))).length
  const progress = exercises.length ? Math.round(completedCount / exercises.length * 100) : 0

  function printWorkout() { window.print() }
  function handleClear() {
    if (window.confirm('Clear all exercises from this workout?')) clearWorkout()
  }

  return (
    <section className="workout-page dashboard-page">
      <div className="page-heading dashboard-heading">
        <div>
          <p className="eyebrow">YOUR TRAINING SPACE</p>
          <h1>Workout dashboard</h1>
          <p className="muted">Plan your session, set targets, and track each exercise as you go.</p>
        </div>
        {exercises.length > 0 && <button type="button" className="btn btn--primary" onClick={printWorkout}>Print plan ↗</button>}
      </div>

      {exercises.length === 0 ? (
        <EmptyState title="Your next session starts here" text="Add exercises from Explore, then use this dashboard to set reps, rest periods, and track your progress.">
          <Link to="/explore" className="btn btn--primary">Build a workout</Link>
        </EmptyState>
      ) : (
        <>
          <div className="dashboard-top-grid">
            <section className="session-panel">
              <label className="field-label" htmlFor="session-name">SESSION NAME</label>
              <input id="session-name" className="input session-name-input" value={settings.name} maxLength={60} onChange={(event) => updateSession({ name: event.target.value })} />
              <div className="session-goal-row">
                <div><label className="field-label" htmlFor="goal-minutes">TIME GOAL</label><div className="goal-input-wrap"><input id="goal-minutes" className="input" type="number" min="5" max="240" value={settings.goalMinutes} onChange={(event) => updateSession({ goalMinutes: Math.min(240, Math.max(5, Number(event.target.value) || 5)) })} /><span>min</span></div></div>
                <div className="session-goal-note"><span className="status-dot" /> {stats.minutes <= Number(settings.goalMinutes) ? 'On track' : 'Over your time goal'}</div>
              </div>
            </section>
            <section className="progress-panel">
              <div className="progress-panel__heading"><div><p className="eyebrow">SESSION PROGRESS</p><h2>{completedCount} <span>/ {exercises.length}</span></h2><p className="muted">Exercises completed</p></div><div className="progress-ring" style={{ '--progress': `${progress}%` }}><span>{progress}%</span></div></div>
              <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
              <p className="progress-footnote">{progress === 100 ? 'Session complete. Great work!' : 'Mark each exercise complete as you finish it.'}</p>
            </section>
          </div>

          <div className="dashboard-stat-grid">
            <article className="dashboard-stat"><span className="dashboard-stat__icon">▤</span><div><p className="muted">Exercises</p><strong>{String(exercises.length).padStart(2, '0')}</strong></div><span className="dashboard-stat__hint">in this session</span></article>
            <article className="dashboard-stat"><span className="dashboard-stat__icon">↻</span><div><p className="muted">Total sets</p><strong>{stats.totalSets}</strong></div><span className="dashboard-stat__hint">planned sets</span></article>
            <article className="dashboard-stat"><span className="dashboard-stat__icon">◷</span><div><p className="muted">Est. duration</p><strong>{stats.minutes}<small> min</small></strong></div><span className="dashboard-stat__hint">including rest</span></article>
          </div>

          <div className="dashboard-section-heading"><div><p className="eyebrow">YOUR EXERCISES</p><h2>Session plan <span className="count-pill">{exercises.length}</span></h2></div><Link to="/explore" className="btn">+ Add exercise</Link></div>
          <ol className="dashboard-exercise-list">
            {exercises.map((exercise, index) => {
              const config = { ...defaults, ...settings.configs[exercise.id] }
              const isCompleted = settings.completed.some((id) => String(id) === String(exercise.id))
              return (
                <li className={`dashboard-exercise ${isCompleted ? 'dashboard-exercise--complete' : ''}`} key={exercise.id}>
                  <div className="dashboard-exercise__top">
                    <button className={`complete-toggle ${isCompleted ? 'complete-toggle--checked' : ''}`} type="button" onClick={() => toggleCompleted(exercise.id)} aria-label={isCompleted ? 'Mark exercise incomplete' : 'Mark exercise complete'}>{isCompleted ? '✓' : ''}</button>
                    <span className="dashboard-exercise__number">{String(index + 1).padStart(2, '0')}</span>
                    <ExerciseImage src={exercise.gifUrl} name={exercise.name} className="dashboard-exercise__image" />
                    <div className="dashboard-exercise__info"><h3>{formatLabel(exercise.name)}</h3><p>{formatLabel(exercise.target)} <span>·</span> {formatLabel(exercise.equipment)}</p><Link to={`/exercises/${exercise.id}`}>View instructions ↗</Link></div>
                    <div className="exercise-reorder"><button type="button" className="icon-btn" onClick={() => moveExercise(exercise.id, -1)} disabled={index === 0} aria-label="Move exercise up">↑</button><button type="button" className="icon-btn" onClick={() => moveExercise(exercise.id, 1)} disabled={index === exercises.length - 1} aria-label="Move exercise down">↓</button></div>
                    <button type="button" className="remove-icon" onClick={() => removeExercise(exercise.id)} aria-label={`Remove ${exercise.name}`}>×</button>
                  </div>
                  <div className="exercise-prescription">
                    {[['sets', 'Sets', 1, 10], ['reps', 'Reps', 1, 100], ['rest', 'Rest (sec)', 0, 600]].map(([key, label, min, max]) => (
                      <label className="prescription-field" key={key}><span>{label}</span><input type="number" min={min} max={max} value={config[key]} onChange={(event) => updateExerciseConfig(exercise.id, { [key]: Math.min(max, Math.max(min, Number(event.target.value) || min)) })} /></label>
                    ))}
                    <div className="prescription-total"><span>Volume</span><strong>{Number(config.sets) * Number(config.reps)} reps</strong></div>
                  </div>
                </li>
              )
            })}
          </ol>
          <div className="dashboard-bottom-actions"><p className="muted">Your plan is saved automatically on this device.</p><button type="button" className="btn btn--danger" onClick={handleClear}>Clear session</button></div>
          <p className="print-note muted">Estimated duration is a planning estimate, not a timer. Adjust sets, reps, and rest to suit your training level.</p>
        </>
      )}
    </section>
  )
}

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import EmptyState from '../components/common/EmptyState.jsx'
import ExerciseLearningCenter from '../components/exercises/ExerciseLearningCenter.jsx'
import useDocumentTitle from '../hooks/useDocumentTitle.js'
import { useWorkoutStore } from '../features/workout/useWorkoutStore.js'
import { formatSessionDate } from '../features/workout/workoutProgress.js'
import { formatLabel } from '../utils/formatExercise.js'

function formatClock(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function isBodyweight(exercise) {
  const equipment = formatLabel(exercise.equipment).toLocaleLowerCase()
  return equipment === 'body weight' || equipment === 'bodyweight'
}

export default function WorkoutSessionPage() {
  const navigate = useNavigate()
  const session = useWorkoutStore((state) => state.activeSession)
  const setCurrentExercise = useWorkoutStore((state) => state.setCurrentExercise)
  const setActiveExerciseStatus = useWorkoutStore((state) => state.setActiveExerciseStatus)
  const toggleActiveSet = useWorkoutStore((state) => state.toggleActiveSet)
  const updateActiveSetReps = useWorkoutStore((state) => state.updateActiveSetReps)
  const updateActiveSetWeight = useWorkoutStore((state) => state.updateActiveSetWeight)
  const updateActiveSetNote = useWorkoutStore((state) => state.updateActiveSetNote)
  const pauseSession = useWorkoutStore((state) => state.pauseSession)
  const resumeSession = useWorkoutStore((state) => state.resumeSession)
  const startRestTimer = useWorkoutStore((state) => state.startRestTimer)
  const pauseRestTimer = useWorkoutStore((state) => state.pauseRestTimer)
  const resumeRestTimer = useWorkoutStore((state) => state.resumeRestTimer)
  const resetRestTimer = useWorkoutStore((state) => state.resetRestTimer)
  const skipRestTimer = useWorkoutStore((state) => state.skipRestTimer)
  const finishSession = useWorkoutStore((state) => state.finishSession)
  const cancelSession = useWorkoutStore((state) => state.cancelSession)
  const [clock, setClock] = useState(0)
  const [restDurationOverride, setRestDurationOverride] = useState(null)

  const sessionId = session?.id
  const sessionStatus = session?.status
  const currentIndex = session?.currentExerciseIndex ?? 0
  const exercise = session?.exercises[currentIndex] ?? null
  const restTimer = session?.restTimer ?? null
  const configuredRest = Number(exercise?.config?.rest)
  const defaultRest = Number.isFinite(configuredRest) ? Math.min(600, Math.max(0, configuredRest)) : 60
  const restDuration = restDurationOverride && restDurationOverride.exerciseId === exercise?.id
    ? restDurationOverride.value
    : defaultRest
  const now = clock || Date.parse(session?.resumedAt ?? session?.startedAt ?? '') || 0

  useDocumentTitle(session ? `${session.name} | Workout` : 'Workout session')

  useEffect(() => {
    if (!sessionId || sessionStatus !== 'active') return undefined
    const timer = window.setInterval(() => setClock(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [sessionId, sessionStatus])

  useEffect(() => {
    if (!restTimer || restTimer.paused || !restTimer.endsAt) return
    const remaining = Math.ceil((Date.parse(restTimer.endsAt) - now) / 1000)
    if (remaining <= 0) pauseRestTimer()
  }, [now, restTimer, pauseRestTimer])

  if (!session) {
    return (
      <section className="workout-session-page">
        <EmptyState title="No workout is in progress" text="Start a saved plan or builder workout from your workout dashboard to begin an interactive session.">
          <Link to="/workout" className="btn btn--primary">Go to workout dashboard</Link>
        </EmptyState>
      </section>
    )
  }

  const completedExercises = session.exercises.filter((item) => item.status === 'completed').length
  const skippedExercises = session.exercises.filter((item) => item.status === 'skipped').length
  const pendingExercises = session.exercises.filter((item) => item.status === 'pending').length
  const completedSets = session.exercises.reduce((total, item) =>
    total + item.sets.filter((set) => set.completed).length, 0)
  const elapsedSeconds = session.elapsedSeconds + (
    session.status === 'active' && session.resumedAt
      ? Math.max(0, Math.floor((now - Date.parse(session.resumedAt)) / 1000))
      : 0
  )
  const restRemaining = restTimer
    ? restTimer.paused || !restTimer.endsAt
      ? restTimer.remainingSeconds
      : Math.max(0, Math.ceil((Date.parse(restTimer.endsAt) - now) / 1000))
    : null
  const allExercisesResolved = pendingExercises === 0 && completedExercises > 0

  function finishWorkout() {
    if (!allExercisesResolved && !window.confirm('Some exercises are not marked completed or skipped. End this workout early and save its progress to history?')) return
    const outcome = allExercisesResolved ? 'completed' : 'ended-early'
    finishSession(outcome)
    navigate('/workout', { replace: true, state: { workoutNotice: outcome === 'completed' ? 'Workout completed and added to your history.' : 'Workout ended early. Your progress was saved to history.' } })
  }

  function cancelWorkout() {
    if (!window.confirm('Cancel this workout? Its progress will be discarded and it will not be added to history.')) return
    cancelSession()
    navigate('/workout', { replace: true, state: { workoutNotice: 'Workout cancelled. It was not added to your history.' } })
  }

  function changeExercise(index) {
    if (session.status === 'active') {
      setRestDurationOverride(null)
      setCurrentExercise(index)
    }
  }

  function changeExerciseStatus(status) {
    if (!exercise || session.status !== 'active') return
    setActiveExerciseStatus(exercise.id, status)
  }

  function changeReps(setIndex, value) {
    if (value === '') return
    updateActiveSetReps(exercise.id, setIndex, value)
  }

  function changeWeight(setIndex, value) {
    updateActiveSetWeight(exercise.id, setIndex, value)
  }

  function beginRest() {
    startRestTimer(restDuration)
  }

  function resetRest() {
    const duration = Math.min(600, Math.max(0, Number(restDuration) || 0))
    setRestDurationOverride({ exerciseId: exercise.id, value: duration })
    resetRestTimer(duration)
  }

  return (
    <section className="workout-session-page" aria-labelledby="workout-session-title">
      <header className="workout-session-header">
        <div>
          <p className="eyebrow">{session.status === 'paused' ? 'WORKOUT PAUSED' : 'WORKOUT IN PROGRESS'}</p>
          <h1 id="workout-session-title">{session.name}</h1>
          <p className="muted">Started {formatSessionDate(session.startedAt)} · active time {formatClock(elapsedSeconds)}</p>
        </div>
        <div className="workout-session-header__actions">
          {session.status === 'paused'
            ? <button type="button" className="btn btn--primary" onClick={resumeSession}>Resume workout</button>
            : <button type="button" className="btn btn--primary" onClick={pauseSession}>Pause workout</button>}
          <button type="button" className="btn btn--danger" onClick={cancelWorkout}>Cancel</button>
        </div>
      </header>

      <div className="workout-session-progress" aria-live="polite">
        <div className="workout-session-progress__summary">
          <strong>Exercise {currentIndex + 1} of {session.exercises.length}</strong>
          <span>{completedExercises} completed · {skippedExercises} skipped · {pendingExercises} remaining</span>
          <span>{completedSets} sets completed</span>
        </div>
        <div className="workout-session-progress__track" role="progressbar" aria-label="Exercise progress" aria-valuemin="0" aria-valuemax={session.exercises.length} aria-valuenow={completedExercises}>
          <span style={{ width: `${completedExercises / session.exercises.length * 100}%` }} />
        </div>
        <ol className="workout-session-steps" aria-label="Workout exercises">
          {session.exercises.map((item, index) => (
            <li key={`${item.id}-${index}`}>
              <button
                type="button"
                className={`workout-session-step workout-session-step--${item.status}${index === currentIndex ? ' is-current' : ''}`}
                aria-current={index === currentIndex ? 'step' : undefined}
                onClick={() => changeExercise(index)}
                disabled={session.status !== 'active'}
              >
                <span>{index + 1}</span>
                <span>{formatLabel(item.name)}</span>
                <strong>{item.status === 'completed' ? 'Completed' : item.status === 'skipped' ? 'Skipped' : index === currentIndex ? 'Current' : 'Remaining'}</strong>
              </button>
            </li>
          ))}
        </ol>
      </div>

      {exercise ? (
        <article className="interactive-exercise" aria-labelledby="current-exercise-title">
          <div className="interactive-exercise__heading">
            <div>
              <p className="eyebrow">CURRENT EXERCISE</p>
              <h2 id="current-exercise-title">{formatLabel(exercise.name)}</h2>
              <p className="muted">{formatLabel(exercise.target, 'Target not available')} · {formatLabel(exercise.equipment, 'Equipment not specified')}</p>
            </div>
            <Link className="btn" to={`/exercises/${exercise.id}`}>Exercise details</Link>
          </div>
          <ExerciseLearningCenter key={exercise.id} exercise={exercise} compact />

          <section className="interactive-sets" aria-labelledby="set-tracking-title">
            <div className="interactive-sets__heading">
              <div><h3 id="set-tracking-title">Set tracking</h3><p className="muted">Plan: {exercise.config.sets} sets × {exercise.config.reps} target reps</p></div>
              <p className="muted">Target repetitions are from your saved plan.</p>
            </div>
            <div className={`interactive-set-grid${isBodyweight(exercise) ? ' is-bodyweight' : ''}`}>
              {exercise.sets.map((set, setIndex) => (
                <fieldset className={`interactive-set${set.completed ? ' active-set--complete' : ''}`} key={setIndex}>
                  <legend>Set {set.setNumber}</legend>
                  <p className="interactive-set__target">Target: {set.targetReps ?? exercise.config.reps} reps</p>
                  <label>
                    Completed reps
                    <input type="number" min="0" max="100" step="1" value={set.reps} disabled={session.status !== 'active'} onChange={(event) => changeReps(setIndex, event.target.value)} />
                  </label>
                  {!isBodyweight(exercise) && (
                    <label>
                      Weight / resistance (your unit)
                      <input type="number" min="0" max="10000" step="any" value={set.weight ?? ''} disabled={session.status !== 'active'} onChange={(event) => changeWeight(setIndex, event.target.value)} />
                    </label>
                  )}
                  <label>
                    Set note (optional)
                    <input type="text" maxLength="200" value={set.note} disabled={session.status !== 'active'} onChange={(event) => updateActiveSetNote(exercise.id, setIndex, event.target.value)} />
                  </label>
                  <label className="interactive-set__complete">
                    <input type="checkbox" checked={set.completed} disabled={session.status !== 'active'} onChange={() => toggleActiveSet(exercise.id, setIndex)} />
                    Set completed
                  </label>
                </fieldset>
              ))}
            </div>
          </section>

          <section className="rest-timer" aria-labelledby="rest-timer-title">
            <div className="rest-timer__display">
              <p className="eyebrow" id="rest-timer-title">REST TIMER</p>
              <strong className="rest-timer__time" role="timer" aria-live="off">{restRemaining == null ? formatClock(restDuration) : formatClock(restRemaining)}</strong>
              <p className="muted">{restTimer?.paused ? 'Paused' : restTimer ? 'Counting down' : 'Ready when you are'}</p>
            </div>
            <label className="field">
              Rest duration (seconds)
              <input className="input" type="number" min="0" max="600" step="1" value={restDuration} disabled={session.status !== 'active'} onChange={(event) => setRestDurationOverride({ exerciseId: exercise.id, value: event.target.value })} />
            </label>
            <div className="rest-timer__actions">
              {!restTimer
                ? <button type="button" className="btn btn--primary" disabled={session.status !== 'active'} onClick={beginRest}>Start rest</button>
                : restTimer.paused
                  ? <button type="button" className="btn btn--primary" disabled={session.status !== 'active'} onClick={resumeRestTimer}>Resume timer</button>
                  : <button type="button" className="btn" disabled={session.status !== 'active'} onClick={pauseRestTimer}>Pause timer</button>}
              <button type="button" className="btn" disabled={session.status !== 'active'} onClick={resetRest}>Reset timer</button>
              <button type="button" className="btn" disabled={!restTimer || session.status !== 'active'} onClick={skipRestTimer}>Skip rest</button>
            </div>
          </section>

          <div className="interactive-exercise__controls">
            <div className="interactive-exercise__navigation">
              <button type="button" className="btn" disabled={session.status !== 'active' || currentIndex === 0} onClick={() => changeExercise(currentIndex - 1)}>Previous exercise</button>
              <button type="button" className="btn" disabled={session.status !== 'active' || currentIndex === session.exercises.length - 1} onClick={() => changeExercise(currentIndex + 1)}>Next exercise</button>
            </div>
            <div className="interactive-exercise__status">
              <button type="button" className="btn btn--primary" disabled={session.status !== 'active'} onClick={() => changeExerciseStatus(exercise.status === 'completed' ? 'pending' : 'completed')}>
                {exercise.status === 'completed' ? 'Mark incomplete' : 'Mark exercise complete'}
              </button>
              <button type="button" className="btn" disabled={session.status !== 'active'} onClick={() => changeExerciseStatus(exercise.status === 'skipped' ? 'pending' : 'skipped')}>
                {exercise.status === 'skipped' ? 'Undo skip' : 'Skip exercise'}
              </button>
            </div>
            <button type="button" className="btn btn--primary interactive-exercise__finish" onClick={finishWorkout}>
              {allExercisesResolved ? 'Finish workout' : 'End workout early'}
            </button>
          </div>
        </article>
      ) : (
        <EmptyState title="This session has no exercises" text="Cancel it and start again from a saved plan." />
      )}

      <footer className="workout-session-footer">
        <Link to="/workout">Workout dashboard</Link>
        {session.scheduledWorkoutId && <Link to={`/calendar?workout=${encodeURIComponent(session.scheduledWorkoutId)}`}>Scheduled workout details</Link>}
      </footer>
    </section>
  )
}

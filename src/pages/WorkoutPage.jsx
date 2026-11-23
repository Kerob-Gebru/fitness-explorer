import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import ExerciseImage from '../components/exercises/ExerciseImage.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import StudioFigureStage from '../features/home3d/StudioFigureStage.jsx'
import {
  getZoneLabel,
  resolveZoneBodyPartFilter,
  summarizeExercisesZones,
} from '../features/home3d/studioZoneMapping.js'
import useDocumentTitle from '../hooks/useDocumentTitle.js'
import { getUploadedImageFromMap, useUploadedImagesStore } from '../features/exercises/uploadedExerciseImages.js'
import { useSearchStore } from '../features/search/useSearchStore.js'
import { useWorkoutStore } from '../features/workout/useWorkoutStore.js'
import { calculateWorkoutProgress, formatSessionDate } from '../features/workout/workoutProgress.js'
import { formatLabel } from '../utils/formatExercise.js'

const defaults = { sets: 3, reps: 12, rest: 60 }

function sessionExerciseCount(session) {
  return session.exercises.filter((exercise) => exercise.status === 'completed' ||
    (!exercise.status && exercise.sets.some((set) => set.completed))).length
}

export default function WorkoutPage() {
  useDocumentTitle('Workout dashboard')
  const navigate = useNavigate()
  const location = useLocation()
  const exercises = useWorkoutStore((state) => state.exercises)
  const uploadedImages = useUploadedImagesStore((state) => state.images)
  const settings = useWorkoutStore((state) => state.settings)
  const plans = useWorkoutStore((state) => state.plans)
  const history = useWorkoutStore((state) => state.history)
  const activeSession = useWorkoutStore((state) => state.activeSession)
  const removeExercise = useWorkoutStore((state) => state.removeExercise)
  const clearWorkout = useWorkoutStore((state) => state.clearWorkout)
  const updateSession = useWorkoutStore((state) => state.updateSession)
  const updateExerciseConfig = useWorkoutStore((state) => state.updateExerciseConfig)
  const toggleCompleted = useWorkoutStore((state) => state.toggleCompleted)
  const moveExercise = useWorkoutStore((state) => state.moveExercise)
  const savePlan = useWorkoutStore((state) => state.savePlan)
  const duplicatePlan = useWorkoutStore((state) => state.duplicatePlan)
  const deletePlan = useWorkoutStore((state) => state.deletePlan)
  const startSession = useWorkoutStore((state) => state.startSession)
  const cancelSession = useWorkoutStore((state) => state.cancelSession)
  const deleteHistorySession = useWorkoutStore((state) => state.deleteHistorySession)
  const resetFilters = useSearchStore((state) => state.resetFilters)
  const setBodyPart = useSearchStore((state) => state.setBodyPart)
  const [planName, setPlanName] = useState('')
  const [planDescription, setPlanDescription] = useState('')
  const [editor, setEditor] = useState(null)
  const [notice, setNotice] = useState(() => location.state?.workoutNotice ?? '')
  const [openHistoryId, setOpenHistoryId] = useState(null)
  const [preview, setPreview] = useState(null)
  const [inspectedZone, setInspectedZone] = useState(null)

  const stats = useMemo(() => calculateWorkoutProgress(history), [history])
  const builderStats = useMemo(() => {
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

  const allPlanExercises = useMemo(
    () => plans.flatMap((plan) => plan.exercises ?? []),
    [plans],
  )

  const stageContext = useMemo(() => {
    if (preview) {
      return preview
    }
    if (exercises.length > 0) {
      return {
        kind: 'builder',
        id: 'builder',
        title: settings.name?.trim() || 'Workout builder',
        exercises,
        configs: settings.configs,
      }
    }
    if (activeSession?.exercises?.length) {
      return {
        kind: 'active',
        id: activeSession.id,
        title: activeSession.name,
        exercises: activeSession.exercises,
        configs: null,
      }
    }
    if (allPlanExercises.length > 0) {
      return {
        kind: 'plans',
        id: 'plans',
        title: 'All saved plans',
        exercises: allPlanExercises,
        configs: null,
      }
    }
    return {
      kind: 'empty',
      id: 'empty',
      title: 'Empty workspace',
      exercises: [],
      configs: null,
    }
  }, [preview, exercises, settings.name, settings.configs, activeSession, allPlanExercises])

  const zoneSummary = useMemo(
    () => summarizeExercisesZones(stageContext.exercises, stageContext.configs),
    [stageContext],
  )
  const useSetVolume = stageContext.kind === 'builder' || stageContext.kind === 'plan'
  const stageCounts = useSetVolume ? zoneSummary.setVolume : zoneSummary.counts
  const activeZone = inspectedZone ?? zoneSummary.dominantZone
  const suggestedMissingZone = zoneSummary.missingZones[0] ?? null

  function handleSavePlan(event) {
    event.preventDefault()
    const name = planName.trim() || settings.name.trim()
    if (!name) {
      setNotice('Enter a workout plan name.')
      return
    }
    if (!exercises.length) {
      setNotice('Add at least one exercise in the workout builder before saving a plan.')
      return
    }
    savePlan({ name, description: planDescription.trim(), exercises, configs: settings.configs })
    setPlanName('')
    setPlanDescription('')
    setNotice(`“${name}” saved to your workout plans.`)
  }

  function beginEdit(plan) {
    setEditor({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      exercises: plan.exercises.map((exercise) => ({ ...exercise, config: { ...defaults, ...exercise.config } })),
    })
  }

  function handleUpdatePlan(event) {
    event.preventDefault()
    if (!editor?.name.trim()) {
      setNotice('Enter a workout plan name.')
      return
    }
    if (!editor.exercises.length) {
      setNotice('A workout plan needs at least one exercise.')
      return
    }
    savePlan(editor)
    setEditor(null)
    setNotice(`“${editor.name.trim()}” updated.`)
  }

  function addBuilderExercisesToPlan() {
    if (!editor) return
    const existing = new Set(editor.exercises.map((exercise) => String(exercise.id)))
    const additions = exercises.filter((exercise) => !existing.has(String(exercise.id))).map((exercise) => ({
      ...exercise,
      config: { ...defaults, ...settings.configs[exercise.id] },
    }))
    setEditor({ ...editor, exercises: [...editor.exercises, ...additions] })
    setNotice(additions.length ? `${additions.length} exercise${additions.length === 1 ? '' : 's'} added from the builder.` : 'All builder exercises are already in this plan.')
  }

  function handleStart(plan) {
    if (activeSession && !window.confirm('Replace the active workout? Its unfinished progress will be discarded.')) return
    if (startSession(plan)) navigate('/workout/session')
  }

  function handleClearBuilder() {
    if (window.confirm('Clear all exercises from the workout builder? Saved plans will not be changed.')) clearWorkout()
  }

  function handleDeletePlan(plan) {
    if (window.confirm(`Delete “${plan.name}”? Completed workout history will not be changed.`)) {
      deletePlan(plan.id)
      setNotice(`“${plan.name}” deleted.`)
    }
  }

  function handleDeleteHistory(session) {
    if (window.confirm(`Delete the completed “${session.name}” history entry? Its workout plan will not be changed.`)) {
      deleteHistorySession(session.id)
      setNotice('Workout history entry deleted.')
      if (openHistoryId === session.id) setOpenHistoryId(null)
    }
  }

  const stageTitle = preview
    ? <>Preview: <em>{preview.title}</em></>
    : activeZone
      ? <>Focus: <em>{getZoneLabel(activeZone)}</em></>
      : <>Routine <em>balance</em></>

  const stageSubtitle = preview
    ? `Inspecting ${stageContext.exercises.length} exercise${stageContext.exercises.length === 1 ? '' : 's'} in ${preview.title}.`
    : stageContext.kind === 'builder'
      ? 'Live set-weighted muscle coverage from your Workout Builder. Hover any saved plan or session to preview.'
      : stageContext.kind === 'empty'
        ? 'Add exercises to your builder or hover a plan to inspect target muscle balance in 3D.'
        : `Showing anatomical split for ${stageContext.title}. Hover any plan, builder row, or history card to inspect.`

  const balanceTargetZone = suggestedMissingZone ?? activeZone

  return (
    <section className="workout-page dashboard-page">
      <div className="page-heading dashboard-heading">
        <div>
          <p className="eyebrow">YOUR TRAINING SPACE</p>
          <h1 className="display">Workout <em>dashboard</em></h1>
          <p className="muted">Create reusable plans, balance muscle coverage in 3D, and track your sessions over time.</p>
        </div>
        {exercises.length > 0 && <button type="button" className="btn btn--primary glint" onClick={() => window.print()}><span className="glint__label">Print builder ↗</span></button>}
      </div>
      {notice && <p className="workout-notice" role="status">{notice}</p>}

      <div className="studio-split-layout">
        <div className="studio-split-layout__main">
          <section className="progress-overview" aria-labelledby="progress-title">
            <div className="dashboard-section-heading"><div><p className="eyebrow">YOUR PROGRESS</p><h2 id="progress-title">Training summary</h2></div><span className="muted">Calendar week: Monday through Sunday</span></div>
            <div className="progress-overview__stats">
              <article className="dashboard-stat"><span className="dashboard-stat__icon" aria-hidden="true">✓</span><div><p className="muted">Completed workouts</p><strong>{stats.totalWorkouts}</strong></div></article>
              <article className="dashboard-stat"><span className="dashboard-stat__icon" aria-hidden="true">▦</span><div><p className="muted">Workouts this week</p><strong>{stats.weeklyWorkouts}</strong></div></article>
              <article className="dashboard-stat"><span className="dashboard-stat__icon" aria-hidden="true">↗</span><div><p className="muted">Current streak</p><strong>{stats.currentStreak}<small> {stats.currentStreak === 1 ? 'day' : 'days'}</small></strong></div></article>
              <article className="dashboard-stat"><span className="dashboard-stat__icon" aria-hidden="true">★</span><div><p className="muted">Longest streak</p><strong>{stats.longestStreak}<small> {stats.longestStreak === 1 ? 'day' : 'days'}</small></strong></div></article>
              <article className="dashboard-stat"><span className="dashboard-stat__icon" aria-hidden="true">▤</span><div><p className="muted">Exercises completed</p><strong>{stats.exercisesCompleted}</strong></div></article>
            </div>
            <div className="activity-chart" role="img" aria-label={`Completed workouts this calendar week: ${stats.weekDays.map((day) => `${day.label} ${day.count}`).join(', ')}`}>
              {stats.weekDays.map((day) => {
                const maximum = Math.max(1, ...stats.weekDays.map((item) => item.count))
                return (
                  <div className="activity-chart__day" key={day.date} title={`${day.count} completed workout${day.count === 1 ? '' : 's'}`}>
                    <span className="activity-chart__count">{day.count}</span>
                    <span className="activity-chart__track"><span style={{ height: `${day.count ? Math.max(12, day.count / maximum * 100) : 0}%` }} /></span>
                    <span className="activity-chart__label">{day.label}</span>
                  </div>
                )
              })}
            </div>
          </section>

          {activeSession && (
            <section
              className="active-session-section"
              aria-labelledby="active-session-title"
              onMouseEnter={() => setPreview({ kind: 'active', id: activeSession.id, title: activeSession.name, exercises: activeSession.exercises })}
              onMouseLeave={() => setPreview(null)}
            >
              <div className="dashboard-section-heading">
                <div><p className="eyebrow">{activeSession.status === 'paused' ? 'PAUSED' : 'IN PROGRESS'}</p><h2 id="active-session-title">{activeSession.name}</h2><p className="muted">Started {formatSessionDate(activeSession.startedAt)} · progress is saved on this device</p></div>
                <div className="active-session-actions">
                  <Link className="btn btn--primary glint" to="/workout/session"><span className="glint__label">{activeSession.status === 'paused' ? 'Resume workout' : 'Open workout'}</span></Link>
                  <button type="button" className="btn btn--danger" onClick={() => {
                    if (window.confirm('Cancel this unfinished workout? It will not be added to history.')) {
                      cancelSession()
                      setNotice('Workout cancelled. It was not added to your history.')
                    }
                  }}>Cancel</button>
                </div>
              </div>
            </section>
          )}

          <section className="plans-section" id="plans" aria-labelledby="plans-title">
            <div className="dashboard-section-heading"><div><p className="eyebrow">REUSABLE ROUTINES</p><h2 id="plans-title">Saved workout plans <span className="count-pill">{plans.length}</span></h2></div><Link to="/explore" className="btn">Browse exercises</Link></div>
            {plans.length === 0 ? (
              <p className="muted">No saved plans yet. Add exercises in the builder below, then save them as a reusable plan.</p>
            ) : (
              <ul className="plan-list">
                {plans.map((plan) => (
                  <li
                    className={`plan-card${preview?.kind === 'plan' && preview.id === plan.id ? ' is-3d-preview' : ''}`}
                    key={plan.id}
                    onMouseEnter={() => setPreview({
                      kind: 'plan',
                      id: plan.id,
                      title: plan.name,
                      exercises: plan.exercises,
                      configs: Object.fromEntries(plan.exercises.map((item) => [item.id, item.config ?? defaults])),
                    })}
                    onMouseLeave={() => setPreview(null)}
                  >
                    <div className="plan-card__heading"><div><h3>{plan.name}</h3><p className="muted">{plan.description || 'No description'} · {plan.exercises.length} exercise{plan.exercises.length === 1 ? '' : 's'}</p><small className="muted">Updated {formatSessionDate(plan.updatedAt)}</small></div>
                      <div className="plan-card__actions"><Link type="button" className="btn" to={`/calendar?plan=${encodeURIComponent(plan.id)}`}>Schedule</Link><button type="button" className="btn btn--primary glint" onClick={() => handleStart(plan)}><span className="glint__label">Start workout</span></button><button type="button" className="btn" onClick={() => beginEdit(plan)}>Edit</button><button type="button" className="btn" onClick={() => { duplicatePlan(plan.id); setNotice(`“${plan.name}” duplicated.`) }}>Duplicate</button><button type="button" className="btn btn--danger" onClick={() => handleDeletePlan(plan)}>Delete</button></div>
                    </div>
                    <ul className="chips plan-card__exercises">{plan.exercises.map((exercise) => <li className="chip" key={exercise.id}>{formatLabel(exercise.name)} · {exercise.config.sets} × {exercise.config.reps}</li>)}</ul>
                    {editor?.id === plan.id && (
                      <form className="plan-editor" onSubmit={handleUpdatePlan}>
                        <label className="field">Plan name<input className="input" required maxLength="60" value={editor.name} onChange={(event) => setEditor({ ...editor, name: event.target.value })} /></label>
                        <label className="field">Description (optional)<textarea className="input" rows="2" maxLength="300" value={editor.description} onChange={(event) => setEditor({ ...editor, description: event.target.value })} /></label>
                        <div className="plan-editor__exercises">
                          {editor.exercises.map((exercise) => (
                            <div className="plan-editor__exercise" key={exercise.id}>
                              <strong>{formatLabel(exercise.name)}</strong>
                              {['sets', 'reps', 'rest'].map((key) => (
                                <label key={key}>{key === 'rest' ? 'Rest (sec)' : formatLabel(key)}<input type="number" min={key === 'rest' ? 0 : 1} max={key === 'sets' ? 10 : key === 'reps' ? 100 : 600} value={exercise.config[key]} onChange={(event) => {
                                  const min = key === 'rest' ? 0 : 1
                                  const max = key === 'sets' ? 10 : key === 'reps' ? 100 : 600
                                  setEditor({ ...editor, exercises: editor.exercises.map((item) => item.id === exercise.id ? { ...item, config: { ...item.config, [key]: Math.min(max, Math.max(min, Number(event.target.value) || min)) } } : item) })
                                }} /></label>
                              ))}
                              <button type="button" className="btn btn--danger" onClick={() => setEditor({ ...editor, exercises: editor.exercises.filter((item) => item.id !== exercise.id) })} aria-label={`Remove ${exercise.name} from plan`}>Remove</button>
                            </div>
                          ))}
                        </div>
                        <div className="plan-editor__actions"><button type="button" className="btn" onClick={addBuilderExercisesToPlan}>Add builder exercises</button><button type="submit" className="btn btn--primary">Save changes</button><button type="button" className="btn" onClick={() => setEditor(null)}>Cancel</button></div>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="workout-builder" aria-labelledby="builder-title">
            <div className="dashboard-section-heading"><div><p className="eyebrow">BUILD A ROUTINE</p><h2 id="builder-title">Workout builder <span className="count-pill">{exercises.length}</span></h2></div><Link to="/explore" className="btn">+ Add exercises</Link></div>
            {exercises.length === 0 ? (
              <EmptyState title="Your next session starts here" text="Add exercises from Explore, then save the selection as a reusable plan or start an ad hoc workout.">
                <Link to="/explore" className="btn btn--primary glint"><span className="glint__label">Build a workout</span></Link>
              </EmptyState>
            ) : (
              <>
                <div className="dashboard-top-grid">
                  <section className="session-panel">
                    <label className="field-label" htmlFor="session-name">BUILDER SESSION NAME</label>
                    <input id="session-name" className="input session-name-input" value={settings.name} maxLength={60} onChange={(event) => updateSession({ name: event.target.value })} />
                    <div className="session-goal-row"><div><label className="field-label" htmlFor="goal-minutes">TIME GOAL</label><div className="goal-input-wrap"><input id="goal-minutes" className="input" type="number" min="5" max="240" value={settings.goalMinutes} onChange={(event) => updateSession({ goalMinutes: Math.min(240, Math.max(5, Number(event.target.value) || 5)) })} /><span>min</span></div></div><div className="session-goal-note"><span className="status-dot" /> Estimated {builderStats.minutes} min</div></div>
                  </section>
                  <form className="session-panel save-plan-form" onSubmit={handleSavePlan}>
                    <p className="field-label">SAVE THIS BUILDER AS A PLAN</p>
                    <label className="field">Plan name<input className="input" maxLength="60" value={planName} placeholder={settings.name} onChange={(event) => setPlanName(event.target.value)} /></label>
                    <label className="field">Description (optional)<textarea className="input" rows="2" maxLength="300" value={planDescription} onChange={(event) => setPlanDescription(event.target.value)} /></label>
                    <button type="submit" className="btn btn--primary" disabled={!exercises.length}>Save workout plan</button>
                  </form>
                </div>
                <div className="dashboard-stat-grid">
                  <article className="dashboard-stat"><span className="dashboard-stat__icon" aria-hidden="true">▤</span><div><p className="muted">Exercises</p><strong>{exercises.length}</strong></div><span className="dashboard-stat__hint">in builder</span></article>
                  <article className="dashboard-stat"><span className="dashboard-stat__icon" aria-hidden="true">↻</span><div><p className="muted">Total sets</p><strong>{builderStats.totalSets}</strong></div><span className="dashboard-stat__hint">planned sets</span></article>
                  <article className="dashboard-stat"><span className="dashboard-stat__icon" aria-hidden="true">◷</span><div><p className="muted">Estimated duration</p><strong>{builderStats.minutes}<small> min</small></strong></div><span className="dashboard-stat__hint">including rest</span></article>
                </div>
                <ol className="dashboard-exercise-list">
                  {exercises.map((exercise, index) => {
                    const config = { ...defaults, ...settings.configs[exercise.id] }
                    const isCompleted = settings.completed.some((id) => String(id) === String(exercise.id))
                    return (
                      <li
                        className={`dashboard-exercise ${isCompleted ? 'dashboard-exercise--complete' : ''}${preview?.kind === 'exercise' && preview.id === String(exercise.id) ? ' is-3d-preview' : ''}`}
                        key={exercise.id}
                        onMouseEnter={() => setPreview({
                          kind: 'exercise',
                          id: String(exercise.id),
                          title: formatLabel(exercise.name),
                          exercises: [exercise],
                          configs: { [exercise.id]: config },
                        })}
                        onMouseLeave={() => setPreview(null)}
                      >
                        <div className="dashboard-exercise__top">
                          <button className={`complete-toggle ${isCompleted ? 'complete-toggle--checked' : ''}`} type="button" onClick={() => toggleCompleted(exercise.id)} aria-label={isCompleted ? 'Mark builder exercise incomplete' : 'Mark builder exercise complete'}>{isCompleted ? '✓' : ''}</button>
                          <span className="dashboard-exercise__number">{String(index + 1).padStart(2, '0')}</span>
                          <ExerciseImage src={getUploadedImageFromMap(uploadedImages, exercise) || exercise.gifUrl} name={exercise.name} className="dashboard-exercise__image" />
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
                <div className="dashboard-bottom-actions"><p className="muted">Builder selection is saved automatically on this device.</p><div className="active-session-actions"><button type="button" className="btn btn--primary glint" onClick={() => handleStart({ name: settings.name.trim() || 'Workout session', exercises: exercises.map((exercise) => ({ ...exercise, config: settings.configs[exercise.id] })) })}><span className="glint__label">Start builder workout</span></button><button type="button" className="btn btn--danger" onClick={handleClearBuilder}>Clear builder</button></div></div>
                <p className="print-note muted">Estimated duration is a planning estimate, not a timer. Adjust sets, reps, and rest to suit your training level.</p>
              </>
            )}
          </section>

          <section className="history-section" id="history" aria-labelledby="history-title">
            <div className="dashboard-section-heading"><div><p className="eyebrow">SESSION HISTORY</p><h2 id="history-title">Workout history <span className="count-pill">{history.length}</span></h2></div></div>
            {history.length === 0 ? (
              <EmptyState title="Your workout history will appear here" text="Complete a workout session to start building your personal progress history." />
            ) : (
              <ul className="history-list">
                {history.map((session) => (
                  <li
                    className={`history-card${preview?.kind === 'history' && preview.id === session.id ? ' is-3d-preview' : ''}`}
                    key={session.id}
                    onMouseEnter={() => setPreview({
                      kind: 'history',
                      id: session.id,
                      title: session.name,
                      exercises: session.exercises ?? [],
                    })}
                    onMouseLeave={() => setPreview(null)}
                  >
                    <div className="history-card__summary"><div><h3>{session.name}</h3><p className="muted">{session.status === 'ended-early' ? 'Ended early · ' : ''}{formatSessionDate(session.completedAt)} · {sessionExerciseCount(session)} exercise{sessionExerciseCount(session) === 1 ? '' : 's'} completed{session.durationSeconds != null ? ` · ${Math.floor(session.durationSeconds / 60)} min` : ''}</p></div><div className="history-card__actions"><button type="button" className="btn" aria-expanded={openHistoryId === session.id} onClick={() => setOpenHistoryId(openHistoryId === session.id ? null : session.id)}>{openHistoryId === session.id ? 'Hide details' : 'Session details'}</button><button type="button" className="btn btn--danger" onClick={() => handleDeleteHistory(session)}>Delete</button></div></div>
                    {openHistoryId === session.id && (
                      <ol className="history-exercises">
                        {session.exercises.map((exercise) => (
                          <li key={exercise.id}><strong>{formatLabel(exercise.name)}</strong> · {exercise.status === 'skipped' ? 'Skipped' : exercise.status === 'completed' ? 'Completed' : 'Not completed'}<ul>{exercise.sets.map((set, index) => <li key={index}>Set {index + 1}: {set.completed ? `${set.reps} reps completed${set.weight != null ? ` · ${set.weight} (your unit)` : ''}${set.note ? ` · ${set.note}` : ''}` : 'Not completed'}</li>)}</ul></li>
                        ))}
                        {!session.exercises.length && <li className="muted">No exercise details were saved for this session.</li>}
                      </ol>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="studio-split-layout__rail">
          <StudioFigureStage
            eyebrow="3D ROUTINE INSPECTOR"
            title={stageTitle}
            subtitle={stageSubtitle}
            counts={stageCounts}
            zoneCountsUnit={useSetVolume ? 'sets' : ''}
            selectedZone={activeZone}
            cameraFocusZone={activeZone}
            onSelectZone={(zoneId) => setInspectedZone((current) => (current === zoneId ? null : zoneId))}
            onClearSelection={() => setInspectedZone(null)}
            summary={`${stageContext.title} muscle split`}
            footer={
              <>
                <div className="studio-stage__tags">
                  {zoneSummary.dominantZone && (
                    <span className="studio-stage__tag studio-stage__tag--primary">
                      Lead: {getZoneLabel(zoneSummary.dominantZone)}
                    </span>
                  )}
                  {suggestedMissingZone && stageContext.exercises.length > 0 && (
                    <span className="studio-stage__tag">
                      Untapped: {getZoneLabel(suggestedMissingZone)}
                    </span>
                  )}
                </div>
                {balanceTargetZone && (
                  <div className="studio-stage__footer-row">
                    <span className="studio-stage__footer-note">
                      {suggestedMissingZone && stageContext.exercises.length > 0
                        ? `Balance routine with ${getZoneLabel(suggestedMissingZone)}`
                        : `Find more ${getZoneLabel(balanceTargetZone)} exercises`}
                    </span>
                    <Link
                      className="studio-stage__footer-link"
                      to="/explore"
                      onClick={() => {
                        resetFilters()
                        setBodyPart(resolveZoneBodyPartFilter(balanceTargetZone))
                      }}
                    >
                      Add {getZoneLabel(balanceTargetZone)} ↗
                    </Link>
                  </div>
                )}
              </>
            }
          />
        </div>
      </div>
    </section>
  )
}


import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import EmptyState from '../components/common/EmptyState.jsx'
import useDocumentTitle from '../hooks/useDocumentTitle.js'
import { useWorkoutStore } from '../features/workout/useWorkoutStore.js'
import { localDateKey } from '../features/workout/workoutProgress.js'
import { formatDateKey, getMonthCalendarDays, parseLocalDateKey } from '../features/workout/workoutCalendar.js'

function localMonthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function shiftMonth(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function scheduledStatus(workout, todayKey) {
  if (workout.status === 'scheduled' && workout.date < todayKey) return 'Overdue'
  if (workout.status === 'in-progress') return 'In progress'
  return workout.status === 'completed' ? 'Completed' : workout.status === 'cancelled' ? 'Cancelled' : 'Planned'
}

function formatScheduledTime(time) {
  if (!time) return ''
  const [hours, minutes] = time.split(':').map(Number)
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
    .format(new Date(2020, 0, 1, hours, minutes))
}

export default function WorkoutCalendarPage() {
  useDocumentTitle('Workout calendar')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const plans = useWorkoutStore((state) => state.plans)
  const scheduledWorkouts = useWorkoutStore((state) => state.scheduledWorkouts)
  const activeSession = useWorkoutStore((state) => state.activeSession)
  const saveScheduledWorkout = useWorkoutStore((state) => state.saveScheduledWorkout)
  const cancelScheduledWorkout = useWorkoutStore((state) => state.cancelScheduledWorkout)
  const deleteScheduledWorkout = useWorkoutStore((state) => state.deleteScheduledWorkout)
  const startSession = useWorkoutStore((state) => state.startSession)
  const requestedWorkout = scheduledWorkouts.find((workout) => workout.id === searchParams.get('workout')) ?? null
  const initialSelectedDate = requestedWorkout?.date ?? localDateKey(new Date())
  const [month, setMonth] = useState(() => localMonthStart(parseLocalDateKey(initialSelectedDate)))
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate)
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(requestedWorkout?.id ?? null)
  const [editingId, setEditingId] = useState(null)
  const [planId, setPlanId] = useState(() => searchParams.get('plan') ?? '')
  const [date, setDate] = useState(() => localDateKey(new Date()))
  const [time, setTime] = useState('')
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')

  const todayKey = localDateKey(new Date())
  const monthTitle = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(month)
  const days = useMemo(() => getMonthCalendarDays(month.getFullYear(), month.getMonth()), [month])
  const workoutsByDate = useMemo(() => {
    const grouped = new Map()
    for (const workout of scheduledWorkouts) {
      const current = grouped.get(workout.date) ?? []
      current.push(workout)
      grouped.set(workout.date, current)
    }
    for (const workouts of grouped.values()) {
      workouts.sort((first, second) => (first.time || '').localeCompare(second.time || '') || first.name.localeCompare(second.name))
    }
    return grouped
  }, [scheduledWorkouts])
  const selectedWorkouts = workoutsByDate.get(selectedDate) ?? []
  const selectedWorkout = scheduledWorkouts.find((workout) => workout.id === selectedWorkoutId) ?? null
  const upcomingWorkouts = useMemo(() => scheduledWorkouts
    .filter((workout) => workout.status === 'scheduled' || workout.status === 'in-progress')
    .sort((first, second) => first.date.localeCompare(second.date) ||
      (first.time || '').localeCompare(second.time || ''))
    .slice(0, 8), [scheduledWorkouts])
  const editingWorkout = scheduledWorkouts.find((workout) => workout.id === editingId) ?? null
  const archivedPlan = editingWorkout && !plans.some((plan) => plan.id === editingWorkout.planId)
    ? editingWorkout
    : null

  function resetForm(nextDate = selectedDate) {
    setEditingId(null)
    setPlanId('')
    setDate(nextDate)
    setTime('')
    setNote('')
    setFormError('')
  }

  function handleScheduleSubmit(event) {
    event.preventDefault()
    setFormError('')
    setNotice('')
    if (!planId) {
      setFormError('Choose a saved workout plan.')
      return
    }
    if (!parseLocalDateKey(date)) {
      setFormError('Choose a valid date.')
      return
    }
    if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      setFormError('Choose a valid time.')
      return
    }
    const savedId = editingId
    if (!saveScheduledWorkout({ id: editingId, planId, date, time, note })) {
      setFormError('This workout could not be saved. Check that the selected plan is still available.')
      return
    }
    setMonth(localMonthStart(parseLocalDateKey(date)))
    setSelectedDate(date)
    if (savedId) setSelectedWorkoutId(savedId)
    resetForm(date)
    setNotice(savedId ? 'Scheduled workout updated.' : 'Workout scheduled.')
  }

  function beginEdit(workout) {
    setEditingId(workout.id)
    setSelectedWorkoutId(workout.id)
    setPlanId(workout.planId)
    setDate(workout.date)
    setTime(workout.time || '')
    setNote(workout.note || '')
    setFormError('')
    setNotice('')
  }

  function handleCancel(workout) {
    if (!window.confirm(`Cancel the scheduled “${workout.name}” workout? It will remain in your calendar as cancelled.`)) return
    cancelScheduledWorkout(workout.id)
    setNotice('Workout cancelled. It was not added to history.')
    setEditingId(null)
  }

  function handleDelete(workout) {
    if (!window.confirm(`Remove the calendar entry for “${workout.name}”? Completed workout history will not be changed.`)) return
    deleteScheduledWorkout(workout.id)
    setSelectedWorkoutId(null)
    setEditingId(null)
    setNotice('Calendar entry removed.')
  }

  function handleStart(workout) {
    if (activeSession && !window.confirm('Replace the active workout? Its unfinished progress will be discarded.')) return
    if (!startSession(workout, workout.id)) {
      setNotice('This scheduled workout is no longer available to start.')
      return
    }
    navigate('/workout')
  }

  function chooseDay(key) {
    setSelectedDate(key)
    setSelectedWorkoutId(null)
    setDate(key)
    const day = parseLocalDateKey(key)
    setMonth(localMonthStart(day))
  }

  function chooseWorkout(workout) {
    setSelectedDate(workout.date)
    setSelectedWorkoutId(workout.id)
    setDate(workout.date)
    setMonth(localMonthStart(parseLocalDateKey(workout.date)))
  }

  return (
    <section className="calendar-page" aria-labelledby="calendar-title">
      <header className="page-heading calendar-heading">
        <div>
          <p className="eyebrow">PLAN YOUR TRAINING</p>
          <h1 id="calendar-title">Workout calendar</h1>
          <p className="muted">Schedule workouts from your saved plans. Planned workouts stay separate from completed history.</p>
        </div>
        <Link className="btn" to="/workout">Workout dashboard</Link>
      </header>

      {notice && <p className="workout-notice" role="status">{notice}</p>}

      <div className="calendar-layout">
        <section className="calendar-panel" aria-label="Monthly workout calendar">
          <div className="calendar-toolbar">
            <h2>{monthTitle}</h2>
            <div className="calendar-toolbar__actions">
              <button type="button" className="btn" aria-label="Previous month" onClick={() => setMonth((current) => shiftMonth(current, -1))}>‹</button>
              <button type="button" className="btn" onClick={() => {
                const now = new Date()
                setMonth(localMonthStart(now))
                setSelectedDate(localDateKey(now))
                setSelectedWorkoutId(null)
                setDate(localDateKey(now))
              }}>Today</button>
              <button type="button" className="btn" aria-label="Next month" onClick={() => setMonth((current) => shiftMonth(current, 1))}>›</button>
            </div>
          </div>
          <div className="calendar-grid" role="grid" aria-label={monthTitle}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((weekday) => (
              <div className="calendar-weekday" role="columnheader" key={weekday}>{weekday}</div>
            ))}
            {days.map((day) => {
              const dayWorkouts = workoutsByDate.get(day.key) ?? []
              return (
                <div
                  className={`calendar-day ${day.inMonth ? '' : 'calendar-day--outside'} ${day.key === todayKey ? 'calendar-day--today' : ''} ${day.key === selectedDate ? 'calendar-day--selected' : ''}`}
                  role="gridcell"
                  aria-selected={day.key === selectedDate}
                  key={day.key}
                >
                  <button type="button" className="calendar-day__date" onClick={() => chooseDay(day.key)} aria-label={formatDateKey(day.key)}>
                    <span>{day.date.getDate()}</span>
                    {day.key === todayKey && <span className="calendar-today-label">Today</span>}
                  </button>
                  <div className="calendar-day__events">
                    {dayWorkouts.slice(0, 2).map((workout) => (
                      <button
                        type="button"
                        key={workout.id}
                        className={`calendar-event calendar-event--${workout.status} ${selectedWorkoutId === workout.id ? 'calendar-event--selected' : ''}`}
                        onClick={() => chooseWorkout(workout)}
                        aria-label={`${scheduledStatus(workout, todayKey)}: ${workout.name}`}
                      >
                        <span>{workout.time ? `${formatScheduledTime(workout.time)} ` : ''}{workout.name}</span>
                      </button>
                    ))}
                    {dayWorkouts.length > 2 && <span className="calendar-more">+{dayWorkouts.length - 2} more</span>}
                  </div>
                </div>
              )
            })}
          </div>
          <ul className="calendar-legend" aria-label="Calendar status legend">
            <li><span className="calendar-legend__swatch calendar-legend__swatch--planned" />Planned</li>
            <li><span className="calendar-legend__swatch calendar-legend__swatch--in-progress" />In progress</li>
            <li><span className="calendar-legend__swatch calendar-legend__swatch--completed" />Completed</li>
            <li><span className="calendar-legend__swatch calendar-legend__swatch--cancelled" />Cancelled</li>
          </ul>
        </section>

        <aside className="calendar-sidebar">
          <section className="calendar-panel calendar-day-details" aria-labelledby="selected-day-title">
            <div className="dashboard-section-heading">
              <div><p className="eyebrow">SELECTED DAY</p><h2 id="selected-day-title">{formatDateKey(selectedDate)}</h2></div>
              <button type="button" className="btn" onClick={() => {
                setDate(selectedDate)
                setEditingId(null)
                setFormError('')
                document.getElementById('schedule-form-title')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }}>+ Schedule</button>
            </div>
            {selectedWorkouts.length > 0 ? (
              <ul className="calendar-agenda">
                {selectedWorkouts.map((workout) => (
                  <li key={workout.id}>
                    <button type="button" className={`calendar-agenda__item calendar-agenda__item--${workout.status}`} onClick={() => setSelectedWorkoutId(workout.id)}>
                      <strong>{workout.name}</strong>
                      <span>{workout.time ? formatScheduledTime(workout.time) : 'Time not set'} · {scheduledStatus(workout, todayKey)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted calendar-empty-day">No workouts scheduled for this date.</p>
            )}
            {selectedWorkout && (
              <div className="calendar-workout-detail">
                <h3>{selectedWorkout.name}</h3>
                <p className="muted">{selectedWorkout.exercises.length} exercise{selectedWorkout.exercises.length === 1 ? '' : 's'} · {scheduledStatus(selectedWorkout, todayKey)}</p>
                {selectedWorkout.note && <p>{selectedWorkout.note}</p>}
                {selectedWorkout.status === 'scheduled' && (
                  <div className="calendar-workout-detail__actions">
                    <button type="button" className="btn btn--primary" onClick={() => handleStart(selectedWorkout)}>Start workout</button>
                    <button type="button" className="btn" onClick={() => beginEdit(selectedWorkout)}>Edit / reschedule</button>
                    <button type="button" className="btn btn--danger" onClick={() => handleCancel(selectedWorkout)}>Cancel workout</button>
                    <button type="button" className="btn" onClick={() => handleDelete(selectedWorkout)}>Delete calendar entry</button>
                  </div>
                )}
                {selectedWorkout.status === 'completed' && selectedWorkout.completedSessionId && (
                  <Link to="/workout#history">View completed session</Link>
                )}
                {selectedWorkout.status === 'in-progress' && (
                  <Link to="/workout">Continue active workout</Link>
                )}
                {(selectedWorkout.status === 'completed' || selectedWorkout.status === 'cancelled') && (
                  <button type="button" className="btn" onClick={() => handleDelete(selectedWorkout)}>Delete calendar entry</button>
                )}
              </div>
            )}
          </section>

          <section className="calendar-panel" aria-labelledby="upcoming-title">
            <div className="dashboard-section-heading"><div><p className="eyebrow">YOUR PLAN</p><h2 id="upcoming-title">Upcoming workouts</h2></div></div>
            {upcomingWorkouts.length > 0 ? (
              <ul className="calendar-agenda calendar-upcoming">
                {upcomingWorkouts.map((workout) => (
                  <li key={workout.id}>
                    <button type="button" className="calendar-agenda__item" onClick={() => chooseWorkout(workout)}>
                      <strong>{workout.name}</strong>
                      <span>{formatDateKey(workout.date, { dateStyle: 'medium' })}{workout.time ? ` · ${formatScheduledTime(workout.time)}` : ''} · {scheduledStatus(workout, todayKey)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted calendar-empty-day">No upcoming workouts. Schedule a saved plan to see it here.</p>
            )}
          </section>
        </aside>
      </div>

      <section className="calendar-panel calendar-schedule" aria-labelledby="schedule-form-title">
        <div className="dashboard-section-heading">
          <div><p className="eyebrow">{editingId ? 'UPDATE YOUR PLAN' : 'MAKE A PLAN'}</p><h2 id="schedule-form-title">{editingId ? 'Edit scheduled workout' : 'Schedule a workout'}</h2></div>
          {editingId && <button type="button" className="btn" onClick={resetForm}>Stop editing</button>}
        </div>
        {plans.length > 0 || archivedPlan ? (
          <form className="calendar-schedule__form" onSubmit={handleScheduleSubmit}>
            <label className="field">Saved workout plan
              <select className="input" value={planId} onChange={(event) => setPlanId(event.target.value)} required>
                <option value="">Choose a plan</option>
                {archivedPlan && <option value={archivedPlan.planId}>{archivedPlan.name} (original scheduled plan)</option>}
                {plans.map((plan) => <option value={plan.id} key={plan.id}>{plan.name} · {plan.exercises.length} exercise{plan.exercises.length === 1 ? '' : 's'}</option>)}
              </select>
            </label>
            <label className="field">Date<input className="input" type="date" value={date} min={editingId ? undefined : todayKey} onChange={(event) => setDate(event.target.value)} required /></label>
            <label className="field">Time (optional)<input className="input" type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
            <label className="field calendar-schedule__note">Note (optional)<textarea className="input" rows="2" maxLength="300" value={note} onChange={(event) => setNote(event.target.value)} /></label>
            {formError && <p className="calendar-form-error" role="alert">{formError}</p>}
            <div className="calendar-schedule__actions">
              <button className="btn btn--primary" type="submit">{editingId ? 'Save changes' : 'Schedule workout'}</button>
              {editingId && <button className="btn" type="button" onClick={resetForm}>Cancel editing</button>}
            </div>
          </form>
        ) : (
          <EmptyState title="No saved plans yet" text="Create a workout plan first, then you can add it to your calendar.">
            <Link to="/workout" className="btn btn--primary">Go to workout builder</Link>
          </EmptyState>
        )}
      </section>
    </section>
  )
}

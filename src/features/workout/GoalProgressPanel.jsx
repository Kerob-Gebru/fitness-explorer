import { useState } from 'react'
import { useWorkoutStore } from './useWorkoutStore.js'

function GoalCard({ label, count, target, progressLabel }) {
  const percentage = target > 0 ? Math.min(100, Math.floor((count / target) * 100)) : 0
  const achieved = count >= target
  return (
    <article className={`goal-card${achieved ? ' goal-card--achieved' : ''}`}>
      <div className="goal-card__heading">
        <div><h3>{label}</h3><p className="muted">{progressLabel}</p></div>
        <strong>{count}<span> / {target}</span></strong>
      </div>
      <div
        className="goal-progress"
        role="progressbar"
        aria-label={`${label} progress`}
        aria-valuemin="0"
        aria-valuemax={target}
        aria-valuenow={Math.min(count, target)}
        aria-valuetext={`${count} of ${target} workouts${achieved ? ', goal achieved' : ''}`}
      >
        <span style={{ width: `${percentage}%` }} />
      </div>
      <p className={achieved ? 'goal-card__status goal-card__status--achieved' : 'goal-card__status'} role="status">
        {achieved ? 'Goal achieved!' : `${percentage}% complete · ${target - count} more to reach your goal`}
      </p>
    </article>
  )
}

export default function GoalProgressPanel({ stats }) {
  const goals = useWorkoutStore((state) => state.goals)
  const updateWorkoutGoals = useWorkoutStore((state) => state.updateWorkoutGoals)
  const [editing, setEditing] = useState(false)
  const [weekly, setWeekly] = useState(goals.weekly)
  const [monthly, setMonthly] = useState(goals.monthly)
  const [notice, setNotice] = useState('')

  function startEditing() {
    setWeekly(goals.weekly)
    setMonthly(goals.monthly)
    setNotice('')
    setEditing(true)
  }

  function saveGoals(event) {
    event.preventDefault()
    updateWorkoutGoals({ weekly: Number(weekly), monthly: Number(monthly) })
    setEditing(false)
    setNotice('Your workout targets have been saved.')
  }

  const milestone = stats.milestones.find((item) => !item.achieved) ?? stats.milestones.at(-1)

  return (
    <section className="goal-panel" aria-labelledby="goal-panel-title">
      <div className="dashboard-section-heading">
        <div><p className="eyebrow">PERSONAL TARGETS</p><h2 id="goal-panel-title">Workout goals</h2></div>
        <button type="button" className="btn" onClick={editing ? () => setEditing(false) : startEditing}>
          {editing ? 'Cancel editing' : 'Edit goals'}
        </button>
      </div>
      {editing ? (
        <form className="goal-editor" onSubmit={saveGoals}>
          <label className="field">
            Weekly completed-workout target
            <span className="muted">Monday–Sunday calendar week (1–14)</span>
            <input className="input" type="number" min="1" max="14" step="1" required value={weekly} onChange={(event) => setWeekly(event.target.value)} />
          </label>
          <label className="field">
            Monthly completed-workout target
            <span className="muted">Current calendar month (1–60)</span>
            <input className="input" type="number" min="1" max="60" step="1" required value={monthly} onChange={(event) => setMonthly(event.target.value)} />
          </label>
          <button type="submit" className="btn btn--primary">Save goals</button>
        </form>
      ) : (
        <div className="goal-panel__cards">
          <GoalCard label="Weekly goal" count={stats.weeklyWorkouts} target={goals.weekly} progressLabel="Completed workouts · Monday–Sunday" />
          <GoalCard label="Monthly goal" count={stats.monthlyWorkouts} target={goals.monthly} progressLabel="Completed workouts · current calendar month" />
        </div>
      )}
      {notice && <p className="muted goal-panel__notice" role="status">{notice}</p>}
      {!editing && milestone && (
        <p className="goal-panel__milestone">
          <strong>{milestone.achieved ? 'Milestone reached:' : 'Next milestone:'}</strong> {milestone.label}
        </p>
      )}
    </section>
  )
}

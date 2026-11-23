import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import GoalProgressPanel from '../features/workout/GoalProgressPanel.jsx'
import StudioFigureStage from '../features/home3d/StudioFigureStage.jsx'
import {
  getZoneLabel,
  resolveZoneBodyPartFilter,
  summarizeExercisesZones,
} from '../features/home3d/studioZoneMapping.js'
import { useSearchStore } from '../features/search/useSearchStore.js'
import {
  calculateWorkoutProgress,
  getCompletedWorkoutSessions,
  localDateKey,
} from '../features/workout/workoutProgress.js'
import { useWorkoutStore } from '../features/workout/useWorkoutStore.js'
import useDocumentTitle from '../hooks/useDocumentTitle.js'

const HEATMAP_PERIODS = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'all', label: 'All' },
]

function isCompletedHistoryExercise(exercise) {
  if (!exercise || typeof exercise !== 'object') return false
  if (exercise.status === 'completed') return true
  if (exercise.status === 'skipped') return false
  if (exercise.status == null) {
    return Array.isArray(exercise.sets) && exercise.sets.some((set) => set?.completed === true)
  }
  return false
}

function TrendChart({ title, description, values, periodLabel }) {
  const maximum = Math.max(1, ...values.map((item) => item.count))
  const accessibleSummary = values.map((item) => `${item.label}: ${item.count}`).join(', ')
  return (
    <figure className="trend-chart">
      <figcaption><h3>{title}</h3><p className="muted">{description}</p></figcaption>
      <div className="trend-chart__bars" role="img" aria-label={`${periodLabel} completed workouts: ${accessibleSummary}`}>
        {values.map((item) => (
          <div className="trend-chart__item" key={item.key} title={`${item.label}: ${item.count} completed workouts`}>
            <span className="trend-chart__count">{item.count}</span>
            <span className="trend-chart__track"><span style={{ height: `${item.count ? Math.max(8, item.count / maximum * 100) : 0}%` }} /></span>
            <span className="trend-chart__label">{item.label}</span>
          </div>
        ))}
      </div>
      <p className="muted trend-chart__legend">Each bar shows completed workouts per {periodLabel.toLowerCase()}.</p>
    </figure>
  )
}

export default function ProgressPage() {
  useDocumentTitle('Progress analytics')
  const history = useWorkoutStore((state) => state.history)
  const goals = useWorkoutStore((state) => state.goals)
  const resetFilters = useSearchStore((state) => state.resetFilters)
  const setBodyPart = useSearchStore((state) => state.setBodyPart)
  const [period, setPeriod] = useState('month')
  const [inspectedZone, setInspectedZone] = useState(null)

  const stats = useMemo(() => calculateWorkoutProgress(history), [history])
  const upcomingMilestones = stats.milestones.filter((item) => !item.achieved)
  const achievedMilestones = stats.milestones.filter((item) => item.achieved)
  const weeklyGoalAchieved = stats.weeklyWorkouts >= goals.weekly

  const periodExercises = useMemo(() => {
    const now = new Date()
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
    const weekStartKey = localDateKey(weekStart)
    const monthPrefix = localDateKey(now).slice(0, 7)

    const sessions = getCompletedWorkoutSessions(history, now).filter((session) => {
      const key = localDateKey(session.completedAt)
      if (period === 'week') return key >= weekStartKey
      if (period === 'month') return key.startsWith(monthPrefix)
      return true
    })

    return {
      sessionCount: sessions.length,
      exercises: sessions.flatMap((session) =>
        (Array.isArray(session.exercises) ? session.exercises : []).filter(isCompletedHistoryExercise),
      ),
    }
  }, [history, period])

  const zoneSummary = useMemo(
    () => summarizeExercisesZones(periodExercises.exercises),
    [periodExercises.exercises],
  )
  const activeZone = inspectedZone ?? zoneSummary.dominantZone
  const totalZoneScore = Object.values(zoneSummary.counts).reduce((sum, val) => sum + val, 0)
  const activeZoneCount = activeZone ? zoneSummary.counts[activeZone] : 0
  const activeZoneShare = totalZoneScore > 0 ? Math.round((activeZoneCount / totalZoneScore) * 100) : 0

  return (
    <section className="progress-page" aria-labelledby="progress-page-title">
      <header className="page-heading progress-page__heading">
        <div>
          <p className="eyebrow">YOUR TRAINING, OVER TIME</p>
          <h1 id="progress-page-title" className="display">Progress <em>analytics</em></h1>
          <p className="muted">Trends and 3D muscle balance are calculated from completed workout sessions saved in your history.</p>
        </div>
        <Link className="btn" to="/workout#history">View workout history</Link>
      </header>

      <div className="studio-split-layout">
        <div className="studio-split-layout__main">
          <GoalProgressPanel stats={stats} />

          <section className="analytics-section" aria-labelledby="analytics-summary-title">
            <div className="dashboard-section-heading"><div><p className="eyebrow">COMPLETED SESSIONS ONLY</p><h2 id="analytics-summary-title">Activity summary</h2></div><span className="muted">Local calendar periods</span></div>
            <div className="analytics-stats">
              <article className="dashboard-stat"><span className="dashboard-stat__icon" aria-hidden="true">▦</span><div><p className="muted">This week</p><strong>{stats.weeklyWorkouts}</strong></div><span className="dashboard-stat__hint">Monday–Sunday</span></article>
              <article className="dashboard-stat"><span className="dashboard-stat__icon" aria-hidden="true">▤</span><div><p className="muted">This month</p><strong>{stats.monthlyWorkouts}</strong></div><span className="dashboard-stat__hint">Calendar month</span></article>
              <article className="dashboard-stat"><span className="dashboard-stat__icon" aria-hidden="true">↗</span><div><p className="muted">Current streak</p><strong>{stats.currentStreak}<small> {stats.currentStreak === 1 ? 'day' : 'days'}</small></strong></div><span className="dashboard-stat__hint">Consecutive workout days</span></article>
              <article className="dashboard-stat"><span className="dashboard-stat__icon" aria-hidden="true">★</span><div><p className="muted">Longest streak</p><strong>{stats.longestStreak}<small> {stats.longestStreak === 1 ? 'day' : 'days'}</small></strong></div><span className="dashboard-stat__hint">In retained history</span></article>
              <article className="dashboard-stat"><span className="dashboard-stat__icon" aria-hidden="true">●</span><div><p className="muted">Active days this week</p><strong>{stats.completedDaysThisWeek}</strong></div><span className="dashboard-stat__hint">Multiple workouts count as one day</span></article>
              <article className="dashboard-stat"><span className="dashboard-stat__icon" aria-hidden="true">↻</span><div><p className="muted">Recent frequency</p><strong>{stats.recentWeeklyAverage.toFixed(1)}<small> / week</small></strong></div><span className="dashboard-stat__hint">{stats.recentWorkouts} workouts in the last 28 calendar days</span></article>
              <article className="dashboard-stat"><span className="dashboard-stat__icon" aria-hidden="true">◷</span><div><p className="muted">Average duration</p><strong>{stats.averageDurationMinutes == null ? '—' : `${Math.round(stats.averageDurationMinutes)} min`}</strong></div><span className="dashboard-stat__hint">{stats.averageDurationMinutes == null ? 'No recorded durations' : `Mean of ${stats.durationSamples} sessions with tracked duration`}</span></article>
              <article className="dashboard-stat"><span className="dashboard-stat__icon" aria-hidden="true">✓</span><div><p className="muted">Tracked sets</p><strong>{stats.trackedSets || '—'}</strong></div><span className="dashboard-stat__hint">{stats.trackedSets ? `${stats.trackedReps} reps in completed sets` : 'No completed set records in completed sessions'}</span></article>
            </div>
          </section>

          {stats.totalWorkouts > 0 ? (
            <section className="analytics-section" aria-labelledby="trends-title">
              <div className="dashboard-section-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h2 id="trends-title">Workout trends</h2></div></div>
              <div className="trend-grid">
                <TrendChart title="Weekly completions" description="Current week and the five preceding Monday–Sunday weeks." values={stats.weeklyTrends} periodLabel="Week" />
                <TrendChart title="Monthly completions" description="Current calendar month and the five preceding months." values={stats.monthlyTrends} periodLabel="Month" />
              </div>
            </section>
          ) : (
            <section className="analytics-empty" aria-labelledby="trends-title">
              <h2 id="trends-title" className="display">Your trends will appear here</h2>
              <p className="muted">Complete and save a workout to see weekly and monthly activity charts. Planned, cancelled, and early-ended sessions are not counted.</p>
              <Link className="btn btn--primary glint" to="/workout"><span className="glint__label">Start a workout</span></Link>
            </section>
          )}

          <section className="analytics-section" aria-labelledby="consistency-title">
            <div className="dashboard-section-heading"><div><p className="eyebrow">CONSISTENCY</p><h2 id="consistency-title">Streaks and activity days</h2></div></div>
            <p className="muted">A streak means at least one completed workout on consecutive local calendar days. Multiple sessions on one day count as one streak day. The current streak remains active through today or yesterday and resets after a missed full day. Longest streak uses all retained completed sessions.</p>
          </section>

          <section className="analytics-section" aria-labelledby="achievements-title">
            <div className="dashboard-section-heading"><div><p className="eyebrow">HISTORY-BASED MILESTONES</p><h2 id="achievements-title">Achievements</h2></div></div>
            {stats.totalWorkouts === 0 ? (
              <p className="muted">Your first completed workout will unlock the first milestone. Milestones are always derived from workout history.</p>
            ) : (
              <>
                <p className="muted">Weekly goal: {weeklyGoalAchieved ? 'achieved' : `${stats.weeklyWorkouts} of ${goals.weekly} workouts completed this Monday–Sunday week`}.</p>
                <ul className="milestone-list">
                  {achievedMilestones.map((item) => <li className="milestone milestone--achieved" key={item.id}><span aria-hidden="true">✓</span><div><strong>{item.label}</strong><span>Achieved from completed workout history</span></div><span className="milestone__state">Achieved</span></li>)}
                  {upcomingMilestones.slice(0, 2).map((item) => <li className="milestone" key={item.id}><span aria-hidden="true">○</span><div><strong>{item.label}</strong><span>{Math.max(0, item.target - stats.totalWorkouts)} more completed workout{item.target - stats.totalWorkouts === 1 ? '' : 's'} to go</span></div><span className="milestone__state">Upcoming</span></li>)}
                </ul>
              </>
            )}
          </section>
        </div>

        <div className="studio-split-layout__rail">
          <StudioFigureStage
            eyebrow="3D TRAINING HEATMAP"
            title={
              activeZone
                ? <>Focus: <em>{getZoneLabel(activeZone)}</em></>
                : <>Muscle <em>balance</em></>
            }
            subtitle={
              periodExercises.sessionCount === 0
                ? `No completed workouts recorded for ${period === 'week' ? 'this week' : period === 'month' ? 'this month' : 'all time'} yet.`
                : `${periodExercises.sessionCount} completed workout${periodExercises.sessionCount === 1 ? '' : 's'} · ${periodExercises.exercises.length} exercise${periodExercises.exercises.length === 1 ? '' : 's'} analyzed.`
            }
            counts={zoneSummary.counts}
            selectedZone={activeZone}
            cameraFocusZone={activeZone}
            onSelectZone={(zoneId) => setInspectedZone((current) => (current === zoneId ? null : zoneId))}
            onClearSelection={() => setInspectedZone(null)}
            headerActions={
              <div className="studio-stage__switch" role="group" aria-label="Training heatmap period">
                {HEATMAP_PERIODS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="studio-stage__switch-btn"
                    aria-pressed={period === option.id}
                    onClick={() => setPeriod(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            }
            summary={`${periodExercises.exercises.length} completed exercises`}
            footer={
              <div className="studio-stage__footer-row">
                <span className="studio-stage__footer-note">
                  {activeZone && activeZoneCount > 0
                    ? `${getZoneLabel(activeZone)}: ${activeZoneShare}% of period volume`
                    : 'Click any zone to inspect share'}
                </span>
                {activeZone && (
                  <Link
                    className="studio-stage__footer-link"
                    to="/explore"
                    onClick={() => {
                      resetFilters()
                      setBodyPart(resolveZoneBodyPartFilter(activeZone))
                    }}
                  >
                    Train {getZoneLabel(activeZone)} ↗
                  </Link>
                )}
              </div>
            }
          />
        </div>
      </div>
    </section>
  )
}


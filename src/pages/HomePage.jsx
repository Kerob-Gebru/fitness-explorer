import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SearchBar from '../components/exercises/SearchBar.jsx'
import ExerciseGrid from '../components/exercises/ExerciseGrid.jsx'
import Loader from '../components/common/Loader.jsx'
import ErrorMessage from '../components/common/ErrorMessage.jsx'
import useAsyncData from '../hooks/useAsyncData.js'
import useDocumentTitle from '../hooks/useDocumentTitle.js'
import { getExercises } from '../services/exerciseApi.js'
import { useSearchStore } from '../features/search/useSearchStore.js'
import { pickFeatured } from '../features/exercises/exerciseHelpers.js'
import { countBy, formatLabel } from '../utils/formatExercise.js'
import { useRecentStore } from '../features/recent/useRecentStore.js'
import { useFavoritesStore } from '../features/favorites/useFavoritesStore.js'
import { useWorkoutStore } from '../features/workout/useWorkoutStore.js'
import { calculateWorkoutProgress, formatSessionDate, localDateKey } from '../features/workout/workoutProgress.js'
import { formatDateKey } from '../features/workout/workoutCalendar.js'

export default function HomePage() {
  useDocumentTitle('Dashboard')
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const resetFilters = useSearchStore((state) => state.resetFilters)
  const setSearch = useSearchStore((state) => state.setSearch)
  const setBodyPart = useSearchStore((state) => state.setBodyPart)
  const recentExercises = useRecentStore((state) => state.exercises)
  const favorites = useFavoritesStore((state) => state.favorites)
  const plans = useWorkoutStore((state) => state.plans)
  const history = useWorkoutStore((state) => state.history)
  const scheduledWorkouts = useWorkoutStore((state) => state.scheduledWorkouts)
  const activeSession = useWorkoutStore((state) => state.activeSession)
  const builderExercises = useWorkoutStore((state) => state.exercises)
  const stats = useMemo(() => calculateWorkoutProgress(history), [history])
  const recentSessions = useMemo(() => {
    const seen = new Set()
    return [...history]
      .filter((session) => {
        if (!session || session.status !== 'completed' || typeof session.id !== 'string' ||
          typeof session.completedAt !== 'string' || seen.has(session.id) ||
          !Number.isFinite(Date.parse(session.completedAt))) return false
        seen.add(session.id)
        return true
      })
      .sort((first, second) => Date.parse(second.completedAt) - Date.parse(first.completedAt))
      .slice(0, 3)
  }, [history])

  const { data: exercises, loading, error, retry } = useAsyncData(() => getExercises(), [])

  function handleSearch() {
    resetFilters()
    setSearch(query.trim())
    navigate('/explore')
  }

  function openCategory(bodyPart) {
    resetFilters()
    setBodyPart(bodyPart)
  }

  const categories = exercises ? Object.entries(countBy(exercises, 'bodyPart')) : []
  const currentDate = new Date()
  const today = new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(currentDate)
  const nextWorkoutLabel = activeSession
    ? 'Continue workout'
    : builderExercises.length > 0
      ? 'Continue building'
      : 'Build a workout'

  return (
    <>
      <section className="dashboard-home" aria-labelledby="dashboard-title">
        <header className="dashboard-home__welcome">
          <div>
            <p className="eyebrow">YOUR FITNESS SPACE</p>
            <h1 id="dashboard-title">Welcome back</h1>
            <p className="muted">A clear view of your training, plans, and next steps.</p>
          </div>
          <time className="dashboard-home__date" dateTime={localDateKey(currentDate)}>{today}</time>
        </header>

        <div className="dashboard-home__actions" aria-label="Quick actions">
          <Link className="btn btn--primary" to="/explore">Explore exercises</Link>
          <Link className="btn" to="/workout#plans">Saved plans <span className="count-pill">{plans.length}</span></Link>
          <Link className="btn" to="/workout#history">Workout history</Link>
          <Link className="btn" to="/calendar">Workout calendar</Link>
          <Link className="btn" to="/workout">{nextWorkoutLabel}</Link>
        </div>

        <section className="dashboard-home__overview" aria-labelledby="dashboard-overview-title">
          <div className="dashboard-section-heading">
            <div>
              <p className="eyebrow">YOUR ACTIVITY</p>
              <h2 id="dashboard-overview-title">Training overview</h2>
            </div>
            <p className="muted dashboard-home__summary">
              {stats.weeklyWorkouts === 0
                ? 'No completed workouts yet this calendar week. Ready when you are.'
                : `${stats.weeklyWorkouts} workout${stats.weeklyWorkouts === 1 ? '' : 's'} completed this calendar week.`}
            </p>
          </div>
          <div className="dashboard-home__stats">
            <article className="dashboard-stat">
              <span className="dashboard-stat__icon" aria-hidden="true">✓</span>
              <div><p className="muted">Completed workouts</p><strong>{stats.totalWorkouts}</strong></div>
            </article>
            <article className="dashboard-stat">
              <span className="dashboard-stat__icon" aria-hidden="true">▤</span>
              <div><p className="muted">Saved plans</p><strong>{plans.length}</strong></div>
            </article>
            <article className="dashboard-stat">
              <span className="dashboard-stat__icon" aria-hidden="true">▦</span>
              <div><p className="muted">This week</p><strong>{stats.weeklyWorkouts}</strong></div>
            </article>
            <article className="dashboard-stat">
              <span className="dashboard-stat__icon" aria-hidden="true">↗</span>
              <div><p className="muted">Current streak</p><strong>{stats.currentStreak}<small> {stats.currentStreak === 1 ? 'day' : 'days'}</small></strong></div>
            </article>
          </div>

        </section>

        <section className="dashboard-home__weekly" aria-labelledby="dashboard-weekly-title">
          <div className="dashboard-section-heading">
            <div><p className="eyebrow">MONDAY – SUNDAY</p><h2 id="dashboard-weekly-title">Weekly activity</h2></div>
            <span className="muted">{stats.weeklyWorkouts} completed this week</span>
          </div>
          <div
            className="activity-chart dashboard-home__chart"
            role="img"
            aria-label={`Completed workouts this calendar week: ${stats.weekDays.map((day) => `${day.label} ${day.count}`).join(', ')}`}
          >
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

        <div className="dashboard-home__lower">
          <section className="dashboard-home__panel" aria-labelledby="dashboard-recent-title">
            <div className="dashboard-section-heading">
              <div><p className="eyebrow">COMPLETED SESSIONS</p><h2 id="dashboard-recent-title">Recent workouts</h2></div>
              <Link to="/workout#history">View history</Link>
            </div>
            {recentSessions.length > 0 ? (
              <ul className="dashboard-home__list">
                {recentSessions.map((session) => (
                  <li key={session.id}>
                    <div><strong>{session.name}</strong><span className="muted">{formatSessionDate(session.completedAt)}</span></div>
                    <span className="dashboard-home__session-meta">
                      {Array.isArray(session.exercises) ? `${session.exercises.length} exercise${session.exercises.length === 1 ? '' : 's'}` : ''}
                      {Number.isFinite(session.durationSeconds) && session.durationSeconds >= 0
                        ? `${Array.isArray(session.exercises) ? ' · ' : ''}${Math.floor(session.durationSeconds / 60)} min`
                        : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted dashboard-home__empty">No completed workouts yet. Your finished sessions will show up here.</p>
            )}
          </section>

          <section className="dashboard-home__panel" aria-labelledby="dashboard-plans-title">
            <div className="dashboard-section-heading">
              <div><p className="eyebrow">READY WHEN YOU ARE</p><h2 id="dashboard-plans-title">Saved plans</h2></div>
              <Link to="/workout#plans">View all</Link>
            </div>
            {plans.length > 0 ? (
              <ul className="dashboard-home__list">
                {plans.slice(0, 3).map((plan) => (
                  <li key={plan.id}>
                    <div><strong>{plan.name}</strong><span className="muted">{plan.exercises.length} exercise{plan.exercises.length === 1 ? '' : 's'}</span></div>
                    <Link className="btn dashboard-home__view-plan" to="/workout#plans" aria-label={`View ${plan.name} plan`}>View</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="dashboard-home__empty">
                <p className="muted">No saved plans yet. Build a routine from exercises and save it for later.</p>
                <Link to="/explore">Find exercises to build a plan</Link>
              </div>
            )}
          </section>

          <section className="dashboard-home__panel dashboard-home__upcoming" aria-labelledby="dashboard-upcoming-title">
            <div className="dashboard-section-heading">
              <div><p className="eyebrow">ON YOUR CALENDAR</p><h2 id="dashboard-upcoming-title">Upcoming workouts</h2></div>
              <Link to="/calendar">Open calendar</Link>
            </div>
            {scheduledWorkouts.some((workout) => workout.status === 'scheduled' || workout.status === 'in-progress') ? (
              <ul className="dashboard-home__list">
                {scheduledWorkouts
                  .filter((workout) => workout.status === 'scheduled' || workout.status === 'in-progress')
                  .sort((first, second) => first.date.localeCompare(second.date) || (first.time || '').localeCompare(second.time || ''))
                  .slice(0, 3)
                  .map((workout) => (
                    <li key={workout.id}>
                      <div><strong>{workout.name}</strong><span className="muted">{formatDateKey(workout.date, { dateStyle: 'medium' })}{workout.time ? ` · ${workout.time}` : ''} · {workout.status === 'in-progress' ? 'In progress' : 'Planned'}</span></div>
                      <Link className="btn dashboard-home__view-plan" to={`/calendar?workout=${encodeURIComponent(workout.id)}`} aria-label={`Open ${workout.name} in calendar`}>Open</Link>
                    </li>
                  ))}
              </ul>
            ) : (
              <div className="dashboard-home__empty">
                <p className="muted">No workouts scheduled yet.</p>
                <Link to="/calendar">Schedule a saved plan</Link>
              </div>
            )}
          </section>
        </div>
      </section>

      <section className="section" aria-labelledby="discovery-title">
        <div className="section__head"><div><p className="eyebrow">DISCOVER</p><h2 id="discovery-title">Find your next exercise</h2></div><Link to="/explore">Browse all exercises</Link></div>
        <div className="hero dashboard-home__discovery">
          <p className="hero__text">
            Search by name, narrow by muscle or equipment, and keep the exercises you want to come back to.
          </p>
          <SearchBar value={query} onChange={setQuery} onSubmit={handleSearch} />
          <p className="hero__link">or <Link to="/explore">browse the full exercise library</Link></p>
        </div>
      </section>

      {loading && <Loader label="Loading exercises..." />}
      {error && <ErrorMessage error={error} onRetry={retry} />}

      {exercises && (
        <>
          <section className="section" aria-labelledby="categories-title">
            <h2 id="categories-title">Train by body part</h2>
            <ul className="categories">
              {categories.map(([bodyPart, count]) => (
                <li key={bodyPart}>
                  <Link to="/explore" className="category" onClick={() => openCategory(bodyPart)}>
                    <span className="category__name">{formatLabel(bodyPart)}</span>
                    <span className="category__count">{count} {count === 1 ? 'exercise' : 'exercises'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {recentExercises.length > 0 && (
            <section className="section" aria-labelledby="recent-title">
              <div className="section__head"><div><p className="eyebrow">PICK UP WHERE YOU LEFT OFF</p><h2 id="recent-title">Recently viewed</h2></div><Link to="/explore">Explore more</Link></div>
              <ExerciseGrid exercises={recentExercises.slice(0, 3)} />
            </section>
          )}

          {favorites.length > 0 && (
            <section className="section" aria-labelledby="home-favorites-title">
              <div className="section__head"><div><p className="eyebrow">YOUR PERSONAL COLLECTION</p><h2 id="home-favorites-title">Saved for later</h2></div><Link to="/favorites">View favorites</Link></div>
              <ExerciseGrid exercises={favorites.slice(0, 3)} />
            </section>
          )}

          <section className="section" aria-labelledby="featured-title">
            <div className="section__head">
              <h2 id="featured-title">Featured exercises</h2>
              <Link to="/explore">See all</Link>
            </div>
            <ExerciseGrid exercises={pickFeatured(exercises, 6)} />
          </section>
        </>
      )}
    </>
  )
}

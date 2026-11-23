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
import { calculateWorkoutProgress, formatSessionDate, getCompletedWorkoutSessions, localDateKey } from '../features/workout/workoutProgress.js'
import GoalProgressPanel from '../features/workout/GoalProgressPanel.jsx'
import { formatDateKey } from '../features/workout/workoutCalendar.js'
import FocusFigure from '../features/home3d/FocusFigure.jsx'
import { getWeeklyFocusData } from '../features/home3d/focusFigureData.js'

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
  const focusData = useMemo(() => getWeeklyFocusData(history), [history])
  const recentSessions = useMemo(() => getCompletedWorkoutSessions(history).slice(0, 3), [history])

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

  function openFocusZone(zone) {
    openCategory(zone.bodyPart)
  }

  const categories = exercises ? Object.entries(countBy(exercises, 'bodyPart')) : []
  const currentDate = new Date()
  const today = new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(currentDate)
  const nextWorkoutLabel = activeSession
    ? 'Continue workout'
    : builderExercises.length > 0
      ? 'Continue building'
      : 'Build a workout'

  const upcomingWorkouts = scheduledWorkouts
    .filter((workout) => workout.status === 'scheduled' || workout.status === 'in-progress')
    .sort((first, second) => first.date.localeCompare(second.date) || (first.time || '').localeCompare(second.time || ''))
    .slice(0, 3)

  const studioLead = (
    <header className="studio-lead">
      <div className="studio-lead__top">
        <p className="eyebrow">YOUR FITNESS STUDIO</p>
        <span className="studio-lead__sep" aria-hidden="true">·</span>
        <time className="dashboard-home__date" dateTime={localDateKey(currentDate)}>{today}</time>
      </div>
      <h1 id="dashboard-title" className="display">
        <span>FIND YOUR </span>
        <em>stronger</em>
        <span> SIDE.</span>
      </h1>
      <p className="muted studio-lead__subtitle">
        A little movement. A lot of momentum. Inspect your weekly muscle distribution and jump straight into training.
      </p>
      <div className="dashboard-home__hero-actions">
        <Link className="btn btn--primary glint" to={activeSession ? '/workout/session' : '/workout'}>
          <span className="glint__label">{nextWorkoutLabel}</span>
          <span className="glint__label" aria-hidden="true">↗</span>
        </Link>
        <Link className="btn btn--ghost" to="/explore">Explore exercises</Link>
      </div>
    </header>
  )

  const studioTelemetry = (
    <div className="studio-telemetry">
      <div className="studio-telemetry__overview" aria-labelledby="dashboard-overview-title">
        <div className="studio-telemetry__head">
          <div>
            <p className="eyebrow">ACTIVITY SNAPSHOT</p>
            <h2 id="dashboard-overview-title" className="display">
              Training <em>overview</em>
            </h2>
          </div>
          <p className="muted studio-telemetry__summary">
            {stats.weeklyWorkouts === 0
              ? 'No completed workouts yet this week.'
              : `${stats.weeklyWorkouts} workout${stats.weeklyWorkouts === 1 ? '' : 's'} completed this week.`}
          </p>
        </div>

        <dl className="studio-telemetry__metrics">
          <div className="studio-metric">
            <dt>Completed</dt>
            <dd className="display">{stats.totalWorkouts}</dd>
          </div>
          <div className="studio-metric">
            <dt>This week</dt>
            <dd className="display">{stats.weeklyWorkouts}</dd>
          </div>
          <div className="studio-metric">
            <dt>Current streak</dt>
            <dd className="display">{stats.currentStreak}<span> {stats.currentStreak === 1 ? 'day' : 'days'}</span></dd>
          </div>
          <div className="studio-metric">
            <dt>Saved plans</dt>
            <dd className="display">{plans.length}</dd>
          </div>
        </dl>
      </div>

      <div className="studio-telemetry__weekly" aria-labelledby="dashboard-weekly-title">
        <div className="studio-telemetry__head">
          <div>
            <p className="eyebrow">MONDAY – SUNDAY</p>
            <h2 id="dashboard-weekly-title" className="display">
              Weekly <em>cadence</em>
            </h2>
          </div>
          <span className="muted studio-telemetry__cadence-count">{stats.weeklyWorkouts} completed</span>
        </div>
        <div
          className="activity-chart studio-telemetry__chart"
          role="img"
          aria-label={`Completed workouts this calendar week: ${stats.weekDays.map((day) => `${day.label} ${day.count}`).join(', ')}`}
        >
          {stats.weekDays.map((day) => {
            const maximum = Math.max(1, ...stats.weekDays.map((item) => item.count))
            return (
              <div className="activity-chart__day" key={day.date} title={`${day.count} completed workout${day.count === 1 ? '' : 's'}`}>
                <span className="activity-chart__count">{day.count}</span>
                <span className="activity-chart__track"><span style={{ height: `${day.count ? Math.max(14, day.count / maximum * 100) : 0}%` }} /></span>
                <span className="activity-chart__label">{day.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <section className="dashboard-home" aria-labelledby="dashboard-title">
        <FocusFigure
          data={focusData}
          onExploreZone={openFocusZone}
          leadContent={studioLead}
        />

        <div id="dashboard-sheet" className="dashboard-sheet">
          <header className="dashboard-sheet__intro">
            <div>
              <p className="eyebrow">THE TRAINING SYSTEM</p>
              <h2 className="display dashboard-sheet__headline">
                <span className="dashboard-sheet__roman">YOUR WEEKLY</span>{' '}
                <em>momentum</em>
              </h2>
            </div>
            <p className="muted dashboard-sheet__copy">
              Goals, recent sessions, saved plans, and scheduled workouts organized in a calm charcoal &amp; orange studio sheet.
            </p>
          </header>

          <div className="dashboard-home__panel dashboard-sheet__telemetry">
            {studioTelemetry}
          </div>

          <div className="dashboard-home__goals">
            <GoalProgressPanel stats={stats} />

            <section className="dashboard-home__panel dashboard-home__streak" aria-labelledby="dashboard-streak-title">
              <div className="dashboard-section-heading">
                <div>
                  <p className="eyebrow">CONSISTENCY &amp; VOLUME</p>
                  <h2 id="dashboard-streak-title" className="display">All-time <em>momentum</em></h2>
                </div>
                <Link to="/progress">View analytics ↗</Link>
              </div>
              <div className="dashboard-home__streak-stats">
                <article className="dashboard-stat">
                  <span className="dashboard-stat__icon" aria-hidden="true">★</span>
                  <div>
                    <p className="muted">Longest streak</p>
                    <strong className="display">{stats.longestStreak}<small> {stats.longestStreak === 1 ? 'day' : 'days'}</small></strong>
                  </div>
                </article>
                <article className="dashboard-stat">
                  <span className="dashboard-stat__icon" aria-hidden="true">✓</span>
                  <div>
                    <p className="muted">Exercises done</p>
                    <strong className="display">{stats.exercisesCompleted}</strong>
                  </div>
                </article>
              </div>
            </section>
          </div>

          <div className="dashboard-home__pipeline">
            <section className="dashboard-home__panel" aria-labelledby="dashboard-recent-title">
              <div className="dashboard-section-heading">
                <div>
                  <p className="eyebrow">01 · COMPLETED SESSIONS</p>
                  <h2 id="dashboard-recent-title" className="display">Recent <em>workouts</em></h2>
                </div>
                <Link to="/workout#history">History</Link>
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
                <div>
                  <p className="eyebrow">02 · READY WHEN YOU ARE</p>
                  <h2 id="dashboard-plans-title" className="display">Saved <em>plans</em></h2>
                </div>
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
                  <p className="muted">No saved plans yet. Build a routine and save it for repeat sessions.</p>
                  <Link to="/explore">Find exercises to build a plan</Link>
                </div>
              )}
            </section>

            <section className="dashboard-home__panel dashboard-home__upcoming" aria-labelledby="dashboard-upcoming-title">
              <div className="dashboard-section-heading">
                <div>
                  <p className="eyebrow">03 · ON YOUR CALENDAR</p>
                  <h2 id="dashboard-upcoming-title" className="display">Upcoming <em>workouts</em></h2>
                </div>
                <Link to="/calendar">Calendar</Link>
              </div>
              {upcomingWorkouts.length > 0 ? (
                <ul className="dashboard-home__list">
                  {upcomingWorkouts.map((workout) => (
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

          <section className="dashboard-home__quick" aria-labelledby="dashboard-quick-title">
            <div className="dashboard-section-heading">
              <div>
                <p className="eyebrow">QUICK ACCESS</p>
                <h2 id="dashboard-quick-title" className="display">Jump <em>back in</em></h2>
              </div>
            </div>
            <div className="dashboard-home__actions" aria-label="Quick navigation">
              <Link className="btn" to="/explore">Explore exercises</Link>
              <Link className="btn" to="/calendar">Workout calendar</Link>
              <Link className="btn" to="/progress">Progress analytics</Link>
              <Link className="btn" to="/favorites">Favorites</Link>
            </div>
          </section>

          <section className="section dashboard-sheet__discovery-wrap" aria-labelledby="discovery-title">
            <div className="hero dashboard-home__discovery">
              <div className="dashboard-home__discovery-head">
                <div>
                  <p className="eyebrow">DISCOVER · EXERCISE ARCHIVE</p>
                  <h2 id="discovery-title" className="display">
                    Find your next <em>exercise</em>
                  </h2>
                </div>
                <Link className="dashboard-home__discovery-all" to="/explore">Browse all ↗</Link>
              </div>
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
                <div className="section__head">
                  <div>
                    <p className="eyebrow">BY ANATOMY</p>
                    <h2 id="categories-title" className="display">Train by <em>body part</em></h2>
                  </div>
                  <Link to="/explore">Full library ↗</Link>
                </div>
                <ul className="categories">
                  {categories.map(([bodyPart, count], index) => (
                    <li key={bodyPart}>
                      <Link to="/explore" className="category" onClick={() => openCategory(bodyPart)}>
                        <span className="category__index" aria-hidden="true">N°{String(index + 1).padStart(2, '0')}</span>
                        <span className="category__name display">{formatLabel(bodyPart)}</span>
                        <span className="category__count">{count} {count === 1 ? 'exercise' : 'exercises'}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>

              {recentExercises.length > 0 && (
                <section className="section" aria-labelledby="recent-title">
                  <div className="section__head">
                    <div>
                      <p className="eyebrow">PICK UP WHERE YOU LEFT OFF</p>
                      <h2 id="recent-title" className="display">Recently <em>viewed</em></h2>
                    </div>
                    <Link to="/explore">Explore more ↗</Link>
                  </div>
                  <ExerciseGrid exercises={recentExercises.slice(0, 3)} />
                </section>
              )}

              {favorites.length > 0 && (
                <section className="section" aria-labelledby="home-favorites-title">
                  <div className="section__head">
                    <div>
                      <p className="eyebrow">YOUR PERSONAL COLLECTION</p>
                      <h2 id="home-favorites-title" className="display">Saved <em>for later</em></h2>
                    </div>
                    <Link to="/favorites">View favorites ↗</Link>
                  </div>
                  <ExerciseGrid exercises={favorites.slice(0, 3)} />
                </section>
              )}

              <section className="section" aria-labelledby="featured-title">
                <div className="section__head">
                  <div>
                    <p className="eyebrow">CURATED SELECTION</p>
                    <h2 id="featured-title" className="display">Featured <em>exercises</em></h2>
                  </div>
                  <Link to="/explore">See all ↗</Link>
                </div>
                <ExerciseGrid exercises={pickFeatured(exercises, 6)} />
              </section>
            </>
          )}
        </div>
      </section>
    </>
  )
}

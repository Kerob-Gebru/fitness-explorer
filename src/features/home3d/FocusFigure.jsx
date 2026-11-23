import { lazy, Suspense, useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import FocusFigureFallback from './FocusFigureFallback.jsx'
import FocusFigureLegend from './FocusFigureLegend.jsx'
import { FOCUS_ZONES } from './focusFigureData.js'
import { formatDateKey } from '../workout/workoutCalendar.js'
import { useTheme } from '../theme/themeContext.js'
import SceneBoundary from './prototype/SceneBoundary.jsx'
import './focusFigure.css'

const FocusFigure3D = lazy(() => import('./FocusFigure3D.jsx'))
const SCENE_LOAD_TIMEOUT_MS = 10000

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (!context) return false
    context.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

export default function FocusFigure({ data, onExploreZone }) {
  const { theme } = useTheme()
  const titleId = useId()
  const [webglAvailable] = useState(supportsWebGL)
  const [sceneReady, setSceneReady] = useState(false)
  const [sceneFailed, setSceneFailed] = useState(false)
  const [selectedZone, setSelectedZone] = useState(null)
  const [hoveredZone, setHoveredZone] = useState(null)
  const [view, setView] = useState('front')
  const [viewNonce, setViewNonce] = useState(0)

  const themeName = theme === 'light' ? 'light' : 'dark'
  const selected = FOCUS_ZONES.find((zone) => zone.id === selectedZone) ?? null
  const selectedCount = selected ? data.counts[selected.id] ?? 0 : 0
  const weekLabel = `${formatDateKey(data.weekStartKey, { month: 'short', day: 'numeric' })} – ${formatDateKey(data.weekEndKey, { month: 'short', day: 'numeric' })}`
  const countSummary = useMemo(
    () => FOCUS_ZONES.map((zone) => `${zone.label}: ${data.counts[zone.id] ?? 0}`).join(', '),
    [data.counts],
  )
  const emptyMessage = data.completedExercises === 0
    ? 'No completed exercises this week yet. Finish a workout and your focus figure will fill in.'
    : data.mappedExercises === 0
      ? 'No completed exercises in the six focus groups this week, so no zone is highlighted.'
      : null
  const statusText = selected
    ? `${selected.label}: ${selectedCount} completed ${selectedCount === 1 ? 'exercise' : 'exercises'} this week.`
    : 'Select a muscle group to highlight it and filter Explore.'
  const use3D = webglAvailable && !sceneFailed
  const showReset = use3D && sceneReady

  useEffect(() => {
    if (!webglAvailable || sceneReady || sceneFailed) return undefined

    const timer = window.setTimeout(() => {
      setSceneFailed(true)
      setView('front')
      setHoveredZone(null)
    }, SCENE_LOAD_TIMEOUT_MS)

    return () => window.clearTimeout(timer)
  }, [webglAvailable, sceneReady, sceneFailed])

  function applyView(nextView) {
    setView(nextView)
    setViewNonce((current) => current + 1)
  }

  function handleSelectZone(zoneId) {
    if (selectedZone === zoneId) {
      setSelectedZone(null)
      return
    }

    setSelectedZone(zoneId)
    if (zoneId === 'back') applyView('back')
    else if (zoneId === 'chest' || zoneId === 'core') applyView('front')
  }

  function handleSceneFailure() {
    setSceneFailed(true)
    setView('front')
    setHoveredZone(null)
  }

  const fallback = (
    <FocusFigureFallback
      view={view === 'back' ? 'back' : 'front'}
      selectedZone={selectedZone}
      hoveredZone={hoveredZone}
      counts={data.counts}
      summary={countSummary}
      onSelectZone={handleSelectZone}
      onHoverZone={setHoveredZone}
    />
  )

  return (
    <section className="focus-figure" aria-labelledby={titleId}>
      <header className="focus-figure__head">
        <div>
          <p className="focus-figure__eyebrow">THIS WEEK</p>
          <h2 id={titleId}>Muscle focus</h2>
        </div>
        <span className="focus-figure__range">{weekLabel}</span>
      </header>

      {emptyMessage && <p className="focus-figure__empty">{emptyMessage}</p>}

      <div className="focus-figure__body">
        <div className="focus-figure__stage">
          <div className="focus-figure__views" role="group" aria-label="Figure view">
            <button
              type="button"
              className="focus-figure__view"
              aria-pressed={view === 'front'}
              onClick={() => applyView('front')}
            >
              Front
            </button>
            <button
              type="button"
              className="focus-figure__view"
              aria-pressed={view === 'back'}
              onClick={() => applyView('back')}
            >
              Back
            </button>
            {showReset && (
              <button
                type="button"
                className="focus-figure__view"
                aria-pressed={view === 'reset'}
                onClick={() => applyView('reset')}
              >
                Reset
              </button>
            )}
          </div>

          {use3D ? (
            <SceneBoundary fallback={fallback} onError={handleSceneFailure}>
              <Suspense fallback={fallback}>
                <FocusFigure3D
                  theme={themeName}
                  counts={data.counts}
                  summary={countSummary}
                  view={view}
                  viewNonce={viewNonce}
                  hoveredZone={hoveredZone}
                  selectedZone={selectedZone}
                  onHoverZone={setHoveredZone}
                  onSelectZone={handleSelectZone}
                  onClearSelection={() => setSelectedZone(null)}
                  onDragStart={() => setView('custom')}
                  onReady={() => setSceneReady(true)}
                  onFailure={handleSceneFailure}
                />
              </Suspense>
            </SceneBoundary>
          ) : (
            fallback
          )}

          <p className="focus-figure__stage-total">
            <span>This week</span>
            <strong>{data.mappedExercises} {data.mappedExercises === 1 ? 'exercise' : 'exercises'}</strong>
          </p>
        </div>

        <div className="focus-figure__side">
          <FocusFigureLegend
            counts={data.counts}
            selectedZone={selectedZone}
            hoveredZone={hoveredZone}
            onSelectZone={handleSelectZone}
            onHoverZone={setHoveredZone}
          />

          <p className="focus-figure__status" role="status" aria-live="polite">{statusText}</p>

          {selected && (
            <Link
              className="focus-figure__explore"
              to="/explore"
              onClick={() => onExploreZone(selected)}
            >
              <span>Explore {selected.label.toLowerCase()} exercises</span>
              <span aria-hidden="true">↗</span>
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

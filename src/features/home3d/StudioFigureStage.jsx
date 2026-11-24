import { lazy, Suspense, useId, useMemo, useState } from 'react'
import FocusFigureFallback from './FocusFigureFallback.jsx'
import { FOCUS_ZONES } from './focusFigureData.js'
import { useTheme } from '../theme/themeContext.js'
import SceneBoundary from './prototype/SceneBoundary.jsx'
import './studioFigureStage.css'

const FocusFigure3D = lazy(() => import('./FocusFigure3D.jsx'))

let cachedWebGLSupport = null

function supportsWebGL() {
  if (cachedWebGLSupport !== null) return cachedWebGLSupport
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (!context) {
      cachedWebGLSupport = false
      return false
    }
    context.getExtension('WEBGL_lose_context')?.loseContext()
    cachedWebGLSupport = true
    return true
  } catch {
    cachedWebGLSupport = false
    return false
  }
}

export default function StudioFigureStage({
  eyebrow = '3D ANATOMY STUDIO',
  title = <>Muscle <em>focus</em></>,
  subtitle = '',
  counts = null,
  selectedZone = null,
  hoveredZone = null,
  cameraFocusZone = undefined,
  summary = '',
  onSelectZone = null,
  onHoverZone = null,
  onClearSelection = null,
  zoneCountsUnit = '',
  sticky = true,
  compactHeight = false,
  headerActions = null,
  footer = null,
}) {
  const { theme } = useTheme()
  const titleId = useId()
  const [webglAvailable] = useState(supportsWebGL)
  const [sceneReady, setSceneReady] = useState(false)
  const [sceneFailed, setSceneFailed] = useState(false)
  const [internalHoveredZone, setInternalHoveredZone] = useState(null)
  const [viewOverride, setViewOverride] = useState(null)
  const [viewNonce, setViewNonce] = useState(0)

  const themeName = theme === 'light' ? 'light' : 'dark'
  const use3D = webglAvailable && !sceneFailed
  const activeHover = hoveredZone ?? internalHoveredZone
  const illuminatedZone = selectedZone ?? activeHover ?? null
  const resolvedCameraZone = cameraFocusZone !== undefined ? cameraFocusZone : selectedZone
  const autoView = resolvedCameraZone === 'back' ? 'back' : 'front'
  const view = viewOverride && viewOverride.zone === resolvedCameraZone ? viewOverride.mode : autoView

  const countSummary = useMemo(
    () => summary || FOCUS_ZONES.map((zone) => `${zone.label}: ${counts?.[zone.id] ?? 0}`).join(', '),
    [counts, summary],
  )

  function handleZoneHover(zoneId) {
    setInternalHoveredZone(zoneId)
    onHoverZone?.(zoneId)
  }

  function handleZoneSelect(zoneId) {
    setViewOverride(null)
    onSelectZone?.(zoneId)
  }

  function applyView(nextView) {
    if (nextView === 'reset') {
      onClearSelection?.()
      setViewOverride({ zone: null, mode: nextView })
    } else {
      setViewOverride({ zone: resolvedCameraZone, mode: nextView })
    }
    setViewNonce((current) => current + 1)
  }

  function handleSceneFailure() {
    setSceneFailed(true)
    setViewOverride(null)
    setInternalHoveredZone(null)
  }

  const fallback = (
    <FocusFigureFallback
      view={view === 'back' ? 'back' : 'front'}
      selectedZone={selectedZone}
      hoveredZone={activeHover}
      counts={counts}
      summary={countSummary}
      onSelectZone={handleZoneSelect}
      onHoverZone={handleZoneHover}
    />
  )

  return (
    <aside
      className={[
        'studio-stage',
        sticky ? 'studio-stage--sticky' : '',
        compactHeight ? 'studio-stage--compact' : '',
      ].filter(Boolean).join(' ')}
      aria-labelledby={titleId}
    >
      <header className="studio-stage__head">
        <div className="studio-stage__titles">
          <p className="eyebrow">{eyebrow}</p>
          <h2 id={titleId} className="studio-stage__title display">{title}</h2>
        </div>
        {headerActions && <div className="studio-stage__head-actions">{headerActions}</div>}
      </header>

      {subtitle && <p className="studio-stage__subtitle">{subtitle}</p>}

      <div className="studio-stage__viewport">
        <div className="studio-stage__views" role="group" aria-label="3D figure angle">
          <button
            type="button"
            className="studio-stage__view-btn"
            aria-pressed={view === 'front'}
            onClick={() => applyView('front')}
          >
            Front
          </button>
          <button
            type="button"
            className="studio-stage__view-btn"
            aria-pressed={view === 'back'}
            onClick={() => applyView('back')}
          >
            Back
          </button>
          {use3D && sceneReady && (
            <button
              type="button"
              className="studio-stage__view-btn"
              aria-pressed={view === 'reset'}
              onClick={() => applyView('reset')}
            >
              Reset
            </button>
          )}
        </div>

        <div className="studio-stage__canvas-wrap">
          {use3D ? (
            <SceneBoundary fallback={fallback} onError={handleSceneFailure}>
              <Suspense fallback={fallback}>
                <FocusFigure3D
                  theme={themeName}
                  counts={counts}
                  summary={countSummary}
                  view={view}
                  viewNonce={viewNonce}
                  compact={false}
                  centered
                  cinemaEnabled={false}
                  hoveredZone={activeHover}
                  selectedZone={illuminatedZone}
                  cameraFocusZone={resolvedCameraZone}
                  onHoverZone={handleZoneHover}
                  onSelectZone={handleZoneSelect}
                  onClearSelection={() => onClearSelection?.()}
                  onDragStart={() => setViewOverride({ zone: resolvedCameraZone, mode: 'custom' })}
                  onReady={() => setSceneReady(true)}
                  onFailure={handleSceneFailure}
                />
              </Suspense>
            </SceneBoundary>
          ) : (
            fallback
          )}
        </div>
      </div>

      <ul className="studio-stage__zones" aria-label="Interactive muscle zones">
        {FOCUS_ZONES.map((zone) => {
          const isSelected = selectedZone === zone.id
          const isHovered = activeHover === zone.id
          const value = Number(counts?.[zone.id] ?? 0)
          const formattedValue = Number.isInteger(value) ? value : value.toFixed(1).replace(/\.0$/, '')
          return (
            <li key={zone.id}>
              <button
                type="button"
                className={[
                  'studio-stage__zone-btn',
                  isSelected ? 'is-selected' : '',
                  isHovered ? 'is-hovered' : '',
                  value > 0 ? 'has-activity' : '',
                ].filter(Boolean).join(' ')}
                aria-pressed={isSelected}
                onClick={() => handleZoneSelect(zone.id)}
                onMouseEnter={() => handleZoneHover(zone.id)}
                onMouseLeave={() => handleZoneHover(null)}
              >
                <span className="studio-stage__zone-name">{zone.label}</span>
                {counts && (
                  <span className="studio-stage__zone-count">
                    {formattedValue}{zoneCountsUnit ? ` ${zoneCountsUnit}` : ''}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      {footer && <div className="studio-stage__footer">{footer}</div>}
    </aside>
  )
}

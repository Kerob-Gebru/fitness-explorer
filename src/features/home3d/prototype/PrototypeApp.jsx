import { useEffect, useRef, useState } from 'react'
import FocusFigureScene from './FocusFigureScene.jsx'
import SceneBoundary from './SceneBoundary.jsx'
import { FIGURE_THEMES } from './mannequinMaterials.js'
import { MUSCLE_ZONES, getZoneLabel } from './zones.js'

const YAW_SPEED = 0.008
const PITCH_SPEED = 0.004
const PITCH_LIMIT = 0.34
const CLICK_SLOP = 6
const RESET_VIEW = { yaw: -0.42, pitch: 0.05 }

function getInitialTheme() {
  try {
    return window.localStorage.getItem('fitness-theme') === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

// Dev-only deep links for reviewing states: ?theme=light&view=back
function getPreviewOptions() {
  if (!import.meta.env.DEV) return {}
  const params = new URLSearchParams(window.location.search)
  const theme = params.get('theme')
  const view = params.get('view')

  return {
    theme: theme === 'light' || theme === 'dark' ? theme : null,
    initialYaw: view === 'back' ? Math.PI : view === 'front' ? 0 : null,
  }
}

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  )

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!query) return undefined

    const handleChange = (event) => setReduced(event.matches)
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  return reduced
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export default function PrototypeApp() {
  const [previewOptions] = useState(getPreviewOptions)
  const [theme, setTheme] = useState(() => previewOptions.theme ?? getInitialTheme())
  const [hoveredZone, setHoveredZone] = useState(null)
  const [selectedZone, setSelectedZone] = useState('chest')
  const [isDragging, setIsDragging] = useState(false)
  const [webglAvailable] = useState(supportsWebGL)
  const reducedMotion = usePrefersReducedMotion()

  const mannequinRef = useRef(null)
  const invalidateRef = useRef(null)
  const dragRef = useRef(null)
  const lastDragDistanceRef = useRef(0)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.style.colorScheme = theme
    // The prototype mirrors the saved preference but never writes to it.
  }, [theme])

  function setView(yaw, pitch = RESET_VIEW.pitch) {
    if (!mannequinRef.current) return
    mannequinRef.current.rotation.set(pitch, yaw, 0)
    lastDragDistanceRef.current = 0
    invalidateRef.current?.()
  }

  function handlePointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    lastDragDistanceRef.current = 0
    dragRef.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
      captured: false,
    }
    setIsDragging(true)
  }

  function handlePointerMove(event) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId || !mannequinRef.current) return

    const deltaX = event.clientX - drag.lastX
    const deltaY = event.clientY - drag.lastY
    drag.lastX = event.clientX
    drag.lastY = event.clientY
    lastDragDistanceRef.current += Math.abs(deltaX) + Math.abs(deltaY)

    const figure = mannequinRef.current
    figure.rotation.y += deltaX * YAW_SPEED
    figure.rotation.x = clamp(figure.rotation.x + deltaY * PITCH_SPEED, -PITCH_LIMIT, PITCH_LIMIT)
    invalidateRef.current?.()

    // Capture only once a drag is real, so a plain click still reaches R3F's
    // zone selection instead of being retargeted away from the canvas.
    if (!drag.captured && lastDragDistanceRef.current > CLICK_SLOP) {
      drag.captured = true
      try {
        event.currentTarget.setPointerCapture?.(event.pointerId)
      } catch {
        // Synthetic pointers (automation) have no capturable pointer id.
      }
    }
  }

  function handlePointerEnd(event) {
    const drag = dragRef.current
    if (!drag) return
    if (event?.pointerId != null && drag.pointerId !== event.pointerId) return

    dragRef.current = null
    setIsDragging(false)

    if (!drag.captured) return

    try {
      event?.currentTarget?.releasePointerCapture?.(drag.pointerId)
    } catch {
      // Capture is already gone; nothing to release.
    }
  }

  function handleStageLeave() {
    if (!dragRef.current) setHoveredZone(null)
  }

  function handleSelectZone(zone) {
    if (lastDragDistanceRef.current > CLICK_SLOP) {
      lastDragDistanceRef.current = 0
      return
    }

    setSelectedZone((current) => (current === zone ? null : zone))
  }

  function handlePointerMissed() {
    if (lastDragDistanceRef.current > CLICK_SLOP) {
      lastDragDistanceRef.current = 0
      return
    }

    setSelectedZone(null)
  }

  function handleLegendHover(zone) {
    setHoveredZone(zone)
  }

  function handleLegendLeave(zone, event) {
    if (document.activeElement !== event.currentTarget) {
      setHoveredZone((current) => (current === zone ? null : current))
    }
  }

  const palette = FIGURE_THEMES[theme]
  const stageClassName = [
    'prototype-stage',
    hoveredZone ? 'is-zone-hovered' : '',
    isDragging ? 'is-dragging' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const statusText = hoveredZone
    ? `Previewing ${getZoneLabel(hoveredZone)}.`
    : selectedZone
      ? `${getZoneLabel(selectedZone)} highlighted.`
      : 'No muscle zone highlighted.'

  return (
    <div className="prototype-page">
      <header className="prototype-header">
        <div>
          <p className="prototype-badge">Stage 0 · isolated prototype</p>
          <h1>Weekly Focus Figure</h1>
          <p className="prototype-subtitle">
            A procedural low-poly mannequin for the Home hero. Not connected to the dashboard,
            workout data, or navigation.
          </p>
        </div>
        <div className="prototype-theme" role="group" aria-label="Preview theme">
          <button
            type="button"
            data-theme-option="dark"
            aria-pressed={theme === 'dark'}
            onClick={() => setTheme('dark')}
          >
            Dark
          </button>
          <button
            type="button"
            data-theme-option="light"
            aria-pressed={theme === 'light'}
            onClick={() => setTheme('light')}
          >
            Light
          </button>
        </div>
      </header>

      <main className="prototype-layout">
        <section className="prototype-stage-panel" aria-labelledby="prototype-stage-heading">
          <div className="prototype-stage-heading">
            <h2 id="prototype-stage-heading">Six muscle zones</h2>
            <p className="prototype-hint">
              Drag the figure to rotate. Use the view controls to inspect the back.
            </p>
          </div>

          <div
            className={stageClassName}
            role="group"
            aria-label="Interactive 3D mannequin preview"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onLostPointerCapture={handlePointerEnd}
            onPointerLeave={handleStageLeave}
          >
            <div className="prototype-stage__glow" aria-hidden="true" />
            <div className="prototype-stage__shadow" aria-hidden="true" />
            {webglAvailable ? (
              <SceneBoundary>
                <FocusFigureScene
                  theme={theme}
                  palette={palette}
                  initialYaw={previewOptions.initialYaw ?? RESET_VIEW.yaw}
                  mannequinRef={mannequinRef}
                  hoveredZone={hoveredZone}
                  selectedZone={selectedZone}
                  onHoverZone={setHoveredZone}
                  onSelectZone={handleSelectZone}
                  onPointerMissed={handlePointerMissed}
                  onReady={({ invalidate }) => {
                    invalidateRef.current = invalidate
                  }}
                />
              </SceneBoundary>
            ) : (
              <div className="prototype-stage__message" role="status">
                WebGL is unavailable in this browser, so the figure cannot be displayed.
              </div>
            )}
            <span className="prototype-stage__drag-hint" aria-hidden="true">
              Drag · rotate
            </span>
          </div>
        </section>

        <aside className="prototype-panel" aria-label="Figure controls">
          <div className="prototype-view-controls" role="group" aria-label="Preset views">
            <button type="button" onClick={() => setView(0)}>
              Front
            </button>
            <button type="button" onClick={() => setView(Math.PI)}>
              Back
            </button>
            <button type="button" onClick={() => setView(RESET_VIEW.yaw)}>
              Reset
            </button>
          </div>

          <h2>Muscle zones</h2>
          <ul className="prototype-zone-list">
            {MUSCLE_ZONES.map((zone) => (
              <li key={zone.id}>
                <button
                  type="button"
                  data-zone={zone.id}
                  aria-pressed={selectedZone === zone.id}
                  className={hoveredZone === zone.id ? 'is-hovered' : undefined}
                  onMouseEnter={() => handleLegendHover(zone.id)}
                  onMouseLeave={(event) => handleLegendLeave(zone.id, event)}
                  onFocus={() => handleLegendHover(zone.id)}
                  onBlur={() => setHoveredZone((current) => (current === zone.id ? null : current))}
                  onClick={() => handleSelectZone(zone.id)}
                >
                  <span className="prototype-zone-list__swatch" aria-hidden="true" />
                  {zone.label}
                </button>
              </li>
            ))}
          </ul>

          <p className="prototype-status" aria-live="polite">
            {statusText}
          </p>

          <p className="prototype-meta">
            Reduced motion: {reducedMotion ? 'on' : 'off'} · WebGL:{' '}
            {webglAvailable ? 'available' : 'unavailable'}
          </p>
          <p className="prototype-footnote">
            Prototype only. The figure renders on demand, uses no shadows or post-processing, and
            does not read workout history.
          </p>
        </aside>
      </main>
    </div>
  )
}

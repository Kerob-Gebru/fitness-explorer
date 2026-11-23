import { lazy, Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import FocusFigureFallback from './FocusFigureFallback.jsx'
import FocusFigureLegend from './FocusFigureLegend.jsx'
import { FOCUS_ZONES } from './focusFigureData.js'
import { formatDateKey } from '../workout/workoutCalendar.js'
import { useTheme } from '../theme/themeContext.js'
import SceneBoundary from './prototype/SceneBoundary.jsx'
import {
  CAMERA_BEATS,
  ZONE_METADATA,
  clamp01,
  getActiveScrollBeat,
  getZoneCameraPose,
  smoothstep,
} from './studioTimeline.js'
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

export default function FocusFigure({
  data,
  onExploreZone,
  leadContent = null,
}) {
  const { theme } = useTheme()
  const titleId = useId()
  const [webglAvailable] = useState(supportsWebGL)
  const [sceneReady, setSceneReady] = useState(false)
  const [sceneFailed, setSceneFailed] = useState(false)
  const [selectedZone, setSelectedZone] = useState(null)
  const [scrollBeatZone, setScrollBeatZone] = useState(null)
  const [hoveredZone, setHoveredZone] = useState(null)
  const [view, setView] = useState('front')
  const [viewNonce, setViewNonce] = useState(0)
  const [compact, setCompact] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 900 : false
  ))
  const [reducedMotion, setReducedMotion] = useState(() => (
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  ))

  const cinemaRef = useRef(null)
  const cinemaControlsRef = useRef(null)
  const heroOverlayRef = useRef(null)
  const outroOverlayRef = useRef(null)
  const railFillRef = useRef(null)
  const selectedZoneRef = useRef(selectedZone)
  const lastScrollBeatRef = useRef(null)

  const registerCinemaControls = useCallback((controls) => {
    cinemaControlsRef.current = controls
  }, [])

  useEffect(() => {
    selectedZoneRef.current = selectedZone
  }, [selectedZone])

  const themeName = theme === 'light' ? 'light' : 'dark'
  const use3D = webglAvailable && !sceneFailed
  const cinemaEnabled = use3D && !reducedMotion

  const displayZoneId = selectedZone ?? scrollBeatZone
  const activeCardZone = FOCUS_ZONES.find((zone) => zone.id === displayZoneId) ?? null
  const illuminatedZone = selectedZone ?? hoveredZone ?? scrollBeatZone ?? null
  const activeMeta = activeCardZone ? ZONE_METADATA[activeCardZone.id] : null
  const activeCardSide = activeCardZone
    ? (getZoneCameraPose(activeCardZone.id, { compact })?.side ?? 'right')
    : 'right'
  const activeCount = activeCardZone ? (data.counts[activeCardZone.id] ?? 0) : 0
  const volumeShare = activeCardZone && data.mappedExercises > 0
    ? Math.round((activeCount / data.mappedExercises) * 100)
    : 0

  const weekLabel = `${formatDateKey(data.weekStartKey, { month: 'short', day: 'numeric' })} – ${formatDateKey(data.weekEndKey, { month: 'short', day: 'numeric' })}`
  const countSummary = useMemo(
    () => FOCUS_ZONES.map((zone) => `${zone.label}: ${data.counts[zone.id] ?? 0}`).join(', '),
    [data.counts],
  )
  const statusText = activeCardZone
    ? `${activeCardZone.label}: ${activeCount} completed ${activeCount === 1 ? 'exercise' : 'exercises'} this week.`
    : data.completedExercises === 0
      ? 'No completed exercises logged this week yet.'
      : `${data.mappedExercises} mapped ${data.mappedExercises === 1 ? 'exercise' : 'exercises'} logged this week.`

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const handleResize = () => setCompact(window.innerWidth <= 900)
    const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const handleMotion = () => setReducedMotion(Boolean(motionQuery?.matches))

    window.addEventListener('resize', handleResize, { passive: true })
    motionQuery?.addEventListener?.('change', handleMotion)

    return () => {
      window.removeEventListener('resize', handleResize)
      motionQuery?.removeEventListener?.('change', handleMotion)
    }
  }, [])

  useEffect(() => {
    if (!webglAvailable || sceneReady || sceneFailed) return undefined

    const timer = window.setTimeout(() => {
      setSceneFailed(true)
      setView('front')
      setHoveredZone(null)
    }, SCENE_LOAD_TIMEOUT_MS)

    return () => window.clearTimeout(timer)
  }, [webglAvailable, sceneReady, sceneFailed])

  // Continuous 60fps scroll choreography inside the sticky theater (zero per-frame React renders).
  useEffect(() => {
    if (!cinemaEnabled || !cinemaRef.current) {
      if (heroOverlayRef.current) {
        heroOverlayRef.current.style.opacity = '1'
        heroOverlayRef.current.style.filter = 'none'
        heroOverlayRef.current.style.transform = 'none'
        heroOverlayRef.current.style.pointerEvents = 'auto'
      }
      if (outroOverlayRef.current) {
        outroOverlayRef.current.style.opacity = '0'
      }
      return undefined
    }

    let rafId = 0
    let smoothU = 0
    let lastRawU = -1
    let settleFrames = 0

    const readProgress = () => {
      const el = cinemaRef.current
      if (!el) return 0
      const rect = el.getBoundingClientRect()
      const headerHeight = window.innerWidth <= 760 ? 58 : 64
      const viewportSpan = Math.max(1, window.innerHeight - headerHeight)
      const scrollable = Math.max(1, rect.height - viewportSpan)
      return clamp01((headerHeight - rect.top) / scrollable)
    }

    const applyVisualProgress = (u) => {
      // 1. Update right-edge ChapterRail safety orange progress bar
      if (railFillRef.current) {
        railFillRef.current.style.transform = `scaleY(${Math.max(0.03, u)})`
      }

      // 2. Hero opening copy: calm wide arrival -> smooth blur + drift out
      if (heroOverlayRef.current) {
        const heroOut = smoothstep(0.03, 0.145, u)
        const opacity = clamp01(1 - heroOut)
        heroOverlayRef.current.style.opacity = opacity.toFixed(3)
        heroOverlayRef.current.style.filter = heroOut > 0.01 ? `blur(${(heroOut * 9).toFixed(2)}px)` : 'none'
        heroOverlayRef.current.style.transform = `translate3d(0, ${(-heroOut * 28).toFixed(2)}px, 0)`
        heroOverlayRef.current.style.pointerEvents = opacity > 0.25 ? 'auto' : 'none'
      }

      // 3. Closing wide-shot outro caption
      if (outroOverlayRef.current) {
        const outroIn = smoothstep(0.90, 0.96, u)
        outroOverlayRef.current.style.opacity = outroIn.toFixed(3)
        outroOverlayRef.current.style.transform = `translate3d(0, ${((1 - outroIn) * 20).toFixed(2)}px, 0)`
      }

      // 4. Push continuous camera pose to WebGL scene
      cinemaControlsRef.current?.setScrollProgress(u, {
        pinnedZone: selectedZoneRef.current,
        isCompact: window.innerWidth <= 900,
      })

      // 5. Notify React only when entering/exiting a muscle beat window
      const beat = getActiveScrollBeat(u)
      const nextBeatZone = beat?.zoneId ?? null
      if (lastScrollBeatRef.current !== nextBeatZone) {
        if (selectedZoneRef.current && nextBeatZone && nextBeatZone !== selectedZoneRef.current) {
          setSelectedZone(null)
        }
        lastScrollBeatRef.current = nextBeatZone
        setScrollBeatZone(nextBeatZone)
      }
    }

    const tick = () => {
      const rawU = readProgress()
      const delta = rawU - smoothU
      if (Math.abs(delta) > 0.0006) {
        smoothU += delta * 0.22
        settleFrames = 8
      } else {
        smoothU = rawU
        settleFrames -= 1
      }

      applyVisualProgress(smoothU)

      if (Math.abs(rawU - lastRawU) > 0.0005 || settleFrames > 0) {
        lastRawU = rawU
        rafId = window.requestAnimationFrame(tick)
      } else {
        rafId = 0
      }
    }

    const scheduleTick = () => {
      if (!rafId) rafId = window.requestAnimationFrame(tick)
    }

    smoothU = readProgress()
    applyVisualProgress(smoothU)

    window.addEventListener('scroll', scheduleTick, { passive: true })
    window.addEventListener('resize', scheduleTick, { passive: true })

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', scheduleTick)
      window.removeEventListener('resize', scheduleTick)
    }
  }, [cinemaEnabled, sceneReady])

  function applyView(nextView) {
    if (nextView === 'reset') {
      setSelectedZone(null)
    }
    setView(nextView)
    setViewNonce((current) => current + 1)
  }

  function handleSelectZone(zoneId) {
    if (selectedZone === zoneId) {
      setSelectedZone(null)
      return
    }

    setSelectedZone(zoneId)
    if (zoneId === 'back') setView('back')
    else if (zoneId === 'chest' || zoneId === 'core') setView('front')
  }

  function handleRailSelect(zoneId) {
    if (cinemaEnabled && cinemaRef.current) {
      const targetBeat = CAMERA_BEATS.find((beat) => beat.zoneId === zoneId)
      if (targetBeat) {
        const rect = cinemaRef.current.getBoundingClientRect()
        const headerHeight = window.innerWidth <= 760 ? 58 : 64
        const viewportSpan = Math.max(1, window.innerHeight - headerHeight)
        const scrollable = Math.max(1, rect.height - viewportSpan)
        const sectionTop = window.scrollY + rect.top - headerHeight
        const targetScrollY = sectionTop + scrollable * targetBeat.scrollTarget
        setSelectedZone(null)
        window.scrollTo({ top: targetScrollY, behavior: 'smooth' })
        return
      }
    }

    handleSelectZone(zoneId)
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
    <section
      ref={cinemaRef}
      className={`studio-cinema${cinemaEnabled ? ' is-cinema-scroll' : ' is-compact-stage'}`}
      aria-labelledby={leadContent ? 'dashboard-title' : titleId}
    >
      <div className="studio-cinema__sticky">
        {/* Atmospheric full-bleed WebGL stage or crisp SVG fallback */}
        <div className="studio-cinema__stage">
          {use3D ? (
            <SceneBoundary fallback={fallback} onError={handleSceneFailure}>
              <Suspense fallback={fallback}>
                <FocusFigure3D
                  theme={themeName}
                  counts={data.counts}
                  summary={countSummary}
                  view={view}
                  viewNonce={viewNonce}
                  compact={compact}
                  cinemaEnabled={cinemaEnabled}
                  onRegisterControls={registerCinemaControls}
                  hoveredZone={hoveredZone}
                  selectedZone={illuminatedZone}
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
        </div>

        {/* Non-intrusive top HUD bar (Weekly summary + Front/Back/Reset + Skip to overview) */}
        <header className="studio-cinema__topbar">
          <div className="studio-cinema__hud-meta">
            <span className="studio-cinema__eyebrow">THIS WEEK · ANATOMY</span>
            <h2 id={titleId} className="studio-cinema__hud-title">
              Muscle <em>focus</em>
            </h2>
            <span className="studio-cinema__hud-divider" aria-hidden="true">·</span>
            <span className="studio-cinema__hud-range">{weekLabel}</span>
            <span className="studio-cinema__hud-divider" aria-hidden="true">·</span>
            <strong className="studio-cinema__hud-total">
              {data.mappedExercises} {data.mappedExercises === 1 ? 'exercise' : 'exercises'}
            </strong>
          </div>

          <div className="studio-cinema__hud-controls">
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
              {use3D && sceneReady && (
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

            <a className="studio-cinema__skip" href="#dashboard-sheet">
              <span>Overview</span>
              <span aria-hidden="true">↓</span>
            </a>
          </div>
        </header>

        {/* Opening Editorial Hero Copy — blurs & drifts out on scroll */}
        {leadContent && (
          <div ref={heroOverlayRef} className="studio-cinema__hero">
            <div className="studio-cinema__hero-inner">
              {leadContent}
              {cinemaEnabled && (
                <p className="studio-cinema__scroll-cue" aria-hidden="true">
                  <span className="studio-cinema__scroll-dot" />
                  <span>Scroll for 3D anatomical tour</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Alternating Left/Right Slide-In Muscle Beat Card */}
        {activeCardZone && (
          <aside
            key={activeCardZone.id}
            className="studio-cinema__card"
            data-side={activeCardSide}
            aria-live="polite"
            aria-label={`${activeCardZone.label} focus details`}
          >
            <div className="studio-cinema__card-head" data-k style={{ '--k': 0 }}>
              <span className="studio-cinema__card-index">
                N°{activeMeta?.index ?? '01'} / 06
              </span>
              {selectedZone && (
                <button
                  type="button"
                  className="studio-cinema__card-close"
                  aria-label="Clear focused muscle"
                  onClick={() => setSelectedZone(null)}
                >
                  ×
                </button>
              )}
            </div>

            <h3 className="studio-cinema__card-title display" data-k style={{ '--k': 1 }}>
              {activeCardZone.label}
            </h3>

            <p className="studio-cinema__card-sub" data-k style={{ '--k': 2 }}>
              {activeMeta?.subtitle ?? activeMeta?.summary}
            </p>

            <dl className="studio-cinema__card-specs" data-k style={{ '--k': 3 }}>
              <div>
                <dt>This week</dt>
                <dd>{activeCount} {activeCount === 1 ? 'exercise' : 'exercises'}</dd>
              </div>
              <div>
                <dt>Volume share</dt>
                <dd>{volumeShare}%</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd className={activeCount > 0 ? 'is-active' : ''}>
                  {activeCount > 0 ? 'Trained' : 'Ready'}
                </dd>
              </div>
            </dl>

            <div className="studio-cinema__card-actions" data-k style={{ '--k': 4 }}>
              <Link
                className="focus-figure__explore glint"
                to="/explore"
                onClick={() => onExploreZone(activeCardZone)}
              >
                <span className="glint__label">Explore {activeCardZone.label.toLowerCase()}</span>
                <span className="glint__label" aria-hidden="true">↗</span>
              </Link>
            </div>
          </aside>
        )}

        {/* Right-Edge ChapterRail (Safety Orange progress hairline + 01..06 zone ticks) */}
        <nav className="studio-cinema__rail" aria-label="Anatomical 3D tour chapters">
          <div className="studio-cinema__rail-track" aria-hidden="true">
            <span ref={railFillRef} className="studio-cinema__rail-fill" />
          </div>
          <ul className="studio-cinema__rail-ticks">
            {FOCUS_ZONES.map((zone, index) => {
              const isSelected = selectedZone === zone.id
              const isBeat = !selectedZone && scrollBeatZone === zone.id
              const num = String(index + 1).padStart(2, '0')
              return (
                <li key={zone.id}>
                  <button
                    type="button"
                    className={[
                      'studio-cinema__rail-tick',
                      isSelected ? 'is-selected' : '',
                      isBeat ? 'is-beat' : '',
                      (data.counts[zone.id] ?? 0) > 0 ? 'has-activity' : '',
                    ].filter(Boolean).join(' ')}
                    aria-pressed={isSelected}
                    onClick={() => handleRailSelect(zone.id)}
                    onMouseEnter={() => setHoveredZone(zone.id)}
                    onMouseLeave={() => setHoveredZone(null)}
                  >
                    <span className="studio-cinema__rail-label">{zone.label}</span>
                    <span className="studio-cinema__rail-num">{num}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Closing Wide-Shot Outro Caption */}
        {cinemaEnabled && (
          <div ref={outroOverlayRef} className="studio-cinema__outro" aria-hidden="true">
            <p className="studio-cinema__outro-eyebrow">WEEKLY TRAINING MAP</p>
            <p className="studio-cinema__outro-title display">
              Every session shapes the <em>silhouette.</em>
            </p>
          </div>
        )}

        {/* Bottom Dock: 6-Zone Weekly Distribution Strip & Live Status */}
        <div className="studio-cinema__dock">
          <p className="focus-figure__status visually-hidden" role="status" aria-live="polite">
            {statusText}
          </p>
          <FocusFigureLegend
            counts={data.counts}
            selectedZone={selectedZone}
            activeBeatZone={scrollBeatZone}
            hoveredZone={hoveredZone}
            onSelectZone={handleSelectZone}
            onHoverZone={setHoveredZone}
          />
        </div>
      </div>
    </section>
  )
}

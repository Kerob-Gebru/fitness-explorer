import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import Mannequin from './prototype/Mannequin.jsx'
import { FIGURE_THEMES } from './prototype/mannequinMaterials.js'
import {
  getDefaultWidePose,
  getZoneCameraPose,
  sampleCinemaPose,
  shortestAngleDiff,
} from './studioTimeline.js'
import './focusFigure3d.css'

const YAW_SPEED = 0.0085
const PITCH_SPEED = 0.0042
const PITCH_LIMIT = 0.36
const CLICK_SLOP = 6

const VIEW_PRESETS = {
  front: { yaw: 0, pitch: 0.02 },
  back: { yaw: Math.PI, pitch: 0.02 },
  reset: { yaw: -0.36, pitch: 0.03 },
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function detectSoftwareWebGL() {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (!gl) return false
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return /swiftshader|llvmpipe|software|mesa offscreen/i.test(String(renderer || ''))
  } catch {
    return false
  }
}

function createContactShadowTexture() {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const gradient = ctx.createRadialGradient(128, 128, 6, 128, 128, 124)
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.44)')
  gradient.addColorStop(0.45, 'rgba(0, 0, 0, 0.16)')
  gradient.addColorStop(0.8, 'rgba(0, 0, 0, 0.04)')
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

function StudioFloor({ palette, isSoftwareGl }) {
  const shadowTexture = useMemo(() => createContactShadowTexture(), [])

  useEffect(() => () => {
    shadowTexture?.dispose()
  }, [shadowTexture])

  return (
    <group position={[0, -1.358, 0]}>
      {shadowTexture && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
          <planeGeometry args={[1.8, 1.25]} />
          <meshBasicMaterial
            map={shadowTexture}
            transparent
            opacity={palette === FIGURE_THEMES.light ? 0.34 : 0.76}
            depthWrite={false}
          />
        </mesh>
      )}

      {!isSoftwareGl && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.002, 0]}>
          <planeGeometry args={[4.4, 4.4]} />
          <shadowMaterial transparent opacity={palette === FIGURE_THEMES.light ? 0.12 : 0.26} />
        </mesh>
      )}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <ringGeometry args={[0.66, 0.676, 72]} />
        <meshBasicMaterial
          color={palette.pedestalRing}
          transparent
          opacity={palette === FIGURE_THEMES.light ? 0.45 : 0.58}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, -Math.PI * 0.72]} position={[0, 0.004, 0]}>
        <ringGeometry args={[0.662, 0.676, 48, 1, 0, Math.PI * 0.46]} />
        <meshBasicMaterial
          color={palette.pedestalAccent}
          transparent
          opacity={palette === FIGURE_THEMES.light ? 0.48 : 0.75}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

function SceneContent({
  palette,
  counts,
  view,
  viewNonce,
  compact,
  centered,
  cinemaEnabled,
  mannequinRef,
  cameraGoalRef,
  manualDragRef,
  scrollProgressRef,
  invalidateRef,
  hoveredZone,
  selectedZone,
  cameraZone,
  isSoftwareGl,
  onHoverZone,
  onSelectZone,
  onFailure,
}) {
  const { gl, scene, camera, invalidate } = useThree()
  const currentTargetRef = useRef(new THREE.Vector3(0, 0.145, 0))
  const tempPosRef = useRef(new THREE.Vector3())
  const tempTargetRef = useRef(new THREE.Vector3())
  const lastViewNonceRef = useRef(viewNonce)

  useEffect(() => {
    invalidateRef.current = invalidate
    return () => {
      if (invalidateRef.current === invalidate) invalidateRef.current = null
    }
  }, [invalidate, invalidateRef])

  useEffect(() => {
    const canvas = gl.domElement
    const handleContextLost = () => onFailure()
    canvas.addEventListener('webglcontextlost', handleContextLost, false)
    return () => canvas.removeEventListener('webglcontextlost', handleContextLost, false)
  }, [gl, onFailure])

  const envRenderTarget = useMemo(() => {
    const pmremGenerator = new THREE.PMREMGenerator(gl)
    const environment = new RoomEnvironment()
    const renderTarget = pmremGenerator.fromScene(environment, 0.04)
    environment.dispose()
    pmremGenerator.dispose()
    return renderTarget
  }, [gl])

  useEffect(() => {
    invalidate()
    return () => {
      envRenderTarget.dispose()
    }
  }, [envRenderTarget, invalidate])

  // Sync camera goal whenever selectedZone, explicit view buttons, or compact mode changes.
  useEffect(() => {
    const viewChanged = lastViewNonceRef.current !== viewNonce
    lastViewNonceRef.current = viewNonce

    const reducedMotion = typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    let nextPose = null
    let animateFigureRotation = true

    if (viewChanged && VIEW_PRESETS[view]) {
      const wide = getDefaultWidePose({ compact, centered })
      nextPose = {
        ...wide,
        yaw: VIEW_PRESETS[view].yaw,
        pitch: VIEW_PRESETS[view].pitch,
      }
      manualDragRef.current = false
    } else if (cameraZone) {
      const zonePreset = getZoneCameraPose(cameraZone, { compact, centered })
      if (zonePreset) {
        nextPose = zonePreset.pose
        manualDragRef.current = false
      }
    } else if (cinemaEnabled) {
      nextPose = sampleCinemaPose(scrollProgressRef.current, { compact })
      animateFigureRotation = !manualDragRef.current
    } else {
      const wide = getDefaultWidePose({ compact, centered })
      const preset = VIEW_PRESETS[view] ?? VIEW_PRESETS.reset
      nextPose = {
        ...wide,
        yaw: preset.yaw,
        pitch: preset.pitch,
      }
      animateFigureRotation = viewChanged || viewNonce === 0 || centered
    }

    if (!nextPose) return

    cameraGoalRef.current = {
      ...nextPose,
      animateFigureRotation,
    }

    if (reducedMotion || (viewNonce === 0 && !cameraZone && scrollProgressRef.current === 0 && cameraGoalRef.current)) {
      if (reducedMotion) {
        camera.position.set(...nextPose.pos)
        currentTargetRef.current.set(...nextPose.target)
        camera.lookAt(currentTargetRef.current)
        if (mannequinRef.current && animateFigureRotation) {
          mannequinRef.current.rotation.set(nextPose.pitch, nextPose.yaw, 0)
        }
        cameraGoalRef.current = null
      }
    }

    invalidate()
  }, [
    view,
    viewNonce,
    cameraZone,
    compact,
    centered,
    cinemaEnabled,
    camera,
    cameraGoalRef,
    mannequinRef,
    manualDragRef,
    scrollProgressRef,
    invalidate,
  ])

  useFrame((_, delta) => {
    const goal = cameraGoalRef.current
    const figure = mannequinRef.current
    if (!goal || !figure) return

    const step = 1 - Math.exp(-8.5 * Math.min(delta, 0.05))
    tempPosRef.current.set(...goal.pos)
    tempTargetRef.current.set(...goal.target)

    camera.position.lerp(tempPosRef.current, step)
    currentTargetRef.current.lerp(tempTargetRef.current, step)
    camera.lookAt(currentTargetRef.current)

    let rotDone = true
    if (goal.animateFigureRotation && !manualDragRef.current) {
      const dx = goal.pitch - figure.rotation.x
      const dy = shortestAngleDiff(figure.rotation.y, goal.yaw)
      if (Math.abs(dx) > 0.0012 || Math.abs(dy) > 0.0012) {
        figure.rotation.x += dx * step
        figure.rotation.y += dy * step
        rotDone = false
      } else {
        figure.rotation.set(goal.pitch, goal.yaw, 0)
      }
    }

    const posDist = camera.position.distanceToSquared(tempPosRef.current)
    const targetDist = currentTargetRef.current.distanceToSquared(tempTargetRef.current)

    if (posDist < 0.00001 && targetDist < 0.00001 && rotDone) {
      camera.position.copy(tempPosRef.current)
      currentTargetRef.current.copy(tempTargetRef.current)
      camera.lookAt(currentTargetRef.current)
      cameraGoalRef.current = null
      return
    }

    invalidate()
  })

  useEffect(() => {
    invalidate()
  }, [palette, counts, hoveredZone, selectedZone, invalidate])

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined

    const api = {
      getStats: () => ({
        frames: gl.info.render.frame,
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
      }),
      getRotation: () =>
        mannequinRef.current
          ? { x: mannequinRef.current.rotation.x, y: mannequinRef.current.rotation.y }
          : null,
      getCamera: () => ({
        position: camera.position.toArray(),
        target: currentTargetRef.current.toArray(),
      }),
      getZoneColor: (zone) => {
        let color = null
        scene.traverse((object) => {
          if (color || object.name !== `zone-${zone}`) return
          object.traverse((child) => {
            if (!color && child.material?.color) color = `#${child.material.color.getHexString()}`
          })
        })
        return color
      },
      loseContext: () => gl.getContext().getExtension('WEBGL_lose_context')?.loseContext(),
    }

    window.__FOCUS_FIGURE_3D__ = api

    return () => {
      if (window.__FOCUS_FIGURE_3D__ === api) {
        delete window.__FOCUS_FIGURE_3D__
      }
    }
  }, [camera, gl, mannequinRef, scene])

  return (
    <>
      <primitive object={envRenderTarget.texture} attach="environment" />
      <hemisphereLight
        color={palette.fill}
        groundColor={palette.bodySecondary}
        intensity={palette.ambientIntensity}
      />
      <directionalLight
        color={palette.key}
        intensity={palette.keyIntensity}
        position={[3.4, 4.6, 4.4]}
        castShadow={!isSoftwareGl}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={12}
        shadow-camera-left={-2}
        shadow-camera-right={2}
        shadow-camera-top={2.3}
        shadow-camera-bottom={-2.3}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight
        color={palette.fill}
        intensity={palette.fillIntensity}
        position={[-4.2, 2.0, 2.6]}
      />
      <directionalLight
        color={palette.rim}
        intensity={palette.rimIntensity}
        position={[-2.4, 2.8, -4.2]}
      />
      <directionalLight
        color={palette.rim}
        intensity={palette.rimIntensity * 0.36}
        position={[2.6, 2.1, -3.8]}
      />

      <Mannequin
        mannequinRef={mannequinRef}
        palette={palette}
        counts={counts}
        hoveredZone={hoveredZone}
        selectedZone={selectedZone}
        onHoverZone={onHoverZone}
        onSelectZone={onSelectZone}
      />

      <StudioFloor palette={palette} isSoftwareGl={isSoftwareGl} />
    </>
  )
}

export default function FocusFigure3D({
  theme = 'dark',
  counts = null,
  summary = '',
  view = 'front',
  viewNonce = 0,
  compact = false,
  centered = false,
  cinemaEnabled = true,
  onRegisterControls = null,
  hoveredZone,
  selectedZone,
  cameraFocusZone = undefined,
  onHoverZone,
  onSelectZone,
  onClearSelection,
  onDragStart,
  onReady,
  onFailure,
}) {
  const palette = FIGURE_THEMES[theme] ?? FIGURE_THEMES.dark
  const cameraZone = cameraFocusZone !== undefined ? cameraFocusZone : selectedZone
  const [isSoftwareGl] = useState(detectSoftwareWebGL)
  const mannequinRef = useRef(null)
  const cameraGoalRef = useRef(null)
  const manualDragRef = useRef(false)
  const scrollProgressRef = useRef(0)
  const invalidateRef = useRef(null)
  const dragRef = useRef(null)
  const dragDistanceRef = useRef(0)
  const [isDragging, setIsDragging] = useState(false)

  // Expose imperative scroll-driven camera updater so 60fps scroll choreography
  // updates the Three.js camera goal without triggering React tree re-renders.
  useEffect(() => {
    if (!onRegisterControls) return undefined

    onRegisterControls({
      setScrollProgress(u, { pinnedZone = null, isCompact = compact } = {}) {
        scrollProgressRef.current = u
        if (pinnedZone) return
        const pose = sampleCinemaPose(u, { compact: isCompact })
        cameraGoalRef.current = {
          ...pose,
          animateFigureRotation: !manualDragRef.current,
        }
        invalidateRef.current?.()
      },
      snapToProgress(u, { isCompact = compact } = {}) {
        scrollProgressRef.current = u
        manualDragRef.current = false
        const pose = sampleCinemaPose(u, { compact: isCompact })
        cameraGoalRef.current = {
          ...pose,
          animateFigureRotation: true,
        }
        invalidateRef.current?.()
      },
    })

    return () => {
      onRegisterControls(null)
    }
  }, [onRegisterControls, compact])

  useEffect(() => () => {
    invalidateRef.current = null
  }, [])

  function handlePointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    dragDistanceRef.current = 0
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
    dragDistanceRef.current += Math.abs(deltaX) + Math.abs(deltaY)

    const figure = mannequinRef.current
    figure.rotation.y += deltaX * YAW_SPEED
    figure.rotation.x = clamp(figure.rotation.x + deltaY * PITCH_SPEED, -PITCH_LIMIT, PITCH_LIMIT)
    manualDragRef.current = true
    if (cameraGoalRef.current) {
      cameraGoalRef.current.animateFigureRotation = false
    }
    invalidateRef.current?.()

    if (!drag.captured && dragDistanceRef.current > CLICK_SLOP) {
      drag.captured = true
      onDragStart?.()
      if (event.pointerType !== 'touch') {
        try {
          event.currentTarget.setPointerCapture?.(event.pointerId)
        } catch {
          // The pointer is no longer active.
        }
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
      // Capture is already released.
    }
  }

  function handlePointerLeave() {
    if (!dragRef.current) onHoverZone?.(null)
  }

  function handleSelectZone(zone) {
    if (dragDistanceRef.current > CLICK_SLOP) return
    manualDragRef.current = false
    onSelectZone(zone)
  }

  function handlePointerMissed() {
    if (dragDistanceRef.current > CLICK_SLOP) {
      dragDistanceRef.current = 0
      return
    }

    onClearSelection?.()
  }

  const viewportClassName = [
    'focus-figure__viewport',
    hoveredZone ? 'is-zone-hovered' : '',
    isDragging ? 'is-dragging' : '',
  ].filter(Boolean).join(' ')

  const initialPose = useMemo(() => {
    if (cinemaEnabled) return sampleCinemaPose(0, { compact })
    if (cameraZone) return getZoneCameraPose(cameraZone, { compact, centered })?.pose ?? getDefaultWidePose({ compact, centered })
    return getDefaultWidePose({ compact, centered })
  }, [cinemaEnabled, compact, centered, cameraZone])

  return (
    <div
      className={viewportClassName}
      role="img"
      aria-label={summary
        ? `Interactive 3D anatomical figure you can drag to rotate. Completed exercises this week — ${summary}.`
        : 'Interactive 3D anatomical figure you can drag to rotate.'}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onLostPointerCapture={handlePointerEnd}
      onPointerLeave={handlePointerLeave}
    >
      <Canvas
        className="focus-figure__canvas"
        style={{ position: 'absolute', inset: 0 }}
        frameloop="demand"
        shadows={!isSoftwareGl}
        dpr={isSoftwareGl ? 1 : [1, 1.75]}
        camera={{ position: initialPose.pos, fov: 26, near: 0.1, far: 24 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl, camera, invalidate }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.04
          camera.lookAt(...initialPose.target)
          invalidateRef.current = invalidate
          invalidate()
          onReady?.()
        }}
        onPointerMissed={handlePointerMissed}
      >
        <SceneContent
          palette={palette}
          counts={counts}
          view={view}
          viewNonce={viewNonce}
          compact={compact}
          centered={centered}
          cinemaEnabled={cinemaEnabled}
          mannequinRef={mannequinRef}
          cameraGoalRef={cameraGoalRef}
          manualDragRef={manualDragRef}
          scrollProgressRef={scrollProgressRef}
          invalidateRef={invalidateRef}
          hoveredZone={hoveredZone}
          selectedZone={selectedZone}
          cameraZone={cameraZone}
          isSoftwareGl={isSoftwareGl}
          onHoverZone={onHoverZone}
          onSelectZone={handleSelectZone}
          onFailure={onFailure}
        />
      </Canvas>

      <span className="focus-figure__drag-hint" aria-hidden="true">Drag 3D body to orbit</span>
    </div>
  )
}

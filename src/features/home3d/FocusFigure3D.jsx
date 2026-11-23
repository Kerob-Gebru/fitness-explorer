import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import Mannequin from './prototype/Mannequin.jsx'
import { FIGURE_THEMES } from './prototype/mannequinMaterials.js'
import './focusFigure3d.css'

const YAW_SPEED = 0.008
const PITCH_SPEED = 0.004
const PITCH_LIMIT = 0.34
const CLICK_SLOP = 6

const VIEW_PRESETS = {
  front: { yaw: 0, pitch: 0.04 },
  back: { yaw: Math.PI, pitch: 0.04 },
  reset: { yaw: -0.42, pitch: 0.04 },
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function shortestAngleDiff(current, target) {
  let diff = (target - current) % (Math.PI * 2)
  if (diff > Math.PI) diff -= Math.PI * 2
  if (diff < -Math.PI) diff += Math.PI * 2
  return diff
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

  const gradient = ctx.createRadialGradient(128, 128, 10, 128, 128, 124)
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.56)')
  gradient.addColorStop(0.42, 'rgba(0, 0, 0, 0.24)')
  gradient.addColorStop(0.78, 'rgba(0, 0, 0, 0.05)')
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
    <group position={[0, -1.356, 0]}>
      {shadowTexture && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
          <planeGeometry args={[2.1, 1.5]} />
          <meshBasicMaterial
            map={shadowTexture}
            transparent
            opacity={palette === FIGURE_THEMES.light ? 0.42 : 0.88}
            depthWrite={false}
          />
        </mesh>
      )}

      {!isSoftwareGl && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.002, 0]}>
          <planeGeometry args={[4.5, 4.5]} />
          <shadowMaterial transparent opacity={palette === FIGURE_THEMES.light ? 0.16 : 0.34} />
        </mesh>
      )}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <ringGeometry args={[0.74, 0.76, 64]} />
        <meshBasicMaterial
          color={palette.pedestalRing}
          transparent
          opacity={palette === FIGURE_THEMES.light ? 0.55 : 0.65}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, -Math.PI * 0.72]} position={[0, 0.004, 0]}>
        <ringGeometry args={[0.742, 0.758, 40, 1, 0, Math.PI * 0.44]} />
        <meshBasicMaterial
          color={palette.pedestalAccent}
          transparent
          opacity={palette === FIGURE_THEMES.light ? 0.48 : 0.72}
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
  mannequinRef,
  targetRotationRef,
  hoveredZone,
  selectedZone,
  isSoftwareGl,
  onHoverZone,
  onSelectZone,
  onFailure,
}) {
  const { gl, scene, invalidate } = useThree()

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

  useEffect(() => {
    const preset = VIEW_PRESETS[view]
    if (!preset || !mannequinRef.current) return

    const reducedMotion = typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    if (reducedMotion || viewNonce === 0) {
      targetRotationRef.current = null
      mannequinRef.current.rotation.set(preset.pitch, preset.yaw, 0)
      invalidate()
      return
    }

    targetRotationRef.current = { x: preset.pitch, y: preset.yaw }
    invalidate()
  }, [view, viewNonce, mannequinRef, targetRotationRef, invalidate])

  useFrame((_, delta) => {
    const target = targetRotationRef.current
    const figure = mannequinRef.current
    if (!target || !figure) return

    const step = 1 - Math.exp(-10 * Math.min(delta, 0.05))
    const dx = target.x - figure.rotation.x
    const dy = shortestAngleDiff(figure.rotation.y, target.y)

    if (Math.abs(dx) < 0.0015 && Math.abs(dy) < 0.0015) {
      figure.rotation.set(target.x, target.y, 0)
      targetRotationRef.current = null
      return
    }

    figure.rotation.x += dx * step
    figure.rotation.y += dy * step
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
  }, [gl, mannequinRef, scene])

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
        position={[3.2, 4.4, 4.2]}
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
        position={[-4.0, 1.8, 2.2]}
      />
      <directionalLight
        color={palette.rim}
        intensity={palette.rimIntensity}
        position={[-2.2, 2.6, -4.0]}
      />
      <directionalLight
        color={palette.rim}
        intensity={palette.rimIntensity * 0.45}
        position={[2.4, 2.0, -3.6]}
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
  hoveredZone,
  selectedZone,
  onHoverZone,
  onSelectZone,
  onClearSelection,
  onDragStart,
  onReady,
  onFailure,
}) {
  const palette = FIGURE_THEMES[theme] ?? FIGURE_THEMES.dark
  const [isSoftwareGl] = useState(detectSoftwareWebGL)
  const mannequinRef = useRef(null)
  const targetRotationRef = useRef(null)
  const invalidateRef = useRef(null)
  const dragRef = useRef(null)
  const dragDistanceRef = useRef(0)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => () => {
    invalidateRef.current = null
  }, [])

  function handlePointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    targetRotationRef.current = null
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
        camera={{ position: [0, 0.14, 6.15], fov: 31, near: 0.1, far: 24 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl, invalidate }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.05
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
          mannequinRef={mannequinRef}
          targetRotationRef={targetRotationRef}
          hoveredZone={hoveredZone}
          selectedZone={selectedZone}
          isSoftwareGl={isSoftwareGl}
          onHoverZone={onHoverZone}
          onSelectZone={handleSelectZone}
          onFailure={onFailure}
        />
      </Canvas>

      <span className="focus-figure__drag-hint" aria-hidden="true">Drag to rotate 360°</span>
    </div>
  )
}

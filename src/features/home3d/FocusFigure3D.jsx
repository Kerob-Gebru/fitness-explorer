import { useEffect, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import Mannequin from './prototype/Mannequin.jsx'
import { FIGURE_THEMES } from './prototype/mannequinMaterials.js'
import './focusFigure3d.css'

const YAW_SPEED = 0.008
const PITCH_SPEED = 0.004
const PITCH_LIMIT = 0.34
const CLICK_SLOP = 6

const VIEW_PRESETS = {
  front: { yaw: 0, pitch: 0.05 },
  back: { yaw: Math.PI, pitch: 0.05 },
  reset: { yaw: -0.42, pitch: 0.05 },
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function SceneContent({
  palette,
  counts,
  view,
  viewNonce,
  mannequinRef,
  hoveredZone,
  selectedZone,
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

  useEffect(() => {
    const preset = VIEW_PRESETS[view]
    if (!preset || !mannequinRef.current) return
    mannequinRef.current.rotation.set(preset.pitch, preset.yaw, 0)
    invalidate()
  }, [view, viewNonce, mannequinRef, invalidate])

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
      <ambientLight color={palette.ambient} intensity={palette.ambientIntensity} />
      <directionalLight
        color={palette.key}
        intensity={palette.keyIntensity}
        position={[3, 4.5, 4]}
      />
      <directionalLight
        color={palette.fill}
        intensity={palette.fillIntensity}
        position={[-4, 1.5, 2]}
      />
      <directionalLight
        color={palette.rim}
        intensity={palette.rimIntensity}
        position={[0.5, 3, -5]}
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
  const mannequinRef = useRef(null)
  const invalidateRef = useRef(null)
  const dragRef = useRef(null)
  const dragDistanceRef = useRef(0)
  const [isDragging, setIsDragging] = useState(false)

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
    invalidateRef.current?.()

    if (!drag.captured && dragDistanceRef.current > CLICK_SLOP) {
      drag.captured = true
      onDragStart?.()
      // Touch pointers are already implicitly captured by the canvas; moving
      // that capture to an ancestor fires a bubbling lostpointercapture that
      // would end the drag after the first move.
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
        ? `Interactive 3D mannequin you can drag to rotate. Completed exercises this week — ${summary}.`
        : 'Interactive 3D mannequin you can drag to rotate.'}
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
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.18, 5.9], fov: 32, near: 0.1, far: 20 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl, invalidate }) => {
          gl.toneMapping = THREE.NeutralToneMapping
          gl.toneMappingExposure = 1
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
          hoveredZone={hoveredZone}
          selectedZone={selectedZone}
          onHoverZone={onHoverZone}
          onSelectZone={handleSelectZone}
          onFailure={onFailure}
        />
      </Canvas>

      <span className="focus-figure__drag-hint" aria-hidden="true">Drag · rotate</span>
    </div>
  )
}

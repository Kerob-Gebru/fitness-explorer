import { useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import Mannequin from './Mannequin.jsx'

const CAPTURE_BACKGROUNDS = {
  dark: '#12161c',
  light: '#eef1f5',
}

function SceneContent({
  theme,
  palette,
  initialYaw,
  mannequinRef,
  hoveredZone,
  selectedZone,
  onHoverZone,
  onSelectZone,
}) {
  const { gl, scene, camera, invalidate } = useThree()

  useEffect(() => {
    if (mannequinRef.current) {
      mannequinRef.current.rotation.set(0.05, initialYaw, 0)
      invalidate()
    }
  }, [initialYaw, mannequinRef, invalidate])

  useEffect(() => {
    invalidate()
  }, [palette, invalidate])

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined

    // QA bridge: the in-app browser cannot always screenshot WebGL, so the
    // prototype exposes a dev-only renderer for readback and stats.
    const api = {
      getFrameCount: () => gl.info.render.frame,
      getTriangles: () => gl.info.render.triangles,
      getDrawCalls: () => gl.info.render.calls,
      getRotation: () =>
        mannequinRef.current
          ? { x: mannequinRef.current.rotation.x, y: mannequinRef.current.rotation.y }
          : null,
      setView: (yaw, pitch = 0.05) => {
        if (!mannequinRef.current) return
        mannequinRef.current.rotation.set(pitch, yaw, 0)
        invalidate()
      },
      capture: (size = 640) => {
        if (!mannequinRef.current) return null

        const previousSize = gl.getSize(new THREE.Vector2())
        const previousAspect = camera.aspect

        gl.setSize(size, size, false)
        camera.aspect = 1
        camera.updateProjectionMatrix()
        gl.render(scene, camera)

        const target = document.createElement('canvas')
        target.width = size
        target.height = size
        const context = target.getContext('2d')
        context.fillStyle = CAPTURE_BACKGROUNDS[theme] ?? CAPTURE_BACKGROUNDS.dark
        context.fillRect(0, 0, size, size)
        context.drawImage(gl.domElement, 0, 0, size, size)
        const dataUrl = target.toDataURL('image/jpeg', 0.9)

        gl.setSize(previousSize.x, previousSize.y, false)
        camera.aspect = previousAspect
        camera.updateProjectionMatrix()
        invalidate()

        return dataUrl
      },
    }

    window.__FOCUS_FIGURE_PROTOTYPE__ = api

    return () => {
      if (window.__FOCUS_FIGURE_PROTOTYPE__ === api) {
        delete window.__FOCUS_FIGURE_PROTOTYPE__
      }
    }
  }, [camera, gl, invalidate, mannequinRef, scene, theme])

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
        hoveredZone={hoveredZone}
        selectedZone={selectedZone}
        onHoverZone={onHoverZone}
        onSelectZone={onSelectZone}
      />
    </>
  )
}

export default function FocusFigureScene({ onReady, onPointerMissed, ...sceneProps }) {
  return (
    <Canvas
      className="prototype-canvas"
      style={{ position: 'absolute', inset: 0 }}
      frameloop="demand"
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.145, 8.15], fov: 26, near: 0.1, far: 22 }}
      gl={{
        antialias: true,
        alpha: true,
        // Only needed so the dev QA capture can read pixels back.
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      }}
      onCreated={({ gl, camera, invalidate }) => {
        gl.toneMapping = THREE.NeutralToneMapping
        gl.toneMappingExposure = 1
        camera.lookAt(0, 0.145, 0)
        onReady?.({ invalidate })
        invalidate()
      }}
      onPointerMissed={onPointerMissed}
    >
      <SceneContent {...sceneProps} />
    </Canvas>
  )
}

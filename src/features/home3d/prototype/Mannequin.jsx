import { getZoneAppearance } from './mannequinMaterials.js'

const SIDES = [1, -1]

function BaseMaterial({ palette, secondary = false }) {
  return (
    <meshStandardMaterial
      color={secondary ? palette.bodySecondary : palette.body}
      roughness={palette.roughness}
      metalness={palette.metalness}
      flatShading
    />
  )
}

function ZoneGroup({ zone, onHoverZone, onSelectZone, children }) {
  return (
    <group
      name={`zone-${zone}`}
      userData={{ zone }}
      onPointerOver={(event) => {
        event.stopPropagation()
        onHoverZone(zone)
      }}
      onPointerOut={(event) => {
        event.stopPropagation()
        onHoverZone(null)
      }}
      onClick={(event) => {
        event.stopPropagation()
        onSelectZone(zone)
      }}
    >
      {children}
    </group>
  )
}

export default function Mannequin({
  mannequinRef,
  palette,
  counts = null,
  hoveredZone,
  selectedZone,
  onHoverZone,
  onSelectZone,
}) {
  const zoneMaterial = (zone) => {
    const appearance = getZoneAppearance(palette, zone, { hoveredZone, selectedZone, counts })

    return (
      <meshStandardMaterial
        color={appearance.color}
        emissive={palette.emissive}
        emissiveIntensity={appearance.emissiveIntensity}
        roughness={palette.roughness}
        metalness={palette.metalness}
        flatShading
      />
    )
  }

  const zoneProps = (zone) => ({
    zone,
    onHoverZone,
    onSelectZone,
  })

  return (
    <group ref={mannequinRef} name="mannequin">
      {/* Head and neck stay matte and faceless so the figure reads as equipment, not a character. */}
      <mesh position={[0, 1.43, 0]} scale={[0.92, 1.12, 1]}>
        <sphereGeometry args={[0.22, 14, 10]} />
        <BaseMaterial palette={palette} />
      </mesh>
      <mesh position={[0, 1.17, 0]}>
        <cylinderGeometry args={[0.095, 0.112, 0.2, 8, 1]} />
        <BaseMaterial palette={palette} secondary />
      </mesh>

      <mesh position={[0, 0.63, 0]} scale={[1, 1, 0.62]}>
        <cylinderGeometry args={[0.38, 0.29, 0.9, 10, 2]} />
        <BaseMaterial palette={palette} />
      </mesh>
      <mesh position={[0, 0.03, 0]} scale={[1, 1, 0.7]}>
        <cylinderGeometry args={[0.3, 0.245, 0.28, 10, 1]} />
        <BaseMaterial palette={palette} secondary />
      </mesh>
      {/* Spine recess keeps the back readable when the figure is rotated. */}
      <mesh position={[0, 0.62, -0.226]}>
        <boxGeometry args={[0.05, 0.62, 0.02]} />
        <BaseMaterial palette={palette} secondary />
      </mesh>

      <ZoneGroup {...zoneProps('chest')}>
        <mesh position={[0, 0.86, 0.235]} rotation={[0.05, 0, 0]} scale={[0.3, 0.15, 0.06]}>
          <icosahedronGeometry args={[1, 1]} />
          {zoneMaterial('chest')}
        </mesh>
      </ZoneGroup>

      <ZoneGroup {...zoneProps('back')}>
        {SIDES.map((side) => (
          <mesh
            key={side}
            position={[side * 0.15, 0.9, -0.215]}
            rotation={[0, side * -0.18, side * 0.06]}
            scale={[0.155, 0.18, 0.055]}
          >
            <icosahedronGeometry args={[1, 1]} />
            {zoneMaterial('back')}
          </mesh>
        ))}
      </ZoneGroup>

      <ZoneGroup {...zoneProps('core')}>
        <mesh position={[0, 0.4, 0.215]} scale={[0.155, 0.21, 0.055]}>
          <icosahedronGeometry args={[1, 1]} />
          {zoneMaterial('core')}
        </mesh>
      </ZoneGroup>

      <ZoneGroup {...zoneProps('shoulders')}>
        {SIDES.map((side) => (
          <mesh key={side} position={[side * 0.385, 1.0, 0]} scale={[0.155, 0.135, 0.13]}>
            <sphereGeometry args={[1, 12, 8]} />
            {zoneMaterial('shoulders')}
          </mesh>
        ))}
      </ZoneGroup>

      <ZoneGroup {...zoneProps('arms')}>
        {SIDES.map((side) => (
          <mesh
            key={`upper-${side}`}
            position={[side * 0.46, 0.72, 0]}
            rotation={[0, 0, side * 0.1]}
          >
            <capsuleGeometry args={[0.09, 0.34, 3, 8]} />
            {zoneMaterial('arms')}
          </mesh>
        ))}
        {SIDES.map((side) => (
          <mesh key={`elbow-${side}`} position={[side * 0.49, 0.46, 0]}>
            <sphereGeometry args={[0.082, 10, 8]} />
            {zoneMaterial('arms')}
          </mesh>
        ))}
        {SIDES.map((side) => (
          <mesh
            key={`lower-${side}`}
            position={[side * 0.492, 0.24, 0]}
            rotation={[0, 0, side * 0.04]}
          >
            <capsuleGeometry args={[0.075, 0.28, 3, 8]} />
            {zoneMaterial('arms')}
          </mesh>
        ))}
      </ZoneGroup>

      {SIDES.map((side) => (
        <mesh key={`hand-${side}`} position={[side * 0.495, 0, 0]} scale={[0.07, 0.115, 0.052]}>
          <sphereGeometry args={[1, 10, 8]} />
          <BaseMaterial palette={palette} secondary />
        </mesh>
      ))}

      <ZoneGroup {...zoneProps('legs')}>
        {SIDES.map((side) => (
          <mesh
            key={`thigh-${side}`}
            position={[side * 0.148, -0.4, 0]}
            rotation={[0, 0, side * 0.03]}
          >
            <capsuleGeometry args={[0.13, 0.44, 3, 9]} />
            {zoneMaterial('legs')}
          </mesh>
        ))}
        {SIDES.map((side) => (
          <mesh key={`knee-${side}`} position={[side * 0.157, -0.755, 0]}>
            <sphereGeometry args={[0.105, 10, 8]} />
            {zoneMaterial('legs')}
          </mesh>
        ))}
        {SIDES.map((side) => (
          <mesh
            key={`calf-${side}`}
            position={[side * 0.164, -0.94, 0]}
            rotation={[0, 0, side * 0.015]}
          >
            <capsuleGeometry args={[0.1, 0.36, 3, 9]} />
            {zoneMaterial('legs')}
          </mesh>
        ))}
      </ZoneGroup>

      {SIDES.map((side) => (
        <mesh
          key={`foot-${side}`}
          position={[side * 0.17, -1.29, 0.08]}
          rotation={[0, side * -0.08, 0]}
        >
          <boxGeometry args={[0.17, 0.11, 0.3]} />
          <BaseMaterial palette={palette} secondary />
        </mesh>
      ))}
    </group>
  )
}

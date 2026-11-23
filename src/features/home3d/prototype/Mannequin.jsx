import { useMemo } from 'react'
import { getAnatomyGeometries } from './anatomyGeometry.js'
import { getZoneAppearance } from './mannequinMaterials.js'

function BaseMaterial({ palette, secondary = false }) {
  return (
    <meshPhysicalMaterial
      color={secondary ? palette.bodySecondary : palette.body}
      roughness={palette.roughness + 0.14}
      metalness={palette.metalness}
      clearcoat={(palette.clearcoat ?? 0.14) * 0.45}
      clearcoatRoughness={0.62}
      envMapIntensity={palette.envMapIntensity ?? 0.48}
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
  const anatomy = useMemo(() => getAnatomyGeometries(), [])

  const renderZoneMaterial = (zone) => {
    const appearance = getZoneAppearance(palette, zone, { hoveredZone, selectedZone, counts })
    const isSelected = selectedZone === zone
    const isHovered = hoveredZone === zone
    const isActive = Number(counts?.[zone]) > 0

    return (
      <meshPhysicalMaterial
        color={appearance.color}
        emissive={palette.emissive}
        emissiveIntensity={appearance.emissiveIntensity}
        roughness={isSelected ? Math.max(0.32, palette.roughness - 0.18) : isHovered ? Math.max(0.38, palette.roughness - 0.12) : palette.roughness}
        metalness={isSelected || isActive ? palette.metalness + 0.06 : palette.metalness}
        clearcoat={isSelected ? 0.34 : isHovered ? 0.26 : palette.clearcoat ?? 0.16}
        clearcoatRoughness={isSelected ? 0.32 : palette.clearcoatRoughness ?? 0.48}
        envMapIntensity={palette.envMapIntensity ?? 0.52}
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
      <mesh geometry={anatomy.base.head} castShadow receiveShadow>
        <BaseMaterial palette={palette} />
      </mesh>
      <mesh geometry={anatomy.base.neck} castShadow receiveShadow>
        <BaseMaterial palette={palette} secondary />
      </mesh>
      <mesh geometry={anatomy.base.torso} castShadow receiveShadow>
        <BaseMaterial palette={palette} />
      </mesh>

      {anatomy.base.hands.map((geometry, index) => (
        <mesh key={`hand-${index}`} geometry={geometry} castShadow receiveShadow>
          <BaseMaterial palette={palette} secondary />
        </mesh>
      ))}

      {anatomy.base.feet.map((geometry, index) => (
        <mesh key={`foot-${index}`} geometry={geometry} castShadow receiveShadow>
          <BaseMaterial palette={palette} secondary />
        </mesh>
      ))}

      {Object.entries(anatomy.zones).map(([zone, geometries]) => (
        <ZoneGroup key={zone} {...zoneProps(zone)}>
          {geometries.map((geometry, index) => (
            <mesh key={`${zone}-${index}`} geometry={geometry} castShadow receiveShadow>
              {renderZoneMaterial(zone)}
            </mesh>
          ))}
        </ZoneGroup>
      ))}
    </group>
  )
}

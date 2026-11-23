import { useMemo } from 'react'
import { getAnatomyGeometries } from './anatomyGeometry.js'
import { getZoneAppearance } from './mannequinMaterials.js'

function BaseMaterial({ palette, apparel = false }) {
  return (
    <meshPhysicalMaterial
      color={apparel ? palette.bodySecondary : palette.body}
      roughness={apparel ? Math.min(0.84, palette.roughness + 0.16) : palette.roughness + 0.04}
      metalness={apparel ? 0.01 : palette.metalness}
      clearcoat={apparel ? 0 : (palette.clearcoat ?? 0.04)}
      clearcoatRoughness={palette.clearcoatRoughness ?? 0.72}
      sheen={apparel ? 0.08 : (palette.sheen ?? 0.2)}
      sheenRoughness={0.68}
      sheenColor={palette.sheenColor ?? '#DDD6CE'}
      envMapIntensity={apparel ? 0.25 : (palette.envMapIntensity ?? 0.4)}
      vertexColors
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
        roughness={isSelected ? Math.max(0.46, palette.roughness - 0.14) : isHovered ? Math.max(0.5, palette.roughness - 0.1) : palette.roughness}
        metalness={isSelected || isActive ? palette.metalness + 0.02 : palette.metalness}
        clearcoat={isSelected ? 0.12 : isHovered ? 0.08 : (palette.clearcoat ?? 0.04)}
        clearcoatRoughness={isSelected ? 0.52 : (palette.clearcoatRoughness ?? 0.72)}
        sheen={isSelected ? 0.28 : (palette.sheen ?? 0.2)}
        sheenRoughness={0.62}
        sheenColor={palette.sheenColor ?? '#DDD6CE'}
        envMapIntensity={palette.envMapIntensity ?? 0.42}
        vertexColors
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
      <mesh geometry={anatomy.base.hair} castShadow receiveShadow>
        <BaseMaterial palette={palette} apparel />
      </mesh>
      <mesh geometry={anatomy.base.neck} castShadow receiveShadow>
        <BaseMaterial palette={palette} />
      </mesh>
      <mesh geometry={anatomy.base.torso} castShadow receiveShadow>
        <BaseMaterial palette={palette} />
      </mesh>
      <mesh geometry={anatomy.base.briefs} castShadow receiveShadow>
        <BaseMaterial palette={palette} apparel />
      </mesh>
      <mesh geometry={anatomy.base.hands} castShadow receiveShadow>
        <BaseMaterial palette={palette} />
      </mesh>
      <mesh geometry={anatomy.base.feet} castShadow receiveShadow>
        <BaseMaterial palette={palette} />
      </mesh>

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

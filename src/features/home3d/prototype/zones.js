export const MUSCLE_ZONES = [
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'arms', label: 'Arms' },
  { id: 'core', label: 'Core' },
  { id: 'legs', label: 'Legs' },
]

export function getZoneLabel(id) {
  return MUSCLE_ZONES.find((zone) => zone.id === id)?.label ?? ''
}

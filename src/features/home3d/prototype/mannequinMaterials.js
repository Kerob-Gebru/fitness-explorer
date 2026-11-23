// Theme palettes mirror the Fitness Explorer tokens. WebGL materials cannot read
// CSS custom properties, so the small set of scene colours is kept here and
// switched by the same theme state that drives the page.
export const FIGURE_THEMES = {
  dark: {
    body: '#2C323B',
    bodySecondary: '#222730',
    zoneIdle: '#3A414C',
    zoneActive: '#9B4817',
    zoneHover: '#E05B12',
    zoneSelected: '#FF5F00',
    emissive: '#FF5F00',
    emissiveIdle: 0.01,
    emissiveActive: 0.14,
    emissiveHover: 0.24,
    emissiveSelected: 0.42,
    roughness: 0.56,
    metalness: 0.12,
    clearcoat: 0.16,
    clearcoatRoughness: 0.48,
    ambient: '#9FB0C4',
    ambientIntensity: 0.72,
    key: '#FFF4E8',
    keyIntensity: 2.6,
    fill: '#89A7CC',
    fillIntensity: 1.05,
    rim: '#FF6E1A',
    rimIntensity: 2.4,
    studioGlow: '#FF5F00',
    pedestalRing: '#3B424E',
    pedestalAccent: '#FF5F00',
  },
  light: {
    body: '#C6CDD6',
    bodySecondary: '#B6BFC9',
    zoneIdle: '#BCC4CE',
    zoneActive: '#C9723F',
    zoneHover: '#C2541E',
    zoneSelected: '#B23C00',
    emissive: '#B23C00',
    emissiveIdle: 0.006,
    emissiveActive: 0.06,
    emissiveHover: 0.12,
    emissiveSelected: 0.2,
    roughness: 0.52,
    metalness: 0.08,
    clearcoat: 0.18,
    clearcoatRoughness: 0.42,
    ambient: '#FFFFFF',
    ambientIntensity: 0.78,
    key: '#FFF6ED',
    keyIntensity: 2.1,
    fill: '#ADC0D6',
    fillIntensity: 0.9,
    rim: '#E38A58',
    rimIntensity: 1.25,
    studioGlow: '#C2541E',
    pedestalRing: '#BDC5CF',
    pedestalAccent: '#B23C00',
  },
}

export function getZoneAppearance(
  palette,
  zone,
  { hoveredZone = null, selectedZone = null, counts = null } = {},
) {
  if (selectedZone === zone) {
    return { color: palette.zoneSelected, emissiveIntensity: palette.emissiveSelected }
  }
  if (hoveredZone === zone) {
    return { color: palette.zoneHover, emissiveIntensity: palette.emissiveHover }
  }
  if (Number(counts?.[zone]) > 0) {
    return { color: palette.zoneActive, emissiveIntensity: palette.emissiveActive }
  }
  return { color: palette.zoneIdle, emissiveIntensity: palette.emissiveIdle }
}

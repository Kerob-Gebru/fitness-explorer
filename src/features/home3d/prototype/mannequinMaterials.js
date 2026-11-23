// Theme palettes mirror the Fitness Explorer tokens. WebGL materials cannot read
// CSS custom properties, so the small set of scene colours is kept here and
// switched by the same theme state that drives the page.
export const FIGURE_THEMES = {
  dark: {
    body: '#4B5158',
    bodySecondary: '#41474E',
    zoneIdle: '#525A64',
    zoneActive: '#8A4519',
    zoneHover: '#D4550F',
    zoneSelected: '#FF5F00',
    emissive: '#FF5F00',
    emissiveIdle: 0.01,
    emissiveActive: 0.05,
    emissiveHover: 0.05,
    emissiveSelected: 0.12,
    roughness: 0.86,
    metalness: 0.03,
    ambient: '#C2C8D0',
    ambientIntensity: 1.6,
    key: '#FFF6EE',
    keyIntensity: 3.4,
    fill: '#C0D0E4',
    fillIntensity: 1.4,
    rim: '#FF8A3D',
    rimIntensity: 0.9,
  },
  light: {
    body: '#CBD1D9',
    bodySecondary: '#BDC4CD',
    zoneIdle: '#C2C9D2',
    zoneActive: '#C97A4A',
    zoneHover: '#C2541E',
    zoneSelected: '#B23C00',
    emissive: '#B23C00',
    emissiveIdle: 0.006,
    emissiveActive: 0.02,
    emissiveHover: 0.03,
    emissiveSelected: 0.06,
    roughness: 0.82,
    metalness: 0.03,
    ambient: '#FFFFFF',
    ambientIntensity: 1.05,
    key: '#FFF3E8',
    keyIntensity: 2,
    fill: '#BCCBDD',
    fillIntensity: 0.85,
    rim: '#E8A077',
    rimIntensity: 0.45,
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

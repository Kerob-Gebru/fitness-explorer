// Theme palettes mirror Fitness Explorer's Matte Charcoal & Safety Orange tokens.
// WebGL materials cannot read CSS custom properties directly, so the scene
// colours live here and switch with the page theme.
export const FIGURE_THEMES = {
  dark: {
    body: '#626772',
    bodySecondary: '#1B202B',
    zoneIdle: '#737884',
    zoneActive: '#A8572A',
    zoneHover: '#DF6422',
    zoneSelected: '#FF5F00',
    emissive: '#FF5F00',
    emissiveIdle: 0,
    emissiveActive: 0.08,
    emissiveHover: 0.16,
    emissiveSelected: 0.26,
    roughness: 0.62,
    metalness: 0.03,
    clearcoat: 0.05,
    clearcoatRoughness: 0.7,
    sheen: 0.24,
    sheenColor: '#DDD6CE',
    envMapIntensity: 0.46,
    ambient: '#9CA6B4',
    ambientIntensity: 0.68,
    key: '#F4F6FA',
    keyIntensity: 2.38,
    fill: '#8E99AA',
    fillIntensity: 0.94,
    rim: '#FF924D',
    rimIntensity: 1.5,
    studioGlow: '#FF5F00',
    pedestalRing: '#2A303B',
    pedestalAccent: '#FF5F00',
  },
  light: {
    body: '#8E94A0',
    bodySecondary: '#3E4552',
    zoneIdle: '#A0A6B2',
    zoneActive: '#C96D3B',
    zoneHover: '#B8541F',
    zoneSelected: '#B83E00',
    emissive: '#FF5F00',
    emissiveIdle: 0,
    emissiveActive: 0.05,
    emissiveHover: 0.09,
    emissiveSelected: 0.14,
    roughness: 0.6,
    metalness: 0.03,
    clearcoat: 0.04,
    clearcoatRoughness: 0.68,
    sheen: 0.16,
    sheenColor: '#FFFFFF',
    envMapIntensity: 0.36,
    ambient: '#FFFFFF',
    ambientIntensity: 0.74,
    key: '#FFFDFB',
    keyIntensity: 2.08,
    fill: '#C7CFD9',
    fillIntensity: 0.88,
    rim: '#FF8A47',
    rimIntensity: 1.0,
    studioGlow: '#FF5F00',
    pedestalRing: '#CBD0D8',
    pedestalAccent: '#FF5F00',
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

import assert from 'node:assert/strict'
import test from 'node:test'
import { FIGURE_THEMES, getZoneAppearance } from './prototype/mannequinMaterials.js'

const palette = FIGURE_THEMES.dark

test('prioritizes selected, then hovered, then weekly activity, then idle', () => {
  const counts = { chest: 3 }

  assert.deepEqual(
    getZoneAppearance(palette, 'chest', { counts, hoveredZone: 'chest', selectedZone: 'chest' }),
    { color: palette.zoneSelected, emissiveIntensity: palette.emissiveSelected },
  )
  assert.deepEqual(
    getZoneAppearance(palette, 'chest', { counts, hoveredZone: 'chest' }),
    { color: palette.zoneHover, emissiveIntensity: palette.emissiveHover },
  )
  assert.deepEqual(
    getZoneAppearance(palette, 'chest', { counts }),
    { color: palette.zoneActive, emissiveIntensity: palette.emissiveActive },
  )
  assert.deepEqual(
    getZoneAppearance(palette, 'legs', { counts }),
    { color: palette.zoneIdle, emissiveIntensity: palette.emissiveIdle },
  )
})

test('treats zero and missing counts as neutral', () => {
  const counts = { chest: 0 }

  assert.equal(getZoneAppearance(palette, 'chest', { counts }).color, palette.zoneIdle)
  assert.equal(getZoneAppearance(palette, 'legs', { counts }).color, palette.zoneIdle)
  assert.equal(getZoneAppearance(palette, 'legs', { counts: null }).color, palette.zoneIdle)
  assert.equal(getZoneAppearance(palette, 'legs').color, palette.zoneIdle)
})

test('defines distinct activity colours for both themes', () => {
  for (const theme of ['dark', 'light']) {
    const colors = FIGURE_THEMES[theme]
    assert.notEqual(colors.zoneActive, colors.zoneIdle)
    assert.notEqual(colors.zoneActive, colors.zoneSelected)
    assert.ok(colors.emissiveActive > 0)
  }

  assert.notEqual(FIGURE_THEMES.dark.zoneActive, FIGURE_THEMES.light.zoneActive)
})

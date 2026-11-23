import assert from 'node:assert/strict'
import test from 'node:test'
import { FOCUS_ZONES } from './focusFigureData.js'
import {
  CAMERA_BEATS,
  getActiveScrollBeat,
  getDefaultWidePose,
  getZoneCameraPose,
  sampleCinemaPose,
} from './studioTimeline.js'

test('covers all 6 anatomical focus zones with finite close-up poses', () => {
  for (const zone of FOCUS_ZONES) {
    const desktop = getZoneCameraPose(zone.id, { compact: false })
    const mobile = getZoneCameraPose(zone.id, { compact: true })
    assert.ok(desktop, `missing desktop camera preset for ${zone.id}`)
    assert.ok(mobile, `missing mobile camera preset for ${zone.id}`)
    assert.ok(desktop.side === 'left' || desktop.side === 'right')
    for (const num of [...desktop.pose.pos, ...desktop.pose.target, desktop.pose.yaw, desktop.pose.pitch]) {
      assert.ok(Number.isFinite(num), `non-finite coordinate for ${zone.id}`)
    }
  }
})

test('samples valid hero, muscle beats, and wide outro rewind across scroll progress 0..1', () => {
  const startPose = sampleCinemaPose(0)
  const chestPose = sampleCinemaPose(0.23)
  const endPose = sampleCinemaPose(1)

  assert.ok(startPose.pos[2] > 6.5, 'hero beat starts at wide shot')
  assert.ok(chestPose.pos[2] < 4.0, 'chest beat zooms into macro shot')
  assert.ok(endPose.pos[2] > 6.5, 'outro beat rewinds to wide shot')

  for (let i = 0; i <= 20; i += 1) {
    const u = i / 20
    const pose = sampleCinemaPose(u)
    assert.equal(pose.pos.length, 3)
    assert.equal(pose.target.length, 3)
    assert.ok(pose.pos.every(Number.isFinite))
    assert.ok(pose.target.every(Number.isFinite))
  }
})

test('identifies active anatomical beat inside scroll range and returns null in hero/outro', () => {
  assert.equal(getActiveScrollBeat(0.02), null)
  assert.equal(getActiveScrollBeat(0.23)?.zoneId, 'chest')
  assert.equal(getActiveScrollBeat(0.39)?.zoneId, 'back')
  assert.equal(getActiveScrollBeat(0.545)?.zoneId, 'shoulders')
  assert.equal(getActiveScrollBeat(0.695)?.zoneId, 'core')
  assert.equal(getActiveScrollBeat(0.84)?.zoneId, 'legs')
  assert.equal(getActiveScrollBeat(0.96), null)

  const defaultWide = getDefaultWidePose()
  assert.equal(defaultWide.pos.length, 3)
  assert.ok(CAMERA_BEATS.length >= 6)
})

// Pure cinematic camera timeline & anatomical beat choreography.
// Inspired by film-style scroll speed-ramping: smooth eased glides between
// muscle zones with calm inspection holds, plus manual close-up presets.

export const ZONE_METADATA = {
  chest: {
    index: '01',
    subtitle: 'Pectoralis major & sternocostal drive',
    summary: 'Horizontal pressing & upper-torso power',
  },
  back: {
    index: '02',
    subtitle: 'Latissimus dorsi, traps & posterior chain',
    summary: 'Pulling density, scapular control & posture',
  },
  shoulders: {
    index: '03',
    subtitle: 'Anterior, lateral & rear deltoid cap',
    summary: 'Overhead stability & V-taper width',
  },
  arms: {
    index: '04',
    subtitle: 'Biceps brachii, triceps & forearm flexors',
    summary: 'Elbow flexion, lockout strength & grip',
  },
  core: {
    index: '05',
    subtitle: 'Rectus abdominis & external obliques',
    summary: 'Anti-rotation bracing & trunk transfer',
  },
  legs: {
    index: '06',
    subtitle: 'Quadriceps, hamstrings & calves',
    summary: 'Lower-body force, knee stability & sprint power',
  },
}

// Camera pose shots calibrated to the sculpted mannequin's world space
// (mannequin spans roughly y = -1.36 feet to +1.65 head, center ~0.145).
export const CAMERA_BEATS = [
  {
    id: 'hero',
    zoneId: null,
    side: null,
    start: 0.0,
    end: 0.14,
    enter: 0.0,
    exit: 0.14,
    scrollTarget: 0.0,
    pose: {
      pos: [0.35, 0.22, 7.25],
      target: [-0.46, 0.16, 0.0],
      yaw: -0.34,
      pitch: 0.03,
    },
    compactPose: {
      pos: [0.18, 0.26, 8.2],
      target: [0.0, 0.02, 0.0],
      yaw: -0.26,
      pitch: 0.03,
    },
  },
  {
    id: 'chest',
    zoneId: 'chest',
    side: 'right',
    start: 0.17,
    end: 0.29,
    enter: 0.16,
    exit: 0.30,
    scrollTarget: 0.23,
    pose: {
      pos: [-0.95, 0.90, 3.32],
      target: [0.36, 0.84, 0.08],
      yaw: -0.22,
      pitch: 0.04,
    },
    compactPose: {
      pos: [-0.42, 0.90, 3.65],
      target: [0.0, 0.72, 0.08],
      yaw: -0.18,
      pitch: 0.04,
    },
  },
  {
    id: 'back',
    zoneId: 'back',
    side: 'left',
    start: 0.33,
    end: 0.45,
    enter: 0.32,
    exit: 0.46,
    scrollTarget: 0.39,
    pose: {
      pos: [0.85, 0.92, 3.45],
      target: [-0.36, 0.85, -0.04],
      yaw: Math.PI - 0.24,
      pitch: 0.04,
    },
    compactPose: {
      pos: [0.38, 0.92, 3.72],
      target: [0.0, 0.72, -0.04],
      yaw: Math.PI - 0.2,
      pitch: 0.04,
    },
  },
  {
    id: 'shoulders',
    zoneId: 'shoulders',
    side: 'right',
    start: 0.49,
    end: 0.60,
    enter: 0.48,
    exit: 0.61,
    scrollTarget: 0.545,
    pose: {
      pos: [-1.18, 1.06, 3.22],
      target: [0.35, 0.96, 0.04],
      yaw: 0.36,
      pitch: 0.05,
    },
    compactPose: {
      pos: [-0.52, 1.04, 3.55],
      target: [0.0, 0.84, 0.04],
      yaw: 0.32,
      pitch: 0.05,
    },
  },
  {
    id: 'core',
    zoneId: 'core',
    side: 'left',
    start: 0.64,
    end: 0.75,
    enter: 0.63,
    exit: 0.76,
    scrollTarget: 0.695,
    pose: {
      pos: [0.92, 0.48, 3.28],
      target: [-0.35, 0.46, 0.08],
      yaw: -0.26,
      pitch: 0.03,
    },
    compactPose: {
      pos: [0.42, 0.50, 3.65],
      target: [0.0, 0.36, 0.08],
      yaw: -0.22,
      pitch: 0.03,
    },
  },
  {
    id: 'legs',
    zoneId: 'legs',
    side: 'right',
    start: 0.79,
    end: 0.89,
    enter: 0.78,
    exit: 0.90,
    scrollTarget: 0.84,
    pose: {
      pos: [-0.95, -0.32, 3.95],
      target: [0.38, -0.52, 0.02],
      yaw: 0.28,
      pitch: -0.04,
    },
    compactPose: {
      pos: [-0.42, -0.30, 4.35],
      target: [0.0, -0.64, 0.02],
      yaw: 0.24,
      pitch: -0.04,
    },
  },
  {
    id: 'outro',
    zoneId: null,
    side: null,
    start: 0.92,
    end: 1.0,
    enter: 0.91,
    exit: 1.0,
    scrollTarget: 0.97,
    pose: {
      pos: [0.0, 0.18, 7.65],
      target: [0.0, 0.145, 0.0],
      yaw: -0.32,
      pitch: 0.02,
    },
    compactPose: {
      pos: [0.0, 0.18, 8.2],
      target: [0.0, 0.145, 0.0],
      yaw: -0.28,
      pitch: 0.02,
    },
  },
]

// Direct zone inspection shots when a user clicks a zone on the body,
// ChapterRail, or legend index (covers all 6 muscle zones, including arms).
export const ZONE_CAMERA_PRESETS = {
  chest: {
    beat: CAMERA_BEATS[1],
    side: 'right',
    pose: CAMERA_BEATS[1].pose,
    compactPose: CAMERA_BEATS[1].compactPose,
  },
  back: {
    beat: CAMERA_BEATS[2],
    side: 'left',
    pose: CAMERA_BEATS[2].pose,
    compactPose: CAMERA_BEATS[2].compactPose,
  },
  shoulders: {
    beat: CAMERA_BEATS[3],
    side: 'right',
    pose: CAMERA_BEATS[3].pose,
    compactPose: CAMERA_BEATS[3].compactPose,
  },
  arms: {
    beat: null,
    side: 'left',
    pose: {
      pos: [1.32, 0.68, 3.18],
      target: [-0.34, 0.62, 0.04],
      yaw: 0.62,
      pitch: 0.04,
    },
    compactPose: {
      pos: [0.78, 0.68, 3.55],
      target: [0.0, 0.50, 0.04],
      yaw: 0.56,
      pitch: 0.04,
    },
  },
  core: {
    beat: CAMERA_BEATS[4],
    side: 'left',
    pose: CAMERA_BEATS[4].pose,
    compactPose: CAMERA_BEATS[4].compactPose,
  },
  legs: {
    beat: CAMERA_BEATS[5],
    side: 'right',
    pose: CAMERA_BEATS[5].pose,
    compactPose: CAMERA_BEATS[5].compactPose,
  },
}

export function clamp01(value) {
  return Math.min(Math.max(value, 0), 1)
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0 || 1))
  return t * t * (3 - 2 * t)
}

export function shortestAngleDiff(current, target) {
  let diff = (target - current) % (Math.PI * 2)
  if (diff > Math.PI) diff -= Math.PI * 2
  if (diff < -Math.PI) diff += Math.PI * 2
  return diff
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function lerpVec3(a, b, t) {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
  ]
}

function lerpPose(a, b, t) {
  return {
    pos: lerpVec3(a.pos, b.pos, t),
    target: lerpVec3(a.target, b.target, t),
    yaw: a.yaw + shortestAngleDiff(a.yaw, b.yaw) * t,
    pitch: lerp(a.pitch, b.pitch, t),
  }
}

// Evaluates the camera pose at continuous scroll progress u in [0, 1].
// Holds calm framing during [beat.start, beat.end] and glides smoothly
// between neighboring beats with smoothstep speed-ramping.
export function sampleCinemaPose(progress, { compact = false } = {}) {
  const u = clamp01(progress)
  const getPose = (beat) => (compact ? beat.compactPose : beat.pose)

  if (u <= CAMERA_BEATS[0].end) {
    return getPose(CAMERA_BEATS[0])
  }

  for (let i = 0; i < CAMERA_BEATS.length - 1; i += 1) {
    const current = CAMERA_BEATS[i]
    const next = CAMERA_BEATS[i + 1]

    if (u <= current.end) {
      return getPose(current)
    }

    if (u < next.start) {
      const blend = smoothstep(current.end, next.start, u)
      return lerpPose(getPose(current), getPose(next), blend)
    }
  }

  return getPose(CAMERA_BEATS[CAMERA_BEATS.length - 1])
}

export function getActiveScrollBeat(progress) {
  const u = clamp01(progress)
  for (const beat of CAMERA_BEATS) {
    if (beat.zoneId && u >= beat.enter && u <= beat.exit) {
      return beat
    }
  }
  return null
}

export function getZoneCameraPose(zoneId, { compact = false } = {}) {
  const entry = ZONE_CAMERA_PRESETS[zoneId]
  if (!entry) return null
  return {
    side: entry.side,
    pose: compact ? entry.compactPose : entry.pose,
  }
}

export function getDefaultWidePose({ compact = false } = {}) {
  return compact
    ? {
        pos: [0, 0.16, 8.35],
        target: [0, 0.12, 0],
        yaw: -0.34,
        pitch: 0.03,
      }
    : {
        pos: [0, 0.16, 7.55],
        target: [0, 0.145, 0],
        yaw: -0.38,
        pitch: 0.03,
      }
}

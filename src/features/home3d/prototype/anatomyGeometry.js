import * as THREE from 'three'

function buildLoftedGeometry(rings, radialSegments = 20, { capBottom = true, capTop = true } = {}) {
  const positions = []
  const indices = []
  const ringCount = rings.length
  const stride = radialSegments + 1

  for (let r = 0; r < ringCount; r += 1) {
    const ring = rings[r]
    for (let s = 0; s <= radialSegments; s += 1) {
      const theta = (s / radialSegments) * Math.PI * 2
      const point = ring(theta, s / radialSegments, r / Math.max(1, ringCount - 1))
      positions.push(point[0], point[1], point[2])
    }
  }

  for (let r = 0; r < ringCount - 1; r += 1) {
    const row = r * stride
    const nextRow = (r + 1) * stride
    for (let s = 0; s < radialSegments; s += 1) {
      const a = row + s
      const b = row + s + 1
      const c = nextRow + s + 1
      const d = nextRow + s
      indices.push(a, b, c)
      indices.push(a, c, d)
    }
  }

  if (capBottom && ringCount > 0) {
    let cx = 0
    let cy = 0
    let cz = 0
    for (let s = 0; s < radialSegments; s += 1) {
      const idx = s * 3
      cx += positions[idx]
      cy += positions[idx + 1]
      cz += positions[idx + 2]
    }
    const centerIndex = positions.length / 3
    positions.push(cx / radialSegments, cy / radialSegments, cz / radialSegments)
    for (let s = 0; s < radialSegments; s += 1) {
      indices.push(centerIndex, s + 1, s)
    }
  }

  if (capTop && ringCount > 0) {
    const topStart = (ringCount - 1) * stride
    let cx = 0
    let cy = 0
    let cz = 0
    for (let s = 0; s < radialSegments; s += 1) {
      const idx = (topStart + s) * 3
      cx += positions[idx]
      cy += positions[idx + 1]
      cz += positions[idx + 2]
    }
    const centerIndex = positions.length / 3
    positions.push(cx / radialSegments, cy / radialSegments, cz / radialSegments)
    for (let s = 0; s < radialSegments; s += 1) {
      indices.push(centerIndex, topStart + s, topStart + s + 1)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function makeEllipseRing({
  y,
  cx = 0,
  cz = 0,
  rx,
  rzFront,
  rzBack = rzFront,
  pinchX = 0,
  spineGroove = 0,
  sternumGroove = 0,
}) {
  return (theta) => {
    const cos = Math.cos(theta)
    const sin = Math.sin(theta)
    const zSign = -sin
    const rz = zSign >= 0 ? rzFront : rzBack
    let x = cx + cos * rx * (1 - pinchX * Math.pow(Math.abs(zSign), 2))
    let z = cz + zSign * rz

    if (spineGroove > 0 && zSign < -0.25) {
      const centerWeight = Math.exp(-Math.pow(cos * 4.2, 2))
      z += spineGroove * centerWeight
    }
    if (sternumGroove > 0 && zSign > 0.25) {
      const centerWeight = Math.exp(-Math.pow(cos * 5.2, 2))
      z -= sternumGroove * centerWeight
    }
    return [x, y, z]
  }
}

function createHeadGeometry() {
  const profile = [
    { y: 1.245, cz: 0.025, rx: 0.056, rzF: 0.068, rzB: 0.045 },
    { y: 1.28, cz: 0.022, rx: 0.076, rzF: 0.095, rzB: 0.062 },
    { y: 1.33, cz: 0.014, rx: 0.092, rzF: 0.11, rzB: 0.092 },
    { y: 1.39, cz: 0.008, rx: 0.104, rzF: 0.118, rzB: 0.112 },
    { y: 1.46, cz: 0.002, rx: 0.11, rzF: 0.12, rzB: 0.122 },
    { y: 1.535, cz: -0.004, rx: 0.104, rzF: 0.112, rzB: 0.116 },
    { y: 1.595, cz: -0.008, rx: 0.08, rzF: 0.088, rzB: 0.092 },
    { y: 1.635, cz: -0.008, rx: 0.036, rzF: 0.042, rzB: 0.044 },
  ]
  return buildLoftedGeometry(
    profile.map((p) => makeEllipseRing({
      y: p.y,
      cz: p.cz,
      rx: p.rx,
      rzFront: p.rzF,
      rzBack: p.rzB,
      pinchX: p.y < 1.35 ? 0.12 : 0.04,
    })),
    24,
  )
}

function createNeckGeometry() {
  const profile = [
    { y: 1.04, cz: -0.01, rx: 0.122, rzF: 0.098, rzB: 0.095 },
    { y: 1.11, cz: -0.004, rx: 0.092, rzF: 0.086, rzB: 0.084 },
    { y: 1.185, cz: 0.004, rx: 0.08, rzF: 0.079, rzB: 0.078 },
    { y: 1.265, cz: 0.012, rx: 0.076, rzF: 0.076, rzB: 0.074 },
  ]
  return buildLoftedGeometry(
    profile.map((p) => makeEllipseRing({ y: p.y, cz: p.cz, rx: p.rx, rzFront: p.rzF, rzBack: p.rzB })),
    20,
  )
}

function createTorsoGeometry() {
  const profile = [
    { y: -0.06, cz: -0.01, rx: 0.155, rzF: 0.12, rzB: 0.155, spine: 0.012 },
    { y: 0.02, cz: -0.01, rx: 0.238, rzF: 0.145, rzB: 0.185, spine: 0.016 },
    { y: 0.12, cz: -0.005, rx: 0.246, rzF: 0.15, rzB: 0.17, spine: 0.018 },
    { y: 0.23, cz: 0.004, rx: 0.228, rzF: 0.145, rzB: 0.135, spine: 0.018 },
    { y: 0.36, cz: 0.008, rx: 0.214, rzF: 0.146, rzB: 0.128, spine: 0.018 },
    { y: 0.50, cz: 0.01, rx: 0.228, rzF: 0.154, rzB: 0.138, spine: 0.02 },
    { y: 0.65, cz: 0.012, rx: 0.258, rzF: 0.165, rzB: 0.152, spine: 0.022, sternum: 0.01 },
    { y: 0.80, cz: 0.012, rx: 0.292, rzF: 0.172, rzB: 0.16, spine: 0.022, sternum: 0.014 },
    { y: 0.94, cz: 0.008, rx: 0.312, rzF: 0.162, rzB: 0.155, spine: 0.018, sternum: 0.012 },
    { y: 1.045, cz: 0.0, rx: 0.275, rzF: 0.128, rzB: 0.125, spine: 0.01 },
    { y: 1.09, cz: -0.006, rx: 0.145, rzF: 0.095, rzB: 0.095 },
  ]
  return buildLoftedGeometry(
    profile.map((p) => makeEllipseRing({
      y: p.y,
      cz: p.cz,
      rx: p.rx,
      rzFront: p.rzF,
      rzBack: p.rzB,
      spineGroove: p.spine ?? 0,
      sternumGroove: p.sternum ?? 0,
    })),
    28,
  )
}

function createChestSideGeometry(side) {
  // Sculpted pectoral plate covering sternum to anterior deltoid tie-in.
  const rows = [
    { y: 0.725, xIn: 0.022, xOut: 0.245, zBase: 0.148, depth: 0.032 },
    { y: 0.785, xIn: 0.016, xOut: 0.268, zBase: 0.154, depth: 0.056 },
    { y: 0.865, xIn: 0.016, xOut: 0.278, zBase: 0.155, depth: 0.062 },
    { y: 0.945, xIn: 0.022, xOut: 0.272, zBase: 0.146, depth: 0.044 },
    { y: 1.005, xIn: 0.038, xOut: 0.255, zBase: 0.126, depth: 0.022 },
  ]
  const rings = rows.map((row, rowIdx) => {
    const vFactor = Math.sin((rowIdx / (rows.length - 1)) * Math.PI)
    const midX = side * ((row.xIn + row.xOut) * 0.5)
    const halfW = (row.xOut - row.xIn) * 0.5
    const yThickness = 0.012 + 0.01 * vFactor
    return (theta) => {
      const cos = Math.cos(theta)
      const sin = Math.sin(theta)
      const zDir = -sin
      const u = (cos + 1) * 0.5
      const chestCurveZ = Math.cos(((side > 0 ? u : 1 - u) - 0.12) * 1.45) * 0.022
      const x = midX + cos * halfW
      const zCenter = row.zBase + chestCurveZ - Math.abs(cos) * 0.038
      const thickness = zDir >= 0 ? row.depth * (0.65 + 0.35 * (1 - Math.abs(cos))) : 0.024
      return [x, row.y + zDir * yThickness * 0.15, zCenter + zDir * thickness]
    }
  })
  return buildLoftedGeometry(rings, 20)
}

function createLatSideGeometry(side) {
  // Sculpted latissimus dorsi wing creating athletic V-taper on back and flank.
  const rows = [
    { y: 0.42, xIn: 0.075, xOut: 0.205, zBase: -0.128, depth: 0.024 },
    { y: 0.56, xIn: 0.062, xOut: 0.245, zBase: -0.136, depth: 0.042 },
    { y: 0.72, xIn: 0.056, xOut: 0.285, zBase: -0.144, depth: 0.052 },
    { y: 0.86, xIn: 0.064, xOut: 0.292, zBase: -0.144, depth: 0.044 },
    { y: 0.95, xIn: 0.088, xOut: 0.258, zBase: -0.132, depth: 0.024 },
  ]
  const rings = rows.map((row) => {
    const midX = side * ((row.xIn + row.xOut) * 0.5)
    const halfW = (row.xOut - row.xIn) * 0.5
    return (theta) => {
      const cos = Math.cos(theta)
      const sin = Math.sin(theta)
      const zDir = -sin
      const x = midX + cos * halfW
      // Wrap forward cleanly along the lateral ribcage as |x| increases
      const edgeFraction = Math.max(0, (Math.abs(x) - row.xIn) / Math.max(0.01, row.xOut - row.xIn))
      const wrapForward = Math.pow(edgeFraction, 1.55) * 0.088
      const thickness = zDir <= 0 ? row.depth : 0.02
      return [x, row.y, row.zBase + wrapForward + zDir * thickness]
    }
  })
  return buildLoftedGeometry(rings, 20)
}

function createTrapeziusGeometry() {
  // Upper/mid trapezius diamond hood framing neck to acromion and mid-spine.
  const rows = [
    { y: 0.76, rx: 0.042, zCenter: -0.168, rz: 0.018 },
    { y: 0.87, rx: 0.135, zCenter: -0.165, rz: 0.028 },
    { y: 0.97, rx: 0.228, zCenter: -0.15, rz: 0.034 },
    { y: 1.055, rx: 0.215, zCenter: -0.118, rz: 0.036 },
    { y: 1.125, rx: 0.105, zCenter: -0.072, rz: 0.032 },
    { y: 1.18, rx: 0.058, zCenter: -0.048, rz: 0.024 },
  ]
  return buildLoftedGeometry(
    rows.map((r) => (theta) => {
      const cos = Math.cos(theta)
      const sin = Math.sin(theta)
      const zDir = -sin
      const lateralSlope = Math.abs(cos) * 0.035
      return [cos * r.rx, r.y - Math.abs(cos) * 0.012, r.zCenter + lateralSlope + zDir * r.rz]
    }),
    22,
  )
}

function createErectorGeometry(side) {
  const rows = [
    { y: 0.16, rx: 0.04, rz: 0.022, z: -0.145 },
    { y: 0.29, rx: 0.046, rz: 0.028, z: -0.138 },
    { y: 0.42, rx: 0.044, rz: 0.026, z: -0.144 },
    { y: 0.54, rx: 0.034, rz: 0.018, z: -0.152 },
  ]
  return buildLoftedGeometry(
    rows.map((r) => makeEllipseRing({ y: r.y, cx: side * 0.062, cz: r.z, rx: r.rx, rzFront: r.rz })),
    14,
  )
}

function createDeltoidGeometry(side) {
  // Three-head deltoid shoulder cap curving down onto upper humerus.
  const rows = [
    { y: 0.815, cx: side * 0.388, rx: 0.036, rz: 0.044 },
    { y: 0.88, cx: side * 0.376, rx: 0.088, rz: 0.098 },
    { y: 0.945, cx: side * 0.362, rx: 0.108, rz: 0.118 },
    { y: 1.005, cx: side * 0.34, rx: 0.104, rz: 0.114 },
    { y: 1.055, cx: side * 0.302, rx: 0.078, rz: 0.088 },
    { y: 1.08, cx: side * 0.258, rx: 0.04, rz: 0.05 },
  ]
  return buildLoftedGeometry(
    rows.map((r) => makeEllipseRing({
      y: r.y,
      cx: r.cx,
      cz: 0.002,
      rx: r.rx,
      rzFront: r.rz,
      rzBack: r.rz * 1.04,
    })),
    20,
  )
}

function createArmGeometry(side) {
  // Continuous lofted athletic arm in natural 10° A-pose: biceps/triceps -> elbow -> forearm belly -> wrist.
  const profile = [
    { y: 0.075, cx: side * 0.518, cz: 0.016, rx: 0.042, rzF: 0.034, rzB: 0.034 },
    { y: 0.18, cx: side * 0.506, cz: 0.014, rx: 0.052, rzF: 0.046, rzB: 0.044 },
    { y: 0.33, cx: side * 0.49, cz: 0.01, rx: 0.072, rzF: 0.068, rzB: 0.064 },
    { y: 0.435, cx: side * 0.476, cz: 0.004, rx: 0.068, rzF: 0.062, rzB: 0.065 },
    { y: 0.49, cx: side * 0.466, cz: 0.0, rx: 0.064, rzF: 0.058, rzB: 0.062 },
    { y: 0.60, cx: side * 0.448, cz: 0.004, rx: 0.078, rzF: 0.084, rzB: 0.084 },
    { y: 0.72, cx: side * 0.428, cz: 0.006, rx: 0.084, rzF: 0.095, rzB: 0.096 },
    { y: 0.84, cx: side * 0.405, cz: 0.004, rx: 0.08, rzF: 0.088, rzB: 0.09 },
    { y: 0.93, cx: side * 0.382, cz: 0.0, rx: 0.068, rzF: 0.072, rzB: 0.074 },
  ]
  return buildLoftedGeometry(
    profile.map((p) => makeEllipseRing({
      y: p.y,
      cx: p.cx,
      cz: p.cz,
      rx: p.rx,
      rzFront: p.rzF,
      rzBack: p.rzB,
    })),
    20,
  )
}

function createHandGeometry(side) {
  const profile = [
    { y: -0.095, cx: side * 0.532, cz: 0.022, rx: 0.022, rzF: 0.034, rzB: 0.028 },
    { y: -0.045, cx: side * 0.53, cz: 0.022, rx: 0.03, rzF: 0.048, rzB: 0.044 },
    { y: 0.02, cx: side * 0.525, cz: 0.02, rx: 0.036, rzF: 0.054, rzB: 0.046 },
    { y: 0.08, cx: side * 0.518, cz: 0.016, rx: 0.038, rzF: 0.036, rzB: 0.034 },
  ]
  return buildLoftedGeometry(
    profile.map((p) => makeEllipseRing({
      y: p.y,
      cx: p.cx,
      cz: p.cz,
      rx: p.rx,
      rzFront: p.rzF,
      rzBack: p.rzB,
    })),
    16,
  )
}

function createAbBlockGeometry(side, rowIndex) {
  // Paired rectus abdominis segments with rounded anatomical cushions.
  const yCenters = [0.61, 0.475, 0.34, 0.215]
  const widths = [0.068, 0.065, 0.062, 0.054]
  const heights = [0.056, 0.055, 0.054, 0.058]
  const zOffsets = [0.166, 0.162, 0.156, 0.148]
  const yc = yCenters[rowIndex]
  const halfW = widths[rowIndex]
  const halfH = heights[rowIndex]
  const cx = side * (halfW + 0.012)
  const cz = zOffsets[rowIndex]

  const geo = new THREE.SphereGeometry(1, 16, 12)
  geo.scale(halfW, halfH, 0.028)
  geo.translate(cx, yc, cz)
  geo.computeVertexNormals()
  return geo
}

function createObliqueSideGeometry(side) {
  const rows = [
    { y: 0.175, cx: side * 0.175, cz: 0.062, rx: 0.042, rz: 0.072 },
    { y: 0.30, cx: side * 0.192, cz: 0.052, rx: 0.046, rz: 0.088 },
    { y: 0.44, cx: side * 0.205, cz: 0.046, rx: 0.044, rz: 0.088 },
    { y: 0.57, cx: side * 0.218, cz: 0.042, rx: 0.038, rz: 0.074 },
  ]
  return buildLoftedGeometry(
    rows.map((r) => makeEllipseRing({
      y: r.y,
      cx: r.cx,
      cz: r.cz,
      rx: r.rx,
      rzFront: r.rz,
      rzBack: r.rz * 0.85,
    })),
    16,
  )
}

function createLegGeometry(side) {
  // Continuous sculpted leg: quad/hamstring upper thigh -> knee -> diamond gastrocnemius calf -> ankle.
  const profile = [
    { y: -1.275, cx: side * 0.17, cz: -0.012, rx: 0.052, rzF: 0.058, rzB: 0.055 },
    { y: -1.14, cx: side * 0.169, cz: -0.015, rx: 0.06, rzF: 0.062, rzB: 0.07 },
    { y: -0.98, cx: side * 0.166, cz: -0.018, rx: 0.082, rzF: 0.075, rzB: 0.098 },
    { y: -0.845, cx: side * 0.164, cz: -0.014, rx: 0.088, rzF: 0.082, rzB: 0.104 },
    { y: -0.69, cx: side * 0.159, cz: 0.004, rx: 0.078, rzF: 0.084, rzB: 0.078 },
    { y: -0.58, cx: side * 0.156, cz: 0.008, rx: 0.096, rzF: 0.106, rzB: 0.094 },
    { y: -0.40, cx: side * 0.15, cz: 0.01, rx: 0.118, rzF: 0.132, rzB: 0.118 },
    { y: -0.20, cx: side * 0.144, cz: 0.004, rx: 0.13, rzF: 0.138, rzB: 0.136 },
    { y: -0.03, cx: side * 0.138, cz: -0.006, rx: 0.128, rzF: 0.128, rzB: 0.146 },
  ]
  return buildLoftedGeometry(
    profile.map((p) => makeEllipseRing({
      y: p.y,
      cx: p.cx,
      cz: p.cz,
      rx: p.rx,
      rzFront: p.rzF,
      rzBack: p.rzB,
    })),
    22,
  )
}

function createFootGeometry(side) {
  const profile = [
    { y: -1.352, cx: side * 0.172, cz: 0.055, rx: 0.064, rzF: 0.162, rzB: 0.092 },
    { y: -1.32, cx: side * 0.172, cz: 0.048, rx: 0.062, rzF: 0.154, rzB: 0.088 },
    { y: -1.285, cx: side * 0.171, cz: 0.015, rx: 0.056, rzF: 0.102, rzB: 0.076 },
    { y: -1.255, cx: side * 0.17, cz: -0.012, rx: 0.05, rzF: 0.056, rzB: 0.055 },
  ]
  const geo = buildLoftedGeometry(
    profile.map((p) => makeEllipseRing({
      y: p.y,
      cx: p.cx,
      cz: p.cz,
      rx: p.rx,
      rzFront: p.rzF,
      rzBack: p.rzB,
    })),
    18,
  )
  geo.rotateY(side * -0.06)
  geo.computeVertexNormals()
  return geo
}

let cachedAnatomy = null

export function getAnatomyGeometries() {
  if (cachedAnatomy) return cachedAnatomy

  cachedAnatomy = {
    base: {
      head: createHeadGeometry(),
      neck: createNeckGeometry(),
      torso: createTorsoGeometry(),
      hands: [1, -1].map((side) => createHandGeometry(side)),
      feet: [1, -1].map((side) => createFootGeometry(side)),
    },
    zones: {
      chest: [1, -1].map((side) => createChestSideGeometry(side)),
      back: [
        createTrapeziusGeometry(),
        ...[1, -1].map((side) => createLatSideGeometry(side)),
        ...[1, -1].map((side) => createErectorGeometry(side)),
      ],
      shoulders: [1, -1].map((side) => createDeltoidGeometry(side)),
      arms: [1, -1].map((side) => createArmGeometry(side)),
      core: [
        ...[0, 1, 2, 3].flatMap((row) => [1, -1].map((side) => createAbBlockGeometry(side, row))),
        ...[1, -1].map((side) => createObliqueSideGeometry(side)),
      ],
      legs: [1, -1].map((side) => createLegGeometry(side)),
    },
  }

  return cachedAnatomy
}

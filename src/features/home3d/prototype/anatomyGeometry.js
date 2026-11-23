import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

function buildLoftedGeometry(rings, radialSegments = 24, { capBottom = true, capTop = true } = {}) {
  const positions = []
  const colors = []
  const indices = []
  const ringCount = rings.length
  const stride = radialSegments + 1

  for (let r = 0; r < ringCount; r += 1) {
    const ring = rings[r]
    const v = ringCount > 1 ? r / (ringCount - 1) : 0
    for (let s = 0; s <= radialSegments; s += 1) {
      const u = s / radialSegments
      const theta = u * Math.PI * 2
      const point = ring(theta, u, v)
      const shade = point.length > 3 ? point[3] : 1
      positions.push(point[0], point[1], point[2])
      colors.push(shade, shade, shade)
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
    let cs = 0
    for (let s = 0; s < radialSegments; s += 1) {
      const idx = s * 3
      cx += positions[idx]
      cy += positions[idx + 1]
      cz += positions[idx + 2]
      cs += colors[idx]
    }
    const centerIndex = positions.length / 3
    const avgShade = cs / radialSegments
    positions.push(cx / radialSegments, cy / radialSegments, cz / radialSegments)
    colors.push(avgShade, avgShade, avgShade)
    for (let s = 0; s < radialSegments; s += 1) {
      indices.push(centerIndex, s + 1, s)
    }
  }

  if (capTop && ringCount > 0) {
    const topStart = (ringCount - 1) * stride
    let cx = 0
    let cy = 0
    let cz = 0
    let cs = 0
    for (let s = 0; s < radialSegments; s += 1) {
      const idx = (topStart + s) * 3
      cx += positions[idx]
      cy += positions[idx + 1]
      cz += positions[idx + 2]
      cs += colors[idx]
    }
    const centerIndex = positions.length / 3
    const avgShade = cs / radialSegments
    positions.push(cx / radialSegments, cy / radialSegments, cz / radialSegments)
    colors.push(avgShade, avgShade, avgShade)
    for (let s = 0; s < radialSegments; s += 1) {
      indices.push(centerIndex, topStart + s, topStart + s + 1)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function mergeZoneGeometries(geometries) {
  const merged = mergeGeometries(geometries, false)
  geometries.forEach((geometry) => geometry.dispose())
  merged.computeBoundingSphere()
  return merged
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
  gluteCleft = 0,
  baseShade = 1,
}) {
  return (theta) => {
    const cos = Math.cos(theta)
    const sin = Math.sin(theta)
    const zSign = -sin
    const rz = zSign >= 0 ? rzFront : rzBack
    const x = cx + cos * rx * (1 - pinchX * Math.pow(Math.abs(zSign), 2))
    let z = cz + zSign * rz
    let shade = baseShade

    if (spineGroove > 0 && zSign < -0.2) {
      const centerWeight = Math.exp(-Math.pow(cos * 4.4, 2))
      z += spineGroove * centerWeight
      shade -= centerWeight * 0.14
    }
    if (sternumGroove > 0 && zSign > 0.2) {
      const centerWeight = Math.exp(-Math.pow(cos * 5.0, 2))
      z -= sternumGroove * centerWeight
      shade -= centerWeight * 0.12
    }
    if (gluteCleft > 0 && zSign < -0.25) {
      const cleftWeight = Math.exp(-Math.pow(cos * 5.5, 2))
      const cheekWeight = Math.exp(-Math.pow((Math.abs(cos) - 0.52) * 3.0, 2))
      z += gluteCleft * cleftWeight - gluteCleft * 0.42 * cheekWeight
      shade -= cleftWeight * 0.16
    }

    return [x, y, z, shade]
  }
}

function createHeadAndEarsGeometry() {
  const profile = [
    { y: 1.258, cz: 0.036, rx: 0.044, rzF: 0.056, rzB: 0.034, pinch: 0.24, chin: 0.012, brow: 0, shade: 0.9 },
    { y: 1.288, cz: 0.028, rx: 0.068, rzF: 0.088, rzB: 0.056, pinch: 0.18, chin: 0.016, brow: 0, shade: 0.94 },
    { y: 1.335, cz: 0.018, rx: 0.088, rzF: 0.104, rzB: 0.086, pinch: 0.1, chin: 0.01, brow: 0, shade: 0.98 },
    { y: 1.385, cz: 0.012, rx: 0.097, rzF: 0.114, rzB: 0.106, pinch: 0.06, chin: 0.008, brow: -0.004, shade: 1.0 },
    { y: 1.435, cz: 0.006, rx: 0.102, rzF: 0.118, rzB: 0.114, pinch: 0.04, chin: 0, brow: 0.012, shade: 0.94 },
    { y: 1.495, cz: 0.0, rx: 0.105, rzF: 0.116, rzB: 0.118, pinch: 0.03, chin: 0, brow: 0.005, shade: 1.02 },
    { y: 1.555, cz: -0.006, rx: 0.096, rzF: 0.104, rzB: 0.112, pinch: 0.02, chin: 0, brow: 0, shade: 1.0 },
    { y: 1.605, cz: -0.01, rx: 0.066, rzF: 0.072, rzB: 0.08, pinch: 0.02, chin: 0, brow: 0, shade: 0.97 },
  ]

  const head = buildLoftedGeometry(
    profile.map((p) => (theta) => {
      const cos = Math.cos(theta)
      const sin = Math.sin(theta)
      const zSign = -sin
      const rz = zSign >= 0 ? p.rzF : p.rzB
      const x = cos * p.rx * (1 - p.pinch * Math.pow(Math.max(0, zSign), 1.8))
      let z = p.cz + zSign * rz
      let shade = p.shade

      if (zSign > 0.35) {
        const centerLine = Math.exp(-Math.pow(cos * 5.8, 2))
        const eyeSocket = Math.exp(-Math.pow((Math.abs(cos) - 0.38) * 5.2, 2))
        z += p.chin * centerLine
        if (p.brow !== 0) {
          z += p.brow * Math.exp(-Math.pow(cos * 2.2, 2))
          if (p.brow < 0) shade -= eyeSocket * 0.1
        }
      }
      return [x, p.y, z, shade]
    }),
    28,
  )

  const ears = [1, -1].map((side) => {
    const earRings = [
      { y: 1.355, rx: 0.011, rz: 0.016, shade: 0.9 },
      { y: 1.395, rx: 0.017, rz: 0.023, shade: 0.98 },
      { y: 1.435, rx: 0.015, rz: 0.02, shade: 0.95 },
    ]
    return buildLoftedGeometry(
      earRings.map((e) => makeEllipseRing({
        y: e.y,
        cx: side * 0.102,
        cz: -0.008,
        rx: e.rx,
        rzFront: e.rz,
        baseShade: e.shade,
      })),
      12,
    )
  })

  return mergeZoneGeometries([head, ...ears])
}

function createHairGeometry() {
  const profile = [
    { y: 1.425, cz: -0.052, rx: 0.092, rzF: 0.044, rzB: 0.072, lift: 0, shade: 0.88 },
    { y: 1.495, cz: -0.012, rx: 0.109, rzF: 0.114, rzB: 0.116, lift: 0.012, shade: 0.96 },
    { y: 1.56, cz: -0.006, rx: 0.106, rzF: 0.118, rzB: 0.114, lift: 0.018, shade: 1.04 },
    { y: 1.618, cz: -0.004, rx: 0.084, rzF: 0.096, rzB: 0.092, lift: 0.012, shade: 1.06 },
    { y: 1.648, cz: -0.01, rx: 0.038, rzF: 0.046, rzB: 0.044, lift: 0.004, shade: 1.0 },
  ]
  return buildLoftedGeometry(
    profile.map((p) => (theta) => {
      const cos = Math.cos(theta)
      const sin = Math.sin(theta)
      const zSign = -sin
      const rz = zSign >= 0 ? p.rzF : p.rzB
      const x = cos * p.rx
      const frontWave = zSign > 0.25 ? p.lift * Math.cos(cos * 1.4) : 0
      const z = p.cz + zSign * rz + frontWave * 0.4
      const y = p.y + frontWave
      return [x, y, z, p.shade]
    }),
    24,
  )
}

function createNeckGeometry() {
  const profile = [
    { y: 1.045, cz: -0.014, rx: 0.132, rzF: 0.102, rzB: 0.098, scm: 0.004, shade: 0.92 },
    { y: 1.11, cz: -0.006, rx: 0.094, rzF: 0.088, rzB: 0.086, scm: 0.009, shade: 0.96 },
    { y: 1.185, cz: 0.003, rx: 0.082, rzF: 0.082, rzB: 0.078, scm: 0.008, shade: 1.0 },
    { y: 1.255, cz: 0.011, rx: 0.078, rzF: 0.078, rzB: 0.074, scm: 0.004, shade: 0.94 },
    { y: 1.298, cz: 0.014, rx: 0.074, rzF: 0.074, rzB: 0.07, scm: 0, shade: 0.88 },
  ]
  return buildLoftedGeometry(
    profile.map((p, idx) => (theta) => {
      const cos = Math.cos(theta)
      const sin = Math.sin(theta)
      const zSign = -sin
      const rz = zSign >= 0 ? p.rzF : p.rzB
      const x = cos * p.rx
      let z = p.cz + zSign * rz
      let shade = p.shade

      // Sternocleidomastoid ridges converging toward the suprasternal notch
      if (zSign > 0.2 && p.scm > 0) {
        const targetAbsCos = 0.22 + (idx / (profile.length - 1)) * 0.42
        const scmBand = Math.exp(-Math.pow((Math.abs(cos) - targetAbsCos) * 4.5, 2))
        const notchHollow = Math.exp(-Math.pow(cos * 5.5, 2))
        z += p.scm * scmBand - p.scm * 0.9 * notchHollow
        shade += scmBand * 0.04 - notchHollow * 0.1
      }
      return [x, p.y, z, shade]
    }),
    24,
  )
}

function createTorsoGeometry() {
  const profile = [
    { y: -0.075, cz: -0.014, rx: 0.148, rzF: 0.118, rzB: 0.155, spine: 0.01, glute: 0.014, shade: 0.9 },
    { y: 0.005, cz: -0.012, rx: 0.232, rzF: 0.14, rzB: 0.188, spine: 0.012, glute: 0.022, shade: 0.94 },
    { y: 0.10, cz: -0.006, rx: 0.244, rzF: 0.146, rzB: 0.172, spine: 0.016, glute: 0.014, shade: 0.96 },
    { y: 0.215, cz: 0.004, rx: 0.226, rzF: 0.144, rzB: 0.136, spine: 0.018, shade: 0.98 },
    { y: 0.34, cz: 0.008, rx: 0.212, rzF: 0.146, rzB: 0.128, spine: 0.018, shade: 0.97 },
    { y: 0.46, cz: 0.01, rx: 0.224, rzF: 0.152, rzB: 0.136, spine: 0.02, shade: 0.98 },
    { y: 0.60, cz: 0.012, rx: 0.256, rzF: 0.164, rzB: 0.15, spine: 0.022, sternum: 0.01, shade: 0.99 },
    { y: 0.75, cz: 0.012, rx: 0.292, rzF: 0.172, rzB: 0.16, spine: 0.022, sternum: 0.014, shade: 1.0 },
    { y: 0.90, cz: 0.008, rx: 0.316, rzF: 0.164, rzB: 0.156, spine: 0.02, sternum: 0.014, shade: 1.0 },
    { y: 1.01, cz: 0.0, rx: 0.288, rzF: 0.138, rzB: 0.134, spine: 0.014, sternum: 0.01, shade: 0.98 },
    { y: 1.07, cz: -0.004, rx: 0.232, rzF: 0.114, rzB: 0.114, spine: 0.01, sternum: 0.008, shade: 0.96 },
    { y: 1.11, cz: -0.008, rx: 0.132, rzF: 0.096, rzB: 0.096, shade: 0.92 },
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
      gluteCleft: p.glute ?? 0,
      baseShade: p.shade,
    })),
    36,
  )
}

function createBriefsGeometry() {
  // Fitted athletic compression briefs anchoring pelvis-to-thigh silhouette.
  const profile = [
    { y: -0.092, cz: -0.014, rx: 0.16, rzF: 0.125, rzB: 0.162, glute: 0.016, legCut: 0.072, shade: 0.88 },
    { y: -0.02, cz: -0.012, rx: 0.236, rzF: 0.146, rzB: 0.194, glute: 0.024, legCut: 0.056, shade: 0.95 },
    { y: 0.055, cz: -0.008, rx: 0.249, rzF: 0.153, rzB: 0.186, glute: 0.018, legCut: 0.02, shade: 1.0 },
    { y: 0.118, cz: -0.004, rx: 0.249, rzF: 0.152, rzB: 0.172, glute: 0.01, legCut: 0, shade: 1.03 },
    { y: 0.146, cz: -0.002, rx: 0.242, rzF: 0.148, rzB: 0.158, glute: 0.006, legCut: 0, shade: 0.92 },
  ]
  return buildLoftedGeometry(
    profile.map((p) => (theta) => {
      const cos = Math.cos(theta)
      const sin = Math.sin(theta)
      const zSign = -sin
      const rz = zSign >= 0 ? p.rzF : p.rzB
      const x = cos * p.rx
      let z = p.cz + zSign * rz
      let y = p.y
      let shade = p.shade

      if (p.legCut > 0) {
        const sideLift = Math.pow(Math.abs(cos), 1.45) * (zSign > -0.2 ? p.legCut : p.legCut * 0.45)
        y += sideLift
      }
      if (p.glute > 0 && zSign < -0.25) {
        const cleft = Math.exp(-Math.pow(cos * 5.2, 2))
        z += p.glute * cleft
        shade -= cleft * 0.14
      }
      return [x, y, z, shade]
    }),
    36,
  )
}

function createChestSideGeometry(side) {
  // Anatomically contoured pectoral fan sweeping from sternum into anterior deltoid.
  const rows = [
    { y: 0.715, xIn: 0.022, xOut: 0.245, zBase: 0.148, depth: 0.024, shade: 0.85 },
    { y: 0.765, xIn: 0.015, xOut: 0.272, zBase: 0.154, depth: 0.052, shade: 0.96 },
    { y: 0.835, xIn: 0.014, xOut: 0.288, zBase: 0.156, depth: 0.062, shade: 1.03 },
    { y: 0.91, xIn: 0.018, xOut: 0.296, zBase: 0.15, depth: 0.052, shade: 1.02 },
    { y: 0.975, xIn: 0.028, xOut: 0.284, zBase: 0.136, depth: 0.032, shade: 0.96 },
    { y: 1.022, xIn: 0.048, xOut: 0.256, zBase: 0.118, depth: 0.015, shade: 0.89 },
  ]
  const rings = rows.map((row, rowIdx) => {
    const vFactor = Math.sin((rowIdx / (rows.length - 1)) * Math.PI)
    const midX = side * ((row.xIn + row.xOut) * 0.5)
    const halfW = (row.xOut - row.xIn) * 0.5
    return (theta) => {
      const cos = Math.cos(theta)
      const sin = Math.sin(theta)
      const zDir = -sin
      const x = midX + cos * halfW
      const absFrac = Math.max(0, Math.min(1, (Math.abs(x) - row.xIn) / Math.max(0.01, row.xOut - row.xIn)))
      const lateralWrap = Math.pow(absFrac, 1.55) * 0.064
      const medialTaper = Math.exp(-Math.pow(absFrac * 4.5, 2))
      const zCenter = row.zBase - lateralWrap + (1 - absFrac) * 0.012
      const thickness = zDir >= 0
        ? row.depth * (0.76 + 0.24 * Math.sin(absFrac * Math.PI)) * (1 - 0.35 * medialTaper)
        : 0.026
      const yLift = absFrac * 0.022 + zDir * vFactor * 0.006
      const shade = row.shade - medialTaper * 0.12 - (zDir < 0 ? 0.08 : 0)
      return [x, row.y + yLift, zCenter + zDir * thickness, shade]
    }
  })
  return buildLoftedGeometry(rings, 24)
}

function createChestZoneGeometry() {
  return mergeZoneGeometries([1, -1].map((side) => createChestSideGeometry(side)))
}

function createTrapeziusGeometry() {
  const rows = [
    { y: 0.70, rx: 0.044, zCenter: -0.162, rz: 0.016, shade: 0.86 },
    { y: 0.81, rx: 0.128, zCenter: -0.164, rz: 0.026, shade: 0.96 },
    { y: 0.92, rx: 0.215, zCenter: -0.158, rz: 0.034, shade: 1.02 },
    { y: 1.015, rx: 0.268, zCenter: -0.134, rz: 0.038, shade: 1.03 },
    { y: 1.08, rx: 0.228, zCenter: -0.105, rz: 0.036, shade: 1.0 },
    { y: 1.145, rx: 0.118, zCenter: -0.072, rz: 0.032, shade: 0.96 },
    { y: 1.215, rx: 0.064, zCenter: -0.048, rz: 0.022, shade: 0.9 },
  ]
  return buildLoftedGeometry(
    rows.map((r) => (theta) => {
      const cos = Math.cos(theta)
      const sin = Math.sin(theta)
      const zDir = -sin
      const spineDip = Math.exp(-Math.pow(cos * 5.2, 2))
      const lateralSlope = Math.pow(Math.abs(cos), 1.4) * 0.044
      const z = r.zCenter + lateralSlope + (zDir < 0 ? spineDip * 0.01 : 0) + zDir * r.rz
      const y = r.y - Math.abs(cos) * 0.018
      const shade = r.shade - spineDip * 0.12
      return [cos * r.rx, y, z, shade]
    }),
    26,
  )
}

function createLatSideGeometry(side) {
  const rows = [
    { y: 0.36, xIn: 0.072, xOut: 0.205, zBase: -0.126, depth: 0.02, shade: 0.88 },
    { y: 0.49, xIn: 0.06, xOut: 0.238, zBase: -0.134, depth: 0.036, shade: 0.96 },
    { y: 0.64, xIn: 0.056, xOut: 0.278, zBase: -0.144, depth: 0.048, shade: 1.02 },
    { y: 0.78, xIn: 0.06, xOut: 0.304, zBase: -0.148, depth: 0.048, shade: 1.03 },
    { y: 0.90, xIn: 0.074, xOut: 0.294, zBase: -0.142, depth: 0.038, shade: 0.98 },
    { y: 0.98, xIn: 0.105, xOut: 0.262, zBase: -0.128, depth: 0.022, shade: 0.91 },
  ]
  const rings = rows.map((row) => {
    const midX = side * ((row.xIn + row.xOut) * 0.5)
    const halfW = (row.xOut - row.xIn) * 0.5
    return (theta) => {
      const cos = Math.cos(theta)
      const sin = Math.sin(theta)
      const zDir = -sin
      const x = midX + cos * halfW
      const edgeFraction = Math.max(0, (Math.abs(x) - row.xIn) / Math.max(0.01, row.xOut - row.xIn))
      const wrapForward = Math.pow(edgeFraction, 1.5) * 0.105
      const thickness = zDir <= 0 ? row.depth * (0.7 + 0.3 * Math.sin(edgeFraction * Math.PI)) : 0.02
      const shade = row.shade - (1 - edgeFraction) * 0.08
      return [x, row.y, row.zBase + wrapForward + zDir * thickness, shade]
    }
  })
  return buildLoftedGeometry(rings, 22)
}

function createErectorGeometry(side) {
  const rows = [
    { y: 0.15, rx: 0.042, rz: 0.022, z: -0.142, shade: 0.89 },
    { y: 0.28, rx: 0.048, rz: 0.028, z: -0.134, shade: 0.98 },
    { y: 0.42, rx: 0.045, rz: 0.026, z: -0.14, shade: 0.99 },
    { y: 0.57, rx: 0.036, rz: 0.019, z: -0.15, shade: 0.92 },
  ]
  return buildLoftedGeometry(
    rows.map((r) => makeEllipseRing({
      y: r.y,
      cx: side * 0.058,
      cz: r.z,
      rx: r.rx,
      rzFront: r.rz,
      baseShade: r.shade,
    })),
    16,
  )
}

function createBackZoneGeometry() {
  return mergeZoneGeometries([
    createTrapeziusGeometry(),
    ...[1, -1].map((side) => createLatSideGeometry(side)),
    ...[1, -1].map((side) => createErectorGeometry(side)),
  ])
}

function createDeltoidGeometry(side) {
  // Sculpted 3-head deltoid tapering from clavicle/acromion onto upper humerus.
  const rows = [
    { y: 0.745, cx: side * 0.415, cz: -0.018, rx: 0.034, rz: 0.042, shade: 0.87 },
    { y: 0.815, cx: side * 0.402, cz: -0.016, rx: 0.072, rz: 0.084, shade: 0.96 },
    { y: 0.89, cx: side * 0.386, cz: -0.014, rx: 0.102, rz: 0.114, shade: 1.02 },
    { y: 0.96, cx: side * 0.366, cz: -0.012, rx: 0.112, rz: 0.122, shade: 1.04 },
    { y: 1.02, cx: side * 0.334, cz: -0.01, rx: 0.098, rz: 0.108, shade: 1.0 },
    { y: 1.065, cx: side * 0.29, cz: -0.01, rx: 0.068, rz: 0.078, shade: 0.94 },
    { y: 1.088, cx: side * 0.245, cz: -0.012, rx: 0.032, rz: 0.042, shade: 0.88 },
  ]
  return buildLoftedGeometry(
    rows.map((r, idx) => (theta) => {
      const cos = Math.cos(theta)
      const sin = Math.sin(theta)
      const zSign = -sin
      const v = idx / (rows.length - 1)
      // Subtle tri-head contour across anterior, lateral, posterior deltoid
      const headLobe = 1 + 0.07 * Math.sin(v * Math.PI) * Math.cos(theta * 3)
      const x = r.cx + cos * r.rx * headLobe
      const z = r.cz + zSign * (zSign >= 0 ? r.rz : r.rz * 1.05) * headLobe
      const shade = r.shade + (headLobe - 1) * 0.3
      return [x, r.y, z, shade]
    }),
    24,
  )
}

function createShouldersZoneGeometry() {
  return mergeZoneGeometries([1, -1].map((side) => createDeltoidGeometry(side)))
}

function createArmGeometry(side) {
  // Continuous athletic A-pose arm with biceps/triceps, elbow taper, and forearm flexor/extensor belly.
  const profile = [
    { y: 0.08, cx: side * 0.542, cz: 0.054, rx: 0.038, rzF: 0.033, rzB: 0.033, shade: 0.9 },
    { y: 0.16, cx: side * 0.536, cz: 0.038, rx: 0.048, rzF: 0.044, rzB: 0.042, shade: 0.95 },
    { y: 0.27, cx: side * 0.525, cz: 0.014, rx: 0.066, rzF: 0.062, rzB: 0.058, shade: 1.01 },
    { y: 0.365, cx: side * 0.512, cz: -0.008, rx: 0.074, rzF: 0.072, rzB: 0.066, shade: 1.03 },
    { y: 0.44, cx: side * 0.5, cz: -0.024, rx: 0.065, rzF: 0.058, rzB: 0.064, shade: 0.93 },
    { y: 0.495, cx: side * 0.492, cz: -0.028, rx: 0.063, rzF: 0.056, rzB: 0.066, shade: 0.91 },
    { y: 0.59, cx: side * 0.474, cz: -0.022, rx: 0.078, rzF: 0.084, rzB: 0.088, shade: 0.99 },
    { y: 0.70, cx: side * 0.45, cz: -0.018, rx: 0.088, rzF: 0.098, rzB: 0.102, shade: 1.04 },
    { y: 0.81, cx: side * 0.422, cz: -0.016, rx: 0.086, rzF: 0.092, rzB: 0.096, shade: 1.0 },
    { y: 0.92, cx: side * 0.39, cz: -0.014, rx: 0.07, rzF: 0.074, rzB: 0.076, shade: 0.92 },
  ]
  return buildLoftedGeometry(
    profile.map((p) => (theta) => {
      const cos = Math.cos(theta)
      const sin = Math.sin(theta)
      const zSign = -sin
      const rz = zSign >= 0 ? p.rzF : p.rzB
      // Subtle medial/lateral biceps-triceps groove along upper arm
      const groove = (p.y > 0.55 && p.y < 0.85) ? Math.exp(-Math.pow(zSign * 4.5, 2)) * 0.007 : 0
      const x = p.cx + cos * (p.rx - groove)
      const z = p.cz + zSign * rz
      const shade = p.shade - groove * 10
      return [x, p.y, z, shade]
    }),
    24,
  )
}

function createArmsZoneGeometry() {
  return mergeZoneGeometries([1, -1].map((side) => createArmGeometry(side)))
}

function createHandGeometry(side) {
  // Sculpted palm + thumb + tapered curled finger mass aligned with wrist at (side*0.542, 0.08, 0.054)
  const palm = buildLoftedGeometry(
    [
      { y: -0.015, cx: side * 0.54, cz: 0.064, rx: 0.024, rzF: 0.044, rzB: 0.042, shade: 0.94 },
      { y: 0.032, cx: side * 0.542, cz: 0.06, rx: 0.03, rzF: 0.048, rzB: 0.045, shade: 1.0 },
      { y: 0.086, cx: side * 0.542, cz: 0.054, rx: 0.035, rzF: 0.033, rzB: 0.033, shade: 0.93 },
    ].map((p) => makeEllipseRing({
      y: p.y,
      cx: p.cx,
      cz: p.cz,
      rx: p.rx,
      rzFront: p.rzF,
      rzBack: p.rzB,
      baseShade: p.shade,
    })),
    16,
  )

  // Curled fingers tapering inward toward the thigh
  const fingers = buildLoftedGeometry(
    [
      { y: -0.105, cx: side * 0.512, cz: 0.068, rx: 0.012, rzF: 0.024, rzB: 0.022, shade: 0.86 },
      { y: -0.065, cx: side * 0.528, cz: 0.068, rx: 0.019, rzF: 0.038, rzB: 0.035, shade: 0.95 },
      { y: -0.012, cx: side * 0.54, cz: 0.064, rx: 0.023, rzF: 0.043, rzB: 0.041, shade: 0.98 },
    ].map((p) => makeEllipseRing({
      y: p.y,
      cx: p.cx,
      cz: p.cz,
      rx: p.rx,
      rzFront: p.rzF,
      rzBack: p.rzB,
      baseShade: p.shade,
    })),
    16,
  )

  // Angled thumb projecting forward and slightly inward
  const thumb = buildLoftedGeometry(
    [
      { y: -0.038, cx: side * 0.512, cz: 0.104, rx: 0.011, rzF: 0.013, rzB: 0.013, shade: 0.92 },
      { y: 0.005, cx: side * 0.522, cz: 0.095, rx: 0.014, rzF: 0.017, rzB: 0.017, shade: 0.98 },
      { y: 0.048, cx: side * 0.532, cz: 0.078, rx: 0.016, rzF: 0.02, rzB: 0.02, shade: 0.95 },
    ].map((p) => makeEllipseRing({
      y: p.y,
      cx: p.cx,
      cz: p.cz,
      rx: p.rx,
      rzFront: p.rzF,
      rzBack: p.rzB,
      baseShade: p.shade,
    })),
    12,
  )

  return mergeZoneGeometries([palm, fingers, thumb])
}

function createRectusAbdominisSideGeometry(side) {
  // Continuous sculpted rectus abdominis column with subtle tendinous intersections (no round blobs).
  const ySteps = [0.145, 0.195, 0.245, 0.295, 0.34, 0.39, 0.435, 0.485, 0.53, 0.58, 0.63, 0.68]
  const intersections = [0.30, 0.435, 0.57]

  const rings = ySteps.map((y, idx) => {
    const v = idx / (ySteps.length - 1)
    const widthEnvelope = Math.sin(Math.pow(v, 0.72) * Math.PI)
    const xIn = 0.012 + (1 - widthEnvelope) * 0.008
    const xOut = xIn + 0.062 + 0.036 * widthEnvelope
    const midX = side * ((xIn + xOut) * 0.5)
    const halfW = (xOut - xIn) * 0.5

    // Match underlying torso curvature from pelvis to costal arch
    const zTorso = 0.144 + Math.sin(v * Math.PI * 0.85) * 0.022
    let intersectionDip = 0
    for (const bandY of intersections) {
      intersectionDip += Math.exp(-Math.pow((y - bandY) / 0.024, 2))
    }
    const baseDepth = (0.014 + 0.013 * Math.sin(v * Math.PI)) * (1 - 0.55 * intersectionDip)

    return (theta) => {
      const cos = Math.cos(theta)
      const sin = Math.sin(theta)
      const zDir = -sin
      const x = midX + cos * halfW
      const lateralFrac = Math.max(0, Math.min(1, (Math.abs(x) - xIn) / Math.max(0.01, xOut - xIn)))
      const curveBack = Math.pow(lateralFrac, 2) * 0.014
      const crown = Math.sin(lateralFrac * Math.PI)
      const z = zTorso - curveBack + (zDir >= 0 ? zDir * baseDepth * (0.45 + 0.55 * crown) : zDir * 0.018)
      const shade = 1.02 - intersectionDip * 0.16 - (1 - crown) * 0.09
      return [x, y, z, shade]
    }
  })

  return buildLoftedGeometry(rings, 20)
}

function createObliqueSideGeometry(side) {
  const rows = [
    { y: 0.15, cx: side * 0.165, cz: 0.068, rx: 0.044, rz: 0.072, shade: 0.9 },
    { y: 0.27, cx: side * 0.186, cz: 0.056, rx: 0.046, rz: 0.088, shade: 0.98 },
    { y: 0.40, cx: side * 0.194, cz: 0.048, rx: 0.042, rz: 0.088, shade: 1.01 },
    { y: 0.54, cx: side * 0.214, cz: 0.044, rx: 0.038, rz: 0.078, shade: 0.97 },
    { y: 0.64, cx: side * 0.232, cz: 0.042, rx: 0.03, rz: 0.06, shade: 0.9 },
  ]
  return buildLoftedGeometry(
    rows.map((r) => makeEllipseRing({
      y: r.y,
      cx: r.cx,
      cz: r.cz,
      rx: r.rx,
      rzFront: r.rz,
      rzBack: r.rz * 0.88,
      baseShade: r.shade,
    })),
    18,
  )
}

function createCoreZoneGeometry() {
  return mergeZoneGeometries([
    ...[1, -1].map((side) => createRectusAbdominisSideGeometry(side)),
    ...[1, -1].map((side) => createObliqueSideGeometry(side)),
  ])
}

function createLegGeometry(side) {
  // Continuous sculpted leg: hip -> vastus/quads/hamstrings -> patella/knee -> gastrocnemius calf -> ankle.
  const profile = [
    { y: -1.275, cx: side * 0.192, cz: -0.015, rx: 0.048, rzF: 0.054, rzB: 0.052, quad: 0, shade: 0.9 },
    { y: -1.16, cx: side * 0.19, cz: -0.018, rx: 0.054, rzF: 0.056, rzB: 0.064, quad: 0, shade: 0.94 },
    { y: -1.03, cx: side * 0.186, cz: -0.022, rx: 0.076, rzF: 0.068, rzB: 0.094, calf: 0.012, shade: 1.0 },
    { y: -0.90, cx: side * 0.184, cz: -0.018, rx: 0.091, rzF: 0.08, rzB: 0.11, calf: 0.016, shade: 1.04 },
    { y: -0.78, cx: side * 0.18, cz: -0.008, rx: 0.078, rzF: 0.076, rzB: 0.086, calf: 0.005, shade: 0.96 },
    { y: -0.665, cx: side * 0.178, cz: 0.012, rx: 0.078, rzF: 0.086, rzB: 0.074, patella: 0.014, shade: 0.94 },
    { y: -0.56, cx: side * 0.174, cz: 0.012, rx: 0.096, rzF: 0.106, rzB: 0.092, quad: 0.012, shade: 1.0 },
    { y: -0.41, cx: side * 0.166, cz: 0.014, rx: 0.122, rzF: 0.132, rzB: 0.118, quad: 0.018, shade: 1.04 },
    { y: -0.23, cx: side * 0.156, cz: 0.006, rx: 0.138, rzF: 0.142, rzB: 0.138, quad: 0.016, shade: 1.02 },
    { y: -0.05, cx: side * 0.144, cz: -0.006, rx: 0.136, rzF: 0.13, rzB: 0.148, quad: 0.006, shade: 0.94 },
  ]
  return buildLoftedGeometry(
    profile.map((p) => (theta) => {
      const cos = Math.cos(theta)
      const sin = Math.sin(theta)
      const zSign = -sin
      const rz = zSign >= 0 ? p.rzF : p.rzB
      let x = p.cx + cos * p.rx
      let z = p.cz + zSign * rz
      let shade = p.shade

      // Quadriceps sweep & vastus lateralis lateral flare
      if (p.quad && zSign > 0.15) {
        const rectus = Math.exp(-Math.pow(cos * 3.4, 2))
        const latFlare = Math.max(0, side * cos) * p.quad * 0.9
        x += side * latFlare
        z += p.quad * rectus
        shade += rectus * 0.03
      }
      // Subtle patella plateau & knee crease darkening
      if (p.patella) {
        if (zSign > 0.4) z += p.patella * Math.exp(-Math.pow(cos * 4.0, 2))
        if (zSign < -0.4) shade -= 0.09
      }
      // Gastrocnemius medial/lateral head split
      if (p.calf && zSign < -0.2) {
        const split = Math.exp(-Math.pow(cos * 4.5, 2))
        const heads = Math.exp(-Math.pow((Math.abs(cos) - 0.48) * 3.4, 2))
        z += p.calf * 0.6 * split - p.calf * 0.8 * heads
        shade -= split * 0.11
      }

      return [x, p.y, z, shade]
    }),
    28,
  )
}

function createLegsZoneGeometry() {
  return mergeZoneGeometries([1, -1].map((side) => createLegGeometry(side)))
}

function createFootGeometry(side) {
  const profile = [
    { y: -1.355, cx: side * 0.196, cz: 0.058, rx: 0.06, rzF: 0.165, rzB: 0.092, shade: 0.88 },
    { y: -1.326, cx: side * 0.196, cz: 0.052, rx: 0.059, rzF: 0.158, rzB: 0.088, shade: 0.96 },
    { y: -1.292, cx: side * 0.194, cz: 0.018, rx: 0.054, rzF: 0.104, rzB: 0.076, shade: 0.98 },
    { y: -1.262, cx: side * 0.192, cz: -0.014, rx: 0.047, rzF: 0.054, rzB: 0.052, shade: 0.91 },
  ]
  const geo = buildLoftedGeometry(
    profile.map((p) => makeEllipseRing({
      y: p.y,
      cx: p.cx,
      cz: p.cz,
      rx: p.rx,
      rzFront: p.rzF,
      rzBack: p.rzB,
      pinchX: 0.18,
      baseShade: p.shade,
    })),
    20,
  )
  geo.rotateY(side * -0.1)
  geo.computeVertexNormals()
  return geo
}

let cachedAnatomy = null

export function getAnatomyGeometries() {
  if (cachedAnatomy) return cachedAnatomy

  cachedAnatomy = {
    base: {
      head: createHeadAndEarsGeometry(),
      hair: createHairGeometry(),
      neck: createNeckGeometry(),
      torso: createTorsoGeometry(),
      briefs: createBriefsGeometry(),
      hands: mergeZoneGeometries([1, -1].map((side) => createHandGeometry(side))),
      feet: mergeZoneGeometries([1, -1].map((side) => createFootGeometry(side))),
    },
    zones: {
      chest: [createChestZoneGeometry()],
      back: [createBackZoneGeometry()],
      shoulders: [createShouldersZoneGeometry()],
      arms: [createArmsZoneGeometry()],
      core: [createCoreZoneGeometry()],
      legs: [createLegsZoneGeometry()],
    },
  }

  return cachedAnatomy
}

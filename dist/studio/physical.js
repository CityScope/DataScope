// Original architectural miniatures. Neighborhood massing is generalized from the
// city planning exhibit for orientation, not a building inventory or engineering plan.
import * as THREE from 'three';
import { site } from '../geography.js';
import { constraintShapes } from './constraints.js';

export const tableBounds = { minX: -780, maxX: 1020, minZ: -850, maxZ: 650 };
const metersLat = 111320;
const metersLng = metersLat * Math.cos((site.center[0] * Math.PI) / 180);
const districtWidth = tableBounds.maxX - tableBounds.minX;
const districtDepth = tableBounds.maxZ - tableBounds.minZ;
const geo = ([lat, lng]) => [(lng - site.center[1]) * metersLng, (site.center[0] - lat) * metersLat];
const feature = ([x, y]) => [(x - 289.4) * 2.09, (y - 390) * 2.13];

function seeded(s) {
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function pitchedRoof() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(0, 1);
  shape.lineTo(0.5, 0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, steps: 1 });
  geometry.translate(0, 0, -0.5);
  return geometry;
}

// Repeated façade pieces, roof equipment, trees and houses are GPU instances.
// The buffers are independent so the entire district and the facility move separately.
function modelParts(group) {
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const cylinder = new THREE.CylinderGeometry(0.5, 0.5, 1, 18);
  const torus = new THREE.TorusGeometry(0.445, 0.055, 6, 20);
  torus.rotateX(-Math.PI / 2);
  const crown = new THREE.IcosahedronGeometry(1, 0);
  const taperedStack = new THREE.CylinderGeometry(0.345, 0.5, 1, 24);
  const wedgeSection = new THREE.Shape();
  wedgeSection.moveTo(-0.5, -0.5);
  wedgeSection.lineTo(0.5, 0.5);
  wedgeSection.lineTo(0.5, -0.5);
  wedgeSection.closePath();
  const shed = new THREE.ExtrudeGeometry(wedgeSection, { depth: 1, bevelEnabled: false });
  shed.translate(0, 0, -0.5);
  shed.rotateY(-Math.PI / 2);
  const gable = pitchedRoof();
  const stamp = new THREE.Object3D();
  const batches = new Map();
  const colors = new Map();
  function add(geometry, material, x, y, z, w, h, d, rotation = 0, fx = 0, fz = 0) {
    const name = geometry.uuid + material;
    let batch = batches.get(name);
    if (!batch) {
      batch = { geometry, material, matrices: [] };
      batches.set(name, batch);
    }
    stamp.position.set(x, y, z);
    stamp.rotation.set(fx, rotation, fz);
    stamp.scale.set(w, h, d);
    stamp.updateMatrix();
    batch.matrices.push(stamp.matrix.clone());
  }
  function stock(color, roughness = 0.82, metalness = 0, glow) {
    const key = color + '|' + roughness + '|' + metalness + '|' + (glow || '');
    if (!colors.has(key))
      colors.set(
        key,
        new THREE.MeshStandardMaterial({
          color,
          roughness,
          metalness,
          ...(glow ? { emissive: glow, emissiveIntensity: 0.43 } : {})
        })
      );
    return key;
  }
  const box = (...a) => add(cube, ...a),
    cyl = (...a) => add(cylinder, ...a);
  const ring = (...a) => add(torus, ...a),
    tree = (...a) => add(crown, ...a),
    roof = (...a) => add(gable, ...a);
  function finish() {
    for (const { geometry, material, matrices } of batches.values()) {
      const mesh = new THREE.InstancedMesh(geometry, colors.get(material), matrices.length);
      matrices.forEach((mat, i) => mesh.setMatrixAt(i, mat));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }
  return {
    box,
    cyl,
    ring,
    tree,
    roof,
    stock,
    finish,
    taper: (...a) => add(taperedStack, ...a),
    wedge: (...a) => add(shed, ...a)
  };
}

// The three architectural studies keep the same working footprint. Their equipment
// illustrates cooling principles; it is not an inventory from a construction drawing.
const equipmentKeys = {
  reference: [
    ['Cooling tower cells', -3.7, 16.6, -28.5],
    ['Cooling-water headers', -17.7, 5.05, 7]
  ],
  efficient: [
    ['Air-side economizers', 6, 16.1, -25.5],
    ['Heat exchanger gallery', -17, 6.2, 14]
  ],
  dry: [
    ['V-bank dry coolers', -7.0, 15.1, -25.2],
    ['Air-cooled fan array', 11.05, 17.63, 18.07]
  ]
};
const envelopes = {
  reference: {
    cladding: '#b9ccd2',
    frame: '#476477',
    equipment: '#56869e',
    trim: '#eaece5',
    pipe: '#d2a453'
  },
  efficient: {
    cladding: '#afc5b1',
    frame: '#3f625b',
    equipment: '#73a591',
    trim: '#f4f0d8',
    pipe: '#bf965c'
  },
  dry: { cladding: '#c9b4a5', frame: '#775447', equipment: '#ac6949', trim: '#e7e3d7', pipe: '#84aaa6' }
};

export function createFacility(design = 'reference') {
  if (!Object.hasOwn(envelopes, design)) design = 'reference';
  const group = new THREE.Group();
  group.name = 'Movable data center';
  const { box: b, cyl, ring, taper, wedge, stock, finish } = modelParts(group);
  const colors = envelopes[design];
  const wall = stock(colors.cladding, 0.77),
    trim = stock(colors.trim, 0.56, 0.13);
  const frame = stock(colors.frame, 0.59, 0.21),
    enamel = stock(colors.equipment, 0.48, 0.24);
  const gutter = stock('#3b525d', 0.68, 0.14),
    metal = stock('#b7c8c7', 0.52, 0.34);
  const pipe = stock(colors.pipe, 0.55, 0.23),
    rail = stock('#d8c198', 0.55, 0.19);
  const glass = stock('#264e5b', 0.25, 0.32),
    litGlass = stock('#8aa9a5', 0.34, 0.24);
  const warmGlass = stock('#bba982', 0.38, 0.14),
    blade = stock('#92a6ab', 0.56, 0.24);
  const dark = stock('#283940', 0.8, 0.12),
    roof = stock('#808988', 0.86, 0.08);
  const base = stock('#97a09c', 0.93),
    apron = stock('#6a7472', 0.94);
  const stripe = stock('#ece8cf', 0.86),
    fluorescent = stock('#f4dc9b', 0.41, 0.1, '#aa813c');
  // A removable pad, masonry plinth and inset low office keep a human scale.
  b(dark, 0, 0.1, 0, 46, 0.2, 90);
  b(apron, 0, 0.24, 0, 45.8, 0.14, 89.8);
  b(base, 5, 0.57, -6, 34.1, 0.55, 71.1);
  b(frame, 5, 1.55, -6, 33.6, 1.52, 70.5);
  b(wall, 5, 5.98, -6, 33.15, 7.75, 70.25);
  b(dark, 5, 9.99, -6, 33.7, 0.36, 70.8);
  b(roof, 5, 10.22, -6, 33.45, 0.24, 70.6);
  for (const side of [-1, 1]) {
    const x = 5 + side * 16.62;
    b(frame, x, 9.35, -6, 0.3, 0.64, 70.4);
    b(trim, x, 10.6, -6, 0.42, 0.8, 70.9);
    b(trim, 5, 10.6, -6 + side * 35.27, 32.79, 0.8, 0.42);
    for (let z = -37.9, i = 0; z < 28; z += 6.3, i++) {
      // Panel joints, over-sailing vertical fins and recessed high clerestory.
      b(frame, x + side * 0.16, 5.75, z, 0.14, 7.2, 0.13);
      b(trim, x + side * 0.35, 5.83, z - 0.18, 0.64, 7.42, 0.17);
      b(glass, x + side * 0.11, 8.42, z + 2.75, 0.12, 0.85, 5.2);
      b(litGlass, x + side * 0.19, 8.48, z + 1.15, 0.08, 0.67, 1.8);
      if (i % 2 === 0) {
        b(dark, x + side * 0.15, 4.33, z + 2.75, 0.14, 2.75, 4.7);
        for (let k = 0; k < 6; k++)
          b(metal, x + side * 0.27, 3.17 + k * 0.45, z + 2.75, 0.21, 0.11, 4.48);
      }
    }
  }
  for (let x = -9.5; x <= 21; x += 1.93) b(metal, x, 10.38, -6, 0.1, 0.1, 69.6);
  for (let z = -37; z < 29; z += 8.2) b(gutter, 5, 10.39, z, 32.5, 0.06, 0.13);
  for (const x of [-4, 7.1, 16.5]) {
    b(dark, x, 3.16, -41.21, 4.2, 4.5, 0.22);
    for (let y = 1.11; y < 5.45; y += 0.43) b(metal, x, y, -41.36, 3.75, 0.18, 0.11);
    b(fluorescent, x, 5.79, -41.41, 2.25, 0.23, 0.16);
  }
  // South-facing administrative wing with recessed glazing, irregular warm panes,
  // laminated sunshades, a deep canopy and a narrow illuminated entrance band.
  b(base, 4.25, 0.52, 33.8, 35.25, 0.72, 17.4);
  b(glass, 4.25, 4.05, 33.55, 34.43, 6.47, 16.25);
  b(wall, 4.25, 1.23, 33.54, 34.63, 0.91, 16.47);
  for (let x = -11.15, i = 0; x < 21.2; x += 2.77, i++) {
    b(metal, x, 4.4, 41.77, 0.15, 5.51, 0.2);
    if (i % 4 !== 1) b(i % 4 === 0 ? warmGlass : litGlass, x + 1.31, 5.77, 41.73, 2.48, 1.58, 0.15);
    if (i % 3 !== 0) b(enamel, x + 0.05, 5.05, 42.16, 0.15, 3.91, 0.93);
  }
  for (let z = 26.3; z < 41.3; z += 2.8) {
    b(metal, -13.03, 4.45, z, 0.16, 5.46, 0.16);
    b(litGlass, -13.01, 5.8, z + 1.32, 0.16, 1.55, 2.53);
  }
  b(frame, 4.25, 7.28, 33.55, 35.12, 0.52, 16.97);
  b(trim, 4.25, 7.61, 33.55, 35.4, 0.29, 17.28);
  b(roof, 4.25, 7.8, 33.55, 34.72, 0.12, 16.65);
  // Low daylight monitors bring a different scale to the public-facing wing.
  for (const x of [-4.35, 9.2]) {
    b(frame, x, 8.03, 34.42, 7.75, 0.29, 4.4);
    wedge(metal, x, 8.62, 34.42, 7.36, 0.83, 4.05);
    const tilt = -Math.atan(0.83 / 4.05);
    b(glass, x, 8.74, 34.42, 7.44, 0.11, 4.18, 0, tilt);
    for (const dx of [-2.46, 0, 2.46]) b(litGlass, x + dx, 8.82, 34.42, 2.22, 0.055, 3.87, 0, tilt);
    b(trim, x, 9.18, 36.49, 7.65, 0.14, 0.22);
  }
  for (const side of [-1, 1]) b(trim, 4.25 + side * 17.3, 7.97, 33.55, 0.22, 0.44, 16.89);
  for (let x = -11.1; x < 20; x += 3.16) b(metal, x, 7.88, 33.55, 0.09, 0.08, 16.25);
  b(metal, 4.25, 5.03, 41.84, 34.38, 0.12, 0.19);
  b(enamel, -4.43, 4.24, 42.91, 13.11, 0.26, 3.94);
  b(trim, -4.43, 4.42, 42.91, 13.36, 0.16, 4.08);
  for (const x of [-10.42, 1.56]) b(frame, x, 2.26, 44.4, 0.24, 3.83, 0.24);
  b(fluorescent, -4.35, 3.46, 41.9, 6.25, 0.18, 0.16);

  function fan(x, y, z, diameter) {
    cyl(dark, x, y, z, diameter, 0.15, diameter);
    ring(metal, x, y + 0.17, z, diameter, 0.94, diameter);
    for (let i = 0; i < 7; i++) {
      const a = i * ((Math.PI * 2) / 7) + 0.31;
      b(
        blade,
        x + Math.sin(a) * diameter * 0.22,
        y + 0.105,
        z + Math.cos(a) * diameter * 0.22,
        diameter * 0.14,
        0.12,
        diameter * 0.333,
        a + 0.54
      );
    }
    cyl(trim, x, y + 0.22, z, diameter * 0.16, 0.2, diameter * 0.16);
  }
  function pipeZ(mat, x, y, z, size, length) {
    cyl(mat, x, y, z, size, length, size, 0, Math.PI / 2);
  }
  function railZ(x, y, z, len, tint = rail) {
    for (let k = -len / 2; k <= len / 2; k += 3) b(frame, x, y + 0.6, z + k, 0.12, 1.2, 0.12);
    for (const h of [0.55, 1.23]) b(tint, x, y + h, z, 0.13, 0.12, len);
  }
  // The west-side yard is part of all three design studies.
  b(base, -17.35, 0.48, -6, 10.15, 0.35, 69.35);
  for (const z of [-37, -18, 1, 20]) {
    for (let x = -20.8; x < -14; x += 1.02) b(stripe, x, 0.67, z, 0.37, 0.04, 2, 0.52);
  }
  for (let z = -39; z < 28; z += 3.7) b(frame, -22.15, 1.42, z, 0.22, 2.26, 0.22);
  for (const h of [0.9, 1.36, 1.85, 2.35]) b(metal, -22.15, h, -6, 0.18, 0.13, 66.4);

  if (design === 'reference') {
    // Banked evaporative cooling cells. The sloping fan stacks and blue casings
    // give the reference facility a recognizable, stepped roof profile.
    for (const x of [-3.7, 11.0]) {
      for (const z of [-28.5, -11.7, 5.1, 19.0]) {
        b(dark, x, 10.72, z, 8.6, 0.63, 9.6);
        b(enamel, x, 12.5, z, 8.75, 3.2, 9.35);
        for (const s of [-1, 1]) {
          b(dark, x + s * 4.42, 12.48, z, 0.14, 2.39, 8.48);
          for (let n = 0; n < 5; n++) b(metal, x + s * 4.52, 11.5 + n * 0.47, z, 0.21, 0.15, 8.26);
        }
        b(trim, x, 14.2, z, 9.05, 0.27, 9.65);
        taper(trim, x, 15.08, z, 7.8, 1.63, 7.8);
        cyl(enamel, x, 16.02, z, 5.36, 0.43, 5.36);
        fan(x, 16.3, z, 4.85);
      }
    }
    b(gutter, 3.2, 10.81, -7, 3.7, 0.66, 60);
    for (const x of [2.6, 3.9]) pipeZ(pipe, x, 11.39, -7, 0.74, 60);
    for (let z = -35; z < 23; z += 7) b(trim, 3.24, 11.91, z, 2.44, 0.14, 0.23);
    for (const z of [-29, -10, 9]) {
      b(frame, -17.4, 1.43, z, 7.3, 1.4, 12.3);
      for (const x of [-19.1, -15.7]) {
        cyl(enamel, x, 3.86, z, 2.73, 3.8, 2.73);
        cyl(trim, x, 5.8, z, 2.91, 0.22, 2.91);
        ring(metal, x, 2.63, z, 2.93, 1.2, 2.93);
      }
    }
    for (const x of [-17.9, -16.7]) pipeZ(pipe, x, 5.04, -7.5, 0.55, 58);
  } else if (design === 'efficient') {
    // North-light style economizer housings. The high intake face, fixed blades,
    // and sloping enamel roof are modeled as an original workshop illustration.
    for (const z of [-29, -11.1, 6.8, 20.3]) {
      const depth = z > 18 ? 8.5 : 12.4;
      b(gutter, 5, 10.76, z, 29.0, 0.6, depth + 0.75);
      wedge(enamel, 5, 13.51, z, 28.35, 5.1, depth);
      const topZ = z + depth / 2;
      b(glass, 5, 13.6, topZ, 27.86, 4.48, 0.22);
      for (let n = 0; n < 6; n++) b(trim, 5, 11.54 + n * 0.72, topZ + 0.36, 28.6, 0.19, 0.78, 0, -0.22);
      for (const x of [-8.93, -2.02, 5, 12.1, 19]) b(frame, x, 13.62, topZ + 0.29, 0.24, 4.88, 0.61);
      const slope = -Math.atan(5.1 / depth);
      b(enamel, 5, 13.72, z, 28.8, 0.2, Math.hypot(depth, 5.1), 0, slope);
      for (let x = -8.6; x < 19.5; x += 2.32)
        b(trim, x, 13.91, z, 0.105, 0.12, Math.hypot(depth, 5.1), 0, slope);
      b(trim, 5, 16.21, topZ, 29, 0.21, 0.57);
    }
    for (const z of [-27, -6.4, 14]) {
      b(frame, -17.35, 1.06, z, 7.8, 0.73, 15.4);
      b(enamel, -17.35, 3.53, z, 7.15, 4.55, 14.7);
      b(trim, -17.35, 5.91, z, 7.52, 0.31, 15.1);
      for (let k = 0; k < 3; k++) {
        const q = z - 4.8 + k * 4.8;
        b(glass, -20.99, 3.66, q, 0.15, 3.29, 4.19);
        for (let j = 0; j < 4; j++) b(metal, -21.12, 2.33 + j * 0.73, q, 0.2, 0.12, 4.02);
        b(gutter, -17.35, 6.15, q, 4.8, 0.22, 2.37);
      }
    }
    railZ(-12.8, 0.72, -7.6, 61);
  } else {
    // Open trusses carry two long rows of A-frame dry coolers. Paired fin banks
    // are visibly angled and bounded by painted steel uprights at each interval.
    for (const x of [-3.22, 11.05]) {
      for (const dx of [-5.4, 5.4]) {
        b(frame, x + dx, 12.3, -6, 0.33, 0.58, 64.6);
        for (let z = -36; z <= 26; z += 7.3) b(frame, x + dx, 11.42, z, 0.28, 2.04, 0.31);
      }
      for (const z of [-28.6, -7.6, 13.4]) {
        b(dark, x, 12.58, z, 2.6, 0.35, 18.9);
        for (const sign of [-1, 1]) {
          // Outer edges slope out from the central lower manifold to a wide upper deck.
          const xx = x + sign * 3.22;
          b(enamel, xx, 14.5, z, 0.44, 5.87, 19.3, 0, 0, -sign * 0.87);
          for (let q = -9.0; q <= 9.1; q += 0.64)
            b(pipe, xx + sign * 0.21, 14.52, z + q, 0.16, 5.68, 0.1, 0, 0, -sign * 0.87);
          for (const q of [-9.45, 0, 9.45])
            b(trim, xx + sign * 0.26, 14.52, z + q, 0.29, 5.94, 0.3, 0, 0, -sign * 0.87);
          b(trim, x + sign * 5.53, 16.64, z, 0.43, 0.47, 19.65);
        }
        b(frame, x, 16.51, z, 11.12, 0.57, 19.4);
        for (const offset of [-4.67, 4.67]) {
          cyl(enamel, x, 16.99, z + offset, 8.62, 0.62, 8.62);
          fan(x, 17.37, z + offset, 7.82);
        }
      }
    }
    for (let z = -32; z < 21; z += 13.5) {
      b(frame, -17.4, 1.12, z, 6.8, 0.88, 8.3);
      for (const x of [-19, -15.85]) {
        pipeZ(enamel, x, 2.74, z, 2.43, 7.6);
        for (const q of [-2.6, 2.6]) b(trim, x, 1.65, z + q, 2.67, 0.35, 0.33);
      }
      b(pipe, -17.5, 3.08, z + 4.39, 5.6, 0.76, 0.61);
    }
  }
  // A paved entry court, service vehicle and roof access walkway establish scale.
  b(base, -4.2, 0.4, 42.8, 14.2, 0.17, 4.1);
  for (let x = -10.8; x < 3.2; x += 1.62) b(apron, x, 0.493, 42.79, 0.045, 0.019, 3.97);
  for (const x of [-9.4, -7.75, 1.1]) {
    cyl(frame, x, 0.98, 44.25, 0.24, 1.0, 0.24);
    cyl(fluorescent, x, 1.36, 44.25, 0.26, 0.12, 0.26);
  }
  for (let z = 28.8; z < 44; z += 2.75) {
    b(stripe, -17.74, 0.33, z, 7.28, 0.035, 0.1);
    b(base, -21.0, 0.54, z + 1.35, 0.49, 0.38, 1.73);
  }
  const x = -17.1,
    z = 37.86;
  b(dark, x, 0.66, z, 4.65, 0.52, 1.8);
  b(trim, x, 1.24, z, 4.76, 0.85, 1.86);
  b(glass, x + 0.33, 1.92, z, 2.74, 0.64, 1.71);
  b(trim, x + 0.32, 2.29, z, 2.61, 0.14, 1.74);
  for (const dx of [-1.47, 1.48])
    for (const dz of [-0.88, 0.88]) cyl(dark, x + dx, 0.75, z + dz, 0.69, 0.19, 0.69, 0, Math.PI / 2);
  for (let x = 6.3; x < 18; x += 1.47) b(stripe, x, 0.34, 43.21, 0.58, 0.045, 3);
  group.userData.illustrative = true;
  group.userData.equipment = equipmentKeys[design];
  return finish();
}

export function createDistrict({ print = false } = {}) {
  const group = new THREE.Group();
  group.name = 'Generalized Allen Park architectural study';
  group.userData.bounds = tableBounds;
  const { box: b, tree, roof: gable, cyl, stock, finish } = modelParts(group);
  const random = seeded(8536);
  const { minX, maxX, minZ, maxZ } = tableBounds;
  const inside = (x, z, pad = 6) =>
    x >= minX + pad && x <= maxX - pad && z >= minZ + pad && z <= maxZ - pad;
  const paper = document.createElement('canvas');
  paper.width = 2304;
  paper.height = 1920;
  const ctx = paper.getContext('2d');
  const sx = paper.width / districtWidth,
    sy = paper.height / districtDepth;
  ctx.setTransform(sx, 0, 0, sy, -minX * sx, -minZ * sy);
  function path(points, closed) {
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    points.slice(1).forEach((p) => ctx.lineTo(...p));
    if (closed) ctx.closePath();
  }
  function fill(points, color) {
    ctx.fillStyle = color;
    path(points, true);
    ctx.fill();
  }
  function line(points, color, width, dash = []) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.setLineDash(dash);
    path(points, false);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.fillStyle = '#c2c1aa';
  ctx.fillRect(minX, minZ, districtWidth, districtDepth);
  function disk(x, z, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, z, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const pine = stock('#517969', 0.98),
    moss = stock('#91a77b', 0.99),
    sage = stock('#adba85', 0.99);
  const leaf = stock('#729578', 0.97),
    trunk = stock('#7e725b', 0.99);
  const walls = ['#c9cbb4', '#dfc9aa', '#c4baa4', '#aabcb6'].map((c) => stock(c, 0.95));
  const roofs = ['#798f8c', '#8b9c93', '#a2917e', '#6d8182'].map((c) => stock(c, 0.91));
  const steel = stock('#8e9c9c', 0.7, 0.14),
    concrete = stock('#a1aaa4', 0.95),
    slab = stock('#788680', 0.93);
  const ink = stock('#36494c', 0.83),
    cream = stock('#b7bbae', 0.9);
  const corner = (minX + maxX) / 2,
    mid = (minZ + maxZ) / 2;
  const plinth = new THREE.Group();
  if (!print) {
    const edge = modelParts(plinth);
    edge.box(edge.stock('#718480'), corner, -23, mid, districtWidth - 8, 8, districtDepth - 8);
    edge.box(edge.stock('#c2bba0'), corner, -18, mid, districtWidth - 2, 2, districtDepth - 2);
    edge.box(edge.stock('#a5a28d'), corner, -8.55, mid, districtWidth, 16.9, districtDepth);
    edge.finish();
    group.add(plinth);
  }
  group.userData.plinth = plinth;

  const riverLine = constraintShapes.river;
  const parcel = site.boundary.map(geo);
  const roads = [];
  function corridor(points, width, arterial = false) {
    roads.push({ points, width, arterial });
  }
  function distSegment(x, z, a, b) {
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      t = THREE.MathUtils.clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
  }
  function nearRoute(x, z, pts, r) {
    return pts.some((p, i) => i && distSegment(x, z, pts[i - 1], p) < r);
  }
  function inPoly(x, z, poly) {
    let yes = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, zi] = poly[i],
        [xj, zj] = poly[j];
      if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) yes = !yes;
    }
    return yes;
  }
  // The table axes come from north-up published plan and the municipal study map.
  function shiftPath(points, offset) {
    return points.map((p, i) => {
      const a = points[Math.max(0, i - 1)],
        b = points[Math.min(points.length - 1, i + 1)];
      const dx = b[0] - a[0],
        dz = b[1] - a[1],
        l = Math.hypot(dx, dz);
      return [p[0] - (dz / l) * offset, p[1] + (dx / l) * offset];
    });
  }
  const freeway = constraintShapes.freeway;
  // Rail alignments bracket the triangle and join to the northeast.
  const railwayNorth = constraintShapes.railNorth;
  const railwayEast = constraintShapes.railEast;
  const enterprise = constraintShapes.enterprise;
  corridor(enterprise, 9, true);
  const north = feature([454, 325]);
  const cos = 0.856,
    sin = 0.517;
  function block(u, v) {
    return [north[0] + u * cos - v * sin, north[1] + u * sin + v * cos];
  }
  const blockAngle = -Math.atan2(sin, cos);
  const districtBlock = [block(-26, -9), block(886, -9), block(886, 1288), block(-24, 1288)];
  fill(districtBlock, '#b7bd9e');
  const parkPlane = constraintShapes.park;
  fill(parkPlane, '#aac293');
  line(parcel, '#a8a17f', 5);
  fill(parcel, '#d4cfad');
  // Topographic paper with a restrained stipple, slight textural variation and
  // a thin edge around the undeveloped parcel. Neutral tones leave room for
  // the analytical overlays. The site path is traced from the city exhibit.
  const noise = (x, z, scale) =>
    0.5 +
    0.23 * Math.sin(x / scale + Math.cos(z / scale)) +
    0.15 * Math.cos(z / scale + Math.sin((0.6 * x) / scale));
  ctx.save();
  path(parcel, true);
  ctx.clip();
  ctx.fillStyle = '#d4cfad';
  ctx.fillRect(-490, -480, 980, 960);
  const herbs = seeded(14521);
  for (let i = 0; i < 5800; i++) {
    const x = -239 + herbs() * 469,
      z = -212 + herbs() * 430;
    const r = herbs();
    if (noise(x, z, 17) > 0.54)
      line(
        [
          [x, z],
          [x + 0.55 + r * 0.6, z - 0.25]
        ],
        'rgba(116,123,86,.24)',
        0.31
      );
  }
  const swale = [
    [275, 439],
    [279, 432],
    [285, 422],
    [290, 419],
    [295, 421],
    [295, 425],
    [290, 437],
    [284, 445]
  ].map(feature);
  line(swale, '#c1b998', 5);
  line(swale, '#ddd1b0', 2.2);
  ctx.restore();

  // Existing river corridor vegetation is stylized; keep a clean water channel.
  line(riverLine, '#9cba9a', 59);
  line(riverLine, '#b1c6a4', 35);
  line(riverLine, '#d7d2ab', 22);
  line(riverLine, '#6faba8', 16);
  line(shiftPath(riverLine, 5), '#a7d4c7', 1.2);
  for (let i = 0; i < 9; i++) {
    const v = i * 74;
    corridor([block(-4, v), block(1100, v)], 6.5);
  }
  for (let j = 0; j < 7; j++) {
    const u = j * 177;
    corridor([block(u, -4), block(u, 1380)], j === 3 ? 10 : 6.9);
  }
  for (let i = 9; i < 20; i++) corridor([block(-240, i * 74), block(1100, i * 74)], 6.6);
  // Western residential envelope, cut by I-94; more distant rows stay quiet.
  const westOrigin = feature([-108, 180]);
  const cw = 0.864,
    sw = 0.504;
  function west(u, v) {
    return [westOrigin[0] + cw * u - sw * v, westOrigin[1] + sw * u + cw * v];
  }
  const westMask = [
    feature([-500, 230]),
    feature([-200, -200]),
    feature([470, -120]),
    feature([326, 70]),
    feature([183, 179]),
    feature([71, 241]),
    feature([-100, 344])
  ];
  fill(westMask, '#b2b89d');
  for (let u = 0; u < 1180; u += 165) {
    const pts = [west(u, -900), west(u, 470)]; // clip against the neighborhood polygon when painted
    roads.push({ points: pts, width: 7, mask: westMask });
  }
  for (let v = -850; v < 520; v += 70)
    roads.push({ points: [west(-800, v), west(1250, v)], width: 6.5, mask: westMask });
  function lot(x, z, w, d, angle, color) {
    ctx.save();
    ctx.translate(x, z);
    ctx.rotate(-angle);
    ctx.fillStyle = color;
    ctx.fillRect(-w / 2, -d / 2, w, d);
    ctx.restore();
  }
  function house(x, z, angle) {
    if (!inside(x, z, 12)) return;
    const w = 9 + random() * 3.2,
      d = 11 + random() * 3.7,
      h = 3.7 + random() * 1.8;
    const mat = walls[Math.floor(random() * walls.length)],
      top = roofs[Math.floor(random() * roofs.length)];
    lot(x, z, w + 2, d + 2, angle, '#aeb29a');
    b(mat, x, h / 2 + 0.1, z, w, h, d, angle);
    gable(top, x, h + 0.05, z, w + 0.7, 1.9 + random() * 0.9, d + 0.7, angle);
    // Street-facing front doors, inset sash windows and porch in the detailed
    // part of the study. Distant rows use the quiet two-piece massing.
    if (Math.abs(x) < 635 && Math.abs(z) < 580) {
      const c = Math.cos(angle),
        sn = Math.sin(angle);
      function detail(a, q, y, width, height, depth, material) {
        b(material, x + a * c + q * sn, y, z - a * sn + q * c, width, height, depth, angle);
      }
      detail(-w * 0.18, d * 0.5 + 0.05, 1.15, 1.08, 2.2, 0.12, ink);
      for (const u of [-w * 0.36, w * 0.09, w * 0.34])
        detail(u, d * 0.5 + 0.08, 2.45, 1.1, 1.15, 0.13, roofs[3]);
      detail(-w * 0.18, d * 0.5 + 0.65, 0.22, 2.2, 0.33, 1.4, concrete);
    }
    if (random() < 0.23) {
      const ds = 3.5 + random() * 2;
      b(mat, x + w * 0.27, 2, z + d * 0.46, ds, 3.7, ds, angle);
    }
    if (random() < 0.27) b(ink, x + 1.1, h + 1.4, z + 2, 1.05, 2.4, 1.2, angle);
  }
  function canopy(x, z, r, style) {
    if (!inside(x, z, r)) return;
    const m = style || [pine, leaf, moss, sage][Math.floor(random() * 4)];
    const h = 2.15 + r * 0.55;
    const form = random();
    if (form < 0.31) {
      cyl(trunk, x, h * 0.62, z, 0.49 + r * 0.12, h * 1.22, 0.49 + r * 0.12);
      tree(m, x, h + r * 0.71, z, r * 0.75, r * 1.38, r * 0.7, random() * 6.28);
      return;
    }
    cyl(trunk, x, h * 0.49, z, 0.55 + r * 0.1, h, 0.55 + r * 0.1);
    tree(m, x, h + r * 0.56, z, r * 1.05, r * (0.92 + random() * 0.38), r, random() * 6.28);
    if (r > 4.6)
      tree(m, x + r * 0.54, h + r * 0.29, z - r * 0.13, r * 0.68, r * 0.76, r * 0.64, random() * 5);
    disk(x - r * 0.16, z + r * 0.2, r * 1.17, 'rgba(24,42,36,.09)');
    disk(x - r * 0.2, z + r * 0.25, r * 0.91, 'rgba(24,42,36,.18)');
  }
  function houseRows(convert, angle, allowed, cols, rowMin, rowMax, spacing, street) {
    for (let j = 0; j < cols; j++)
      for (let i = rowMin; i <= rowMax; i++) {
        const from = j * spacing,
          v = i * street;
        for (let k = 0; k < 8; k++)
          for (const sign of [-1, 1]) {
            const u = from + 16 + (k * (spacing - 32)) / 7 + (random() - 0.5) * 2.3;
            const y = v + sign * (14 + random() * 3);
            const [x, z] = convert(u, y);
            if (!allowed(x, z)) continue;
            house(x, z, angle);
            const [tx, tz] = convert(u + 5, y + sign * 9.8);
            if (random() < 0.72) canopy(tx, tz, 2.5 + random() * 2.2);
            const a = convert(u - 5, y - sign * 4),
              e = convert(u - 5, v);
            line([a, e], '#cecfb7', 2.2);
          }
      }
  }
  const eastOkay = (x, z) =>
    inside(x, z, 12) && !nearRoute(x, z, railwayEast, 15) && !nearRoute(x, z, riverLine, 27);
  houseRows(block, blockAngle, eastOkay, 7, 0, 16, 177, 74);
  houseRows(
    west,
    -Math.atan2(sw, cw),
    (x, z) => inside(x, z, 14) && inPoly(x, z, westMask),
    8,
    -13,
    8,
    165,
    70
  );

  function industrial(px, py, w, d, angle, h, tint = cream) {
    const [x, z] = feature([px, py]);
    if (!inside(x, z)) return;
    const c = Math.cos(angle),
      s = Math.sin(angle);
    function local(a, q) {
      return [x + a * c + q * s, z - a * s + q * c];
    }
    lot(x, z, w + 29, d + 30, angle, '#b3b1a0');
    b(slab, x, 0.35, z, w + 2, 0.7, d + 2, angle);
    b(tint, x, h / 2 + 0.71, z, w, h, d, angle);
    b(ink, x, h + 0.76, z, w + 0.4, 0.37, d + 0.4, angle);
    b(roofs[1], x, h + 1.14, z, w + 0.8, 0.55, d + 0.8, angle);
    for (let i = -w / 2 + 7; i < w / 2; i += 13) {
      const p = local(i, 0);
      b(steel, p[0], h + 1.48, p[1], 0.21, 0.14, d, angle);
    }
    for (let i = -w * 0.32; i < w * 0.4; i += 21) {
      const [a, q] = local(i, d * 0.16);
      b(steel, a, h + 2.29, q, 5.5, 1.65, 5.6, angle);
      cyl(ink, a, h + 3.19, q, 2.4, 0.16, 2.4);
    }
    for (let i = -w * 0.4; i < w * 0.44; i += 12) {
      const [a, q] = local(i, d / 2 + 0.1);
      b(ink, a, h * 0.42, q, 3.6, h * 0.64, 0.21, angle);
    }
  }
  industrial(184, 505, 58, 59, 0.51, 7);
  industrial(148, 535, 42, 102, 0.5, 8);
  industrial(76, 522, 105, 143, 0.46, 8);
  industrial(59, 439, 33, 48, 0.48, 6);
  industrial(636, 179, 176, 56, 0.31, 9);
  industrial(673, 266, 42, 105, 0.45, 9);
  industrial(530, 106, 85, 82, 0.38, 7);
  industrial(581, 77, 44, 53, 0.32, 8);
  industrial(17, 608, 132, 126, 0.43, 9);
  industrial(519, -11, 119, 70, 0.34, 8);
  industrial(804, 49, 46, 61, 0.35, 7);
  // Detached masses on the school and senior-housing sites are illustrative.
  industrial(455, 86, 49, 65, -0.38, 8.8, walls[1]);
  industrial(472, 92, 45, 38, -0.38, 7.5, walls[1]);
  industrial(653, 343, 43, 25, 0.36, 12.5, walls[1]);
  // Park ball diamond and field use authored geometries rather than cached imagery.
  const [parkX, parkZ] = feature([359, 431]);
  ctx.save();
  ctx.translate(parkX, parkZ);
  ctx.rotate(0.28);
  ctx.fillStyle = '#c5a072';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, 17, -Math.PI * 0.8, -Math.PI * 0.3);
  ctx.closePath();
  ctx.fill();
  line(
    [
      [0, 0],
      [-7, -12],
      [1, -19],
      [8, -9],
      [0, 0]
    ],
    '#c5c1a0',
    0.65
  );
  ctx.restore();
  const parkLoop = [
    feature([353, 446]),
    feature([368, 418]),
    feature([381, 398]),
    feature([386, 391]),
    feature([402, 373])
  ];
  line(parkLoop, '#dfd3b0', 2.2);
  // A grass playing surface and small-scale fixtures distinguish the park
  // from a colored land-use polygon in the physical workshop model.
  ctx.save();
  path(parkPlane, true);
  ctx.clip();
  const parkRandom = seeded(983);
  for (let i = 0; i < 2100; i++) {
    const [x, z] = feature([327 + parkRandom() * 120, 304 + parkRandom() * 158]);
    const v = parkRandom();
    disk(x, z, 0.4 + v * 0.8, v > 0.5 ? 'rgba(191,190,145,.21)' : 'rgba(49,83,68,.16)');
  }
  ctx.restore();
  const trail = parkLoop;
  for (const [x, z] of [trail[1], trail[3]]) {
    b(ink, x + 1, 0.5, z, 2.7, 0.18, 0.55, 0.6);
    b(steel, x + 1, 0.91, z - 0.2, 2.75, 0.59, 0.1, 0.6);
    b(concrete, x + 0.1, 0.28, z, 0.21, 0.55, 0.3);
    b(concrete, x + 2, 0.28, z, 0.21, 0.55, 0.3);
  }
  const fence = stock('#839089', 0.84, 0.14);
  for (let i = 0; i < 13; i++) {
    const ang = -Math.PI * 0.8 + i * ((Math.PI * 0.5) / 12);
    const x = parkX + Math.cos(ang) * 26,
      z = parkZ + Math.sin(ang) * 26;
    cyl(fence, x, 1.05, z, 0.12, 2.1, 0.12);
    if (i < 12) {
      const next = ang + (Math.PI * 0.5) / 12;
      const nx = parkX + Math.cos(next) * 26,
        nz = parkZ + Math.sin(next) * 26;
      const yaw = -Math.atan2(nz - z, nx - x);
      b(fence, (x + nx) / 2, 1.91, (z + nz) / 2, Math.hypot(nx - x, nz - z), 0.085, 0.085, yaw);
    }
  }
  for (const [a, q] of [
    [-7, -12],
    [1, -19],
    [8, -9]
  ])
    b(cream, parkX + a, 0.06, parkZ + q, 0.48, 0.1, 0.48, 0.8);
  const forestPolys = [
    [
      feature([361, 239]),
      feature([468, 165]),
      feature([493, 114]),
      feature([527, 148]),
      feature([538, 180]),
      feature([463, 219]),
      feature([388, 269])
    ],
    [
      feature([191, 264]),
      feature([284, 198]),
      feature([351, 119]),
      feature([402, 77]),
      feature([455, 26]),
      feature([411, 132]),
      feature([332, 221]),
      feature([275, 255])
    ],
    [
      feature([242, 343]),
      feature([285, 330]),
      feature([355, 317]),
      feature([299, 337]),
      feature([246, 358])
    ],
    [
      feature([318, 424]),
      feature([338, 379]),
      feature([377, 319]),
      feature([387, 306]),
      feature([342, 397]),
      feature([310, 442])
    ],
    [
      feature([395, 289]),
      feature([432, 220]),
      feature([484, 149]),
      feature([485, 180]),
      feature([446, 244]),
      feature([413, 285])
    ]
  ];
  for (const poly of forestPolys) {
    fill(poly, '#a2b48d');
    const xs = poly.map((q) => q[0]),
      zs = poly.map((q) => q[1]);
    for (let x = Math.min(...xs); x < Math.max(...xs); x += 9) {
      for (let z = Math.min(...zs); z < Math.max(...zs); z += 10) {
        if (random() < 0.24) continue;
        const a = x + random() * 10 - 2,
          q = z + random() * 11 - 2;
        if (inPoly(a, q, poly) && !nearRoute(a, q, riverLine, 10)) canopy(a, q, 3.7 + random() * 3.9);
      }
    }
  }
  for (let i = 0; i < riverLine.length - 1; i++) {
    const p = riverLine[i],
      q = riverLine[i + 1],
      dx = q[0] - p[0],
      dz = q[1] - p[1],
      l = Math.hypot(dx, dz);
    for (let t = 0; t < l; t += 9) {
      const k = t / l,
        side = (random() > 0.48 ? 1 : -1) * (12 + random() * 13);
      const x = p[0] + dx * k - (dz / l) * side,
        z = p[1] + dz * k + (dx / l) * side;
      if (
        !nearRoute(x, z, freeway, 33) &&
        !nearRoute(x, z, railwayNorth, 12) &&
        !nearRoute(x, z, railwayEast, 12)
      )
        canopy(x, z, 3.3 + random() * 3.6);
    }
  }
  for (let i = 0; i < 37; i++) {
    const [x, z] = feature([346 + random() * 88, 318 + random() * 135]);
    if (inPoly(x, z, parkPlane) && !nearRoute(x, z, parkLoop, 7)) canopy(x, z, 3.5 + random() * 3.4);
  }
  // Low clusters of scrub and small meadow plants inside the undeveloped
  // parcel. Leave the central model footprint clear in the reference arrangement.
  const scrub = seeded(28611);
  for (let i = 0; i < 770; i++) {
    const x = -226 + scrub() * 447,
      z = -203 + scrub() * 409;
    if (!inPoly(x, z, parcel) || (Math.abs(x) < 26 && Math.abs(z) < 47)) continue;
    const patch = noise(x, z, 21) * 0.62 + noise(x, z, 7) * 0.38;
    if (patch < 0.57) continue;
    const r = 0.4 + scrub() * (patch > 0.72 ? 2.15 : 1.35),
      m = patch > 0.74 ? pine : scrub() < 0.65 ? moss : leaf;
    tree(m, x, r * 0.23, z, r * 1.17, r * 0.6, r * 0.85, scrub() * 6.28);
    if (patch > 0.72 && scrub() > 0.55)
      tree(m, x + r * 0.61, r * 0.18, z + r * 0.12, r * 0.8, r * 0.45, r * 0.61, scrub() * 4);
    disk(x, z + r * 0.18, r, 'rgba(46,72,49,.24)');
  }
  // Two-lane and local street centerlines, parking and multi-track rail ballast.
  for (const r of roads) {
    ctx.save();
    if (r.mask) {
      path(r.mask, true);
      ctx.clip();
    }
    line(r.points, '#d7d1b9', r.width + 4);
    line(r.points, '#a8ada2', r.width);
    if (r.arterial) line(r.points, '#c0b797', 0.36, [2.1, 3.5]);
    ctx.restore();
  }
  function rail(points, tracks) {
    line(points, '#a49f88', tracks * 4.6 + 5);
    for (let i = 0; i < tracks; i++) {
      const ax = shiftPath(points, (i - (tracks - 1) / 2) * 4.7);
      line(ax, '#7c8076', 3.05, [0.52, 1.65]);
      for (const d of [-0.74, 0.74]) line(shiftPath(ax, d), '#a3ada5', 0.3);
    }
  }
  rail(railwayNorth, 2);
  rail(railwayEast, 2);
  // Actual rail centerlines have a raised dark ballast bed, ties and paired
  // rails in the local site model. The long drawing is clipped by the renderer.
  const ballast = stock('#b0a78e', 0.96),
    tie = stock('#837d6b', 0.94),
    iron = stock('#b5b8ad', 0.68, 0.22);
  for (const track of [railwayNorth, railwayEast]) {
    for (let i = 1; i < track.length; i++) {
      const a = track[i - 1],
        q = track[i],
        dx = q[0] - a[0],
        dz = q[1] - a[1],
        len = Math.hypot(dx, dz),
        yaw = -Math.atan2(dz, dx);
      for (let l = 1; l < len; l += 2.35) {
        const x = a[0] + (dx * l) / len,
          z = a[1] + (dz * l) / len;
        if (!inside(x, z, 7)) continue;
        b(ballast, x, 0.17, z, 2.32, 0.3, 9.7, yaw);
        for (const off of [-2.35, 2.35]) {
          const mx = x - (dz * off) / len,
            mz = z + (dx * off) / len;
          b(tie, mx, 0.36, mz, 0.54, 0.16, 3, yaw);
          for (const sd of [-0.74, 0.74])
            b(iron, mx - (dz / len) * sd, 0.52, mz + (dx / len) * sd, 2.31, 0.14, 0.15, yaw);
        }
      }
    }
  }
  line(freeway, '#b4b796', 58);
  for (const side of [-1, 1]) {
    const midline = shiftPath(freeway, side * 15);
    line(midline, '#c0c1aa', 19.4);
    line(midline, '#929c95', 17.1);
    for (const d of [-3.5, 3.5]) line(shiftPath(midline, d), '#c5c8b9', 0.3, [3.5, 8]);
    line(shiftPath(midline, side * 7.4), '#c4c4b4', 0.32);
    line(shiftPath(midline, -side * 7.6), '#bdb28c', 0.35);
  }
  // Printed curbs and occasional light standards mark Enterprise Drive.
  // Keep long curbs out of the turning head at the north end of the frontage.
  const curbStock = stock('#cfccb4', 0.96);
  for (let i = 1; i < enterprise.length; i++) {
    const a = enterprise[i - 1],
      q = enterprise[i],
      dx = q[0] - a[0],
      dz = q[1] - a[1],
      len = Math.hypot(dx, dz),
      yaw = -Math.atan2(dz, dx);
    for (let t = 3; t < len - 2.9; t += 6) {
      const xx = a[0] + (dx * t) / len,
        zz = a[1] + (dz * t) / len;
      if (!inside(xx, zz, 6)) continue;
      for (const d of [-4.84, 4.84]) {
        const x = xx - (dz * d) / len,
          z = zz + (dx * d) / len;
        b(curbStock, x, 0.13, z, 5.88, 0.27, 0.31, yaw);
      }
    }
    const edge = shiftPath([a, q], 6.3);
    line(edge, '#bab797', 1.05);
  }
  for (const pt of [
    [205, 411],
    [223, 385],
    [172, 474],
    [148, 519]
  ]) {
    const [x, z] = feature(pt);
    cyl(ink, x, 3.58, z, 0.22, 7.16, 0.22);
    b(ink, x + 0.67, 7.06, z, 1.35, 0.15, 0.18);
    b(walls[2], x + 1.33, 7.0, z, 0.8, 0.19, 0.36);
  }
  // Short vehicle marks make the roadway scale visible from the district camera.
  for (let j = 0; j < freeway.length - 1; j++) {
    const a = freeway[j],
      q = freeway[j + 1],
      dx = q[0] - a[0],
      dz = q[1] - a[1],
      len = Math.hypot(dx, dz),
      angle = -Math.atan2(dz, dx);
    for (let t = 24; t < len - 12; t += 36 + random() * 45) {
      const side = (random() > 0.5 ? 1 : -1) * (12 + random() * 6),
        px = a[0] + (dx * t) / len - (dz / len) * side,
        pz = a[1] + (dz * t) / len + (dx / len) * side;
      if (!inside(px, pz, 9)) continue;
      b(walls[Math.floor(random() * 4)], px, 0.85, pz, 4.2, 1.26, 1.74, angle);
      b(ink, px, 1.61, pz, 2.4, 0.54, 1.47, angle);
    }
  }
  // Occasional registration marks and seam on the physical table edge.
  for (let x = minX + 30; x < maxX - 10; x += 40) {
    line(
      [
        [x, maxZ - 4],
        [x, maxZ - (Math.abs(Math.round(x)) % 200 === 10 ? 11 : 7)]
      ],
      '#968f7e',
      0.75
    );
  }
  const groundTexture = new THREE.CanvasTexture(paper);
  groundTexture.colorSpace = THREE.SRGBColorSpace;
  groundTexture.anisotropy = 8;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(districtWidth, districtDepth),
    new THREE.MeshStandardMaterial({ map: groundTexture, roughness: 0.98, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(corner, 0.025, mid);
  ground.receiveShadow = true;
  group.add(ground);
  return finish();
}

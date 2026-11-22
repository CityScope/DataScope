import {
  sh6Motorway,
  sh6Frontage,
  fitchRoads,
  lakewayRoads,
  localStreets,
  parkPolygons,
  seniorPolygons,
  buildingPolygons
} from './model-data.js';
// Original architectural miniatures for College Station's Midtown Business Park
// corridor. Massing is generalized for neighborhood orientation, not a survey.
import * as THREE from 'three';
import { site } from '../geography.js';
import { constraintShapes } from './constraints.js';
import { resolveCoolingId, resolveIntegrationId, resolveEnergyId } from './analysis.js';

export const tableBounds = { minX: -980, maxX: 1020, minZ: -920, maxZ: 960 };
const metersLat = 111320;
const metersLng = metersLat * Math.cos((site.center[0] * Math.PI) / 180);
const districtWidth = tableBounds.maxX - tableBounds.minX;
const districtDepth = tableBounds.maxZ - tableBounds.minZ;
const geo = ([lat, lng]) => [(lng - site.center[1]) * metersLng, (site.center[0] - lat) * metersLat];

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
  function printed(name, color, width, height, draw, roughness = 0.75) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const pen = canvas.getContext('2d');
    pen.fillStyle = color;
    pen.fillRect(0, 0, width, height);
    draw(pen, width, height);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    map.minFilter = THREE.LinearMipmapLinearFilter;
    colors.set(name, new THREE.MeshStandardMaterial({ map, color: 0xffffff, roughness }));
    return name;
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
    printed,
    wedge: (...a) => add(shed, ...a)
  };
}

const equipmentKeys = {
  t1: [
    ['Evaporative tower cells', -3.7, 16.6, -28.5],
    ['Simsboro cooling headers', -17.7, 5.05, 7]
  ],
  t2: [
    ['V-bank dry coolers', -7.0, 15.1, -25.2],
    ['Closed-loop fan array', 11.05, 17.63, 18.07]
  ],
  t3: [
    ['Hybrid dry/economizer bays', 6, 16.1, -25.5],
    ['Reclaimed-water gallery', -17, 6.2, 14]
  ],
  t4: [
    ['Heat-recovery exchangers', 6, 16.1, -25.5],
    ['District thermal loop', -17, 6.2, 14]
  ]
};

const envelopes = {
  t1: { cladding: '#bacad0', frame: '#476776', equipment: '#54829a', trim: '#e3e9e7', pipe: '#bfaa79' },
  t2: { cladding: '#c2c7c6', frame: '#736657', equipment: '#b18453', trim: '#e7eae4', pipe: '#84aaa6' },
  t3: { cladding: '#b5c7c6', frame: '#4b6d70', equipment: '#64a09b', trim: '#e4eae3', pipe: '#bf965c' },
  t4: { cladding: '#b8c9c4', frame: '#466468', equipment: '#5c9386', trim: '#e6ebe4', pipe: '#c98856' }
};

export function createFacility(coolingInput = 't1', { integration = 'd1', energy = 'e1' } = {}) {
  const cId = resolveCoolingId(coolingInput);
  const iId = resolveIntegrationId(integration);
  const eId = resolveEnergyId(energy);
  const group = new THREE.Group();
  group.name = 'Movable data center';
  const { box: b, cyl, ring, taper, wedge, tree, stock, printed, finish } = modelParts(group);
  const colors = envelopes[cId];
  const wall = stock(colors.cladding, 0.77),
    trim = stock(colors.trim, 0.56, 0.13);
  const frame = stock(colors.frame, 0.59, 0.21),
    enamel = stock(colors.equipment, 0.48, 0.24);
  const gutter = stock('#425966', 0.68, 0.14),
    metal = stock('#b7c8c7', 0.52, 0.34);
  const pipe = stock(colors.pipe, 0.55, 0.23),
    rail = stock('#bcb6a1', 0.55, 0.19);
  const glass = stock('#264e5b', 0.25, 0.32),
    litGlass = stock('#93adad', 0.34, 0.24);
  const warmGlass = stock('#bba982', 0.38, 0.14);
  const dark = stock('#283940', 0.8, 0.12);
  const base = stock('#97a09c', 0.93);
  const fluorescent = stock('#f4dc9b', 0.41, 0.1, '#aa813c');
  const bermEarth = stock('#94ab98', 0.96);
  const canopyDark = stock('#557b6c', 0.95);
  const canopyLight = stock('#789c88', 0.95);
  const trunkMat = stock('#717b72', 0.98);
  const baffleMat = stock('#6b7f82', 0.78, 0.12);
  const baffleTrim = stock('#d4ded8', 0.65, 0.08);
  const civicWood = stock('#b99771', 0.82);
  const civicStone = stock('#d7ddd6', 0.88);
  const plazaStone = stock('#c4cec6', 0.92);

  function membrane(pen, width, height) {
    pen.fillStyle = '#556671';
    for (let x = 28; x < width; x += 42) pen.fillRect(x, 0, 2, height);
    pen.fillStyle = '#92a0a6';
    for (let x = 30; x < width; x += 42) pen.fillRect(x, 0, 2, height);
    pen.fillStyle = '#62717b';
    for (let y = 63; y < height; y += 116) pen.fillRect(0, y, width, 2);
  }
  const roofSkin = printed('Roof membrane', '#7b8991', 512, 1024, membrane);
  const officeSkin = printed('Office membrane', '#7f8c93', 512, 256, membrane);
  const grille = printed('Recessed intake louvers', '#324957', 256, 128, (pen) => {
    for (let y = 11; y < 126; y += 21) {
      pen.fillStyle = '#9aabb0';
      pen.fillRect(5, y, 246, 6);
      pen.fillStyle = '#5a717c';
      pen.fillRect(5, y + 6, 246, 3);
    }
  });
  const fanSkin = printed(
    'Axial fan and guard',
    '#a6b6b8',
    256,
    256,
    (pen) => {
      pen.translate(128, 128);
      function disk(r, color) {
        pen.fillStyle = color;
        pen.beginPath();
        pen.arc(0, 0, r, 0, 2 * Math.PI);
        pen.fill();
      }
      disk(125, '#b9c6c7');
      disk(117, '#415661');
      disk(109, '#273d4b');
      for (let i = 0; i < 7; i++) {
        pen.rotate((2 * Math.PI) / 7);
        pen.fillStyle = '#9bafba';
        pen.beginPath();
        pen.moveTo(-10, 19);
        pen.quadraticCurveTo(-48, 43, -39, 91);
        pen.quadraticCurveTo(-14, 105, 15, 95);
        pen.quadraticCurveTo(-1, 67, 8, 25);
        pen.closePath();
        pen.fill();
      }
      pen.strokeStyle = '#8599a0';
      pen.lineWidth = 1.6;
      for (const r of [52, 76, 98]) {
        pen.beginPath();
        pen.arc(0, 0, r, 0, 2 * Math.PI);
        pen.stroke();
      }
      disk(20, '#768e97');
      disk(13, '#ced6cf');
    },
    0.55
  );
  const apronSkin = printed('Entry and parking marks', '#687983', 512, 1024, (pen, w, h) => {
    pen.translate(w / 2, h / 2);
    pen.scale(w / 46, h / 90);
    pen.fillStyle = '#c8cfc8';
    for (let z = 28.8; z < 44; z += 2.75) pen.fillRect(-21.38, z, 7.28, 0.15);
    for (let x = 6.3; x < 18; x += 1.47) pen.fillRect(x, 41.71, 0.58, 3);
  });
  const yardSkin = printed('Mechanical yard pavement', '#8f9fa5', 256, 768, (pen, w, h) => {
    pen.translate(w / 2, h / 2);
    pen.scale(w / 10.15, h / 69.35);
    pen.fillStyle = '#c8d2ca';
    for (const z of [-31, -12, 7, 26])
      for (let x = -3.6; x < 4; x += 1.04) {
        pen.save();
        pen.translate(x, z);
        pen.rotate(-0.52);
        pen.fillRect(-0.19, -1, 0.38, 2);
        pen.restore();
      }
  });

  // Core data hall pad, plinth, precast walls, clerestory & south admin wing
  b(apronSkin, 0, 0.155, 0, 46, 0.31, 90);
  b(base, 5, 0.61, -6, 34.1, 0.6, 71.1);
  b(frame, 5, 1.55, -6, 33.6, 1.52, 70.5);
  b(wall, 5, 5.98, -6, 33.15, 7.75, 70.25);
  b(dark, 5, 9.99, -6, 33.7, 0.36, 70.8);
  b(roofSkin, 5, 10.22, -6, 33.45, 0.24, 70.6);
  for (const side of [-1, 1]) {
    const x = 5 + side * 16.62;
    b(frame, x, 9.35, -6, 0.3, 0.64, 70.4);
    b(trim, x, 10.6, -6, 0.42, 0.8, 70.9);
    b(trim, 5, 10.6, -6 + side * 35.27, 32.79, 0.8, 0.42);
    for (let z = -37.9, i = 0; z < 28; z += 6.3, i++) {
      b(frame, x + side * 0.16, 5.75, z, 0.14, 7.2, 0.13);
      b(trim, x + side * 0.35, 5.83, z - 0.18, 0.64, 7.42, 0.17);
      b(glass, x + side * 0.11, 8.42, z + 2.75, 0.12, 0.85, 5.2);
      b(litGlass, x + side * 0.26, 8.48, z + 1.15, 0.08, 0.67, 1.8);
      if (i % 2 === 0) b(grille, x + side * 0.25, 4.33, z + 2.75, 0.24, 2.75, 4.7);
    }
  }
  for (const x of [-4, 7.1, 16.5]) {
    b(dark, x, 3.16, -41.21, 4.2, 4.5, 0.22);
    for (let y = 1.11; y < 5.45; y += 0.43) b(metal, x, y, -41.36, 3.75, 0.18, 0.11);
    b(fluorescent, x, 5.79, -41.41, 2.25, 0.23, 0.16);
  }
  // South administrative wing
  b(base, 4.25, 0.6, 36.065, 35.25, 0.58, 12.87);
  b(glass, 4.25, 4.52, 35.58, 34.43, 5.58, 12.19);
  b(wall, 4.25, 1.31, 35.64, 34.63, 0.84, 12.27);
  for (let x = -11.15, i = 0; x < 21.2; x += 2.77, i++) {
    b(metal, x, 4.4, 41.77, 0.15, 5.51, 0.2);
    if (i % 4 !== 1) b(i % 4 === 0 ? warmGlass : litGlass, x + 1.31, 5.77, 41.73, 2.48, 1.58, 0.15);
    if (i % 3 !== 0) b(enamel, x + 0.2, 5.05, 42.36, 0.16, 3.91, 0.73);
  }
  for (let z = 29.91; z < 41.0; z += 2.8) {
    b(metal, -13.085, 4.58, z, 0.24, 5.46, 0.16);
    b(litGlass, -13.01, 5.8, z + 1.39, 0.16, 1.55, 2.49);
  }
  b(frame, 4.25, 7.44, 35.7, 35.12, 0.28, 12.67);
  b(trim, 4.25, 7.68, 35.77, 35.4, 0.2, 12.83);
  b(officeSkin, 4.25, 7.88, 35.77, 34.34, 0.2, 12.4);
  for (const x of [-4.35, 9.2]) {
    b(frame, x, 8.09, 34.42, 7.75, 0.22, 4.4);
    wedge(metal, x, 8.62, 34.42, 7.36, 0.83, 4.05);
    const tilt = -Math.atan(0.83 / 4.05);
    b(glass, x, 8.74, 34.42, 7.44, 0.11, 4.18, 0, tilt);
    for (const dx of [-2.46, 0, 2.46]) b(litGlass, x + dx, 8.82, 34.42, 2.22, 0.055, 3.87, 0, tilt);
    b(trim, x, 9.18, 36.49, 7.65, 0.14, 0.22);
  }
  for (const side of [-1, 1]) b(trim, 4.25 + side * 17.3, 8.05, 35.77, 0.22, 0.53, 12.77);
  b(metal, 4.25, 4.84, 41.84, 34.38, 0.12, 0.19);
  b(enamel, -4.43, 4.24, 42.91, 13.11, 0.26, 3.94);
  b(trim, -4.43, 4.42, 42.91, 13.36, 0.16, 4.08);
  for (const x of [-10.42, 1.56]) b(frame, x, 2.335, 44.4, 0.24, 3.55, 0.24);
  b(fluorescent, -4.35, 3.46, 41.9, 6.25, 0.18, 0.16);

  function fan(x, y, z, diameter) {
    cyl(fanSkin, x, y + 0.12, z, diameter, 0.28, diameter);
  }
  function pipeZ(mat, x, y, z, size, length) {
    cyl(mat, x, y, z, size, length, size, 0, Math.PI / 2);
  }
  function railZ(x, y, z, len, tint = rail) {
    for (let k = -len / 2; k <= len / 2; k += 3) b(frame, x, y + 0.6, z + k, 0.12, 1.2, 0.12);
    for (const h of [0.55, 1.23]) b(tint, x - 0.15, y + h, z, 0.13, 0.12, len);
  }

  // West-side mechanical yard
  b(yardSkin, -17.35, 0.48, -6, 10.15, 0.34, 69.35);
  if (iId !== 'd3') {
    for (let z = -39; z < 28; z += 3.7) b(frame, -22.15, 1.6, z, 0.22, 1.9, 0.22);
    for (const h of [0.9, 1.36, 1.85, 2.35]) b(metal, -22.31, h, -6, 0.15, 0.13, 66.4);
  }

  // Cooling equipment per Technology package (T1–T4)
  if (cId === 't1') {
    for (const x of [-3.7, 11.0]) {
      for (const z of [-28.5, -11.7, 5.1, 19.0]) {
        b(dark, x, 10.72, z, 8.6, 0.63, 9.6);
        b(enamel, x, 12.5, z, 8.75, 3.2, 9.35);
        for (const s of [-1, 1]) b(grille, x + s * 4.47, 12.48, z, 0.27, 2.39, 8.48);
        b(trim, x, 14.2, z, 9.05, 0.27, 9.65);
        taper(trim, x, 15.08, z, 7.8, 1.63, 7.8);
        cyl(enamel, x, 16.02, z, 5.36, 0.43, 5.36);
        fan(x, 16.3, z, 4.85);
      }
    }
    b(gutter, 3.2, 10.81, -7, 3.7, 0.66, 60);
    for (const x of [2.6, 3.9]) pipeZ(pipe, x, 11.62, -7, 0.74, 59.2);
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
  } else if (cId === 't3' || cId === 't4') {
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
        b(grille, -21.09, 3.66, q, 0.22, 3.29, 4.19);
        b(gutter, -17.35, 6.15, q, 4.8, 0.22, 2.37);
      }
    }
    if (cId === 't4') {
      // Insulated district heat-recovery manifold pipes
      for (const x of [-14.2, -13.1]) pipeZ(pipe, x, 6.45, -4, 0.78, 66);
      cyl(pipe, -17.4, 3.6, 25.5, 4.2, 6.2, 4.2);
      cyl(trim, -17.4, 6.8, 25.5, 4.5, 0.3, 4.5);
    }
    railZ(-12.8, 0.72, -7.6, 61);
  } else {
    const coil = printed('Folded dry cooler fin bank', colors.equipment, 512, 128, (pen) => {
      pen.fillStyle = '#745b45';
      for (let x = 4; x < 511; x += 15) pen.fillRect(x, 3, 3, 122);
      pen.fillStyle = '#c49f70';
      for (let x = 7; x < 511; x += 15) pen.fillRect(x, 3, 4, 122);
    });
    for (const x of [-3.22, 11.05]) {
      for (const dx of [-5.4, 5.4]) {
        b(frame, x + dx, 12.3, -6, 0.33, 0.58, 64.6);
        for (let z = -36; z <= 26; z += 7.3) b(frame, x + dx, 11.175, z, 0.28, 1.67, 0.31);
      }
      for (const z of [-28.6, -7.6, 13.4]) {
        b(dark, x, 12.58, z, 2.6, 0.35, 18.9);
        for (const sign of [-1, 1]) {
          const xx = x + sign * 3.22;
          b(coil, xx, 14.5, z, 0.44, 5.87, 19.3, 0, 0, -sign * 0.87);
          for (const q of [-9.45, 0, 9.45])
            b(trim, xx + sign * 0.226, 14.232, z + q, 0.26, 6.04, 0.3, 0, 0, -sign * 0.87);
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

  // Entry court & service vehicle
  b(base, -4.2, 0.435, 43.72, 14.2, 0.25, 2.34);
  for (const x of [-9.4, -7.75, 1.1]) {
    cyl(frame, x, 0.92, 44.25, 0.24, 0.72, 0.24);
    cyl(fluorescent, x, 1.34, 44.25, 0.26, 0.12, 0.26);
  }
  const vx = -17.1,
    vz = 37.86;
  b(dark, vx, 0.64, vz, 4.65, 0.42, 1.8);
  b(trim, vx, 1.275, vz, 4.76, 0.85, 1.86);
  b(glass, vx + 0.33, 1.92, vz, 2.74, 0.64, 1.71);

  // Pillar 1 architectural additions (D2, D3, D4) directly visible on the 3D facility
  const keys = [...equipmentKeys[cId]];
  if (iId === 'd2') {
    // Landscaped earthen berms + native post-oak vegetative screening belts
    b(bermEarth, -29.5, 2.1, -6, 9.5, 4.2, 82);
    b(bermEarth, 29.0, 1.9, -4, 8.0, 3.8, 78);
    b(bermEarth, 0, 1.7, -51, 56, 3.4, 8.5);
    for (let z = -42; z <= 34; z += 9.5) {
      for (const sx of [-30.5, 29.5]) {
        cyl(trunkMat, sx, 4.9, z, 0.65, 3.6, 0.65);
        tree(z % 19 === 0 ? canopyDark : canopyLight, sx, 8.4, z, 4.2, 3.8, 4.0, z * 0.4);
      }
    }
    for (let x = -22; x <= 22; x += 11) {
      cyl(trunkMat, x, 4.4, -51, 0.6, 3.2, 0.6);
      tree(canopyDark, x, 7.6, -51, 3.9, 3.4, 3.8, x * 0.3);
    }
    keys[1] = ['Earthen berm & oak buffer', -29.5, 7.8, -6];
  } else if (iId === 'd3') {
    // Heavy zigzag sound-absorbing perimeter baffle walls enclosing the west yard
    for (let z = -39; z <= 25; z += 8) {
      b(baffleMat, -24.0, 4.6, z + 2, 1.1, 9.2, 5.2, 0.46);
      b(baffleTrim, -24.0, 9.3, z + 2, 1.35, 0.35, 5.4, 0.46);
      b(baffleMat, -24.0, 4.6, z + 6, 1.1, 9.2, 5.2, -0.46);
      b(baffleTrim, -24.0, 9.3, z + 6, 1.35, 0.35, 5.4, -0.46);
    }
    // North & south acoustic yard return walls + raised roof acoustic parapet
    b(baffleMat, -18.0, 4.6, -42.5, 13.5, 9.2, 1.2);
    b(baffleMat, -18.0, 4.6, 30.5, 13.5, 9.2, 1.2);
    for (const side of [-1, 1]) {
      b(baffleMat, 5 + side * 16.9, 12.6, -6, 0.55, 3.6, 71.2);
      b(baffleTrim, 5 + side * 16.9, 14.5, -6, 0.8, 0.25, 71.4);
    }
    keys[1] = ['Zigzag acoustic baffle wall', -24.0, 9.6, 6];
  } else if (iId === 'd4') {
    // Walkable Midtown community plaza + civic/retail/aquatics pavilions using waste heat
    b(plazaStone, 38.5, 0.22, 10, 30, 0.42, 76);
    b(plazaStone, 10, 0.22, 58, 72, 0.42, 24);
    // Civic community room & café pavilion (east plaza)
    b(civicStone, 41, 2.8, -10, 14, 5.2, 24);
    b(glass, 33.8, 2.6, -10, 0.3, 3.8, 21);
    b(civicWood, 40.5, 5.65, -10, 16.5, 0.48, 26.5);
    // Warm-water aquatics / wellness pavilion connected to thermal loop (southeast)
    b(civicStone, 41, 3.1, 24, 15, 5.8, 22);
    b(glass, 33.3, 2.9, 24, 0.3, 4.1, 18);
    b(civicWood, 40.5, 6.25, 24, 17.2, 0.5, 24.5);
    // Walkable retail & trailhead pavilion (south plaza)
    b(civicStone, 12, 2.4, 59, 32, 4.4, 11);
    b(civicWood, 12, 4.85, 59, 34.5, 0.45, 13.5);
    // Shade trees along the civic walkway
    for (const [tx, tz] of [
      [29, -22],
      [29, 2],
      [29, 26],
      [29, 44],
      [-6, 56],
      [34, 56]
    ]) {
      cyl(trunkMat, tx, 2.4, tz, 0.5, 4.2, 0.5);
      tree(canopyLight, tx, 5.5, tz, 3.3, 2.9, 3.2, tx + tz);
    }
    keys[1] = ['Midtown civic & heat pavilion', 41, 6.6, -8];
  }

  // Pillar 3 architectural additions: adjacent 3D energy models for ALL four options (E1–E4)
  const pvMat = stock('#234c68', 0.28, 0.35);
  const pvFrame = stock('#c8d4d2', 0.45, 0.38);
  const steelTower = stock('#e5ece9', 0.42, 0.24);
  const subPad = stock('#8c9898', 0.94);
  const ceramic = stock('#a36552', 0.55, 0.12);
  const energyZ = iId === 'd2' ? -68 : -58;

  if (eId === 'e1') {
    // E1: Utility CSU / ERCOT substation bay with twin transformers, ceramic bushings & HV gantry
    b(subPad, 4, 0.35, energyZ, 34, 0.48, 17);
    for (const tx of [-5.5, 11.5]) {
      b(frame, tx, 2.35, energyZ + 1.2, 6.8, 3.8, 4.6);
      b(trim, tx, 4.35, energyZ + 1.2, 7.2, 0.22, 4.9);
      for (let f = -2.4; f <= 2.4; f += 1.2) b(metal, tx + f, 2.3, energyZ + 3.8, 0.32, 3.1, 0.95);
      for (const bx of [-1.8, 0, 1.8]) {
        cyl(ceramic, tx + bx, 5.45, energyZ + 1.2, 0.44, 2.1, 0.44);
        cyl(metal, tx + bx, 6.65, energyZ + 1.2, 0.24, 0.35, 0.24);
      }
    }
    // Dead-end steel A-frame transmission gantry & overhead busbars
    for (const gx of [-10.5, 3.5, 17.5]) {
      b(metal, gx, 6.2, energyZ - 5.2, 0.65, 12.2, 0.65);
      b(metal, gx, 6.1, energyZ - 3.6, 0.45, 12.0, 0.45, 0, 0.14);
    }
    b(metal, 3.5, 11.6, energyZ - 4.4, 29.2, 0.55, 0.9);
    b(metal, 3.5, 8.2, energyZ - 4.4, 29.2, 0.38, 0.65);
    for (const lx of [-6.5, 3.5, 13.5]) {
      b(dark, lx, 11.1, energyZ - 1.6, 0.12, 0.12, 5.4);
      cyl(ceramic, lx, 10.6, energyZ - 4.4, 0.35, 1.1, 0.35);
    }
    keys[0] = ['CSU / ERCOT substation', 3.5, 11.8, energyZ - 4.4];
  } else if (eId === 'e2') {
    // E2: Architectural photovoltaic solar-matching array (~1.5 sq mi off-site commitment)
    b(subPad, 4, 0.3, energyZ - 3, 44, 0.4, 24);
    const tilt = 0.38;
    for (let rz = energyZ - 11; rz <= energyZ + 5; rz += 5.2) {
      for (let px = -14; px <= 22; px += 7.2) {
        cyl(metal, px - 1.6, 1.4, rz, 0.28, 2.4, 0.28);
        cyl(metal, px + 1.6, 1.4, rz, 0.28, 2.4, 0.28);
        b(pvFrame, px, 2.75, rz, 6.4, 0.14, 3.3, 0, tilt);
        b(pvMat, px, 2.86, rz, 6.1, 0.12, 3.05, 0, tilt);
      }
    }
    // Inverter & collector skid
    b(trim, -15.5, 1.85, energyZ + 5.8, 4.6, 2.8, 3.4);
    b(enamel, -15.5, 1.85, energyZ + 7.55, 3.6, 1.9, 0.2);
    keys[0] = ['Remote solar (~1.5 sq mi)', 4, 3.8, energyZ - 3];
  } else if (eId === 'e3') {
    // E3: Three architectural horizontal-axis wind turbines (representing 14–18 off-site turbines)
    b(subPad, 4, 0.28, energyZ - 4, 46, 0.36, 20);
    const turbineSites = [
      [-12, energyZ - 5, 22, 0.3],
      [4, energyZ - 7, 26, 1.35],
      [20, energyZ - 4, 21, 2.2]
    ];
    for (const [wx, wz, h, phase] of turbineSites) {
      cyl(base, wx, 0.65, wz, 3.8, 0.7, 3.8);
      taper(steelTower, wx, h / 2 + 0.6, wz, 1.7, h, 1.7);
      b(steelTower, wx, h + 1.0, wz + 0.4, 1.9, 1.8, 4.6);
      cyl(trim, wx, h + 1.0, wz + 2.9, 1.5, 1.6, 1.5, 0, Math.PI / 2);
      // 3 crisp turbine rotor blades positioned radially in the XY plane
      const bladeLen = h * 0.46;
      for (let k = 0; k < 3; k++) {
        const ang = phase + (k * Math.PI * 2) / 3;
        const cx = wx + Math.cos(ang) * (bladeLen * 0.5);
        const cy = h + 1.0 + Math.sin(ang) * (bladeLen * 0.5);
        b(trim, cx, cy, wz + 3.25, bladeLen, 0.58, 0.22, 0, 0, ang);
      }
    }
    keys[0] = ['Remote wind (14–18 turbines)', 4, 27.5, energyZ - 7];
  } else if (eId === 'e4') {
    // E4: Shielded on-site microreactor containment bay (6 × 5 MWe eVinci-class)
    b(base, 4, 0.4, energyZ, 38, 0.5, 18);
    b(frame, 4, 3.4, energyZ, 34, 5.8, 13.5);
    b(trim, 4, 6.45, energyZ, 34.8, 0.35, 14.2);
    for (let i = 0; i < 6; i++) {
      const rx = -10 + i * 5.6;
      cyl(metal, rx, 7.6, energyZ, 2.6, 2.4, 2.6);
      cyl(trim, rx, 8.9, energyZ, 2.9, 0.25, 2.9);
    }
    keys[0] = ['6 × 5 MWe microreactor bay', 4, 9.2, energyZ];
  }

  group.userData.illustrative = true;
  group.userData.equipment = keys;
  return finish();
}

export function createDistrict({ print = false } = {}) {
  const group = new THREE.Group();
  group.name = 'Generalized College Station Midtown architectural study';
  group.userData.bounds = tableBounds;
  const { box: b, tree, roof: gable, cyl, stock, finish } = modelParts(group);
  const random = seeded(202611);
  const { minX, maxX, minZ, maxZ } = tableBounds;
  const inside = (x, z, pad = 6) =>
    x >= minX + pad && x <= maxX - pad && z >= minZ + pad && z <= maxZ - pad;
  const paper = document.createElement('canvas');
  paper.width = 2304;
  paper.height = 2160;
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
  function disk(x, z, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, z, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Central Texas mineral-savannah architectural base tone
  ctx.fillStyle = '#aebfb9';
  ctx.fillRect(minX, minZ, districtWidth, districtDepth);

  const pine = stock('#4d7369', 0.98),
    moss = stock('#7fa294', 0.99),
    sage = stock('#94af9f', 0.99);
  const leaf = stock('#6b9085', 0.97),
    trunk = stock('#77847d', 0.99);
  const walls = ['#c6d1cf', '#cfd5cf', '#bcc8c8', '#b5c6c6'].map((c) => stock(c, 0.95));
  const roofs = ['#83959a', '#91a1a7', '#899997', '#788c94'].map((c) => stock(c, 0.91));
  const steel = stock('#91a5af', 0.7, 0.14),
    concrete = stock('#a9babe', 0.95),
    slab = stock('#80959d', 0.93);
  const ink = stock('#536a74', 0.83),
    cream = stock('#c1cccd', 0.9);

  const corner = (minX + maxX) / 2,
    mid = (minZ + maxZ) / 2;
  const plinth = new THREE.Group();
  if (!print) {
    const edge = modelParts(plinth);
    edge.box(edge.stock('#748791'), corner, -23, mid, districtWidth - 8, 8, districtDepth - 8);
    edge.box(edge.stock('#9db1b6'), corner, -18, mid, districtWidth - 2, 2, districtDepth - 2);
    edge.box(edge.stock('#9fadb0'), corner, -8.55, mid, districtWidth, 16.9, districtDepth);
    edge.finish();
    group.add(plinth);
  }
  group.userData.plinth = plinth;

  const riverLine = constraintShapes.river;
  const springLine = constraintShapes.springCreek;
  const parcel = site.boundary.map(geo);
  const sh6 = sh6Motorway;
  const lakeway = lakewayRoads;
  const fitch = fitchRoads;
  const allMajorLines = [...sh6Motorway, ...sh6Frontage, ...fitchRoads, ...lakewayRoads];

  function distSegment(x, z, a, b) {
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      t = THREE.MathUtils.clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
  }
  function nearRoute(x, z, pts, r) {
    return pts.some((p, i) => i && distSegment(x, z, pts[i - 1], p) < r);
  }
  function nearAnyRoute(x, z, lines, r) {
    return lines.some((pts) => nearRoute(x, z, pts, r));
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
  function shiftPath(points, offset) {
    return points.map((p, i) => {
      const a = points[Math.max(0, i - 1)],
        b = points[Math.min(points.length - 1, i + 1)];
      const dx = b[0] - a[0],
        dz = b[1] - a[1],
        l = Math.hypot(dx, dz) || 1;
      return [p[0] - (dz / l) * offset, p[1] + (dx / l) * offset];
    });
  }

  // Real OpenStreetMap public parks
  for (const park of parkPolygons) fill(park.poly, '#9cb9a6');

  // Midtown Business Park study tract with subtle savannah stipple
  line(parcel, '#859d9e', 5);
  fill(parcel, '#bcc9c0');
  const noise = (x, z, scale) =>
    0.5 +
    0.23 * Math.sin(x / scale + Math.cos(z / scale)) +
    0.15 * Math.cos(z / scale + Math.sin((0.6 * x) / scale));
  ctx.save();
  path(parcel, true);
  ctx.clip();
  ctx.fillStyle = '#bcc9c0';
  ctx.fillRect(-450, -520, 950, 1020);
  const herbs = seeded(41122);
  for (let i = 0; i < 6200; i++) {
    const x = -400 + herbs() * 880,
      z = -440 + herbs() * 800;
    const r = herbs();
    if (noise(x, z, 19) > 0.53)
      line(
        [
          [x, z],
          [x + 0.65 + r * 0.6, z - 0.3]
        ],
        'rgba(92,122,112,.22)',
        0.34
      );
  }
  ctx.restore();

  // Real Lick Creek (north) & Spring Creek (southeast) wooded riparian channels
  for (const creek of [riverLine, springLine]) {
    if (!creek || creek.length < 2) continue;
    line(creek, '#8ba99e', 54);
    line(creek, '#a2b9ad', 32);
    line(creek, '#bdd0c9', 20);
    line(creek, '#74a5b1', 13);
    line(shiftPath(creek, 3.8), '#a5c8cf', 1.2);
  }

  // Real OpenStreetMap arterial & local neighborhood streets
  const roads = [];
  for (const pts of localStreets) roads.push({ points: pts, width: 7.5, arterial: false });
  for (const pts of lakeway) roads.push({ points: pts, width: 11, arterial: true });
  for (const pts of fitch) roads.push({ points: pts, width: 14, arterial: true });
  for (const pts of sh6Frontage) roads.push({ points: pts, width: 9.5, arterial: false });

  function lot(x, z, w, d, angle, color) {
    ctx.save();
    ctx.translate(x, z);
    ctx.rotate(-angle);
    ctx.fillStyle = color;
    ctx.fillRect(-w / 2, -d / 2, w, d);
    ctx.restore();
  }
  function house(x, z, angle) {
    if (!inside(x, z, 14)) return;
    const w = 10 + random() * 3.5,
      d = 12 + random() * 4.0,
      h = 3.9 + random() * 1.9;
    const mat = walls[Math.floor(random() * walls.length)],
      top = roofs[Math.floor(random() * roofs.length)];
    lot(x, z, w + 3, d + 3, angle, '#9eb1aa');
    b(mat, x, h / 2 + 0.1, z, w, h, d, angle);
    gable(top, x, h + 0.05, z, w + 0.8, 2.0 + random() * 0.9, d + 0.8, angle);
  }

  const trunkCells = new Map();
  function canopy(x, z, r, style) {
    if (!inside(x, z, r)) return;
    const ix = Math.floor(x / 3),
      iz = Math.floor(z / 3),
      key = ix + ',' + iz;
    for (let i = ix - 1; i <= ix + 1; i++)
      for (let j = iz - 1; j <= iz + 1; j++)
        if ((trunkCells.get(i + ',' + j) || []).some(([a, b]) => Math.hypot(x - a, z - b) < 2.2)) return;
    if (!trunkCells.has(key)) trunkCells.set(key, []);
    trunkCells.get(key).push([x, z]);
    const m = style || [pine, leaf, moss, sage][Math.floor(random() * 4)];
    const h = 2.0 + r * 0.52;
    cyl(trunk, x, h * 0.49, z, 0.55 + r * 0.1, h, 0.55 + r * 0.1);
    tree(m, x, h + r * 0.54, z, r * 1.1, r * (0.85 + random() * 0.32), r * 1.02, random() * 6.28);
    disk(x - r * 0.16, z + r * 0.2, r * 1.15, 'rgba(24,42,36,.09)');
  }

  // Real OpenStreetMap extruded building footprints (Costco, The Langford, St. Joseph, apartments, etc.)
  const corridorWallMat = new THREE.MeshStandardMaterial({ color: '#c1cccd', roughness: 0.9, metalness: 0 });
  const corridorRoofMat = new THREE.MeshStandardMaterial({ color: '#91a1a7', roughness: 0.91, metalness: 0 });
  const seniorWallMat = new THREE.MeshStandardMaterial({ color: '#cfd5cf', roughness: 0.94, metalness: 0 });
  const seniorRoofMat = new THREE.MeshStandardMaterial({ color: '#899997', roughness: 0.91, metalness: 0 });
  const allRealBuildings = [
    ...buildingPolygons.map((item) => ({ ...item, wallMat: corridorWallMat, roofMat: corridorRoofMat })),
    ...seniorPolygons.map((item) => ({ ...item, wallMat: seniorWallMat, roofMat: seniorRoofMat }))
  ];
  const buildingBboxes = allRealBuildings.map(({ poly }) => [
    Math.min(...poly.map((p) => p[0])) - 10,
    Math.min(...poly.map((p) => p[1])) - 10,
    Math.max(...poly.map((p) => p[0])) + 10,
    Math.max(...poly.map((p) => p[1])) + 10
  ]);
  function nearBuilding(x, z) {
    return buildingBboxes.some((bb) => x >= bb[0] && x <= bb[2] && z >= bb[1] && z <= bb[3]);
  }

  for (const { poly, h, wallMat, roofMat } of allRealBuildings) {
    if (poly.length < 3) continue;
    fill(poly, '#a3b1b5');
    const shape = new THREE.Shape();
    poly.forEach(([x, z], idx) => {
      if (idx === 0) shape.moveTo(x, -z);
      else shape.lineTo(x, -z);
    });
    shape.closePath();
    const geom = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, steps: 1 });
    geom.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geom, wallMat);
    mesh.position.y = 0.25;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    const capGeom = new THREE.ShapeGeometry(shape);
    capGeom.rotateX(-Math.PI / 2);
    const cap = new THREE.Mesh(capGeom, roofMat);
    cap.position.y = h + 0.3;
    cap.receiveShadow = true;
    group.add(cap);
  }

  // Contextual neighborhood homes along real OSM residential streets (strictly clear of roads, creeks, parks & OSM buildings)
  for (const pts of localStreets) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i],
        q = pts[i + 1],
        dx = q[0] - a[0],
        dz = q[1] - a[1],
        len = Math.hypot(dx, dz);
      if (len < 22) continue;
      const angle = -Math.atan2(dz, dx);
      for (let t = 16; t < len - 12; t += 28) {
        const bx = a[0] + (dx * t) / len,
          bz = a[1] + (dz * t) / len;
        for (const side of [-1, 1]) {
          const x = bx - (dz / len) * (side * 19),
            z = bz + (dx / len) * (side * 19);
          if (
            !inside(x, z, 20) ||
            inPoly(x, z, parcel) ||
            nearBuilding(x, z) ||
            nearRoute(x, z, riverLine, 34) ||
            nearRoute(x, z, springLine, 34) ||
            nearAnyRoute(x, z, allMajorLines, 32) ||
            nearAnyRoute(x, z, localStreets, 12) ||
            parkPolygons.some((pk) => inPoly(x, z, pk.poly))
          )
            continue;
          house(x, z, angle);
        }
      }
    }
  }

  // Natural Central Texas post-oak clusters framing the wooded Midtown Business Park tract
  const oakClusters = [
    [-210, -145], [-165, -210], [-145, 72], [-80, 145],
    [168, -220], [235, -135], [220, 90], [160, 175],
    [-40, -240], [110, -255], [295, -60], [260, 15]
  ];
  for (const [ox, oz] of oakClusters) {
    if (!inPoly(ox, oz, parcel)) continue;
    canopy(ox, oz, 4.4 + random() * 2.4);
    canopy(ox + (random() - 0.5) * 20, oz + (random() - 0.5) * 18, 3.2 + random() * 1.9);
  }
  for (const creek of [riverLine, springLine]) {
    for (let i = 0; i < creek.length - 1; i++) {
      const p = creek[i],
        q = creek[i + 1],
        dx = q[0] - p[0],
        dz = q[1] - p[1],
        l = Math.hypot(dx, dz) || 1;
      for (let t = 0; t < l; t += 14) {
        const k = t / l,
          side = (random() > 0.5 ? 1 : -1) * (14 + random() * 20);
        const x = p[0] + dx * k - (dz / l) * side,
          z = p[1] + dz * k + (dx / l) * side;
        if (!nearAnyRoute(x, z, allMajorLines, 22) && !nearBuilding(x, z)) canopy(x, z, 3.5 + random() * 3.4);
      }
    }
  }
  for (const park of parkPolygons) {
    const xs = park.poly.map((p) => p[0]),
      zs = park.poly.map((p) => p[1]);
    const minPx = Math.min(...xs),
      maxPx = Math.max(...xs),
      minPz = Math.min(...zs),
      maxPz = Math.max(...zs);
    for (let i = 0; i < 24; i++) {
      const x = minPx + random() * (maxPx - minPx),
        z = minPz + random() * (maxPz - minPz);
      if (inPoly(x, z, park.poly)) canopy(x, z, 3.4 + random() * 3.2);
    }
  }
  // Low post-oak savannah scrub inside the open Midtown parcel (leaving center pad clear)
  const scrub = seeded(29711);
  for (let i = 0; i < 560; i++) {
    const x = -380 + scrub() * 820,
      z = -400 + scrub() * 690;
    if (!inPoly(x, z, parcel) || (Math.abs(x) < 48 && Math.abs(z) < 68)) continue;
    const patch = noise(x, z, 23) * 0.62 + noise(x, z, 8) * 0.38;
    if (patch < 0.58) continue;
    const r = 0.45 + scrub() * (patch > 0.72 ? 2.2 : 1.35),
      m = patch > 0.74 ? pine : scrub() < 0.65 ? moss : leaf;
    tree(m, x, r * 0.23, z, r * 1.15, r * 0.58, r * 0.86, scrub() * 6.28);
    disk(x, z + r * 0.18, r, 'rgba(67,90,92,.2)');
  }

  // Paint arterial & local roads
  for (const r of roads) {
    line(r.points, '#d1dad6', r.width + 3.5);
    line(r.points, '#96a8ae', r.width);
    if (r.arterial) line(r.points, '#c8c4a9', 0.45, [2.4, 3.8]);
  }

  // SH 6 (Earl Rudder Freeway) real OSM motorway lanes
  for (const pts of sh6) {
    line(pts, '#bcc9c7', 16.5);
    line(pts, '#8498a1', 14);
    line(pts, '#cbd5d3', 0.35, [3.5, 8]);
  }

  // Scale vehicles on SH 6
  for (const pts of sh6) {
    for (let j = 0; j < pts.length - 1; j++) {
      const a = pts[j],
        q = pts[j + 1],
        dx = q[0] - a[0],
        dz = q[1] - a[1],
        len = Math.hypot(dx, dz),
        angle = -Math.atan2(dz, dx);
      for (let t = 28; t < len - 16; t += 58 + random() * 65) {
        const side = (random() > 0.5 ? 1 : -1) * (2.5 + random() * 2.5),
          px = a[0] + (dx * t) / len - (dz / len) * side,
          pz = a[1] + (dz * t) / len + (dx / len) * side;
        if (!inside(px, pz, 10)) continue;
        b(walls[Math.floor(random() * 4)], px, 0.85, pz, 4.3, 1.26, 1.78, angle);
        b(ink, px, 1.61, pz, 2.5, 0.54, 1.48, angle);
      }
    }
  }

  // Table-edge registration ticks
  for (let x = minX + 40; x < maxX - 10; x += 40) {
    line(
      [
        [x, maxZ - 4],
        [x, maxZ - (Math.abs(Math.round(x)) % 200 === 0 ? 11 : 7)]
      ],
      '#8a9d9f',
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

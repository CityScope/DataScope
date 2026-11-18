// Original architectural miniatures. Neighborhood massing is generalized from the
// city planning exhibit for orientation, not a building inventory or engineering plan.
import * as THREE from 'three';
import { river, site } from '../geography.js';

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
  const crown = new THREE.IcosahedronGeometry(1, 1);
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
  return { box, cyl, ring, tree, roof, stock, finish };
}

export function createFacility(design = 'reference') {
  const group = new THREE.Group();
  group.name = 'Movable data center';
  const { box: b, cyl, ring, stock, finish } = modelParts(group);
  const wall = stock('#d8ded9', 0.68),
    trim = stock('#eef0df', 0.52, 0.1);
  const frame = stock('#799396', 0.65, 0.22),
    metal = stock('#a2b6b5', 0.52, 0.35);
  const charcoal = stock('#364b53', 0.71, 0.18),
    duct = stock('#8caaa9', 0.68, 0.21);
  const roof = stock('#809499', 0.76, 0.09),
    glass = stock('#29565e', 0.29, 0.35);
  const band = stock('#79c6be', 0.37, 0.1, '#51a99c'),
    light = stock('#f3db9f', 0.43, 0.1, '#dcb773');
  const concrete = stock('#7e8d8b', 0.94),
    tarmac = stock('#455359', 0.97);
  const shadow = stock('#24383e', 0.83),
    grate = stock('#45646d', 0.69, 0.2);
  const blade = stock('#91a8aa', 0.6, 0.26),
    darkBlade = stock('#70908f', 0.59, 0.27);
  // Foundation and the two wings follow the illustrative 46 x 90 m envelope.
  b(tarmac, 0, 0.16, 0, 46, 0.32, 90);
  b(concrete, 5, 0.47, -6, 34, 0.62, 71);
  b(charcoal, 5, 1, -6, 33.4, 1.15, 70.5);
  b(wall, 5, 5.64, -6, 33.2, 8.85, 70.2);
  b(charcoal, 5, 10.1, -6, 33.9, 0.5, 71);
  b(roof, 5, 10.42, -6, 33, 0.37, 70);
  // Thin light-colored coping makes the roof and parapets read on a tablet.
  for (const side of [-1, 1]) {
    b(trim, 5 + side * 16.73, 10.7, -6, 0.42, 0.95, 71);
    b(trim, 5, 10.7, -6 + side * 35.32, 33.6, 0.95, 0.43);
    for (let z = -39; z < 28; z += 4.25) {
      b(frame, 5 + side * 16.64, 5.45, z, 0.14, 7.45, 0.13);
      b(shadow, 5 + side * 16.68, 8.9, z + 1.7, 0.12, 0.81, 2.94);
    }
  }
  // Long cladding joints, intake louvers, roof channels and cross-aisles.
  for (const x of [-11.65, 21.68])
    for (const y of [3.25, 5.8, 8.35]) b(frame, x, y, -6, 0.08, 0.075, 70);
  for (let x = -10.4; x < 21; x += 1.6) b(metal, x, 10.63, -6, 0.16, 0.12, 69);
  for (let z = -36; z < 24; z += 9) {
    b(charcoal, -11.73, 4.2, z, 0.14, 3.6, 5.2);
    for (let i = 0; i < 8; i++) b(metal, -11.88, 2.65 + i * 0.44, z, 0.18, 0.11, 4.9);
  }
  // Glazed low-rise entrance, deep sunshades and separately modeled mullions.
  b(concrete, 4.4, 0.5, 33.4, 35.2, 0.7, 17);
  b(glass, 4.4, 4.2, 33.3, 34.4, 6.8, 16.1);
  b(wall, 4.4, 1.3, 33.3, 34.65, 1.1, 16.35);
  b(charcoal, 4.4, 7.78, 33.3, 35.15, 0.46, 16.75);
  b(trim, 4.4, 8.04, 33.3, 35.35, 0.24, 16.95);
  b(roof, 4.4, 8.18, 33.3, 33.9, 0.1, 15.65);
  for (const z of [41.4, 25.25]) {
    for (let x = -11.5; x < 22; x += 2.8) b(metal, x, 4.55, z, 0.16, 5.9, 0.18);
    for (const y of [3.4, 5.65]) b(metal, 4.35, y, z, 34.3, 0.12, 0.16);
  }
  for (let z = 26; z < 42; z += 2.7) b(metal, -12.95, 4.55, z, 0.2, 6.05, 0.14);
  b(trim, -3.1, 4.25, 42.49, 12.6, 0.34, 4.45);
  for (const x of [-8.95, 2.67]) b(frame, x, 2.05, 44.05, 0.22, 4.1, 0.22);
  b(band, 4.3, 6.95, 41.49, 32.8, 0.2, 0.17);
  b(light, -4.3, 3.55, 41.53, 6.2, 0.19, 0.15);
  // Mechanical skids. Fan disks, rings, blades, grilles and hubs have depth
  // for close inspection; the real equipment selection is project-specific.
  function fan(x, y, z, d) {
    cyl(shadow, x, y, z, d, 0.17, d);
    ring(metal, x, y + 0.13, z, d, 1, d);
    for (let i = 0; i < 6; i++) {
      const a = ((i * 60 + 18) * Math.PI) / 180;
      b(
        i % 2 ? blade : darkBlade,
        x + Math.sin(a) * d * 0.18,
        y + 0.12,
        z + Math.cos(a) * d * 0.18,
        d * 0.135,
        0.12,
        d * 0.32,
        a + 0.47
      );
    }
    cyl(metal, x, y + 0.2, z, d * 0.18, 0.2, d * 0.18);
  }
  const rows = design === 'dry' ? 5 : 4;
  for (let row = 0; row < rows; row++) {
    const z = -33.6 + row * (54 / (rows - 1));
    for (const x of [-0.8, 11.2]) {
      const len = design === 'dry' ? 9.4 : 8.8;
      b(charcoal, x, 10.93, z, 6.4, 0.54, len - 0.2);
      b(metal, x, 12.05, z, 6.36, 1.9, len);
      for (const offset of [-1, 1]) {
        b(grate, x + offset * 3.21, 12.03, z, 0.11, 1.35, len - 0.5);
        for (let j = 0; j < 4; j++)
          b(duct, x + offset * 3.3, 11.48 + j * 0.36, z, 0.14, 0.1, len - 0.48);
      }
      b(trim, x, 13.08, z, 6.54, 0.21, len + 0.14);
      for (const dz of [-2.18, 2.18]) fan(x, 13.26, z + dz, 3.73);
    }
  }
  for (const x of [3.2, 4.05]) {
    b(duct, x, 11.2, -6, 0.46, 0.55, 62);
    for (let z = -34; z < 24; z += 12) b(charcoal, x, 10.94, z, 0.78, 0.49, 0.7);
  }
  // Screened mechanical yard on the west side; the administrative wing
  // faces the public approach. Security or internal operations are not modeled.
  b(concrete, -17.4, 0.36, -5.7, 10, 0.42, 68.9);
  for (let i = 0; i < 6; i++) {
    const z = -33 + i * 10.2;
    b(charcoal, -17.0, 0.95, z, 5.9, 0.8, 6.7);
    b(wall, -17, 2.6, z, 5.55, 2.95, 6.3);
    b(roof, -17, 4.25, z, 5.8, 0.35, 6.55);
    b(grate, -19.84, 2.51, z, 0.12, 1.86, 5);
    fan(-17, 4.5, z, 3.26);
    b(duct, -13.1, 2.4, z + 0.3, 2.1, 0.65, 0.85);
  }
  for (const z of [-39, 27.4]) b(frame, -17.4, 2.46, z, 10.3, 4.1, 0.31);
  for (let z = -38; z < 28; z += 2.54) b(frame, -22.42, 2.5, z, 0.21, 4.26, 0.24);
  for (let i = 0; i < 7; i++) b(duct, -22.48, 0.87 + i * 0.55, -5.8, 0.16, 0.31, 66.4);
  b(metal, -22.42, 4.58, -5.75, 0.4, 0.2, 66.8);
  for (let x = -10.5; x < 21; x += 5.1) {
    b(frame, x, 5.4, -41.22, 0.17, 8.26, 0.21);
  }
  for (const x of [-3, 7, 16]) {
    b(shadow, x, 3.1, -41.31, 4.2, 4.6, 0.15);
    for (let y = 1.2; y < 5.4; y += 0.43) b(metal, x, y, -41.45, 3.83, 0.18, 0.12);
    b(light, x, 5.72, -41.53, 1.54, 0.16, 0.25);
  }
  // Entrance paving, bollards and a parked service vehicle communicate
  // the building's human scale on the close-up physical model.
  b(concrete, -3.4, 0.4, 42.8, 13.3, 0.24, 3.9);
  for (let z = 41.2; z < 45; z += 1.22) b(frame, -3.5, 0.526, z, 13.0, 0.018, 0.04);
  for (let x = -9.5; x < 3.2; x += 1.6) b(frame, x, 0.527, 42.85, 0.035, 0.018, 3.62);
  for (const x of [-8.3, -6.7, 1.1]) {
    cyl(charcoal, x, 0.84, 44.4, 0.22, 0.9, 0.22);
    cyl(light, x, 1.19, 44.4, 0.24, 0.12, 0.24);
  }
  for (const [x, z] of [
    [-17.5, 35],
    [-17.5, 40.2]
  ]) {
    b(shadow, x, 0.64, z, 4.2, 0.5, 1.68);
    b(wall, x, 1.24, z, 4.4, 0.9, 1.78);
    b(glass, x + 0.38, 1.91, z, 2.12, 0.58, 1.63);
    b(metal, x + 0.35, 2.24, z, 2.05, 0.13, 1.65);
    for (const xx of [-1.38, 1.38])
      for (const zz of [-0.81, 0.81])
        cyl(shadow, x + xx, 0.74, z + zz, 0.57, 0.18, 0.57, 0, Math.PI / 2);
  }
  // Concrete wheel stops and painted walking route make scale legible.
  for (let z = 29; z < 42; z += 2.6) {
    b(trim, -18.1, 0.35, z, 6.6, 0.045, 0.1);
    b(concrete, -21.1, 0.57, z + 1.14, 0.45, 0.42, 1.55);
  }
  for (let x = 6; x < 18; x += 1.4) b(trim, x, 0.36, 43.1, 0.6, 0.05, 3);
  if (design === 'efficient') {
    // Compact illustrative heat exchangers serving the high-efficiency variant.
    for (const x of [-5.4, 5.1, 15.6]) {
      b(charcoal, x, 8.56, 33.4, 6.6, 0.55, 9);
      b(duct, x, 9.49, 33.4, 6.2, 1.55, 8.6);
      for (let z = 29.9; z < 37.5; z += 0.7) b(grate, x, 10.35, z, 5.8, 0.18, 0.38);
      for (const dx of [-2.6, 2.6]) b(band, x + dx, 10.36, 33.4, 0.22, 0.18, 8.4);
      b(duct, x, 8.76, 27.9, 1.25, 0.92, 3.4);
    }
  }
  if (design === 'dry') {
    // V-bank dry coolers have visibly angled fin elements alongside the fans.
    for (const x of [-0.8, 11.2])
      for (let row = 0; row < 5; row++) {
        const z = -33.6 + row * 13.5;
        for (const sign of [-1, 1]) {
          b(grate, x + sign * 3.06, 12.03, z, 0.28, 2.05, 8.85, 0, 0, -sign * 0.38);
          for (let zz = -4.1; zz < 4.2; zz += 0.55)
            b(metal, x + sign * 3.18, 12.03, z + zz, 0.16, 2.06, 0.08, 0, 0, -sign * 0.38);
        }
      }
  }
  group.userData.illustrative = true;
  return finish();
}

export function createDistrict() {
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
  ctx.fillStyle = '#576663';
  ctx.fillRect(minX, minZ, districtWidth, districtDepth);
  function disk(x, z, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, z, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Printed surface grain and broad land-use washes make flat local terrain legible.
  for (let i = 0; i < 580; i++) {
    const x = minX + random() * districtWidth,
      z = minZ + random() * districtDepth;
    disk(x, z, 8 + random() * 73, random() > 0.45 ? 'rgba(146,167,139,.04)' : 'rgba(29,48,48,.045)');
  }
  const pine = stock('#556d5a', 0.98),
    moss = stock('#74866c', 0.99),
    sage = stock('#899980', 0.99);
  const leaf = stock('#697f68', 0.97),
    trunk = stock('#756b56', 0.99);
  const walls = ['#b4b7a5', '#bdbfaf', '#b0afa1', '#a2acaa'].map((c) => stock(c, 0.95));
  const roofs = ['#818b87', '#8c948b', '#92978f', '#798482'].map((c) => stock(c, 0.91));
  const steel = stock('#8e9c9c', 0.7, 0.14),
    concrete = stock('#a1aaa4', 0.95),
    slab = stock('#788680', 0.93);
  const ink = stock('#36494c', 0.83),
    cream = stock('#b7bbae', 0.9);
  const plinthSide = stock('#283436', 0.76),
    plinthBase = stock('#1f292c', 0.7, 0.18),
    fin = stock('#647774', 0.68, 0.18);
  const corner = (minX + maxX) / 2,
    mid = (minZ + maxZ) / 2;
  b(plinthBase, corner, -24, mid, districtWidth - 8, 9, districtDepth - 8);
  b(fin, corner, -18.4, mid, districtWidth - 2, 2.2, districtDepth - 2);
  b(plinthSide, corner, -8.8, mid, districtWidth, 17.4, districtDepth);

  const riverLine = river.map(geo);
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
  const freewayNorth = [
    [-135, 467],
    [42, 357],
    [151, 289],
    [245, 221],
    [324, 136],
    [404, 36],
    [469, -65]
  ].map(feature);
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
  const freeway = shiftPath(freewayNorth, 4);
  // Rail alignments bracket the triangle and join to the northeast.
  const railwayNorth = [
    [-180, 476],
    [23, 404],
    [148, 364],
    [274, 329],
    [391, 296],
    [589, 237],
    [803, 165],
    [994, 102]
  ].map(feature);
  const railwayEast = [
    [142, 728],
    [230, 570],
    [309, 434],
    [391, 296],
    [440, 218],
    [487, 133],
    [524, 24],
    [557, -80]
  ].map(feature);
  const enterprise = [
    [-67, 774],
    [66, 634],
    [155, 508],
    [184, 462],
    [207, 411],
    [239, 355],
    [247, 347]
  ].map(feature);
  corridor(enterprise, 9, true);
  const north = feature([454, 325]);
  const cos = 0.856,
    sin = 0.517;
  function block(u, v) {
    return [north[0] + u * cos - v * sin, north[1] + u * sin + v * cos];
  }
  const blockAngle = -Math.atan2(sin, cos);
  const districtBlock = [block(-26, -9), block(886, -9), block(886, 1288), block(-24, 1288)];
  fill(districtBlock, '#657069');
  const parkPlane = [
    feature([394, 345]),
    feature([441, 317]),
    feature([408, 382]),
    feature([365, 455]),
    feature([332, 453]),
    feature([352, 416])
  ];
  fill(parkPlane, '#72866c');
  line(parcel, '#7b8b72', 5);
  fill(parcel, '#77876d');
  // A procedural, printed meadow surface: broad scoured earth, grass tufts,
  // small patches of bare soil and a finer scale of blade and fiber texture.
  // It suggests surface type only. It does not represent surveyed elevations.
  function lattice(ix, iz) {
    let h = Math.imul(ix + 10193, 1973) ^ Math.imul(iz - 2771, 9277);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function noise(x, z, scale) {
    const X = x / scale,
      Z = z / scale,
      i = Math.floor(X),
      k = Math.floor(Z);
    let s = X - i,
      t = Z - k;
    s = s * s * (3 - 2 * s);
    t = t * t * (3 - 2 * t);
    return (
      (1 - s) * ((1 - t) * lattice(i, k) + t * lattice(i, k + 1)) +
      s * ((1 - t) * lattice(i + 1, k) + t * lattice(i + 1, k + 1))
    );
  }
  function printMeadow() {
    const swatch = document.createElement('canvas');
    swatch.width = 790;
    swatch.height = 738;
    const brush = swatch.getContext('2d');
    const bitmap = brush.createImageData(swatch.width, swatch.height);
    const a = bitmap.data;
    for (let iz = 0; iz < swatch.height; iz++)
      for (let ix = 0; ix < swatch.width; ix++) {
        const x = -250 + ix * 0.62,
          z = -216 + iz * 0.62;
        const grain = noise(x, z, 1.8),
          m = noise(x * 0.95 + z * 0.28, z * 0.82 - x * 0.5, 24),
          soil = noise(x, z, 64);
        const f = noise(x * 0.7 - z * 0.3, z * 1.9, 7);
        const variation = (soil - 0.5) * 31 + (m - 0.5) * 21 + (f - 0.5) * 18 + (grain - 0.5) * 12;
        const ochre = Math.max(0, (m * 0.6 + soil * 0.4 - 0.51) * 80);
        const i = (iz * swatch.width + ix) * 4;
        a[i] = 105 + variation + ochre;
        a[i + 1] = 123 + variation + ochre * 0.15;
        a[i + 2] = 99 + variation - ochre * 0.49;
        a[i + 3] = 255;
      }
    brush.putImageData(bitmap, 0, 0);
    ctx.save();
    path(parcel, true);
    ctx.clip();
    ctx.drawImage(swatch, -250, -216, swatch.width * 0.62, swatch.height * 0.62);
    const herbs = seeded(14521);
    for (let i = 0; i < 16500; i++) {
      const x = -239 + herbs() * 469,
        z = -212 + herbs() * 430;
      const r = herbs();
      line(
        [
          [x, z],
          [x + 0.42 + r * 0.65, z - 0.12 - r * 0.4]
        ],
        r > 0.54 ? 'rgba(195,185,135,.36)' : 'rgba(52,78,61,.28)',
        0.35 + r * 0.25
      );
    }
    // The curving worn track at the southern tip is visible in the city's photo.
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
    line(swale, '#869578', 6.6);
    line(swale, '#a5a48b', 2.9);
    ctx.restore();
  }
  printMeadow();

  // Existing river corridor vegetation is stylized; keep a clean water channel.
  line(riverLine, '#556f62', 59);
  line(riverLine, '#697d69', 35);
  line(riverLine, '#7f9587', 22);
  line(riverLine, '#518489', 16);
  line(shiftPath(riverLine, 5), '#73999a', 1.2);
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
  fill(westMask, '#646f65');
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
    lot(x, z, w + 2, d + 2, angle, '#647068');
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
    const h = 2.5 + r * 0.66;
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
            line([a, e], '#92a095', 2.2);
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
    lot(x, z, w + 29, d + 30, angle, '#7a8079');
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
  ctx.fillStyle = '#a6997a';
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
  line(parkLoop, '#a3aa91', 2.2);
  // A grass playing surface and small-scale fixtures distinguish the park
  // from a colored land-use polygon in the physical workshop model.
  ctx.save();
  path(parkPlane, true);
  ctx.clip();
  const parkRandom = seeded(983);
  for (let i = 0; i < 9800; i++) {
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
    fill(poly, '#5b7060');
    const xs = poly.map((q) => q[0]),
      zs = poly.map((q) => q[1]);
    for (let x = Math.min(...xs); x < Math.max(...xs); x += 9) {
      for (let z = Math.min(...zs); z < Math.max(...zs); z += 10) {
        const a = x + random() * 6,
          q = z + random() * 6;
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
  for (let i = 0; i < 3600; i++) {
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
    line(r.points, '#98a49c', r.width + 4);
    line(r.points, '#65706f', r.width);
    if (r.arterial) line(r.points, '#c0b797', 0.36, [2.1, 3.5]);
    ctx.restore();
  }
  function rail(points, tracks) {
    line(points, '#707573', tracks * 4.6 + 5);
    for (let i = 0; i < tracks; i++) {
      const ax = shiftPath(points, (i - (tracks - 1) / 2) * 4.7);
      line(ax, '#555d5b', 3.05, [0.52, 1.65]);
      for (const d of [-0.74, 0.74]) line(shiftPath(ax, d), '#a3ada5', 0.3);
    }
  }
  rail(railwayNorth, 2);
  rail(railwayEast, 2);
  // Actual rail centerlines have a raised dark ballast bed, ties and paired
  // rails in the local site model. The long drawing is clipped by the renderer.
  const ballast = stock('#707b76', 0.96),
    tie = stock('#60655e', 0.94),
    iron = stock('#9ba8a5', 0.68, 0.22);
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
        b(ballast, x, 0.17, z, 2.39, 0.3, 9.7, yaw);
        for (const off of [-2.35, 2.35]) {
          const mx = x - (dz * off) / len,
            mz = z + (dx * off) / len;
          b(tie, mx, 0.36, mz, 0.54, 0.16, 3, yaw);
          for (const sd of [-0.74, 0.74])
            b(iron, mx - (dz / len) * sd, 0.52, mz + (dx / len) * sd, 2.36, 0.14, 0.15, yaw);
        }
      }
    }
  }
  line(freeway, '#778273', 58);
  for (const side of [-1, 1]) {
    const midline = shiftPath(freeway, side * 15);
    line(midline, '#8f9892', 19.4);
    line(midline, '#626c6c', 17.1);
    for (const d of [-3.5, 3.5]) line(shiftPath(midline, d), '#c5c8b9', 0.3, [3.5, 8]);
    line(shiftPath(midline, side * 7.4), '#c4c4b4', 0.32);
    line(shiftPath(midline, -side * 7.6), '#bdb28c', 0.35);
  }
  // Printed curbs and occasional light standards mark Enterprise Drive.
  // Keep long curbs out of the turning head at the north end of the frontage.
  const curbStock = stock('#a7ac9e', 0.96);
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
    line(edge, '#869384', 1.05);
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
      '#91a09a',
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

import { environmentalState } from '../environment.js';
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { site, places, river } from '../geography.js';
import { createFacility, createDistrict, tableBounds as BOARD } from './physical.js';
import { analyzePlacement } from './analysis.js';
import { createContextOverlay } from './context-overlay.js';
import { createImpactOverlay } from './impact-overlay.js';

const METERS_LAT = 111320;
const METERS_LNG = METERS_LAT * Math.cos((site.center[0] * Math.PI) / 180);

const HALF_TILE_X = 226;
const HALF_TILE_Z = 145;
const EPS = 0.05;
const framing = {
  site: { direction: new THREE.Vector3(-0.9, 0.9, 1.12).normalize(), span: 305 },
  building: { direction: new THREE.Vector3(-1.02, 0.84, 0.82).normalize(), span: 89 },
  district: { direction: new THREE.Vector3(-0.47, 1.14, 1.06).normalize(), span: 1550 }
};
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const within = (p, box) => p.x >= box.minX && p.x <= box.maxX && p.z >= box.minZ && p.z <= box.maxZ;
const toLocal = ([lat, lng], height = 0) =>
  new THREE.Vector3((lng - site.center[1]) * METERS_LNG, height, (site.center[0] - lat) * METERS_LAT);
const toCoords = (p) => [site.center[0] - p.z / METERS_LAT, site.center[1] + p.x / METERS_LNG];

export function sceneContains(point) {
  return (
    Array.isArray(point) &&
    point.length === 2 &&
    point.every(Number.isFinite) &&
    within(toLocal(point), BOARD)
  );
}

function disposeTree(root) {
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set();
  root.traverse((o) => {
    if (o.geometry) geometries.add(o.geometry);
    if (o.isInstancedMesh) o.dispose();
    if (o.material)
      for (const material of [].concat(o.material)) {
        materials.add(material);
        for (const property of Object.values(material)) if (property?.isTexture) textures.add(property);
      }
  });
  geometries.forEach((x) => x.dispose());
  materials.forEach((x) => x.dispose());
  textures.forEach((x) => x.dispose());
}

function roundedPlinth(width, depth, height, top, color) {
  const radius = 1.6,
    w = width / 2,
    d = depth / 2;
  const outline = new THREE.Shape();
  outline.moveTo(-w + radius, -d);
  outline.lineTo(w - radius, -d);
  outline.quadraticCurveTo(w, -d, w, -d + radius);
  outline.lineTo(w, d - radius);
  outline.quadraticCurveTo(w, d, w - radius, d);
  outline.lineTo(-w + radius, d);
  outline.quadraticCurveTo(-w, d, -w, d - radius);
  outline.lineTo(-w, -d + radius);
  outline.quadraticCurveTo(-w, -d, -w + radius, -d);
  const bevel = Math.min(0.28, height * 0.2);
  const geometry = new THREE.ExtrudeGeometry(outline, {
    depth: height - 2 * bevel,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 5
  });
  geometry.rotateX(-Math.PI / 2);
  const object = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color, roughness: 0.52, metalness: 0.24 })
  );
  object.position.y = top - height + bevel;
  object.receiveShadow = true;
  object.castShadow = true;
  return object;
}

// Paint a little indirect contact shadow under the model and under the tabletop.
// This is fixed ambient occlusion for display, independent of the analytical fields.
function contactPatch(width, depth, spread, strength) {
  const map = document.createElement('canvas');
  map.width = 512;
  map.height = Math.round((512 * (depth + 2 * spread)) / (width + 2 * spread));
  const ctx = map.getContext('2d'),
    px = map.width / (width + 2 * spread);
  ctx.fillStyle = '#000';
  ctx.filter = 'blur(' + Math.max(1, spread * px * 0.27) + 'px)';
  ctx.fillRect(spread * px, spread * px, width * px, depth * px);
  const tex = new THREE.CanvasTexture(map);
  const patch = new THREE.Mesh(
    new THREE.PlaneGeometry(width + spread * 2, depth + spread * 2),
    new THREE.MeshBasicMaterial({
      map: tex,
      opacity: strength,
      transparent: true,
      depthWrite: false,
      toneMapped: false
    })
  );
  patch.rotation.x = -Math.PI / 2;
  patch.renderOrder = 1;
  return patch;
}

// Restrict the instanced neighborhood batches to the physical inspection slice.
// The full matrices are retained for switching to the large district table.
function districtBatches(group) {
  const batches = [];
  group.traverse((mesh) => {
    if (!mesh.isInstancedMesh) return;
    const all = mesh.instanceMatrix.array.slice(),
      count = mesh.count;
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox,
      radius = box.getSize(new THREE.Vector3()).multiplyScalar(0.5),
      center = box.getCenter(new THREE.Vector3());
    const bounds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const m = all.subarray(i * 16, i * 16 + 16);
      const x = m[12] + m[0] * center.x + m[4] * center.y + m[8] * center.z,
        z = m[14] + m[2] * center.x + m[6] * center.y + m[10] * center.z;
      const rx = Math.abs(m[0]) * radius.x + Math.abs(m[4]) * radius.y + Math.abs(m[8]) * radius.z,
        rz = Math.abs(m[2]) * radius.x + Math.abs(m[6]) * radius.y + Math.abs(m[10]) * radius.z;
      bounds.set([x - rx, x + rx, z - rz, z + rz], i * 4);
    }
    batches.push({ mesh, all, count, bounds });
  });
  return (crop) => {
    for (const { mesh, all, count, bounds } of batches) {
      const output = mesh.instanceMatrix.array;
      if (!crop) {
        if (mesh.count === count) continue;
        output.set(all);
        mesh.count = count;
      } else {
        let n = 0;
        for (let i = 0; i < count; i++) {
          const j = i * 4;
          if (
            bounds[j + 1] < crop.minX ||
            bounds[j] > crop.maxX ||
            bounds[j + 3] < crop.minZ ||
            bounds[j + 2] > crop.maxZ
          )
            continue;
          output.set(all.subarray(i * 16, i * 16 + 16), n * 16);
          n++;
        }
        mesh.count = n;
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.boundingSphere = null;
    }
  };
}

function makeBackdrop(scene) {
  // A continuous printed seafoam field, with a separate shadow catcher so the
  // page color stays stable while shadows respond to model scale and sunlight.
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(8600, 8600),
    new THREE.ShadowMaterial({ opacity: 0.24, depthWrite: false })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -26;
  floor.receiveShadow = true;
  scene.add(floor);
  return floor;
}

function makeStudioEnvironment(renderer, scene) {
  const room = new THREE.Scene();
  room.background = new THREE.Color('#778a97');
  const panels = [
    [-4, 6, 2, '#fff6e6', 5, 3],
    [4, 2, -3, '#b0def1', 2, 6],
    [0, 5, 5, '#e4edf7', 4, 3]
  ];
  for (const [x, y, z, color, w, h] of panels) {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
    );
    panel.position.set(x, y, z);
    panel.lookAt(0, 0, 0);
    room.add(panel);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, 0.025);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.47;
  disposeTree(room);
  pmrem.dispose();
  return environment;
}

function makeStudioLights(scene, narrow) {
  const hemi = new THREE.HemisphereLight('#e8f4f5', '#a5b7b0', 1.23);
  scene.add(hemi);
  const key = new THREE.DirectionalLight('#f6faf7', 2.25);
  key.castShadow = true;
  key.shadow.mapSize.setScalar(narrow ? 1024 : 2048);
  key.shadow.normalBias = 0.16;
  key.shadow.bias = -0.0002;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight('#badcf7', 0.62);
  rim.position.set(50, 124, -210);
  scene.add(rim);
  return key;
}

function dashedPath(points, color, width = 1) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineDashedMaterial({
    color,
    dashSize: 4.6,
    gapSize: 2.7,
    transparent: true,
    opacity: 0.95,
    linewidth: width,
    depthWrite: false
  });
  const line = new THREE.Line(geometry, mat);
  line.computeLineDistances();
  line.renderOrder = 8;
  return line;
}

// A low-opacity field with dashed equal-level contours. Its radius uses exactly
// the 65 dBA at 15 m outdoor point-source assumption in the workshop analysis.
function makeSoundField() {
  const radius = 165,
    group = new THREE.Group();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d'),
    mid = 256;
  const gradient = ctx.createRadialGradient(mid, mid, 0, mid, mid, mid);
  gradient.addColorStop(0, 'rgba(159,75,171,.32)');
  gradient.addColorStop(0.3, 'rgba(160,71,170,.20)');
  gradient.addColorStop(0.54, 'rgba(175,81,169,.11)');
  gradient.addColorStop(1, 'rgba(165,138,215,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  // The continuous tint and equal-level rings have separate jobs. Only one
  // line is drawn at each radius, with a physical height above the tint.
  for (const [level, opacity] of [
    [45, 0.035],
    [50, 0.05],
    [55, 0.075]
  ]) {
    const px = ((15 * Math.pow(10, (65 - level) / 20)) / radius) * mid;
    ctx.beginPath();
    ctx.arc(mid, mid, px, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(152,73,151,' + opacity + ')';
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const disc = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.58;
  disc.renderOrder = 4;
  group.add(disc);
  for (const level of [55, 50, 45]) {
    const r = 15 * Math.pow(10, (65 - level) / 20),
      p = [];
    for (let i = 0; i <= 200; i++) {
      const a = (i / 200) * Math.PI * 2;
      p.push(new THREE.Vector3(Math.sin(a) * r, 0.79, Math.cos(a) * r));
    }
    const line = dashedPath(p, level === 55 ? '#8a588e' : '#976992');
    line.material.toneMapped = false;
    line.material.opacity = level === 55 ? 0.93 : level === 50 ? 0.74 : 0.62;
    line.material.dashSize = level === 55 ? 2.2 : 3.5;
    line.material.gapSize = 2.6;
    group.add(line);
  }
  return group;
}

function makeRiver() {
  const points = river.map((p) => toLocal(p, 0.23));
  const positions = [],
    indices = [];
  points.forEach((p, i) => {
    const dir = points[Math.min(i + 1, points.length - 1)]
      .clone()
      .sub(points[Math.max(0, i - 1)])
      .normalize();
    const side = new THREE.Vector3(dir.z, 0, -dir.x).multiplyScalar(3.2);
    positions.push(...p.clone().add(side).toArray(), ...p.clone().sub(side).toArray());
    if (i) indices.push(i * 2 - 2, i * 2 - 1, i * 2, i * 2, i * 2 - 1, i * 2 + 1);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const material = new THREE.MeshBasicMaterial({
    color: '#498b9f',
    transparent: true,
    opacity: 0.86,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.renderOrder = 2;
  return mesh;
}

export function makeScene(
  element,
  { onPlace, onPreview, onNote, onMarker, onCenter, onReady, onError, onView } = {}
) {
  const canvas = document.createElement('canvas');
  canvas.className = 'ds-studio-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute(
    'aria-label',
    '3D data center scenario table. Drag the building to move it. Drag the terrain to orbit, scroll to zoom, or use arrow keys to move the facility.'
  );
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false
    });
  } catch (error) {
    onError?.(error);
    throw error;
  }
  element.classList.add('ds-studio');
  const overlay = document.createElement('div');
  overlay.className = 'ds-studio-labels';
  element.append(canvas, overlay);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 9000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.14;
  controls.screenSpacePanning = false;
  controls.maxPolarAngle = Math.PI * 0.445;
  controls.minPolarAngle = 0.001;
  controls.minZoom = 0.075;
  controls.maxZoom = 7;
  controls.rotateSpeed = 0.74;
  controls.zoomSpeed = 1.05;
  controls.panSpeed = 0.87;
  controls.zoomToCursor = false;
  scene.background = new THREE.Color('#dce9e6');
  scene.fog = null;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.8));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  const environment = makeStudioEnvironment(renderer, scene);
  const key = makeStudioLights(scene, element.clientWidth < 640);
  const floor = makeBackdrop(scene);
  const district = createDistrict();
  scene.add(district);
  const setDistrictBatches = districtBatches(district);
  const tile = new THREE.Group();
  tile.add(roundedPlinth(HALF_TILE_X * 2 + 1.8, HALF_TILE_Z * 2 + 1.8, 4.4, -0.64, '#aebfb8'));
  tile.add(roundedPlinth(HALF_TILE_X * 2 + 1.4, HALF_TILE_Z * 2 + 1.4, 0.79, -5.66, '#d8e5de'));
  tile.add(roundedPlinth(HALF_TILE_X * 2 - 1.5, HALF_TILE_Z * 2 - 1.5, 1.75, -7.13, '#819b92'));
  const tableShade = contactPatch(HALF_TILE_X * 2, HALF_TILE_Z * 2, 24, 0.22);
  tableShade.position.y = -10.16;
  tile.add(tableShade);
  scene.add(tile);
  const facilityAnchor = new THREE.Group();
  scene.add(facilityAnchor);
  const buildingShade = contactPatch(46, 90, 6, 0.27);
  buildingShade.position.y = 0.16;
  facilityAnchor.add(buildingShade);
  let design = 'reference',
    asset = createFacility(design);
  facilityAnchor.add(asset);
  const sound = makeSoundField(),
    waterLine = makeRiver();
  const parcel = dashedPath(
    site.boundary.map((p) => toLocal(p, 0.81)),
    '#a36e30'
  );
  const listeningTrace = dashedPath([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)], '#764180');
  listeningTrace.material.opacity = 0.83;
  listeningTrace.material.dashSize = 1.9;
  listeningTrace.material.gapSize = 2.9;
  listeningTrace.material.toneMapped = false;
  const receptorRing = new THREE.Mesh(
    new THREE.RingGeometry(3.25, 4.55, 40),
    new THREE.MeshBasicMaterial({
      color: '#794783',
      toneMapped: false,
      transparent: true,
      opacity: 0.86,
      depthWrite: false
    })
  );
  receptorRing.rotation.x = -Math.PI / 2;
  scene.add(sound, waterLine, parcel, listeningTrace, receptorRing);

  const cropPlanes = [
    new THREE.Plane(new THREE.Vector3(1, 0, 0)),
    new THREE.Plane(new THREE.Vector3(-1, 0, 0)),
    new THREE.Plane(new THREE.Vector3(0, 0, 1)),
    new THREE.Plane(new THREE.Vector3(0, 0, -1))
  ];
  const impact = createImpactOverlay(cropPlanes);
  scene.add(impact.group);
  const context = createContextOverlay(cropPlanes);
  scene.add(context.group);
  const materialSet = new Set();
  for (const group of [district, sound, waterLine, parcel, listeningTrace, receptorRing]) {
    group.traverse((o) => {
      if (o.material) for (const mat of [].concat(o.material)) materialSet.add(mat);
    });
  }
  const surfaceTop = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ray = new THREE.Raycaster(),
    pointer = new THREE.Vector2();
  const scratch = new THREE.Vector3(),
    evTarget = new THREE.Vector3();
  const anchors = new Map();
  let cropBox = BOARD,
    currentlyCropped = false,
    labelsDirty = true,
    projectionDirty = true,
    moving = null;
  let state = { point: [...site.center], angle: 0, design, mode: 'explore', layers: {}, notes: [] };
  let activeView = 'site',
    frame = 0,
    lastWidth = 0,
    lastHeight = 0,
    span = 215,
    disposed = false,
    anim = null;
  let lastActive = null,
    press = null,
    livePoint = null,
    resizeObserver,
    initialized = false;
  let drawSurface = BOARD;

  function addLabel(key, title, kind, where, action) {
    const tag = document.createElement(action ? 'button' : 'span');
    tag.className = 'ds-scene-tag ' + kind;
    tag.textContent = title;
    if (action) {
      tag.type = 'button';
      tag.addEventListener('click', action);
    }
    overlay.appendChild(tag);
    const label = { tag, kind, where };
    anchors.set(key, label);
    return label;
  }
  for (const place of places)
    addLabel(place.id, place.name, place.type, toLocal([place.lat, place.lng], 5));
  addLabel('river', 'Ecorse River', 'river', toLocal([42.27077, -83.20522], 2));
  addLabel('rail', 'Rail corridor · keep clear', 'restriction', toLocal([42.269787, -83.208061], 3));
  addLabel('wetland', 'Mapped wetlands', 'environment', toLocal([42.26785, -83.2077], 3));
  addLabel('easement', 'Conservation easement', 'environment', toLocal([42.2695, -83.2097], 3));
  addLabel('street', 'Enterprise Dr', 'street', new THREE.Vector3(-105.3, 1, -74.55));
  const facilityTag = addLabel('facility', 'Data center', 'facility', new THREE.Vector3(0, 20, 0));
  const contour = addLabel('sound-contour', '55 dBA contour', 'contour', new THREE.Vector3());
  const leaderLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  leaderLayer.classList.add('ds-machine-leaders');
  leaderLayer.setAttribute('aria-hidden', 'true');
  overlay.prepend(leaderLayer);
  const equipmentLabels = [0, 1].map(() => {
    const tag = document.createElement('span');
    tag.className = 'ds-machine-tag';
    tag.hidden = true;
    const link = document.createElementNS(leaderLayer.namespaceURI, 'g');
    const stroke = document.createElementNS(leaderLayer.namespaceURI, 'polyline');
    const dot = document.createElementNS(leaderLayer.namespaceURI, 'circle');
    dot.setAttribute('r', '3.4');
    link.append(stroke, dot);
    leaderLayer.append(link);
    overlay.append(tag);
    return { tag, stroke, dot, link };
  });
  function layoutEquipment() {
    const equipment = asset.userData.equipment || [];
    const show = activeView === 'building' && facilityAnchor.visible && !moving;
    facilityAnchor.updateWorldMatrix(true, false);
    const pins = equipment.map(([name, x, y, z]) => {
      const projected = new THREE.Vector3(x, y, z)
        .applyMatrix4(facilityAnchor.matrixWorld)
        .project(camera);
      return { name, x: ((projected.x + 1) * lastWidth) / 2, y: ((1 - projected.y) * lastHeight) / 2 };
    });
    // Divide the drawing by the real equipment positions. This also reverses
    // the leaders when the user orbits to the opposite side of the model.
    const left = pins.length === 2 && pins[0].x > pins[1].x ? 1 : 0;
    for (const [i, item] of equipmentLabels.entries()) {
      const pin = pins[i];
      const on =
        show && pin && pin.x > 3 && pin.x < lastWidth - 3 && pin.y > 9 && pin.y < lastHeight - 6;
      item.tag.hidden = !on;
      item.link.style.display = on ? '' : 'none';
      if (!on) continue;
      if (item.tag.textContent !== pin.name) item.tag.textContent = pin.name;
      const isLeft = i === left;
      const w = item.tag.offsetWidth,
        h = item.tag.offsetHeight;
      const dx = lastWidth > 540 ? 65 : 21;
      const horizontal = i === 0 ? -1 : 1;
      const tx = THREE.MathUtils.clamp(isLeft ? pin.x - w - dx : pin.x + dx, 9, lastWidth - w - 9);
      const ty = THREE.MathUtils.clamp(
        pin.y + horizontal * (lastWidth > 540 ? 46 : 33) - h / 2,
        16,
        lastHeight - h - 20
      );
      item.tag.style.left = tx + 'px';
      item.tag.style.top = ty + 'px';
      const endX = isLeft ? tx + w : tx,
        endY = ty + h / 2;
      const elbow = endX + (isLeft ? 11 : -11);
      item.stroke.setAttribute(
        'points',
        pin.x + ',' + pin.y + ' ' + elbow + ',' + endY + ' ' + endX + ',' + endY
      );
      item.dot.setAttribute('cx', pin.x);
      item.dot.setAttribute('cy', pin.y);
    }
  }
  const noteLabels = new Map();
  function setNoteLabels(notes) {
    const ids = new Set(notes.map((n) => n.id));
    for (const [id, tag] of noteLabels)
      if (!ids.has(id)) {
        tag.tag.remove();
        noteLabels.delete(id);
        anchors.delete('note-' + id);
      }
    for (const n of notes) {
      let label = noteLabels.get(n.id);
      if (!label) {
        label = addLabel('note-' + n.id, n.topic || 'Note', 'note', toLocal([n.lat, n.lng], 3), () =>
          onMarker?.(n.id)
        );
        noteLabels.set(n.id, label);
      }
      label.where.copy(toLocal([n.lat, n.lng], 3));
      label.tag.classList.toggle('selected', n.id === state.selectedNote);
    }
  }

  function setCrop(use, center) {
    if (use) {
      const x = THREE.MathUtils.clamp(center.x, BOARD.minX + HALF_TILE_X, BOARD.maxX - HALF_TILE_X);
      const z = THREE.MathUtils.clamp(center.z, BOARD.minZ + HALF_TILE_Z, BOARD.maxZ - HALF_TILE_Z);
      cropBox = {
        minX: x - HALF_TILE_X,
        maxX: x + HALF_TILE_X,
        minZ: z - HALF_TILE_Z,
        maxZ: z + HALF_TILE_Z
      };
      cropPlanes[0].constant = -cropBox.minX;
      cropPlanes[1].constant = cropBox.maxX;
      cropPlanes[2].constant = -cropBox.minZ;
      cropPlanes[3].constant = cropBox.maxZ;
      tile.position.set(x, 0, z);
    } else cropBox = BOARD;
    cropPlanes[0].constant = -cropBox.minX;
    cropPlanes[1].constant = cropBox.maxX;
    cropPlanes[2].constant = -cropBox.minZ;
    cropPlanes[3].constant = cropBox.maxZ;
    if (!initialized)
      for (const m of materialSet) {
        m.clippingPlanes = cropPlanes;
        m.clipShadows = true;
        m.needsUpdate = true;
      }
    setDistrictBatches(use ? cropBox : null);
    currentlyCropped = use;
    tile.visible = use;
    district.userData.plinth.visible = !use;
    drawSurface = cropBox;
    floor.position.y = use ? -10.26 : -29.22;
    const target = use
      ? tile.position
      : new THREE.Vector3((BOARD.minX + BOARD.maxX) / 2, 0, (BOARD.minZ + BOARD.maxZ) / 2);
    key.target.position.copy(target);
    const r = use ? 315 : 1190;
    key.position.copy(target).add(new THREE.Vector3(-0.9, 1.22, 0.56).multiplyScalar(r * 2.0));
    Object.assign(key.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: r * 7 });
    key.shadow.camera.updateProjectionMatrix();
    labelsDirty = true;
  }

  function schedule() {
    if (!frame && !disposed) frame = requestAnimationFrame(draw);
  }
  function updateProjection() {
    if (!lastWidth || !lastHeight) return;
    const narrow = lastWidth / lastHeight < 1.0;
    const aspect = lastWidth / lastHeight,
      vertical = narrow ? span / (aspect + 0.01) : Math.max(span, (span * 1.4) / aspect);
    // Fit all four corners of the local tabletop on portrait and landscape.
    // The inspection and plan cameras keep their independent close framings.
    const vx = framing.site.direction;
    const horizontal = Math.hypot(vx.x, vx.z);
    const boardW = (2 * (Math.abs(vx.z) * HALF_TILE_X + Math.abs(vx.x) * HALF_TILE_Z)) / horizontal;
    const boardH =
      (2 * vx.y * (Math.abs(vx.x) * HALF_TILE_X + Math.abs(vx.z) * HALF_TILE_Z)) / horizontal + 17;
    let fit = vertical;
    if (activeView === 'site') fit = Math.max(vertical, boardW / (aspect * 0.88), boardH / 0.76);
    else if (activeView === 'building' && narrow) fit = Math.max(fit, 112 / aspect);
    Object.assign(camera, {
      left: (-fit * aspect) / 2,
      right: (fit * aspect) / 2,
      top: fit / 2,
      bottom: -fit / 2
    });
    camera.updateProjectionMatrix();
    projectionDirty = false;
  }
  function layoutLabels() {
    layoutEquipment();
    if (facilityAnchor.visible) {
      scratch.copy(facilityAnchor.position);
      scratch.y += 12;
      scratch.project(camera);
      canvas.dataset.facilityX = ((scratch.x + 1) * 0.5 * lastWidth).toFixed(1);
      canvas.dataset.facilityY = ((1 - scratch.y) * 0.5 * lastHeight).toFixed(1);
    } else {
      delete canvas.dataset.facilityX;
      delete canvas.dataset.facilityY;
    }
    const layers = state.layers || {};
    const visible = [];
    for (const [id, item] of anchors) {
      const p = item.where,
        kind = item.kind;
      let on = within(p, cropBox);
      if (kind === 'facility')
        on =
          on &&
          Boolean(state.point) &&
          (item.tag.classList.contains('conflict') || (activeView !== 'building' && !moving));
      else if (kind === 'restriction') on = on && activeView === 'district' && layers.constraints !== false;
      else if (kind === 'environment') on = on && activeView === 'district' && layers.environment !== false && environmentalState.find(s=>s.id===(id==='wetland'?'wetlands':'open-space'))?.state==='ready';
      else if (kind === 'river') on = on && layers.river !== false;
      else if (kind === 'contour')
        on = on && activeView === 'site' && currentlyCropped && sound.visible && lastWidth > 490;
      else if (kind === 'note') on = on && layers.notes !== false;
      else if (kind === 'street') on = on && currentlyCropped && lastWidth > 450;
      else on = on && layers.places !== false;
      if (!on) {
        item.tag.hidden = true;
        continue;
      }
      scratch.copy(p).project(camera);
      const x = (scratch.x + 1) * 0.5 * lastWidth,
        y = (1 - scratch.y) * 0.5 * lastHeight;
      if (
        x < 12 ||
        x > lastWidth - 12 ||
        y < 22 ||
        y > lastHeight - 16 ||
        scratch.z < -1 ||
        scratch.z > 1
      ) {
        item.tag.hidden = true;
        continue;
      }
      visible.push({
        id,
        item,
        x,
        y,
        order:
          kind === 'facility'
            ? 0
            : kind === 'note' || item.tag.classList.contains('ds-listening')
              ? 1
              : kind === 'street'
                ? 4
                : 2
      });
    }
    const accepted = [];
    for (const { item, x, y } of visible.sort((a, b) => a.order - b.order)) {
      const width =
        item.kind === 'facility'
          ? item.tag.offsetWidth || Math.min(250, item.tag.textContent.length * 6.4 + 21)
          : Math.min(244, item.tag.textContent.length * 6.1 + 20);
      const height = item.kind === 'facility' ? 23 : 17;
      const left = THREE.MathUtils.clamp(
          x - width / 2 + (item.kind === 'facility' ? -23 : 0),
          4,
          lastWidth - width - 4
        ),
        top = y - height - (item.kind === 'facility' ? 29 : 5);
      let labelY = top;
      const intersects = (y) =>
        accepted.some(
          (b) => left < b[2] + 4 && left + width > b[0] - 4 && y < b[3] + 2 && y + height > b[1] - 2
        );
      if (intersects(labelY) && item.tag.classList.contains('ds-listening')) {
        labelY = y + 10;
        if (intersects(labelY)) labelY += height + 5;
      }
      const overlaps = intersects(labelY);
      item.tag.hidden = overlaps;
      if (overlaps) continue;
      item.tag.style.left = left + 'px';
      item.tag.style.top = labelY + 'px';
      accepted.push([left, labelY, left + width, labelY + height]);
    }
    labelsDirty = false;
  }
  function updateOutOfBounds() {
    element.classList.toggle(
      'ds-outside-model',
      Boolean(state.point) && !within(toLocal(state.point), BOARD)
    );
  }
  function setFacility(point) {
    context.update(state.layers,activeView === 'district');
    const result = impact.update(
      { point, angle: state.angle || 0, design: state.design },
      {
        enabled: state.layers?.constraints !== false,
        receptorId: state.receptorId,
        lens: state.lens,
        showRiver: state.layers?.river !== false,
        showParcel: state.layers?.parcel !== false && state.layers?.site !== false,
        showSound: state.layers?.sound !== false && state.layers?.noise !== false
      }
    );
    const on = state.layers?.constraints !== false && Boolean(point) && result.items.length > 0;
    facilityTag.tag.classList.toggle('conflict', on);
    facilityTag.tag.dataset.status=result.status;
    const title = on ? result.items[0].title : 'Data center';
    if (facilityTag.tag.textContent !== title) facilityTag.tag.textContent = title;
    if (!point) {
      labelsDirty = true;
      listeningTrace.visible = false;
      receptorRing.visible = false;
      for (const place of places) {
        const tag = anchors.get(place.id).tag;
        tag.classList.remove('ds-listening');
        tag.textContent = place.name;
      }
      facilityAnchor.visible = false;
      sound.visible = false;
      return;
    }
    const pos = toLocal(point);
    facilityAnchor.position.copy(pos);
    facilityAnchor.rotation.y = -THREE.MathUtils.degToRad(state.angle || 0);
    facilityAnchor.visible = within(pos, BOARD);
    facilityTag.where.copy(pos);
    facilityTag.where.y = 21.8;
    const calculation = analyzePlacement(
      { point, angle: state.angle || 0, design: state.design },
      { receptorId: state.receptorId }
    );
    const source = calculation.sourcePoint;
    sound.position.copy(toLocal(source));
    contour.where.copy(sound.position).add(new THREE.Vector3(-40, 0, 25.5));
    sound.visible =
      activeView !== 'building' && facilityAnchor.visible && state.layers?.sound !== false && state.layers?.noise !== false;
    const receiver = places.find((p) => p.id === state.receptorId) || places[0];
    const end = toLocal([receiver.lat, receiver.lng], 0.88);
    const start = sound.position;
    const positions = listeningTrace.geometry.attributes.position,
      distances = listeningTrace.geometry.attributes.lineDistance;
    positions.setXYZ(0, start.x, 0.88, start.z);
    positions.setXYZ(1, end.x, 0.88, end.z);
    positions.needsUpdate = true;
    distances.setX(1, Math.hypot(end.x - start.x, end.z - start.z));
    distances.needsUpdate = true;
    listeningTrace.geometry.computeBoundingSphere();
    receptorRing.position.copy(end);
    listeningTrace.visible = sound.visible;
    receptorRing.visible = sound.visible;
    for (const place of places) {
      const selected = place.id === receiver.id && sound.visible;
      const tag = anchors.get(place.id).tag;
      tag.classList.toggle('ds-listening', selected);
      const label = selected
        ? place.name + ' · ' + calculation.soundDbA.toFixed(1) + ' dBA'
        : place.name;
      if (tag.textContent !== label) tag.textContent = label;
    }
    labelsDirty = true;
  }
  function render(next) {
    state = next;
    if (next.design && next.design !== design) {
      facilityAnchor.remove(asset);
      disposeTree(asset);
      design = next.design;
      asset = createFacility(design);
      facilityAnchor.add(asset);
    }
    waterLine.visible = state.layers?.river !== false;
    parcel.visible = state.layers?.site !== false;
    element.dataset.mode = state.mode;
    setNoteLabels(state.notes || []);
    setFacility(livePoint || state.point);
    updateOutOfBounds();
    schedule();
  }

  function view(name = 'site', immediate = false, center = null) {
    if (!Object.hasOwn(framing, name)) return;
    const point =
      center ||
      (state.point && within(toLocal(state.point), BOARD) ? toLocal(state.point) : new THREE.Vector3());
    activeView = name;
    setFacility(livePoint || state.point);
    const target = name === 'district' ? new THREE.Vector3(120, 0, -100) : point.clone();
    // The inspection tile preserves a strip of the western equipment yard and access road.
    if (name === 'site') {
      target.x += 39;
      target.z -= 6;
      target.y = 2;
    }
    if (name === 'building') target.y = 6;
    const { direction, span: nextSpan } = framing[name];
    const distance = name === 'district' ? 3100 : 1800;
    const cropped = name === 'site' || name === 'building';
    setCrop(cropped, target);
    // An orthographic depth range fitted to the model keeps thin grilles, rail
    // heads and projected fields stable, even on shallow-angle tablet views.
    const depth = name === 'district' ? 1720 : name === 'plan' ? 800 : 680;
    camera.userData.depth = depth;
    const end = target.clone().addScaledVector(direction, distance);
    if (immediate || reducedMotion() || !initialized) {
      anim = null;
      span = nextSpan;
      camera.zoom = 1;
      camera.position.copy(end);
      controls.target.copy(target);
      camera.lookAt(target);
      projectionDirty = true;
      controls.update();
    } else {
      anim = {
        time: performance.now(),
        from: camera.position.clone(),
        to: end,
        fromTarget: controls.target.clone(),
        target,
        fromSpan: span / camera.zoom,
        toSpan: nextSpan
      };
      camera.zoom = 1;
    }
    onView?.(name);
    labelsDirty = true;
    schedule();
  }
  function draw(t) {
    frame = 0;
    if (disposed) return;
    if (anim) {
      const v = THREE.MathUtils.clamp((t - anim.time) / 430, 0, 1),
        s = v * v * (3 - 2 * v);
      camera.position.lerpVectors(anim.from, anim.to, s);
      controls.target.lerpVectors(anim.fromTarget, anim.target, s);
      span = THREE.MathUtils.lerp(anim.fromSpan, anim.toSpan, s);
      projectionDirty = true;
      if (v === 1) anim = null;
    }
    if (projectionDirty) updateProjection();
    const changed = controls.update();
    if (changed || anim || labelsDirty) {
      const focusDistance = camera.position.distanceTo(controls.target);
      const near = Math.max(0.1, focusDistance - camera.userData.depth);
      const far = focusDistance + camera.userData.depth;
      if (
        Number.isFinite(near) &&
        (Math.abs(camera.near - near) > 0.05 || Math.abs(camera.far - far) > 0.05)
      ) {
        camera.near = near;
        camera.far = far;
        camera.updateProjectionMatrix();
      }
      camera.updateMatrixWorld();
      layoutLabels();
    }
    renderer.render(scene, camera);
    if (anim || changed) schedule();
    if (!initialized) {
      initialized = true;
      canvas.dataset.ready = 'true';
      onReady?.();
    }
  }
  controls.addEventListener('start', () => {
    anim = null;
  });
  controls.addEventListener('change', () => {
    labelsDirty = true;
    onCenter?.(toCoords(controls.target));
    schedule();
  });
  function resize() {
    const w = Math.round(element.clientWidth),
      h = Math.round(element.clientHeight);
    if (!w || !h || (w === lastWidth && h === lastHeight)) return;
    lastWidth = w;
    lastHeight = h;
    renderer.setSize(w, h, false);
    projectionDirty = true;
    labelsDirty = true;
    schedule();
  }
  function updateRay(e) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1
    );
    ray.setFromCamera(pointer, camera);
  }
  function groundPoint(e) {
    updateRay(e);
    const hit = ray.ray.intersectPlane(surfaceTop, evTarget);
    return hit ? hit.clone() : null;
  }
  function hitsFacility(e) {
    if (!facilityAnchor.visible) return false;
    updateRay(e);
    return ray.intersectObject(asset, true).length > 0;
  }
  function finishDrag(e, cancelled) {
    if (!moving || e.pointerId !== moving.id) return;
    const drop = livePoint;
    moving = null;
    livePoint = null;
    controls.enabled = true;
    element.classList.remove('ds-dragging');
    labelsDirty = true;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    if (drop && !cancelled) {
      onPlace?.(drop);
      if (
        currentlyCropped &&
        (Math.abs(toLocal(drop).x - tile.position.x) > HALF_TILE_X - 32 ||
          Math.abs(toLocal(drop).z - tile.position.z) > HALF_TILE_Z - 40)
      )
        view(activeView, false, toLocal(drop));
    } else {
      setFacility(state.point);
      if (state.point) onPreview?.(state.point);
    }
    press = null;
    schedule();
  }
  function down(e) {
    if (e.button !== 0 || !e.isPrimary || moving) return;
    anim = null;
    press = { id: e.pointerId, x: e.clientX, y: e.clientY };
    if (state.mode === 'note' || !hitsFacility(e)) return;
    const start = groundPoint(e);
    if (!start || !state.point) return;
    moving = { id: e.pointerId, start, original: toLocal(state.point), dragged: false };
    controls.enabled = false;
    canvas.setPointerCapture(e.pointerId);
    e.stopImmediatePropagation();
    e.preventDefault();
    canvas.focus({ preventScroll: true });
  }
  function move(e) {
    if (!moving) {
      return;
    }
    if (e.pointerId !== moving.id) return;
    if (!moving.dragged && Math.hypot(e.clientX - press.x, e.clientY - press.y) < 2) return;
    const hit = groundPoint(e);
    if (!hit) return;
    const next = hit.sub(moving.start).add(moving.original);
    next.x = THREE.MathUtils.clamp(next.x, BOARD.minX + EPS, BOARD.maxX - EPS);
    next.z = THREE.MathUtils.clamp(next.z, BOARD.minZ + EPS, BOARD.maxZ - EPS);
    moving.dragged = true;
    livePoint = toCoords(next);
    setFacility(livePoint);
    onPreview?.(livePoint);
    element.classList.add('ds-dragging');
    schedule();
  }
  function up(e) {
    if (moving) {
      e.stopImmediatePropagation();
      finishDrag(e, false);
      return;
    }
    if (!press || e.pointerId !== press.id) return;
    const click = Math.hypot(e.clientX - press.x, e.clientY - press.y) < 5;
    press = null;
    if (!click || !['place', 'note'].includes(state.mode)) return;
    const hit = groundPoint(e);
    if (!hit || !within(hit, drawSurface)) return;
    const point = toCoords(hit);
    if (state.mode === 'note') onNote?.(point);
    else onPlace?.(point);
  }
  function cancel(e) {
    finishDrag(e, true);
    press = null;
  }
  function keys(e) {
    if (!state.point || e.altKey || e.ctrlKey || e.metaKey) return;
    const offset = { ArrowUp: [0, -1], ArrowRight: [1, 0], ArrowDown: [0, 1], ArrowLeft: [-1, 0] }[
      e.key
    ];
    if (!offset) return;
    const p = toLocal(state.point),
      step = e.shiftKey ? 15.24 : 3.048;
    p.x += offset[0] * step;
    p.z += offset[1] * step;
    if (within(p, BOARD)) onPlace?.(toCoords(p));
    e.preventDefault();
  }
  canvas.addEventListener('pointerdown', down, true);
  canvas.addEventListener('pointermove', move, true);
  canvas.addEventListener('pointerup', up, true);
  canvas.addEventListener('pointercancel', cancel, true);
  canvas.addEventListener('keydown', keys);
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    onError?.(new Error('3D graphics context lost'));
  });
  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(element);
  resize();
  view('site', true);
  return {
    render,
    resize,
    view,
    home() {
      view('site');
    },
    focus(coords) {
      const p = toLocal(coords);
      if (within(p, BOARD)) view(activeView === 'district' ? 'site' : activeView, false, p);
      else view('district');
    },
    zoomBy(d) {
      anim = null;
      camera.zoom = THREE.MathUtils.clamp(camera.zoom * Math.pow(1.32, d), 0.075, 7);
      camera.updateProjectionMatrix();
      labelsDirty = true;
      schedule();
    },
    destroy() {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      controls.dispose();
      environment.dispose();
      context.dispose();
      impact.dispose();
      disposeTree(scene);
      renderer.dispose();
      canvas.remove();
      overlay.remove();
      element.classList.remove('ds-studio', 'ds-dragging');
    }
  };
}

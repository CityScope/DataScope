import { environmentalState } from '../environment.js';
import { dragBearing, normalizeBearing } from './rotation.js';
import { icon } from '../icons.js';
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { site, places, river, springCreek } from '../geography.js';
import { createFacility, createDistrict, tableBounds as BOARD } from './physical.js';
import { analyzePlacement, soundContourLocal, resolveCoolingId, resolveIntegrationId, resolveEnergyId } from './analysis.js';
import { createContextOverlay } from './context-overlay.js';
import { createImpactOverlay } from './impact-overlay.js';

const METERS_LAT = 111320;
const METERS_LNG = METERS_LAT * Math.cos((site.center[0] * Math.PI) / 180);

const HALF_TILE_X = 285;
const HALF_TILE_Z = 185;
const EPS = 0.05;
const framing = {
  site: { direction: new THREE.Vector3(-0.88, 0.92, 1.12).normalize(), span: 365 },
  building: { direction: new THREE.Vector3(-0.96, 0.86, 0.88).normalize(), span: 142 },
  district: { direction: new THREE.Vector3(-0.45, 1.16, 1.08).normalize(), span: 1780 }
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
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(9200, 9200),
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
  const hemi = new THREE.HemisphereLight('#ebf5f3', '#a7b8ae', 1.24);
  scene.add(hemi);
  const key = new THREE.DirectionalLight('#f8faf6', 2.25);
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

let acousticGlowTexture = null;
function getAcousticGlowTexture() {
  if (acousticGlowTexture) return acousticGlowTexture;
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0.0, 'rgba(182, 108, 198, 0.0)');
  g.addColorStop(0.28, 'rgba(182, 108, 198, 0.14)');
  g.addColorStop(0.58, 'rgba(176, 94, 194, 0.52)');
  g.addColorStop(0.76, 'rgba(168, 86, 186, 0.42)');
  g.addColorStop(0.9, 'rgba(182, 108, 198, 0.12)');
  g.addColorStop(1.0, 'rgba(182, 108, 198, 0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  acousticGlowTexture = tex;
  return tex;
}

// Directional ISO 9613-2 sound contours (55, 50, 45 dBA) + slow diffused
// acoustic emission waves fading softly outward from the building.
function makeSoundField(cooling, integration, cropPlanes = []) {
  const group = new THREE.Group();
  const layers = [
    [45, 0.045, '#9b6d9e', 0.36, 3.6],
    [50, 0.068, '#966399', 0.48, 3.2],
    [55, 0.095, '#8a528f', 0.64, 2.2]
  ];
  let labelLocal = new THREE.Vector3(-60, 0, 35);
  let outerRing = null;
  layers.forEach(([level, fillOpacity, strokeColor, strokeOpacity, dashSize], i) => {
    const ring = soundContourLocal(cooling, level, 84, integration);
    if (level === 45) outerRing = ring;
    const shape = new THREE.Shape();
    ring.forEach(([east, north], idx) => {
      if (idx === 0) shape.moveTo(east, north);
      else shape.lineTo(east, north);
    });
    shape.closePath();
    const geom = new THREE.ShapeGeometry(shape);
    geom.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: '#9c4fa3',
      transparent: true,
      opacity: fillOpacity,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
      clippingPlanes: cropPlanes
    });
    const fill = new THREE.Mesh(geom, mat);
    fill.position.y = 0.54 + i * 0.025;
    fill.renderOrder = 4 + i;
    group.add(fill);

    const pts = ring.map(([east, north]) => new THREE.Vector3(east, 0.79, -north));
    pts.push(pts[0].clone());
    const line = dashedPath(pts, strokeColor);
    line.material.toneMapped = false;
    line.material.opacity = strokeOpacity;
    line.material.dashSize = dashSize;
    line.material.gapSize = 2.6;
    line.material.clippingPlanes = cropPlanes;
    group.add(line);

    if (level === 55) {
      const idx = Math.round((215 / 360) * ring.length) % ring.length;
      labelLocal = new THREE.Vector3(ring[idx][0], 0.85, -ring[idx][1]);
    }
  });

  // 2 slow, diffused feather-edged emission rings radiating gently outward
  const waves = [];
  if (outerRing && outerRing.length > 8) {
    const ox = -6.2,
      oz = 6.0;
    const relPts = outerRing.map(([east, north]) => [east - ox, -north - oz]);
    const bandPositions = [];
    const bandUvs = [];
    const bandIndices = [];
    const n = relPts.length;
    for (let i = 0; i < n; i++) {
      const [rx, rz] = relPts[i];
      bandPositions.push(rx * 0.46, 0, rz * 0.46, rx, 0, rz);
      bandUvs.push(0.5, 1.0, 0.5, 0.0);
      const next = (i + 1) % n;
      const a = i * 2,
        b = a + 1,
        c = next * 2,
        d = c + 1;
      bandIndices.push(a, b, c, c, b, d);
    }
    const bandGeoBase = new THREE.BufferGeometry();
    bandGeoBase.setAttribute('position', new THREE.Float32BufferAttribute(bandPositions, 3));
    bandGeoBase.setAttribute('uv', new THREE.Float32BufferAttribute(bandUvs, 2));
    bandGeoBase.setIndex(bandIndices);
    const glowTex = getAcousticGlowTexture();

    for (let w = 0; w < 2; w++) {
      const waveGroup = new THREE.Group();
      waveGroup.position.set(ox, 0.84 + w * 0.025, oz);
      const bandMat = new THREE.MeshBasicMaterial({
        map: glowTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
        clippingPlanes: cropPlanes
      });
      const bandMesh = new THREE.Mesh(bandGeoBase.clone(), bandMat);
      bandMesh.renderOrder = 9 + w;
      waveGroup.add(bandMesh);
      group.add(waveGroup);
      waves.push({ group: waveGroup, bandMat, offset: w / 2 });
    }
    bandGeoBase.dispose();
  }

  group.userData.labelLocal = labelLocal;
  group.userData.waves = waves;
  return group;
}

function makeRiver() {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    color: '#498b9f',
    transparent: true,
    opacity: 0.86,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  for (const [stream, width] of [
    [river, 3.6],
    [springCreek, 3.0]
  ]) {
    if (!stream || stream.length < 2) continue;
    const points = stream.map((p) => toLocal(p, 0.23));
    const positions = [],
      indices = [];
    points.forEach((p, i) => {
      const dir = points[Math.min(i + 1, points.length - 1)]
        .clone()
        .sub(points[Math.max(0, i - 1)])
        .normalize();
      const side = new THREE.Vector3(dir.z, 0, -dir.x).multiplyScalar(width);
      positions.push(...p.clone().add(side).toArray(), ...p.clone().sub(side).toArray());
      if (i) indices.push(i * 2 - 2, i * 2 - 1, i * 2, i * 2, i * 2 - 1, i * 2 + 1);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material);
    mesh.renderOrder = 2;
    group.add(mesh);
  }
  return group;
}

function makeRotationDisc() {
  const group = new THREE.Group();
  const ring = (inner, outer, opacity, order) => {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(inner, outer, 96),
      new THREE.MeshBasicMaterial({
        color: '#447e70',
        transparent: true,
        opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = order;
    group.add(mesh);
    return mesh;
  };
  ring(0.94, 1.06, 0.08, 30);
  ring(0.996, 1.004, 0.78, 31);
  const target = ring(0.85, 1.15, 0, 29);
  const ticks = [];
  for (let i = 0; i < 24; i++) {
    const angle = (i * Math.PI) / 12,
      inner = i % 6 === 0 ? 0.91 : 0.97;
    ticks.push(Math.sin(angle) * inner, 0, -Math.cos(angle) * inner, Math.sin(angle), 0, -Math.cos(angle));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(ticks, 3));
  const marks = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({ color: '#447e70', transparent: true, opacity: 0.72, depthWrite: false, toneMapped: false })
  );
  marks.renderOrder = 32;
  group.add(marks);
  return { group, target };
}

export function makeScene(
  element,
  { onPlace, onPreview, onRotate, onRotatePreview, onNote, onMarker, onCenter, onReady, onError, onView, onDemoChange } = {}
) {
  const canvas = document.createElement('canvas');
  canvas.className = 'ds-studio-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute(
    'aria-label',
    '3D College Station Scenario Editor. Drag the building to move it, or the rotation disc to turn it. Use arrow keys for fine movement and rotation.'
  );
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      stencil: true,
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
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 9500);
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

  let activeCooling = 't1',
    activeIntegration = 'd1',
    activeEnergy = 'e1',
    asset = createFacility(activeCooling, { integration: activeIntegration, energy: activeEnergy });
  facilityAnchor.add(asset);

  const rotationDisc = makeRotationDisc();
  scene.add(rotationDisc.group);
  const rotationGrip = document.createElement('div');
  rotationGrip.className = 'ds-rotation-grip';
  rotationGrip.tabIndex = 0;
  rotationGrip.setAttribute('role', 'slider');
  rotationGrip.setAttribute('aria-label', 'Facility rotation');
  rotationGrip.setAttribute('aria-valuemin', '0');
  rotationGrip.setAttribute('aria-valuemax', '359');
  rotationGrip.title = 'Drag the disc to rotate. Arrow keys turn 5°; Shift turns 15°.';
  rotationGrip.innerHTML = icon('rotate') + '<span class="ds-rotation-value"></span>';
  overlay.append(rotationGrip);
  let liveAngle = null,
    turning = null;
  const rotationPoint = new THREE.Vector3();

  function layoutRotation() {
    const show = facilityAnchor.visible && state.mode !== 'note';
    rotationDisc.group.visible = show;
    rotationGrip.hidden = !show;
    if (!show) return;
    const angle = liveAngle ?? state.angle ?? 0;
    const radius = Math.max(58, ((camera.top - camera.bottom) / (camera.zoom * lastHeight)) * 30);
    rotationDisc.group.position.copy(facilityAnchor.position);
    rotationDisc.group.position.y = 1.6;
    rotationDisc.group.scale.setScalar(radius);
    rotationDisc.group.rotation.y = -THREE.MathUtils.degToRad(angle);
    rotationDisc.group.updateMatrixWorld(true);
    rotationPoint.copy(camera.position).sub(facilityAnchor.position);
    rotationPoint.y = 0;
    rotationPoint.normalize().multiplyScalar(radius).add(facilityAnchor.position);
    rotationPoint.y = 1.6;
    rotationPoint.project(camera);
    const x = ((rotationPoint.x + 1) * lastWidth) / 2,
      y = ((1 - rotationPoint.y) * lastHeight) / 2;
    rotationGrip.hidden =
      x < 16 || x > lastWidth - 16 || y < 18 || y > lastHeight - 30 || rotationPoint.z < -1 || rotationPoint.z > 1;
    rotationGrip.style.left = x + 'px';
    rotationGrip.style.top = y + 'px';
    rotationGrip.setAttribute('aria-valuenow', String(angle));
    rotationGrip.setAttribute('aria-valuetext', angle + ' degrees clockwise from north');
    rotationGrip.querySelector('span').textContent = angle + '°';
  }

  const cropPlanes = [
    new THREE.Plane(new THREE.Vector3(1, 0, 0)),
    new THREE.Plane(new THREE.Vector3(-1, 0, 0)),
    new THREE.Plane(new THREE.Vector3(0, 0, 1)),
    new THREE.Plane(new THREE.Vector3(0, 0, -1))
  ];
  let sound = makeSoundField(activeCooling, activeIntegration, cropPlanes);
  const waterLine = makeRiver();
  const parcel = dashedPath(
    site.boundary.map((p) => toLocal(p, 0.81)),
    '#a36e30'
  );
  const listeningTrace = dashedPath([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)], '#764180');
  listeningTrace.material.opacity = 0.83;
  listeningTrace.material.dashSize = 2.4;
  listeningTrace.material.gapSize = 3.2;
  listeningTrace.material.toneMapped = false;
  const receptorRing = new THREE.Mesh(
    new THREE.RingGeometry(4.2, 6.2, 40),
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

  const impact = createImpactOverlay(cropPlanes);
  scene.add(impact.group);
  const context = createContextOverlay(cropPlanes);
  scene.add(context.group);
  const materialSet = new Set();
  for (const group of [district, waterLine, parcel, listeningTrace, receptorRing]) {
    group.traverse((o) => {
      if (o.material) for (const mat of [].concat(o.material)) materialSet.add(mat);
    });
  }
  district.userData.plinth.traverse((o) => {
    if (o.material) for (const mat of [].concat(o.material)) materialSet.delete(mat);
  });

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
  let state = {
    point: [...site.center],
    angle: 0,
    integration: 'd1',
    cooling: 't1',
    energy: 'e1',
    benefits: [],
    mode: 'explore',
    layers: {},
    notes: []
  };
  let activeView = 'site',
    frame = 0,
    lastWidth = 0,
    lastHeight = 0,
    span = 260,
    disposed = false,
    anim = null;
  let press = null,
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
    addLabel(place.id, place.name, place.type, toLocal([place.lat, place.lng], 6));
  addLabel('river', 'Lick Creek', 'river', toLocal([30.5754, -96.2625], 2));
  addLabel('spring-creek', 'Spring Creek', 'river', toLocal([30.5679, -96.256], 2));
  addLabel('sh6', 'SH 6 · Earl Rudder Fwy', 'restriction', toLocal([30.5678, -96.2686], 3));
  addLabel('street', 'Lakeway Dr', 'street', toLocal([30.5709, -96.265], 1));
  addLabel('fitch', 'William D. Fitch Pkwy', 'street', toLocal([30.5624, -96.254], 1));
  const facilityTag = addLabel('facility', 'Data center', 'facility', new THREE.Vector3(0, 20, 0));
  const contour = addLabel('sound-contour', '55 dBA screen', 'contour', new THREE.Vector3());

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
      const rightSafe = lastWidth > 900 ? 326 : 12;
      const leftSafe = lastWidth > 900 ? 260 : 9;
      const tx = THREE.MathUtils.clamp(isLeft ? pin.x - w - dx : pin.x + dx, leftSafe, Math.max(leftSafe, lastWidth - w - rightSafe));
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
    const r = use ? 375 : 1380;
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
    const vx = framing.site.direction;
    const horizontal = Math.hypot(vx.x, vx.z);
    const boardW = (2 * (Math.abs(vx.z) * HALF_TILE_X + Math.abs(vx.x) * HALF_TILE_Z)) / horizontal;
    const boardH =
      (2 * vx.y * (Math.abs(vx.x) * HALF_TILE_X + Math.abs(vx.z) * HALF_TILE_Z)) / horizontal + 17;
    let fit = vertical;
    if (activeView === 'site') fit = Math.max(vertical, boardW / (aspect * 0.88), boardH / 0.76);
    else if (activeView === 'building' && narrow) fit = Math.max(fit, 130 / aspect);
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
    layoutRotation();
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
      else if (kind === 'environment')
        on =
          on &&
          activeView === 'district' &&
          layers.environment !== false &&
          environmentalState.some((s) => s.state === 'ready');
      else if (kind === 'river') on = on && layers.river !== false;
      else if (kind === 'contour')
        on = on && activeView === 'site' && currentlyCropped && sound.visible && lastWidth > 490;
      else if (kind === 'note') on = on && layers.notes !== false;
      else if (kind === 'street') on = on && lastWidth > 450 && (currentlyCropped || activeView === 'district');
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
        item.tag.offsetWidth ||
        (item.kind === 'facility'
          ? Math.min(250, item.tag.textContent.length * 6.4 + 21)
          : Math.min(260, item.tag.textContent.length * 6.4 + 22));
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
    const angle = liveAngle ?? state.angle ?? 0;
    context.update(state.layers, activeView === 'district');
    const result = impact.update(
      { point, angle, cooling: state.cooling, integration: state.integration },
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
    facilityTag.tag.dataset.status = result.status;
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
    facilityAnchor.rotation.y = -THREE.MathUtils.degToRad(angle);
    facilityAnchor.visible = within(pos, BOARD);
    facilityTag.where.copy(pos);
    facilityTag.where.y = 22.5;
    const calculation = analyzePlacement(
      {
        point,
        angle,
        integration: state.integration,
        cooling: state.cooling,
        energy: state.energy,
        benefits: state.benefits
      },
      { receptorId: state.receptorId }
    );
    const source = calculation.sourcePoint;
    sound.position.copy(pos);
    sound.rotation.y = -THREE.MathUtils.degToRad(angle);
    const contourOffset = sound.userData.labelLocal.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), sound.rotation.y);
    contour.where.copy(pos).add(contourOffset);
    sound.visible =
      activeView !== 'building' && facilityAnchor.visible && state.layers?.sound !== false && state.layers?.noise !== false;
    const receiver = places.find((p) => p.id === state.receptorId) || places[0];
    const end = toLocal([receiver.lat, receiver.lng], 0.88);
    const start = toLocal(source, 0.88);
    const positions = listeningTrace.geometry.attributes.position,
      distances = listeningTrace.geometry.attributes.lineDistance;
    positions.setXYZ(0, start.x, 0.88, start.z);
    positions.setXYZ(1, end.x, 0.88, end.z);
    positions.needsUpdate = true;
    distances.setX(1, Math.hypot(end.x - start.x, end.z - start.z));
    distances.needsUpdate = true;
    listeningTrace.geometry.computeBoundingSphere();
    receptorRing.position.copy(end);
    const receiverOnTable = within(end, cropBox);
    listeningTrace.visible = sound.visible && receiverOnTable;
    receptorRing.visible = sound.visible && receiverOnTable;
    for (const place of places) {
      const selected = place.id === receiver.id && sound.visible;
      const tag = anchors.get(place.id).tag;
      tag.classList.toggle('ds-listening', selected);
      const label = selected
        ? place.name +
          ' · ' +
          calculation.soundDbA.toFixed(1) +
          ' dBA' +
          (calculation.soundShieldingDb >= 0.8 ? ' (screened)' : '')
        : place.name;
      if (tag.textContent !== label) tag.textContent = label;
    }
    labelsDirty = true;
  }

  function render(next) {
    state = next;
    const nextCooling = resolveCoolingId(next.cooling ?? next.design ?? activeCooling);
    const nextIntegration = resolveIntegrationId(next.integration ?? activeIntegration);
    const nextEnergy = resolveEnergyId(next.energy ?? activeEnergy);
    if (nextCooling !== activeCooling || nextIntegration !== activeIntegration || nextEnergy !== activeEnergy) {
      const soundChanged = nextCooling !== activeCooling || nextIntegration !== activeIntegration;
      facilityAnchor.remove(asset);
      disposeTree(asset);
      activeCooling = nextCooling;
      activeIntegration = nextIntegration;
      activeEnergy = nextEnergy;
      asset = createFacility(activeCooling, { integration: activeIntegration, energy: activeEnergy });
      facilityAnchor.add(asset);
      if (soundChanged) {
        scene.remove(sound);
        disposeTree(sound);
        sound = makeSoundField(activeCooling, activeIntegration, cropPlanes);
        scene.add(sound);
      }
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
    const target = name === 'district' ? new THREE.Vector3(20, 0, -20) : point.clone();
    if (name === 'site') {
      target.x -= 24;
      target.z += 4;
      target.y = 2;
    }
    if (name === 'building') {
      target.y = 5;
      target.z -= 4;
    }
    const { direction, span: nextSpan } = framing[name];
    const distance = name === 'district' ? 3500 : 1950;
    const cropped = name === 'site' || name === 'building';
    setCrop(cropped, target);
    const depth = name === 'district' ? 2000 : name === 'plan' ? 900 : 760;
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

  const UP_AXIS = new THREE.Vector3(0, 1, 0);
  const orbitOffset = new THREE.Vector3();
  const demoIdleParam = Number(new URLSearchParams(location.search).get('demoIdleMs'));
  const IDLE_MS = Number.isFinite(demoIdleParam) && demoIdleParam >= 500 ? Math.min(120000, demoIdleParam) : 20000;
  const DEMO_SPEED = 0.115; // gentle architectural rotation (~55 s per full revolution)
  let lastActivity = performance.now(),
    demoVel = 0,
    demoMode = null,
    reportedDemo = false,
    wasHidden = element.hidden || document.hidden,
    lastFrameTime = 0;

  function notifyDemo() {
    const active = demoMode !== null;
    canvas.dataset.demoMode = demoMode || '';
    if (active !== reportedDemo) {
      reportedDemo = active;
      onDemoChange?.(active, demoMode);
    }
  }

  function resetIdle() {
    lastActivity = performance.now();
  }

  function setDemo(on, { source = 'manual' } = {}) {
    if (on) {
      if (disposed || element.hidden) return false;
      demoMode = source;
      if (source === 'manual') {
        lastActivity = performance.now();
        orbitOffset.copy(camera.position).sub(controls.target);
        if (Math.hypot(orbitOffset.x, orbitOffset.z) < 20) view(activeView);
      }
      notifyDemo();
      schedule();
      return true;
    }
    const hadDemo = demoMode !== null;
    demoMode = null;
    lastActivity = performance.now();
    if (hadDemo) notifyDemo();
    schedule();
    return false;
  }

  function markActivity(e) {
    lastActivity = performance.now();
    if (!demoMode) return;
    if (e?.type !== 'pointermove' && e?.target?.closest?.('#demo, #full')) return;
    if (demoMode === 'idle') {
      demoMode = null;
      notifyDemo();
      schedule();
      return;
    }
    if (e?.type === 'pointermove') return;
    if (e?.type === 'keydown' && e.key === 'Escape') {
      demoMode = null;
      notifyDemo();
      schedule();
    }
  }
  const activityEvents = ['pointermove', 'pointerdown', 'wheel', 'keydown', 'touchstart'];
  for (const ev of activityEvents) window.addEventListener(ev, markActivity, { passive: true });
  const idleCheckTimer = window.setInterval(() => {
    const hiddenNow = disposed || element.hidden || document.hidden;
    if (hiddenNow) {
      wasHidden = true;
      return;
    }
    if (wasHidden) {
      wasHidden = false;
      if (!demoMode) lastActivity = performance.now();
    }
    if (demoMode || reducedMotion() || document.querySelector('dialog[open]')) return;
    if (performance.now() - lastActivity >= IDLE_MS) {
      demoMode = 'idle';
      notifyDemo();
      schedule();
    }
  }, 500);

  function draw(t = performance.now()) {
    frame = 0;
    if (disposed) return;
    const now = typeof t === 'number' && Number.isFinite(t) ? t : performance.now();
    const dt = lastFrameTime ? Math.min(0.05, Math.max(0.001, (now - lastFrameTime) / 1000)) : 0.016;
    lastFrameTime = now;
    const isVisible = !element.hidden && !document.hidden;
    const reduce = reducedMotion();

    if (!isVisible) {
      wasHidden = true;
      demoVel = 0;
    } else if (wasHidden) {
      wasHidden = false;
      if (!demoMode) lastActivity = now;
    }

    if (anim) {
      const v = THREE.MathUtils.clamp((now - anim.time) / 430, 0, 1),
        s = v * v * (3 - 2 * v);
      camera.position.lerpVectors(anim.from, anim.to, s);
      controls.target.lerpVectors(anim.fromTarget, anim.target, s);
      span = THREE.MathUtils.lerp(anim.fromSpan, anim.toSpan, s);
      projectionDirty = true;
      if (v === 1) anim = null;
    }

    // Demo mode: slow continuous orbit around center (manual Play button or after 20s idle)
    const modalOpen = Boolean(document.querySelector('dialog[open]'));
    if (
      !demoMode &&
      isVisible &&
      !reduce &&
      !anim &&
      !moving &&
      !turning &&
      !press &&
      !modalOpen &&
      now - lastActivity >= IDLE_MS
    ) {
      demoMode = 'idle';
      notifyDemo();
    }
    const canOrbit =
      isVisible &&
      demoMode !== null &&
      (demoMode === 'manual' || !reduce) &&
      !anim &&
      !moving &&
      !turning &&
      !press &&
      !modalOpen;
    if (canOrbit) {
      demoVel += (DEMO_SPEED - demoVel) * (1 - Math.exp(-dt * 1.8));
    } else if (demoVel > 0.0004) {
      demoVel *= Math.exp(-dt * 9.5);
      if (demoVel <= 0.0004) demoVel = 0;
    } else {
      demoVel = 0;
    }
    const orbiting = demoVel > 0.0004;
    if (orbiting) {
      orbitOffset.copy(camera.position).sub(controls.target);
      orbitOffset.applyAxisAngle(UP_AXIS, demoVel * dt);
      camera.position.copy(controls.target).add(orbitOffset);
      camera.lookAt(controls.target);
      labelsDirty = true;
    }
    canvas.dataset.demoOrbit = orbiting ? 'active' : 'idle';
    canvas.dataset.demoMode = demoMode || '';

    // Animate slow, diffused acoustic emission halos dissolving softly outward
    const waves = sound.userData.waves || [];
    const animateWaves = isVisible && sound.visible && !reduce && waves.length > 0;
    if (animateWaves) {
      for (const wave of waves) {
        const phase = (now * 0.000116 + wave.offset) % 1; // ~8.6s calm cycle
        const u = Math.pow(phase, 0.92);
        const s = 0.16 + u * 0.84;
        const fadeIn = Math.min(1, phase / 0.22);
        const fadeOut = Math.pow(Math.max(0, 1 - phase), 1.45);
        wave.group.scale.set(s, 1, s);
        wave.bandMat.opacity = fadeIn * fadeOut * 0.72;
      }
    } else if (waves.length) {
      for (const wave of waves) wave.bandMat.opacity = 0;
    }

    if (projectionDirty) updateProjection();
    const changed = controls.update();
    if (changed || anim || orbiting || labelsDirty) {
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
    if (anim || changed || orbiting || canOrbit || animateWaves) schedule();
    if (!initialized) {
      initialized = true;
      canvas.dataset.ready = 'true';
      onReady?.();
    }
  }
  controls.addEventListener('start', () => {
    anim = null;
    lastActivity = performance.now();
    if (demoMode) {
      demoMode = null;
      notifyDemo();
    }
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
  function startRotation(e) {
    const hit = groundPoint(e);
    if (!hit || !state.point) return false;
    const center = toLocal(state.point);
    turning = {
      id: e.pointerId,
      capture: e.currentTarget,
      initial: state.angle || 0,
      start: [hit.x - center.x, hit.z - center.z],
      center
    };
    liveAngle = state.angle || 0;
    anim = null;
    if (demoMode) {
      demoMode = null;
      notifyDemo();
    }
    controls.enabled = false;
    press = null;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopImmediatePropagation();
    e.preventDefault();
    rotationGrip.focus({ preventScroll: true });
    element.classList.add('ds-turning');
    schedule();
    return true;
  }
  let dragRaf = 0,
    pendingDragPoint = null,
    pendingDragAngle = null;
  function flushDrag() {
    dragRaf = 0;
    if (pendingDragAngle !== null && turning) {
      liveAngle = pendingDragAngle;
      pendingDragAngle = null;
      setFacility(state.point);
      onRotatePreview?.(liveAngle);
      schedule();
    }
    if (pendingDragPoint && moving) {
      livePoint = pendingDragPoint;
      pendingDragPoint = null;
      setFacility(livePoint);
      onPreview?.(livePoint);
      element.classList.add('ds-dragging');
      schedule();
    }
  }
  function scheduleDragFlush() {
    if (!dragRaf) dragRaf = requestAnimationFrame(flushDrag);
  }
  function cancelPendingDrag() {
    if (dragRaf) {
      cancelAnimationFrame(dragRaf);
      dragRaf = 0;
    }
    pendingDragPoint = null;
    pendingDragAngle = null;
  }

  function finishRotation(e, cancelled) {
    if (!turning || (e.pointerId !== undefined && e.pointerId !== turning.id)) return;
    if (pendingDragAngle !== null) liveAngle = pendingDragAngle;
    cancelPendingDrag();
    const { capture, id, initial } = turning,
      angle = liveAngle;
    turning = null;
    liveAngle = null;
    controls.enabled = true;
    element.classList.remove('ds-turning');
    if (capture.hasPointerCapture(id)) capture.releasePointerCapture(id);
    if (!cancelled && angle !== initial) onRotate?.(angle);
    else {
      setFacility(state.point);
      onRotatePreview?.(state.angle || 0);
    }
    labelsDirty = true;
    schedule();
  }
  function finishDrag(e, cancelled) {
    if (!moving || e.pointerId !== moving.id) return;
    if (pendingDragPoint) livePoint = pendingDragPoint;
    cancelPendingDrag();
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
    if (e.button !== 0 || !e.isPrimary || moving || turning) return;
    if (state.mode !== 'note' && state.point && e.currentTarget === rotationGrip) {
      startRotation(e);
      return;
    }
    anim = null;
    press = { id: e.pointerId, x: e.clientX, y: e.clientY };
    if (state.mode === 'note') return;
    if (!hitsFacility(e)) {
      if (rotationDisc.group.visible && ray.intersectObject(rotationDisc.target).length) startRotation(e);
      return;
    }
    const start = groundPoint(e);
    if (!start || !state.point) return;
    moving = { id: e.pointerId, start, original: toLocal(state.point), dragged: false };
    if (demoMode) {
      demoMode = null;
      notifyDemo();
    }
    controls.enabled = false;
    canvas.setPointerCapture(e.pointerId);
    e.stopImmediatePropagation();
    e.preventDefault();
    canvas.focus({ preventScroll: true });
  }
  function move(e) {
    if (turning) {
      if (e.pointerId !== turning.id) return;
      const hit = groundPoint(e);
      if (!hit) return;
      const next = dragBearing(
        turning.initial,
        turning.start,
        [hit.x - turning.center.x, hit.z - turning.center.z],
        e.shiftKey ? 15 : 1
      );
      if (next !== (pendingDragAngle ?? liveAngle)) {
        pendingDragAngle = next;
        scheduleDragFlush();
      }
      e.stopImmediatePropagation();
      return;
    }
    if (!moving) return;
    if (e.pointerId !== moving.id) return;
    if (!moving.dragged && Math.hypot(e.clientX - press.x, e.clientY - press.y) < 2) return;
    const hit = groundPoint(e);
    if (!hit) return;
    const next = hit.sub(moving.start).add(moving.original);
    next.x = THREE.MathUtils.clamp(next.x, BOARD.minX + EPS, BOARD.maxX - EPS);
    next.z = THREE.MathUtils.clamp(next.z, BOARD.minZ + EPS, BOARD.maxZ - EPS);
    moving.dragged = true;
    pendingDragPoint = toCoords(next);
    scheduleDragFlush();
  }
  function up(e) {
    if (turning) {
      e.stopImmediatePropagation();
      finishRotation(e, false);
      return;
    }
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
    finishRotation(e, true);
    finishDrag(e, true);
    press = null;
  }
  function keys(e) {
    if (e.key === 'Escape' && turning) {
      finishRotation(e, true);
      e.preventDefault();
      return;
    }
    if (e.currentTarget === rotationGrip) {
      if (!state.point || e.altKey || e.ctrlKey || e.metaKey) return;
      const direction = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[e.key];
      if (direction) {
        e.preventDefault();
        onRotate?.(normalizeBearing((state.angle || 0) + direction * (e.shiftKey ? 15 : 5)));
      }
      return;
    }
    if (!state.point || e.altKey || e.ctrlKey || e.metaKey) return;
    const offset = { ArrowUp: [0, -1], ArrowRight: [1, 0], ArrowDown: [0, 1], ArrowLeft: [-1, 0] }[e.key];
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
  canvas.addEventListener('lostpointercapture', cancel);
  for (const [name, handler] of [
    ['pointerdown', down],
    ['pointermove', move],
    ['pointerup', up],
    ['pointercancel', cancel],
    ['lostpointercapture', cancel],
    ['keydown', keys]
  ])
    rotationGrip.addEventListener(name, handler);
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
    setDemo,
    isDemo: () => demoMode !== null,
    resetIdle,
    destroy() {
      disposed = true;
      cancelAnimationFrame(frame);
      clearInterval(idleCheckTimer);
      for (const ev of activityEvents) window.removeEventListener(ev, markActivity);
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

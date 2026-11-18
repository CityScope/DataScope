// Highlights are placed in the same local east/south meter frame as the model.
import * as THREE from 'three';
import { evaluateConstraints, clipToPolygon, constraintShapes } from './constraints.js';
import { analyzePlacement } from './analysis.js';

const palette = { conflict: '#d93437', review: '#df8616' };
const fillElevation = 1.85;
const hatchElevation = 2.24;
const outlineElevation = 2.74;

function triangle(vertices, a, b, c, elevation) {
  for (const [x, z] of [a, b, c]) vertices.push(x, elevation, z);
}

function polygon(vertices, ring, elevation) {
  if (ring.length < 3) return;
  const indices = THREE.ShapeUtils.triangulateShape(
    ring.map(([x, z]) => new THREE.Vector2(x, z)),
    []
  );
  for (const [a, b, c] of indices) triangle(vertices, ring[a], ring[b], ring[c], elevation);
}

function band(vertices, inner, outer, elevation) {
  for (let i = 0; i < inner.length; i++) {
    const j = (i + 1) % inner.length;
    triangle(vertices, inner[i], outer[i], outer[j], elevation);
    triangle(vertices, inner[i], outer[j], inner[j], elevation);
  }
}

function growRectangle(ring, amount) {
  return ring.map((point, i) => {
    const prev = ring[(i + 3) % 4],
      next = ring[(i + 1) % 4];
    const u = [point[0] - prev[0], point[1] - prev[1]];
    const v = [point[0] - next[0], point[1] - next[1]];
    const lenU = Math.hypot(...u),
      lenV = Math.hypot(...v);
    return [point[0] + amount * (u[0] / lenU + v[0] / lenV), point[1] + amount * (u[1] / lenU + v[1] / lenV)];
  });
}

// Diagonal stripes stay aligned across adjacent pieces and show the precise
// intersecting area. A darker corridor extends a short distance beyond it.
function hatch(vertices, ring, elevation = hatchElevation) {
  const zs = ring.map((p) => p[1]);
  const intercept = ring.map(([x, z]) => x - z);
  const a = Math.min(...zs) - 1,
    b = Math.max(...zs) + 1;
  const last = Math.max(...intercept);
  for (let k = Math.floor(Math.min(...intercept) / 6) * 6; k < last; k += 6) {
    const stripe = [
      [a + k, a],
      [a + k + 2.1, a],
      [b + k + 2.1, b],
      [b + k, b]
    ];
    polygon(vertices, clipToPolygon(ring, stripe), elevation);
  }
}

function paintLayer(group, planes, name, order, opacity, color) {
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    side: THREE.DoubleSide,
    toneMapped: false,
    clippingPlanes: planes
  });
  material.forceSinglePass = true;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.renderOrder = order;
  mesh.frustumCulled = false;
  group.add(mesh);
  return {
    material,
    set(vertices) {
      let attr = geometry.getAttribute('position');
      if (!attr || attr.array.length < vertices.length) {
        const count = Math.max(192, 2 ** Math.ceil(Math.log2(Math.max(1, vertices.length))));
        attr = new THREE.BufferAttribute(new Float32Array(count + ((3 - (count % 3)) % 3)), 3).setUsage(
          THREE.DynamicDrawUsage
        );
        geometry.setAttribute('position', attr);
      }
      attr.array.set(vertices);
      attr.clearUpdateRanges();
      if (vertices.length) attr.addUpdateRange(0, vertices.length);
      attr.needsUpdate = true;
      geometry.setDrawRange(0, vertices.length / 3);
      mesh.visible = vertices.length > 0;
    }
  };
}

// The outer ring spans the district. Triangulating its parcel-shaped hole once
// lets us clip the outside region exactly, including the parcel's concave notch.
const surround = [
  [-2100, -2100],
  [2100, -2100],
  [2100, 2100],
  [-2100, 2100]
];
const parcel = constraintShapes.parcel;
const points = [...surround, ...parcel];
const vecs = (list) => list.map(([x, z]) => new THREE.Vector2(x, z));
const outsideTriangles = THREE.ShapeUtils.triangulateShape(vecs(surround), [vecs(parcel)]).map((indices) =>
  indices.map((i) => points[i])
);

function paintOutside(footprint, shade, pattern, edge) {
  const outer = growRectangle(footprint, 2.55);
  for (const tri of outsideTriangles) {
    const outside = clipToPolygon(tri, footprint);
    polygon(shade, outside, 1.56);
    if (outside.length >= 3) hatch(pattern, outside, 1.72);
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      polygon(edge, clipToPolygon(tri, [footprint[i], footprint[j], outer[j], outer[i]]), 3.1);
    }
  }
}

function stroke(vertices, a, b, width, elevation) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    length = Math.hypot(dx, dz);
  if (length < 0.001) return;
  const x = (-dz * width) / (2 * length),
    z = (dx * width) / (2 * length);
  const ring = [
    [a[0] - x, a[1] - z],
    [b[0] - x, b[1] - z],
    [b[0] + x, b[1] + z],
    [a[0] + x, a[1] + z]
  ];
  triangle(vertices, ring[0], ring[1], ring[2], elevation);
  triangle(vertices, ring[0], ring[2], ring[3], elevation);
}

function paintMeasure({ footprint: a, river: b }, vertices, width, elevation) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    length = Math.hypot(dx, dz);
  if (length < 0.001) {
    // At a crossing both nearest points coincide. Draw a single target.
    const ring = Array.from({ length: 24 }, (_, i) => {
      const t = (i * Math.PI) / 12;
      return [Math.cos(t), Math.sin(t)];
    });
    const radius = 4.4;
    const atRadius = (r) => ring.map(([x, z]) => [a[0] + x * r, a[1] + z * r]);
    band(vertices, atRadius(radius - width / 2), atRadius(radius + width / 2), elevation);
    return;
  }
  stroke(vertices, a, b, width, elevation);
  const x = (-dz / length) * 5.6,
    z = (dx / length) * 5.6;
  for (const p of [a, b]) stroke(vertices, [p[0] - x, p[1] - z], [p[0] + x, p[1] + z], width, elevation);
}

export function createImpactOverlay(cropPlanes) {
  const group = new THREE.Group();
  group.name = 'Footprint intersection screening';
  const collisions = new THREE.Group(),
    water = new THREE.Group(),
    lot = new THREE.Group();
  group.add(collisions, water, lot);
  const witnessHalo = paintLayer(water, cropPlanes, 'Measurement line halo', 30, 0.96, '#f2f6db');
  const witnessInk = paintLayer(water, cropPlanes, 'River clearance and endpoints', 31, 1, '#146c75');
  const outerShade = paintLayer(lot, cropPlanes, 'Footprint outside parcel', 17, 0.42, '#ca812e');
  const outerHatch = paintLayer(lot, cropPlanes, 'Outside-parcel hatching', 18, 0.92, '#ffd381');
  const outerEdge = paintLayer(lot, cropPlanes, 'Outside-parcel edge', 26, 0.97, '#d48111');
  const corridor = paintLayer(
    collisions,
    cropPlanes,
    'Affected physical features',
    21,
    0.46,
    palette.conflict
  );
  const fill = paintLayer(collisions, cropPlanes, 'Overlapping ground', 22, 0.79, palette.conflict);
  const stripes = paintLayer(collisions, cropPlanes, 'Intersection hatching', 23, 0.94, '#fff0ce');
  const perimeter = paintLayer(collisions, cropPlanes, 'Footprint perimeter', 24, 0.98, palette.conflict);
  const trim = paintLayer(collisions, cropPlanes, 'Footprint highlight edge', 25, 0.91, '#fff4e3');
  let key, lensKey, result;

  function update(
    { point, angle = 0 },
    { enabled = true, lens, showRiver = true, showParcel = true, analysis } = {}
  ) {
    const next = point ? [point[0], point[1], angle].join('|') : 'no-build';
    if (next !== key) {
      key = next;
      result = evaluateConstraints({ point, angle });
      group.userData.status = result.status;
      group.userData.features = result.items.map((item) => item.id);
      if (result.items.length > 0) {
        const footprint = result.footprint;
        const x = (footprint[0][0] + footprint[2][0]) / 2,
          z = (footprint[0][1] + footprint[2][1]) / 2;
        const nearFootprint = [
          [x - 104, z - 104],
          [x + 104, z - 104],
          [x + 104, z + 104],
          [x - 104, z + 104]
        ];
        const context = [],
          intersect = [],
          pattern = [],
          edge = [],
          border = [];
        for (const { feature, clipped } of result.overlaps) {
          polygon(context, clipToPolygon(feature, nearFootprint), 1.34);
          polygon(intersect, clipped, fillElevation);
          hatch(pattern, clipped);
        }
        const rim = growRectangle(footprint, 3.0);
        band(edge, growRectangle(footprint, 0.8), rim, outlineElevation);
        band(border, rim, growRectangle(footprint, 3.75), outlineElevation + 0.16);
        for (const layer of [corridor, fill, perimeter]) layer.material.color.set(palette[result.status]);
        corridor.set(context);
        fill.set(intersect);
        stripes.set(pattern);
        perimeter.set(edge);
        trim.set(border);
      }
    }
    collisions.visible = enabled && result.items.length > 0;
    water.visible = Boolean(point) && lens === 'water' && showRiver;
    lot.visible = Boolean(point) && lens === 'parcel' && showParcel;
    const nextLens = next + '|' + (water.visible ? 'water' : lot.visible ? 'parcel' : '');
    if (nextLens !== lensKey) {
      lensKey = nextLens;
      if (water.visible) {
        const witness = (analysis || analyzePlacement({ point, angle })).riverWitness;
        group.userData.riverWitness = witness;
        const halo = [],
          ink = [];
        if (witness) {
          paintMeasure(witness, halo, 3.2, 3.42);
          paintMeasure(witness, ink, 1.55, 3.58);
        }
        witnessHalo.set(halo);
        witnessInk.set(ink);
      } else group.userData.riverWitness = null;
      if (lot.visible) {
        const shade = [],
          pattern = [],
          edge = [];
        paintOutside(result.footprint, shade, pattern, edge);
        outerShade.set(shade);
        outerHatch.set(pattern);
        outerEdge.set(edge);
      }
    }
    group.visible = collisions.visible || water.visible || lot.visible;
    return result;
  }
  return { group, update };
}

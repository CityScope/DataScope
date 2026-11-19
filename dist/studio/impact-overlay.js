// Highlights are placed in the same local east/south meter frame as the model.
import { environmentalVersion } from '../environment.js';
import * as THREE from 'three';
import { evaluateConstraints, clipToPolygon, constraintShapes } from './constraints.js';
import { analyzePlacement } from './analysis.js';

const palette = { conflict: '#eb665b', review: '#efb04c' };
// All map ink has the same ground registration. Transparent meshes read the
// solid scene depth and never write it. Their explicit paint order composites
// the independent analyses. One small clearance clears the raised rail heads.
const inkHeight = 1.05;
const cross = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);

function triangle(vertices, a, b, c) {
  const winding = cross(a, b, c);
  if (Math.abs(winding) < 1e-9) return;
  // Front faces point up, even when two clipping operations have opposite winding.
  for (const [x, z] of winding < 0 ? [a, b, c] : [a, c, b]) vertices.push(x, inkHeight, z);
}

function faces(ring) {
  if (ring.length < 3) return [];
  return THREE.ShapeUtils.triangulateShape(
    ring.map(([x, z]) => new THREE.Vector2(x, z)),
    []
  ).map((indices) => indices.map((i) => ring[i]));
}

function polygon(vertices, ring) {
  for (const [a, b, c] of faces(ring)) triangle(vertices, a, b, c);
}
function band(vertices, inner, outer) {
  for (let i = 0; i < inner.length; i++) {
    const j = (i + 1) % inner.length;
    triangle(vertices, inner[i], outer[i], outer[j]);
    triangle(vertices, inner[i], outer[j], inner[j]);
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

// Subtract one convex ring from another. Each retained piece is bounded by
// a different separating edge, so the results cover the difference exactly
// once. This also deduplicates a complete and a partial feature intersection.
function subtract(subject, cutter) {
  const signed = cutter.reduce((sum, a, i) => {
    const b = cutter[(i + 1) % cutter.length];
    return sum + a[0] * b[1] - a[1] * b[0];
  }, 0);
  const side = signed >= 0 ? 1 : -1;
  // A separating cutter edge includes the common case of neighboring strips
  // sharing a boundary. Leave their geometry intact.
  for (let i = 0; i < cutter.length; i++) {
    const a = cutter[i],
      b = cutter[(i + 1) % cutter.length];
    if (subject.every((p) => cross(a, b, p) * side <= 1e-9)) return [subject];
  }
  let remaining = subject;
  const parts = [];
  for (let i = 0; i < cutter.length && remaining.length >= 3; i++) {
    const a = cutter[i],
      b = cutter[(i + 1) % cutter.length],
      positive = [],
      negative = [];
    let start = remaining.at(-1),
      d0 = cross(a, b, start) * side;
    for (const end of remaining) {
      const d1 = cross(a, b, end) * side;
      if ((d0 > 0 && d1 < 0) || (d0 < 0 && d1 > 0)) {
        const t = d0 / (d0 - d1),
          p = [start[0] + t * (end[0] - start[0]), start[1] + t * (end[1] - start[1])];
        positive.push(p);
        negative.push(p);
      }
      if (d1 >= 0) positive.push(end);
      if (d1 <= 0) negative.push(end);
      start = end;
      d0 = d1;
    }
    if (negative.length >= 3) parts.push(negative);
    remaining = positive;
  }
  return parts;
}

// Triangulating the input handles concave park boundaries. The subtraction
// matters at crossing rail branches, road junctions and river/freeway overlap.
function disjointRegions(rings) {
  const prior = [];
  const union = [];
  for (const ring of rings) {
    const triangles = faces(ring);
    for (const tri of triangles) {
      let pieces = [tri];
      for (const cutter of prior) {
        pieces = pieces.flatMap((piece) => subtract(piece, cutter));
        if (!pieces.length) break;
      }
      union.push(...pieces);
    }
    prior.push(...triangles);
  }
  return union;
}

function paintLayer(group, planes, name, order, opacity, color) {
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthTest: true,
    depthWrite: false,
    side: THREE.FrontSide,
    toneMapped: false,
    clippingPlanes: planes
  });
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
  mesh.visible = false;
  mesh.name = name;
  mesh.renderOrder = order;
  mesh.frustumCulled = false;
  group.add(mesh);
  return {
    material,
    mesh,
    set(vertices) {
      if (!vertices.length) {
        mesh.geometry.setDrawRange(0, 0);
        mesh.visible = false;
        return;
      }
      let attr = mesh.geometry.getAttribute('position');
      if (!attr || attr.array.length < vertices.length) {
        // Disposing before swapping prevents stale GPU buffers on growing drags.
        mesh.geometry.dispose();
        mesh.geometry = new THREE.BufferGeometry();
        const size = Math.max(64, 2 ** Math.ceil(Math.log2(vertices.length / 3)));
        attr = new THREE.BufferAttribute(new Float32Array(size * 3), 3).setUsage(THREE.DynamicDrawUsage);
        mesh.geometry.setAttribute('position', attr);
      }
      attr.array.set(vertices);
      attr.clearUpdateRanges();
      attr.addUpdateRange(0, vertices.length);
      attr.needsUpdate = true;
      mesh.geometry.setDrawRange(0, vertices.length / 3);
      mesh.visible = true;
    }
  };
}

// Preserve Three's local clipping, color management, and alpha composition.
// Only the map symbol and its pixel coverage are supplied by these shaders.
function installInk(material, name, declarations, colorFragment, uniforms = {}) {
  material.customProgramCacheKey = () => name;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 inkXZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ninkXZ=position.xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 inkXZ;\n' + declarations)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + colorFragment);
  };
}

function hatchInk(material, accent) {
  installInk(
    material,
    'datascope-hatching',
    `
    uniform vec3 inkAccent;
    float integratedStripe(float phase) { return floor(phase)*0.31+min(fract(phase),0.31); }
  `,
    `
    float phase = (inkXZ.x-inkXZ.y)/6.0;
    float span = max(0.0001,fwidth(phase));
    float coverage = clamp((integratedStripe(phase+span*.5)-integratedStripe(phase-span*.5))/span,0.,1.);
    diffuseColor.rgb = mix(diffuseColor.rgb,inkAccent,coverage);
    diffuseColor.a = mix(diffuseColor.a,.94,coverage);
  `,
    { inkAccent: { value: new THREE.Color(accent) } }
  );
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

function paintOutside(footprint, shade, edge) {
  const outer = growRectangle(footprint, 2.55);
  for (const tri of outsideTriangles) {
    polygon(shade, clipToPolygon(tri, footprint));
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      polygon(edge, clipToPolygon(tri, [footprint[i], footprint[j], outer[j], outer[i]]));
    }
  }
}

function dimensionInk(layer) {
  const uniforms = {
    inkStart: { value: new THREE.Vector2() },
    inkAxis: { value: new THREE.Vector2() },
    inkLength: { value: 0 },
    inkOutline: { value: new THREE.Color('#12434d') }
  };
  installInk(
    layer.material,
    'datascope-river-ruler',
    `
    uniform vec2 inkStart, inkAxis;
    uniform float inkLength;
    uniform vec3 inkOutline;
    float boxDistance(vec2 point,vec2 halfSize) {
      vec2 d=abs(point)-halfSize;
      return length(max(d,0.0))+min(max(d.x,d.y),0.);
    }
  `,
    `
    vec2 delta=inkXZ-inkStart;
    vec2 rel=vec2(dot(delta,inkAxis),dot(delta,vec2(-inkAxis.y,inkAxis.x)));
    float dist;
    if (inkLength<.001) {
      dist = abs(length(delta)-4.4)-.8;
    } else {
      float center=boxDistance(rel-vec2(inkLength*.5,0.),vec2(inkLength*.5,.8));
      float ticks=boxDistance(vec2(min(abs(rel.x),abs(rel.x-inkLength)),rel.y),vec2(.8,5.6));
      dist=min(center,ticks);
    }
    float aa=max(.015,fwidth(dist));
    float outline=1.-smoothstep(.8-aa*.5,.8+aa*.5,dist);
    float core=1.-smoothstep(-aa*.5,aa*.5,dist);
    if (outline<.001) discard;
    diffuseColor.rgb=mix(inkOutline,diffuseColor.rgb,core);
    diffuseColor.a*=outline;
  `,
    uniforms
  );
  return (witness) => {
    const vertices = [];
    if (witness) {
      const { footprint: a, river: b } = witness;
      const dx = b[0] - a[0],
        dz = b[1] - a[1],
        length = Math.hypot(dx, dz);
      const x = length ? dx / length : 1,
        z = length ? dz / length : 0;
      uniforms.inkStart.value.set(...a);
      uniforms.inkAxis.value.set(x, z);
      uniforms.inkLength.value = length;
      const at = (u, v) => [a[0] + u * x - v * z, a[1] + u * z + v * x];
      polygon(vertices, [at(-10, -10), at(length + 10, -10), at(length + 10, 10), at(-10, 10)]);
    }
    layer.set(vertices);
  };
}

export function createImpactOverlay(cropPlanes) {
  const group = new THREE.Group();
  group.name = 'Footprint intersection screening';
  const collisions = new THREE.Group(),
    water = new THREE.Group(),
    lot = new THREE.Group();
  group.add(collisions, water, lot);
  group.visible = false;
  const ruler = paintLayer(water, cropPlanes, 'River clearance and endpoints', 30, 1, '#99f4ed');
  const paintMeasure = dimensionInk(ruler);
  const outerShade = paintLayer(lot, cropPlanes, 'Footprint outside parcel', 17, 0.51, '#a76a24');
  hatchInk(outerShade.material, '#ffd485');
  const outerEdge = paintLayer(lot, cropPlanes, 'Outside-parcel edge', 26, 0.97, '#f5b758');
  const corridor = paintLayer(
    collisions,
    cropPlanes,
    'Affected physical features',
    21,
    0.54,
    palette.conflict
  );
  const fill = paintLayer(collisions, cropPlanes, 'Overlapping ground', 22, 0.83, palette.conflict);
  hatchInk(fill.material, '#ffe6b3');
  const perimeter = paintLayer(collisions, cropPlanes, 'Footprint perimeter', 24, 0.98, palette.conflict);
  const trim = paintLayer(collisions, cropPlanes, 'Footprint highlight edge', 25, 0.91, '#ffe6cd');
  let disposed = false;
  let key, lensKey, result;

  function update(
    { point, angle = 0 },
    { enabled = true, lens, showRiver = true, showParcel = true, analysis } = {}
  ) {
    if (disposed) return result;
    const next = point ? [point[0], point[1], angle, environmentalVersion()].join('|') : 'no-build';
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
          edge = [],
          border = [];
        const rings = result.overlaps.flatMap(({ feature, holes = [] }) => {
          let pieces = faces(feature).map(tri => clipToPolygon(tri, nearFootprint));
          for(const hole of holes) for(const tri of faces(hole)) pieces = pieces.flatMap(p => subtract(p, tri));
          return pieces;
        });
        for (const region of disjointRegions(rings)) {
          // The corridor tint stops where the stronger footprint fill starts.
          for (const surrounding of subtract(region, footprint)) polygon(context, surrounding);
          polygon(intersect, clipToPolygon(region, footprint));
        }
        const rim = growRectangle(footprint, 3.0);
        band(edge, growRectangle(footprint, 0.8), rim);
        band(border, rim, growRectangle(footprint, 3.75));
        for (const layer of [corridor, fill, perimeter]) layer.material.color.set(palette[result.status]);
        corridor.set(context);
        fill.set(intersect);
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
        paintMeasure(witness);
      } else group.userData.riverWitness = null;
      if (lot.visible) {
        const shade = [],
          edge = [];
        paintOutside(result.footprint, shade, edge);
        outerShade.set(shade);
        outerEdge.set(edge);
      }
    }
    group.visible = collisions.visible || water.visible || lot.visible;
    return result;
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    group.visible = false;
    group.removeFromParent();
    group.traverse((object) => {
      if (object.isMesh) {
        object.geometry.dispose();
        object.material.dispose();
      }
    });
    group.clear();
  }
  return { group, update, dispose };
}

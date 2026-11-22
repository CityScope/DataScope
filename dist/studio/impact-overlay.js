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
  if (!ring || ring.length < 3) return;
  if (ring.length === 3) {
    triangle(vertices, ring[0], ring[1], ring[2]);
    return;
  }
  if (ring.length === 4) {
    triangle(vertices, ring[0], ring[1], ring[2]);
    triangle(vertices, ring[0], ring[2], ring[3]);
    return;
  }
  // Convex fan for clipped convex pieces (clipToPolygon of a triangle against a rectangle is always convex)
  for (let i = 1; i < ring.length - 1; i++) triangle(vertices, ring[0], ring[i], ring[i + 1]);
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

function triEnvelope(tri) {
  const [a, b, c] = tri;
  return [
    Math.min(a[0], b[0], c[0]),
    Math.min(a[1], b[1], c[1]),
    Math.max(a[0], b[0], c[0]),
    Math.max(a[1], b[1], c[1])
  ];
}
function boxesTouch(a, b) {
  return a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
}

// Cache polygon-with-holes triangulation once per static/environmental piece so
// dragging over 1,000+ vertex FEMA floodplains & creeks runs in <0.2ms per frame.
const pieceTriCache = new WeakMap();
function triangulateWithHoles(poly, holes = []) {
  if (!poly || poly.length < 3) return [];
  const validHoles = holes.filter((h) => h && h.length >= 3);
  const allPts = [...poly, ...validHoles.flat()];
  const indices = THREE.ShapeUtils.triangulateShape(
    poly.map(([x, z]) => new THREE.Vector2(x, z)),
    validHoles.map((h) => h.map(([x, z]) => new THREE.Vector2(x, z)))
  );
  const out = [];
  for (const [i0, i1, i2] of indices) {
    const tri = [allPts[i0], allPts[i1], allPts[i2]];
    if (tri[0] && tri[1] && tri[2]) out.push({ tri, bbox: triEnvelope(tri) });
  }
  return out;
}
function cachedPieceTriangles(piece, fallbackPoly, fallbackHoles) {
  if (piece && typeof piece === 'object') {
    let cached = pieceTriCache.get(piece);
    if (!cached) {
      cached = triangulateWithHoles(piece.poly, piece.holes);
      pieceTriCache.set(piece, cached);
    }
    return cached;
  }
  return triangulateWithHoles(fallbackPoly, fallbackHoles);
}

function paintLayer(group, planes, name, order, opacity, color, stencil = false) {
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthTest: true,
    depthWrite: false,
    side: THREE.FrontSide,
    toneMapped: false,
    clippingPlanes: planes,
    ...(stencil
      ? {
          stencilWrite: true,
          stencilRef: 1,
          stencilFunc: THREE.NotEqualStencilFunc,
          stencilZPass: THREE.ReplaceStencilOp,
          stencilFail: THREE.KeepStencilOp,
          stencilZFail: THREE.KeepStencilOp
        }
      : {})
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
  // Hardware stencil deduplication: `fill` renders first inside footprint (marking stencil=1),
  // then `corridor` renders strictly outside `fill` with zero double-blending and zero CPU subtraction.
  const fill = paintLayer(collisions, cropPlanes, 'Overlapping ground', 21, 0.83, palette.conflict, true);
  hatchInk(fill.material, '#ffe6b3');
  const corridor = paintLayer(
    collisions,
    cropPlanes,
    'Affected physical features',
    22,
    0.5,
    palette.conflict,
    true
  );
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
        const nearBox = [x - 104, z - 104, x + 104, z + 104];
        const nearFootprint = [
          [nearBox[0], nearBox[1]],
          [nearBox[2], nearBox[1]],
          [nearBox[2], nearBox[3]],
          [nearBox[0], nearBox[3]]
        ];
        const fxs = footprint.map((p) => p[0]),
          fzs = footprint.map((p) => p[1]);
        const footBox = [Math.min(...fxs), Math.min(...fzs), Math.max(...fxs), Math.max(...fzs)];
        const context = [],
          intersect = [],
          edge = [],
          border = [];
        for (const { piece, feature, clipped, holes = [] } of result.overlaps) {
          const tris = cachedPieceTriangles(piece, feature || clipped, holes);
          for (let i = 0; i < tris.length; i++) {
            const { tri, bbox } = tris[i];
            if (!boxesTouch(bbox, nearBox)) continue;
            const nearClip = clipToPolygon(tri, nearFootprint);
            if (nearClip.length >= 3) polygon(context, nearClip);
            if (boxesTouch(bbox, footBox)) {
              const footClip = clipToPolygon(tri, footprint);
              if (footClip.length >= 3) polygon(intersect, footClip);
            }
          }
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

// Real OpenStreetMap-aligned College Station Midtown screening geometry.
// Axes: east is +x, south is +z (local meters relative to site.center).
import { environmentalFeatures } from '../environment.js';
import { site, river, springCreek } from '../geography.js';
import {
  modelBounds,
  sh6Motorway,
  sh6Frontage,
  fitchRoads,
  lakewayRoads,
  localStreets,
  parkPolygons,
  seniorPolygons,
  buildingPolygons
} from './model-data.js';

const deg = Math.PI / 180;
const my = 111320;
const mx = my * Math.cos(site.center[0] * deg);
const bounds = modelBounds;
const halfWidth = (45000 * 0.09290304) / 90 / 2;
const halfLength = 45;
const geo = ([lat, lng]) => [(lng - site.center[1]) * mx, (site.center[0] - lat) * my];

export const constraintMethod = {
  title: 'CUP placement screening',
  text: 'Screens the rotated footprint against OpenStreetMap-aligned State Highway 6, Lakeway Drive, William D. Fitch Parkway, neighborhood streets, Lick Creek, Spring Creek, parks, The Langford Assisted Living, and existing corridor buildings. Surveyed plats, legal setbacks, and utility easements still require city verification.',
  source: site.source
};

function shifted(points, distance) {
  return points.map(([x, z], i) => {
    const a = points[Math.max(0, i - 1)],
      b = points[Math.min(i + 1, points.length - 1)];
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      len = Math.hypot(dx, dz) || 1;
    return [x - (dz / len) * distance, z + (dx / len) * distance];
  });
}

const riverLocal = river.map(geo);
const springCreekLocal = springCreek.map(geo);

export const constraintShapes = {
  parcel: site.boundary.slice(0, -1).map(geo),
  river: riverLocal,
  springCreek: springCreekLocal,
  freeway: sh6Motorway[0] || [],
  freewayLines: sh6Motorway,
  frontageLines: sh6Frontage,
  fitch: fitchRoads[0] || [],
  fitchLines: fitchRoads,
  enterprise: lakewayRoads[0] || [],
  lakewayLines: lakewayRoads,
  streetLines: localStreets,
  parks: parkPolygons
};

function rectangle([x, z], w, h, angle) {
  const c = Math.cos(angle),
    s = Math.sin(angle);
  return [
    [-w, -h],
    [w, -h],
    [w, h],
    [-w, h]
  ].map(([a, b]) => [x + a * c - b * s, z + a * s + b * c]);
}
function envelope(poly) {
  const xs = poly.map((p) => p[0]),
    zs = poly.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
}
function boundsTouch(a, b) {
  return a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
}
function cross(a, b, p) {
  return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
}
function signedArea(poly) {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i],
      b = poly[(i + 1) % poly.length];
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return sum * 0.5;
}
// Intersect an arbitrary simple polygon with a convex clipping polygon.
export function clipToPolygon(subject, convex) {
  let result = subject;
  const side = signedArea(convex) >= 0 ? 1 : -1;
  for (let i = 0; i < convex.length; i++) {
    if (!result.length) break;
    const c = convex[i],
      d = convex[(i + 1) % convex.length],
      input = result;
    result = [];
    let a = input.at(-1),
      sa = cross(c, d, a) * side;
    for (const b of input) {
      const sb = cross(c, d, b) * side;
      if (sa >= 0 !== sb >= 0) {
        const t = sa / (sa - sb);
        result.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
      if (sb >= 0) result.push(b);
      a = b;
      sa = sb;
    }
  }
  return result;
}

export const constraintFeatures = [];
const catalog = constraintFeatures;
export const constraintCategories = {
  freeway: { label: 'SH 6 / Earl Rudder Fwy', color: '#ae645b', group: 'transport' },
  fitch: { label: 'William D. Fitch Pkwy', color: '#ae645b', group: 'transport' },
  enterprise: { label: 'Lakeway Dr & Midtown access', color: '#ae645b', group: 'transport' },
  river: { label: 'Lick Creek & Spring Creek', color: '#497e94', group: 'water' },
  street: { label: 'Neighborhood streets', color: '#ae645b', group: 'transport' },
  park: { label: 'Public parks', color: '#4d8c70', group: 'community' },
  senior: { label: 'The Langford Assisted Living', color: '#9c813e', group: 'community' },
  structure: { label: 'Existing corridor buildings', color: '#92746a', group: 'buildings' }
};

function feature(id, title, detail, severity, polys) {
  const pieces = polys
    .filter((p) => p.length >= 3 && Math.abs(signedArea(p)) > 0.0001)
    .map((poly) => ({ poly, bbox: envelope(poly) }));
  catalog.push({ id, title, detail, severity, pieces });
}

function strips(line, width) {
  if (!line || line.length < 2) return [];
  const left = shifted(line, -width / 2),
    right = shifted(line, width / 2);
  return line.slice(1).map((_, i) => [left[i], left[i + 1], right[i + 1], right[i]]);
}

feature(
  'freeway',
  'SH 6 roadway crossing',
  'The footprint overlaps the State Highway 6 (Earl Rudder Freeway) or frontage-road right-of-way.',
  'conflict',
  [
    ...sh6Motorway.flatMap((line) => strips(line, 14)),
    ...sh6Frontage.flatMap((line) => strips(line, 9))
  ]
);
feature(
  'fitch',
  'William D. Fitch Pkwy crossing',
  'The footprint intersects the William D. Fitch Parkway (SH 40) arterial corridor.',
  'conflict',
  fitchRoads.flatMap((line) => strips(line, 14))
);
feature(
  'enterprise',
  'Lakeway Drive crossing',
  'The footprint overlaps Lakeway Drive or an existing Midtown Business Park connector road.',
  'conflict',
  lakewayRoads.flatMap((line) => strips(line, 11))
);
feature(
  'river',
  'Lick Creek / Spring Creek overlap',
  'The footprint intersects the Lick Creek or Spring Creek drainage channel (~16 m mapped riparian corridor). Stormwater and floodplain setbacks require city and FEMA verification.',
  'conflict',
  [...strips(riverLocal, 16), ...strips(springCreekLocal, 16)]
);
feature(
  'park',
  'Public park overlap',
  'Part of the footprint overlaps a mapped public park (such as Woodland Hills Park). Public parkland is incompatible with industrial CUP siting.',
  'review',
  parkPolygons.map((p) => p.poly)
);
feature(
  'senior',
  'The Langford senior living overlap',
  'The footprint intersects The Langford Assisted Living campus (1851 Carroll Fancher Way). Verify sensitive-receptor separation under the CUP process.',
  'review',
  seniorPolygons.map((s) => s.poly)
);
feature(
  'structure',
  'Existing corridor building',
  'The footprint overlaps an existing mapped commercial, retail, medical, or residential building along the SH 6 / Lakeway corridor. Confirm property ownership and occupancy.',
  'review',
  buildingPolygons.map((b) => b.poly)
);
feature(
  'street',
  'Neighborhood street crossing',
  'The footprint overlaps an existing mapped local or residential street. Confirm UDO zoning and neighborhood buffer requirements.',
  'conflict',
  localStreets.flatMap((line) => strips(line, 7.5))
);

export function evaluateConstraints({ point, angle = 0 }) {
  if (!point) return { status: 'none', items: [], footprint: [], overlaps: [] };
  const [x, z] = geo(point),
    footprint = rectangle([x, z], halfWidth, halfLength, angle * deg);
  const box = envelope(footprint),
    items = [],
    overlaps = [];
  if (box[0] < bounds.west || box[1] < bounds.north || box[2] > bounds.east || box[3] > bounds.south) {
    items.push({
      id: 'extent',
      title: 'Outside local screening model',
      detail:
        'Only part of this site lies within the modeled Midtown Business Park neighborhood. Verify constraints on surveyed College Station plats and federal maps.',
      severity: 'review',
      area: 0
    });
  }
  const activeFeatures = [...catalog, ...environmentalFeatures];
  for (const item of activeFeatures) {
    let area = 0;
    for (const piece of item.pieces) {
      if (!boundsTouch(box, piece.bbox)) continue;
      const clipped = clipToPolygon(piece.poly, footprint);
      if (clipped.length < 3) continue;
      let pieceArea = Math.abs(signedArea(clipped));
      const clippedHoles = [];
      const holes = piece.holes;
      if (holes?.length) {
        if (!piece.holeBboxes) piece.holeBboxes = holes.map(envelope);
        for (let hi = 0; hi < holes.length; hi++) {
          if (!boundsTouch(box, piece.holeBboxes[hi])) continue;
          const clippedHole = clipToPolygon(holes[hi], footprint);
          if (clippedHole.length < 3) continue;
          const holeArea = Math.abs(signedArea(clippedHole));
          if (holeArea <= 0.1) continue;
          pieceArea = Math.max(0, pieceArea - holeArea);
          clippedHoles.push(clippedHole);
        }
      }
      if (pieceArea > 2) {
        area += pieceArea;
        overlaps.push({
          id: item.id,
          severity: item.severity,
          piece,
          feature: piece.poly,
          holes: holes || [],
          clipped,
          clippedHoles
        });
      }
    }
    if (area > 2) {
      items.push({
        id: item.id,
        title: item.title,
        detail: item.detail,
        severity: item.severity,
        area: Math.round(area)
      });
    }
  }
  items.sort((a, b) => (a.severity === 'conflict' ? -1 : 1) - (b.severity === 'conflict' ? -1 : 1) || b.area - a.area);
  const status = items.some((i) => i.severity === 'conflict')
    ? 'conflict'
    : items.length
      ? 'review'
      : 'clear';
  return { status, items, footprint, overlaps };
}

function pointSegmentDistance(point, a, b) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dz);
}
function pointInPolygon(point, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    if (a[1] > point[1] !== b[1] > point[1] && point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0])
      inside = !inside;
  }
  return inside;
}
function edgeCrosses(a, b, c, d) {
  const s1 = cross(a, b, c),
    s2 = cross(a, b, d),
    s3 = cross(c, d, a),
    s4 = cross(c, d, b);
  return s1 * s2 < 0 && s3 * s4 < 0;
}
function polygonDistance(a, b) {
  if (a.some((p) => pointInPolygon(p, b)) || b.some((p) => pointInPolygon(p, a))) return 0;
  let best = Infinity;
  for (let i = 0; i < a.length; i++) {
    const a1 = a[i],
      a2 = a[(i + 1) % a.length];
    for (let j = 0; j < b.length; j++) {
      const b1 = b[j],
        b2 = b[(j + 1) % b.length];
      if (edgeCrosses(a1, a2, b1, b2)) return 0;
      best = Math.min(
        best,
        pointSegmentDistance(a1, b1, b2),
        pointSegmentDistance(b1, a1, a2)
      );
    }
  }
  return best;
}
function pieceDistance(footprint, piece) {
  const boundary = polygonDistance(footprint, piece.poly);
  if (boundary > 0) return boundary;
  for (const hole of piece.holes || []) {
    if (footprint.every((p) => pointInPolygon(p, hole))) return polygonDistance(footprint, hole);
  }
  return 0;
}

function boxDistance(a, b) {
  const dx = a[2] < b[0] ? b[0] - a[2] : b[2] < a[0] ? a[0] - b[2] : 0;
  const dz = a[3] < b[1] ? b[1] - a[3] : b[3] < a[1] ? a[1] - b[3] : 0;
  return Math.hypot(dx, dz);
}

export function nearbyConstraints({ point, angle = 0 }) {
  if (!point) return [];
  const [x, z] = geo(point);
  if (x < bounds.west || x > bounds.east || z < bounds.north || z > bounds.south) return [];
  const footprint = rectangle([x, z], halfWidth, halfLength, angle * deg);
  const fbox = envelope(footprint);
  const nearest = new Map();
  for (const item of [...catalog, ...environmentalFeatures]) {
    const label = item.label || constraintCategories[item.id]?.label || item.title;
    for (const piece of item.pieces) {
      const current = nearest.get(label);
      if (current !== undefined && boxDistance(fbox, piece.bbox) >= current.distance) continue;
      const distance = pieceDistance(footprint, piece);
      if (current === undefined || distance < current.distance) nearest.set(label, { id: item.id, label, distance });
    }
  }
  return [...nearest.values()].sort((a, b) => a.distance - b.distance);
}

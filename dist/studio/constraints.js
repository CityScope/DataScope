// Geometries share the local physical model's axes: east is +x, south is +z.
// The city exhibit supplies generalized rail, road and park outlines. Feature
// widths are the ones drawn on the model; these are not surveyed rights of way.
import { environmentalFeatures } from '../environment.js';
import { site, river } from '../geography.js';
import { modelBounds, industrialStructures, schoolStructures, seniorStructures } from './model-data.js';

const deg = Math.PI / 180;
const my = 111320;
const mx = my * Math.cos(site.center[0] * deg);
const bounds = modelBounds;
const halfWidth = (45000 * 0.09290304) / 90 / 2;
const halfLength = 45;
const geo = ([lat, lng]) => [(lng - site.center[1]) * mx, (site.center[0] - lat) * my];
const exhibit = ([x, y]) => [(x - 289.4) * 2.09, (y - 390) * 2.13];

export const constraintMethod = {
  title: 'Placement screening',
  text: 'The complete rotated footprint is checked against depicted rail corridors, paved roads, the Ecorse River channel, parkland and selected community buildings. Orange or red marks show intersections on the table. Geometry and widths are approximate. This screen covers the modeled district. Verify buildability, legal setbacks, zoning and land ownership separately.',
  source: site.source
};

function shifted(points, distance) {
  return points.map(([x, z], i) => {
    const a = points[Math.max(0, i - 1)],
      b = points[Math.min(i + 1, points.length - 1)];
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      len = Math.hypot(dx, dz);
    return [x - (dz / len) * distance, z + (dx / len) * distance];
  });
}
const freeway = shifted(
  [
    [-135, 467],
    [42, 357],
    [151, 289],
    [245, 221],
    [324, 136],
    [404, 36],
    [469, -65]
  ].map(exhibit),
  4
);
export const constraintShapes = {
  parcel: site.boundary.slice(0, -1).map(geo),
  river: river.map(geo),
  freeway,
  railNorth: [
    [-180, 476],
    [23, 404],
    [148, 364],
    [274, 329],
    [391, 296],
    [589, 237],
    [803, 165],
    [994, 102]
  ].map(exhibit),
  railEast: [
    [142, 728],
    [230, 570],
    [309, 434],
    [391, 296],
    [440, 218],
    [487, 133],
    [524, 24],
    [557, -80]
  ].map(exhibit),
  enterprise: [
    [-67, 774],
    [66, 634],
    [155, 508],
    [184, 462],
    [207, 411],
    [239, 355],
    [247, 347]
  ].map(exhibit),
  park: [
    [394, 345],
    [441, 317],
    [408, 382],
    [365, 455],
    [332, 453],
    [352, 416]
  ].map(exhibit)
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
  rail: { label: 'Rail corridor', color: '#ae645b', group: 'transport' },
  river: { label: 'River channel', color: '#497e94', group: 'water' },
  freeway: { label: 'I-94 carriageway', color: '#ae645b', group: 'transport' },
  enterprise: { label: 'Enterprise Drive', color: '#ae645b', group: 'transport' },
  street: { label: 'Neighborhood streets', color: '#ae645b', group: 'transport' },
  park: { label: 'Public parkland', color: '#4d8c70', group: 'community' },
  school: { label: 'School buildings', color: '#9c813e', group: 'community' },
  senior: { label: 'Senior housing', color: '#9c813e', group: 'community' },
  structure: { label: 'Existing buildings', color: '#92746a', group: 'buildings' }
};
function feature(id, title, detail, severity, polys) {
  const pieces = polys
    .filter((p) => p.length >= 3 && Math.abs(signedArea(p)) > 0.0001)
    .map((poly) => ({ poly, bbox: envelope(poly) }));
  catalog.push({ id, title, detail, severity, pieces });
}
// Adjacent trapezoids share their inner edges, following each route's bends.
function strips(line, width) {
  const left = shifted(line, -width / 2),
    right = shifted(line, width / 2);
  return line.slice(1).map((_, i) => [left[i], left[i + 1], right[i + 1], right[i]]);
}
feature(
  'rail',
  'Rail corridor crossing',
  'The footprint intersects the rail bed drawn on the planning model.',
  'conflict',
  [...strips(constraintShapes.railNorth, 14.2), ...strips(constraintShapes.railEast, 14.2)]
);
feature(
  'river',
  'River channel overlap',
  'The footprint intersects the illustrated Ecorse River channel. The model uses a 16 m channel along the mapped centerline.',
  'conflict',
  strips(constraintShapes.river, 16)
);
feature(
  'freeway',
  'I-94 roadway crossing',
  'The footprint overlaps a modeled I-94 carriageway.',
  'conflict',
  [-15, 15].flatMap((off) => strips(shifted(freeway, off), 17.1))
);
feature(
  'enterprise',
  'Enterprise Drive crossing',
  'The footprint overlaps the paved alignment of Enterprise Drive in the model.',
  'conflict',
  strips(constraintShapes.enterprise, 9)
);
feature(
  'park',
  'Parkland overlap',
  'Part of the footprint overlaps the illustrated John Riel Memorial Park area. Verify the park parcel and public use with the city.',
  'review',
  [constraintShapes.park]
);
// School and housing building envelopes follow the generalized physical masses.
// They screen overlap with specific modeled structures rather than address pins.
function structure(px, py, w, h, yaw) {
  return rectangle(exhibit([px, py]), w / 2, h / 2, -yaw);
}
feature(
  'school',
  'School building overlap',
  'The footprint intersects an illustrative Melvindale High School building. Verify the surveyed building and site limits.',
  'review',
  schoolStructures.map((s) => structure(...s))
);
feature(
  'senior',
  'Senior housing overlap',
  'The footprint intersects the illustrated Maple Heights building. Check the actual building and site limits.',
  'review',
  seniorStructures.map((s) => structure(...s))
);

feature(
  'structure',
  'Existing structure shown on model',
  'The footprint overlaps an industrial building depicted on the exhibit. This is approximate model geometry; confirm current occupancy, ownership and the surveyed building limits.',
  'review',
  industrialStructures.map((s) => structure(...s))
);

// Residential streets are schematic. West-side street strips are clipped to
// the same neighborhood mask used to draw them on the tabletop.
const eastOrigin = exhibit([454, 325]),
  westOrigin = exhibit([-108, 180]);
const grid = (origin, c, s, u, v) => [origin[0] + u * c - v * s, origin[1] + u * s + v * c];
const east = (u, v) => grid(eastOrigin, 0.856, 0.517, u, v);
const west = (u, v) => grid(westOrigin, 0.864, 0.504, u, v);
const streetPolys = [];
for (let i = 0; i < 20; i++)
  streetPolys.push(...strips([east(i < 9 ? -4 : -240, i * 74), east(1100, i * 74)], i < 9 ? 6.5 : 6.6));
for (let j = 0; j < 7; j++)
  streetPolys.push(...strips([east(j * 177, -4), east(j * 177, 1380)], j === 3 ? 10 : 6.9));
const westMask = [
  [-500, 230],
  [-200, -200],
  [470, -120],
  [326, 70],
  [183, 179],
  [71, 241],
  [-100, 344]
].map(exhibit);
function westStreet(a, b, w) {
  for (const quad of strips([a, b], w)) streetPolys.push(clipToPolygon(westMask, quad));
}
for (let u = 0; u < 1180; u += 165) westStreet(west(u, -900), west(u, 470), 7);
for (let v = -850; v < 520; v += 70) westStreet(west(-800, v), west(1250, v), 6.5);
feature(
  'street',
  'Street crossing',
  'The building overlaps a street in the generalized neighborhood model. Confirm the exact pavement and right-of-way on a survey.',
  'conflict',
  streetPolys
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
      title: 'Outside modeled coverage',
      detail:
        'The full footprint extends beyond the illustrated district. Check source mapping for this location.',
      severity: 'review'
    });
  }
  const outside =
    box[2] < bounds.west || box[3] < bounds.north || box[0] > bounds.east || box[1] > bounds.south;
  if (!outside)
    for (const { id, title, detail, severity, pieces } of [...catalog, ...environmentalFeatures]) {
      let touches = false;
      for (const { poly, bbox, holes = [] } of pieces) {
        if (!boundsTouch(box, bbox)) continue;
        const clipped = clipToPolygon(poly, footprint);
        const clippedHoles = holes.map(h => clipToPolygon(h, footprint)).filter(h => h.length >= 3);
        const area = Math.abs(signedArea(clipped)) - clippedHoles.reduce((sum,h)=>sum+Math.abs(signedArea(h)),0);
        if (clipped.length < 3 || area < 0.01) continue;
        touches = true;
        overlaps.push({ id, severity, clipped, clippedHoles, feature: poly, holes });
      }
      if (touches) items.push({ id, title, detail, severity });
    }
  items.sort((a, b) => Number(b.severity === 'conflict') - Number(a.severity === 'conflict'));
  return { status: items[0]?.severity || 'clear', items, footprint, overlaps };
}

// Edge-to-edge distances to the depicted land uses, in the same meter frame as
// the collision tests. These are orientation aids, not statutory setback rules.
export function nearbyConstraints({ point, angle = 0 }) {
  if (!point) return [];
  const result = evaluateConstraints({ point, angle });
  if (result.items.some(i => i.id === 'extent')) return [];
  function project(p, a, b) {
    const dx = b[0]-a[0], dz = b[1]-a[1];
    const t = Math.max(0, Math.min(1, ((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz || 1)));
    return [a[0]+t*dx, a[1]+t*dz];
  }
  return catalog.filter(f => ['rail','park','enterprise','school','senior'].includes(f.id)).map(f => {
    let distance = Infinity, witness = null;
    if (result.items.some(i => i.id === f.id)) distance = 0;
    else for (const {poly} of f.pieces) for (let i=0; i<poly.length; i++) for (let j=0; j<result.footprint.length; j++) {
      const a=poly[i], b=poly[(i+1)%poly.length], c=result.footprint[j], d=result.footprint[(j+1)%result.footprint.length];
      for (const [p,q] of [[a,project(a,c,d)],[c,project(c,a,b)]]) {
        const m=Math.hypot(p[0]-q[0],p[1]-q[1]);
        if(m<distance){distance=m;witness=[p,q];}
      }
    }
    return {id:f.id,label:constraintCategories[f.id].label,distance,witness};
  }).sort((a,b)=>a.distance-b.distance);
}

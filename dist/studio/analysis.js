// Geometry uses local east/north meters. A positive bearing turns the facility
// clockwise from north, matching the footprint in the 2D and 3D views.
import { site, places, river } from '../geography.js';

const DEG = Math.PI / 180;
const METERS_LAT = 111320;
const METERS_LNG = METERS_LAT * Math.cos(site.center[0] * DEG);
const LENGTH = 90;
const WIDTH = (45000 * 0.09290304) / LENGTH;
const HALF_W = WIDTH / 2;
const HALF_L = LENGTH / 2;
const CORNERS = [
  [-HALF_W, -HALF_L],
  [HALF_W, -HALF_L],
  [HALF_W, HALF_L],
  [-HALF_W, HALF_L]
];
const SOURCE_OFFSET = 20;
const REFERENCE_DB = 65;
const REFERENCE_DISTANCE = 15;

export const analysisMethods = {
  sound: {
    title: 'Equipment sound',
    text: 'A single source on the west side of the facility is assumed to produce 65 dBA at 15 m. Geometric spreading lowers the equipment-only level by about 6 dB per doubling of distance. Values within 15 m are held at the reference level. Traffic, sound barriers, terrain, background noise and weather are excluded. This is a workshop assumption, not a sound study or permit test.',
    url: 'https://www.fhwa.dot.gov/Environment/noise/measurement/handbook.cfm'
  },
  water: {
    title: 'River clearance',
    text: 'Shortest straight-line distance from the rotated workshop footprint to the locally mapped Ecorse River centerline. A crossing or overlap gives zero. Banks, wetlands, flood elevations and regulatory setbacks require additional data.',
    url: 'https://gisp.mcgi.state.mi.us/arcgis/rest/services/BaseMap/CommonQueries/MapServer/15'
  },
  parcel: {
    title: 'Footprint inside parcel',
    text: 'Share of the 45,000 sq ft rectangular workshop footprint inside the approximate parcel drawn from the city planning exhibit. This tests geometric fit only.',
    url: site.source
  },
  resources: {
    title: 'Facility resource use',
    text: 'Reference electricity assumes 26 MW × 80% average load × 8,760 hours. The efficiency case changes PUE from 1.50 to 1.25 at the same computing load. The dry cooling case assumes 90% less cooling water and 1% more annual electricity. Efficient-design water and dry-cooling peak demand were not modeled. Source: DataCenterScope case study, pp. 16–20 and 34–39.'
  }
};

// Unknowns remain null. A change in siting alone does not change these inputs.
const RESOURCES = {
  reference: { energyGWh: 182.2, waterMGal: 3, peakMW: 26 },
  efficient: { energyGWh: 151.8, waterMGal: null, peakMW: 21.7 },
  dry: { energyGWh: 184.0, waterMGal: 0.3, peakMW: null }
};
const METRICS = ['soundDbA', 'riverSetbackM', 'parcelCoveragePct', 'energyGWh', 'waterMGal', 'peakMW'];

function toMeters([lat, lng]) {
  return [(lng - site.center[1]) * METERS_LNG, (lat - site.center[0]) * METERS_LAT];
}
function toLatLng([east, north]) {
  return [site.center[0] + north / METERS_LAT, site.center[1] + east / METERS_LNG];
}
const parcel = site.boundary.slice(0, -1).map(toMeters);
const reach = river.map(toMeters);
const receptors = new Map(
  places.map((place) => [
    place.id,
    {
      name: place.name,
      position: toMeters([place.lat, place.lng])
    }
  ])
);

function equipmentInMeters([x, y], cos, sin) {
  return [x - SOURCE_OFFSET * cos, y + SOURCE_OFFSET * sin];
}

export function equipmentSourcePoint(point, angle = 0) {
  if (!point) return null;
  return toLatLng(equipmentInMeters(toMeters(point), Math.cos(angle * DEG), Math.sin(angle * DEG)));
}

// Clip the full parcel against each footprint side, then measure its signed
// area. The subject can be concave; the footprint in this coordinate frame is
// an axis-aligned convex rectangle. Closing the clipped ring cancels boundary
// segments traced in opposite directions if two components are disconnected.
function clipHalfPlane(input, axis, limit, direction) {
  const out = [];
  let a = input.at(-1);
  for (const b of input) {
    const d1 = (a[axis] - limit) * direction;
    const d2 = (b[axis] - limit) * direction;
    if (d1 >= 0 !== d2 >= 0) {
      const t = d1 / (d1 - d2);
      out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
    if (d2 >= 0) out.push(b);
    a = b;
  }
  return out;
}

function footprintCoverage(points) {
  let clipped = points;
  for (const [axis, limit, sign] of [
    [0, -HALF_W, 1],
    [0, HALF_W, -1],
    [1, -HALF_L, 1],
    [1, HALF_L, -1]
  ]) {
    clipped = clipHalfPlane(clipped, axis, limit, sign);
    if (!clipped.length) return 0;
  }
  let twiceArea = 0,
    a = clipped.at(-1);
  for (const b of clipped) {
    twiceArea += a[0] * b[1] - a[1] * b[0];
    a = b;
  }
  return Math.min(100, (Math.abs(twiceArea) * 50) / (WIDTH * LENGTH));
}

function riverClearance(points) {
  let best = Infinity,
    footprint,
    river;
  function candidate(fx, fy, rx, ry) {
    const squared = (fx - rx) ** 2 + (fy - ry) ** 2;
    if (squared < best) {
      best = squared;
      footprint = [fx, fy];
      river = [rx, ry];
    }
  }
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i];
    const dx = b[0] - a[0],
      dy = b[1] - a[1];
    // A segment intersects the rectangle if its x and y parameter intervals
    // overlap within [0,1]. Parallel and zero-length segments are supported.
    let entry = 0,
      exit = 1;
    for (let axis = 0; axis < 2; axis++) {
      const h = axis === 0 ? HALF_W : HALF_L,
        delta = axis === 0 ? dx : dy;
      if (Math.abs(delta) < 1e-12) {
        if (Math.abs(a[axis]) > h) {
          exit = -1;
          break;
        }
      } else {
        const t1 = (-h - a[axis]) / delta,
          t2 = (h - a[axis]) / delta;
        entry = Math.max(entry, Math.min(t1, t2));
        exit = Math.min(exit, Math.max(t1, t2));
      }
    }
    if (entry <= exit) {
      const t = entry > 0 ? entry : exit < 1 ? exit : entry;
      const crossing = [a[0] + t * dx, a[1] + t * dy];
      return { distance: 0, footprint: crossing, river: crossing };
    }

    // Disjoint segments have their closest point on at least one endpoint.
    for (const [x, y] of [a, b]) {
      candidate(Math.max(-HALF_W, Math.min(HALF_W, x)), Math.max(-HALF_L, Math.min(HALF_L, y)), x, y);
    }
    const lengthSquared = dx * dx + dy * dy;
    if (!lengthSquared) continue;
    for (const [x, y] of CORNERS) {
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / lengthSquared));
      candidate(x, y, a[0] + t * dx, a[1] + t * dy);
    }
  }
  return Number.isFinite(best) ? { distance: Math.sqrt(best), footprint, river } : null;
}

function evaluate(point, angle, design, receptorId) {
  const receptor = receptors.get(receptorId);
  const info = { receptorName: receptor.name, receptorId };
  if (!point)
    return {
      ...info,
      sourcePoint: null,
      soundDbA: null,
      soundNearField: false,
      riverSetbackM: null,
      riverWitness: null,
      parcelCoveragePct: null,
      energyGWh: 0,
      waterMGal: 0,
      peakMW: 0
    };
  const center = toMeters(point),
    cos = Math.cos(angle * DEG),
    sin = Math.sin(angle * DEG);
  const inFacilityFrame = ([x, y]) => {
    const east = x - center[0],
      north = y - center[1];
    return [east * cos - north * sin, east * sin + north * cos];
  };
  const nearest = riverClearance(reach.map(inFacilityFrame));
  // The scene uses east/south meter coordinates. These endpoints come from
  // the same nearest-point calculation as the clearance reported to residents.
  const toScene = ([x, y]) => [center[0] + x * cos + y * sin, -center[1] + x * sin - y * cos];
  const source = equipmentInMeters(center, cos, sin);
  const distance = Math.hypot(source[0] - receptor.position[0], source[1] - receptor.position[1]);
  return {
    ...info,
    sourcePoint: toLatLng(source),
    soundNearField: distance < REFERENCE_DISTANCE,
    soundDbA: REFERENCE_DB - 20 * Math.log10(Math.max(distance, REFERENCE_DISTANCE) / REFERENCE_DISTANCE),
    riverSetbackM: nearest?.distance ?? null,
    riverWitness: nearest ? { footprint: toScene(nearest.footprint), river: toScene(nearest.river) } : null,
    parcelCoveragePct: footprintCoverage(parcel.map(inFacilityFrame)),
    ...RESOURCES[design]
  };
}
const baselines = new Map([...receptors.keys()].map((id) => [id, evaluate(site.center, 0, 'reference', id)]));

export function analyzePlacement({ point, angle = 0, design = 'reference' }, { receptorId = 'riel' } = {}) {
  if (!receptors.has(receptorId)) receptorId = 'riel';
  if (!Object.hasOwn(RESOURCES, design)) design = 'reference';
  const current = evaluate(point, angle, design, receptorId),
    baseline = baselines.get(receptorId);
  const delta = {};
  for (const key of METRICS) {
    delta[key] = current[key] === null || baseline[key] === null ? null : current[key] - baseline[key];
  }
  return { ...current, delta };
}

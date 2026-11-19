// Geometry uses local east/north meters. A positive bearing turns the facility
// clockwise from north, matching the footprint in the 2D and 3D views.
import { site, places, river } from '../geography.js';
import { modelBounds } from './model-data.js';
import { constraintShapes } from './constraints.js';

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

// Acoustic model geometry matched to the 3D facility in physical.js:
// West mechanical yard centered at x=-17.35, north y=+6 (z=-6), height 3 m;
// Rooftop cooling plant centered at x=+3.6, north y=+6, height 15–17.2 m;
// Main data hall acts as a 10.6 m acoustic barrier between yard and east side.
const YARD_LOCAL = [-17.35, 6.0];
const ROOF_LOCAL = [3.6, 6.0];
const HALL_BARRIER = { minX: -11.575, maxX: 21.575, minY: -29.125, maxY: 41.125, height: 10.6 };
const YARD_HEIGHT = 3.0;
const RECEIVER_HEIGHT = 1.5;
const REFERENCE_DISTANCE = 15;
const SOUND_WAVELENGTH_M = 343 / 250; // ~250 Hz dominant mid-low cooling spectrum
const ALPHA_ATM_DB_PER_M = 0.0035; // ISO 9613-2 mid-low atmospheric absorption (SE MI, 20 °C / 60% RH)
const RFCM_CO2_TON_PER_MWH = 0.489; // US EPA eGRID RFCM (Michigan) regional grid factor

// All three designs serve the same computing workload: 17.33 MW peak IT load,
// 13.87 MW average IT load (80% utilization) = 121.5 GWh/yr IT energy in
// ASHRAE Climate Zone 5A (Southeast Michigan, ~90 °F summer design dry-bulb).
export const designSpecs = {
  reference: {
    name: 'Reference design',
    subtitle: 'Evaporative towers · 26.0 MW peak',
    detail:
      'Evaporative rooftop cooling towers and a west mechanical yard. Moderate broadband sound (building shields the east side), highest cooling-water draw (~145k gal/day).',
    pue: 1.5,
    peakPue: 1.5,
    energyGWh: 182.2,
    peakMW: 26.0,
    wue: 1.65,
    waterMGal: 52.9,
    waterKGalDay: 144.9,
    co2KtYr: Number((182.2 * RFCM_CO2_TON_PER_MWH).toFixed(1)),
    roofDb15: 69.0,
    yardDb15: 70.0,
    sourceDb15: 72.5,
    roofHeightM: 16.0
  },
  efficient: {
    name: 'Higher efficiency',
    subtitle: 'Air economizers · −17% power, −77% water',
    detail:
      'Air-side economizers leverage Michigan’s cool seasons (PUE 1.25) with summer adiabatic trim, cutting annual electricity 17%, cooling water 77%, and exterior sound (~3.5 dB quieter).',
    pue: 1.25,
    peakPue: 1.32,
    energyGWh: 151.8,
    peakMW: 22.9,
    wue: 0.38,
    waterMGal: 12.2,
    waterKGalDay: 33.4,
    co2KtYr: Number((151.8 * RFCM_CO2_TON_PER_MWH).toFixed(1)),
    roofDb15: 65.5,
    yardDb15: 66.5,
    sourceDb15: 69.0,
    roofHeightM: 15.0
  },
  dry: {
    name: 'Dry cooling',
    subtitle: 'Closed-loop fans · −99% water, +5 dB peak',
    detail:
      'Closed-loop V-bank dry coolers eliminate ~99% of evaporative water (~1.1k gal/day), but higher summer airflow and chiller lift add 5% electricity, a 29.1 MW peak, and ~5 dB louder peak fan sound.',
    pue: 1.58,
    peakPue: 1.68,
    energyGWh: 191.9,
    peakMW: 29.1,
    wue: 0.012,
    waterMGal: 0.4,
    waterKGalDay: 1.1,
    co2KtYr: Number((191.9 * RFCM_CO2_TON_PER_MWH).toFixed(1)),
    roofDb15: 74.5,
    yardDb15: 70.5,
    sourceDb15: 76.0,
    roofHeightM: 17.2
  }
};

export const analysisMethods = {
  sound: {
    title: 'Equipment sound (ISO 9613-2)',
    text: 'Combines two cooling-plant sources: the ground-level west mechanical yard (3 m high) and elevated rooftop cooling units (15–17.2 m high). Reference evaporative towers are modeled at 72.5 dBA combined at 15 m (69 dBA roof + 70 dBA yard); higher-efficiency economizers at 69.0 dBA (−3.5 dB); dry cooling V-bank fans at 76.0 dBA peak warm-day load (74.5 dBA roof + 70.5 dBA yard). Propagation includes spherical spreading, ISO 9613-2 atmospheric absorption (0.35 dB/100 m), mixed ground attenuation, and 3D diffraction shielding (up to 10.5 dB on the west yard) when the 10.6 m main hall sits between the yard and the listening point. Background traffic, wind, and site-specific walls are excluded; a formal acoustic study is required for permitting.',
    url: 'https://www.fhwa.dot.gov/Environment/noise/measurement/handbook.cfm'
  },
  water: {
    title: 'River clearance',
    text: 'Shortest straight-line distance from the rotated 90 × 46 m workshop footprint to the locally mapped Ecorse River centerline. A crossing or overlap gives zero; placements within 100 ft are flagged for riparian buffer review. Values are shown only within the modeled district. Banks, wetlands, flood elevations, and regulatory setbacks require site survey data.',
    url: 'https://gisp.mcgi.state.mi.us/arcgis/rest/services/BaseMap/CommonQueries/MapServer/15'
  },
  parcel: {
    title: 'Footprint inside parcel & utility tie-in',
    text: 'Share of the rotated 45,000 sq ft (90 × 46 m) rectangular workshop footprint inside the approximate parcel drawn from the city planning exhibit, plus shortest building-edge distance to the Enterprise Drive industrial access and utility corridor. This screens geometric fit and service run length only.',
    url: site.source
  },
  resources: {
    title: 'Electricity, peak grid load & cooling water',
    text: 'All three cooling options serve the same computing workload (17.3 MW peak IT, 13.9 MW average at 80% load = 121.5 GWh/yr IT) in Southeast Michigan (ASHRAE Climate Zone 5A). Reference evaporative towers assume annual PUE 1.50 (182.2 GWh/yr, 26.0 MW peak) and LBNL Zone 5A WUE 1.65 L/kWh (52.9 M gal/yr, ~145k gal/day). Higher efficiency uses air-side economization across cool seasons (PUE 1.25, 151.8 GWh/yr, 22.9 MW hot-day peak) with adiabatic summer trim (WUE 0.38 L/kWh, 12.2 M gal/yr). Dry cooling eliminates evaporative loss (WUE 0.012 L/kWh, 0.4 M gal/yr makeup) with a Zone 5A dry-bulb energy and peak-demand penalty (PUE 1.58, 191.9 GWh/yr, 29.1 MW peak). Estimated CO₂ uses the US EPA eGRID RFCM (Michigan) factor (0.489 t CO₂/MWh).',
    url: 'https://www.epa.gov/egrid'
  }
};

const METRICS = [
  'soundDbA',
  'riverSetbackM',
  'parcelCoveragePct',
  'utilityRunM',
  'energyGWh',
  'waterMGal',
  'peakMW',
  'co2KtYr'
];

function toMeters([lat, lng]) {
  return [(lng - site.center[1]) * METERS_LNG, (lat - site.center[0]) * METERS_LAT];
}
function toLatLng([east, north]) {
  return [site.center[0] + north / METERS_LAT, site.center[1] + east / METERS_LNG];
}
const parcel = site.boundary.slice(0, -1).map(toMeters);
const reach = river.map(toMeters);
// Convert Enterprise Drive scene coords [east, south] into [east, north] meters.
const enterpriseReach = constraintShapes.enterprise.map(([x, z]) => [x, -z]);
const receptors = new Map(
  places.map((place) => [
    place.id,
    {
      name: place.name,
      position: toMeters([place.lat, place.lng])
    }
  ])
);

function localToWorldMeters([fx, fy], center, cos, sin) {
  return [center[0] + fx * cos + fy * sin, center[1] - fx * sin + fy * cos];
}

export function equipmentSourcePoint(point, angle = 0) {
  if (!point) return null;
  const center = toMeters(point),
    cos = Math.cos(angle * DEG),
    sin = Math.sin(angle * DEG);
  return toLatLng(localToWorldMeters(YARD_LOCAL, center, cos, sin));
}

function segmentBoxHits(ax, ay, bx, by, box) {
  const dx = bx - ax,
    dy = by - ay;
  let t0 = 0,
    t1 = 1;
  for (const [a, d, lo, hi] of [
    [ax, dx, box.minX, box.maxX],
    [ay, dy, box.minY, box.maxY]
  ]) {
    if (Math.abs(d) < 1e-12) {
      if (a < lo || a > hi) return null;
    } else {
      let u0 = (lo - a) / d;
      let u1 = (hi - a) / d;
      if (u0 > u1) [u0, u1] = [u1, u0];
      t0 = Math.max(t0, u0);
      t1 = Math.min(t1, u1);
      if (t0 > t1) return null;
    }
  }
  return t1 > t0 + 1e-6 ? [t0, t1] : null;
}

// Compute realistic ISO 9613-2 / Maekawa insertion loss for the ground-level
// west mechanical yard when the 10.6 m data hall blocks direct line of sight.
function barrierLossDb(rx, ry) {
  const [sx, sy] = YARD_LOCAL;
  const hit = segmentBoxHits(sx, sy, rx, ry, HALL_BARRIER);
  if (!hit) return 0;
  const [t0, t1] = hit;
  const dHoriz = Math.hypot(rx - sx, ry - sy);
  if (dHoriz < 1e-3) return 0;
  const dDirect = Math.hypot(dHoriz, YARD_HEIGHT - RECEIVER_HEIGHT);
  const d1 = t0 * dHoriz;
  const wRoof = (t1 - t0) * dHoriz;
  const d2 = (1 - t1) * dHoriz;
  const overPath =
    Math.hypot(d1, HALL_BARRIER.height - YARD_HEIGHT) +
    wRoof +
    Math.hypot(d2, HALL_BARRIER.height - RECEIVER_HEIGHT);
  const deltaTop = Math.max(0, overPath - dDirect);
  const sideDetour = (endY) => {
    const cx = Math.max(HALL_BARRIER.minX, Math.min(HALL_BARRIER.maxX, (sx + rx) * 0.5));
    const horizontal =
      rx > HALL_BARRIER.maxX
        ? Math.hypot(HALL_BARRIER.minX - sx, endY - sy) +
          (HALL_BARRIER.maxX - HALL_BARRIER.minX) +
          Math.hypot(rx - HALL_BARRIER.maxX, ry - endY)
        : Math.hypot(cx - sx, endY - sy) + Math.hypot(rx - cx, ry - endY);
    return Math.max(0, Math.hypot(horizontal, YARD_HEIGHT - RECEIVER_HEIGHT) - dDirect);
  };
  const deltaSide = Math.min(sideDetour(HALL_BARRIER.minY), sideDetour(HALL_BARRIER.maxY));
  const lossFor = (delta) => 10 * Math.log10(3 + 20 * ((2 * delta) / SOUND_WAVELENGTH_M));
  const lTop = lossFor(deltaTop);
  const lSide = lossFor(deltaSide);
  const combined = -10 * Math.log10(Math.pow(10, -lTop / 10) + Math.pow(10, -lSide / 10));
  return Math.max(0, Math.min(10.5, combined));
}

export function soundAtLocal(rx, ry, design = 'reference') {
  const spec = Object.hasOwn(designSpecs, design) ? designSpecs[design] : designSpecs.reference;
  const dYard = Math.hypot(rx - YARD_LOCAL[0], ry - YARD_LOCAL[1], YARD_HEIGHT - RECEIVER_HEIGHT);
  const dRoof = Math.hypot(rx - ROOF_LOCAL[0], ry - ROOF_LOCAL[1], spec.roofHeightM - RECEIVER_HEIGHT);
  const spread = (d) => 20 * Math.log10(Math.max(d, REFERENCE_DISTANCE) / REFERENCE_DISTANCE);
  const atm = (d) => ALPHA_ATM_DB_PER_M * Math.max(0, d - REFERENCE_DISTANCE);
  const groundYard = 1.5 * Math.min(1, Math.max(0, dYard - REFERENCE_DISTANCE) / 235);
  const groundRoof = 0.8 * Math.min(1, Math.max(0, dRoof - REFERENCE_DISTANCE) / 235);
  const barrierLoss = barrierLossDb(rx, ry);
  const lYardUnshielded = spec.yardDb15 - spread(dYard) - atm(dYard) - groundYard;
  const lYard = lYardUnshielded - barrierLoss;
  const lRoof = spec.roofDb15 - spread(dRoof) - atm(dRoof) - groundRoof;
  const total = 10 * Math.log10(Math.pow(10, lYard / 10) + Math.pow(10, lRoof / 10));
  const unshielded = 10 * Math.log10(Math.pow(10, lYardUnshielded / 10) + Math.pow(10, lRoof / 10));
  const distanceM = Math.min(dYard, dRoof);
  return {
    total,
    unshielded,
    shielding: Math.max(0, unshielded - total),
    barrierLoss,
    distanceM,
    nearField: dYard < REFERENCE_DISTANCE
  };
}

const contourCache = new Map();
// Compute a closed directional iso-dBA contour in local [east, north] meters.
// Cached per (design, targetDbA, steps) so 3D and 2D overlays stay fast and exact.
export function soundContourLocal(design = 'reference', targetDbA = 55, steps = 72) {
  if (!Object.hasOwn(designSpecs, design)) design = 'reference';
  const key = design + ':' + targetDbA + ':' + steps;
  if (contourCache.has(key)) return contourCache.get(key);
  const originX = (YARD_LOCAL[0] + ROOF_LOCAL[0]) * 0.5;
  const originY = YARD_LOCAL[1];
  const points = [];
  for (let i = 0; i < steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    const ux = Math.cos(theta);
    const uy = Math.sin(theta);
    let lo = 12,
      hi = 520;
    for (let iter = 0; iter < 18; iter++) {
      const mid = (lo + hi) * 0.5;
      if (soundAtLocal(originX + ux * mid, originY + uy * mid, design).total > targetDbA) lo = mid;
      else hi = mid;
    }
    const r = (lo + hi) * 0.5;
    points.push([originX + ux * r, originY + uy * r]);
  }
  contourCache.set(key, points);
  return points;
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

function polylineClearance(points) {
  let best = Infinity,
    footprint,
    target;
  function candidate(fx, fy, rx, ry) {
    const squared = (fx - rx) ** 2 + (fy - ry) ** 2;
    if (squared < best) {
      best = squared;
      footprint = [fx, fy];
      target = [rx, ry];
    }
  }
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i];
    const dx = b[0] - a[0],
      dy = b[1] - a[1];
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
  return Number.isFinite(best) ? { distance: Math.sqrt(best), footprint, river: target } : null;
}

function evaluate(point, angle, design, receptorId) {
  const receptor = receptors.get(receptorId);
  const info = { receptorName: receptor.name, receptorId };
  if (!point)
    return {
      ...info,
      sourcePoint: null,
      soundDbA: null,
      soundUnshieldedDbA: null,
      soundShieldingDb: 0,
      soundDistanceM: null,
      soundNearField: false,
      sourceDb15: null,
      riverOutOfCoverage: false,
      riverSetbackM: null,
      riverWitness: null,
      parcelCoveragePct: null,
      utilityRunM: null,
      energyGWh: 0,
      waterMGal: 0,
      waterKGalDay: 0,
      peakMW: 0,
      pue: null,
      wue: null,
      co2KtYr: 0
    };
  const center = toMeters(point),
    cos = Math.cos(angle * DEG),
    sin = Math.sin(angle * DEG);
  const inFacilityFrame = ([x, y]) => {
    const east = x - center[0],
      north = y - center[1];
    return [east * cos - north * sin, east * sin + north * cos];
  };
  const footprint = CORNERS.map(([x, y]) => [center[0] + x * cos + y * sin, -center[1] + x * sin - y * cos]);
  const riverOutOfCoverage = footprint.some(
    ([x, z]) => x < modelBounds.west || x > modelBounds.east || z < modelBounds.north || z > modelBounds.south
  );
  const nearest = riverOutOfCoverage ? null : polylineClearance(reach.map(inFacilityFrame));
  const utilityNearest = riverOutOfCoverage ? null : polylineClearance(enterpriseReach.map(inFacilityFrame));
  const toScene = ([x, y]) => [center[0] + x * cos + y * sin, -center[1] + x * sin - y * cos];
  const source = localToWorldMeters(YARD_LOCAL, center, cos, sin);
  const [rx, ry] = inFacilityFrame(receptor.position);
  const acoustics = soundAtLocal(rx, ry, design);
  const spec = designSpecs[design];
  return {
    ...info,
    sourcePoint: toLatLng(source),
    soundNearField: acoustics.nearField,
    soundDbA: acoustics.total,
    soundUnshieldedDbA: acoustics.unshielded,
    soundShieldingDb: acoustics.shielding,
    soundDistanceM: acoustics.distanceM,
    sourceDb15: spec.sourceDb15,
    riverOutOfCoverage,
    riverSetbackM: nearest?.distance ?? null,
    riverWitness: nearest ? { footprint: toScene(nearest.footprint), river: toScene(nearest.river) } : null,
    parcelCoveragePct: footprintCoverage(parcel.map(inFacilityFrame)),
    utilityRunM: utilityNearest?.distance ?? null,
    energyGWh: spec.energyGWh,
    waterMGal: spec.waterMGal,
    waterKGalDay: spec.waterKGalDay,
    peakMW: spec.peakMW,
    pue: spec.pue,
    wue: spec.wue,
    co2KtYr: spec.co2KtYr
  };
}
const baselines = new Map([...receptors.keys()].map((id) => [id, evaluate(site.center, 0, 'reference', id)]));

export function analyzePlacement({ point, angle = 0, design = 'reference' }, { receptorId = 'riel' } = {}) {
  if (!receptors.has(receptorId)) receptorId = 'riel';
  if (!Object.hasOwn(designSpecs, design)) design = 'reference';
  const current = evaluate(point, angle, design, receptorId),
    baseline = baselines.get(receptorId);
  const delta = {};
  for (const key of METRICS) {
    delta[key] = current[key] === null || baseline[key] === null ? null : current[key] - baseline[key];
  }
  return { ...current, delta };
}

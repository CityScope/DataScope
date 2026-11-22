// College Station, Texas (ASHRAE Climate Zone 2A · ERCOT / ERCT · BVGCD Simsboro Aquifer).
// Geometry uses local east/north meters. Positive bearing turns clockwise from north.
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

// Two-source ISO 9613-2 acoustic geometry matched to physical.js:
// West mechanical yard centered at x=-17.35, north y=+6 (z=-6), height 3 m;
// Rooftop cooling plant centered at x=+3.6, north y=+6, height 15–17.2 m;
// 10.6 m main data hall acts as an acoustic barrier between yard and east side.
const YARD_LOCAL = [-17.35, 6.0];
const ROOF_LOCAL = [3.6, 6.0];
const HALL_BARRIER = { minX: -11.575, maxX: 21.575, minY: -29.125, maxY: 41.125, height: 10.6 };
const YARD_HEIGHT = 3.0;
const RECEIVER_HEIGHT = 1.5;
const REFERENCE_DISTANCE = 15;
const SOUND_WAVELENGTH_M = 343 / 250; // ~250 Hz mid-low broadband cooling reference (60–120 Hz tonal hum flagged separately)
const ALPHA_ATM_DB_PER_M = 0.0032; // ISO 9613-2 mid-low absorption (Central TX, 32 °C / 55% RH)

// Official EPA eGRID2023 Rev. 2 ERCT (ERCOT Texas) CO2e emission factor: 736.6 lb/MWh = 0.334 t/MWh
export const ERCT_CO2_TON_PER_MWH = 0.334;
// College Station Utilities (CSU) permitted Simsboro / Carrizo-Wilcox Aquifer allocation
export const CSU_SIMSBORO_CAP_ACFT_YR = 22626;
const GAL_PER_ACRE_FT = 325851.4;
// Reference CUP-scale computing workload matching the 220 GWh/yr brief baseline:
// 20.0 MW peak IT load, 16.0 MW average IT load (80% utilization) = 140.16 GWh/yr IT energy.
export const IT_PEAK_MW = 20.0;
export const IT_ANNUAL_GWH = 140.16;

// Pillar 1: Design & Urban Integration (D1–D4)
export const integrationSpecs = {
  d1: {
    id: 'd1',
    code: 'D1',
    name: 'Conventional campus',
    subtitle: 'Baseline layout · +$0M',
    detail:
      'Standard 45,000 sq ft data hall with an open west mechanical yard. Relies on building mass alone to shield east-side receptors.',
    yardAttenDb: 0,
    roofAttenDb: 0,
    fanEnergyMult: 1.0,
    capexM: 0,
    coverageAcres: 7.5,
    amenityAcres: 0,
    extraPermJobs: 0,
    extraTaxMYr: 0,
    extraWaterMGal: 0,
    extraEnergyGWh: 0
  },
  d2: {
    id: 'd2',
    code: 'D2',
    name: 'Reoriented & screened',
    subtitle: 'Berms & post-oak buffers · +$6M',
    detail:
      'Adds landscaped 4.5 m earthen berms, native post-oak screening belts, and deeper perimeter setbacks to soften sightlines and mechanical sound.',
    yardAttenDb: 3.5,
    roofAttenDb: 1.2,
    fanEnergyMult: 1.0,
    capexM: 6,
    coverageAcres: 10.5,
    amenityAcres: 1.8,
    extraPermJobs: 2,
    extraTaxMYr: 0,
    extraWaterMGal: 0.8,
    extraEnergyGWh: 0
  },
  d3: {
    id: 'd3',
    code: 'D3',
    name: 'Protected equipment yard',
    subtitle: 'Zigzag acoustic walls · +$11M',
    detail:
      'Encloses chillers, fans, pumps, and generators inside heavy zigzag sound-absorbing baffle walls (−7.5 dB yard attenuation, +1.8% fan energy).',
    yardAttenDb: 7.5,
    roofAttenDb: 2.2,
    fanEnergyMult: 1.018,
    capexM: 11,
    coverageAcres: 9.2,
    amenityAcres: 0.5,
    extraPermJobs: 2,
    extraTaxMYr: 0,
    extraWaterMGal: 0,
    extraEnergyGWh: 0
  },
  d4: {
    id: 'd4',
    code: 'D4',
    name: 'Compact Midtown district',
    subtitle: 'Walkable civic hub & heat · +$22M',
    detail:
      'Pairs the screened facility with a walkable Midtown plaza, community rooms, café/retail pavilions, and trail ties to Texas Independence Park (+45 jobs).',
    yardAttenDb: 3.0,
    roofAttenDb: 1.0,
    fanEnergyMult: 1.0,
    capexM: 22,
    coverageAcres: 14.0,
    amenityAcres: 4.5,
    extraPermJobs: 45,
    extraTaxMYr: 0.7,
    extraWaterMGal: 2.2,
    extraEnergyGWh: 1.8
  }
};

// Pillar 2: Technologies & Impact Mitigation (T1–T4) — ASHRAE Zone 2A (105 °F peak)
export const coolingSpecs = {
  t1: {
    id: 't1',
    code: 'T1',
    thumb: 'reference',
    name: 'Baseline evaporative',
    subtitle: 'Cooling towers · 68.5M gal/yr · +$0M',
    detail:
      'Conventional evaporative cooling towers in Central Texas Zone 2A (PUE 1.57, WUE 1.85). Draws ~210 ac-ft/yr (~0.93% of CSU’s Simsboro cap).',
    pue: 1.57,
    peakPue: 1.68,
    wue: 1.85,
    reclaimedWue: 0,
    heatRecoveryGWh: 0,
    capexM: 0,
    roofDb15: 70.0,
    yardDb15: 71.0,
    sourceDb15: 73.5,
    roofHeightM: 16.0
  },
  t2: {
    id: 't2',
    code: 'T2',
    thumb: 'dry',
    name: 'Low-water dry cooling',
    subtitle: 'Closed-loop · −98% water · +$14M',
    detail:
      'Liquid capture + V-bank dry coolers cut Simsboro draw 98% (~3.4 ac-ft/yr makeup), trading off +3.6 MW 105 °F ERCOT peak and +3.5 dB peak fan sound.',
    pue: 1.65,
    peakPue: 1.86,
    wue: 0.03,
    reclaimedWue: 0,
    heatRecoveryGWh: 0,
    capexM: 14,
    roofDb15: 75.5,
    yardDb15: 71.5,
    sourceDb15: 77.0,
    roofHeightM: 17.2
  },
  t3: {
    id: 't3',
    code: 'T3',
    thumb: 'efficient',
    name: 'Hybrid / reclaimed water',
    subtitle: 'Dry + purple pipe · −88% · +$18M',
    detail:
      'Runs dry in mild weather and uses city reclaimed non-potable effluent for 105 °F summer trim, cutting electricity 12%, potable Simsboro draw 88%, and sound 3 dB.',
    pue: 1.38,
    peakPue: 1.52,
    wue: 0.22,
    reclaimedWue: 0.45,
    heatRecoveryGWh: 0,
    capexM: 18,
    roofDb15: 67.0,
    yardDb15: 68.0,
    sourceDb15: 70.5,
    roofHeightM: 15.0
  },
  t4: {
    id: 't4',
    code: 'T4',
    thumb: 'efficient',
    name: 'Heat recovery & reuse',
    subtitle: 'Thermal loop + heat pumps · +$24M',
    detail:
      'Captures ~35 GWh_th/yr of server heat via isolated exchangers and heat pumps to supply hot water/aquatics for Midtown district or medical partners (−74% water).',
    pue: 1.42,
    peakPue: 1.58,
    wue: 0.48,
    reclaimedWue: 0.25,
    heatRecoveryGWh: 35.0,
    capexM: 24,
    roofDb15: 68.0,
    yardDb15: 69.0,
    sourceDb15: 71.5,
    roofHeightM: 15.4
  }
};

// Pillar 3: Energy Generation & Infrastructure (E1–E4)
export const energySpecs = {
  e1: {
    id: 'e1',
    code: 'E1',
    name: 'CSU / ERCOT grid',
    subtitle: 'Utility supply · +$0M gen capex',
    detail:
      'Draws 100% from College Station Utilities and ERCOT (~$18M/yr electricity). Requires binding CUP self-funding clauses so residential ratepayers do not subsidize upgrades.',
    matchPct: 0,
    netPeakFactor: 1.0,
    co2Factor: 1.0,
    offsiteSqMi: 0,
    onsiteExtraAcres: 0,
    extraWasteHeatMW: 0,
    capexM: 0,
    hostNote: 'Local CSU / ERCOT transmission & substation load'
  },
  e2: {
    id: 'e2',
    code: 'E2',
    name: 'Remote solar matching',
    subtitle: '~1.5 sq mi TX PV · +$250M',
    detail:
      'Operator builds ~115 MW_ac off-site solar (~960 acres / 1.5 sq mi) matching 100% of annual GWh. Reduces net CO₂ 86%, though evening ERCOT balancing and host-county land impacts remain.',
    matchPct: 100,
    netPeakFactor: 0.72,
    co2Factor: 0.14,
    offsiteSqMi: 1.5,
    onsiteExtraAcres: 0,
    extraWasteHeatMW: 0,
    capexM: 250,
    hostNote: '~960 acres (1.5 sq mi) utility PV in Central TX host county'
  },
  e3: {
    id: 'e3',
    code: 'E3',
    name: 'Remote wind matching',
    subtitle: '14–18 turbines · +$155M',
    detail:
      'Operator builds ~16 off-site Texas wind turbines across ~6.5 sq mi of leased farmland (~1% pad footprint) matching annual GWh (−88% net CO₂; requires regional transmission).',
    matchPct: 100,
    netPeakFactor: 0.65,
    co2Factor: 0.12,
    offsiteSqMi: 6.5,
    onsiteExtraAcres: 0,
    extraWasteHeatMW: 0,
    capexM: 155,
    hostNote: '14–18 turbines across ~6.5 sq mi leased Texas farmland'
  },
  e4: {
    id: 'e4',
    code: 'E4',
    name: 'On-site microreactors',
    subtitle: '6 × 5 MWe (~2030s) · +$210M',
    detail:
      'Six 5 MWe eVinci-class heat-pipe microreactors on a ~3.5-acre secure pad deliver firm behind-the-meter power (−95% CO₂, near-zero grid draw) + ~60 MW waste heat; faces intense local siting scrutiny.',
    matchPct: 100,
    netPeakFactor: 0.12,
    co2Factor: 0.05,
    offsiteSqMi: 0,
    onsiteExtraAcres: 3.5,
    extraWasteHeatMW: 60,
    capexM: 210,
    hostNote: '~3.5-acre shielded on-site vault; site-boundary EPZ scrutiny'
  }
};

// Pillar 4: Combinable Community Benefits (B1–B4)
// Premise from brief: developer dedicates $10M upfront + $0.5M/yr base pool (on top of taxes).
export const benefitSpecs = {
  b1: {
    id: 'b1',
    code: 'B1',
    name: 'Community endowment',
    subtitle: 'Annual grants · schools, health & parks',
    detail:
      'Independently governed local trust disbursing audited annual grants chosen with residents for CSISD schools, senior wellness, and Lick Creek / Midtown parks.'
  },
  b2: {
    id: 'b2',
    code: 'B2',
    name: 'City equity / rev. share',
    subtitle: 'Fractional ownership + payment floor',
    detail:
      'College Station holds fractional facility equity plus a guaranteed payment floor so civic returns scale with compute growth while insulating the city from operator bankruptcy.'
  },
  b3: {
    id: 'b3',
    code: 'B3',
    name: 'Household protection',
    subtitle: 'Acoustic/bill retrofits · owners & renters',
    detail:
      'Funds acoustic glazing/insulation retrofits, CSU electric bill relief, and defined property-value protection for the nearest affected homeowners and renters.'
  },
  b4: {
    id: 'b4',
    code: 'B4',
    name: 'Jobs & local enterprise',
    subtitle: 'TAMU/Blinn trades + local bids',
    detail:
      'Funds paid electrical/cooling apprenticeships with Texas A&M & Blinn College and unbundled Brazos Valley contractor bids, tracking construction vs. permanent jobs separately.'
  }
};

// Backward-compatible export alias for legacy callers/tests
export const designSpecs = coolingSpecs;

// First-class No-Build / Midtown Alternative benchmark (Texas Independence Park + retail + "The Station" sports complex)
export const midtownAlternative = {
  name: 'Midtown Alternative (No Data Center)',
  taxMYr: 2.4,
  annualBenefitMYr: 0,
  localValueMYr: 2.4,
  permanentJobs: 420,
  constructionJobYears: 310,
  amenityAcres: 18.0,
  jobsPerAcre: 2.1
};

export const analysisMethods = {
  resources: {
    title: 'Central Texas Grid, Peak Load & Simsboro Aquifer (ASHRAE Zone 2A)',
    text: 'All cooling packages serve the same CUP-eligible 20.0 MW peak IT load (16.0 MW avg at 80% utilization = 140.2 GWh/yr IT) in College Station (ASHRAE Zone 2A, 105 °F summer peak). Baseline evaporative towers (T1) assume PUE 1.57 (220.1 GWh/yr, 33.6 MW peak) and WUE 1.85 L/kWh (68.5 M gal/yr = 210 ac-ft/yr, or 0.93% of CSU’s 22,626 ac-ft/yr BVGCD Simsboro Aquifer permit). Low-water dry cooling (T2) cuts potable water 98% to 1.1 M gal/yr but increases 105 °F peak load to 37.2 MW. Hybrid/reclaimed (T3) cuts potable draw 88% using city non-potable effluent. Grid CO₂ uses the official US EPA eGRID2023 Rev. 2 ERCT (ERCOT) rate of 0.334 t CO₂e/MWh. Multi-county GMA-12 aquifer depletion and ERCOT/PUCT rate allocation cannot be solved at parcel scale.',
    url: 'https://www.epa.gov/egrid'
  },
  sound: {
    title: 'Screening-Level Equipment Sound (ISO 9613-2 · Not Certification)',
    text: 'Models two cooling-plant sources (3 m west mechanical yard + 15–17.2 m rooftop plant) with spherical spreading, Central Texas atmospheric absorption (0.32 dB/100 m), ground attenuation, 3D diffraction over the 10.6 m hall, plus D2 earthen berms (−3.5 dB yard) or D3 heavy zigzag acoustic baffle walls (−7.5 dB yard, −2.2 dB roof). Screening limit: published CityScope noise validations show 5–10 dB deviations and dBA averages under-represent low-frequency tonal hum (60–120 Hz) that penetrates walls and affects sensory-sensitive residents. Independent certified dBC spectral modeling and post-construction occupancy testing are required before CUP approval.',
    url: 'https://www.fhwa.dot.gov/Environment/noise/measurement/handbook.cfm'
  },
  water: {
    title: 'Lick Creek Tributary & Simsboro Groundwater Context',
    text: 'Measures shortest building-edge clearance to the generalized Lick Creek tributary east of Midtown Business Park (flagging placements within 150 ft for riparian/stormwater review) and compares annual potable cooling water against CSU’s 22,626 acre-ft/yr Simsboro Aquifer permit. Regional export pipelines (e.g., Vista Ridge, Upwell) and GMA-12 caps require BVGCD and state-level governance.',
    url: 'https://brazosvalleygcd.org/'
  },
  parcel: {
    title: 'Midtown CUP Parcel Fit, Access & Utility Tie-In',
    text: 'Measures geometric fit of the rotated 90 × 46 m (45,000 sq ft) core data-hall pad inside the approximate Midtown Business Park study tract, plus shortest distance to Midtown Drive / Corporate Parkway. Reflects College Station’s Oct. 22, 2026 UDO amendment requiring a Conditional Use Permit for data centers >5,000 sq ft in Business Park and Industrial zones.',
    url: site.source
  },
  economic: {
    title: 'Package Cost, Municipal Revenue, Benefits & Midtown Opportunity Cost',
    text: 'Separates incremental developer capital cost (urban integration, cooling tech, off-site solar/wind or microreactors) from annual municipal tax yield (~$3.2M/yr illustrative for a 30 MW CUP facility; the rejected 600 MW Project Aggie projected $10M–$22M/yr) and the optional community benefit pool ($10M upfront + $0.5M/yr base plus equity/training add-ons). Explicitly separates temporary construction job-years from permanent FTE jobs and compares directly against the No-Build Midtown Mixed-Use benchmark (Texas Independence Park + retail + "The Station" sports complex: ~$2.4M/yr tax, ~420 permanent jobs). Simulations are non-binding; enforcement requires CUP covenants, performance bonds, and continuous telemetry.',
    url: site.source
  },
  social: {
    title: 'Sensitive Receptors, Equity & Institutional Guardrails',
    text: 'Tracks distance to The Langford Assisted Living, Midtown Reserve, Texas Independence Park, Pebble Creek & Bridle Gate, Pebble Creek Elementary, and Baylor Scott & White Medical Center, alongside eligible household retrofits (owners & renters), community endowment grants, and walkable Midtown amenity acreage. DataScope cannot resolve NDA secrecy, cardiac-device/EMF anxieties, or statewide tax exemptions; those require mandatory pre-CUP public technical disclosure, binding covenants, and 2027 Texas Legislature action.',
    url: site.source
  }
};

const METRICS = [
  'soundDbA',
  'riverSetbackM',
  'parcelCoveragePct',
  'utilityRunM',
  'energyGWh',
  'waterMGal',
  'simsboroPct',
  'peakMW',
  'netGridPeakMW',
  'co2KtYr',
  'capexDeltaM',
  'taxMYr',
  'annualBenefitMYr',
  'localValueMYr',
  'permanentJobs',
  'constructionJobYears',
  'nearestReceptorM',
  'householdsProtected',
  'grantKYr',
  'amenityAcres',
  'offsiteSqMi'
];

function toMeters([lat, lng]) {
  return [(lng - site.center[1]) * METERS_LNG, (lat - site.center[0]) * METERS_LAT];
}
function toLatLng([east, north]) {
  return [site.center[0] + north / METERS_LAT, site.center[1] + east / METERS_LNG];
}
const parcel = site.boundary.slice(0, -1).map(toMeters);
const reach = river.map(toMeters);
const midtownReach = constraintShapes.enterprise.map(([x, z]) => [x, -z]);
const receptors = new Map(
  places.map((place) => [
    place.id,
    {
      name: place.name,
      type: place.type,
      position: toMeters([place.lat, place.lng])
    }
  ])
);

const legacyCoolingMap = { reference: 't1', efficient: 't3', dry: 't2' };
export function resolveCoolingId(value) {
  if (Object.hasOwn(coolingSpecs, value)) return value;
  return legacyCoolingMap[value] || 't1';
}
export function resolveIntegrationId(value) {
  return Object.hasOwn(integrationSpecs, value) ? value : 'd1';
}
export function resolveEnergyId(value) {
  return Object.hasOwn(energySpecs, value) ? value : 'e1';
}

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

// Compute ISO 9613-2 / Maekawa insertion loss for the ground-level west mechanical
// yard when the 10.6 m data hall blocks direct line of sight.
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

export function soundAtLocal(rx, ry, cooling = 't1', integration = 'd1') {
  const cSpec = coolingSpecs[resolveCoolingId(cooling)];
  const iSpec = integrationSpecs[resolveIntegrationId(integration)];
  const dYard = Math.hypot(rx - YARD_LOCAL[0], ry - YARD_LOCAL[1], YARD_HEIGHT - RECEIVER_HEIGHT);
  const dRoof = Math.hypot(rx - ROOF_LOCAL[0], ry - ROOF_LOCAL[1], cSpec.roofHeightM - RECEIVER_HEIGHT);
  const spread = (d) => 20 * Math.log10(Math.max(d, REFERENCE_DISTANCE) / REFERENCE_DISTANCE);
  const atm = (d) => ALPHA_ATM_DB_PER_M * Math.max(0, d - REFERENCE_DISTANCE);
  const groundYard = 1.5 * Math.min(1, Math.max(0, dYard - REFERENCE_DISTANCE) / 235);
  const groundRoof = 0.8 * Math.min(1, Math.max(0, dRoof - REFERENCE_DISTANCE) / 235);
  const barrierLoss = barrierLossDb(rx, ry);
  const lYardUnshielded = cSpec.yardDb15 - spread(dYard) - atm(dYard) - groundYard;
  const lYard = lYardUnshielded - barrierLoss - iSpec.yardAttenDb;
  const lRoofUnshielded = cSpec.roofDb15 - spread(dRoof) - atm(dRoof) - groundRoof;
  const lRoof = lRoofUnshielded - iSpec.roofAttenDb;
  const total = 10 * Math.log10(Math.pow(10, lYard / 10) + Math.pow(10, lRoof / 10));
  const unshielded = 10 * Math.log10(Math.pow(10, lYardUnshielded / 10) + Math.pow(10, lRoofUnshielded / 10));
  const distanceM = Math.min(dYard, dRoof);
  return {
    total,
    unshielded,
    shielding: Math.max(0, unshielded - total),
    barrierLoss,
    enclosureLoss: iSpec.yardAttenDb,
    distanceM,
    nearField: dYard < REFERENCE_DISTANCE
  };
}

const contourCache = new Map();
// Compute a closed directional iso-dBA contour in local [east, north] meters.
export function soundContourLocal(cooling = 't1', targetDbA = 55, steps = 72, integration = 'd1') {
  const cId = resolveCoolingId(cooling);
  const iId = resolveIntegrationId(integration);
  const key = cId + ':' + iId + ':' + targetDbA + ':' + steps;
  if (contourCache.has(key)) return contourCache.get(key);
  const originX = (YARD_LOCAL[0] + ROOF_LOCAL[0]) * 0.5;
  const originY = YARD_LOCAL[1];
  const points = [];
  for (let i = 0; i < steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    const ux = Math.cos(theta);
    const uy = Math.sin(theta);
    let lo = 12,
      hi = 640;
    for (let iter = 0; iter < 18; iter++) {
      const mid = (lo + hi) * 0.5;
      if (soundAtLocal(originX + ux * mid, originY + uy * mid, cId, iId).total > targetDbA) lo = mid;
      else hi = mid;
    }
    const r = (lo + hi) * 0.5;
    points.push([originX + ux * r, originY + uy * r]);
  }
  contourCache.set(key, points);
  return points;
}

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

function evaluate({ point, angle = 0, integration = 'd1', cooling = 't1', energy = 'e1', benefits = [] }, receptorId) {
  const receptor = receptors.get(receptorId);
  const info = { receptorName: receptor.name, receptorId };
  if (!point)
    return {
      ...info,
      integration: 'd1',
      cooling: 't1',
      energy: 'e1',
      benefits: [],
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
      waterAcreFtYr: 0,
      simsboroPct: 0,
      reclaimedMGal: 0,
      peakMW: 0,
      netGridPeakMW: 0,
      pue: null,
      wue: null,
      co2KtYr: 0,
      capexDeltaM: 0,
      taxMYr: midtownAlternative.taxMYr,
      upfrontPoolM: 0,
      annualBenefitMYr: 0,
      localValueMYr: midtownAlternative.localValueMYr,
      permanentJobs: midtownAlternative.permanentJobs,
      constructionJobYears: midtownAlternative.constructionJobYears,
      nearestReceptorM: null,
      nearestReceptorName: 'Midtown Alternative',
      householdsProtected: 0,
      grantKYr: 0,
      equityMYr: 0,
      trainingSlotsYr: 0,
      amenityAcres: midtownAlternative.amenityAcres,
      offsiteSqMi: 0,
      matchPct: 0,
      heatDeliveredGWh: 0
    };

  const iId = resolveIntegrationId(integration);
  const cId = resolveCoolingId(cooling);
  const eId = resolveEnergyId(energy);
  const activeBenefits = Array.isArray(benefits) ? benefits.filter((b) => Object.hasOwn(benefitSpecs, b)) : [];
  const iSpec = integrationSpecs[iId];
  const cSpec = coolingSpecs[cId];
  const eSpec = energySpecs[eId];

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
  const utilityNearest = riverOutOfCoverage ? null : polylineClearance(midtownReach.map(inFacilityFrame));
  const toScene = ([x, y]) => [center[0] + x * cos + y * sin, -center[1] + x * sin - y * cos];
  const source = localToWorldMeters(YARD_LOCAL, center, cos, sin);
  const [rx, ry] = inFacilityFrame(receptor.position);
  const acoustics = soundAtLocal(rx, ry, cId, iId);

  // Nearest sensitive community receptor distance
  let nearestReceptorM = Infinity,
    nearestReceptorName = '';
  for (const [, rec] of receptors) {
    const d = Math.hypot(rec.position[0] - center[0], rec.position[1] - center[1]);
    if (d < nearestReceptorM) {
      nearestReceptorM = d;
      nearestReceptorName = rec.name;
    }
  }

  // Energy & Peak Load (Central Texas Zone 2A + D3 fan pressure drop + D4 district load)
  const effectivePue = Number((cSpec.pue * iSpec.fanEnergyMult).toFixed(2));
  const energyGWh = Number((IT_ANNUAL_GWH * effectivePue + iSpec.extraEnergyGWh).toFixed(1));
  const peakMW = Number((IT_PEAK_MW * cSpec.peakPue * iSpec.fanEnergyMult + (iId === 'd4' ? 0.5 : 0)).toFixed(1));
  const netGridPeakMW = Number((peakMW * eSpec.netPeakFactor).toFixed(1));
  const co2KtYr = Number((energyGWh * ERCT_CO2_TON_PER_MWH * eSpec.co2Factor).toFixed(1));

  // Potable Simsboro Aquifer Water vs. Reclaimed Effluent
  const coolingWaterMGal = (IT_ANNUAL_GWH * 1e6 * cSpec.wue) / 3.78541 / 1e6;
  const waterMGal = Number((coolingWaterMGal + iSpec.extraWaterMGal).toFixed(1));
  const waterKGalDay = Number(((waterMGal * 1000) / 365).toFixed(1));
  const waterAcreFtYr = Number(((waterMGal * 1e6) / GAL_PER_ACRE_FT).toFixed(1));
  const simsboroPct = Number(((waterAcreFtYr / CSU_SIMSBORO_CAP_ACFT_YR) * 100).toFixed(2));
  const reclaimedMGal = Number(((IT_ANNUAL_GWH * 1e6 * cSpec.reclaimedWue) / 3.78541 / 1e6).toFixed(1));

  // Waste heat recovery delivered (higher utilization when paired with D4 Midtown district)
  const heatDeliveredGWh =
    cSpec.heatRecoveryGWh > 0
      ? Number((cSpec.heatRecoveryGWh * (iId === 'd4' ? 1.0 : 0.45) + (eId === 'e4' ? 18 : 0)).toFixed(1))
      : 0;

  // Economics, Taxes & Community Benefit Pool ($10M upfront + $0.5M/yr base on top of taxes)
  const hasB1 = activeBenefits.includes('b1');
  const hasB2 = activeBenefits.includes('b2');
  const hasB3 = activeBenefits.includes('b3');
  const hasB4 = activeBenefits.includes('b4');
  const benefitCount = activeBenefits.length;
  const upfrontPoolM = benefitCount > 0 ? 10.0 : 0;
  const baseAnnualizedPool = benefitCount > 0 ? 1.5 : 0; // $10M / 10 yr + $0.5M/yr ongoing
  const equityMYr = hasB2 ? 0.55 : 0;
  const trainingMatchMYr = hasB4 ? 0.35 : 0;
  const annualBenefitMYr = Number((baseAnnualizedPool + equityMYr + trainingMatchMYr).toFixed(2));
  const taxMYr = Number((3.2 + iSpec.extraTaxMYr + (cId === 't4' && iId === 'd4' ? 0.2 : 0)).toFixed(2));
  const localValueMYr = Number((taxMYr + annualBenefitMYr).toFixed(2));
  const capexDeltaM = iSpec.capexM + cSpec.capexM + eSpec.capexM + upfrontPoolM;

  // Separate construction job-years from permanent operational jobs
  const permanentJobs = 32 + iSpec.extraPermJobs + (hasB4 ? 6 : 0) + (eId === 'e4' ? 14 : 0);
  const constructionJobYears = 260 + Math.round((iSpec.capexM + cSpec.capexM + Math.min(eSpec.capexM, 180)) * 1.1);

  // Social delivery measures
  const shareEach = benefitCount > 0 ? baseAnnualizedPool / benefitCount : 0;
  const grantKYr = hasB1 ? Math.round(shareEach * 1000) : 0;
  const householdsProtected = hasB3 ? Math.round(140 + shareEach * 90) : 0;
  const trainingSlotsYr = hasB4 ? 36 : 0;

  return {
    ...info,
    integration: iId,
    cooling: cId,
    energy: eId,
    benefits: activeBenefits,
    sourcePoint: toLatLng(source),
    soundNearField: acoustics.nearField,
    soundDbA: acoustics.total,
    soundUnshieldedDbA: acoustics.unshielded,
    soundShieldingDb: acoustics.shielding,
    soundDistanceM: acoustics.distanceM,
    sourceDb15: Number((cSpec.sourceDb15 - iSpec.yardAttenDb * 0.45).toFixed(1)),
    riverOutOfCoverage,
    riverSetbackM: nearest?.distance ?? null,
    riverWitness: nearest ? { footprint: toScene(nearest.footprint), river: toScene(nearest.river) } : null,
    parcelCoveragePct: footprintCoverage(parcel.map(inFacilityFrame)),
    utilityRunM: utilityNearest?.distance ?? null,
    energyGWh,
    waterMGal,
    waterKGalDay,
    waterAcreFtYr,
    simsboroPct,
    reclaimedMGal,
    peakMW,
    netGridPeakMW,
    pue: effectivePue,
    wue: cSpec.wue,
    co2KtYr,
    capexDeltaM,
    taxMYr,
    upfrontPoolM,
    annualBenefitMYr,
    localValueMYr,
    permanentJobs,
    constructionJobYears,
    nearestReceptorM,
    nearestReceptorName,
    householdsProtected,
    grantKYr,
    equityMYr,
    trainingSlotsYr,
    amenityAcres: iSpec.amenityAcres,
    offsiteSqMi: eSpec.offsiteSqMi,
    matchPct: eSpec.matchPct,
    heatDeliveredGWh
  };
}

const baselineInput = {
  point: site.center,
  angle: 0,
  integration: 'd1',
  cooling: 't1',
  energy: 'e1',
  benefits: []
};
const baselines = new Map([...receptors.keys()].map((id) => [id, evaluate(baselineInput, id)]));

export function analyzePlacement(
  { point, angle = 0, integration = 'd1', cooling, design, energy = 'e1', benefits = [] },
  { receptorId = 'langford' } = {}
) {
  if (!receptors.has(receptorId)) receptorId = 'langford';
  const resolvedCooling = resolveCoolingId(cooling ?? design ?? 't1');
  const current = evaluate(
    {
      point,
      angle,
      integration: resolveIntegrationId(integration),
      cooling: resolvedCooling,
      energy: resolveEnergyId(energy),
      benefits
    },
    receptorId
  );
  const baseline = baselines.get(receptorId);
  const delta = {};
  for (const key of METRICS) {
    delta[key] = current[key] === null || baseline[key] === null ? null : current[key] - baseline[key];
  }
  return { ...current, delta };
}

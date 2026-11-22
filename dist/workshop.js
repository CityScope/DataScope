import { site } from './geography.js';

export const STUDY_BOUNDS = [
  [30.48, -96.42],
  [30.72, -96.14]
];

export const presetScenarios = {
  conventional: {
    name: 'Conventional baseline',
    point: [...site.center],
    angle: 0,
    integration: 'd1',
    cooling: 't1',
    energy: 'e1',
    benefits: []
  },
  environmental: {
    name: 'Environmentally optimized',
    point: [30.5701, -96.2611],
    angle: 180,
    integration: 'd2',
    cooling: 't3',
    energy: 'e2',
    benefits: ['b3']
  },
  energy: {
    name: 'Energy-integrated',
    point: [30.5698, -96.2615],
    angle: 150,
    integration: 'd3',
    cooling: 't4',
    energy: 'e4',
    benefits: ['b2', 'b4']
  },
  community: {
    name: 'Community-integrated',
    point: [30.571, -96.2616],
    angle: 180,
    integration: 'd4',
    cooling: 't2',
    energy: 'e2',
    benefits: ['b1', 'b3', 'b4']
  }
};

export const setbackOption = presetScenarios.environmental;

export const WORKSHOP_LIMITS = {
  scenarios: 60,
  notes: 1000,
  name: 80,
  note: 1200
};

const standardChoices = new Set(['conventional', 'environmental', 'energy', 'community', 'custom', 'none']);
const integrationOptions = new Set(['d1', 'd2', 'd3', 'd4']);
const coolingOptions = new Set(['t1', 't2', 't3', 't4']);
const energyOptions = new Set(['e1', 'e2', 'e3', 'e4']);
const benefitOptions = new Set(['b1', 'b2', 'b3', 'b4']);
const legacyCoolingMap = { reference: 't1', efficient: 't3', dry: 't2' };
const earthRadius = 6371008.8;

export function isStudyPoint(point) {
  if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite)) return false;
  const [[south, west], [north, east]] = STUDY_BOUNDS;
  return point[0] >= south && point[0] <= north && point[1] >= west && point[1] <= east;
}

export function distanceMeters(a, b) {
  const radians = Math.PI / 180;
  const dLat = (b[0] - a[0]) * radians;
  const dLng = (b[1] - a[1]) * radians;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[0] * radians) * Math.cos(b[0] * radians) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Places are public reference points. Distances describe proximity to those points.
export function measure(point, places) {
  const nearest = { school: null, park: null, housing: null, senior: null, medical: null };
  if (!isStudyPoint(point)) return nearest;
  for (const place of places) {
    if (!Object.hasOwn(nearest, place.type) || !isStudyPoint([place.lat, place.lng])) continue;
    const meters = distanceMeters(point, [place.lat, place.lng]);
    if (!nearest[place.type] || meters < nearest[place.type].meters) {
      nearest[place.type] = { name: place.name, meters };
    }
  }
  return nearest;
}

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function textValue(value, label, maxLength) {
  requireValue(typeof value === 'string', `Missing ${label}.`);
  const text = value.trim();
  requireValue(
    text.length > 0 && text.length <= maxLength,
    `${label} must have 1–${maxLength} characters.`
  );
  return text;
}

function identifier(value) {
  requireValue(
    typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,99}$/i.test(value),
    'Invalid workshop ID.'
  );
  return value;
}

function checkedPoint(point) {
  requireValue(isStudyPoint(point), 'A location is outside the College Station study map.');
  return [...point];
}

function checkedAngle(angle) {
  requireValue(Number.isFinite(angle), 'Missing footprint orientation.');
  return ((angle % 360) + 360) % 360;
}

function checkedBenefits(value) {
  if (value === undefined) return [];
  requireValue(Array.isArray(value), 'Invalid community benefits selection.');
  const seen = new Set();
  for (const item of value) {
    requireValue(benefitOptions.has(item), 'Unknown community benefit module.');
    seen.add(item);
  }
  return [...seen].sort();
}

function placement(value, allowEmpty) {
  requireValue(value && typeof value === 'object', 'Missing placement.');
  const point = allowEmpty && value.point === null ? null : checkedPoint(value.point);
  const integration = value.integration === undefined ? 'd1' : value.integration;
  requireValue(integrationOptions.has(integration), 'Unknown urban integration option.');
  const rawCooling =
    value.cooling !== undefined
      ? value.cooling
      : value.design !== undefined
        ? (legacyCoolingMap[value.design] ?? value.design)
        : 't1';
  requireValue(coolingOptions.has(rawCooling), 'Unknown cooling technology option.');
  const energy = value.energy === undefined ? 'e1' : value.energy;
  requireValue(energyOptions.has(energy), 'Unknown energy supply option.');
  const benefits = checkedBenefits(value.benefits);
  return {
    point,
    angle: checkedAngle(value.angle),
    integration,
    cooling: rawCooling,
    energy,
    benefits
  };
}

function checkedList(list, limit, label, read) {
  requireValue(
    Array.isArray(list) && list.length <= limit,
    `The workshop can hold up to ${limit} ${label}.`
  );
  const values = list.map(read);
  const ids = new Set(values.map((item) => item.id));
  requireValue(ids.size === values.length, `Duplicate IDs in ${label}.`);
  return values;
}

function readScenario(scenario) {
  requireValue(scenario && typeof scenario === 'object', 'Invalid saved placement.');
  const id = identifier(scenario.id);
  requireValue(!standardChoices.has(id), 'A saved placement uses a reserved ID.');
  return {
    id,
    name: textValue(scenario.name, 'Placement name', WORKSHOP_LIMITS.name),
    ...placement(scenario, false)
  };
}

function readNote(note) {
  requireValue(note && typeof note === 'object', 'Invalid community note.');
  const [lat, lng] = checkedPoint([note.lat, note.lng]);
  requireValue(
    typeof note.createdAt === 'string' || typeof note.createdAt === 'number',
    'Missing note date.'
  );
  const created = new Date(note.createdAt);
  requireValue(Number.isFinite(created.getTime()), 'Invalid note date.');
  const record = {
    id: identifier(note.id),
    lat,
    lng,
    text: textValue(note.text, 'Note', WORKSHOP_LIMITS.note),
    topic: textValue(note.topic, 'Topic', 80),
    scenario: textValue(note.scenario, 'Note placement', 100),
    createdAt: created.toISOString()
  };
  if (note.placement !== undefined) record.placement = placement(note.placement, true);
  return record;
}

function normalize(value) {
  requireValue(value && (value.version === 2 || value.version === 1), 'Choose a DataScope workshop file.');
  const scenarios = checkedList(
    value.scenarios,
    WORKSHOP_LIMITS.scenarios,
    'saved placements',
    readScenario
  );
  const notes = checkedList(value.notes, WORKSHOP_LIMITS.notes, 'community notes', readNote);
  let active = identifier(value.active);
  if (active === 'proposal') active = 'conventional';
  if (active === 'setback') active = 'environmental';
  requireValue(
    standardChoices.has(active) || scenarios.some((item) => item.id === active),
    'Unknown active placement.'
  );
  const view = placement(value, active === 'none');
  requireValue(active !== 'none' || view.point === null, 'The no-build option must have no footprint.');
  return { version: 2, active, ...view, scenarios, notes };
}

export function initialWorkspace(center = site.center) {
  return {
    version: 2,
    active: 'conventional',
    point: checkedPoint(center),
    angle: 0,
    integration: 'd1',
    cooling: 't1',
    energy: 'e1',
    benefits: [],
    scenarios: [],
    notes: []
  };
}

export function parseWorkshop(text) {
  requireValue(
    typeof text === 'string' && text.length <= 6_000_000,
    'Choose a workshop file smaller than 6 MB.'
  );
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('This file is not readable JSON.');
  }
  return normalize(data);
}

export function serializeWorkshop(state) {
  return JSON.stringify(normalize(state), null, 2);
}

function storageKey() {
  const basePath = globalThis.location ? new URL('.', globalThis.location.href).pathname : '/';
  return 'datascope:college-station:v2:' + basePath;
}

let lastLocalState = null;

export function loadWorkspace(center = site.center) {
  try {
    const raw = globalThis.localStorage.getItem(storageKey());
    const state = raw ? parseWorkshop(raw) : initialWorkspace(center);
    lastLocalState = normalize(state);
    return state;
  } catch {
    lastLocalState = null;
    return initialWorkspace(center);
  }
}

// Preserve independent changes made since this tab last loaded or saved.
function mergeList(previous, local, stored) {
  const old = new Map(previous.map((item) => [item.id, item]));
  const result = new Map(stored.map((item) => [item.id, item]));
  const localIds = new Set(local.map((item) => item.id));
  for (const id of old.keys()) if (!localIds.has(id)) result.delete(id);
  for (const item of local) {
    if (JSON.stringify(item) !== JSON.stringify(old.get(item.id))) result.set(item.id, item);
  }
  return [...result.values()];
}

export function saveWorkspace(state, { replace = false } = {}) {
  try {
    const local = normalize(state);
    const next = { ...local };
    const key = storageKey();
    if (!replace && lastLocalState) {
      const raw = globalThis.localStorage.getItem(key);
      if (raw) {
        const stored = parseWorkshop(raw);
        next.scenarios = mergeList(lastLocalState.scenarios, local.scenarios, stored.scenarios);
        next.notes = mergeList(lastLocalState.notes, local.notes, stored.notes);
        if (!standardChoices.has(next.active) && !next.scenarios.some((s) => s.id === next.active))
          next.active = 'custom';
      }
    }
    globalThis.localStorage.setItem(key, JSON.stringify(normalize(next)));
    lastLocalState = local;
    return true;
  } catch {
    return false;
  }
}

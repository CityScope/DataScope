import { site } from './geography.js';

export const STUDY_BOUNDS = [
  [42.16, -83.3],
  [42.36, -83.11]
];

export const setbackOption = { name: 'Southwest setback · example', point: [42.26792, -83.20847], angle: 30, design: 'reference' };

export const WORKSHOP_LIMITS = {
  scenarios: 60,
  notes: 1000,
  name: 80,
  note: 1200
};

const standardChoices = new Set(['proposal', 'setback', 'custom', 'none']);
const designOptions = new Set(['reference', 'efficient', 'dry']);
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
  const nearest = { school: null, park: null, housing: null };
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
  requireValue(isStudyPoint(point), 'A location is outside the Allen Park study map.');
  return [...point];
}

function checkedAngle(angle) {
  requireValue(Number.isFinite(angle), 'Missing footprint orientation.');
  return ((angle % 360) + 360) % 360;
}

function placement(value, allowEmpty) {
  requireValue(value && typeof value === 'object', 'Missing placement.');
  const point = allowEmpty && value.point === null ? null : checkedPoint(value.point);
  const design = value.design === undefined ? 'reference' : value.design;
  requireValue(designOptions.has(design), 'Unknown facility design.');
  return { point, angle: checkedAngle(value.angle), design };
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
  requireValue(value && value.version === 1, 'Choose a DataScope version 1 workshop file.');
  const scenarios = checkedList(
    value.scenarios,
    WORKSHOP_LIMITS.scenarios,
    'saved placements',
    readScenario
  );
  const notes = checkedList(value.notes, WORKSHOP_LIMITS.notes, 'community notes', readNote);
  const active = identifier(value.active);
  requireValue(
    standardChoices.has(active) || scenarios.some((item) => item.id === active),
    'Unknown active placement.'
  );
  const view = placement(value, active === 'none');
  requireValue(active !== 'none' || view.point === null, 'The no-build option must have no footprint.');
  return { version: 1, active, ...view, scenarios, notes };
}

export function initialWorkspace(center = site.center) {
  return {
    version: 1,
    active: 'proposal',
    point: checkedPoint(center),
    angle: 0,
    design: 'reference',
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
  return 'datascope:workshop:v1:' + basePath;
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
    // Callers keep temporary in-memory notes and display that persistent browser storage is unavailable.
    return false;
  }
}

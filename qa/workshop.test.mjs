import assert from 'node:assert/strict';
import test from 'node:test';
import {
  distanceMeters,
  initialWorkspace,
  isStudyPoint,
  loadWorkspace,
  measure,
  parseWorkshop,
  saveWorkspace,
  serializeWorkshop
} from '../dist/workshop.js';

const center = [42.2704, -83.18];
const alt = {
  id: 'variant-1',
  name: 'Across the street',
  point: [42.2721, -83.179],
  angle: 90,
  design: 'dry'
};
const entry = {
  id: 'comment-1',
  topic: 'School travel',
  text: 'Would the truck route cross the school walk?',
  lat: 42.275,
  lng: -83.181,
  scenario: 'custom',
  createdAt: '2026-11-18T12:00:00.000Z',
  placement: { point: alt.point, angle: 90, design: 'dry' }
};

test('distances are geodesic and each category uses the nearest mapped point', () => {
  assert.equal(distanceMeters(center, center), 0);
  const points = [
    { name: 'Near park', type: 'park', lat: center[0] + 0.001, lng: center[1] },
    { name: 'Far park', type: 'park', lat: center[0] + 0.011, lng: center[1] },
    { name: 'Library', type: 'library', lat: center[0], lng: center[1] }
  ];
  const { park, school, housing } = measure(center, points);
  assert.equal(park.name, 'Near park');
  assert.ok(Math.abs(park.meters - 111.2) < 0.1);
  assert.equal(school, null);
  assert.equal(housing, null);
  assert.deepEqual(measure(null, points), { school: null, park: null, housing: null });
});

test('imports preserve saved designs, note geometry and no-build selections', () => {
  const state = {
    ...initialWorkspace(center),
    active: 'none',
    point: null,
    scenarios: [alt],
    notes: [entry]
  };
  assert.deepEqual(parseWorkshop(serializeWorkshop(state)), state);
  assert.equal(parseWorkshop(JSON.stringify({ ...state, design: undefined })).design, 'reference');
});

test('invalid coordinates, duplicated records, or unknown models are rejected before import', () => {
  const valid = initialWorkspace(center);
  for (const change of [
    { point: [100, -83] },
    { notes: [entry, entry] },
    { active: 'someone-elses-choice' },
    { design: 'unavailable' },
    { point: null },
    { angle: null },
    { version: 0 }
  ])
    assert.throws(() => parseWorkshop(JSON.stringify({ ...valid, ...change })));
  assert.equal(isStudyPoint([42.26, NaN]), false);
});

test('concurrent independent additions are retained, explicit imports replace and failed writes are recoverable', () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value)
  };
  const local = loadWorkspace(center);
  assert.ok(saveWorkspace(local));
  const [key] = store.keys();
  const otherTab = { ...local, notes: [entry] };
  store.set(key, serializeWorkshop(otherTab));
  local.scenarios.push(alt);
  assert.ok(saveWorkspace(local));
  assert.equal(parseWorkshop(store.get(key)).notes[0].id, entry.id);
  assert.ok(saveWorkspace(initialWorkspace(center), { replace: true }));
  assert.equal(parseWorkshop(store.get(key)).notes.length, 0);
  globalThis.localStorage.setItem = () => {
    throw new Error('quota');
  };
  assert.equal(saveWorkspace(local), false);
  delete globalThis.localStorage;
});

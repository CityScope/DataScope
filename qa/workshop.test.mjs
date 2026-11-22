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

const center = [30.5704, -96.2624];
const alt = {
  id: 'variant-1',
  name: 'East setback with zigzag wall',
  point: [30.5701, -96.2611],
  angle: 180,
  integration: 'd3',
  cooling: 't2',
  energy: 'e2',
  benefits: ['b1', 'b3']
};
const entry = {
  id: 'comment-1',
  topic: 'Noise & low-frequency hum',
  text: 'Check 60–120 Hz tonal levels at The Langford property line.',
  lat: 30.5718,
  lng: -96.269,
  scenario: 'custom',
  createdAt: '2026-11-21T12:00:00.000Z',
  placement: {
    point: alt.point,
    angle: 180,
    integration: 'd3',
    cooling: 't2',
    energy: 'e2',
    benefits: ['b1', 'b3']
  }
};

test('distances are geodesic and each category uses the nearest mapped College Station point', () => {
  assert.equal(distanceMeters(center, center), 0);
  const points = [
    { name: 'Near park', type: 'park', lat: center[0] + 0.001, lng: center[1] },
    { name: 'Far park', type: 'park', lat: center[0] + 0.011, lng: center[1] },
    { name: 'Medical', type: 'medical', lat: center[0] + 0.002, lng: center[1] },
    { name: 'Library', type: 'library', lat: center[0], lng: center[1] }
  ];
  const { park, school, housing, medical } = measure(center, points);
  assert.equal(park.name, 'Near park');
  assert.ok(Math.abs(park.meters - 111.2) < 0.2);
  assert.equal(medical.name, 'Medical');
  assert.equal(school, null);
  assert.equal(housing, null);
  assert.deepEqual(measure(null, points), {
    school: null,
    park: null,
    housing: null,
    senior: null,
    medical: null
  });
});

test('imports preserve 4-pillar packages, note geometry and Midtown no-build selections', () => {
  const state = {
    ...initialWorkspace(center),
    active: 'none',
    point: null,
    scenarios: [alt],
    notes: [entry]
  };
  assert.deepEqual(parseWorkshop(serializeWorkshop(state)), state);
  assert.equal(parseWorkshop(JSON.stringify({ ...state, cooling: undefined })).cooling, 't1');
});

test('invalid coordinates, duplicated records, or unknown packages are rejected before import', () => {
  const valid = initialWorkspace(center);
  for (const change of [
    { point: [42.26, -83.2] },
    { notes: [entry, entry] },
    { active: 'someone-elses-choice' },
    { integration: 'd9' },
    { cooling: 't9' },
    { energy: 'e9' },
    { benefits: ['b9'] },
    { point: null },
    { angle: null },
    { version: 0 }
  ])
    assert.throws(() => parseWorkshop(JSON.stringify({ ...valid, ...change })));
  assert.equal(isStudyPoint([30.57, NaN]), false);
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

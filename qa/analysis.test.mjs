import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyzePlacement,
  equipmentSourcePoint,
  soundAtLocal,
  soundContourLocal
} from '../dist/studio/analysis.js';
import { places, river, site } from '../dist/geography.js';

const metersLatitude = 111320;
const metersLongitude = metersLatitude * Math.cos((site.center[0] * Math.PI) / 180);
function offset(p, east, north) {
  return [p[0] + north / metersLatitude, p[1] + east / metersLongitude];
}
function close(actual, expected, tolerance = 1e-6) {
  assert.ok(Math.abs(actual - expected) < tolerance, `Expected ${actual} near ${expected}`);
}
const initial = { point: site.center, angle: 0, design: 'reference' };

test('reference footprint, watercourse, utility run and receiver produce a stable baseline with zero deltas', () => {
  const r = analyzePlacement(initial);
  close(r.parcelCoveragePct, 100);
  close(r.riverSetbackM, 234.52, 0.1);
  assert.ok(r.soundDbA > 45 && r.soundDbA < 50, `Expected ~47.4 dBA at John Riel Park, got ${r.soundDbA}`);
  assert.ok(r.soundShieldingDb > 1.5, 'Main hall should acoustically shield the west yard from the park');
  assert.ok(r.utilityRunM > 30 && r.utilityRunM < 150, `Expected realistic utility run to Enterprise Dr, got ${r.utilityRunM}`);
  assert.equal(r.receptorName, 'John Riel Memorial Park');
  assert.equal(r.energyGWh, 182.2);
  assert.equal(r.waterMGal, 52.9);
  assert.equal(r.peakMW, 26);
  for (const v of Object.values(r.delta)) assert.equal(v, 0);
});

test('parcel clipping counts the real oriented footprint, including partial overlap across a long edge', () => {
  const a = site.boundary[1],
    b = site.boundary[2];
  const midpoint = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  for (const angle of [0, 33, 90, 225]) {
    close(analyzePlacement({ point: midpoint, angle }).parcelCoveragePct, 50, 0.001);
  }
  const partialPoint = offset(midpoint, 7, 0);
  const p = analyzePlacement({ point: partialPoint, angle: 0 });
  const q = analyzePlacement({ point: partialPoint, angle: 90 });
  assert(p.parcelCoveragePct > 0 && p.parcelCoveragePct < 50);
  assert(Math.abs(p.parcelCoveragePct - q.parcelCoveragePct) > 1);
  close(analyzePlacement({ point: offset(midpoint, 160, 0) }).parcelCoveragePct, 0);
});

test('river measurement detects a segment crossing even when its vertices lie outside the footprint', () => {
  const [a, b] = river.slice(8, 10);
  const p = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  for (const angle of [0, 31, 90]) assert.equal(analyzePlacement({ point: p, angle }).riverSetbackM, 0);
  const r = analyzePlacement({ ...initial, angle: 90 });
  assert(Math.abs(r.delta.riverSetbackM) > 5);
});

test('equipment source rotates with the building, building shields the west yard, and sound falls with distance', () => {
  const source = equipmentSourcePoint(site.center, 90);
  const expected = offset(site.center, 6.0, 17.35);
  close(source[0], expected[0], 1e-6);
  close(source[1], expected[1], 1e-6);

  // Sound falls monotonically with distance on the exposed west side.
  const near = soundAtLocal(-60, 6, 'reference');
  const mid = soundAtLocal(-120, 6, 'reference');
  const far = soundAtLocal(-240, 6, 'reference');
  assert.ok(near.total > mid.total + 5.5);
  assert.ok(mid.total > far.total + 5.5);

  // Rotating 180° turns the west mechanical yard toward John Riel Park, removing building shielding.
  const shielded = analyzePlacement({ point: site.center, angle: 0, design: 'reference' });
  const exposed = analyzePlacement({ point: site.center, angle: 180, design: 'reference' });
  assert.ok(exposed.soundDbA > shielded.soundDbA + 2.5);
  assert.equal(exposed.soundShieldingDb, 0);
  assert.ok(shielded.soundShieldingDb > 1.5);

  // Directional iso-dBA contours respond to both design and building acoustic shielding.
  const westRadius = (design) => Math.abs(Math.min(...soundContourLocal(design, 55).map((p) => p[0])));
  const eastRadius = (design) => Math.max(...soundContourLocal(design, 55).map((p) => p[0]));
  assert.ok(westRadius('dry') > westRadius('reference'));
  assert.ok(westRadius('reference') > westRadius('efficient'));
  assert.ok(westRadius('reference') > eastRadius('reference') + 20);

  const school = analyzePlacement(initial, { receptorId: 'melvindale' });
  assert.equal(school.receptorName, 'Melvindale High School');
  assert(school.soundDbA < shielded.soundDbA);
  assert.equal(school.delta.soundDbA, 0);

  const arno = analyzePlacement(initial, { receptorId: 'arno' });
  assert.equal(arno.receptorName, 'Arno Ave homes');
  assert(arno.soundDbA < shielded.soundDbA && arno.soundDbA > school.soundDbA);
});

test('cooling designs model realistic Zone 5A energy, peak MW, water, CO2 and acoustic tradeoffs', () => {
  const moved = analyzePlacement({ ...initial, point: offset(site.center, 100, 100) });
  assert(moved.delta.soundDbA !== 0);
  assert(moved.delta.utilityRunM !== 0);
  assert.equal(moved.delta.energyGWh, 0);
  assert.equal(moved.delta.waterMGal, 0);

  const ref = analyzePlacement(initial);
  const eff = analyzePlacement({ ...initial, design: 'efficient' });
  const dry = analyzePlacement({ ...initial, design: 'dry' });

  // Electricity, peak demand & carbon: efficient < reference < dry
  assert.ok(eff.energyGWh < ref.energyGWh && ref.energyGWh < dry.energyGWh);
  assert.ok(eff.peakMW < ref.peakMW && ref.peakMW < dry.peakMW);
  assert.ok(eff.co2KtYr < ref.co2KtYr && ref.co2KtYr < dry.co2KtYr);

  // Cooling water: dry < efficient < reference (all modeled, no nulls)
  assert.ok(dry.waterMGal > 0 && dry.waterMGal < eff.waterMGal && eff.waterMGal < ref.waterMGal);
  assert.ok(eff.delta.waterMGal < 0 && dry.delta.waterMGal < eff.delta.waterMGal);

  // Equipment sound: efficient < reference < dry across every community place
  for (const place of places) {
    const r = analyzePlacement(initial, { receptorId: place.id });
    const e = analyzePlacement({ ...initial, design: 'efficient' }, { receptorId: place.id });
    const d = analyzePlacement({ ...initial, design: 'dry' }, { receptorId: place.id });
    assert.ok(e.soundDbA < r.soundDbA - 2.5, `${place.id}: efficient should be quieter than reference`);
    assert.ok(d.soundDbA > r.soundDbA + 3.5, `${place.id}: dry cooling should be louder than reference`);
  }

  const none = analyzePlacement({ point: null });
  for (const k of ['soundDbA', 'riverSetbackM', 'parcelCoveragePct', 'utilityRunM', 'sourcePoint'])
    assert.equal(none[k], null);
  for (const k of ['energyGWh', 'waterMGal', 'peakMW', 'co2KtYr']) assert.equal(none[k], 0);
  assert.equal(none.delta.energyGWh, -182.2);
});

test('river clearance and utility tie-in do not extrapolate local geometry to off-table placements', () => {
  const result = analyzePlacement({ point: [42.21, -83.27], angle: 30 });
  assert.equal(result.riverOutOfCoverage, true);
  assert.equal(result.riverSetbackM, null);
  assert.equal(result.riverWitness, null);
  assert.equal(result.utilityRunM, null);
  assert.equal(result.delta.riverSetbackM, null);
});

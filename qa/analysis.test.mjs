import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzePlacement, equipmentSourcePoint } from '../dist/studio/analysis.js';
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

test('reference footprint, watercourse and receiver produce a stable baseline with zero deltas', () => {
  const r = analyzePlacement(initial);
  close(r.parcelCoveragePct, 100);
  close(r.riverSetbackM, 234.52, 0.1);
  close(r.soundDbA, 43.03, 0.02);
  assert.equal(r.receptorName, 'John Riel Memorial Park');
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

test('equipment source rotates with the building and the receiver follows point-source spreading', () => {
  const source = equipmentSourcePoint(site.center, 90);
  close(source[0], offset(site.center, 0, 20)[0]);
  close(source[1], site.center[1]);
  const park = places.find((p) => p.id === 'riel'),
    parkPoint = [park.lat, park.lng];
  // At angle zero the equipment yard is 20 m west of the building center.
  const level = (d) => analyzePlacement({ point: offset(parkPoint, d + 20, 0) });
  close(level(15).soundDbA, 65);
  close(level(15).soundDbA - level(30).soundDbA, 20 * Math.log10(2));
  assert(level(5).soundNearField);
  close(level(5).soundDbA, 65);
  const school = analyzePlacement(initial, { receptorId: 'melvindale' });
  assert.equal(school.receptorName, 'Melvindale High School');
  assert(school.soundDbA < analyzePlacement(initial).soundDbA);
  assert.equal(school.delta.soundDbA, 0);
});

test('resource use follows the facility design and does not change during placement', () => {
  const moved = analyzePlacement({ ...initial, point: offset(site.center, 100, 100) });
  assert(moved.delta.soundDbA !== 0);
  assert.equal(moved.delta.energyGWh, 0);
  assert.equal(moved.delta.waterMGal, 0);
  const dry = analyzePlacement({ ...initial, design: 'dry' });
  assert.equal(dry.energyGWh, 184);
  assert.equal(dry.waterMGal, 0.3);
  assert.equal(dry.peakMW, null);
  const efficient = analyzePlacement({ ...initial, design: 'efficient' });
  assert.equal(efficient.energyGWh, 151.8);
  assert.equal(efficient.waterMGal, null);
  assert.equal(efficient.peakMW, 21.7);
  assert.equal(efficient.delta.waterMGal, null);
  const none = analyzePlacement({ point: null });
  for (const k of ['soundDbA', 'riverSetbackM', 'parcelCoveragePct', 'sourcePoint'])
    assert.equal(none[k], null);
  for (const k of ['energyGWh', 'waterMGal', 'peakMW']) assert.equal(none[k], 0);
  assert.equal(none.delta.energyGWh, -182.2);
});


test('river clearance does not extrapolate a local reach to off-table placements', () => {
  const result = analyzePlacement({ point: [42.21, -83.27], angle: 30 });
  assert.equal(result.riverOutOfCoverage, true);
  assert.equal(result.riverSetbackM, null);
  assert.equal(result.riverWitness, null);
  assert.equal(result.delta.riverSetbackM, null);
});

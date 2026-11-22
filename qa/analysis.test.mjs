import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyzePlacement,
  equipmentSourcePoint,
  soundAtLocal,
  soundContourLocal,
  midtownAlternative,
  CSU_SIMSBORO_CAP_ACFT_YR
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
const initial = {
  point: site.center,
  angle: 0,
  integration: 'd1',
  cooling: 't1',
  energy: 'e1',
  benefits: []
};

test('College Station baseline produces 220 GWh/yr Zone 2A load, Simsboro cap share, and zero deltas', () => {
  const r = analyzePlacement(initial);
  close(r.parcelCoveragePct, 100);
  assert.ok(r.riverSetbackM > 350 && r.riverSetbackM < 600, `Expected Lick Creek setback ~450 m, got ${r.riverSetbackM}`);
  assert.ok(r.soundDbA > 35 && r.soundDbA < 46, `Expected screening dBA at The Langford, got ${r.soundDbA}`);
  assert.ok(r.utilityRunM > 50 && r.utilityRunM < 220, `Expected Lakeway Dr utility run, got ${r.utilityRunM}`);
  assert.equal(r.receptorName, 'The Langford Assisted Living');
  close(r.energyGWh, 220.1, 0.2);
  close(r.waterMGal, 68.5, 0.2);
  close(r.peakMW, 33.6, 0.2);
  assert.ok(r.simsboroPct > 0.85 && r.simsboroPct < 1.05, `Expected ~0.93% of ${CSU_SIMSBORO_CAP_ACFT_YR} ac-ft cap, got ${r.simsboroPct}`);
  for (const v of Object.values(r.delta)) assert.equal(v, 0);
});

test('parcel clipping counts the real oriented footprint across Midtown Business Park boundary', () => {
  const a = site.boundary[1],
    b = site.boundary[2];
  const midpoint = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  for (const angle of [0, 33, 90, 225]) {
    close(analyzePlacement({ point: midpoint, angle }).parcelCoveragePct, 50, 0.01);
  }
  const partialPoint = offset(midpoint, 7, 0);
  const p = analyzePlacement({ point: partialPoint, angle: 0 });
  const q = analyzePlacement({ point: partialPoint, angle: 90 });
  assert(p.parcelCoveragePct > 0 && p.parcelCoveragePct < 50);
  assert(Math.abs(p.parcelCoveragePct - q.parcelCoveragePct) > 1);
  close(analyzePlacement({ point: offset(midpoint, 220, 0) }).parcelCoveragePct, 0);
});

test('Lick Creek tributary measurement detects segment crossings even when vertices lie outside footprint', () => {
  const [a, b] = river.slice(3, 5);
  const p = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  for (const angle of [0, 31, 90]) assert.equal(analyzePlacement({ point: p, angle }).riverSetbackM, 0);
  const r = analyzePlacement({ ...initial, angle: 90 });
  assert(Math.abs(r.delta.riverSetbackM) > 5);
});

test('equipment source rotates, 180-degree rotation and D2/D3 integration shield The Langford, and contours respond', () => {
  const source = equipmentSourcePoint(site.center, 90);
  const expected = offset(site.center, 6.0, 17.35);
  close(source[0], expected[0], 1e-6);
  close(source[1], expected[1], 1e-6);

  // Sound falls monotonically with distance on the exposed west side.
  const near = soundAtLocal(-60, 6, 't1', 'd1');
  const mid = soundAtLocal(-120, 6, 't1', 'd1');
  const far = soundAtLocal(-240, 6, 't1', 'd1');
  assert.ok(near.total > mid.total + 5.5);
  assert.ok(mid.total > far.total + 5.5);

  // At 0 deg, west yard faces The Langford (west). Rotating 180 deg places the 10.6 m hall between yard & Langford.
  const exposed = analyzePlacement({ ...initial, angle: 0 }, { receptorId: 'langford' });
  const shielded = analyzePlacement({ ...initial, angle: 180 }, { receptorId: 'langford' });
  assert.equal(exposed.soundShieldingDb, 0);
  assert.ok(shielded.soundShieldingDb > 1.5);
  assert.ok(exposed.soundDbA > shielded.soundDbA + 2.0);

  // D2 berms and D3 zigzag acoustic walls further attenuate sound even at 0 deg!
  const d2 = analyzePlacement({ ...initial, integration: 'd2' }, { receptorId: 'langford' });
  const d3 = analyzePlacement({ ...initial, integration: 'd3' }, { receptorId: 'langford' });
  assert.ok(d2.soundDbA < exposed.soundDbA - 1.5);
  assert.ok(d3.soundDbA < d2.soundDbA - 1.5);
  assert.ok(d3.energyGWh > exposed.energyGWh, 'D3 zigzag baffle walls add fan static-pressure energy penalty');

  // Directional iso-dBA contours shrink with D3 zigzag walls and expand with T2 dry cooling.
  const westRadius = (c, i = 'd1') => Math.abs(Math.min(...soundContourLocal(c, 55, 72, i).map((p) => p[0])));
  assert.ok(westRadius('t2', 'd1') > westRadius('t1', 'd1'));
  assert.ok(westRadius('t1', 'd1') > westRadius('t3', 'd1'));
  assert.ok(westRadius('t1', 'd1') > westRadius('t1', 'd3') + 15);
});

test('all four pillars (D1-D4, T1-T4, E1-E4, B1-B4) and Midtown No-Build benchmark behave accurately', () => {
  const t1 = analyzePlacement(initial);
  const t2 = analyzePlacement({ ...initial, cooling: 't2' });
  const t3 = analyzePlacement({ ...initial, cooling: 't3' });
  const t4 = analyzePlacement({ ...initial, cooling: 't4', integration: 'd4' });

  // Water: T2 dry < T3 hybrid/reclaimed < T1 baseline evaporative
  assert.ok(t2.waterMGal < t3.waterMGal && t3.waterMGal < t1.waterMGal);
  assert.ok(t3.reclaimedMGal > 0 && t2.peakMW > t1.peakMW);
  assert.ok(t4.heatDeliveredGWh >= 35 && t4.permanentJobs > t1.permanentJobs + 40);

  // Energy: E2 solar, E3 wind, E4 microreactors reduce CO2 & net grid peak while tracking cost/land
  const e2 = analyzePlacement({ ...initial, energy: 'e2' });
  const e3 = analyzePlacement({ ...initial, energy: 'e3' });
  const e4 = analyzePlacement({ ...initial, energy: 'e4' });
  assert.ok(e2.co2KtYr < t1.co2KtYr * 0.2 && e2.offsiteSqMi === 1.5 && e2.capexDeltaM >= 250);
  assert.ok(e3.co2KtYr < t1.co2KtYr * 0.2 && e3.offsiteSqMi > 5);
  assert.ok(e4.netGridPeakMW < t1.netGridPeakMW * 0.2 && e4.co2KtYr < e2.co2KtYr);

  // Benefits: combinable B1-B4 allocate pool on top of taxes
  const pact = analyzePlacement({ ...initial, benefits: ['b1', 'b2', 'b3', 'b4'] });
  assert.equal(pact.upfrontPoolM, 10);
  assert.ok(pact.annualBenefitMYr > 2.0);
  assert.ok(pact.grantKYr > 0 && pact.householdsProtected > 100 && pact.trainingSlotsYr > 0);
  assert.ok(pact.localValueMYr > t1.localValueMYr + 2.0);

  // No-Build Midtown Alternative benchmark
  const none = analyzePlacement({ point: null });
  for (const k of ['soundDbA', 'riverSetbackM', 'parcelCoveragePct', 'utilityRunM', 'sourcePoint'])
    assert.equal(none[k], null);
  for (const k of ['energyGWh', 'waterMGal', 'peakMW', 'co2KtYr']) assert.equal(none[k], 0);
  assert.equal(none.permanentJobs, midtownAlternative.permanentJobs);
  assert.equal(none.taxMYr, midtownAlternative.taxMYr);
});

test('creek clearance and utility run do not extrapolate outside modeled Midtown bounds', () => {
  const result = analyzePlacement({ point: [30.62, -96.34], angle: 30 });
  assert.equal(result.riverOutOfCoverage, true);
  assert.equal(result.riverSetbackM, null);
  assert.equal(result.riverWitness, null);
  assert.equal(result.utilityRunM, null);
});

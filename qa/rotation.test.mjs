import test from 'node:test';
import assert from 'node:assert/strict';
import { dragBearing, normalizeBearing } from '../dist/studio/rotation.js';
import { analyzePlacement } from '../dist/studio/analysis.js';
import { site } from '../dist/geography.js';

test('rotation follows clockwise scene bearings and crosses north without a jump', () => {
  assert.equal(dragBearing(0, [0, -56], [56, 0]), 90);
  assert.equal(dragBearing(0, [0, -56], [-56, 0]), 270);
  assert.equal(dragBearing(350, [0, -56], [Math.sin(Math.PI / 9) * 56, -Math.cos(Math.PI / 9) * 56]), 10);
  assert.equal(dragBearing(10, [0, -56], [-Math.sin(Math.PI / 9) * 56, -Math.cos(Math.PI / 9) * 56]), 350);
});

test('rotation honors its starting orientation, optional snapping, and center dead zone', () => {
  assert.equal(dragBearing(35, [56, 0], [0, 56]), 125);
  assert.equal(dragBearing(35, [56, 0], [0, 56], 15), 120);
  assert.equal(dragBearing(35, [56, 0], [0, 0]), 35);
  assert.equal(normalizeBearing(-5), 355);
  assert.equal(normalizeBearing(365), 5);
});

test('turning a fixed facility changes sound shielding, creek clearance and Midtown utility run without changing design resources', () => {
  const first = analyzePlacement({ point: site.center, angle: 0, cooling: 't1', integration: 'd1' });
  const quarter = analyzePlacement({ point: site.center, angle: 90, cooling: 't1', integration: 'd1' });
  const flipped = analyzePlacement({ point: site.center, angle: 180, cooling: 't1', integration: 'd1' });
  assert.ok(first.soundDbA > flipped.soundDbA + 2.0, 'Turning 180 deg places data hall between west yard and The Langford');
  assert.notEqual(quarter.riverSetbackM, first.riverSetbackM);
  assert.notEqual(quarter.utilityRunM, first.utilityRunM);
  for (const turned of [quarter, flipped]) {
    assert.equal(turned.energyGWh, first.energyGWh);
    assert.equal(turned.waterMGal, first.waterMGal);
    assert.equal(turned.peakMW, first.peakMW);
  }
});

test('cooling packages update electricity, Simsboro water, peak MW, CO2 and sound while keeping footprint fit intact', () => {
  const baseline = analyzePlacement({ point: site.center, angle: 35, cooling: 't1' });
  const dry = analyzePlacement({ point: site.center, angle: 35, cooling: 't2' });
  const hybrid = analyzePlacement({ point: site.center, angle: 35, cooling: 't3' });

  assert.ok(hybrid.soundDbA < baseline.soundDbA);
  assert.ok(dry.soundDbA > baseline.soundDbA);
  assert.ok(hybrid.energyGWh < baseline.energyGWh && dry.energyGWh > baseline.energyGWh);
  assert.ok(dry.waterMGal < hybrid.waterMGal && hybrid.waterMGal < baseline.waterMGal);
  for (const result of [hybrid, dry]) {
    for (const key of ['riverSetbackM', 'parcelCoveragePct', 'utilityRunM']) {
      assert.equal(result[key], baseline[key]);
    }
  }
});

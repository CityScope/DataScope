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
test('turning a fixed facility changes sound shielding, river clearance and utility run without changing design resources', () => {
  const first = analyzePlacement({ point: site.center, angle: 0, design: 'reference' });
  const quarter = analyzePlacement({ point: site.center, angle: 90, design: 'reference' });
  const flipped = analyzePlacement({ point: site.center, angle: 180, design: 'reference' });
  assert.ok(flipped.soundDbA > first.soundDbA + 2.5);
  assert.notEqual(quarter.riverSetbackM, first.riverSetbackM);
  assert.notEqual(quarter.utilityRunM, first.utilityRunM);
  for (const turned of [quarter, flipped]) {
    assert.equal(turned.energyGWh, first.energyGWh);
    assert.equal(turned.waterMGal, first.waterMGal);
    assert.equal(turned.peakMW, first.peakMW);
  }
});
test('cooling design alternatives update electricity, water, peak MW, CO2 and equipment sound while keeping footprint fit intact', () => {
  const reference = analyzePlacement({ point: site.center, angle: 35, design: 'reference' });
  const efficient = analyzePlacement({ point: site.center, angle: 35, design: 'efficient' });
  const dry = analyzePlacement({ point: site.center, angle: 35, design: 'dry' });

  assert.ok(efficient.soundDbA < reference.soundDbA);
  assert.ok(dry.soundDbA > reference.soundDbA);
  assert.ok(efficient.energyGWh < reference.energyGWh && dry.energyGWh > reference.energyGWh);
  assert.ok(dry.waterMGal < efficient.waterMGal && efficient.waterMGal < reference.waterMGal);
  for (const result of [efficient, dry]) {
    for (const key of ['riverSetbackM', 'parcelCoveragePct', 'utilityRunM']) {
      assert.equal(result[key], reference[key]);
    }
  }
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { site } from '../dist/geography.js';
import { evaluateConstraints, constraintShapes } from '../dist/studio/constraints.js';
import { analyzePlacement } from '../dist/studio/analysis.js';

function check(point, angle = 0) {
  return evaluateConstraints({ point, angle });
}
const creekPoint = [30.57541, -96.26385];
const sh6Point = [30.5678, -96.2686];
const parkPoint = [30.5653, -96.2581];
const langfordPoint = [30.5719, -96.269];
const lakewayPoint = [30.57085, -96.26497];

test('clear, no-build and out-of-model footprints have distinct results', () => {
  assert.equal(check(site.center).status, 'clear');
  assert.deepEqual(check(null), { status: 'none', items: [], footprint: [], overlaps: [] });
  assert.equal(check([30.65, -96.35]).status, 'review');
  assert.deepEqual(
    check([30.65, -96.35]).items.map((item) => item.id),
    ['extent']
  );
});

test('Lick Creek overlap includes only the measured part of the oriented footprint', () => {
  const a = check(creekPoint, 27);
  assert.equal(a.status, 'conflict');
  assert.ok(a.items.some((i) => i.id === 'river'));
  assert.ok(a.overlaps.length > 0);
  const length = Math.hypot(a.footprint[0][0] - a.footprint[3][0], a.footprint[0][1] - a.footprint[3][1]);
  const width = Math.hypot(a.footprint[0][0] - a.footprint[1][0], a.footprint[0][1] - a.footprint[1][1]);
  assert.ok(Math.abs(length - 90) < 0.0001);
  assert.ok(Math.abs(width - 46.45152) < 0.0001);
  for (const piece of a.overlaps) {
    for (const p of piece.clipped) {
      a.footprint.forEach((start, i) => {
        const end = a.footprint[(i + 1) % 4];
        const cross = (end[0] - start[0]) * (p[1] - start[1]) - (end[1] - start[1]) * (p[0] - start[0]);
        assert.ok(cross >= -1e-6);
      });
    }
  }
});

test('SH 6, Lakeway Drive, Woodland Hills Park and The Langford trigger distinct conflict vs review tiers', () => {
  assert.equal(check(sh6Point).status, 'conflict');
  assert.ok(check(sh6Point).items.some((i) => i.id === 'freeway' && i.severity === 'conflict'));

  assert.equal(check(lakewayPoint).status, 'conflict');
  assert.ok(check(lakewayPoint).items.some((i) => i.id === 'enterprise' && i.severity === 'conflict'));

  const park = check(parkPoint);
  assert.ok(park.items.some((i) => i.id === 'park' && i.severity === 'review'));

  const senior = check(langfordPoint);
  assert.ok(senior.items.some((i) => i.id === 'senior' && i.severity === 'review'));
});

test('creek ruler endpoints coincide with the selected oriented footprint, mapped reach, and displayed clearance', () => {
  const segmentDistance = ([x, z], a, b) => {
    const dx = b[0] - a[0],
      dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
  };
  for (const [point, angle] of [
    [site.center, 0],
    [site.center, 45],
    [creekPoint, 90]
  ]) {
    const { riverWitness: w, riverSetbackM } = analyzePlacement({ point, angle });
    const { footprint } = check(point, angle);
    const wall = Math.min(
      ...footprint.map((p, i) => segmentDistance(w.footprint, p, footprint[(i + 1) % 4]))
    );
    const reach = Math.min(
      ...constraintShapes.river.slice(1).map((p, i) => segmentDistance(w.river, constraintShapes.river[i], p))
    );
    assert.ok(wall < 1e-6 && reach < 1e-6);
    assert.ok(
      Math.abs(Math.hypot(w.footprint[0] - w.river[0], w.footprint[1] - w.river[1]) - riverSetbackM) < 1e-8
    );
  }
  assert.equal(analyzePlacement({ point: null }).riverWitness, null);
});

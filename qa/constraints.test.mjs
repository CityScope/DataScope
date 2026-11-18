import assert from 'node:assert/strict';
import test from 'node:test';
import { site } from '../dist/geography.js';
import { evaluateConstraints, constraintShapes } from '../dist/studio/constraints.js';
import { analyzePlacement } from '../dist/studio/analysis.js';

function check(point, angle = 0) {
  return evaluateConstraints({ point, angle });
}
const rail = [42.269787, -83.208061];
const edge = [42.26939191879267, -83.20806071702422];

test('clear, no-build and out-of-model footprints have distinct results', () => {
  assert.equal(check(site.center).status, 'clear');
  assert.deepEqual(check(null), { status: 'none', items: [], footprint: [], overlaps: [] });
  assert.equal(check([42.4, -83.4]).status, 'review');
  assert.deepEqual(
    check([42.4, -83.4]).items.map((item) => item.id),
    ['extent']
  );
});

test('rail impact includes only the measured part of the oriented building footprint', () => {
  const a = check(rail, 27);
  assert.equal(a.status, 'conflict');
  assert.deepEqual(
    a.items.map((item) => item.id),
    ['rail']
  );
  assert.ok(a.overlaps.length > 0);
  const length = Math.hypot(a.footprint[0][0] - a.footprint[3][0], a.footprint[0][1] - a.footprint[3][1]);
  const width = Math.hypot(a.footprint[0][0] - a.footprint[1][0], a.footprint[0][1] - a.footprint[1][1]);
  assert.ok(Math.abs(length - 90) < 0.0001);
  assert.ok(Math.abs(width - 46.45152) < 0.0001);
  for (const piece of a.overlaps) {
    assert.equal(piece.id, 'rail');
    for (const p of piece.clipped) {
      a.footprint.forEach((start, i) => {
        const end = a.footprint[(i + 1) % 4];
        const cross = (end[0] - start[0]) * (p[1] - start[1]) - (end[1] - start[1]) * (p[0] - start[0]);
        assert.ok(cross >= -1e-6);
      });
    }
  }
});

test('a rotation can clear a rail intersection with the center of the building stationary', () => {
  assert.ok(check(edge).items.some((i) => i.id === 'rail'));
  assert.equal(check(edge, 90).status, 'clear');
  assert.equal(check(edge, 360).status, 'conflict');
});

test('simultaneous river and freeway crossings are separately identified', () => {
  const a = check([42.2714, -83.2104]);
  assert.deepEqual(
    a.items.map((i) => i.id),
    ['river', 'freeway']
  );
  assert.ok(a.items.every((i) => i.severity === 'conflict'));
  assert.ok(a.overlaps.some((piece) => piece.id === 'river'));
  assert.ok(a.overlaps.some((piece) => piece.id === 'freeway'));
});

test('generalized public sites trigger review while paved roadway intersections trigger conflicts', () => {
  assert.deepEqual(
    check([42.268531, -83.205321]).items.map((i) => [i.id, i.severity]),
    [['park', 'review']]
  );
  assert.deepEqual(
    check([42.274437, -83.203469]).items.map((i) => [i.id, i.severity]),
    [['school', 'review']]
  );
  assert.deepEqual(
    check([42.267242, -83.210344]).items.map((i) => [i.id, i.severity]),
    [['enterprise', 'conflict']]
  );
  const senior = check([42.269519, -83.198445]);
  assert.equal(senior.items.at(0).severity, 'conflict');
  assert.ok(senior.items.some((i) => i.id === 'senior' && i.severity === 'review'));
});

test('river ruler endpoints coincide with the selected oriented footprint, mapped reach, and displayed clearance', () => {
  const segmentDistance = ([x, z], a, b) => {
    const dx = b[0] - a[0],
      dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
  };
  for (const [point, angle] of [
    [site.center, 0],
    [edge, 33],
    [[42.2714, -83.2104], 90]
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

import test from 'node:test';
import assert from 'node:assert/strict';
import {dragBearing, normalizeBearing} from '../dist/studio/rotation.js';
import {analyzePlacement} from '../dist/studio/analysis.js';
import {site} from '../dist/geography.js';

test('rotation follows clockwise scene bearings and crosses north without a jump',()=>{
  assert.equal(dragBearing(0,[0,-56],[56,0]),90);
  assert.equal(dragBearing(0,[0,-56],[-56,0]),270);
  assert.equal(dragBearing(350,[0,-56],[Math.sin(Math.PI/9)*56,-Math.cos(Math.PI/9)*56]),10);
  assert.equal(dragBearing(10,[0,-56],[-Math.sin(Math.PI/9)*56,-Math.cos(Math.PI/9)*56]),350);
});
test('rotation honors its starting orientation, optional snapping, and center dead zone',()=>{
  assert.equal(dragBearing(35,[56,0],[0,56]),125);
  assert.equal(dragBearing(35,[56,0],[0,56],15),120);
  assert.equal(dragBearing(35,[56,0],[0,0]),35);
  assert.equal(normalizeBearing(-5),355);
  assert.equal(normalizeBearing(365),5);
});
test('turning a fixed facility changes spatial analysis without changing design resources',()=>{
  const first=analyzePlacement({point:site.center,angle:0,design:'dry'});
  const turned=analyzePlacement({point:site.center,angle:90,design:'dry'});
  assert.notEqual(turned.soundDbA,first.soundDbA);
  assert.notEqual(turned.riverSetbackM,first.riverSetbackM);
  assert.equal(turned.energyGWh,first.energyGWh);
  assert.equal(turned.waterMGal,first.waterMGal);
});
test('design alternatives update resource totals without inventing a sound or footprint difference',()=>{
  const reference=analyzePlacement({point:site.center,angle:35,design:'reference'});
  for(const design of ['efficient','dry']) {
    const result=analyzePlacement({point:site.center,angle:35,design});
    assert.notEqual(result.energyGWh,reference.energyGWh);
    for(const key of ['soundDbA','riverSetbackM','parcelCoveragePct']) assert.equal(result[key],reference[key]);
  }
  assert.equal(analyzePlacement({point:site.center,design:'efficient'}).waterMGal,null);
});

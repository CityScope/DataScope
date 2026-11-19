import assert from 'node:assert/strict';
import test from 'node:test';
import { site } from '../dist/geography.js';
import { environmentalFeatures, environmentalSources, normalizeEnvironmental, arcgisPolygons } from '../dist/environment.js';
import { evaluateConstraints, nearbyConstraints } from '../dist/studio/constraints.js';
const mx=111320*Math.cos(site.center[0]*Math.PI/180);
const ring=(x,z,w,h)=>[[x-w,z-h],[x+w,z-h],[x+w,z+h],[x-w,z+h],[x-w,z-h]].map(([x,z])=>[site.center[1]+x/mx,site.center[0]-z/111320]);
const collection=coordinates=>({features:[{properties:{OBJECTID:7,WETLAND_TYPE:'Test wetland'},geometry:{type:'MultiPolygon',coordinates}}]});

test('environment source normalization excludes far-away multipart components and preserves holes',()=>{
  const result=normalizeEnvironmental(environmentalSources[0],collection([[ring(0,0,150,150),ring(0,0,60,70)],[ring(100000,100000,100,100)]]));
  assert.equal(result.length,1);assert.equal(result[0].pieces.length,1);assert.equal(result[0].pieces[0].holes.length,1);
});
test('environmental intersection tests respect holes and rotated footprint edges',()=>{
  const features=normalizeEnvironmental(environmentalSources[0],collection([[ring(0,0,150,150),ring(0,0,30,50)]]));
  environmentalFeatures.push(...features);
  try {
    assert(!evaluateConstraints({point:site.center}).items.some(i=>i.id==='wetlands:7'));
    assert(evaluateConstraints({point:site.center,angle:90}).items.some(i=>i.id==='wetlands:7'));
    assert(evaluateConstraints({point:[site.center[0],site.center[1]+70/mx]}).items.some(i=>i.id==='wetlands:7'));
  }finally{environmentalFeatures.splice(0);}
});
test('proximity reports footprint clearance, reaches zero at an overlap and omits off-model points',()=>{
  assert(nearbyConstraints({point:site.center}).find(i=>i.id==='rail').distance>0);
  assert.equal(nearbyConstraints({point:[42.269787,-83.208061]}).find(i=>i.id==='rail').distance,0);
  assert.deepEqual(nearbyConstraints({point:[42.4,-83.4]}),[]);
});

test('FEMA callback polygon transport preserves clockwise exteriors and counterclockwise holes',()=>{
  const converted=arcgisPolygons({features:[{attributes:{OBJECTID:11,FLD_ZONE:'AE',SFHA_TF:'T'},geometry:{rings:[ring(0,0,150,150),ring(0,0,60,70).reverse(),ring(400,0,30,30)]}}]});
  const result=normalizeEnvironmental(environmentalSources[2],converted);
  assert.equal(result.length,1);assert.equal(result[0].pieces.length,2);assert.equal(result[0].pieces[0].holes.length,1);
  assert.equal(result[0].label,'1% annual-chance flood area');
});

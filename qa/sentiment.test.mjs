import test from 'node:test';
import assert from 'node:assert/strict';
import {densityField, densityPixels} from '../dist/sentiment-field.js';
import {discussions, zones} from '../dist/sentiment-data.js';

const sample=(x,y,stance='supportive')=>({x,y,stance});
const field=(points)=>densityField(points,200,120,{cellSize:1,bandwidth:8});
const at=(result,x,y)=>y*result.columns+x;
const pixel=(result,x,y)=>Array.from(densityPixels(result).slice(at(result,x,y)*4,at(result,x,y)*4+4));

test('nearby individual remarks accumulate into stronger heat',()=>{
  const single=field([sample(60.5,60.5)]);
  const pair=field([sample(60.5,60.5),sample(63.5,60.5)]);
  assert.ok(pair.fields[0][at(pair,60,60)]>single.fields[0][at(single,60,60)]*1.8);
  assert.ok(pixel(pair,60,60)[3]>pixel(single,60,60)[3]);
});
test('separate remark coordinates retain distinct peaks and empty space between',()=>{
  const result=field([sample(40.5,60.5),sample(160.5,60.5)]);
  assert.equal(result.fields[0][at(result,40,60)],1);
  assert.equal(result.fields[0][at(result,160,60)],1);
  assert.deepEqual(pixel(result,100,60),[0,0,0,0]);
});
test('viewpoint color is a continuous local mixture, while filtering retains absolute density',()=>{
  const all=field([sample(60.5,60.5),sample(60.5,60.5,'concerned')]);
  const supportive=field([sample(60.5,60.5)]);
  const conditional=field([sample(60.5,60.5,'conditional')]);
  assert.deepEqual(pixel(all,60,60).slice(0,3),[98,102,82]);
  assert.deepEqual(pixel(supportive,60,60).slice(0,3),[7,121,104]);
  assert.deepEqual(pixel(conditional,60,60).slice(0,3),[204,156,50]);
  assert.ok(pixel(supportive,60,60)[3]<pixel(all,60,60)[3]);
});
test('distant clusters never renormalize local heat intensity',()=>{
  const one=field([sample(40.5,60.5)]);
  const distant=field([sample(40.5,60.5),...Array.from({length:40},()=>sample(160.5,60.5,'concerned'))]);
  assert.deepEqual(pixel(one,40,60),pixel(distant,40,60));
});
test('nearby offscreen remarks contribute at the edge; empty/invalid data stays transparent',()=>{
  const edge=field([sample(-4,60.5)]);
  assert.ok(pixel(edge,0,60)[3]>0);
  assert.ok(densityPixels(field([])).every(v=>v===0));
  assert.ok(densityPixels(field([sample(NaN,10),sample(10,Infinity),sample(10,10,'unknown')])).every(v=>v===0));
});
test('sample remarks have distinct pins near their associated places and preserve fictional provenance',()=>{
  assert.equal(discussions.length,140);
  assert.equal(new Set(discussions.map(r=>r.id)).size,140);
  assert.equal(new Set(discussions.map(r=>r.coords.join(','))).size,140);
  for(const zone of zones) {
    const rows=discussions.filter(r=>r.zoneId===zone.id);
    assert.equal(rows.length,28);
    for(const row of rows) {
      assert.equal(row.synthetic,true);
      assert.ok(row.coords.every(Number.isFinite));
      assert.notDeepEqual(row.coords,zone.center);
      assert.ok(Math.abs(row.coords[0]-zone.center[0])<.003);
      assert.ok(Math.abs(row.coords[1]-zone.center[1])<.004);
    }
  }
});

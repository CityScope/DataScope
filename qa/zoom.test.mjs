import test from 'node:test';
import assert from 'node:assert/strict';
import { smoothZoom } from '../dist/smooth-zoom.js';

class Point {
  constructor(x,y) { this.x=x; this.y=y; }
  subtract(p) { return new Point(this.x-p.x,this.y-p.y); }
  divideBy(n) { return new Point(this.x/n,this.y/n); }
}
class Events {
  listeners = new Map();
  addEventListener(name,fn) { this.listeners.set(name,fn); }
  removeEventListener(name) { this.listeners.delete(name); }
  emit(name,event) { this.listeners.get(name)?.(event); }
}
function fixture() {
  let time=0, next=0, reduced=false;
  const frames=new Map(), element=new Events(), events=new Map();
  globalThis.window=new Events();
  globalThis.matchMedia=()=>({matches:reduced});
  Object.defineProperty(globalThis,'performance',{value:{now:()=>time}, configurable:true});
  globalThis.requestAnimationFrame=fn=>{frames.set(++next,fn);return next;};
  globalThis.cancelAnimationFrame=id=>frames.delete(id);
  const map={
    _loaded:true, zoom:15, center:new Point(2,3), samples:[], ends:0,
    getContainer:()=>element, getSize:()=>new Point(800,600), getZoom(){return this.zoom;},
    getMinZoom:()=>12,getMaxZoom:()=>19,
    project:(p,z)=>new Point(p.x*2**z,p.y*2**z),unproject:(p,z)=>new Point(p.x/2**z,p.y/2**z),
    containerPointToLatLng(p){const c=this.project(this.center,this.zoom);return this.unproject(new Point(c.x+p.x-400,c.y+p.y-300),this.zoom);},
    mouseEventToContainerPoint:e=>new Point(e.clientX,e.clientY),
    _stop(){},_moveStart(){this.fire('movestart');this.fire('zoomstart');},
    _move(center,zoom){this.center=center;this.zoom=zoom;this.samples.push({center,zoom});},
    _moveEnd(){this.ends++;},fire(name){events.get(name)?.();},
    on(names,fn){names.split(' ').forEach(n=>events.set(n,fn));},
    once(name,fn){events.set(name,fn);},off(names){names.split(' ').forEach(n=>events.delete(n));},
    setZoomAround(p,z){this.zoom=z;}
  };
  const controller=smoothZoom(map);
  function advance(count=1){for(let i=0;i<count;i++){time+=16;const current=[...frames.values()];frames.clear();current.forEach(fn=>fn(time));}}
  function settle(){for(let i=0;i<150&&frames.size;i++)advance();assert.equal(frames.size,0,'animation settles without a perpetual loop');}
  return {map,element,controller,advance,settle,reduce:()=>{reduced=true;},frames};
}
test('zoom buttons interpolate, retain repeated clicks, and return to their starting scale',()=>{
  const f=fixture();
  f.controller.step(1);f.controller.step(1);f.controller.step(1);
  assert.equal(f.map.zoom,15,'button does not jump instantly');
  f.advance();assert.ok(f.map.zoom>15&&f.map.zoom<15.1);
  f.settle();assert.equal(f.map.zoom,16.5);assert.ok(f.map.samples.length>15);
  for(let i=1;i<f.map.samples.length;i++)assert.ok(Math.abs(f.map.samples[i].zoom-f.map.samples[i-1].zoom)<=.065);
  f.controller.step(-1);f.controller.step(-1);f.controller.step(-1);f.settle();
  assert.equal(f.map.zoom,15);assert.equal(f.map.ends,2);f.controller.destroy();
});
test('wheel zoom preserves the geographic point under the cursor and stops on drag',()=>{
  const f=fixture(), at=new Point(180,240), anchor=f.map.containerPointToLatLng(at);
  f.element.emit('wheel',{deltaY:-240,deltaX:0,deltaMode:0,clientX:at.x,clientY:at.y,target:{},preventDefault(){},stopPropagation(){}});
  f.advance(8);
  const current=f.map.containerPointToLatLng(at);
  assert.ok(Math.abs(current.x-anchor.x)<1e-9&&Math.abs(current.y-anchor.y)<1e-9);
  const displayed=f.map.zoom;
  f.element.emit('pointerdown',{});f.advance(80);
  assert.equal(f.map.zoom,displayed,'drag does not inherit unfinished zoom travel');
  assert.equal(f.frames.size,0);f.controller.destroy();
});
test('zoom clamps to map bounds and honors reduced motion',()=>{
  const f=fixture();f.map.zoom=18.9;f.controller.step(1);f.settle();assert.equal(f.map.zoom,19);
  f.map.zoom=12.1;f.controller.step(-1);f.settle();assert.equal(f.map.zoom,12);
  f.reduce();f.controller.step(1);assert.equal(f.map.zoom,12.5);assert.equal(f.frames.size,0);
  f.controller.destroy();assert.equal(f.element.listeners.size,0);
});
test('plan zoom buttons keep the visible facility anchored on screen',()=>{
  const f=fixture(), point=new Point(280,420), facility=f.map.containerPointToLatLng(point);
  f.controller.step(1,point);f.controller.step(1,point);f.settle();
  const here=f.map.containerPointToLatLng(point);
  assert.ok(Math.abs(here.x-facility.x)<1e-9&&Math.abs(here.y-facility.y)<1e-9);
  assert.equal(f.map.zoom,16);f.controller.destroy();
});

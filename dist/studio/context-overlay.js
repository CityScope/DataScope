import * as THREE from 'three';
import { constraintFeatures, constraintCategories } from './constraints.js';
import { environmentalFeatures, environmentalVersion } from '../environment.js';

// Ground ink has a fixed paint order and never writes depth. It shares the
// district's crop planes; no overlapping coplanar solid surfaces are introduced.
export function createContextOverlay(planes) {
  const group=new THREE.Group();group.name='District land uses and environmental review';
  const land=new THREE.Group(),environment=new THREE.Group();group.add(land,environment);
  let revision=-1;
  function clear(parent){parent.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});parent.clear();}
  function feature(parent,f,color,order){
    const fill=[],edges=[];
    for(const {poly,holes=[]} of f.pieces){
      const vertices=[...poly,...holes.flat()];
      const faces=THREE.ShapeUtils.triangulateShape(poly.map(p=>new THREE.Vector2(...p)),holes.map(r=>r.map(p=>new THREE.Vector2(...p))));
      for(const face of faces)for(const i of face){const [x,z]=vertices[i];fill.push(x,1.05,z);}
      for(const ring of [poly,...holes]) for(let i=0;i<ring.length;i++){
        const a=ring[i],b=ring[(i+1)%ring.length];edges.push(a[0],1.07,a[1],b[0],1.07,b[1]);
      }
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(fill,3));
    const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.24,depthWrite:false,depthTest:true,side:THREE.DoubleSide,toneMapped:false,clippingPlanes:planes}));
    mesh.renderOrder=order;parent.add(mesh);
    const outline=new THREE.BufferGeometry();outline.setAttribute('position',new THREE.Float32BufferAttribute(edges,3));
    const line=new THREE.LineSegments(outline,new THREE.LineBasicMaterial({color,transparent:true,opacity:0.74,depthWrite:false,clippingPlanes:planes,toneMapped:false}));
    line.renderOrder=order+1;parent.add(line);
  }
  for(const f of constraintFeatures)feature(land,f,constraintCategories[f.id].color,8);
  function update(layers,district){
    if(revision!==environmentalVersion()){
      revision=environmentalVersion();clear(environment);
      for(const f of environmentalFeatures)feature(environment,f,f.color,12);
    }
    group.visible=district;land.visible=layers?.constraints!==false;environment.visible=layers?.environment!==false;
  }
  return {group,update,dispose(){clear(land);clear(environment);group.removeFromParent();}};
}

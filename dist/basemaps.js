import { smoothZoom } from './smooth-zoom.js';
// Tiles and vector data load directly from their providers with attribution.
const imagery = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
let enginePromise, stylePromise;
function script(path) {
  return new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=new URL(path,import.meta.url);el.onload=resolve;el.onerror=reject;document.head.append(el);});
}
function vectorEngine() {
  return enginePromise ??= (async()=>{
    const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./vendor/maplibre/maplibre-gl.css',import.meta.url);document.head.append(css);
    await script('./vendor/maplibre/maplibre-gl.js');
    await script('./vendor/maplibre/leaflet-maplibre-gl.js');
  })();
}
async function lightStyle() {
  stylePromise ??= fetch('https://tiles.openfreemap.org/styles/positron',{signal:AbortSignal.timeout(15000)}).then(r=>{if(!r.ok)throw new Error('Basemap unavailable');return r.json();});
  const style=structuredClone(await stylePromise);
  // Locally drawn glyphs use the same Helvetica family as the interface.
  delete style.glyphs;
  for(const layer of style.layers) {
    if(layer.type==='symbol'&&layer.layout?.['text-field']) layer.layout['text-font']=['Helvetica','Arial','sans-serif'];
    if(layer.type==='background') layer.paint['background-color']='#edf1ee';
    if(layer.type==='fill'&&/park|grass|wood/i.test(layer.id)) layer.paint['fill-color']='#dce8de';
    if(layer.type==='fill'&&/^water$|waterway/i.test(layer.id)) layer.paint['fill-color']='#c5dce3';
  }
  return style;
}
export function createBasemap(map, initial='map') {
  const L=window.L, element=map.getContainer();
  smoothZoom(map);
  map.attributionControl?.setPrefix(false);
  const status=document.createElement('div');status.className='basemap-status';status.setAttribute('role','status');status.hidden=true;element.append(status);
  let layer,selected,destroyed=false,generation=0,loadTimer;
  const remove=()=>{clearTimeout(loadTimer);if(layer){map.removeLayer(layer);layer=null;}};
  function raster(name) {
    layer=L.tileLayer(name==='satellite'?imagery:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
      attribution:name==='satellite'?'Imagery © Esri, Vantor, Earthstar Geographics, GIS User Community':'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxNativeZoom:19,maxZoom:20,keepBuffer:2,noWrap:true
    });
    let loaded=0,failed=0;
    layer.on('tileload',()=>{loaded++;status.hidden=true;});
    layer.on('tileerror',()=>{if(!loaded&&++failed>1){status.hidden=false;status.textContent='Map unavailable. Try the other basemap.';}});
    layer.addTo(map);
  }
  async function setBase(name) {
    if(!['map','satellite'].includes(name)||name===selected)return;
    selected=name;const request=++generation;remove();status.hidden=true;element.dataset.base=name;
    if(name==='satellite'){raster(name);return;}
    status.textContent='Loading light map…';status.hidden=false;
    try {
      const [,style]=await Promise.all([vectorEngine(),lightStyle()]);
      if(destroyed||selected!==name||request!==generation)return;
      layer=L.maplibreGL({style,interactive:false,pane:'tilePane',padding:0.15,updateInterval:16,
        attributionControl:{customAttribution:'© <a href="https://openmaptiles.org/">OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://openfreemap.org/">OpenFreeMap</a>'}
      }).addTo(map);
      layer.getMaplibreMap().once('load',()=>{if(request===generation){clearTimeout(loadTimer);status.hidden=true;}});
      loadTimer=setTimeout(()=>{if(destroyed||request!==generation)return;remove();raster('map');},20000);
    } catch {
      if(destroyed||selected!==name||request!==generation)return;
      remove();raster('map');status.textContent='Light map unavailable · street map fallback';status.hidden=false;
    }
  }
  void setBase(initial);
  return {setBase,destroy(){destroyed=true;remove();status.remove();}};
}
// No wheel snapping: the shared controller animates every displayed zoom level.
export const mapInteraction={zoomSnap:0,zoomDelta:0.5,scrollWheelZoom:false,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false};
export function stepZoom(map,direction,anchor){smoothZoom(map).step(direction,anchor);}

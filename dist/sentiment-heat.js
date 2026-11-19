import { densityField, densityPixels, HEAT_BANDWIDTH_METERS } from './sentiment-field.js';
// Illustrative remark density, not an estimate of the population's opinion.
export function createSentimentHeat(map) {
  const L=window.L, pane=map.createPane('sentimentHeat');
  pane.style.zIndex=410; pane.style.pointerEvents='none';
  const canvas=L.DomUtil.create('canvas','sentiment-heat',pane);
  canvas.setAttribute('aria-hidden','true');
  const buffer=document.createElement('canvas');
  let rows=[],enabled=true,frame=0,origin,drawnZoom;
  function transform() {
    if(!origin || canvas.hidden)return;
    L.DomUtil.setTransform(canvas,map.latLngToLayerPoint(origin),map.getZoomScale(map.getZoom(),drawnZoom));
  }
  function draw() {
    frame=0; canvas.hidden=!enabled||!rows.length;
    if(canvas.hidden||!map._loaded)return;
    const {x:width,y:height}=map.getSize();
    if(!width||!height)return;
    const metresPerPixel=40075016.686*Math.cos(map.getCenter().lat*Math.PI/180)/map.options.crs.scale(map.getZoom());
    const samples=rows.map(row=>({...map.latLngToContainerPoint(row.coords),stance:row.stance}));
    const field=densityField(samples,width,height,{cellSize:3,bandwidth:HEAT_BANDWIDTH_METERS/metresPerPixel});
    buffer.width=field.columns;buffer.height=field.rows;
    const context=buffer.getContext('2d'),pixels=context.createImageData(field.columns,field.rows);
    pixels.data.set(densityPixels(field));context.putImageData(pixels,0,0);
    const ratio=Math.min(devicePixelRatio||1,2);
    canvas.width=width*ratio;canvas.height=height*ratio;
    canvas.style.width=width+'px';canvas.style.height=height+'px';
    origin=map.containerPointToLatLng([0,0]);drawnZoom=map.getZoom();transform();
    const output=canvas.getContext('2d');output.scale(ratio,ratio);output.imageSmoothingEnabled=true;
    output.drawImage(buffer,0,0,field.columns*field.cellSize,field.rows*field.cellSize);
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(draw);}
  map.on('move zoom',transform);
  map.on('moveend zoomend resize',schedule);
  return {
    update(next,on=true){rows=next;enabled=on;if(!on)canvas.hidden=true;schedule();},
    redraw:schedule,
    destroy(){cancelAnimationFrame(frame);map.off('move zoom',transform);map.off('moveend zoomend resize',schedule);canvas.remove();pane.remove();}
  };
}

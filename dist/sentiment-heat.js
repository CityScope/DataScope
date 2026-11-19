// Visual density of fictional discussions, never an estimate of resident opinion.
// Three kernels identify the locally leading viewpoint. The rings retain the full mix.
const palette = { supportive: [7, 121, 104], conditional: [204, 156, 50], concerned: [189, 82, 59] };
export function createSentimentHeat(map) {
  const L = window.L;
  const pane = map.createPane('sentimentHeat');
  pane.style.zIndex = 410;
  pane.style.pointerEvents = 'none';
  const canvas = L.DomUtil.create('canvas', 'sentiment-heat', pane);
  canvas.setAttribute('aria-hidden', 'true');
  const buffer = document.createElement('canvas');
  let rows = [], enabled = true, frame = 0, origin, drawnZoom;
  function transform() {
    if (!origin || canvas.hidden) return;
    L.DomUtil.setTransform(canvas, map.latLngToLayerPoint(origin), map.getZoomScale(map.getZoom(), drawnZoom));
  }
  function draw() {
    frame = 0;
    canvas.hidden = !enabled || !rows.length;
    if (canvas.hidden) return;
    const { x: width, y: height } = map.getSize();
    if (!width || !height) return;
    const step = 4, w = Math.ceil(width / step), h = Math.ceil(height / step);
    const fields = [new Float32Array(w*h),new Float32Array(w*h),new Float32Array(w*h)];
    const keys = Object.keys(palette);
    const center = map.getCenter();
    const metresPerPixel = 40075016.686 * Math.cos(center.lat * Math.PI / 180) / map.options.crs.scale(map.getZoom());
    const radius = Math.max(8, Math.min(60, 150 / metresPerPixel / step));
    for (const row of rows) {
      const point = map.latLngToContainerPoint(row.coords);
      const x = point.x/step, y = point.y/step;
      const field = fields[keys.indexOf(row.stance)];
      if (!field) continue;
      for (let py = Math.max(0,Math.floor(y-radius)); py < Math.min(h,Math.ceil(y+radius)); py++)
        for (let px = Math.max(0,Math.floor(x-radius)); px < Math.min(w,Math.ceil(x+radius)); px++) {
          const d = ((px-x)**2+(py-y)**2)/(radius*radius);
          if (d < 1) field[py*w+px] += Math.exp(-d*4.5)*(1-d);
        }
    }
    buffer.width=w; buffer.height=h;
    const ctx=buffer.getContext('2d'), pixels=ctx.createImageData(w,h);
    let max=0;
    for(let i=0;i<w*h;i++) max=Math.max(max,fields[0][i]+fields[1][i]+fields[2][i]);
    for(let i=0;i<w*h;i++) {
      const total=fields[0][i]+fields[1][i]+fields[2][i];
      if(total<0.02) continue;
      const dominant = fields[1][i] > fields[0][i] ? 1 : 0;
      const strongest = fields[2][i] > fields[dominant][i] ? 2 : dominant;
      for(let c=0;c<3;c++) pixels.data[i*4+c]=palette[keys[strongest]][c];
      pixels.data[i*4+3]=Math.round(210*Math.pow(total/max,0.55));
    }
    ctx.putImageData(pixels,0,0);
    const ratio=Math.min(devicePixelRatio||1,2);
    canvas.width=width*ratio;canvas.height=height*ratio;
    canvas.style.width=width+'px';canvas.style.height=height+'px';
    origin = map.containerPointToLatLng([0,0]); drawnZoom = map.getZoom();
    transform();
    const output=canvas.getContext('2d');output.scale(ratio,ratio);output.imageSmoothingEnabled=true;output.drawImage(buffer,0,0,width,height);
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(draw);}
  map.on('move zoom', transform);
  map.on('moveend zoomend resize',schedule);
  return {
    update(next,on=true){rows=next;enabled=on;schedule();},
    redraw:schedule,
    destroy(){cancelAnimationFrame(frame);map.off('move zoom',transform);map.off('moveend zoomend resize',schedule);canvas.remove();pane.remove();}
  };
}

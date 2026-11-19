// Density is built from mapped opening remarks, never from place centroids.
// A fixed spatial bandwidth and absolute intensity keep filtering comparable.
export const stanceColors = { supportive:'#077968', conditional:'#cc9c32', concerned:'#bd523b' };
export const stanceKeys = Object.keys(stanceColors);
const rgb = [[7,121,104],[204,156,50],[189,82,59]];
export const HEAT_BANDWIDTH_METERS = 16;
const tail = Math.exp(-4.5);
export function densityField(samples, width, height, {cellSize=3, bandwidth=24}={}) {
  const columns=Math.ceil(width/cellSize), rows=Math.ceil(height/cellSize);
  const fields=stanceKeys.map(()=>new Float32Array(columns*rows));
  const sigma=Math.max(.5,bandwidth/cellSize), support=3*sigma;
  for(const sample of samples) {
    const index=stanceKeys.indexOf(sample.stance);
    if(index<0 || !Number.isFinite(sample.x) || !Number.isFinite(sample.y))continue;
    const x=sample.x/cellSize-.5, y=sample.y/cellSize-.5;
    const minX=Math.max(0,Math.ceil(x-support)), maxX=Math.min(columns-1,Math.floor(x+support));
    const minY=Math.max(0,Math.ceil(y-support)), maxY=Math.min(rows-1,Math.floor(y+support));
    for(let py=minY;py<=maxY;py++)for(let px=minX;px<=maxX;px++) {
      const d=((px-x)**2+(py-y)**2)/(sigma*sigma);
      if(d<9)fields[index][py*columns+px]+=(Math.exp(-d/2)-tail)/(1-tail);
    }
  }
  return {fields,columns,rows,cellSize};
}
export function densityPixels({fields,columns,rows}) {
  const pixels=new Uint8ClampedArray(columns*rows*4);
  for(let i=0;i<columns*rows;i++) {
    const total=fields[0][i]+fields[1][i]+fields[2][i];
    if(total<.005)continue;
    // Continuous weighted colors show a local mix, avoiding hard radial wedges.
    for(let c=0;c<3;c++)pixels[4*i+c]=Math.round((fields[0][i]*rgb[0][c]+fields[1][i]*rgb[1][c]+fields[2][i]*rgb[2][c])/total);
    // No viewport maximum: adding a distant point cannot change local strength.
    pixels[4*i+3]=Math.round(210*(1-Math.exp(-total/1.6)));
  }
  return pixels;
}

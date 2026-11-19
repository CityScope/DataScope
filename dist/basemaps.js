// Tiles remain on their providers' servers. Only the currently viewed map is requested.
const sources = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagery © <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a>, Vantor, Earthstar Geographics, GIS User Community',
    maxNativeZoom: 19
  },
  map: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    maxNativeZoom: 19
  }
};
export function createBasemap(map, initial = 'satellite') {
  const L = window.L;
  map.attributionControl?.setPrefix(false);
  const element = map.getContainer();
  const status = document.createElement('div');
  status.className = 'basemap-status';
  status.setAttribute('role', 'status');
  status.hidden = true;
  element.append(status);
  let layer, selected, loaded = 0, failed = 0;
  function setBase(name) {
    if (!sources[name] || name === selected) return;
    if (layer) map.removeLayer(layer);
    selected = name;
    loaded = failed = 0;
    status.hidden = true;
    element.dataset.base = name;
    layer = L.tileLayer(sources[name].url, {
      attribution: sources[name].attribution,
      maxNativeZoom: sources[name].maxNativeZoom,
      maxZoom: 20, keepBuffer: 2, noWrap: true
    });
    layer.on('tileload', () => { loaded++; status.hidden = true; });
    layer.on('tileerror', () => { failed++; if (!loaded && failed > 1) {status.hidden = false; status.textContent = 'Map tiles unavailable. Try the other basemap.';} });
    layer.addTo(map);
  }
  setBase(initial);
  return { setBase, destroy() { if (layer) map.removeLayer(layer); status.remove(); } };
}

import { createBasemap, mapInteraction, stepZoom } from './basemaps.js';
import { environmentalFeatures, environmentalVersion } from './environment.js';
import { evaluateConstraints, constraintFeatures, constraintCategories } from './studio/constraints.js';
import { equipmentSourcePoint } from './studio/analysis.js';
// The movable outline is an illustrative, single-storey 45,000 ft² rectangle.
// Distances here are local tangent-plane distances for drawing, not a land survey.
import { site, places, river } from './geography.js';
import { isStudyPoint } from './workshop.js';

const L = window.L;
const METERS_LAT = 111320;
const roofLength = 90;
const roofWidth = (45000 * 0.09290304) / roofLength;

function offset(origin, east, north) {
  return [
    origin[0] + north / METERS_LAT,
    origin[1] + east / (METERS_LAT * Math.cos((origin[0] * Math.PI) / 180))
  ];
}

function roofPoint(origin, angle, x, y) {
  const r = (angle * Math.PI) / 180;
  return offset(origin, x * Math.cos(r) + y * Math.sin(r), -x * Math.sin(r) + y * Math.cos(r));
}

function makeNode(className, text, tag = 'span') {
  const el = document.createElement(tag);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

const iconPaths = {
  school: 'M2 7l8-4 8 4-8 4-8-4zM5 9v4c3 3 7 3 10 0V9m3-2v6',
  park: 'M10 2l-4 6h2l-4 5h5v4h2v-4h5l-4-5h2l-4-6z',
  housing: 'M2 9l8-6 8 6m-2-1v9H4V8m4 9v-6h4v6',
  note: 'M4 3h12a1 1 0 011 1v9a1 1 0 01-1 1H9l-5 4v-4H3V4a1 1 0 011-1z',
  move: 'M10 2v16M2 10h16M7 5l3-3 3 3M7 15l3 3 3-3M5 7l-3 3 3 3m10-6l3 3-3 3'
};
function symbol(type) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 20 20');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', iconPaths[type] || iconPaths.note);
  svg.append(path);
  return svg;
}
function icon(className, node, size, anchor) {
  return L.divIcon({ className, html: node, iconSize: size, iconAnchor: anchor });
}

function makePane(map, name, zIndex) {
  const pane = map.createPane(name);
  pane.style.zIndex = zIndex;
  pane.style.pointerEvents = 'none';
  return pane;
}

function labelMarker(map, coords, text, className, anchor = [0, 0]) {
  return L.marker(coords, { pane: 'scopeLabels', interactive: false, keyboard: false,
    icon: icon('scope-map-label ' + className, makeNode('scope-text-label', text), [1, 1], anchor)
  }).addTo(map);
}

function sourcePopup(title, description, url) {
  const body = makeNode('scope-popup', undefined, 'div');
  body.append(makeNode('', title, 'strong'));
  if (description) body.append(makeNode('', description, 'p'));
  if (typeof url === 'string' && /^https?:\/\//.test(url)) {
    const a = makeNode('', 'Source record', 'a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    body.append(a);
  }
  return body;
}

export function createMap(element, { onPlace, onNote, onMarker, onPreview, onMoveEnd, onZoomChange } = {}) {
  element.classList.add('scope-map');
  const map = L.map(element, {
    center: site.center,
    zoom: 16,
    minZoom: 11,
    maxZoom: 20,
    zoomControl: false,
    attributionControl: true,
    ...mapInteraction,
    preferCanvas: false
  });
  map.attributionControl.setPrefix(false);
  makePane(map, 'scopeSketch', 180);
  makePane(map, 'scopeLand', 370);
  makePane(map, 'scopeEnvironment', 375);
  makePane(map, 'scopeContext', 385);
  makePane(map, 'scopeParcel', 400);
  makePane(map, 'scopeRoof', 435);
  makePane(map, 'scopeLabels', 446);
  makePane(map, 'scopePlaces', 485);
  makePane(map, 'scopeNotes', 490);
  const dragPane = makePane(map, 'scopeDrag', 500);
  dragPane.style.pointerEvents = '';

  const basemap = createBasemap(map, 'satellite');
  const scale = L.control
    .scale({ position: 'bottomleft', maxWidth: 80, metric: false, imperial: true })
    .addTo(map);
  scale.getContainer().setAttribute('aria-label', 'Map scale');

  let state = { point: null, angle: 0, mode: 'explore', notes: [], layers: {} };
  let dragging = false;
  let panMoved = false;
  const placeMarkers = [];
  function positionLabels() {
    const w = map.getSize().x;
    for (const marker of placeMarkers) {
      const x = map.latLngToContainerPoint(marker.getLatLng()).x;
      const room = w < 640 ? 112 : 150;
      marker.getElement()?.classList.toggle('label-left', x + room > w && x > room);
    }
  }
  const panned = () => {
    positionLabels();
    element.classList.toggle('wide-area', map.getZoom() < 14);
    const c = map.getCenter();
    onMoveEnd?.([c.lat, c.lng], map.getZoom());
  };
  map.on('moveend', panned);
  const landGroup = L.layerGroup(), environmentGroup = L.layerGroup();
  const contextPaths = new Map();
  let environmentDrawn = -1;
  const toGeo = ring => ring.map(([x,z])=>offset(site.center,x,-z));
  function contextFeature(f, group, environmental=false) {
    const category=constraintCategories[f.id], color=f.color || category.color;
    const paths=[];
    for(const piece of f.pieces) {
      const path=L.polygon([toGeo(piece.poly),...(piece.holes||[]).map(toGeo)], {
        pane:environmental?'scopeEnvironment':'scopeLand', color, weight:environmental?1.3:1,
        opacity:0.8,fillColor:color,fillOpacity:environmental?0.19:0.13,
        className:'screening-area '+(environmental?'environment-'+f.layer:'land-'+category.group),
        bubblingMouseEvents:false
      }).addTo(group);
      path.bindTooltip(f.label || category.label,{sticky:true,className:'constraint-tooltip'});
      path.on('click',e=>{
        if(pickAt([e.latlng.lat,e.latlng.lng]))return;
        L.popup({className:'scope-leaflet-popup'}).setLatLng(e.latlng)
          .setContent(sourcePopup(f.label || category.label,f.detail,f.source || site.source)).openOn(map);
      });
      paths.push({path,color,environmental});
    }
    contextPaths.set(f.id,paths);
  }
  for(const feature of constraintFeatures) contextFeature(feature,landGroup);
  function environmentalContext(){
    if(environmentDrawn===environmentalVersion())return;
    environmentDrawn=environmentalVersion();environmentGroup.clearLayers();
    for(const key of [...contextPaths.keys()])if(key.includes(':'))contextPaths.delete(key);
    for(const feature of environmentalFeatures)contextFeature(feature,environmentGroup,true);
  }
  const placesGroup = L.layerGroup();
  const waterGroup = L.layerGroup();
  const parcelGroup = L.layerGroup();
  const notesGroup = L.layerGroup();
  const seenNotes = new Map();
  const roofGroup = L.layerGroup();
  const impactGroup = L.layerGroup().addTo(roofGroup);
  const quiet = { interactive: false, pane: 'scopeRoof' };
  const roofHalo = L.polygon([], {
    ...quiet,
    fill: false,
    color: '#59e0d3',
    weight: 7,
    opacity: 0.2
  }).addTo(roofGroup);
  const roofShape = L.polygon([], {
    ...quiet,
    color: '#a1fff0',
    weight: 2,
    fillColor: '#399f99',
    fillOpacity: 0.77
  });
  const roofStripes = L.polyline([], { ...quiet, color: '#b7fff1', weight: 1, opacity: 0.78 });
  function setHandleSize(point, angle) {
    const pxPerM =
      map.options.crs.scale(map.getZoom()) / (40075016.686 * Math.cos((point[0] * Math.PI) / 180));
    const r = (angle * Math.PI) / 180;
    const halfHeight =
      ((Math.abs(roofLength * Math.cos(r)) + Math.abs(roofWidth * Math.sin(r))) * pxPerM) / 2;
    node.style.setProperty('--plan-width', 48 * pxPerM + 'px');
    node.style.setProperty('--plan-height', 92 * pxPerM + 'px');
    node.style.setProperty('--roof-width', Math.max(34, roofWidth * pxPerM) + 'px');
    node.style.setProperty('--roof-length', Math.max(36, roofLength * pxPerM) + 'px');
    node.style.setProperty('--roof-angle', angle + 'deg');
    node.style.setProperty('--label-gap', Math.max(10, halfHeight - 10) + 'px');
  }
  function drawFootprint(point, angle) {
    setHandleSize(point, angle);
    const p = (x, y) => roofPoint(point, angle, x, y);
    const w = roofWidth / 2,
      h = roofLength / 2;
    const ring = [p(-w, -h), p(-w, h), p(w, h), p(w, -h)];
    roofHalo.setLatLngs(ring);
    roofShape.setLatLngs(ring);
    impactGroup.clearLayers();
    const screening = evaluateConstraints({ point, angle });
    const active=new Set(screening.items.map(i=>i.id));
    for(const [id,paths] of contextPaths)for(const {path,color,environmental} of paths)path.setStyle({
      color:active.has(id)?'#c54e3c':color,weight:active.has(id)?2.5:environmental?1.3:1,
      fillOpacity:active.has(id)?0.34:environmental?0.19:0.13
    });
    const conflicts=screening.items.filter(i=>i.id!=='extent');
    node.dataset.status=conflicts.length?screening.status:'clear';
    node.querySelector('.scope-footprint-label').textContent=conflicts.length?'⚠ '+conflicts[0].title:'Data center';
    const color =
      state.layers?.constraints !== false && screening.items.length
        ? screening.status === 'conflict'
          ? '#ec533e'
          : '#e5a832'
        : '#59e0d3';
    roofHalo.setStyle({ color, weight: screening.items.length ? 6 : 3, opacity:screening.items.length ? 0.95 : 0.55 });
    roofShape.setStyle({ color });
    if (state.layers?.constraints !== false) {
      for (const part of screening.overlaps) {
        const polygon = part.clipped.map(([x, z]) => offset(site.center, x, -z));
        L.polygon([polygon,...(part.clippedHoles||[]).map(toGeo)], { ...quiet, color, weight: 1, fillOpacity: 0.65 }).addTo(impactGroup);
      }
    }
    if (state.layers?.sound !== false) {
      const source = equipmentSourcePoint(point, angle);
      for (const radius of [150, 47.43]) {
        L.circle(source, {
          radius,
          color: '#a662ac',
          weight: 2,
          dashArray: '5 3',
          fillOpacity: 0.09,
          pane: 'scopeContext',
          interactive: false
        }).addTo(impactGroup);
      }
    }
    const stripes = [];
    for (let y = -h + 8; y < h; y += 12)
      stripes.push([p(-w + 4, y), p(-w + 4, y + 3), p(w - 4, y + 3), p(w - 4, y), p(-w + 4, y)]);
    roofStripes.setLatLngs(stripes);
  }

  const node = makeNode('scope-drag-handle');
  const sprite = document.createElement('img');
  sprite.className = 'plan-building';
  sprite.alt = 'Overhead data center design';
  sprite.draggable = false;
  node.append(sprite, symbol('move'), makeNode('scope-footprint-label', 'Data center'));
  const handle = L.marker(site.center, {
    pane: 'scopeDrag',
    draggable: true,
    autoPan: true,
    title: 'Move the data center footprint',
    alt: 'Move the data center footprint',
    icon: icon('scope-handle', node, [40, 40], [20, 20]),
    riseOnHover: true,
    zIndexOffset: 500
  });
  function pickAt(point) {
    if (state.mode === 'note') {
      onNote?.(point);
      return true;
    }
    if (state.mode === 'place') {
      onPlace?.(point);
      return true;
    }
    return false;
  }
  map.on('click', (e) => {
    if (!dragging && !panMoved) pickAt([e.latlng.lat, e.latlng.lng]);
  });
  handle.on('click', (e) => {
    L.DomEvent.stopPropagation(e);
    if (!panMoved) pickAt([e.latlng.lat, e.latlng.lng]);
  });
  map.on('zoomend', () => onZoomChange?.({canIn:map.getZoom()<map.getMaxZoom(),canOut:map.getZoom()>map.getMinZoom()}));
  map.on('zoom', () => {
    if (state.point) setHandleSize(dragging ? dragCoords() : state.point, state.angle || 0);
  });
  let pending = 0;
  function dragCoords() {
    const p = handle.getLatLng();
    return [p.lat, p.lng];
  }
  handle.on('dragstart', () => {
    dragging = true;
    panMoved = true;
    element.classList.add('moving-footprint');
    map.closePopup();
  });
  handle.on('drag', () => {
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      if (!dragging) return;
      const ll = dragCoords();
      drawFootprint(ll, state.angle);
      onPreview?.(ll);
    });
  });
  handle.on('dragend', () => {
    dragging = false;
    element.classList.remove('moving-footprint');
    if (pending) {
      cancelAnimationFrame(pending);
      pending = 0;
    }
    const ll = dragCoords();
    if (!isStudyPoint(ll) && state.point) {
      handle.setLatLng(state.point);
      drawFootprint(state.point, state.angle);
      onPreview?.(state.point);
    } else {
      drawFootprint(ll, state.angle);
    }
    onPlace?.(ll);
    setTimeout(() => {
      panMoved = false;
    }, 0);
  });

  if (site.boundary?.length >= 3) {
    L.polygon(site.boundary, {
      pane: 'scopeParcel',
      interactive: false,
      color: '#e6bc75',
      weight: 1.8,
      dashArray: '6 5',
      fillColor: '#d9ac54',
      fillOpacity: 0.115
    }).addTo(parcelGroup);
  } else {
    L.circleMarker(site.center, {
      pane: 'scopeParcel',
      interactive: false,
      radius: 10,
      color: '#e9c38a',
      weight: 1.5,
      fill: false,
      dashArray: '3 4'
    }).addTo(parcelGroup);
  }
  if (river?.length >= 2) {
    const nearby = [...river].sort(
      (a, b) => map.distance(a, site.center) - map.distance(b, site.center)
    )[0];
    const riverLabel = labelMarker(map, nearby, 'Ecorse River', 'water-label');
    riverLabel.remove();
    waterGroup.addLayer(riverLabel);
    L.polyline(river, {
      pane: 'scopeContext',
      interactive: false,
      color: '#6cb5c8',
      weight: 2.4,
      opacity: 0.87,
      lineJoin: 'round'
    }).addTo(waterGroup);
  }
  places.forEach((place) => {
    const node = makeNode('scope-place-content ' + place.type);
    const badge = makeNode('scope-place-badge');
    badge.append(symbol(place.type));
    node.append(badge, makeNode('scope-place-title', place.name));
    const marker = L.marker([place.lat, place.lng], {
      pane: 'scopePlaces',
      title: place.name,
      alt: place.name,
      icon: icon('scope-place-marker', node, [22, 22], [11, 11])
    }).addTo(placesGroup);
    placeMarkers.push(marker);
    marker.on('click', () => {
      if (pickAt([place.lat, place.lng])) return;
      L.popup({ className: 'scope-leaflet-popup', offset: [0, -7] })
        .setLatLng([place.lat, place.lng])
        .setContent(sourcePopup(place.name, 'Community reference point', place.source))
        .openOn(map);
    });
  });

  function noteMarkers(notes, selected) {
    const ids = new Set();
    notes.forEach((n) => {
      if (!Number.isFinite(n.lat) || !Number.isFinite(n.lng)) return;
      ids.add(n.id);
      let marker = seenNotes.get(n.id);
      if (!marker) {
        const b = makeNode('scope-note-badge');
        b.append(symbol('note'));
        marker = L.marker([n.lat, n.lng], {
          pane: 'scopeNotes',
          alt: 'Open community note',
          title: 'Open community note',
          icon: icon('scope-note-marker', b, [28, 28], [14, 14])
        });
        marker.on('click', () => {
          const point = marker.getLatLng();
          if (!pickAt([point.lat, point.lng])) onMarker?.(n.id, 'note');
        });
        notesGroup.addLayer(marker);
        seenNotes.set(n.id, marker);
      }
      marker.setLatLng([n.lat, n.lng]);
      marker.setZIndexOffset(n.id === selected ? 10 : 0);
      marker.getElement()?.classList.toggle('selected', n.id === selected);
    });
    for (const [id, marker] of seenNotes) {
      if (!ids.has(id)) {
        notesGroup.removeLayer(marker);
        seenNotes.delete(id);
      }
    }
  }
  function visible(layer, on) {
    if (on && !map.hasLayer(layer)) layer.addTo(map);
    if (!on && map.hasLayer(layer)) layer.removeFrom(map);
  }
  function render(next) {
    if (next.mode !== state.mode) {
      map.closePopup();
      panMoved = false;
    }
    state = next;
    element.dataset.mode = state.mode;
    const layers = state.layers || {};
    environmentalContext();
    visible(landGroup, layers.constraints !== false);
    visible(environmentGroup, layers.environment !== false);
    const image = './assets/plan-' + (state.design || 'reference') + '.webp';
    if (sprite.getAttribute('src') !== image) sprite.src = image;
    visible(parcelGroup, layers.site !== false);
    visible(waterGroup, layers.river !== false);
    visible(placesGroup, layers.places !== false);
    positionLabels();
    visible(notesGroup, layers.notes !== false);
    noteMarkers(state.notes || [], state.selectedNote);
    visible(roofGroup, Boolean(state.point));
    if(!state.point) for(const paths of contextPaths.values())for(const {path,color,environmental} of paths)path.setStyle({color,weight:environmental?1.3:1,fillOpacity:environmental?0.19:0.13});
    visible(handle, Boolean(state.point));
    if (state.point && !dragging) {
      drawFootprint(state.point, state.angle || 0);
      handle.setLatLng(state.point);
      if (state.mode === 'note') handle.dragging.disable();
      else handle.dragging.enable();
    }
  }
  function home() {
    map.fitBounds(L.latLngBounds([...site.boundary, ...places.map(p => [p.lat, p.lng]), ...(state.point ? [state.point] : [])]), {
      paddingTopLeft: [65, 75], paddingBottomRight: [75, 145], maxZoom: 16.75, animate: false
    });
  }
  function focus(coords, zoom) {
    map.setView(coords, zoom ?? map.getZoom(), { animate: false });
  }
  function setBase(name) {
    basemap.setBase(name);
  }
  function resize() {
    map.invalidateSize({ pan: false });
    positionLabels();
  }
  setBase('satellite');
  home();
  const ro = new ResizeObserver(resize);
  ro.observe(element);
  return {
    render,
    focus,
    home,
    zoomBy: (d) => stepZoom(map, d),
    setBase,
    resize,
    destroy() {
      ro.disconnect();
      cancelAnimationFrame(pending);
      basemap.destroy();
      map.remove();
    }
  };
}

import { evaluateConstraints } from './studio/constraints.js';
import { equipmentSourcePoint } from './studio/analysis.js';
// The movable outline is an illustrative, single-storey 45,000 ft² rectangle.
// Distances here are local tangent-plane distances for drawing, not a land survey.
import { site, places, river } from './geography.js';
import { isStudyPoint } from './workshop.js';

const L = window.L;
const METERS_LAT = 111320;
const TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const PUBLIC_PLAN =
  'https://www.cityofallenpark.org/government/agenda_and_minutes/planning_commission.php';
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

// A small original orientation diagram interpreted from Fig. 1 of the city's
// January 2026 site review. It appears underneath live imagery if tiles fail.
// Figure axes are north-up and are aligned to the generalised parcel envelope.
// Only the handful of roads and railways visible in the planning figure are drawn.
function addOrientation(map) {
  if (!site.boundary || site.boundary.length < 3) return;
  const bb = L.latLngBounds(site.boundary);
  const at = ([x, y]) => [
    bb.getNorth() + ((228 - y) / 249) * (bb.getNorth() - bb.getSouth()),
    bb.getWest() + ((x - 248) / 277) * (bb.getEast() - bb.getWest())
  ];
  const opts = { interactive: false, pane: 'scopeSketch', smoothFactor: 1.2 };
  labelMarker(map, at([190, 518]), 'Enterprise Dr', 'road-label enterprise-label');
  labelMarker(map, at([198, 280]), 'I-94', 'interstate-label');
  labelMarker(map, at([558, 510]), 'O’Connor Ave', 'road-label neighborhood-label');
  function line(coords, style) {
    return L.polyline(coords.map(at), { ...opts, ...style }).addTo(map);
  }
  const major = [
    [-85, 452],
    [41, 379],
    [177, 299],
    [301, 207],
    [430, 90],
    [533, -36]
  ];
  line(major, { color: '#34454a', weight: 12 });
  line(major, { color: '#718078', weight: 1.2 });
  const roads = [
    [
      [110, 673],
      [185, 540],
      [245, 435],
      [296, 341],
      [330, 292]
    ],
    [
      [311, 670],
      [373, 551],
      [425, 457],
      [484, 361],
      [540, 267]
    ],
    [
      [393, 665],
      [448, 567],
      [513, 459],
      [570, 361],
      [624, 266]
    ],
    [
      [491, 660],
      [537, 575],
      [602, 467],
      [668, 352]
    ],
    [
      [373, 551],
      [610, 689]
    ],
    [
      [392, 515],
      [645, 669]
    ],
    [
      [418, 472],
      [661, 627]
    ],
    [
      [445, 427],
      [697, 581]
    ],
    [
      [472, 383],
      [713, 536]
    ],
    [
      [498, 339],
      [742, 490]
    ],
    [
      [524, 295],
      [767, 446]
    ]
  ];
  roads.forEach((coords) => line(coords, { color: '#536164', weight: 2.5 }));
  for (const coords of [
    [
      [-30, 423],
      [183, 348],
      [400, 267],
      [595, 200],
      [764, 132]
    ],
    [
      [267, 673],
      [391, 463],
      [486, 306],
      [560, 189],
      [624, 77],
      [674, -20]
    ]
  ]) {
    line(coords, { color: '#47585c', weight: 3 });
    line(coords, { color: '#88938d', weight: 1, dashArray: '3 7' });
  }
}

function labelMarker(map, coords, text, className, anchor = [0, 0]) {
  const label = makeNode('scope-text-label', text);
  return L.marker(coords, {
    pane: 'scopeLabels',
    interactive: false,
    keyboard: false,
    icon: icon('scope-map-label ' + className, label, [1, 1], anchor)
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

export function createMap(element, { onPlace, onNote, onMarker, onPreview, onMoveEnd } = {}) {
  element.classList.add('scope-map');
  const map = L.map(element, {
    center: site.center,
    zoom: 16,
    minZoom: 11,
    maxZoom: 20,
    zoomControl: false,
    attributionControl: true,
    zoomSnap: 0.25,
    zoomDelta: 0.75,
    wheelPxPerZoomLevel: 105,
    preferCanvas: false
  });
  map.attributionControl.setPrefix(false);
  makePane(map, 'scopeSketch', 180);
  makePane(map, 'scopeContext', 385);
  makePane(map, 'scopeParcel', 400);
  makePane(map, 'scopeRoof', 435);
  makePane(map, 'scopeLabels', 446);
  makePane(map, 'scopePlaces', 485);
  makePane(map, 'scopeNotes', 490);
  const dragPane = makePane(map, 'scopeDrag', 500);
  dragPane.style.pointerEvents = '';
  addOrientation(map);

  const sketchAttribution =
    'Planning sketch · <a href="' +
    PUBLIC_PLAN +
    '" target="_blank" rel="noopener noreferrer">Allen Park</a>';
  const aerialAttribution =
    '<a href="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer" target="_blank" rel="noopener noreferrer">Imagery: Esri, Vantor, Earthstar Geographics, and the GIS User Community</a>';
  let credits = [sketchAttribution];
  map.attributionControl.addAttribution(sketchAttribution);
  const loadedTiles = new WeakSet();
  const tiles = L.tileLayer(TILE_URL, { maxZoom: 20, maxNativeZoom: 19, keepBuffer: 3, noWrap: true });
  let creditFrame = 0;
  // A pan can reveal an offline area after the first view loaded successfully.
  // Determine the visible providers from on-screen tiles, not from session history.
  function refreshCredits() {
    if (creditFrame) return;
    creditFrame = requestAnimationFrame(() => {
      creditFrame = 0;
      const box = element.getBoundingClientRect();
      let imagery = false,
        sketch = false;
      for (const tile of tiles.getContainer()?.querySelectorAll('.leaflet-tile') || []) {
        const r = tile.getBoundingClientRect();
        if (r.right <= box.left || r.left >= box.right || r.bottom <= box.top || r.top >= box.bottom)
          continue;
        if (loadedTiles.has(tile)) imagery = true;
        else sketch = true;
      }
      const next = [];
      if (imagery) next.push(aerialAttribution);
      if (!imagery || sketch) next.push(sketchAttribution);
      for (const source of credits)
        if (!next.includes(source)) map.attributionControl.removeAttribution(source);
      for (const source of next)
        if (!credits.includes(source)) map.attributionControl.addAttribution(source);
      credits = next;
      element.classList.toggle('has-aerial', imagery);
    });
  }
  tiles.on('tileload', (e) => {
    loadedTiles.add(e.tile);
    refreshCredits();
  });
  tiles.on('loading tileerror tileunload load', refreshCredits);
  map.on('moveend zoomend resize', refreshCredits);
  tiles.addTo(map);
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
  }).addTo(roofGroup);
  const roofStripes = L.polyline([], { ...quiet, color: '#b7fff1', weight: 1, opacity: 0.78 }).addTo(
    roofGroup
  );
  function setHandleSize(point, angle) {
    const pxPerM =
      map.options.crs.scale(map.getZoom()) / (40075016.686 * Math.cos((point[0] * Math.PI) / 180));
    const r = (angle * Math.PI) / 180;
    const halfHeight =
      ((Math.abs(roofLength * Math.cos(r)) + Math.abs(roofWidth * Math.sin(r))) * pxPerM) / 2;
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
    const color =
      state.layers?.constraints !== false && screening.items.length
        ? screening.status === 'conflict'
          ? '#ec533e'
          : '#e5a832'
        : '#59e0d3';
    roofHalo.setStyle({ color });
    roofShape.setStyle({ color });
    if (state.layers?.constraints !== false) {
      for (const part of screening.overlaps) {
        const polygon = part.clipped.map(([x, z]) => offset(site.center, x, -z));
        L.polygon(polygon, { ...quiet, color, weight: 1, fillOpacity: 0.65 }).addTo(impactGroup);
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
  node.append(symbol('move'), makeNode('scope-footprint-label', 'Data center'));
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
  map.on('zoomend', () => {
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
    visible(parcelGroup, layers.site !== false);
    visible(waterGroup, layers.river !== false);
    visible(placesGroup, layers.places !== false);
    positionLabels();
    visible(notesGroup, layers.notes !== false);
    noteMarkers(state.notes || [], state.selectedNote);
    visible(roofGroup, Boolean(state.point));
    visible(handle, Boolean(state.point));
    if (state.point && !dragging) {
      drawFootprint(state.point, state.angle || 0);
      handle.setLatLng(state.point);
      if (state.mode === 'note') handle.dragging.disable();
      else handle.dragging.enable();
    }
  }
  function home() {
    const rect = map.getSize();
    if (rect.x < 120 || rect.y < 140) {
      map.setView(site.center, 15.75, { animate: false });
      return;
    }
    const extent = L.latLngBounds([site.center, ...(site.boundary || [])]);
    for (const place of places) extent.extend([place.lat, place.lng]);
    map.fitBounds(extent, {
      paddingTopLeft: [rect.x < 520 ? 20 : 40, 70],
      paddingBottomRight: [Math.min(130, rect.x * 0.23), Math.min(58, rect.y * 0.13)],
      maxZoom: 16.25,
      animate: false
    });
  }
  function focus(coords, zoom) {
    map.setView(coords, zoom ?? map.getZoom(), { animate: false });
  }
  function setBase(name) {
    element.dataset.base = name === 'satellite' ? 'satellite' : 'night';
  }
  function resize() {
    map.invalidateSize({ pan: false });
    positionLabels();
  }
  setBase('night');
  home();
  const ro = new ResizeObserver(resize);
  ro.observe(element);
  return {
    render,
    focus,
    home,
    zoomBy: (d) => map.setZoom(map.getZoom() + d),
    setBase,
    resize,
    destroy() {
      ro.disconnect();
      cancelAnimationFrame(pending);
      map.remove();
      cancelAnimationFrame(creditFrame);
    }
  };
}

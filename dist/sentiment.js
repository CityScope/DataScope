import { createBasemap, mapInteraction, stepZoom } from './basemaps.js';
import { createSentimentHeat } from './sentiment-heat.js';
import { stanceColors as colors } from './sentiment-field.js';
import { icon } from './icons.js';
import {
  zones,
  discussions,
  stances,
  topics,
  phases,
  streams,
  channels,
  provenance
} from './sentiment-data.js';
import { site, river } from './geography.js';

const escapeHTML = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (x) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[x]
  );
const label = (options, id) => options.find((item) => item.id === id)?.label;
const channelInfo = (id) => channels.find((item) => item.id === id) || channels[0];
const zoneName = (id) => zones.find((z) => z.id === id)?.name;
const option = (items, all) =>
  '<option value="">' +
  all +
  '</option>' +
  items.map((x) => '<option value="' + x.id + '">' + x.label + '</option>').join('');
const counts = (rows) => stances.map((s) => rows.filter((row) => row.stance === s.id).length);
const sessionIds = channels.filter((c) => c.stream === 'session').map((c) => c.id);
const socialIds = channels.filter((c) => c.stream === 'social').map((c) => c.id);
const allChannelIds = channels.map((c) => c.id);
const TOUR_ZONE_ORDER = [
  'midtown',
  'medical',
  'pebble-creek',
  'langford',
  'independence',
  'school',
  'tamu',
  'fitch'
];
const STANCE_ORDER = ['concerned', 'conditional', 'supportive'];

export function buildTourQueue(rows, currentId = '') {
  if (!Array.isArray(rows) || !rows.length) return [];
  const byZone = new Map();
  for (const row of rows) {
    if (!byZone.has(row.zoneId)) byZone.set(row.zoneId, []);
    byZone.get(row.zoneId).push(row);
  }
  const zoneIds = [
    ...TOUR_ZONE_ORDER.filter((id) => byZone.has(id)),
    ...[...byZone.keys()].filter((id) => !TOUR_ZONE_ORDER.includes(id))
  ];
  const buckets = zoneIds.map((zoneId, zIdx) => {
    const group = byZone.get(zoneId);
    const byStance = STANCE_ORDER.map((s) => group.filter((r) => r.stance === s));
    const extras = group.filter((r) => !STANCE_ORDER.includes(r.stance));
    if (extras.length) byStance.push(extras);
    const shift = zIdx % byStance.length;
    const rotated = [...byStance.slice(shift), ...byStance.slice(0, shift)];
    const interleaved = rotated.map((items) => {
      const sess = items.filter((r) => r.stream === 'session');
      const soc = items.filter((r) => r.stream !== 'session');
      const out = [];
      const n = Math.max(sess.length, soc.length);
      for (let i = 0; i < n; i++) {
        if (sess[i]) out.push(sess[i]);
        if (soc[i]) out.push(soc[i]);
      }
      return out;
    });
    const ordered = [];
    const maxLen = Math.max(0, ...interleaved.map((a) => a.length));
    for (let i = 0; i < maxLen; i++) {
      for (const list of interleaved) if (list[i]) ordered.push(list[i]);
    }
    return ordered;
  });

  const queue = [];
  const rounds = Math.max(0, ...buckets.map((b) => b.length));
  for (let i = 0; i < rounds; i++) {
    for (const bucket of buckets) if (bucket[i]) queue.push(bucket[i]);
  }

  if (currentId && queue.length > 1) {
    const current = rows.find((r) => r.id === currentId);
    let idx = queue.findIndex((r) => r.id !== currentId && (!current || r.zoneId !== current.zoneId));
    if (idx < 0) idx = queue.findIndex((r) => r.id !== currentId);
    if (idx > 0) return [...queue.slice(idx), ...queue.slice(0, idx)];
  }
  return queue;
}

function ring(rows) {
  let start = 0;
  return (
    'conic-gradient(' +
    counts(rows)
      .map((v, i) => {
        const from = start;
        start += (v / rows.length) * 100;
        return colors[stances[i].id] + ' ' + from + '% ' + start + '%';
      })
      .join(',') +
    ')'
  );
}

export function createSentiment(el, { onNote, onMarker, onExplore, onRestoreNote, onDemoChange }) {
  const L = window.L;
  const sourceButtons = channels
    .map(
      (c) =>
        '<button type="button" class="source-chip" data-source="' +
        c.id +
        '" data-stream="' +
        c.stream +
        '" aria-pressed="true" title="' +
        c.label +
        '">' +
        icon(c.id) +
        '<span>' +
        c.short +
        '</span><b data-source-count="' +
        c.id +
        '">0</b></button>'
    )
    .join('');

  el.innerHTML = `
    <div class="sent-layout">
      <section class="sent-figure">
        <div id="discussion-map" aria-label="Interactive College Station discussion map"></div>
        <aside class="sent-left-tools" aria-label="Map navigation">
          <div class="sent-left-group">
            <button type="button" data-command="in" aria-label="Zoom in" title="Zoom in">+</button>
            <button type="button" data-command="out" aria-label="Zoom out" title="Zoom out">−</button>
            <button type="button" data-command="fit" aria-label="Focus all College Station corridors" title="Focus all corridors">${icon('target')}</button>
          </div>
          <label class="sent-base-wrap" title="Map background">
            <select id="sent-base" aria-label="Discussion basemap">
              <option value="map">Light</option>
              <option value="satellite">Satellite</option>
            </select>
          </label>
        </aside>
        <div class="sent-note-prompt" hidden>Click anywhere on the College Station map to pin your note. <button type="button" data-command="cancel">Cancel</button></div>
      </section>

      <svg class="sent-connector" aria-hidden="true">
        <path class="conn-halo"></path>
        <path class="conn-line"></path>
        <circle class="conn-ring"></circle>
        <circle class="conn-pin-dot"></circle>
        <circle class="conn-anchor"></circle>
      </svg>

      <aside class="sent-feed sent-window" aria-label="Community discussions and session notes">
        <div class="sent-win-bar" title="Drag to move window">
          <span class="win-grip" aria-hidden="true">${icon('grip')}</span>
          <div class="feed-mode-tabs" role="tablist" aria-label="Discussion panel view">
            <button type="button" role="tab" data-feed-tab="discussions" aria-selected="true">Discussions</button>
            <button type="button" role="tab" data-feed-tab="notes" aria-selected="false">Notes <b data-notes-count>0</b></button>
          </div>
          <button type="button" class="add-note-inline" data-command="add-note" title="Pin a note on the map">${icon('pinplus')}<span>Add note</span></button>
          <button type="button" class="win-btn" data-command="reset-win" hidden aria-label="Reset window size and position" title="Reset window">${icon('expand')}</button>
          <button type="button" class="win-btn" data-command="feed" aria-expanded="true" aria-controls="sent-feed-content" aria-label="Collapse discussions">${icon('chevron')}</button>
        </div>
        <div id="sent-feed-content">
          <div class="feed-heading"></div>
          <div class="feed-rows"></div>
        </div>
        <div class="win-resize win-resize-w" data-resize="w" aria-hidden="true"></div>
        <div class="win-resize win-resize-s" data-resize="s" aria-hidden="true"></div>
        <div class="win-resize win-resize-sw" data-resize="sw" aria-hidden="true"></div>
        <div class="win-resize win-resize-se" data-resize="se" aria-hidden="true"></div>
      </aside>

      <section class="sent-dock is-mobile-compact" aria-label="Discussion filters and viewpoints">
        <div class="sent-dock-head">
          <div class="sent-display" role="group" aria-label="Discussion display">
            <button type="button" data-heat="off" aria-pressed="false">Corridors</button>
            <button type="button" data-heat="on" aria-pressed="true">Heatmap</button>
          </div>
          <button type="button" class="dock-mobile-toggle" data-command="dock-filters" aria-expanded="false"><span>Filters</span>${icon('chevron')}</button>
          <div class="stream-tabs dock-extra" role="group" aria-label="Collection streams">
            <button type="button" data-stream-filter="all" aria-pressed="true">All</button>
            <button type="button" data-stream-filter="session" aria-pressed="false">${icon('workshop')}Sessions</button>
            <button type="button" data-stream-filter="social" aria-pressed="false">${icon('forum')}Social</button>
          </div>
          <div class="dock-selects dock-extra">
            <select data-filter="topic" aria-label="Filter by topic">${option(topics, 'All topics')}</select>
            <select data-filter="phase" aria-label="Filter by CUP phase">${option(phases, 'All phases')}</select>
          </div>
          <span class="dock-sample" title="${provenance}">Fictional sample</span>
          <button type="button" class="dock-reset dock-extra" data-command="reset" title="Reset filters">Reset</button>
        </div>
        <div class="sent-dock-body">
          <div class="dock-viewpoints">
            <div class="stance-buttons" role="group" aria-label="Filter by viewpoint"></div>
            <div class="sent-stack" aria-hidden="true"></div>
            <small id="discussion-map-key">Filled: sessions · Ringed: social · ◇ Midtown tract</small>
          </div>
          <div class="dock-sources dock-extra" aria-label="Filter by source channel">
            ${sourceButtons}
          </div>
        </div>
      </section>
    </div>
`;

  const map = L.map(el.querySelector('#discussion-map'), {
    zoomControl: false,
    attributionControl: true,
    ...mapInteraction,
    minZoom: 12,
    maxZoom: 19,
    maxBoundsViscosity: 0.8
  });
  map.on('zoomend', () => {
    el.querySelector('[data-command=in]').disabled = map.getZoom() >= map.getMaxZoom();
    el.querySelector('[data-command=out]').disabled = map.getZoom() <= map.getMinZoom();
  });
  const basemap = createBasemap(map, 'map');
  const heat = createSentimentHeat(map);
  let heatMode = true;
  L.polyline(river, { weight: 2, color: '#347a87', opacity: 0.65, interactive: false }).addTo(map);
  L.polygon(site.boundary, {
    color: '#497f6d',
    weight: 1.5,
    dashArray: '4 3',
    fillOpacity: 0.07,
    interactive: false
  }).addTo(map);
  L.marker(site.center, {
    title: 'Midtown CUP study tract',
    alt: 'Midtown CUP study tract',
    icon: L.divIcon({ className: 'proposal-map-label', html: '◇', iconSize: [18, 18], iconAnchor: [9, 9] })
  })
    .bindTooltip('Midtown Business Park study tract')
    .addTo(map);
  L.control.scale({ imperial: true, metric: false, position: 'bottomleft', maxWidth: 85 }).addTo(map);
  const groups = L.layerGroup().addTo(map),
    remarks = L.layerGroup().addTo(map),
    pins = L.layerGroup().addTo(map);
  const remarkMarkers = new Map();
  let activeRows = discussions,
    selectedRemark = '',
    selectedNoteId = '',
    feedTab = 'discussions',
    savedNotes = [];

  const layoutEl = el.querySelector('.sent-layout');
  const mapEl = el.querySelector('#discussion-map');
  const connSvg = el.querySelector('.sent-connector');
  const connHalo = connSvg.querySelector('.conn-halo');
  const connLine = connSvg.querySelector('.conn-line');
  const connRing = connSvg.querySelector('.conn-ring');
  const connPinDot = connSvg.querySelector('.conn-pin-dot');
  const connAnchor = connSvg.querySelector('.conn-anchor');
  let connRaf = 0;

  function detailScale() {
    const zoom = map.getZoom();
    const size = Math.max(12.5, Math.min(28, 12.5 + (zoom - 13.0) * 3.2));
    mapEl.style.setProperty('--pin-size', size.toFixed(1) + 'px');
    mapEl.style.setProperty(
      '--pin-opacity',
      Math.max(0.86, Math.min(1, 0.86 + (zoom - 13.4) * 0.06))
    );
  }
  map.on('zoom', detailScale);

  const filters = { topic: '', phase: '', stance: '' };
  const activeSources = new Set(allChannelIds);
  let selected = '',
    noteMode = false,
    first = true;

  // Dynamic movable & resizable Community Discussions window
  const win = el.querySelector('.sent-feed');
  const winBar = el.querySelector('.sent-win-bar');
  const feedRowsEl = el.querySelector('.feed-rows');
  const resetWinBtn = el.querySelector('[data-command=reset-win]');
  let dragState = null;

  function activeConnectorTarget() {
    if (feedTab === 'discussions' && selectedRemark) {
      const row = activeRows.find((r) => r.id === selectedRemark);
      if (!row) return null;
      const card = Array.from(win.querySelectorAll('.thread[data-remark-id]')).find(
        (node) => node.dataset.remarkId === selectedRemark
      );
      return {
        coords: row.coords,
        color: colors[row.stance] || '#2e7664',
        card,
        hasMapPin: heatMode,
        isNote: false
      };
    }
    if (feedTab === 'notes' && selectedNoteId) {
      const note = savedNotes.find((n) => n.id === selectedNoteId);
      if (!note) return null;
      const card = Array.from(win.querySelectorAll('.user-note-card[data-note-id]')).find(
        (node) => node.dataset.noteId === selectedNoteId
      );
      return {
        coords: [note.lat, note.lng],
        color: '#2e7664',
        card,
        hasMapPin: true,
        isNote: true
      };
    }
    return null;
  }

  function hideConnector(reason) {
    connSvg.classList.remove('is-visible');
    connSvg.dataset.state = reason;
  }

  function updateConnector() {
    if (connRaf) {
      cancelAnimationFrame(connRaf);
      connRaf = 0;
    }
    const target = activeConnectorTarget();
    if (!target) {
      hideConnector('idle');
      return;
    }
    if (el.hidden) {
      hideConnector('panel-hidden');
      return;
    }
    if (!map._loaded) {
      hideConnector('map-unloaded');
      return;
    }
    const layoutRect = layoutEl.getBoundingClientRect();
    const mapRect = mapEl.getBoundingClientRect();
    const winRect = win.getBoundingClientRect();
    if (layoutRect.width < 10 || layoutRect.height < 10 || winRect.width < 10) {
      hideConnector('no-layout');
      return;
    }
    const pt = map.latLngToContainerPoint(target.coords);
    const pinX = mapRect.left - layoutRect.left + pt.x;
    const pinY = mapRect.top - layoutRect.top + pt.y;
    if (
      !Number.isFinite(pinX) ||
      !Number.isFinite(pinY) ||
      pinX < -24 ||
      pinX > layoutRect.width + 24 ||
      pinY < -24 ||
      pinY > layoutRect.height + 24
    ) {
      hideConnector('offscreen');
      return;
    }

    const wLeft = winRect.left - layoutRect.left;
    const wRight = winRect.right - layoutRect.left;
    const wTop = winRect.top - layoutRect.top;
    const wBottom = winRect.bottom - layoutRect.top;

    // Hide gracefully if the floating window is dragged directly on top of the pin
    if (pinX > wLeft + 6 && pinX < wRight - 6 && pinY > wTop + 6 && pinY < wBottom - 6) {
      hideConnector('occluded');
      return;
    }

    // Vertical anchor follows the selected card inside the scrollable window
    let cardY = wTop + winRect.height * 0.5;
    if (!win.classList.contains('is-collapsed') && target.card) {
      const cRect = target.card.getBoundingClientRect();
      const rowsRect = feedRowsEl.getBoundingClientRect();
      const minY = Math.max(wTop + 44, rowsRect.top - layoutRect.top + 14);
      const maxY = Math.min(wBottom - 16, rowsRect.bottom - layoutRect.top - 14);
      const idealY = cRect.top - layoutRect.top + Math.min(28, cRect.height * 0.45);
      cardY = Math.max(minY, Math.min(Math.max(minY, maxY), idealY));
    }

    // Choose the closest outer edge of the floating window as the user moves it
    let ax, ay, nx, ny;
    if (pinX <= wLeft) {
      ax = wLeft;
      ay = cardY;
      nx = -1;
      ny = 0;
    } else if (pinX >= wRight) {
      ax = wRight;
      ay = cardY;
      nx = 1;
      ny = 0;
    } else if (pinY <= wTop) {
      ax = Math.max(wLeft + 24, Math.min(wRight - 24, pinX));
      ay = wTop;
      nx = 0;
      ny = -1;
    } else {
      ax = Math.max(wLeft + 24, Math.min(wRight - 24, pinX));
      ay = wBottom;
      nx = 0;
      ny = 1;
    }

    const pinSize = parseFloat(mapEl.style.getPropertyValue('--pin-size')) || 18;
    const ringR = target.isNote ? 16 : target.hasMapPin ? pinSize * 0.64 + 5.5 : 10;
    const dotX = ax + nx * 4;
    const dotY = ay + ny * 4;
    const dist = Math.hypot(dotX - pinX, dotY - pinY);

    let d = '';
    if (dist > ringR + 6) {
      let c1x, c1y, c2x, c2y;
      if (nx !== 0) {
        const spanX = Math.abs(dotX - pinX);
        const h = Math.min(96, Math.max(24, spanX * 0.44));
        c1x = pinX - nx * h * 0.52;
        c1y = pinY;
        c2x = dotX + nx * h;
        c2y = dotY;
      } else {
        const spanY = Math.abs(dotY - pinY);
        const h = Math.min(84, Math.max(22, spanY * 0.44));
        c1x = pinX;
        c1y = pinY - ny * h * 0.52;
        c2x = dotX;
        c2y = dotY + ny * h;
      }
      const vx = c1x - pinX;
      const vy = c1y - pinY;
      const vLen = Math.hypot(vx, vy) || 1;
      const sx = pinX + (vx / vLen) * ringR;
      const sy = pinY + (vy / vLen) * ringR;
      d =
        'M ' +
        sx.toFixed(1) +
        ' ' +
        sy.toFixed(1) +
        ' C ' +
        c1x.toFixed(1) +
        ' ' +
        c1y.toFixed(1) +
        ' ' +
        c2x.toFixed(1) +
        ' ' +
        c2y.toFixed(1) +
        ' ' +
        ax.toFixed(1) +
        ' ' +
        ay.toFixed(1);
    }

    connSvg.setAttribute('viewBox', '0 0 ' + layoutRect.width + ' ' + layoutRect.height);
    connSvg.style.setProperty('--conn-color', target.color);
    connHalo.setAttribute('d', d);
    connLine.setAttribute('d', d);
    connRing.setAttribute('cx', pinX.toFixed(1));
    connRing.setAttribute('cy', pinY.toFixed(1));
    connRing.setAttribute('r', ringR.toFixed(1));
    if (!target.hasMapPin) {
      connPinDot.setAttribute('cx', pinX.toFixed(1));
      connPinDot.setAttribute('cy', pinY.toFixed(1));
      connPinDot.setAttribute('r', '4.6');
      connPinDot.style.display = '';
    } else {
      connPinDot.style.display = 'none';
    }
    connAnchor.setAttribute('cx', dotX.toFixed(1));
    connAnchor.setAttribute('cy', dotY.toFixed(1));
    connAnchor.setAttribute('r', '4.1');
    connSvg.dataset.state = 'active';
    connSvg.classList.add('is-visible');
  }

  function scheduleConnector() {
    if (connRaf) return;
    connRaf = requestAnimationFrame(updateConnector);
  }

  function ensureCoordsVisible(coords) {
    if (!map._loaded) return;
    const size = map.getSize();
    if (!size.x || !size.y) return;
    const pt = map.latLngToContainerPoint(coords);
    const layoutRect = layoutEl.getBoundingClientRect();
    const wRect = win.getBoundingClientRect();
    const wLeft = wRect.left - layoutRect.left;
    const wRight = wRect.right - layoutRect.left;
    const wTop = wRect.top - layoutRect.top;
    const wBottom = wRect.bottom - layoutRect.top;
    const wide = window.innerWidth > 700;
    const padTop = wide ? 92 : 124;
    const padBottom = wide ? 170 : 165;
    const padLeft = wide ? 96 : 28;
    const padRight = wide ? 28 : 28;
    const coveredByWin =
      !win.classList.contains('is-collapsed') &&
      pt.x >= wLeft - 24 &&
      pt.x <= wRight + 24 &&
      pt.y >= wTop - 24 &&
      pt.y <= wBottom + 24;
    const offScreen =
      pt.x < padLeft || pt.x > size.x - padRight || pt.y < padTop || pt.y > size.y - padBottom;
    if (!coveredByWin && !offScreen) return;
    let targetX = size.x * 0.42;
    let targetY = (padTop + (size.y - padBottom)) * 0.5;
    if (wide) {
      const leftSpace = wLeft - padLeft;
      const rightSpace = size.x - padRight - wRight;
      if (leftSpace >= rightSpace && leftSpace > 160) targetX = padLeft + leftSpace * 0.54;
      else if (rightSpace > 160) targetX = wRight + rightSpace * 0.46;
      else targetX = size.x * 0.5;
    }
    const dx = Math.round(pt.x - targetX);
    const dy = Math.round(pt.y - targetY);
    const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
    map.panBy([dx, dy], { animate: !reduce, duration: 0.45 });
  }

  function syncRemarkSelection() {
    for (const [id, entry] of remarkMarkers) {
      const row = activeRows.find((r) => r.id === id);
      const isSelected = id === selectedRemark;
      entry.button.classList.toggle('selected', isSelected);
      entry.button.setAttribute('aria-pressed', isSelected);
      entry.marker.setZIndexOffset(isSelected ? 1500 : row?.stream === 'session' ? 120 : 60);
    }
  }

  function selectRemarkInList(id) {
    const row = activeRows.find((r) => r.id === id);
    if (!row) return;
    selectedRemark = id;
    selectedNoteId = '';
    win.querySelectorAll('.thread[data-remark-id]').forEach((node) => {
      const match = node.dataset.remarkId === id;
      node.open = match;
      node.classList.toggle('selected-remark', match);
    });
    syncRemarkSelection();
    ensureCoordsVisible(row.coords);
    updateConnector();
  }

  function selectNoteInList(id, zoomTo = false) {
    const note = savedNotes.find((n) => n.id === id);
    if (!note) return;
    selectedNoteId = id;
    selectedRemark = '';
    win.querySelectorAll('.user-note-card[data-note-id]').forEach((node) => {
      node.classList.toggle('selected-note', node.dataset.noteId === id);
    });
    if (zoomTo) {
      const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
      map.setView([note.lat, note.lng], Math.max(16.5, map.getZoom()), { animate: !reduce });
    } else {
      ensureCoordsVisible([note.lat, note.lng]);
    }
    updateConnector();
  }

  map.on('move zoom viewreset resize', updateConnector);
  feedRowsEl.addEventListener('scroll', scheduleConnector, { passive: true });
  window.addEventListener('resize', scheduleConnector);

  function resetWindowGeometry() {
    win.style.left = '';
    win.style.top = '';
    win.style.right = '';
    win.style.width = '';
    win.style.height = '';
    win.classList.remove('is-custom-geom');
    resetWinBtn.hidden = true;
    scheduleConnector();
  }

  function startWindowMove(e) {
    if (window.innerWidth <= 700) return;
    if (e.target.closest('button')) return;
    const rect = win.getBoundingClientRect();
    dragState = {
      kind: 'move',
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    };
    win.classList.add('is-dragging', 'is-custom-geom');
    win.style.right = 'auto';
    win.style.left = rect.left + 'px';
    win.style.top = rect.top + 'px';
    win.style.width = rect.width + 'px';
    win.style.height = rect.height + 'px';
    resetWinBtn.hidden = false;
    winBar.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function startWindowResize(e) {
    if (window.innerWidth <= 700) return;
    const dir = e.currentTarget.dataset.resize;
    const rect = win.getBoundingClientRect();
    dragState = {
      kind: 'resize',
      dir,
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    };
    win.classList.add('is-resizing', 'is-custom-geom');
    win.style.right = 'auto';
    win.style.left = rect.left + 'px';
    win.style.top = rect.top + 'px';
    win.style.width = rect.width + 'px';
    win.style.height = rect.height + 'px';
    resetWinBtn.hidden = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
    e.stopPropagation();
  }

  function onWindowPointerMove(e) {
    if (!dragState || e.pointerId !== dragState.id) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    const maxW = Math.min(780, window.innerWidth - 44);
    const maxH = window.innerHeight - 92;
    if (dragState.kind === 'move') {
      const left = Math.max(12, Math.min(window.innerWidth - dragState.width - 12, dragState.left + dx));
      const top = Math.max(68, Math.min(window.innerHeight - 72, dragState.top + dy));
      win.style.left = left + 'px';
      win.style.top = top + 'px';
    } else {
      let { left, width, height } = dragState;
      const d = dragState.dir;
      if (d.includes('w')) {
        const nextW = Math.max(280, Math.min(maxW, dragState.width - dx));
        const delta = dragState.width - nextW;
        left = Math.max(12, dragState.left + delta);
        width = dragState.left + dragState.width - left;
      }
      if (d.includes('e')) {
        width = Math.max(280, Math.min(window.innerWidth - left - 12, Math.min(maxW, dragState.width + dx)));
      }
      if (d.includes('s')) {
        height = Math.max(240, Math.min(window.innerHeight - dragState.top - 16, Math.min(maxH, dragState.height + dy)));
      }
      win.style.left = left + 'px';
      win.style.width = width + 'px';
      win.style.height = height + 'px';
    }
    updateConnector();
  }

  function endWindowPointer(e) {
    if (!dragState || e.pointerId !== dragState.id) return;
    win.classList.remove('is-dragging', 'is-resizing');
    dragState = null;
  }

  winBar.addEventListener('pointerdown', startWindowMove);
  winBar.addEventListener('pointermove', onWindowPointerMove);
  winBar.addEventListener('pointerup', endWindowPointer);
  winBar.addEventListener('pointercancel', endWindowPointer);
  win.querySelectorAll('.win-resize').forEach((handle) => {
    handle.addEventListener('pointerdown', startWindowResize);
    handle.addEventListener('pointermove', onWindowPointerMove);
    handle.addEventListener('pointerup', endWindowPointer);
    handle.addEventListener('pointercancel', endWindowPointer);
  });

  const markerLabel = (zone, rows) => {
    const sessionN = rows.filter((r) => r.stream === 'session').length;
    const socialN = rows.length - sessionN;
    const button = document.createElement('button');
    button.className = 'zone-target';
    button.setAttribute(
      'aria-label',
      zone.name + ', ' + rows.length + ' sample discussions (' + sessionN + ' sessions, ' + socialN + ' social)'
    );
    const donut = document.createElement('span');
    donut.className = 'zone-ring';
    donut.style.background = ring(rows);
    const number = document.createElement('b');
    number.textContent = rows.length;
    donut.append(number);
    const title = document.createElement('span');
    title.className = 'zone-name';
    title.textContent = zone.name;
    button.append(donut, title);
    button.classList.toggle('selected', zone.id === selected);
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      if (noteMode) {
        onNote(zone.center);
        setNote(false);
        return;
      }
      choose(zone.id);
    });
    return button;
  };

  function fit() {
    const pts = heatMode && activeRows.length ? activeRows.map((r) => r.coords) : zones.map((z) => z.center);
    map.fitBounds(L.latLngBounds(pts), {
      paddingTopLeft: window.innerWidth > 700 ? [96, 86] : [62, 64],
      paddingBottomRight: window.innerWidth > 700 ? [380, 175] : [18, 132],
      maxZoom: 15.5,
      animate: false
    });
  }

  function setNote(on) {
    if (on) stopDemo();
    noteMode = on;
    el.querySelector('.sent-note-prompt').hidden = !on;
    el.querySelector('#discussion-map').classList.toggle('pinning', on);
    el.querySelector('[data-command=add-note]')?.setAttribute('aria-pressed', String(on));
  }

  map.on('click', (e) => {
    if (noteMode) {
      setNote(false);
      onNote([e.latlng.lat, e.latlng.lng]);
    }
  });

  function expandFeed() {
    el.querySelector('[data-command=feed]').setAttribute('aria-expanded', 'true');
    el.querySelector('#sent-feed-content').hidden = false;
    win.classList.remove('is-collapsed');
    if (window.innerWidth <= 700) {
      el.querySelector('.sent-dock')?.classList.add('is-mobile-compact');
      el.querySelector('[data-command=dock-filters]')?.setAttribute('aria-expanded', 'false');
    }
    scheduleConnector();
  }

  function choose(id) {
    selected = id;
    selectedRemark = '';
    selectedNoteId = '';
    feedTab = 'discussions';
    render();
    if (id) {
      expandFeed();
      const zone = zones.find((z) => z.id === id);
      map.panInside(zone.center, { padding: [64, 80] });
    }
  }

  function chooseRemark(id, locate = false) {
    const row = activeRows.find((r) => r.id === id);
    if (!row) return;
    if (noteMode) {
      setNote(false);
      onNote(row.coords);
      return;
    }
    selectedRemark = id;
    selectedNoteId = '';
    selected = row.zoneId;
    feedTab = 'discussions';
    heatMode = true;
    render();
    expandFeed();
    feedRowsEl.scrollTop = 0;
    if (locate) {
      const zoom = Math.max(16.8, map.getZoom());
      if (matchMedia('(prefers-reduced-motion:reduce)').matches)
        map.setView(row.coords, zoom, { animate: false });
      else map.flyTo(row.coords, zoom, { duration: 0.65 });
    } else {
      ensureCoordsVisible(row.coords);
    }
    scheduleConnector();
  }

  function drawRemarks(rows) {
    const ids = new Set(rows.map((r) => r.id));
    for (const [id, entry] of remarkMarkers) {
      if (!ids.has(id)) {
        remarks.removeLayer(entry.marker);
        remarkMarkers.delete(id);
      }
    }
    for (const row of rows) {
      let entry = remarkMarkers.get(row.id);
      if (!entry) {
        const ch = channelInfo(row.channel);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'remark-pin';
        button.dataset.remarkId = row.id;
        button.dataset.channel = row.channel;
        button.dataset.stream = row.stream;
        button.style.setProperty('--stance', colors[row.stance]);
        button.innerHTML = icon(row.channel);
        button.setAttribute(
          'aria-label',
          ch.label + ' · ' + label(stances, row.stance) + ': ' + row.title
        );
        button.addEventListener('click', (e) => {
          e.stopPropagation();
          chooseRemark(row.id);
        });
        const marker = L.marker(row.coords, {
          keyboard: false,
          icon: L.divIcon({
            className: 'remark-marker',
            html: button,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          })
        }).addTo(remarks);
        marker.bindTooltip(
          '<strong>' + ch.label + '</strong> · ' + label(stances, row.stance) + '<br>' + row.title,
          { direction: 'top', offset: [0, -10], className: 'remark-tooltip' }
        );
        entry = { marker, button };
        remarkMarkers.set(row.id, entry);
      }
      const isSelected = row.id === selectedRemark;
      entry.button.classList.toggle('selected', isSelected);
      entry.button.setAttribute('aria-pressed', isSelected);
      entry.marker.setZIndexOffset(isSelected ? 1500 : row.stream === 'session' ? 120 : 60);
    }
    if (heatMode && !map.hasLayer(remarks)) remarks.addTo(map);
    if (!heatMode && map.hasLayer(remarks)) map.removeLayer(remarks);
    if (map._loaded) detailScale();
  }

  function syncSourceControls(contextRows) {
    const allOn = allChannelIds.every((id) => activeSources.has(id));
    const sessionsOnly =
      sessionIds.every((id) => activeSources.has(id)) && socialIds.every((id) => !activeSources.has(id));
    const socialOnly =
      socialIds.every((id) => activeSources.has(id)) && sessionIds.every((id) => !activeSources.has(id));

    el.querySelectorAll('[data-stream-filter]').forEach((b) => {
      const mode = b.dataset.streamFilter;
      const pressed = mode === 'all' ? allOn : mode === 'session' ? sessionsOnly : socialOnly;
      b.setAttribute('aria-pressed', String(pressed));
    });
    for (const ch of channels) {
      const btn = el.querySelector('[data-source="' + ch.id + '"]');
      if (btn) btn.setAttribute('aria-pressed', String(activeSources.has(ch.id)));
      const badge = el.querySelector('[data-source-count="' + ch.id + '"]');
      if (badge) badge.textContent = contextRows.filter((r) => r.channel === ch.id).length;
    }
  }

  function renderNotesTab(heading, list) {
    heading.innerHTML =
      '<h2>Session notes</h2>' +
      '<div class="feed-sub"><b>' +
      savedNotes.length +
      ' pinned ' +
      (savedNotes.length === 1 ? 'note' : 'notes') +
      '</b><span>Saved locally on this device</span></div>';
    list.replaceChildren();
    if (!savedNotes.length) {
      list.innerHTML =
        '<div class="empty-notes">' +
        icon('note') +
        '<p>No pinned notes yet. Click <strong>Add note</strong> above, then click anywhere on the College Station map to leave a remark tied to your active scenario.</p>' +
        '</div>';
      return;
    }
    for (const n of [...savedNotes].reverse()) {
      const card = document.createElement('article');
      card.className = 'user-note-card' + (n.id === selectedNoteId ? ' selected-note' : '');
      card.dataset.noteId = n.id;
      card.innerHTML =
        '<div class="user-note-meta"><span>' +
        escapeHTML(n.topic) +
        '</span><small>' +
        escapeHTML(new Date(n.createdAt).toLocaleDateString()) +
        '</small></div><p>' +
        escapeHTML(n.text) +
        '</p><div class="user-note-foot"><small>' +
        escapeHTML(n.scenario) +
        '</small><div class="user-note-actions">' +
        '<button type="button" data-focus-note="' +
        escapeHTML(n.id) +
        '">Locate</button>' +
        (n.placement
          ? '<button type="button" data-restore-note="' + escapeHTML(n.id) + '">Open scenario</button>'
          : '') +
        '</div></div>';
      list.append(card);
    }
  }

  function render() {
    const contextRows = discussions.filter((r) =>
      Object.entries(filters).every(([k, v]) => !v || r[k] === v)
    );
    syncSourceControls(contextRows);
    const rows = contextRows.filter((r) => activeSources.has(r.channel));
    activeRows = rows;
    if (!rows.some((r) => r.id === selectedRemark)) selectedRemark = '';
    if (!rows.some((r) => r.zoneId === selected)) selected = '';
    const visible = rows.filter((r) => !selected || r.zoneId === selected);
    heat.update(rows, heatMode);
    drawRemarks(rows);
    el.dataset.discussionView = heatMode ? 'heat' : 'places';
    el.querySelector('#discussion-map-key').textContent = heatMode
      ? 'Filled pins: sessions · Ringed: social · ◇ Midtown tract'
      : 'Rings: viewpoint mix · numbers: remarks · ◇ Midtown tract';
    el.querySelectorAll('[data-heat]').forEach((b) =>
      b.setAttribute('aria-pressed', (b.dataset.heat === 'on') === heatMode)
    );
    el.querySelectorAll('[data-feed-tab]').forEach((b) =>
      b.setAttribute('aria-selected', String(b.dataset.feedTab === feedTab))
    );
    const countBadge = el.querySelector('[data-notes-count]');
    if (countBadge) countBadge.textContent = String(savedNotes.length);

    groups.clearLayers();
    if (!heatMode)
      for (const zone of zones) {
        const here = rows.filter((r) => r.zoneId === zone.id);
        if (!here.length) continue;
        const marker = L.marker(zone.center, {
          keyboard: false,
          icon: L.divIcon({
            className: 'zone-marker zone-' + zone.id,
            html: markerLabel(zone, here),
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          }),
          zIndexOffset: zone.id === selected ? 1000 : 0
        }).addTo(groups);
        marker.on('click', () => {
          if (!noteMode) choose(zone.id);
        });
      }

    // Consolidated bottom dock: Viewpoints buttons + proportional stack bar
    const values = counts(visible);
    el.querySelector('.sent-dock .stance-buttons').innerHTML = stances
      .map(
        (s, i) =>
          '<button type="button" class="stance-key" data-stance="' +
          s.id +
          '" aria-pressed="' +
          (filters.stance === s.id) +
          '"><i style="--stance:' +
          colors[s.id] +
          '"></i><span>' +
          s.label +
          '</span><b>' +
          values[i] +
          '</b></button>'
      )
      .join('');
    el.querySelector('.sent-dock .sent-stack').innerHTML = values
      .map(
        (n, i) =>
          '<i style="width:' +
          (visible.length ? (n / visible.length) * 100 : 0) +
          '%;background:' +
          colors[stances[i].id] +
          '"></i>'
      )
      .join('');

    const heading = el.querySelector('.feed-heading');
    const list = el.querySelector('.feed-rows');
    if (feedTab === 'notes') {
      if (!savedNotes.some((n) => n.id === selectedNoteId)) selectedNoteId = '';
      renderNotesTab(heading, list);
      scheduleConnector();
      return;
    }

    const sessionCount = visible.filter((r) => r.stream === 'session').length;
    const socialCount = visible.length - sessionCount;
    heading.innerHTML =
      '<h2>' +
      (selected ? zoneName(selected) : 'Across College Station') +
      '</h2><div class="feed-sub"><b>' +
      visible.length +
      ' remarks</b>' +
      (selected
        ? '<button type="button" data-command="all">All corridors</button><button type="button" data-command="explore">Open in editor</button>'
        : '<span>' +
          sessionCount +
          ' sessions · ' +
          socialCount +
          ' social</span>') +
      '</div>';

    list.replaceChildren();
    const byZone = zones.map((z) => visible.filter((row) => row.zoneId === z.id));
    const levels = Math.max(0, ...byZone.map((group) => group.length));
    const ordered = Array.from({ length: levels }, (_, i) =>
      byZone.map((group) => group[i]).filter(Boolean)
    ).flat();
    if (selectedRemark)
      ordered.sort((a, b) => Number(b.id === selectedRemark) - Number(a.id === selectedRemark));
    for (const r of ordered) {
      const ch = channelInfo(r.channel);
      const streamLabel = label(streams, r.stream);
      const article = document.createElement('details');
      article.className = 'thread';
      article.dataset.remarkId = r.id;
      article.dataset.stream = r.stream;
      article.open = r.id === selectedRemark;
      article.classList.toggle('selected-remark', r.id === selectedRemark);
      article.style.setProperty('--stance', colors[r.stance]);
      const summary = document.createElement('summary');
      summary.innerHTML =
        '<small class="thread-meta"><span class="thread-stance"><i></i>' +
        label(stances, r.stance) +
        '</span><span class="source-tag" data-stream="' +
        r.stream +
        '" data-channel="' +
        r.channel +
        '" title="' +
        streamLabel +
        ' · ' +
        ch.label +
        '">' +
        icon(r.channel) +
        '<span>' +
        ch.label +
        '</span></span></small><strong>' +
        r.title +
        '</strong><span>' +
        zoneName(r.zoneId) +
        ' <b>·</b> ' +
        (r.replies.length
          ? r.replies.length + ' ' + (r.replies.length === 1 ? 'reply' : 'replies')
          : 'Opening post') +
        '</span>';
      article.append(summary);
      const body = document.createElement('div');
      body.className = 'thread-text';
      body.innerHTML =
        '<small>' +
        streamLabel +
        ' · ' +
        label(topics, r.topic) +
        ' · ' +
        label(phases, r.phase) +
        '</small><p>' +
        r.excerpt +
        '</p>' +
        r.replies
          .map(
            (reply) =>
              '<blockquote><small>Sample reply · ' +
              label(stances, reply.stance) +
              '</small>' +
              reply.text +
              '</blockquote>'
          )
          .join('');
      const locate = document.createElement('button');
      locate.type = 'button';
      locate.textContent = 'Show on map';
      locate.onclick = () => chooseRemark(r.id, true);
      body.append(locate);
      article.append(body);
      list.append(article);
    }
    if (!visible.length)
      list.innerHTML = '<p class="empty-result">No sample threads match these filters.</p>';
    scheduleConnector();
  }

  el.addEventListener('change', (e) => {
    if (e.target.id === 'sent-base') {
      basemap.setBase(e.target.value);
      return;
    }
    const k = e.target.dataset.filter;
    if (k) {
      filters[k] = e.target.value;
      map.closePopup();
      render();
    }
  });

  el.addEventListener('click', (e) => {
    const summaryEl = e.target.closest('.thread > summary');
    if (summaryEl) {
      e.preventDefault();
      const article = summaryEl.parentElement;
      const id = article.dataset.remarkId;
      if (selectedRemark === id && article.open) {
        article.open = false;
        article.classList.remove('selected-remark');
        selectedRemark = '';
        syncRemarkSelection();
        updateConnector();
      } else {
        selectRemarkInList(id);
      }
      return;
    }
    const btn = e.target.closest('button');
    if (!btn) {
      const noteCard = e.target.closest('.user-note-card[data-note-id]');
      if (noteCard) {
        const nid = noteCard.dataset.noteId;
        if (selectedNoteId === nid) {
          selectedNoteId = '';
          noteCard.classList.remove('selected-note');
          updateConnector();
        } else {
          selectNoteInList(nid, false);
        }
      }
      return;
    }
    if (btn.dataset.feedTab) {
      feedTab = btn.dataset.feedTab;
      expandFeed();
      render();
      return;
    }
    if (btn.dataset.focusNote) {
      selectNoteInList(btn.dataset.focusNote, true);
      return;
    }
    if (btn.dataset.restoreNote) {
      onRestoreNote?.(btn.dataset.restoreNote);
      return;
    }
    if (btn.dataset.heat) {
      heatMode = btn.dataset.heat === 'on';
      selectedRemark = '';
      map.closePopup();
      render();
      return;
    }
    if (btn.dataset.streamFilter) {
      const next =
        btn.dataset.streamFilter === 'session'
          ? sessionIds
          : btn.dataset.streamFilter === 'social'
            ? socialIds
            : allChannelIds;
      activeSources.clear();
      next.forEach((id) => activeSources.add(id));
      map.closePopup();
      render();
      return;
    }
    if (btn.dataset.source) {
      const id = btn.dataset.source;
      if (activeSources.has(id)) activeSources.delete(id);
      else activeSources.add(id);
      map.closePopup();
      render();
      return;
    }
    if (btn.dataset.stance) {
      filters.stance = filters.stance === btn.dataset.stance ? '' : btn.dataset.stance;
      map.closePopup();
      render();
      return;
    }
    if (btn.dataset.command === 'dock-filters') {
      const dock = el.querySelector('.sent-dock');
      const expanded = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(expanded));
      dock.classList.toggle('is-mobile-compact', !expanded);
      if (expanded && window.innerWidth <= 700) {
        el.querySelector('[data-command=feed]').setAttribute('aria-expanded', 'false');
        el.querySelector('#sent-feed-content').hidden = true;
        win.classList.add('is-collapsed');
      }
      scheduleConnector();
      return;
    }
    if (btn.dataset.command === 'feed') {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', open);
      el.querySelector('#sent-feed-content').hidden = !open;
      win.classList.toggle('is-collapsed', !open);
      if (open && window.innerWidth <= 700) {
        el.querySelector('.sent-dock')?.classList.add('is-mobile-compact');
        el.querySelector('[data-command=dock-filters]')?.setAttribute('aria-expanded', 'false');
      }
      scheduleConnector();
      return;
    }
    switch (btn.dataset.command) {
      case 'add-note':
        setNote(!noteMode);
        break;
      case 'reset-win':
        resetWindowGeometry();
        break;
      case 'all':
        choose('');
        break;
      case 'fit':
        fit();
        break;
      case 'in':
        stepZoom(map, 1);
        break;
      case 'out':
        stepZoom(map, -1);
        break;
      case 'cancel':
        setNote(false);
        break;
      case 'explore':
        if (selected) onExplore(zones.find((z) => z.id === selected).center, selected);
        break;
      case 'reset':
        Object.keys(filters).forEach((k) => (filters[k] = ''));
        activeSources.clear();
        allChannelIds.forEach((id) => activeSources.add(id));
        el.querySelectorAll('[data-filter]').forEach((s) => (s.value = ''));
        map.closePopup();
        choose('');
        fit();
        break;
    }
  });

  // Sentiment Map Demo Mode: smoothly fly across College Station corridors and open comments
  const reducedMotion = () => matchMedia('(prefers-reduced-motion:reduce)').matches;
  const searchParams = new URLSearchParams(location.search);
  const demoIdleParam = Number(searchParams.get('demoIdleMs'));
  const IDLE_MS = Number.isFinite(demoIdleParam) && demoIdleParam >= 500 ? Math.min(120000, demoIdleParam) : 20000;
  const demoStepParam = Number(searchParams.get('demoStepMs'));
  const STEP_MS = Number.isFinite(demoStepParam) && demoStepParam >= 1000 ? Math.min(20000, demoStepParam) : 6800;

  let demoMode = null,
    reportedDemo = false,
    demoQueue = [],
    demoIndex = 0,
    demoToken = 0,
    demoClickTimer = 0,
    demoStepTimer = 0,
    lastActivity = performance.now(),
    wasHidden = el.hidden || document.hidden;

  function notifyDemo() {
    const active = demoMode !== null;
    layoutEl.dataset.demo = active ? 'active' : 'idle';
    layoutEl.dataset.demoMode = demoMode || '';
    if (active !== reportedDemo) {
      reportedDemo = active;
      onDemoChange?.(active, demoMode);
    }
  }

  function clearDemoTimers() {
    clearTimeout(demoClickTimer);
    clearTimeout(demoStepTimer);
    demoClickTimer = 0;
    demoStepTimer = 0;
  }

  function stopDemo({ stopFlight = true } = {}) {
    demoToken++;
    clearDemoTimers();
    const hadDemo = demoMode !== null;
    demoMode = null;
    lastActivity = performance.now();
    if (hadDemo) {
      if (stopFlight && map._loaded) map.stop();
      notifyDemo();
    }
  }

  function resetIdle() {
    lastActivity = performance.now();
  }

  function framedCenterFor(coords, targetZoom) {
    const size = map.getSize();
    if (!size.x || !size.y) return coords;
    const wide = window.innerWidth > 700;
    const layoutRect = layoutEl.getBoundingClientRect();
    const wRect = win.getBoundingClientRect();
    const dockRect = el.querySelector('.sent-dock')?.getBoundingClientRect();
    const padTop = wide ? 86 : 64;
    const padBottom =
      dockRect && dockRect.height > 10
        ? Math.max(118, layoutRect.bottom - dockRect.top + 18)
        : wide
          ? 156
          : 158;
    const padLeft = wide ? 92 : 62;
    const padRight = wide ? 24 : 18;
    let desiredX = size.x * 0.5;
    let desiredY = Math.max(
      padTop + 36,
      Math.min(size.y - padBottom - 36, (padTop + (size.y - padBottom)) * 0.48)
    );
    if (wide && !win.classList.contains('is-collapsed') && wRect.width > 10) {
      const wLeft = wRect.left - layoutRect.left;
      const wRight = wRect.right - layoutRect.left;
      const leftSpace = wLeft - padLeft;
      const rightSpace = size.x - padRight - wRight;
      if (leftSpace >= rightSpace && leftSpace > 180) desiredX = padLeft + leftSpace * 0.52;
      else if (rightSpace > 180) desiredX = wRight + rightSpace * 0.48;
    } else if (!wide && !win.classList.contains('is-collapsed') && wRect.height > 10) {
      const availBottom =
        Math.min(wRect.top - layoutRect.top, dockRect ? dockRect.top - layoutRect.top : size.y) - 18;
      if (availBottom > padTop + 56) desiredY = (padTop + availBottom) * 0.52;
    }
    const offsetX = size.x * 0.5 - desiredX;
    const offsetY = size.y * 0.5 - desiredY;
    const projected = map.project(coords, targetZoom);
    const centerLatLng = map.unproject(L.point(projected.x + offsetX, projected.y + offsetY), targetZoom);
    return [centerLatLng.lat, centerLatLng.lng];
  }

  function selectTourRemark(row) {
    if (!activeRows.some((r) => r.id === row.id)) return;
    selectedRemark = row.id;
    selectedNoteId = '';
    selected = row.zoneId;
    feedTab = 'discussions';
    heatMode = true;
    render();
    expandFeed();
    feedRowsEl.scrollTop = 0;
    updateConnector();
  }

  function runDemoStep(token, isFirst = false) {
    if (token !== demoToken || !demoMode) return;
    if (el.hidden || document.hidden || noteMode || document.querySelector('dialog[open]')) {
      stopDemo();
      return;
    }
    if (!demoQueue.length) {
      demoQueue = buildTourQueue(activeRows, selectedRemark);
      demoIndex = 0;
    }
    if (!demoQueue.length) {
      stopDemo();
      return;
    }
    const row = demoQueue[demoIndex % demoQueue.length];
    demoIndex = (demoIndex + 1) % demoQueue.length;

    heatMode = true;
    feedTab = 'discussions';
    if (selectedRemark) {
      selectedRemark = '';
      win.querySelectorAll('.thread.selected-remark').forEach((node) => {
        node.open = false;
        node.classList.remove('selected-remark');
      });
      syncRemarkSelection();
      hideConnector('flying');
    }
    expandFeed();
    if (!map.hasLayer(remarks)) render();

    const targetZoom = window.innerWidth > 700 ? 15.6 : 15.2;
    const destCenter = framedCenterFor(row.coords, targetZoom);
    const reduce = reducedMotion();
    const baseFlySec = isFirst ? 1.65 : 2.35;
    const flySec = Math.min(baseFlySec, Math.max(0.42, (STEP_MS * 0.34) / 1000));

    if (reduce) {
      map.setView(destCenter, targetZoom, { animate: false });
      selectTourRemark(row);
    } else {
      map.flyTo(destCenter, targetZoom, { duration: flySec });
      const clickDelay = Math.round(flySec * 1000 * 0.84);
      demoClickTimer = window.setTimeout(() => {
        if (token !== demoToken || !demoMode || el.hidden || document.hidden) return;
        selectTourRemark(row);
      }, clickDelay);
    }

    if (demoQueue.length > 1) {
      demoStepTimer = window.setTimeout(() => {
        runDemoStep(token, false);
      }, STEP_MS);
    }
  }

  function setDemo(on, { source = 'manual' } = {}) {
    if (!on) {
      stopDemo();
      return false;
    }
    if (el.hidden || noteMode) return false;
    const queue = buildTourQueue(activeRows, selectedRemark);
    if (!queue.length) return false;
    demoToken++;
    clearDemoTimers();
    demoMode = source;
    demoQueue = queue;
    demoIndex = 0;
    lastActivity = performance.now();
    notifyDemo();
    const token = demoToken;
    if (!map._loaded) map.whenReady(() => runDemoStep(token, true));
    else runDemoStep(token, true);
    return true;
  }

  function cancelFromContent() {
    lastActivity = performance.now();
    if (demoMode) stopDemo();
  }
  el.addEventListener('pointerdown', cancelFromContent, true);
  el.addEventListener('wheel', cancelFromContent, { capture: true, passive: true });
  el.addEventListener('touchstart', cancelFromContent, { capture: true, passive: true });
  map.on('dragstart', cancelFromContent);

  function onWindowActivity(e) {
    if (el.hidden) return;
    lastActivity = performance.now();
    if (!demoMode) return;
    if (e?.type !== 'pointermove' && e?.target?.closest?.('#demo, #full')) return;
    if (demoMode === 'idle') {
      stopDemo();
      return;
    }
    if (e?.type === 'pointermove') return;
    if (e?.type === 'keydown' && e.key === 'Escape') stopDemo();
  }
  const activityEvents = ['pointermove', 'pointerdown', 'wheel', 'keydown', 'touchstart'];
  for (const ev of activityEvents) window.addEventListener(ev, onWindowActivity, { passive: true });

  const idleCheckTimer = window.setInterval(() => {
    const hiddenNow = el.hidden || document.hidden;
    if (hiddenNow) {
      wasHidden = true;
      return;
    }
    if (wasHidden) {
      wasHidden = false;
      if (!demoMode) lastActivity = performance.now();
    }
    if (demoMode || reducedMotion() || noteMode || document.querySelector('dialog[open]')) return;
    if (performance.now() - lastActivity >= IDLE_MS) setDemo(true, { source: 'idle' });
  }, 500);

  if (matchMedia('(max-width:700px)').matches) {
    const button = el.querySelector('[data-command=feed]');
    button.setAttribute('aria-expanded', 'false');
    el.querySelector('#sent-feed-content').hidden = true;
    win.classList.add('is-collapsed');
  }
  layoutEl.dataset.demo = 'idle';
  layoutEl.dataset.demoMode = '';
  render();
  return {
    resize(refit = false) {
      map.invalidateSize();
      heat.redraw();
      if (first || (refit && !demoMode)) {
        fit();
        first = false;
      }
      scheduleConnector();
    },
    setNote,
    setDemo,
    isDemo: () => demoMode !== null,
    resetIdle,
    showNotes(notes, switchToNotes = false) {
      savedNotes = notes || [];
      pins.clearLayers();
      for (const n of savedNotes) {
        const m = L.marker([n.lat, n.lng], {
          title: 'Session note · ' + n.topic,
          icon: L.divIcon({ className: 'actual-note', html: '✎', iconSize: [24, 24] })
        }).addTo(pins);
        m.on('click', () => {
          selectedNoteId = n.id;
          selectedRemark = '';
          feedTab = 'notes';
          expandFeed();
          render();
          onMarker(n.id);
        });
      }
      if (switchToNotes) {
        feedTab = 'notes';
        selectedNoteId = savedNotes.length ? savedNotes[savedNotes.length - 1].id : '';
        selectedRemark = '';
        expandFeed();
      }
      render();
    },
    focus(coords) {
      map.setView(coords, 16.5);
      scheduleConnector();
    }
  };
}

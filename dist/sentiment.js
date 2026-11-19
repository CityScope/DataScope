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

export function createSentiment(el, { onNote, onMarker, onExplore }) {
  const L = window.L;
  const sourceButtons = (streamId) =>
    channels
      .filter((c) => c.stream === streamId)
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
    <div class="sent-filters"><button class="panel-toggle" data-command="filters" aria-expanded="true" aria-controls="sent-filter-content">Discussion filters<span>⌄</span></button><div id="sent-filter-content">
      <span class="sample-stamp" title="${provenance}">Fictional sample · not a public survey</span>
      <div class="sent-display" role="group" aria-label="Discussion display"><button data-heat="off" aria-pressed="false">By place</button><button data-heat="on" aria-pressed="true">Sentiment heatmap</button></div>
      <div class="stream-tabs" role="group" aria-label="Collection streams">
        <button type="button" data-stream-filter="all" aria-pressed="true">All</button>
        <button type="button" data-stream-filter="session" aria-pressed="false">${icon('workshop')}Sessions</button>
        <button type="button" data-stream-filter="social" aria-pressed="false">${icon('forum')}Social &amp; web</button>
      </div>
      <div class="source-groups" aria-label="Filter by discussion source">
        <div class="source-group">
          <span class="source-group-label">Engagement sessions</span>
          <div class="source-grid two">${sourceButtons('session')}</div>
        </div>
        <div class="source-group">
          <span class="source-group-label">Social media &amp; internet</span>
          <div class="source-grid two">${sourceButtons('social')}</div>
        </div>
      </div>
      <label>Topic <select data-filter="topic">${option(topics, 'All topics')}</select></label>
      <label>Project phase <select data-filter="phase">${option(phases, 'All phases')}</select></label>
      <button data-command="reset">Reset filters</button>
    </div></div>
    <div class="sent-layout">
      <section class="sent-figure">
        <div id="discussion-map" aria-label="Interactive discussion map"></div>
        <div class="map-signature">Allen Park <span>+ Melvindale</span></div>
        <div class="sent-map-tools"><select id="sent-base" aria-label="Discussion basemap"><option value="map">Light map</option><option value="satellite">Satellite</option></select><button data-command="fit" title="Reset map" aria-label="Reset discussion map">⌖</button><button data-command="in" aria-label="Zoom in on discussions">+</button><button data-command="out" aria-label="Zoom out from discussions">−</button></div>
        <div class="sent-note-prompt" hidden>Choose a place to pin your session note. <button data-command="cancel">Cancel</button></div>
        <div class="map-key">
          <strong>Viewpoints</strong>
          <div class="stance-buttons"></div>
          <div class="source-key" aria-label="Map icon legend">
            <div class="source-key-row"><span class="key-badges"><i class="key-pin session">${icon('workshop')}</i><i class="key-pin session">${icon('meeting')}</i></span><span>Engagement sessions</span></div>
            <div class="source-key-row"><span class="key-badges"><i class="key-pin social">${icon('x')}</i><i class="key-pin social">${icon('facebook')}</i><i class="key-pin social">${icon('reddit')}</i><i class="key-pin social">${icon('forum')}</i></span><span>Social media &amp; web</span></div>
          </div>
          <small id="discussion-map-key">Filled pins: engagement sessions · Ringed pins: social &amp; web.</small>
          <small class="heat-key">Heat: nearby remark density &amp; viewpoint mix.</small>
          <small class="proposal-key">◇ Proposed site</small>
          <small class="sample-note">Fictional discussion sample</small>
        </div>
      </section>
      <aside class="sent-feed"><button class="panel-toggle" data-command="feed" aria-expanded="true" aria-controls="sent-feed-content">Community discussions<span>⌄</span></button><div id="sent-feed-content"><div class="feed-heading"></div><div class="feed-rows"></div></div></aside>
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
    title: 'Proposed site',
    alt: 'Proposed site',
    icon: L.divIcon({ className: 'proposal-map-label', html: '◇', iconSize: [18, 18], iconAnchor: [9, 9] })
  })
    .bindTooltip('Proposed site')
    .addTo(map);
  L.control.scale({ imperial: true, metric: false, position: 'bottomright', maxWidth: 90 }).addTo(map);
  const groups = L.layerGroup().addTo(map),
    remarks = L.layerGroup().addTo(map),
    pins = L.layerGroup().addTo(map);
  const remarkMarkers = new Map();
  let activeRows = discussions,
    selectedRemark = '';

  function detailScale() {
    const zoom = map.getZoom();
    const size = Math.max(12.5, Math.min(28, 12.5 + (zoom - 13.8) * 3.6));
    el.querySelector('#discussion-map').style.setProperty('--pin-size', size.toFixed(1) + 'px');
    el.querySelector('#discussion-map').style.setProperty(
      '--pin-opacity',
      Math.max(0.86, Math.min(1, 0.86 + (zoom - 14) * 0.06))
    );
  }
  map.on('zoom', detailScale);

  const filters = { topic: '', phase: '', stance: '' };
  const activeSources = new Set(allChannelIds);
  let selected = '',
    noteMode = false,
    first = true;

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
      paddingTopLeft: window.innerWidth > 700 ? [304, 96] : [26, 175],
      paddingBottomRight: window.innerWidth > 700 ? [322, 52] : [26, 130],
      maxZoom: 16.5,
      animate: false
    });
  }

  function setNote(on) {
    noteMode = on;
    el.querySelector('.sent-note-prompt').hidden = !on;
    el.querySelector('#discussion-map').classList.toggle('pinning', on);
  }

  map.on('click', (e) => {
    if (noteMode) {
      setNote(false);
      onNote([e.latlng.lat, e.latlng.lng]);
    }
  });

  function choose(id) {
    selected = id;
    selectedRemark = '';
    render();
    if (id) {
      el.querySelector('[data-command=feed]').setAttribute('aria-expanded', 'true');
      el.querySelector('#sent-feed-content').hidden = false;
      const zone = zones.find((z) => z.id === id);
      map.panInside(zone.center, { padding: [56, 60] });
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
    selected = row.zoneId;
    heatMode = true;
    render();
    el.querySelector('[data-command=feed]').setAttribute('aria-expanded', 'true');
    el.querySelector('#sent-feed-content').hidden = false;
    el.querySelector('.feed-rows').scrollTop = 0;
    if (locate) {
      const zoom = Math.max(17.5, map.getZoom());
      if (matchMedia('(prefers-reduced-motion:reduce)').matches)
        map.setView(row.coords, zoom, { animate: false });
      else map.flyTo(row.coords, zoom, { duration: 0.65 });
    } else {
      const wide = window.innerWidth > 700,
        size = map.getSize();
      map.panInside(row.coords, {
        paddingTopLeft: [wide ? 286 : 32, wide ? 100 : 165],
        paddingBottomRight: [wide ? 316 : 32, wide ? 70 : Math.min(size.y * 0.45 + 40, size.y - 220)]
      });
    }
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
      ? 'Filled pins: sessions · Ringed pins: social & web.'
      : 'Rings: viewpoint mix · numbers: remarks.';
    el.querySelector('.source-key').hidden = !heatMode;
    el.querySelector('.heat-key').hidden = !heatMode;
    el.querySelectorAll('[data-heat]').forEach((b) =>
      b.setAttribute('aria-pressed', (b.dataset.heat === 'on') === heatMode)
    );
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
    el.querySelector('.stance-buttons').innerHTML = stances
      .map(
        (s) =>
          '<button class="stance-key" data-stance="' +
          s.id +
          '" aria-pressed="' +
          (filters.stance === s.id) +
          '"><i style="--stance:' +
          colors[s.id] +
          '"></i>' +
          s.label +
          '</button>'
      )
      .join('');

    const sessionCount = visible.filter((r) => r.stream === 'session').length;
    const socialCount = visible.length - sessionCount;
    const heading = el.querySelector('.feed-heading');
    heading.innerHTML =
      '<span class="kicker">Discussion sample</span><h2>' +
      (selected ? zoneName(selected) : 'Across the district') +
      '</h2><div class="feed-sub"><b>' +
      visible.length +
      ' mapped remarks</b>' +
      (selected
        ? '<button data-command="all">All places</button><button data-command="explore">Open in editor</button>'
        : '<span>' +
          zones.filter((z) => rows.some((r) => r.zoneId === z.id)).length +
          ' places</span>') +
      '</div><div class="feed-stream-summary"><span data-stream="session">' +
      icon('workshop') +
      '<b>' +
      sessionCount +
      '</b> sessions</span><span data-stream="social">' +
      icon('forum') +
      '<b>' +
      socialCount +
      '</b> social &amp; web</span></div>';

    const values = counts(visible);
    const breakdown = document.createElement('div');
    breakdown.className = 'sent-breakdown';
    breakdown.innerHTML =
      '<div class="sent-stack" aria-hidden="true">' +
      values
        .map(
          (n, i) =>
            '<i style="width:' +
            (visible.length ? (n / visible.length) * 100 : 0) +
            '%;background:' +
            colors[stances[i].id] +
            '"></i>'
        )
        .join('') +
      '</div><div class="sent-totals">' +
      stances
        .map(
          (stance, i) =>
            '<button data-stance="' +
            stance.id +
            '" aria-pressed="' +
            (filters.stance === stance.id) +
            '"><b style="color:' +
            colors[stance.id] +
            '">' +
            values[i] +
            '</b><span>' +
            stance.label +
            '</span></button>'
        )
        .join('') +
      '</div>';
    heading.append(breakdown);

    const list = el.querySelector('.feed-rows');
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
      locate.textContent = 'Show on map';
      locate.onclick = () => chooseRemark(r.id, true);
      body.append(locate);
      article.append(body);
      list.append(article);
    }
    if (!visible.length)
      list.innerHTML = '<p class="empty-result">No sample threads match these filters.</p>';
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
    const btn = e.target.closest('button');
    if (!btn) return;
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
    if (['filters', 'feed'].includes(btn.dataset.command)) {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', open);
      el.querySelector('#' + btn.getAttribute('aria-controls')).hidden = !open;
      return;
    }
    switch (btn.dataset.command) {
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

  if (matchMedia('(max-width:700px)').matches)
    for (const name of ['filters', 'feed']) {
      const button = el.querySelector('[data-command=' + name + ']');
      button.setAttribute('aria-expanded', 'false');
      el.querySelector('#' + button.getAttribute('aria-controls')).hidden = true;
    }
  render();
  return {
    resize(refit = false) {
      map.invalidateSize();
      heat.redraw();
      if (first || refit) {
        fit();
        first = false;
      }
    },
    setNote,
    showNotes(notes) {
      pins.clearLayers();
      for (const n of notes) {
        const m = L.marker([n.lat, n.lng], {
          title: 'Session note · ' + n.topic,
          icon: L.divIcon({ className: 'actual-note', html: '✎', iconSize: [23, 23] })
        }).addTo(pins);
        m.on('click', () => onMarker(n.id));
      }
    },
    focus(coords) {
      map.setView(coords, 17);
    }
  };
}

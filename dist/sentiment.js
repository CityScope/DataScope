import { zones, discussions, stances, topics, phases, channels, provenance } from './sentiment-data.js';
import { site, river } from './geography.js';

const colors = { supportive: '#077968', conditional: '#cc9c32', concerned: '#bd523b' };
const label = (options, id) => options.find((item) => item.id === id)?.label;
const zoneName = (id) => zones.find((z) => z.id === id)?.name;
const northMeters = 111320,
  eastMeters = northMeters * Math.cos((site.center[0] * Math.PI) / 180);
const corner = (x, z) => [site.center[0] - z / northMeters, site.center[1] + x / eastMeters];
const bounds = [corner(-780, 650), corner(1020, -850)];
const option = (items, all) =>
  '<option value="">' +
  all +
  '</option>' +
  items.map((x) => '<option value="' + x.id + '">' + x.label + '</option>').join('');
const counts = (rows) => stances.map((s) => rows.filter((row) => row.stance === s.id).length);
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
  el.innerHTML = `
    <div class="sent-filters">
      <span class="sample-stamp">Fictional sample</span>
      <label>Topic <select data-filter="topic">${option(topics, 'All topics')}</select></label>
      <label>Project phase <select data-filter="phase">${option(phases, 'All phases')}</select></label>
      <label>Source <select data-filter="channel">${option(channels, 'All sources')}</select></label>
      <button data-command="reset">Reset filters</button>
    </div>
    <div class="sent-layout">
      <section class="sent-figure">
        <div id="discussion-map" aria-label="Interactive discussion map"></div>
        <div class="map-signature">Allen Park <span>+ Melvindale</span></div>
        <div class="sent-map-tools"><button data-command="fit" title="Show all places" aria-label="Show all places">⌖</button><button data-command="in" aria-label="Zoom in on discussions">+</button><button data-command="out" aria-label="Zoom out from discussions">−</button></div>
        <div class="sent-note-prompt" hidden>Choose a place to pin your workshop note. <button data-command="cancel">Cancel</button></div>
        <div class="map-key"><strong>Viewpoints</strong><div class="stance-buttons"></div><small>Number inside each ring counts sample discussions.</small></div>
      </section>
      <aside class="sent-feed"><div class="feed-heading"></div><div class="feed-rows"></div></aside>
    </div>
    <div class="sent-foot"><span>${provenance}</span><span>Generalized district plan · CityScope</span></div>`;
  const map = L.map(el.querySelector('#discussion-map'), {
    zoomControl: false,
    attributionControl: false,
    zoomSnap: 0.1,
    minZoom: 14,
    maxZoom: 19,
    maxBounds: L.latLngBounds(bounds).pad(0.45),
    maxBoundsViscosity: 0.8
  });
  L.imageOverlay('./assets/district-plan.webp', bounds, { opacity: 0.9, interactive: false }).addTo(map);
  L.polyline(river, { weight: 2, color: '#347a87', opacity: 0.65, interactive: false }).addTo(map);
  L.polygon(site.boundary, {
    color: '#497f6d',
    weight: 1.5,
    dashArray: '4 3',
    fillOpacity: 0.07,
    interactive: false
  }).addTo(map);
  L.marker(site.center, { interactive: false, icon: L.divIcon({ className: 'proposal-map-label', html: 'Proposed site', iconSize: [77, 20], iconAnchor: [39, -26] }) }).addTo(map);
  L.control.scale({ imperial: true, metric: false, position: 'bottomright', maxWidth: 90 }).addTo(map);
  const groups = L.layerGroup().addTo(map),
    pins = L.layerGroup().addTo(map);
  const filters = { topic: '', phase: '', channel: '', stance: '' };
  let selected = '',
    noteMode = false,
    first = true;
  const markerLabel = (zone, rows) => {
    const button = document.createElement('button');
    button.className = 'zone-target';
    button.setAttribute('aria-label', zone.name + ', ' + rows.length + ' sample discussions');
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
    map.fitBounds(L.latLngBounds(zones.map((z) => z.center)), {
      paddingTopLeft: [42, 58],
      paddingBottomRight: [60, 150],
      maxZoom: 17,
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
    render();
    if (id) {
      const zone = zones.find((z) => z.id === id);
      map.panInside(zone.center, { padding: [56, 60] });
    }
  }
  function render() {
    const rows = discussions.filter((r) => Object.entries(filters).every(([k, v]) => !v || r[k] === v));
    if (!rows.some((r) => r.zoneId === selected)) selected = '';
    const visible = rows.filter((r) => !selected || r.zoneId === selected);
    groups.clearLayers();
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
    const heading = el.querySelector('.feed-heading');
    heading.innerHTML =
      '<span class="kicker">Discussion sample</span><h2>' +
      (selected ? zoneName(selected) : 'Across the district') +
      '</h2><div class="feed-sub"><b>' +
      visible.length +
      ' threads</b>' +
      (selected
        ? '<button data-command="all">All places</button><button data-command="explore">View on table</button>'
        : '<span>' +
          zones.filter((z) => rows.some((r) => r.zoneId === z.id)).length +
          ' places</span>') +
      '</div>';
    const list = el.querySelector('.feed-rows');
    list.replaceChildren();
    const byZone = zones.map((z) => visible.filter((row) => row.zoneId === z.id));
    const levels = Math.max(0, ...byZone.map((group) => group.length));
    const ordered = Array.from({ length: levels }, (_, i) =>
      byZone.map((group) => group[i]).filter(Boolean)
    ).flat();
    for (const r of ordered) {
      const article = document.createElement('details');
      article.className = 'thread';
      article.style.setProperty('--stance', colors[r.stance]);
      const summary = document.createElement('summary');
      summary.innerHTML =
        '<small><i></i>' +
        label(stances, r.stance) +
        ' <b>·</b> ' +
        label(channels, r.channel) +
        '</small><strong>' +
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
      locate.onclick = () => {
        map.setView(r.coords, Math.max(17, map.getZoom()));
        L.popup()
          .setLatLng(r.coords)
          .setContent(summary.querySelector('strong').cloneNode(true))
          .openOn(map);
      };
      body.append(locate);
      article.append(body);
      list.append(article);
    }
    if (!visible.length)
      list.innerHTML = '<p class="empty-result">No sample threads match these filters.</p>';
  }
  el.addEventListener('change', (e) => {
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
    if (btn.dataset.stance) {
      filters.stance = filters.stance === btn.dataset.stance ? '' : btn.dataset.stance;
      map.closePopup();
      render();
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
        map.zoomIn();
        break;
      case 'out':
        map.zoomOut();
        break;
      case 'cancel':
        setNote(false);
        break;
      case 'explore':
        if (selected) onExplore(zones.find((z) => z.id === selected).center, selected);
        break;
      case 'reset':
        Object.keys(filters).forEach((k) => (filters[k] = ''));
        el.querySelectorAll('select').forEach((s) => (s.value = ''));
        map.closePopup();
        choose('');
        fit();
        break;
    }
  });
  render();
  return {
    resize() {
      map.invalidateSize();
      if (first) {
        fit();
        first = false;
      }
    },
    setNote,
    showNotes(notes) {
      pins.clearLayers();
      for (const n of notes) {
        const m = L.marker([n.lat, n.lng], {
          title: 'Workshop note · ' + n.topic,
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

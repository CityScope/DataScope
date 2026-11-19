import { createBasemap } from './basemaps.js';
import { createSentimentHeat } from './sentiment-heat.js';
import { zones, discussions, stances, topics, phases, channels, provenance } from './sentiment-data.js';
import { site, river } from './geography.js';

const colors = { supportive: '#077968', conditional: '#cc9c32', concerned: '#bd523b' };
const label = (options, id) => options.find((item) => item.id === id)?.label;
const zoneName = (id) => zones.find((z) => z.id === id)?.name;
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
      <div class="sent-display" role="group" aria-label="Discussion display"><button data-heat="off" aria-pressed="false">By place</button><button data-heat="on" aria-pressed="true">Sentiment heatmap</button></div>
      <label>Topic <select data-filter="topic">${option(topics, 'All topics')}</select></label>
      <label>Project phase <select data-filter="phase">${option(phases, 'All phases')}</select></label>
      <label>Source <select data-filter="channel">${option(channels, 'All sources')}</select></label>
      <button data-command="reset">Reset filters</button>
    </div>
    <div class="sent-layout">
      <section class="sent-figure">
        <div id="discussion-map" aria-label="Interactive discussion map"></div>
        <div class="map-signature">Allen Park <span>+ Melvindale</span></div>
        <div class="sent-map-tools"><select id="sent-base" aria-label="Discussion basemap"><option value="map">Street map</option><option value="satellite">Satellite</option></select><button data-command="fit" title="Show all places" aria-label="Show all places">⌖</button><button data-command="in" aria-label="Zoom in on discussions">+</button><button data-command="out" aria-label="Zoom out from discussions">−</button></div>
        <div class="sent-note-prompt" hidden>Choose a place to pin your workshop note. <button data-command="cancel">Cancel</button></div>
        <div class="map-key"><strong>Viewpoints</strong><div class="stance-buttons"></div><small>Rings show each place’s viewpoint mix.</small><small class="heat-key">Heat: leading viewpoint · intensity: sample activity.</small><small class="proposal-key">◇ Proposed site</small></div>
      </section>
      <aside class="sent-feed"><div class="feed-heading"></div><div class="feed-rows"></div></aside>
    </div>
    <div class="sent-foot"><span>${provenance}</span><span>North-up · Allen Park and Melvindale</span></div>`;
  const map = L.map(el.querySelector('#discussion-map'), {
    zoomControl: false,
    attributionControl: true,
    zoomSnap: 0.1,
    minZoom: 11,
    maxZoom: 19,
    maxBoundsViscosity: 0.8
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
  L.marker(site.center, { title: 'Proposed site', alt: 'Proposed site', icon: L.divIcon({ className: 'proposal-map-label', html: '◇', iconSize: [18, 18], iconAnchor: [9, 9] }) }).bindTooltip('Proposed site').addTo(map);
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
      paddingBottomRight: [60, 185],
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
    heat.update(rows, heatMode);
    el.querySelector('.heat-key').hidden = !heatMode;
    el.querySelectorAll('[data-heat]').forEach((b) => b.setAttribute('aria-pressed', (b.dataset.heat === 'on') === heatMode));
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
      ' discussions</b>' +
      (selected
        ? '<button data-command="all">All places</button><button data-command="explore">View on table</button>'
        : '<span>' +
          zones.filter((z) => rows.some((r) => r.zoneId === z.id)).length +
          ' places</span>') +
      '</div>';
    const values = counts(visible);
    const breakdown = document.createElement('div');
    breakdown.className = 'sent-breakdown';
    breakdown.innerHTML = '<div class="sent-stack" aria-hidden="true">' + values.map((n,i)=>'<i style="width:'+ (visible.length ? n/visible.length*100 : 0) +'%;background:'+colors[stances[i].id]+'"></i>').join('') + '</div><div class="sent-totals">' + stances.map((stance,i)=>'<button data-stance="'+stance.id+'" aria-pressed="'+(filters.stance===stance.id)+'"><b style="color:'+colors[stance.id]+'">'+values[i]+'</b><span>'+stance.label+'</span></button>').join('') + '</div>';
    heading.append(breakdown);
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
    if (e.target.id === 'sent-base') { basemap.setBase(e.target.value); return; }
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
    if (btn.dataset.heat) { heatMode = btn.dataset.heat === 'on'; render(); return; }
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
        el.querySelectorAll('[data-filter]').forEach((s) => (s.value = ''));
        map.closePopup();
        choose('');
        fit();
        break;
    }
  });
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

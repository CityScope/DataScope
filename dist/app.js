import { createSentiment } from './sentiment.js';
import { loadEnvironmentalLayers, onEnvironmentChange, environmentalSources, environmentalState } from './environment.js';
import { evaluateConstraints, nearbyConstraints } from './studio/constraints.js';
import { site, places, sources } from './geography.js';
import { createReadouts, methodsHTML } from './studio/readouts.js';
import { designSpecs } from './studio/analysis.js';
import { normalizeBearing } from './studio/rotation.js';
import { createMap } from './map.js';
import { icon, hydrateIcons } from './icons.js';
import {
  loadWorkspace,
  saveWorkspace,
  isStudyPoint,
  WORKSHOP_LIMITS,
  setbackOption
} from './workshop.js';

const $ = (id) => document.getElementById(id);
const escapeHTML = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (x) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[x]
  );
const id = () => crypto.randomUUID();
const topics = ['Question', 'Suggestion', 'Concern', 'Local knowledge'];
const designs = designSpecs;
const state = loadWorkspace(site.center);
const ui = {
  view: 'studio',
  camera: 'site',
  mode: 'explore',
  layers: { places: true, site: true, river: true, notes: true, sound: true, constraints: true, environment: true },
  planLayers: { places: true, site: true, river: true, notes: true, sound: true, constraints: true, environment: true },
  selectedNote: null,
  lens: 'sound',
  receptorId: 'riel'
};
const dialog = $('dialog');
const updateReadouts = createReadouts($('metrics'));
let timer,
  map,
  studio,
  aerial,
  sentiment,
  sceneContains = () => true,
  unavailable = false,
  previousCustom = null,
  mapCenter = site.center;
const noBuild = () => state.active === 'none';

function scenarioName(which = state.active) {
  if (which === 'proposal') return 'Proposed site';
  if (which === 'setback') return setbackOption.name;
  if (which === 'custom') return 'My placement';
  if (which === 'none') return 'No build';
  return state.scenarios.find((s) => s.id === which)?.name || 'Saved placement';
}
function snapshot() {
  return { point: state.point && [...state.point], angle: state.angle, design: state.design };
}
function remember() {
  if (state.active === 'custom') previousCustom = snapshot();
}
function store(replace = false) {
  const sessionSaved = saveWorkspace(state, { replace });
  $('local-status').innerHTML = sessionSaved
    ? '<b></b> Saved on this device'
    : 'Browser storage unavailable · notes are temporary';
}
function toast(message) {
  clearTimeout(timer);
  $('toast').textContent = message;
  $('toast').hidden = false;
  timer = setTimeout(() => {
    $('toast').hidden = true;
  }, 3600);
}
function renderControls() {
  const opts = [
    ['proposal', 'Proposed site'],
    ['setback', setbackOption.name],
    ['custom', 'My placement'],
    ['none', 'No build'],
    ...state.scenarios.map((s) => [s.id, s.name])
  ];
  const select = $('placement');
  select.replaceChildren(...opts.map(([k, name]) => new Option(name, k)));
  select.value = state.active;
  $('count').textContent = state.notes.length;
  $('notes').setAttribute('aria-label', 'Session notes (' + state.notes.length + ')');
  document.querySelector('[data-camera="building"]').disabled = noBuild();
  if (noBuild() && ui.camera === 'building') studio?.view('site');
  $('design-choices')
    .querySelectorAll('button')
    .forEach((b) => {
      b.disabled = noBuild();
      b.setAttribute('aria-pressed', !noBuild() && b.dataset.design === state.design);
    });
  const spec = designs[state.design] || designs.reference;
  $('design-detail').textContent = noBuild() ? '' : spec.detail;
  $('design-specs').hidden = noBuild();
  if (!noBuild()) {
    $('design-specs').innerHTML =
      '<div><span>Summer peak</span><b>' +
      spec.peakMW.toFixed(1) +
      ' MW</b></div><div><span>Source @ 15 m</span><b>' +
      spec.sourceDb15.toFixed(1) +
      ' dBA</b></div><div><span>Est. grid CO₂</span><b>' +
      spec.co2KtYr.toFixed(0) +
      'k t/yr</b></div>';
  }
  $('design-caption').textContent = noBuild() ? 'No facility placed' : 'Same 17.3 MW IT load · Zone 5A (MI)';
}
function renderMetrics(point = state.point, angle = state.angle) {
  const current = { ...state, point, angle };
  updateReadouts(current, ui.receptorId);
  const check = evaluateConstraints(current);
  const warningTitles=[...new Set(check.items.map(i=>i.title))];
  const finding=$('context-finding');
  finding.dataset.status=check.status;
  finding.title=warningTitles.join(' · ');
  finding.textContent=check.items.length ? warningTitles.slice(0,2).join(' · ')+(warningTitles.length>2?' · +'+(warningTitles.length-2)+' more':'') : point ? 'No overlap with loaded constraints' : 'Choose a placement';
  $('context-distances').innerHTML=nearbyConstraints(current).slice(0,3).map(i=>'<span>'+escapeHTML(i.label)+' <b>'+Math.round(i.distance*3.28084).toLocaleString()+' ft</b></span>').join('');
  const pending=environmentalState.filter(s=>s.state==='loading'), missing=environmentalState.filter(s=>s.state==='unavailable');
  $('environment-status').textContent=pending.length ? 'Loading '+pending.map(s=>s.label.toLowerCase()).join(', ')+'…' : missing.length ? 'Unavailable: '+missing.map(s=>s.label.toLowerCase()).join(', ') : 'Source overlays loaded · boundaries require review';
  $('retry-environment').hidden=!missing.length;
  $('environment-status').dataset.state=missing.length?'unavailable':pending.length?'loading':'ready';
  const hasFinding = check.items.length > 0;
  const banner = $('siting-check');
  banner.dataset.status = check.status;
  banner.textContent = hasFinding
    ? (check.status === 'conflict' ? 'Conflict' : 'Review') + ' · ' + warningTitles.length
    : check.status === 'none'
      ? 'No build'
      : 'No overlap';
  banner.setAttribute('aria-label', 'Placement check: ' + banner.textContent + (hasFinding ? '. ' + warningTitles.join('. ') : ''));
  banner.title = hasFinding
    ? check.items.map((item) => item.detail).join(' ')
    : 'Screens mapped railways, roads, river, buildings and land uses, plus environmental overlays that have loaded.';
}

function renderDesigns() {
  $('design-choices').innerHTML = Object.entries(designs)
    .map(
      ([key, d]) =>
        '<button class="design-card" data-design="' +
        key +
        '"><img aria-hidden="true" alt="" src="assets/design-' +
        key +
        '.webp"><span><strong>' +
        d.name +
        '</strong><small>' +
        d.subtitle +
        '</small></span><i class="radio"></i></button>'
    )
    .join('');
}

function notesPanel() {
  const list = [...state.notes]
    .reverse()
    .map(
      (n) =>
        '<button class="note-card" data-note="' +
        escapeHTML(n.id) +
        '"><span>' +
        escapeHTML(n.topic) +
        '</span><p>' +
        escapeHTML(n.text.length > 100 ? n.text.slice(0, 97) + '…' : n.text) +
        '</p><small>' +
        escapeHTML(n.scenario) +
        '</small></button>'
    )
    .join('');
  return (
    '<p class="hint">Your notes from this browser, separate from the fictional discussions on the sentiment map. Each note keeps its location and scenario.</p><button class="wide" data-act="add-note">' +
    icon('pinplus') +
    'Place a note</button>' +
    (list ||
      '<div class="empty">' +
        icon('note') +
        '<h3>No session notes yet</h3><p class="hint">Choose a street, park or other place to leave your first question.</p></div>') +
    '<p class="minor">Notes are saved only in this browser on this device. They stay here after you refresh or reopen the site.</p>'
  );
}
const cityRecords =
  'https://www.cityofallenpark.org/government/agenda_and_minutes/planning_commission.php';
function evidencePanel() {
  return (
    '<p class="hint">Allen Park’s Planning Commission denied the preliminary site plan on June 4, 2026. Its findings included unresolved engineering questions and noise near homes and a public park.</p><div class="ref"><a target="_blank" rel="noopener" href="' +
    cityRecords +
    '">City planning record</a><p>7500 Enterprise Drive · Parcel 30-008-99-0001-712. Review the June decision and the January site drawings. The applicant moved outdoor equipment west so the building could shield the park and homes to the east.</p></div><div class="ref"><h3>Workshop assumptions</h3><p>The movable architectural model uses an illustrative 90 × 46 m footprint, approximately 45,000 sq ft. Neighborhood buildings, trees, and heights are generalized. The surveyed property, site layout, and engineering design require their own records.</p><p>Equipment sound uses a two-source ISO 9613-2 propagation model (west mechanical yard + rooftop cooling units) with 3D building barrier shielding, cooling-system source levels, and atmospheric/ground attenuation. River clearance and Enterprise Drive utility run are measured from the rotated building edge. Site suitability, formal acoustic modeling, water service, and available grid capacity require further study.</p></div><div class="ref"><h3>Energy, peak load &amp; water (ASHRAE Zone 5A)</h3><p>All three cooling designs serve the same 17.3 MW peak IT workload (13.9 MW average at 80% load = 121.5 GWh/yr IT) in Southeast Michigan. Reference evaporative towers assume PUE 1.50 (26.0 MW peak) and LBNL WUE 1.65 L/kWh; higher-efficiency air-side economizers assume PUE 1.25 (22.9 MW hot-day peak) and WUE 0.38 L/kWh; closed-loop dry cooling assumes PUE 1.58 (29.1 MW hot-day peak) and WUE 0.012 L/kWh. Grid CO₂ uses the US EPA eGRID RFCM (Michigan) factor of 0.489 t CO₂/MWh.</p></div>' +
    sources
      .map(
        (s) =>
          '<div class="ref"><a target="_blank" rel="noopener" href="' +
          escapeHTML(s.url) +
          '">' +
          escapeHTML(s.title) +
          '</a><p>' +
          escapeHTML(s.description) +
          '</p></div>'
      )
      .join('')
  );
}
function drawMap() {
  map?.render({
    ...state,
    mode: ui.mode,
    layers: ui.view === 'plan' ? ui.planLayers : ui.layers,
    selectedNote: ui.selectedNote,
    lens: ui.lens,
    receptorId: ui.receptorId
  });
  $('modebar').hidden = ui.mode === 'explore';
  if (ui.mode !== 'explore')
    $('modebar').innerHTML =
      '<b>' +
      (ui.mode === 'note' ? 'Choose a place for your note' : 'Choose a site for the building') +
      '</b><div class="mode-actions"><button data-act="center">Use view center</button><button data-act="cancel-mode">Cancel</button></div>';
}
function render() {
  sentiment?.showNotes(state.notes);
  renderControls();
  renderMetrics();
  drawMap();
}
function setMode(mode) {
  if (dialog.open) closeDialog();
  if (ui.view === 'sentiment') {
    sentiment?.setNote(mode === 'note');
    return;
  }
  ui.mode = mode;
  $('layers-menu').hidden = true;
  $('layers').setAttribute('aria-expanded', 'false');
  if (mode !== 'explore' && ui.view === 'studio') map?.view('district');
  drawMap();
}
function viewControls() {
  $('zin').disabled=false; $('zout').disabled=false;
  const listening = ui.view === 'sentiment';
  document.body.dataset.workspace = listening ? 'sentiment' : 'scenario';
  document
    .querySelectorAll('[data-workview]')
    .forEach((b) =>
      b.setAttribute('aria-pressed', b.dataset.workview === (listening ? 'sentiment' : 'studio'))
    );
  $('workspace-title').textContent = listening
    ? 'Sentiment map · Allen Park, Michigan'
    : 'Scenario Editor · Allen Park, Michigan';
  document.querySelector('.workbench').hidden = listening;
  document.querySelector('.analysis').hidden = listening;
  $('sentiment').hidden = !listening;
  document.querySelector('.cam-modes').hidden = listening;
  document.querySelector('.aerial-modes').hidden = ui.view !== 'plan';
  $('map').hidden = ui.view !== 'plan';
  $('scene').hidden = ui.view !== 'studio';
}
function closeEditorOnSmallScreen() {
  if (!matchMedia('(max-width:700px)').matches) return;
  $('editor-toggle').setAttribute('aria-expanded','false');
  $('editor-content').hidden=true;
}
function setCamera(view) {
  ui.camera = view;
  $('editor-current').textContent = {building:'Building design',site:'Site layout',district:'Neighborhood',plan:'Map overview'}[view];
  $('editor-toggle').setAttribute('aria-label','Views and placement: ' + $('editor-current').textContent);
  $('stage').dataset.camera = view;
  renderMetrics();
  document
    .querySelectorAll('[data-camera]')
    .forEach((b) => b.setAttribute('aria-pressed', b.dataset.camera === view));
}
function aerialMap() {
  return (aerial ??= createMap($('map'), {
    onZoomChange: ({canIn,canOut}) => {if(ui.view==='plan'){$('zin').disabled=!canIn;$('zout').disabled=!canOut;}},
    onPlace: placeAt,
    onNote: addNoteAt,
    onMarker: showNote,
    onPreview: renderMetrics,
    onMoveEnd: (c) => {
      if (ui.view === 'plan') mapCenter = c;
    }
  }));
}
function changeView(view, notify = true) {
  if (view === 'sentiment') {
    ui.view = view;
    ui.mode = 'explore';
    viewControls();
    map = undefined;
    sentiment ??= createSentiment($('sentiment'), {
      onNote: addNoteAt,
      onMarker: showNote,
      onExplore: (point, zoneId) => {
        const receptor = { park: 'riel', rail: 'riel', school: 'melvindale', maple: 'maple' }[zoneId];
        if (receptor) {
          ui.receptorId = receptor;
          $('receiver').value = receptor;
        }
        ui.lens = ['river', 'upper-stream', 'downstream'].includes(zoneId)
          ? 'water'
          : zoneId === 'enterprise'
            ? 'parcel'
            : 'sound';
        changeView('studio');
        drawMap();
        renderMetrics();
        if (ui.view === 'studio') studio.view('district');
        else focusPoint(point);
      }
    });
    sentiment.showNotes(state.notes);
    sentiment.resize();
    return;
  }
  sentiment?.setNote(false);
  if (view === 'studio' && (!studio || unavailable || (state.point && !sceneContains(state.point))))
    view = 'plan';
  const changed = view !== ui.view;
  ui.view = view;
  ui.mode = 'explore';
  viewControls();
  if (view === 'plan') { $('loading').hidden = true; setCamera('plan'); }
  map = view === 'studio' ? studio : aerialMap();
  map?.resize();
  drawMap();
  if (changed && state.point) {
    map?.focus(state.point);
  } else if (changed) {
    map?.home();
  }
  $('layers-menu').hidden = true;
  $('layers').setAttribute('aria-expanded', 'false');
}
function focusPoint(point) {
  if (ui.view === 'sentiment') {
    sentiment?.focus(point);
    return;
  }
  if (ui.view === 'studio' && !sceneContains(point)) changeView('plan', false);
  map?.focus(point);
}

function rotateAt(angle) {
  if (!state.point) return;
  state.angle = normalizeBearing(angle);
  state.active = 'custom';
  store();
  render();
}

function placeAt(point) {
  if (!isStudyPoint(point)) {
    drawMap();
    renderMetrics();
    toast('Choose a point inside the Allen Park study area.');
    return;
  }
  state.active = 'custom';
  state.point = point.map((n) => Math.round(n * 1e6) / 1e6);
  ui.mode = 'explore';
  store();
  render();
}
function choose(key) {
  remember();
  ui.mode = 'explore';
  if (key === 'custom') {
    if (previousCustom) Object.assign(state, previousCustom, { active: 'custom' });
    else Object.assign(state, { active: 'custom', point: state.point || [...site.center] });
    ui.mode = 'place';
  } else if (key === 'none')
    Object.assign(state, { active: 'none', point: null, angle: 0, design: 'reference' });
  else if (key === 'setback')
    Object.assign(state, { active: key, point: [...setbackOption.point], angle: setbackOption.angle, design: setbackOption.design });
  else if (key === 'proposal')
    Object.assign(state, { active: key, point: [...site.center], angle: 0, design: 'reference' });
  else {
    const s = state.scenarios.find((s) => s.id === key);
    if (!s) return;
    Object.assign(state, { active: s.id, point: [...s.point], angle: s.angle, design: s.design });
  }
  if (state.point && key !== 'custom') focusPoint(state.point);
  if (key === 'custom' && ui.view === 'studio') map?.view('district');
  store();
  render();
}
function showDialog(title, html, large = false) {
  $('dialog-title').textContent = title;
  $('dialog-body').innerHTML = html;
  dialog.classList.toggle('large', large);
  if (!dialog.open) dialog.showModal();
}
function closeDialog() {
  dialog.close();
}
function addNoteAt(point) {
  if (!isStudyPoint(point)) {
    toast('Choose a point inside the Allen Park study area.');
    return;
  }
  if (state.notes.length >= WORKSHOP_LIMITS.notes) {
    toast('This workshop has reached its note limit.');
    return;
  }
  ui.mode = 'explore';
  drawMap();
  showDialog(
    'Add a session note',
    '<form id="note-form"><p class="hint">Pinned on the map · ' +
      escapeHTML(scenarioName()) +
      '</p><label class="field">Topic<select name="topic">' +
      topics.map((t) => '<option>' + t + '</option>').join('') +
      '</select></label><label class="field">Your note<textarea name="text" required maxlength="1200" placeholder="What should others know about this place?"></textarea></label><p class="minor">Saved on this device with the current footprint and design.</p><div class="dialog-actions"><button type="button" data-act="close">Cancel</button><button class="primary" type="submit">Save note</button></div></form>'
  );
  const form = $('note-form');
  form.elements.text.focus();
  form.onsubmit = (e) => {
    e.preventDefault();
    const text = form.elements.text.value.trim();
    if (!text) {
      form.elements.text.focus();
      return;
    }
    const n = {
      id: id(),
      lat: point[0],
      lng: point[1],
      topic: form.elements.topic.value,
      text,
      scenario: scenarioName(),
      placement: snapshot(),
      createdAt: new Date().toISOString()
    };
    state.notes.push(n);
    ui.layers.notes = true;
    ui.selectedNote = n.id;
    store();
    closeDialog();

    render();
    toast('Note saved at this place.');
  };
}
function showNote(noteId) {
  const n = state.notes.find((x) => x.id === noteId);
  if (!n) return;
  ui.selectedNote = n.id;
  ui.mode = 'explore';

  focusPoint([n.lat, n.lng]);
  drawMap();
  showDialog(
    n.topic,
    '<p class="note-full">' +
      escapeHTML(n.text) +
      '</p><p class="minor">' +
      escapeHTML(n.scenario) +
      ' · ' +
      escapeHTML(new Date(n.createdAt).toLocaleDateString()) +
      '</p><div class="dialog-actions">' +
      (n.placement
        ? '<button data-restore="' +
          escapeHTML(n.id) +
          '">' +
          icon('footprint') +
          'View attached placement</button>'
        : '') +
      '<button data-act="close">Done</button></div>'
  );
}
function toggleLayerMenu() {
  const menu = $('layers-menu'),
    opening = menu.hidden;
  menu.hidden = !opening;
  $('layers').setAttribute('aria-expanded', opening);
  if (opening)
    menu.innerHTML = Object.entries({
      sound: 'Equipment sound field',
      constraints: 'Land uses & exclusions',
      environment: 'Environmental overlays',
      site: 'Proposed parcel',
      river: 'Ecorse River',
      places: 'Community places',
      notes: 'Session notes'
    })
      .map(
        ([k, label]) =>
          '<label><input type="checkbox" data-layer="' +
          k +
          '" ' +
          ((ui.view === 'plan' ? ui.planLayers : ui.layers)[k] ? 'checked' : '') +
          '>' +
          label +
          '</label>'
      )
      .join('');
}
function toggleFull() {
  if (document.fullscreenElement)
    document.exitFullscreen().catch(() => toast('Full screen is unavailable.'));
  else if (document.documentElement.requestFullscreen)
    document.documentElement.requestFullscreen().catch(() => toast('Full screen is unavailable.'));
  else toast('Full screen is unavailable in this browser.');
}
const actions = {
  'add-note': () => setMode('note'),
  'cancel-mode': () => setMode('explore'),
  center: () => {
    if (ui.mode === 'note') addNoteAt(mapCenter);
    else if (ui.mode === 'place') placeAt(mapCenter);
  },
  close: closeDialog
};
function restore(n) {
  const attached = n?.placement;
  if (!attached) return;
  if (ui.view === 'sentiment') changeView('studio');
  Object.assign(state, {
    ...attached,
    point: attached.point && [...attached.point],
    active: attached.point ? 'custom' : 'none'
  });
  store();
  closeDialog();

  render();
  if (state.point) focusPoint(state.point);
}
document.addEventListener('click', (e) => {
  if (!$('layers-menu').hidden && !e.target.closest('#layers, #layers-menu')) toggleLayerMenu();
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.act) {
    actions[b.dataset.act]?.();
    return;
  }
  if (b.dataset.workview) {
    changeView(b.dataset.workview);
    return;
  }
  if (b.id === 'design-toggle' || b.id === 'context-toggle' || b.id === 'editor-toggle') {
    const open = b.getAttribute('aria-expanded') !== 'true';
    b.setAttribute('aria-expanded', open);
    $(b.getAttribute('aria-controls')).hidden = !open;
    return;
  }
  if (b.id === 'siting-check') {
    const report = evaluateConstraints(state);
    const finding = report.items
      .map(
        (item) =>
          '<section class="method"><h3>' +
          escapeHTML(item.title) +
          '</h3><p>' +
          escapeHTML(item.detail) +
          '</p></section>'
      )
      .join('');
    showDialog(
      'Placement check',
      finding +
        '<p class="hint">The workshop checks the rotated footprint against the mapped railway, roads, river and selected community uses. Review any location against a survey and a site plan.</p><div class="nudge-row"><button data-example="rail">Try rail crossing</button><button data-example="park">Try park edge</button></div>'
    );
    return;
  }
  if (b.dataset.example) {
    const examples = { rail: [42.269787, -83.208061], park: [42.268531, -83.205321] };
    const p = examples[b.dataset.example];
    if (!p) return;
    closeDialog();
    state.angle = 0;
    placeAt(p);
    changeView('studio');
    focusPoint(p);
    return;
  }
  if (b.dataset.camera) {
    closeEditorOnSmallScreen();
    if (b.dataset.camera === 'plan') {
      changeView('plan');
      map?.home();
    } else {
      changeView('studio');
      if (ui.view === 'studio') studio?.view(b.dataset.camera);
    }
    return;
  }
  if (b.dataset.design) {
    if (!state.point || !Object.hasOwn(designs, b.dataset.design)) return;
    state.design = b.dataset.design;
    state.active = 'custom';
    store();
    render();
    return;
  }
  if (b.dataset.method) {
    showDialog('Model assumptions', methodsHTML(b.dataset.method));
    return;
  }
  if (b.dataset.note) {
    showNote(b.dataset.note);
    return;
  }
  if (b.dataset.restore) {
    restore(state.notes.find((n) => n.id === b.dataset.restore));
    return;
  }
  const top = {
    full: toggleFull,
    notes: () => showDialog('Session notes', notesPanel()),
    evidence: () => showDialog('Case evidence', evidencePanel()),
    methods: () => showDialog('Model assumptions', methodsHTML()),
    'add-note': actions['add-note'],
    layers: toggleLayerMenu,
    'retry-environment': () => loadEnvironmentalLayers({retry:true}),
    'context-info': () => showDialog('Siting constraints',
      '<p>Red marks identify intersections with the depicted railways, river channel and roads. Amber marks identify land-use or environmental overlaps that need review. Distances are measured from the building edge to the approximate mapped land use.</p><p>The model is not a buildability approval. Parkland, existing buildings, easements, wetlands and flood zones have different restrictions; verify them with their source and the responsible agency.</p>'+environmentalSources.map(s=>'<div class="ref"><h3>'+escapeHTML(s.label)+'</h3><p>'+escapeHTML(s.detail)+'</p><a href="'+s.source+'" target="_blank" rel="noopener">Source information</a></div>').join('')),
    home: () => map?.home(),
    zin: () => map?.zoomBy(1),
    zout: () => map?.zoomBy(-1),
    'dialog-close': closeDialog
  };
  if (Object.hasOwn(top, b.id)) top[b.id]();
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.layer) {
    (ui.view === 'plan' ? ui.planLayers : ui.layers)[t.dataset.layer] = t.checked;
    drawMap();
    renderMetrics();
    return;
  }
  if (t.id === 'base') {
    aerial?.setBase(t.value);
    return;
  }
  if (t.id === 'placement') {
    choose(t.value);
    closeEditorOnSmallScreen();
    return;
  }
  if (t.id === 'receiver') {
    ui.receptorId = t.value;
    renderMetrics();
    drawMap();
    return;
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !dialog.open) {
    sentiment?.setNote(false);
    if (!$('layers-menu').hidden) toggleLayerMenu();
    if (ui.mode !== 'explore') setMode('explore');
  }
});
document.addEventListener('fullscreenchange', () => {
  $('full').setAttribute(
    'aria-label',
    document.fullscreenElement ? 'Exit full screen' : 'Enter full screen'
  );
  map?.resize();
});
matchMedia('(max-width:700px)').addEventListener('change', () => {
  map?.resize();
  if(ui.view==='plan') aerial?.home();
  sentiment?.resize(true);
});
window.addEventListener('storage', (e) => {
  if (dialog.open || ui.mode !== 'explore' || !e.key?.startsWith('datascope:workshop:')) return;
  Object.assign(state, loadWorkspace(site.center));
  if (ui.view === 'studio' && state.point && !sceneContains(state.point)) changeView('plan', false);
  render();
});
hydrateIcons();
if (matchMedia('(max-width:700px)').matches) for (const name of ['design', 'context', 'editor']) {
  $(name + '-toggle').setAttribute('aria-expanded', 'false');
  $(name + '-content').hidden = true;
}
renderDesigns();
function fallback() {
  if (unavailable) return;
  unavailable = true;
  $('loading').hidden = true;
  if (ui.view !== 'sentiment') changeView('plan', false);
  if (ui.view !== 'sentiment')
    toast('Using the map overview for this browser. Drag the footprint to test a placement.');
}
onEnvironmentChange(() => { renderMetrics(); drawMap(); });
void loadEnvironmentalLayers();
render();
try {
  const module = await import('./studio/scene.js');
  sceneContains = module.sceneContains;
  studio = module.makeScene($('scene'), {
    onPlace: placeAt,
    onRotate: rotateAt,
    onRotatePreview: angle => renderMetrics(state.point, angle),
    onPreview: renderMetrics,
    onNote: addNoteAt,
    onMarker: showNote,
    onCenter: (c) => {
      if (ui.view === 'studio') mapCenter = c;
    },
    onView: setCamera,
    onReady: () => {
      $('loading').hidden = true;
    },
    onError: fallback
  });
  if (!unavailable && ui.view !== 'sentiment')
    changeView(state.point && !sceneContains(state.point) ? 'plan' : ui.view, false);
} catch (error) {
  console.error('DataScope 3D', error);
  fallback();
}
if (new URLSearchParams(location.search).get('view') === 'sentiment') changeView('sentiment');
if (state.point && state.active !== 'proposal' && ui.view !== 'sentiment') focusPoint(state.point);

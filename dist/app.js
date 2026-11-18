import { site, places, sources } from './geography.js';
import { analyzePlacement } from './studio/analysis.js';
import { createReadouts, displayNumber, methodsHTML } from './studio/readouts.js';
import { createMap } from './map.js';
import { icon, hydrateIcons } from './icons.js';
import {
  loadWorkspace,
  saveWorkspace,
  parseWorkshop,
  serializeWorkshop,
  isStudyPoint,
  WORKSHOP_LIMITS
} from './workshop.js';

const $ = (id) => document.getElementById(id);
const escapeHTML = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (x) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[x]
  );
const id = () => crypto.randomUUID();
const topics = ['Question', 'Suggestion', 'Concern', 'Local knowledge'];
const designs = {
  reference: { name: 'Reference design', subtitle: '26 MW facility' },
  efficient: { name: 'Higher efficiency', subtitle: 'Lower electricity use' },
  dry: { name: 'Dry cooling', subtitle: 'Lower cooling-water use' }
};
const state = loadWorkspace(site.center);
const ui = {
  view: 'studio',
  camera: 'site',
  mode: 'explore',
  layers: { places: true, site: true, river: true, notes: true, sound: true },
  selectedNote: null,
  receptorId: 'riel'
};
const dialog = $('dialog');
const updateReadouts = createReadouts($('metrics'), $('resource-values'));
let timer,
  map,
  studio,
  aerial,
  sceneContains = () => true,
  unavailable = false,
  previousCustom = null,
  mapCenter = site.center,
  imported = null;
const noBuild = () => state.active === 'none';

function scenarioName(which = state.active) {
  if (which === 'proposal') return 'Proposed site';
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
    : 'In memory · export to keep';
}
function toast(message) {
  clearTimeout(timer);
  $('toast').textContent = message;
  $('toast').hidden = false;
  timer = setTimeout(() => {
    $('toast').hidden = true;
  }, 3600);
}
function readLink() {
  const q = new URLSearchParams(location.hash.slice(1));
  if (q.get('view') !== 'placement') return false;
  if (q.get('site') === 'none') {
    Object.assign(state, { active: 'none', point: null, angle: 0, design: 'reference' });
    return true;
  }
  if (!q.has('lat') || !q.has('lng')) return false;
  const point = [Number(q.get('lat')), Number(q.get('lng'))],
    angle = Number(q.get('angle') || 0),
    design = q.get('design') || 'reference';
  if (!isStudyPoint(point) || !Number.isFinite(angle) || !Object.hasOwn(designs, design)) return false;
  Object.assign(state, { active: 'custom', point, angle: ((angle % 360) + 360) % 360, design });
  return true;
}
function addressLink() {
  const u = new URL(location.href);
  const q = new URLSearchParams({ view: 'placement' });
  if (noBuild()) q.set('site', 'none');
  else {
    q.set('lat', state.point[0].toFixed(6));
    q.set('lng', state.point[1].toFixed(6));
    q.set('angle', state.angle);
    q.set('design', state.design);
  }
  u.hash = q.toString();
  return u.href;
}
function renderControls() {
  const opts = [
    ['proposal', 'Proposed site'],
    ['custom', 'My placement'],
    ['none', 'No build'],
    ...state.scenarios.map((s) => [s.id, s.name])
  ];
  const select = $('placement');
  select.replaceChildren(...opts.map(([k, name]) => new Option(name, k)));
  select.value = state.active;
  $('count').textContent = state.notes.length;
  $('notes').setAttribute('aria-label', 'Community notes (' + state.notes.length + ')');
  document.querySelector('[data-camera="building"]').disabled = noBuild();
  if (noBuild() && ui.camera === 'building') studio?.view('site');
  $('save').disabled = noBuild();
  $('adjust').disabled = noBuild();
  $('design-choices')
    .querySelectorAll('button')
    .forEach((b) => {
      b.disabled = noBuild();
      b.setAttribute('aria-pressed', !noBuild() && b.dataset.design === state.design);
    });
  $('design-caption').textContent = noBuild() ? 'No facility on the table' : 'Same computing workload';
}
function renderMetrics(point = state.point) {
  updateReadouts({ ...state, point }, ui.receptorId);
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
function adjust() {
  if (!state.point) return;
  showDialog(
    'Position and orientation',
    '<label class="field">Building rotation <output id="degrees">' +
      state.angle +
      '°</output><input type="range" id="angle" min="0" max="355" step="5" value="' +
      state.angle +
      '"></label><p class="hint">Move the building in 50 ft steps.</p><div class="nudge-row">' +
      ['North', 'West', 'East', 'South']
        .map((d) => '<button data-nudge="' + d + '">' + d + '</button>')
        .join('') +
      '</div><div class="dialog-actions"><button data-act="close">Done</button></div>'
  );
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
    '<p class="hint">Mark where something matters to you. Each note keeps the placement you were viewing.</p><button class="wide" data-act="add-note">' +
    icon('pinplus') +
    'Place a note</button>' +
    (list ||
      '<div class="empty">' +
        icon('note') +
        '<h3>No notes yet</h3><p class="hint">Choose a street, park or other place to leave your first question.</p></div>') +
    ('<p class="minor">Notes stay in this browser. Use a workshop file to exchange them with other participants.</p><button data-act="files">' +
      icon('share') +
      'Workshop files</button>')
  );
}
const cityRecords =
  'https://www.cityofallenpark.org/government/agenda_and_minutes/planning_commission.php';
function evidencePanel() {
  return (
    '<p class="hint">Allen Park’s Planning Commission denied the preliminary site plan on June 4, 2026. Its findings included unresolved engineering questions and noise near homes and a public park.</p><div class="ref"><a target="_blank" rel="noopener" href="' +
    cityRecords +
    '">City planning record</a><p>7500 Enterprise Drive · Parcel 30-008-99-0001-712. Review the June decision and the January site drawings. The applicant moved outdoor equipment west so the building could shield the park and homes to the east.</p></div><div class="ref"><h3>Workshop assumptions</h3><p>The movable architectural model uses an illustrative 90 × 46 m footprint, approximately 45,000 sq ft. Neighborhood buildings, trees, and heights are generalized. The surveyed property, site layout, and engineering design require their own records.</p><p>The model calculates river clearance from the building edge and sound from the equipment yard to a selected community place. Site suitability, noise, water service and available grid capacity require further study.</p></div><div class="ref"><h3>Energy and water</h3><p>Scenarios use the DataCenterScope case study, pages 16–20 and 34–39. Energy uses an 80% load assumption. Water values are scenario inputs.</p></div>' +
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
    layers: ui.layers,
    selectedNote: ui.selectedNote,
    receptorId: ui.receptorId
  });
  $('modebar').hidden = ui.mode === 'explore';
  $('move').setAttribute('aria-pressed', ui.mode === 'place');
  if (ui.mode !== 'explore')
    $('modebar').innerHTML =
      '<b>' +
      (ui.mode === 'note' ? 'Choose a place for your note' : 'Choose a site for the building') +
      '</b><div class="mode-actions"><button data-act="center">Use view center</button><button data-act="cancel-mode">Cancel</button></div>';
}
function render() {
  renderControls();
  renderMetrics();
  drawMap();
}
function setMode(mode) {
  if (dialog.open) closeDialog();
  ui.mode = mode;
  $('layers-menu').hidden = true;
  $('layers').setAttribute('aria-expanded', 'false');
  if (mode !== 'explore' && ui.view === 'studio') map?.view('district');
  drawMap();
}
function viewControls() {
  document.querySelectorAll('[data-workview]').forEach((b) => {
    b.setAttribute('aria-pressed', b.dataset.workview === ui.view);
    if (b.dataset.workview === 'studio') b.disabled = unavailable;
  });
  document.querySelector('.cam-modes').hidden = ui.view !== 'studio';
  document.querySelector('.aerial-modes').hidden = ui.view !== 'aerial';
  $('map').hidden = ui.view !== 'aerial';
  $('scene').hidden = ui.view !== 'studio';
}
function setCamera(view) {
  ui.camera = view;
  document
    .querySelectorAll('[data-camera]')
    .forEach((b) => b.setAttribute('aria-pressed', b.dataset.camera === view));
}
function aerialMap() {
  return (aerial ??= createMap($('map'), {
    onPlace: placeAt,
    onNote: addNoteAt,
    onMarker: showNote,
    onPreview: renderMetrics,
    onMoveEnd: (c) => {
      if (ui.view === 'aerial') mapCenter = c;
    }
  }));
}
function changeView(view, notify = true) {
  if (view === 'studio' && (unavailable || !studio)) {
    if (notify)
      toast(unavailable ? '3D graphics are unavailable in this browser.' : 'Preparing the 3D model.');
    return;
  }
  if (view === 'studio' && state.point && !sceneContains(state.point)) {
    if (notify) toast('This placement is outside the 3D district. Explore it on the aerial map.');
    return;
  }
  const changed = view !== ui.view;
  ui.view = view;
  ui.mode = 'explore';
  viewControls();
  if (view === 'aerial') $('loading').hidden = true;
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
  if (ui.view === 'studio' && !sceneContains(point)) changeView('aerial', false);
  map?.focus(point);
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
  imported = null;
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
    'Add a community note',
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
function saveOption() {
  if (!state.point) return;
  if (state.scenarios.length >= WORKSHOP_LIMITS.scenarios) {
    toast('This workshop has reached its saved placement limit.');
    return;
  }
  showDialog(
    'Save a siting option',
    '<form id="save-form"><label class="field">Name this placement<input required maxlength="80" name="name" placeholder="e.g. West industrial parcel"></label><p class="hint">Keep its location, rotation and facility design for comparison.</p><div class="dialog-actions"><button type="button" data-act="close">Cancel</button><button class="primary">Save option</button></div></form>'
  );
  const form = $('save-form');
  form.elements.name.focus();
  form.onsubmit = (e) => {
    e.preventDefault();
    const name = form.elements.name.value.trim();
    if (!name) return;
    const s = { id: id(), name, ...snapshot() };
    state.scenarios.push(s);
    state.active = s.id;
    store();
    closeDialog();
    render();
    toast('Siting option saved.');
  };
}
function compare() {
  const options = [
    { name: 'Proposed site', point: site.center, angle: 0, design: 'reference' },
    { name: 'No build', point: null, angle: 0, design: 'reference' },
    ...state.scenarios
  ];
  if (state.active === 'custom') options.push({ name: 'My placement', ...snapshot() });
  const body = options
    .map((o) => {
      const a = analyzePlacement(o, { receptorId: ui.receptorId });
      const number = (v, unit, dec = 0) => (v == null ? '—' : displayNumber(v, dec) + ' ' + unit);
      return (
        '<tr><td><b>' +
        escapeHTML(o.name) +
        '</b><small>' +
        (o.point ? designs[o.design].name : 'No facility') +
        '</small></td><td>' +
        number(a.soundDbA, 'dBA', 1) +
        '</td><td>' +
        number(a.riverSetbackM == null ? null : a.riverSetbackM * 3.28084, 'ft') +
        '</td><td>' +
        number(a.parcelCoveragePct, '%') +
        '</td><td>' +
        number(a.energyGWh, 'GWh', 1) +
        '</td><td>' +
        (a.waterMGal === null ? 'Unmodeled' : number(a.waterMGal, 'M gal', 1)) +
        '</td></tr>'
      );
    })
    .join('');
  showDialog(
    'Compare siting options',
    '<p class="hint">Equipment sound is modeled at ' +
      escapeHTML(places.find((p) => p.id === ui.receptorId).name) +
      '. Resource estimates are annual.</p><div class="scrolltable"><table><thead><tr><th>Option</th><th>Sound</th><th>River clearance</th><th>Inside parcel</th><th>Electricity</th><th>Cooling water</th></tr></thead><tbody>' +
      body +
      '</tbody></table></div><p class="minor">Save more placements to include them here. No build adds zero water and electricity demand.</p>',
    true
  );
}

function fileBtn(action, glyph, title, desc) {
  return (
    '<button class="filechoice" data-act="' +
    action +
    '">' +
    icon(glyph) +
    '<span><b>' +
    title +
    '</b><small>' +
    desc +
    '</small></span></button>'
  );
}
function files() {
  showDialog(
    'Workshop files',
    '<p class="hint">Work on this device or exchange a snapshot with other participants.</p>' +
      fileBtn(
        'link',
        'link',
        'Copy placement link',
        'Share this location, orientation and design only.'
      ) +
      fileBtn(
        'export',
        'download',
        'Export workshop',
        'Download all saved options and community notes.'
      ) +
      fileBtn(
        'import',
        'folder',
        'Open workshop file',
        'Preview a workshop before replacing this one.'
      ) +
      '<input id="import-input" type="file" accept=".json,application/json" hidden><p id="file-error" class="error" role="status"></p>'
  );
  $('import-input').onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      if (f.size > 6000000) throw Error('Choose a workshop file smaller than 6 MB.');
      imported = parseWorkshop(await f.text());
      showDialog(
        'Open this workshop?',
        '<p class="hint"><strong>' +
          escapeHTML(f.name) +
          '</strong> contains ' +
          imported.scenarios.length +
          ' saved options and ' +
          imported.notes.length +
          ' notes. Opening it replaces the current workshop on this device.</p><div class="dialog-actions"><button data-act="files">Cancel</button><button class="primary" data-act="confirm-import">Open workshop</button></div>'
      );
    } catch (err) {
      $('file-error').textContent = err.message;
    }
  };
}
function download() {
  const a = document.createElement('a'),
    blob = new Blob([serializeWorkshop(state)], { type: 'application/json' });
  a.href = URL.createObjectURL(blob);
  a.download = 'Allen-Park-' + new Date().toISOString().slice(0, 10) + '.workshop.json';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Workshop exported.');
}
async function copyLink() {
  const url = addressLink();
  try {
    await navigator.clipboard.writeText(url);
    toast('Placement link copied.');
    closeDialog();
  } catch {
    showDialog(
      'Copy placement link',
      '<label class="field">Placement link<input id="share-url" readonly></label><p class="minor">This preview link opens on devices that can reach the same site address.</p>'
    );
    $('share-url').value = url;
    $('share-url').select();
  }
}
function toggleLayerMenu() {
  const menu = $('layers-menu'),
    opening = menu.hidden;
  menu.hidden = !opening;
  $('layers').setAttribute('aria-expanded', opening);
  if (opening)
    menu.innerHTML = Object.entries({
      ...(ui.view === 'studio' ? { sound: 'Equipment sound field' } : {}),
      site: 'Proposed parcel',
      river: 'Ecorse River',
      places: 'Community places',
      notes: 'Workshop notes'
    })
      .map(
        ([k, label]) =>
          '<label><input type="checkbox" data-layer="' +
          k +
          '" ' +
          (ui.layers[k] ? 'checked' : '') +
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
  move: () => setMode('place'),
  save: saveOption,
  files,
  'cancel-mode': () => setMode('explore'),
  center: () => {
    if (ui.mode === 'note') addNoteAt(mapCenter);
    else if (ui.mode === 'place') placeAt(mapCenter);
  },
  close: closeDialog,
  link: copyLink,
  export: download,
  import: () => $('import-input').click(),
  'confirm-import': () => {
    if (!imported) return;
    Object.assign(state, imported);
    previousCustom = null;
    ui.mode = 'explore';
    ui.selectedNote = null;
    store(true);
    closeDialog();
    render();
    if (state.point) focusPoint(state.point);
    else map?.home();
    toast('Workshop opened.');
  }
};
function restore(n) {
  const attached = n?.placement;
  if (!attached) return;
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
function nudge(direction) {
  if (!state.point) return;
  const [lat, lng] = state.point,
    meters = 15.24;
  const dy = meters / 111320,
    dx = dy / Math.cos((lat * Math.PI) / 180);
  const offset = { North: [dy, 0], South: [-dy, 0], West: [0, -dx], East: [0, dx] }[direction];
  placeAt([lat + offset[0], lng + offset[1]]);
  focusPoint(state.point);
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) {
    if (!$('layers-menu').hidden && !e.target.closest('.layer-wrap')) toggleLayerMenu();
    return;
  }
  if (!$('layers-menu').hidden && !e.target.closest('.layer-wrap')) toggleLayerMenu();
  if (b.dataset.act) {
    actions[b.dataset.act]?.();
    return;
  }
  if (b.dataset.workview) {
    changeView(b.dataset.workview);
    return;
  }
  if (b.dataset.camera) {
    studio?.view(b.dataset.camera);
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
  if (b.dataset.nudge) {
    nudge(b.dataset.nudge);
    return;
  }
  const top = {
    files,
    full: toggleFull,
    compare,
    save: saveOption,
    adjust,
    move: () => setMode(ui.mode === 'place' ? 'explore' : 'place'),
    notes: () => showDialog('Community notes', notesPanel()),
    evidence: () => showDialog('Case evidence', evidencePanel()),
    methods: () => showDialog('Model assumptions', methodsHTML()),
    'add-note': actions['add-note'],
    layers: toggleLayerMenu,
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
    ui.layers[t.dataset.layer] = t.checked;
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
    return;
  }
  if (t.id === 'receiver') {
    ui.receptorId = t.value;
    renderMetrics();
    drawMap();
    return;
  }
  if (t.id === 'angle') {
    store();
    render();
  }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'angle') {
    state.angle = Number(e.target.value);
    state.active = 'custom';
    $('degrees').textContent = state.angle + '°';
    drawMap();
    renderMetrics();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !dialog.open) {
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
matchMedia('(max-width:690px)').addEventListener('change', () => map?.resize());
dialog.addEventListener('close', () => {
  imported = null;
});
window.addEventListener('storage', (e) => {
  if (dialog.open || ui.mode !== 'explore' || !e.key?.startsWith('datascope:workshop:')) return;
  Object.assign(state, loadWorkspace(site.center));
  if (ui.view === 'studio' && state.point && !sceneContains(state.point)) changeView('aerial', false);
  render();
});
hydrateIcons();
renderDesigns();
const linked = readLink();
if (location.hash.startsWith('#view=placement'))
  history.replaceState(null, '', location.pathname + location.search);
function fallback() {
  if (unavailable) return;
  unavailable = true;
  $('loading').hidden = true;
  changeView('aerial', false);
  toast('3D graphics are unavailable. The aerial map has the same live analysis.');
}
render();
try {
  const module = await import('./studio/scene.js');
  sceneContains = module.sceneContains;
  studio = module.makeScene($('scene'), {
    onPlace: placeAt,
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
  if (!unavailable) changeView(state.point && !sceneContains(state.point) ? 'aerial' : ui.view, false);
} catch (error) {
  console.error('DataScope 3D', error);
  fallback();
}
if (linked) {
  store();
  toast('Shared placement opened.');
}
if (state.point && state.active !== 'proposal') focusPoint(state.point);

window.addEventListener('hashchange', () => {
  if (!readLink()) return;
  history.replaceState(null, '', location.pathname + location.search);
  ui.mode = 'explore';
  ui.selectedNote = null;
  store();
  render();
  if (state.point) focusPoint(state.point);
  else map?.home();
  toast('Shared placement opened.');
});

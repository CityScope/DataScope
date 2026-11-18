import { site, places, sources } from './geography.js';
import { createMap } from './map.js';
import { icon, hydrateIcons } from './icons.js';
import {
  loadWorkspace,
  saveWorkspace,
  parseWorkshop,
  serializeWorkshop,
  measure,
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
const fields = ['park', 'school', 'housing'];
const kinds = { park: 'Park', school: 'School', housing: 'Senior housing' };
const topics = ['Question', 'Suggestion', 'Concern', 'Local knowledge'];
const designs = {
  reference: {
    name: 'Reference design',
    energy: 182.2,
    water: 3,
    detail:
      'Annual electricity assumes 26 MW at 80% average load. Annual cooling-water supply is set at 3 million gallons.'
  },
  efficient: {
    name: 'Higher efficiency',
    energy: 151.8,
    water: null,
    detail:
      'The same computing workload with power usage effectiveness improving from 1.50 to 1.25. This scenario models electricity only.'
  },
  dry: {
    name: 'Dry cooling',
    energy: 184.0,
    water: 0.3,
    detail:
      'The workshop assumes 90% less cooling water and 1% more electricity than the reference design.'
  }
};
const state = loadWorkspace(site.center);
const ui = {
  tab: 'siting',
  mode: 'explore',
  layers: { places: true, site: true, river: true, notes: true },
  selectedNote: null
};
const panel = $('panel'),
  dialog = $('dialog');
let timer,
  map,
  sessionSaved = true,
  previousCustom = null,
  mapCenter = site.center,
  imported = null;
const noBuild = () => state.active === 'none';
const proposalDistances = measure(site.center, places);
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
  sessionSaved = saveWorkspace(state, { replace });
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
function setDrawer(open) {
  const isOpen = open && matchMedia('(max-width:760px)').matches;
  $('sidebar').classList.toggle('open', isOpen);
  $('scrim').hidden = !isOpen;
  $('open-drawer').setAttribute('aria-expanded', isOpen);
  if (isOpen) $('close-drawer').focus();
}
function showTab(tab) {
  ui.tab = tab;
  panel.scrollTop = 0;
  document.querySelectorAll('[data-tab]').forEach((b) => {
    if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  renderPanel();
}
function option(key, ico, title, subtitle) {
  const active = state.active === key;
  return (
    '<button class="option ' +
    (active ? 'active' : '') +
    '" data-choice="' +
    escapeHTML(key) +
    '" aria-pressed="' +
    active +
    '"><span class="opt-icon">' +
    icon(ico) +
    '</span><span><strong>' +
    escapeHTML(title) +
    '</strong><small>' +
    escapeHTML(subtitle) +
    '</small></span><span class="radio"></span></button>'
  );
}
function designSelect() {
  return (
    '<label class="field">Facility design<select id="design">' +
    Object.entries(designs)
      .map(
        ([k, d]) =>
          '<option value="' +
          k +
          '" ' +
          (state.design === k ? 'selected' : '') +
          '>' +
          d.name +
          '</option>'
      )
      .join('') +
    '</select></label>'
  );
}
function sitingPanel() {
  const saved = state.scenarios
    .map((s) => option(s.id, 'save', s.name, designs[s.design].name))
    .join('');
  const edit = state.point
    ? '<div class="action-row"><button class="primary" data-act="move">' +
      icon('move') +
      'Move footprint</button><button data-act="save">' +
      icon('save') +
      'Save option</button></div>' +
      designSelect() +
      '<details class="section-detail" data-detail="adjust"><summary>Footprint controls</summary><p class="hint">Drag the teal handle or move in 50 ft steps.</p><div class="nudge-row">' +
      ['North', 'West', 'East', 'South']
        .map(
          (d, i) =>
            '<button aria-label="Move 50 feet ' +
            d.toLowerCase() +
            '" title="' +
            d +
            ' 50 ft" data-nudge="' +
            d +
            '">' +
            ['↑', '←', '→', '↓'][i] +
            '</button>'
        )
        .join('') +
      '</div><label class="field" for="angle">Rotation <span id="degrees">' +
      state.angle +
      '°</span></label><div class="nudge-row"><input id="angle" type="range" min="0" max="355" step="5" value="' +
      state.angle +
      '" aria-label="Footprint rotation"></div></details>' +
      '<details class="section-detail" data-detail="model"><summary>Modeled resource use</summary>' +
      modelDetails(state.design) +
      '</details>'
    : '<p class="hint">No new facility is added. Use this baseline when comparing locations or resource use.</p>';
  return (
    '<div class="facility"><div class="plate"><div class="capacity"><strong>26 <small>MW</small></strong><span>Proposed capacity</span></div><img src="assets/facility.svg" alt="Illustration of a data center"></div><div class="facility-caption"><b>7500 Enterprise Drive</b><span>Site plan denied</span></div></div>' +
    '<p class="smallhead">Siting options</p><div class="options">' +
    option('proposal', 'plan', 'Proposed site', 'Enterprise Drive parcel') +
    option('custom', 'move', 'My placement', 'Choose any point on the study map') +
    option('none', 'subtract', 'No build', 'Keep the current land use') +
    saved +
    '</div>' +
    '<div class="control-group"><p class="smallhead">' +
    escapeHTML(scenarioName()) +
    '</p>' +
    edit +
    '</div>'
  );
}
function modelDetails(design) {
  const d = designs[design];
  return (
    '<div class="model-row"><span>Electricity / year</span><b>' +
    d.energy +
    ' GWh</b></div><div class="model-row"><span>Cooling water / year</span><b>' +
    (d.water === null ? 'Unmodeled' : d.water + 'M gal') +
    '</b></div><p class="minor">' +
    d.detail +
    ' Illustrative workshop estimates.</p>'
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
    '<h2>Community notes</h2><p class="hint">Mark where something matters to you. Each note keeps the placement you were viewing.</p><button class="wide" data-act="add-note">' +
    icon('pinplus') +
    'Place a note</button>' +
    (list ||
      '<div class="empty">' +
        icon('note') +
        '<h3>No notes yet</h3><p class="hint">Choose a street, park or other place to leave your first question.</p></div>') +
    '<p class="minor">Notes stay in this browser. Use Workshop files to exchange them with other participants.</p>'
  );
}
const cityRecords =
  'https://www.cityofallenpark.org/government/agenda_and_minutes/planning_commission.php';
function evidencePanel() {
  return (
    '<h2>Case evidence</h2><p class="hint">Allen Park’s Planning Commission denied the preliminary site plan on June 4, 2026. Its findings included unresolved engineering questions and noise near homes and a public park.</p><div class="ref"><a target="_blank" rel="noopener" href="' +
    cityRecords +
    '">City planning record</a><p>7500 Enterprise Drive · Parcel 30-008-99-0001-712. Review the June decision and the January site drawings. The applicant moved outdoor equipment west so the building could shield the park and homes to the east.</p></div><div class="ref"><h3>Workshop assumptions</h3><p>The teal shape is a movable 90 × 46 m building, about 45,000 sq ft. Its starting point is inside the proposal parcel. Its shape and orientation are illustrative.</p><p>Distances run from its center to selected public reference points. Site suitability, noise, water service and available grid capacity require further study.</p></div><div class="ref"><h3>Energy and water</h3><p>Scenarios use the DataCenterScope case study, pages 16–20 and 34–39. Energy uses an 80% load assumption. Water values are scenario inputs.</p></div>' +
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
function renderPanel() {
  const scroll = panel.scrollTop,
    expanded = new Set([...panel.querySelectorAll('details[open]')].map((e) => e.dataset.detail));
  panel.innerHTML =
    ui.tab === 'siting' ? sitingPanel() : ui.tab === 'notes' ? notesPanel() : evidencePanel();
  panel.querySelectorAll('details').forEach((e) => {
    e.open = expanded.has(e.dataset.detail);
  });
  panel.scrollTop = scroll;
  $('count').textContent = state.notes.length;
}
function distance(m) {
  return m == null ? '—' : (m / 1609.344).toFixed(2);
}
function insideStudyParcel([lat, lng]) {
  const ring = site.boundary;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [y1, x1] = ring[i],
      [y2, x2] = ring[j];
    if (y1 > lat !== y2 > lat && lng < ((x2 - x1) * (lat - y1)) / (y2 - y1) + x1) inside = !inside;
  }
  return inside;
}
function renderMetrics(point = state.point) {
  const values = measure(point, places);
  $('parcel-context').hidden = !ui.layers.site;
  $('parcel-state').textContent = point
    ? insideStudyParcel(point)
      ? 'Center inside parcel'
      : 'Center outside parcel'
    : 'No new footprint';
  $('origin').textContent = point ? 'From footprint center · straight line' : 'No new facility';
  $('metrics').innerHTML = fields
    .map((k) => {
      const v = values[k],
        place = places.find((p) => p.type === k);
      const change =
        v && proposalDistances[k]
          ? Math.round(((v.meters - proposalDistances[k].meters) / 1609.344) * 100)
          : 0;
      const delta = change
        ? '<span class="distance-change" title="Change from the proposed site">' +
          Math.abs(change / 100).toFixed(2) +
          ' mi ' +
          (change > 0 ? 'farther' : 'closer') +
          '</span>'
        : '';
      return (
        '<div class="metric"><span class="metric-type">' +
        icon(k) +
        kinds[k] +
        '</span><strong>' +
        distance(v?.meters) +
        (v ? ' <small>mi</small>' : '') +
        '</strong>' +
        delta +
        '<p>' +
        escapeHTML(v?.name ?? place?.name ?? 'No mapped place') +
        '</p></div>'
      );
    })
    .join('');
}
function drawMap() {
  map?.render({
    point: state.point,
    angle: state.angle,
    mode: ui.mode,
    layers: ui.layers,
    notes: state.notes,
    selectedNote: ui.selectedNote
  });
  $('modebar').hidden = ui.mode === 'explore';
  if (ui.mode !== 'explore')
    $('modebar').innerHTML =
      '<b>' +
      (ui.mode === 'note' ? 'Choose a place for your note' : 'Choose a footprint location') +
      '</b><div class="mode-actions"><button data-act="center">Use map center</button><button data-act="cancel-mode">Cancel</button></div>';
}
function render() {
  renderPanel();
  renderMetrics();
  drawMap();
}
function setMode(mode) {
  ui.mode = mode;
  $('layers-menu').hidden = true;
  $('layers').setAttribute('aria-expanded', 'false');
  if (mode !== 'explore') setDrawer(false);
  drawMap();
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
    setDrawer(false);
  } else if (key === 'none')
    Object.assign(state, { active: 'none', point: null, angle: 0, design: 'reference' });
  else if (key === 'proposal')
    Object.assign(state, { active: key, point: [...site.center], angle: 0, design: 'reference' });
  else {
    const s = state.scenarios.find((s) => s.id === key);
    if (!s) return;
    Object.assign(state, { active: s.id, point: [...s.point], angle: s.angle, design: s.design });
  }
  if (state.point && key !== 'custom') map.focus(state.point);
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
    showTab('notes');
    render();
    toast('Note saved at this place.');
  };
}
function showNote(noteId) {
  const n = state.notes.find((x) => x.id === noteId);
  if (!n) return;
  ui.selectedNote = n.id;
  ui.mode = 'explore';
  setDrawer(false);
  map.focus([n.lat, n.lng]);
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
    { name: 'Proposed site', point: site.center, design: 'reference' },
    { name: 'No build', point: null, design: 'reference' },
    ...state.scenarios
  ];
  if (state.active === 'custom') options.push({ name: 'My placement', ...snapshot() });
  showDialog(
    'Compare siting options',
    '<p class="hint">Distances are straight lines to the mapped reference points. Energy and cooling water are annual workshop estimates.</p><div class="scrolltable"><table><thead><tr><th>Option</th><th>Park</th><th>School</th><th>Senior housing</th><th>Electricity</th><th>Cooling water</th></tr></thead><tbody>' +
      options
        .map((o) => {
          const metrics = measure(o.point, places),
            d = designs[o.design];
          return (
            '<tr><td><b>' +
            escapeHTML(o.name) +
            '</b><small>' +
            (o.point ? d.name : 'No facility') +
            '</small></td>' +
            fields
              .map((k) => '<td>' + (metrics[k] ? distance(metrics[k].meters) + ' mi' : '—') + '</td>')
              .join('') +
            '<td>' +
            (o.point ? d.energy : 0) +
            ' GWh</td><td>' +
            (o.point ? (d.water === null ? 'Unmodeled' : d.water + 'M gal') : '0 gal') +
            '</td></tr>'
          );
        })
        .join('') +
      '</tbody></table></div><p class="minor">No build shows zero added resource use. Save more placements to include them here.</p>',
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
    if (state.point) map.focus(state.point);
    else map.home();
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
  showTab('siting');
  render();
  if (state.point) map.focus(state.point);
}
function nudge(direction) {
  if (!state.point) return;
  const [lat, lng] = state.point,
    meters = 15.24;
  const dy = meters / 111320,
    dx = dy / Math.cos((lat * Math.PI) / 180);
  const offset = { North: [dy, 0], South: [-dy, 0], West: [0, -dx], East: [0, dx] }[direction];
  placeAt([lat + offset[0], lng + offset[1]]);
  map.focus(state.point);
  panel.querySelector('[data-nudge="' + direction + '"]')?.focus({ preventScroll: true });
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
  if (b.dataset.tab) {
    showTab(b.dataset.tab);
    return;
  }
  if (b.dataset.choice) {
    choose(b.dataset.choice);
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
    'add-note': actions['add-note'],
    layers: toggleLayerMenu,
    home: () => map.home(),
    zin: () => map.zoomBy(1),
    zout: () => map.zoomBy(-1),
    'open-drawer': () => setDrawer(true),
    'close-drawer': () => setDrawer(false),
    scrim: () => setDrawer(false),
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
    map.setBase(t.value);
    return;
  }
  if (t.id === 'design' && Object.hasOwn(designs, t.value)) {
    state.design = t.value;
    state.active = 'custom';
    store();
    render();
    panel.querySelector('#design')?.focus({ preventScroll: true });
    toast('Facility design updated.');
    return;
  }
  if (t.id === 'angle') {
    store();
    render();
    panel.querySelector('#angle')?.focus({ preventScroll: true });
  }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'angle') {
    state.angle = Number(e.target.value);
    state.active = 'custom';
    $('degrees').textContent = state.angle + '°';
    drawMap();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !dialog.open) {
    if (!$('layers-menu').hidden) toggleLayerMenu();
    if (ui.mode !== 'explore') setMode('explore');
    if ($('sidebar').classList.contains('open')) setDrawer(false);
  }
});
document.addEventListener('fullscreenchange', () => {
  $('full').setAttribute(
    'aria-label',
    document.fullscreenElement ? 'Exit full screen' : 'Enter full screen'
  );
  map.resize();
});
matchMedia('(max-width:760px)').addEventListener('change', () => {
  setDrawer(false);
  map.resize();
});
dialog.addEventListener('close', () => {
  imported = null;
});
window.addEventListener('storage', (e) => {
  if (dialog.open || ui.mode !== 'explore' || !e.key?.startsWith('datascope:workshop:')) return;
  Object.assign(state, loadWorkspace(site.center));
  render();
});
hydrateIcons();
const linked = readLink();
if (location.hash.startsWith('#view=placement'))
  history.replaceState(null, '', location.pathname + location.search);
map = createMap($('map'), {
  onPlace: placeAt,
  onNote: addNoteAt,
  onMarker: showNote,
  onPreview: renderMetrics,
  onMoveEnd: (c) => {
    mapCenter = c;
  }
});
render();
if (linked) {
  store();
  if (state.point) map.focus(state.point);
  toast('Shared placement opened.');
} else if (state.point && state.active !== 'proposal') map.focus(state.point);
window.addEventListener('hashchange', () => {
  if (!readLink()) return;
  history.replaceState(null, '', location.pathname + location.search);
  ui.mode = 'explore';
  ui.selectedNote = null;
  store();
  render();
  if (state.point) map.focus(state.point);
  else map.home();
  toast('Shared placement opened.');
});

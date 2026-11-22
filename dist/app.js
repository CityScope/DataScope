import { createSentiment } from './sentiment.js';
import {
  loadEnvironmentalLayers,
  onEnvironmentChange,
  environmentalSources,
  environmentalState
} from './environment.js';
import { evaluateConstraints, nearbyConstraints } from './studio/constraints.js';
import { site, places, caseTimeline } from './geography.js';
import { createReadouts, methodsHTML } from './studio/readouts.js';
import {
  analyzePlacement,
  integrationSpecs,
  coolingSpecs,
  energySpecs,
  benefitSpecs,
  midtownAlternative
} from './studio/analysis.js';
import { normalizeBearing } from './studio/rotation.js';
import { createMap } from './map.js';
import { icon, hydrateIcons } from './icons.js';
import {
  loadWorkspace,
  saveWorkspace,
  isStudyPoint,
  WORKSHOP_LIMITS,
  presetScenarios
} from './workshop.js';

const $ = (id) => document.getElementById(id);
const escapeHTML = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (x) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[x]
  );
const id = () => crypto.randomUUID();
const topics = [
  'Noise & low-frequency hum',
  'Simsboro aquifer & water',
  'ERCOT grid & rates',
  'Midtown vision & buffers',
  'Community benefits & jobs',
  'NDA & CUP governance'
];

const pillarMeta = {
  integration: {
    heading: 'Design & urban integration',
    specs: integrationSpecs,
    icons: { d1: 'footprint', d2: 'park', d3: 'shield', d4: 'district' }
  },
  cooling: {
    heading: 'Cooling & impact mitigation',
    specs: coolingSpecs,
    thumbs: {
      t1: 'assets/design-reference.webp',
      t2: 'assets/design-dry.webp',
      t3: 'assets/design-efficient.webp',
      t4: 'assets/design-efficient.webp'
    }
  },
  energy: {
    heading: 'Energy generation & grid',
    specs: energySpecs,
    icons: { e1: 'bolt', e2: 'sun', e3: 'wind', e4: 'atom' }
  },
  benefits: {
    heading: 'Community benefits',
    specs: benefitSpecs,
    icons: { b1: 'users', b2: 'dollar', b3: 'shield', b4: 'book' }
  }
};

const state = loadWorkspace(site.center);
const ui = {
  view: 'studio',
  camera: 'site',
  mode: 'explore',
  pillar: 'integration',
  domain: 'overview',
  layers: { places: true, site: true, river: true, sound: true, constraints: true, environment: true },
  planLayers: { places: true, site: true, river: true, sound: true, constraints: true, environment: true },
  selectedNote: null,
  lens: 'sound',
  receptorId: 'langford'
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
  mapCenter = site.center,
  popoverAnchor = null,
  popoverPinned = false;
const noBuild = () => state.active === 'none';

function scenarioName(which = state.active) {
  if (Object.hasOwn(presetScenarios, which)) return presetScenarios[which].name;
  if (which === 'custom') return 'My custom scenario';
  if (which === 'none') return 'Midtown alt (No build)';
  return state.scenarios.find((s) => s.id === which)?.name || 'Saved scenario';
}
function snapshot() {
  return {
    point: state.point && [...state.point],
    angle: state.angle,
    integration: state.integration,
    cooling: state.cooling,
    energy: state.energy,
    benefits: [...(state.benefits || [])]
  };
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

function hideOptionPopover() {
  const pop = $('option-popover');
  if (pop) pop.hidden = true;
  if (popoverAnchor) popoverAnchor.setAttribute('aria-expanded', 'false');
  popoverAnchor = null;
  popoverPinned = false;
}

function showOptionPopover(trigger, { pin = false } = {}) {
  const pillar = trigger?.dataset.infoPillar;
  const opt = trigger?.dataset.infoOpt;
  const item = pillarMeta[pillar]?.specs?.[opt];
  const pop = $('option-popover');
  if (!item || !pop) return;
  if (popoverAnchor && popoverAnchor !== trigger) popoverAnchor.setAttribute('aria-expanded', 'false');
  popoverAnchor = trigger;
  if (pin) popoverPinned = true;
  trigger.setAttribute('aria-expanded', 'true');
  pop.innerHTML =
    '<div class="pop-head"><strong>' +
    escapeHTML(item.name) +
    '</strong><span>' +
    escapeHTML(item.code) +
    '</span></div><p>' +
    escapeHTML(item.detail) +
    '</p>' +
    (item.hostNote ? '<small>' + escapeHTML(item.hostNote) + '</small>' : '');
  pop.hidden = false;
  const card = trigger.closest('.design-card') || trigger;
  const tray = document.querySelector('.design-tray');
  const rect = card.getBoundingClientRect();
  const trayRect = tray.getBoundingClientRect();
  const popH = pop.offsetHeight || 110;
  const top = Math.max(76, Math.min(window.innerHeight - popH - 22, rect.top + rect.height / 2 - popH / 2));
  if (window.innerWidth > 700) {
    pop.style.top = top + 'px';
    pop.style.right = Math.max(18, window.innerWidth - trayRect.left + 12) + 'px';
    pop.style.left = 'auto';
  } else {
    pop.style.top = Math.max(100, trayRect.top - popH - 10) + 'px';
    pop.style.left = '12px';
    pop.style.right = '12px';
  }
}

function renderPillarChoices() {
  hideOptionPopover();
  const meta = pillarMeta[ui.pillar] || pillarMeta.integration;
  $('pillar-heading').textContent = noBuild() ? 'Midtown alternative' : meta.heading;
  document.querySelectorAll('[data-pillar][role="tab"]').forEach((b) => {
    b.setAttribute('aria-selected', String(b.dataset.pillar === ui.pillar));
    b.disabled = noBuild();
  });

  if (noBuild()) {
    $('design-choices').innerHTML =
      '<div class="nobuild-card">' +
      '<strong>Walkable Midtown Vision</strong>' +
      '<p>Texas Independence Park, greenbelts, retail, and "The Station" regional sports complex — kept first-class alongside data-center options.</p>' +
      '<div class="nobuild-grid">' +
      '<div><span>Est. tax</span><b>$' + midtownAlternative.taxMYr.toFixed(1) + 'M/yr</b></div>' +
      '<div><span>Perm. jobs</span><b>~' + midtownAlternative.permanentJobs + ' FTE</b></div>' +
      '<div><span>Grid / water</span><b>0 MW · 0 gal</b></div>' +
      '</div>' +
      '<button type="button" class="wide" data-preset-jump="community">Compare with Community-integrated</button>' +
      '</div>';
    $('design-specs').hidden = true;
    $('design-caption').textContent = 'No data center placed · Midtown benchmark';
    return;
  }

  const isMulti = ui.pillar === 'benefits';
  const activeKey = isMulti ? null : state[ui.pillar];
  const selectedBenefits = new Set(state.benefits || []);

  $('design-choices').innerHTML = Object.entries(meta.specs)
    .map(([key, item]) => {
      const pressed = isMulti ? selectedBenefits.has(key) : activeKey === key;
      const thumbHTML = meta.thumbs?.[key]
        ? '<img aria-hidden="true" alt="" src="' + meta.thumbs[key] + '">'
        : '<span class="card-badge" aria-hidden="true">' +
          icon(meta.icons?.[key] || 'cube') +
          '<em>' +
          item.code +
          '</em></span>';
      return (
        '<div class="design-card-wrap">' +
        '<button type="button" class="design-card' +
        (isMulti ? ' is-check' : '') +
        '" data-option-pillar="' +
        ui.pillar +
        '" data-option="' +
        key +
        '" aria-pressed="' +
        pressed +
        '">' +
        thumbHTML +
        '<span><strong>' +
        escapeHTML(item.name) +
        '</strong><small>' +
        escapeHTML(item.subtitle) +
        '</small></span><i class="' +
        (isMulti ? 'check-dot' : 'radio') +
        '"></i></button>' +
        '<button type="button" class="opt-info" data-info-pillar="' +
        ui.pillar +
        '" data-info-opt="' +
        key +
        '" aria-label="About ' +
        escapeHTML(item.name) +
        '" title="Details">i</button>' +
        '</div>'
      );
    })
    .join('');

  const analysis = analyzePlacement(state, { receptorId: ui.receptorId });
  $('design-specs').hidden = false;
  if (ui.pillar === 'integration') {
    const iSpec = integrationSpecs[state.integration];
    $('design-specs').innerHTML =
      '<div><span>Site capex Δ</span><b>+$' + iSpec.capexM + 'M</b></div>' +
      '<div><span>Yard screen</span><b>−' + iSpec.yardAttenDb.toFixed(1) + ' dB</b></div>' +
      '<div><span>Public space</span><b>' + iSpec.amenityAcres.toFixed(1) + ' ac</b></div>';
  } else if (ui.pillar === 'cooling') {
    $('design-specs').innerHTML =
      '<div><span>105°F peak</span><b>' + analysis.peakMW.toFixed(1) + ' MW</b></div>' +
      '<div><span>Simsboro cap</span><b>' + analysis.simsboroPct.toFixed(2) + '%</b></div>' +
      '<div><span>Source @ 15 m</span><b>' + analysis.sourceDb15.toFixed(1) + ' dBA</b></div>';
  } else if (ui.pillar === 'energy') {
    const eSpec = energySpecs[state.energy];
    $('design-specs').innerHTML =
      '<div><span>Annual match</span><b>' + eSpec.matchPct + '%</b></div>' +
      '<div><span>Off-site land</span><b>' +
      (eSpec.offsiteSqMi ? eSpec.offsiteSqMi + ' sq mi' : eSpec.onsiteExtraAcres ? eSpec.onsiteExtraAcres + ' ac pad' : '0 sq mi') +
      '</b></div>' +
      '<div><span>Net CO₂</span><b>' + analysis.co2KtYr.toFixed(1) + ' kt/yr</b></div>';
  } else {
    $('design-specs').innerHTML =
      '<div><span>Upfront pool</span><b>$' + analysis.upfrontPoolM.toFixed(0) + 'M</b></div>' +
      '<div><span>Annual pact</span><b>$' + analysis.annualBenefitMYr.toFixed(2) + 'M/yr</b></div>' +
      '<div><span>Perm. jobs</span><b>' + analysis.permanentJobs + ' FTE</b></div>';
  }
  $('design-caption').textContent = isMulti
    ? 'Combine modules · $10M upfront + $0.5M/yr pool'
    : '20 MW IT · 220 GWh/yr base · Zone 2A (TX)';
}

function renderControls() {
  const opts = [
    ...Object.entries(presetScenarios).map(([k, v]) => [k, v.name]),
    ['none', 'Midtown alt (No build)'],
    ['custom', 'My custom scenario'],
    ...state.scenarios.map((s) => [s.id, s.name])
  ];
  const select = $('placement');
  select.replaceChildren(...opts.map(([k, name]) => new Option(name, k)));
  select.value = state.active;
  document.querySelector('[data-camera="building"]').disabled = noBuild();
  if (noBuild() && ui.camera === 'building') studio?.view('site');
  document.querySelectorAll('[data-domain]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.domain === ui.domain));
  });
  renderPillarChoices();
}

function renderMetrics(point = state.point, angle = state.angle) {
  const current = { ...state, point, angle };
  updateReadouts(current, ui.receptorId, ui.domain);
  const check = evaluateConstraints(current);
  const warningTitles = [...new Set(check.items.map((i) => i.title))];
  const finding = $('context-finding');
  finding.dataset.status = check.status;
  finding.title = warningTitles.join(' · ');
  finding.textContent = check.items.length
    ? warningTitles.slice(0, 2).join(' · ') + (warningTitles.length > 2 ? ' · +' + (warningTitles.length - 2) + ' more' : '')
    : point
      ? 'No overlap with loaded CUP constraints'
      : 'Midtown alternative (no data center)';
  if (!$('context-content').hidden) {
    $('context-distances').innerHTML = nearbyConstraints(current)
      .slice(0, 3)
      .map((i) => '<span>' + escapeHTML(i.label) + ' <b>' + Math.round(i.distance * 3.28084).toLocaleString() + ' ft</b></span>')
      .join('');
  }
  const pending = environmentalState.filter((s) => s.state === 'loading'),
    missing = environmentalState.filter((s) => s.state === 'unavailable');
  $('environment-status').textContent = pending.length
    ? 'Loading ' + pending.map((s) => s.label.toLowerCase()).join(', ') + '…'
    : missing.length
      ? 'Unavailable: ' + missing.map((s) => s.label.toLowerCase()).join(', ')
      : 'USFWS, PAD-US & FEMA overlays loaded';
  $('retry-environment').hidden = !missing.length;
  $('environment-status').dataset.state = missing.length ? 'unavailable' : pending.length ? 'loading' : 'ready';
  const hasFinding = check.items.length > 0;
  const banner = $('siting-check');
  banner.dataset.status = check.status;
  banner.textContent = hasFinding
    ? (check.status === 'conflict' ? 'Conflict' : 'Review') + ' · ' + warningTitles.length
    : check.status === 'none'
      ? 'No build'
      : 'No overlap';
  banner.setAttribute(
    'aria-label',
    'CUP placement check: ' + banner.textContent + (hasFinding ? '. ' + warningTitles.join('. ') : '')
  );
  banner.title = hasFinding
    ? check.items.map((item) => item.detail).join(' ')
    : 'Screens SH 6, Fitch Pkwy, Rock Prairie Rd E, Midtown Dr, Lick Creek tributary, parks, and loaded federal overlays.';
}

function evidencePanel() {
  const renderStep = (item) =>
    '<article class="ev-step' +
    (item.isTool ? ' is-tool' : '') +
    '" data-tone="' +
    item.tone +
    '">' +
    '<div class="ev-step-head">' +
    '<span class="ev-bubble" aria-hidden="true">' +
    icon(item.icon) +
    '<em>' +
    item.step +
    '</em></span>' +
    '<span class="ev-date">' +
    escapeHTML(item.date) +
    '</span>' +
    '<span class="ev-rail" aria-hidden="true"></span>' +
    '</div>' +
    '<div class="ev-card">' +
    '<h3>' +
    escapeHTML(item.title) +
    '</h3>' +
    '<div class="ev-tags">' +
    item.tags.map((t) => '<span>' + escapeHTML(t) + '</span>').join('') +
    '</div>' +
    '<p>' +
    escapeHTML(item.text) +
    '</p>' +
    '<div class="ev-foot">' +
    (item.cites.length
      ? item.cites
          .map(
            (c) =>
              '<a class="ev-cite" target="_blank" rel="noopener" href="' +
              escapeHTML(c.url) +
              '">' +
              escapeHTML(c.label) +
              ' ↗</a>'
          )
          .join('')
      : '') +
    (item.action
      ? '<button type="button" class="ev-jump" data-preset-jump="' +
        escapeHTML(item.action.preset) +
        '">' +
        escapeHTML(item.action.label) +
        ' →</button>'
      : '') +
    '</div></div></article>';

  return (
    '<div class="ev-wrap">' +
    '<div class="ev-hero">' +
    '<p>How a closed-door data-center proposal led College Station to require public review — and where <strong>DataScope</strong> helps residents, city planners, and engineers test options before any vote.</p>' +
    '</div>' +
    '<section class="ev-timeline" aria-label="College Station data-center timeline">' +
    '<div class="ev-row">' +
    caseTimeline.slice(0, 3).map(renderStep).join('') +
    '</div>' +
    '<div class="ev-bridge" aria-hidden="true"><span>Next: new public rules &amp; early community testing</span></div>' +
    '<div class="ev-row">' +
    caseTimeline.slice(3, 6).map(renderStep).join('') +
    '</div></section>' +
    '<div class="ev-section-label">Who uses DataScope in a real public process</div>' +
    '<section class="ev-roles" aria-label="Who uses DataScope">' +
    '<div class="ev-role">' +
    '<span class="ev-role-ico">' +
    icon('workshop') +
    '</span><div><strong>Neighbors &amp; residents</strong><p>Check distance to homes and schools, compare a data center against keeping a park, and pin comments on the map.</p></div></div>' +
    '<div class="ev-role">' +
    '<span class="ev-role-ico">' +
    icon('plan') +
    '</span><div><strong>City planners</strong><p>Check candidate parcels against highways, creeks, flood zones, and parks early — before scheduling a public hearing.</p></div></div>' +
    '<div class="ev-role">' +
    '<span class="ev-role-ico">' +
    icon('inspect') +
    '</span><div><strong>Local engineers &amp; researchers</strong><p>Stress-test Texas summer power demand, local groundwater share, and emissions using open, shared assumptions.</p></div></div>' +
    '</section>' +
    '<section class="ev-guardrails" aria-label="What this tool can and cannot decide">' +
    '<div class="ev-guard is-can">' +
    '<h4>' +
    icon('check') +
    'What this tool can test early</h4><ul>' +
    '<li>Distance from nearby homes, schools, senior living, parks, and creeks.</li>' +
    '<li>Tradeoffs between a data center and keeping Midtown as parks, retail, and sports fields.</li>' +
    '<li>How site layouts, cooling systems, power sources, and community benefits compare side by side.</li>' +
    '</ul></div>' +
    '<div class="ev-guard is-cant">' +
    '<h4>' +
    icon('shield') +
    'What still requires city rules &amp; certified studies</h4><ul>' +
    '<li><strong>Ending secrecy:</strong> Requiring developers to publish real power, water, and noise specs upfront.</li>' +
    '<li><strong>Certified sound studies:</strong> Quick models miss deep low-frequency hum and need stamped acoustic engineering.</li>' +
    '<li><strong>Enforceable protections:</strong> Legally binding permit rules, groundwater limits, and electric-bill safeguards.</li>' +
    '</ul></div>' +
    '</section></div>'
  );
}

function drawMap() {
  map?.render({
    ...state,
    notes: [],
    mode: ui.mode,
    layers: ui.view === 'plan' ? ui.planLayers : ui.layers,
    selectedNote: null,
    lens: ui.lens,
    receptorId: ui.receptorId
  });
  $('modebar').hidden = ui.mode === 'explore';
  if (ui.mode !== 'explore')
    $('modebar').innerHTML =
      '<b>Choose a site for the facility</b><div class="mode-actions"><button data-act="center">Use view center</button><button data-act="cancel-mode">Cancel</button></div>';
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
  ui.mode = mode === 'note' ? 'explore' : mode;
  $('layers-menu').hidden = true;
  $('layers').setAttribute('aria-expanded', 'false');
  if (ui.mode !== 'explore' && ui.view === 'studio') map?.view('district');
  drawMap();
}
function viewControls() {
  $('zin').disabled = false;
  $('zout').disabled = false;
  const listening = ui.view === 'sentiment';
  document.body.dataset.workspace = listening ? 'sentiment' : 'scenario';
  document
    .querySelectorAll('[data-workview]')
    .forEach((b) =>
      b.setAttribute('aria-pressed', b.dataset.workview === (listening ? 'sentiment' : 'studio'))
    );
  $('workspace-title').textContent = listening
    ? 'Sentiment map · College Station, Texas'
    : 'Scenario Editor · College Station, Texas';
  document.querySelector('.workbench').hidden = listening;
  document.querySelector('.analysis').hidden = listening;
  $('sentiment').hidden = !listening;
  document.querySelector('.cam-modes').hidden = listening;
  document.querySelector('.aerial-modes').hidden = ui.view !== 'plan';
  $('map').hidden = ui.view !== 'plan';
  $('scene').hidden = ui.view !== 'studio';
  if (listening) hideOptionPopover();
}
function closeEditorOnSmallScreen() {
  if (!matchMedia('(max-width:700px)').matches) return;
  $('editor-toggle').setAttribute('aria-expanded', 'false');
  $('editor-content').hidden = true;
}
function setCamera(view) {
  ui.camera = view;
  $('editor-current').textContent = {
    building: 'Building design',
    site: 'Site layout',
    district: 'Neighborhood',
    plan: 'Map overview'
  }[view];
  $('editor-toggle').setAttribute('aria-label', 'Views and placement: ' + $('editor-current').textContent);
  $('stage').dataset.camera = view;
  renderMetrics();
  document
    .querySelectorAll('[data-camera]')
    .forEach((b) => b.setAttribute('aria-pressed', b.dataset.camera === view));
}
function aerialMap() {
  return (aerial ??= createMap($('map'), {
    onZoomChange: ({ canIn, canOut }) => {
      if (ui.view === 'plan') {
        $('zin').disabled = !canIn;
        $('zout').disabled = !canOut;
      }
    },
    onPlace: placeAt,
    onPreview: renderMetrics,
    onMoveEnd: (c) => {
      if (ui.view === 'plan') mapCenter = c;
    }
  }));
}
function changeView(view) {
  if (view === 'sentiment') {
    studio?.setDemo(false);
    ui.view = view;
    ui.mode = 'explore';
    viewControls();
    map = undefined;
    sentiment ??= createSentiment($('sentiment'), {
      onNote: addNoteAt,
      onMarker: showNote,
      onRestoreNote: (noteId) => restore(state.notes.find((n) => n.id === noteId)),
      onDemoChange: syncDemoButton,
      onExplore: (point, zoneId) => {
        const receptor = {
          langford: 'langford',
          independence: 'independence',
          'pebble-creek': 'pebble-creek',
          school: 'pebble-elem',
          medical: 'medical',
          midtown: 'langford',
          fitch: 'pebble-creek',
          tamu: 'midtown-reserve'
        }[zoneId];
        if (receptor) ui.receptorId = receptor;
        ui.lens = zoneId === 'fitch' ? 'water' : zoneId === 'midtown' ? 'parcel' : 'sound';
        changeView('studio');
        drawMap();
        renderMetrics();
        if (ui.view === 'studio') studio.view('district');
        else focusPoint(point);
      }
    });
    sentiment.showNotes(state.notes);
    sentiment.resize();
    sentiment.resetIdle();
    syncDemoButton();
    return;
  }
  sentiment?.setDemo(false);
  sentiment?.setNote(false);
  if (view === 'studio' && (!studio || unavailable || (state.point && !sceneContains(state.point))))
    view = 'plan';
  const changed = view !== ui.view;
  ui.view = view;
  ui.mode = 'explore';
  viewControls();
  if (view === 'plan') {
    studio?.setDemo(false);
    $('loading').hidden = true;
    setCamera('plan');
  } else {
    studio?.resetIdle();
  }
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
  syncDemoButton();
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
    toast('Choose a point inside the College Station study area.');
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
  } else if (key === 'none') {
    Object.assign(state, {
      active: 'none',
      point: null,
      angle: 0,
      integration: 'd1',
      cooling: 't1',
      energy: 'e1',
      benefits: []
    });
  } else if (Object.hasOwn(presetScenarios, key)) {
    const p = presetScenarios[key];
    Object.assign(state, {
      active: key,
      point: [...p.point],
      angle: p.angle,
      integration: p.integration,
      cooling: p.cooling,
      energy: p.energy,
      benefits: [...p.benefits]
    });
  } else {
    const s = state.scenarios.find((s) => s.id === key);
    if (!s) return;
    Object.assign(state, {
      active: s.id,
      point: [...s.point],
      angle: s.angle,
      integration: s.integration,
      cooling: s.cooling,
      energy: s.energy,
      benefits: [...(s.benefits || [])]
    });
  }
  if (state.point && key !== 'custom') focusPoint(state.point);
  if (key === 'custom' && ui.view === 'studio') map?.view('district');
  store();
  render();
}

function showDialog(title, html, large = false) {
  hideOptionPopover();
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
    toast('Choose a point inside the College Station study area.');
    return;
  }
  if (state.notes.length >= WORKSHOP_LIMITS.notes) {
    toast('This session has reached its note limit.');
    return;
  }
  showDialog(
    'Add a discussion note',
    '<form id="note-form"><p class="hint">Pinned on the College Station sentiment map · ' +
      escapeHTML(scenarioName()) +
      '</p><label class="field">Topic<select name="topic">' +
      topics.map((t) => '<option>' + t + '</option>').join('') +
      '</select></label><label class="field">Your note<textarea name="text" required maxlength="1200" placeholder="Share a question, concern, or suggestion at this location…"></textarea></label><p class="minor">Saved only in this browser, separate from the fictional sample remarks.</p><div class="dialog-actions"><button type="button" data-act="close">Cancel</button><button class="primary" type="submit">Save note</button></div></form>'
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
    ui.selectedNote = n.id;
    store();
    closeDialog();
    sentiment?.showNotes(state.notes, true);
    toast('Note pinned to the College Station map.');
  };
}

function showNote(noteId) {
  const n = state.notes.find((x) => x.id === noteId);
  if (!n) return;
  ui.selectedNote = n.id;
  focusPoint([n.lat, n.lng]);
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
        ? '<button data-restore="' + escapeHTML(n.id) + '">' + icon('footprint') + 'Open scenario</button>'
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
      constraints: 'Roads & CUP exclusions',
      environment: 'FEMA / NWI / PAD-US',
      site: 'Midtown study tract',
      river: 'Lick Creek tributary',
      places: 'Sensitive receptors'
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

function activeDemo() {
  if (ui.view === 'sentiment') return Boolean(sentiment?.isDemo?.());
  if (ui.view === 'studio') return Boolean(studio?.isDemo?.());
  return false;
}

function syncDemoButton() {
  const btn = $('demo');
  if (!btn) return;
  const playing = activeDemo();
  btn.setAttribute('aria-pressed', String(playing));
  btn.setAttribute('aria-label', playing ? 'Pause demo' : 'Play demo');
  btn.title = playing ? 'Pause demo' : 'Play demo';
  btn.innerHTML = icon(playing ? 'pause' : 'play');
}

function toggleDemo() {
  if (dialog.open) closeDialog();
  hideOptionPopover();
  if (ui.view === 'sentiment') {
    if (!sentiment) return;
    if (sentiment.isDemo()) {
      sentiment.setDemo(false);
    } else if (!sentiment.setDemo(true, { source: 'manual' })) {
      toast('No matching comments to tour — reset filters first.');
    }
    syncDemoButton();
    return;
  }
  if (ui.view === 'plan') {
    if (!studio || unavailable) {
      toast('3D scenario demo requires WebGL in this browser.');
      return;
    }
    changeView('studio');
    if (ui.view === 'studio') studio.setDemo(true, { source: 'manual' });
    syncDemoButton();
    return;
  }
  if (studio) {
    studio.setDemo(!studio.isDemo(), { source: 'manual' });
    syncDemoButton();
  }
}

const actions = {
  'cancel-mode': () => setMode('explore'),
  center: () => {
    if (ui.mode === 'place') placeAt(mapCenter);
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
    benefits: [...(attached.benefits || [])],
    active: attached.point ? 'custom' : 'none'
  });
  store();
  closeDialog();
  render();
  if (state.point) focusPoint(state.point);
}

// Hover, focus & click-pin triggers for clean option info popover
document.addEventListener('pointerover', (e) => {
  const infoBtn = e.target.closest('.opt-info');
  if (infoBtn && !popoverPinned) showOptionPopover(infoBtn);
});
document.addEventListener('pointerout', (e) => {
  const infoBtn = e.target.closest('.opt-info');
  if (infoBtn && !popoverPinned && !e.relatedTarget?.closest('.opt-info, #option-popover')) hideOptionPopover();
});
document.addEventListener('focusin', (e) => {
  const infoBtn = e.target.closest('.opt-info');
  if (infoBtn && !popoverPinned) showOptionPopover(infoBtn);
});
document.addEventListener('focusout', (e) => {
  if (e.target.closest('.opt-info') && !popoverPinned) hideOptionPopover();
});

document.addEventListener('click', (e) => {
  if (!$('layers-menu').hidden && !e.target.closest('#layers, #layers-menu')) toggleLayerMenu();
  if (popoverAnchor && !e.target.closest('.opt-info, #option-popover')) hideOptionPopover();
  const b = e.target.closest('button');
  if (!b) return;
  if (b.classList.contains('opt-info')) {
    if (popoverPinned && popoverAnchor === b && !$('option-popover').hidden) hideOptionPopover();
    else showOptionPopover(b, { pin: true });
    return;
  }
  if (b.dataset.act) {
    actions[b.dataset.act]?.();
    return;
  }
  if (b.dataset.workview) {
    changeView(b.dataset.workview);
    return;
  }
  if (b.dataset.presetJump) {
    if (dialog.open) closeDialog();
    choose(b.dataset.presetJump);
    return;
  }
  if (b.dataset.pillar) {
    if (!noBuild()) {
      ui.pillar = b.dataset.pillar;
      renderControls();
    }
    return;
  }
  if (b.dataset.option && b.dataset.optionPillar) {
    if (noBuild()) return;
    const pillar = b.dataset.optionPillar;
    const opt = b.dataset.option;
    if (pillar === 'benefits') {
      const next = new Set(state.benefits || []);
      if (next.has(opt)) next.delete(opt);
      else next.add(opt);
      state.benefits = [...next].sort();
    } else if (Object.hasOwn(pillarMeta[pillar]?.specs || {}, opt)) {
      state[pillar] = opt;
    }
    state.active = 'custom';
    store();
    render();
    return;
  }
  if (b.dataset.domain) {
    ui.domain = b.dataset.domain;
    renderControls();
    renderMetrics();
    return;
  }
  if (b.id === 'design-toggle' || b.id === 'context-toggle' || b.id === 'editor-toggle') {
    const open = b.getAttribute('aria-expanded') !== 'true';
    b.setAttribute('aria-expanded', open);
    $(b.getAttribute('aria-controls')).hidden = !open;
    if (b.id === 'context-toggle' && open) renderMetrics();
    hideOptionPopover();
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
      'CUP placement check',
      finding +
        '<p class="hint">Screens the rotated footprint against OpenStreetMap-aligned SH 6, Lakeway Drive, William D. Fitch Pkwy, neighborhood streets, Lick Creek, Spring Creek, parks, The Langford, existing buildings, and live federal overlays.</p><div class="nudge-row"><button data-example="creek">Try Lick Creek edge</button><button data-example="lakeway">Try Lakeway Dr edge</button></div>'
    );
    return;
  }
  if (b.dataset.example) {
    const examples = { creek: [30.57541, -96.26385], lakeway: [30.57085, -96.26497] };
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
  if (b.dataset.method) {
    showDialog('Model assumptions & limits', methodsHTML(b.dataset.method));
    return;
  }
  if (b.dataset.restore) {
    restore(state.notes.find((n) => n.id === b.dataset.restore));
    return;
  }
  const top = {
    full: toggleFull,
    demo: toggleDemo,
    evidence: () => showDialog('College Station case evidence & guardrails', evidencePanel(), true),
    methods: () => showDialog('Model assumptions & scope limits', methodsHTML(), true),
    layers: toggleLayerMenu,
    'retry-environment': () => loadEnvironmentalLayers({ retry: true }),
    'context-info': () =>
      showDialog(
        'CUP siting constraints',
        '<p>Red marks identify intersections with SH 6, William D. Fitch Pkwy, Rock Prairie Rd E, Midtown Drive, residential streets, or the Lick Creek tributary. Amber marks flag Texas Independence Park, The Langford Assisted Living, existing corridor buildings, or federal environmental review overlays.</p><p>Pre-application screening is not a buildability permit. Verify UDO Business Park / Industrial CUP rules, surveyed easements, and BVGCD/FEMA requirements with the City of College Station.</p>' +
          environmentalSources
            .map(
              (s) =>
                '<div class="ref"><h3>' +
                escapeHTML(s.label) +
                '</h3><p>' +
                escapeHTML(s.detail) +
                '</p><a href="' +
                s.source +
                '" target="_blank" rel="noopener">Source information</a></div>'
            )
            .join('')
      ),
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
    hideOptionPopover();
    studio?.setDemo(false);
    sentiment?.setDemo(false);
    sentiment?.setNote(false);
    if (!$('layers-menu').hidden) toggleLayerMenu();
    if (ui.mode !== 'explore') setMode('explore');
  }
});
document.addEventListener('fullscreenchange', () => {
  const isFull = Boolean(document.fullscreenElement);
  const fullBtn = $('full');
  fullBtn.setAttribute('aria-pressed', String(isFull));
  fullBtn.setAttribute('aria-label', isFull ? 'Exit full screen' : 'Enter full screen');
  fullBtn.title = isFull ? 'Exit full screen' : 'Full screen';
  fullBtn.innerHTML = icon(isFull ? 'compress' : 'expand');
  map?.resize();
  sentiment?.resize(false);
});
matchMedia('(max-width:700px)').addEventListener('change', () => {
  map?.resize();
  if (ui.view === 'plan') aerial?.home();
  sentiment?.resize(true);
});
window.addEventListener('storage', (e) => {
  if (dialog.open || ui.mode !== 'explore' || !e.key?.startsWith('datascope:college-station:')) return;
  Object.assign(state, loadWorkspace(site.center));
  if (ui.view === 'studio' && state.point && !sceneContains(state.point)) changeView('plan', false);
  render();
});

let ready = true;
try {
  ready = window.self === window.top;
} catch {
  ready = false;
}

if (ready) {
  hydrateIcons();
  if (matchMedia('(max-width:700px)').matches)
    for (const name of ['design', 'context', 'editor']) {
      $(name + '-toggle').setAttribute('aria-expanded', 'false');
      $(name + '-content').hidden = true;
    }

  function fallback() {
    if (unavailable) return;
    unavailable = true;
    $('loading').hidden = true;
    if (ui.view !== 'sentiment') changeView('plan', false);
    if (ui.view !== 'sentiment')
      toast('Using the map overview for this browser. Drag the footprint to test a College Station placement.');
  }
  onEnvironmentChange(() => {
    renderMetrics();
    drawMap();
  });
  void loadEnvironmentalLayers();
  render();
  try {
    const module = await import('./studio/scene.js');
    sceneContains = module.sceneContains;
    studio = module.makeScene($('scene'), {
      onPlace: placeAt,
      onRotate: rotateAt,
      onRotatePreview: (angle) => renderMetrics(state.point, angle),
      onPreview: renderMetrics,
      onCenter: (c) => {
        if (ui.view === 'studio') mapCenter = c;
      },
      onView: setCamera,
      onDemoChange: syncDemoButton,
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
  if (state.point && state.active !== 'conventional' && ui.view !== 'sentiment') focusPoint(state.point);
}

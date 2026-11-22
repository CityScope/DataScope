import { analyzePlacement, analysisMethods } from './analysis.js';
import { places } from '../geography.js';
import { icon } from '../icons.js';

const metricSets = {
  overview: [
    {
      key: 'energy',
      method: 'resources',
      field: 'energyGWh',
      name: 'Electricity',
      icon: 'bolt',
      unit: 'GWh/yr',
      factor: 1,
      min: 0,
      max: 250,
      digits: 1,
      percentDelta: true,
      caption: (r, placed) =>
        !placed
          ? 'No compute load (Midtown alt)'
          : r.matchPct === 100
            ? r.netGridPeakMW.toFixed(1) + ' MW net peak · 100% matched'
            : r.peakMW.toFixed(1) + ' MW 105°F peak · PUE ' + r.pue.toFixed(2)
    },
    {
      key: 'cooling',
      method: 'resources',
      field: 'waterMGal',
      name: 'Simsboro water',
      icon: 'water',
      unit: 'M gal/yr',
      factor: 1,
      min: 0,
      max: 75,
      digits: 1,
      percentDelta: true,
      caption: (r, placed) =>
        !placed
          ? '0% of CSU Simsboro permit'
          : r.simsboroPct.toFixed(2) + '% of CSU cap · ' + Math.round(r.waterAcreFtYr) + ' ac-ft/yr'
    },
    {
      key: 'sound',
      method: 'sound',
      field: 'soundDbA',
      name: 'Equipment sound',
      icon: 'sound',
      unit: 'dBA',
      factor: 1,
      min: 20,
      max: 70,
      digits: 1,
      deltaUnit: 'dB'
    },
    {
      key: 'value',
      method: 'economic',
      field: 'localValueMYr',
      name: 'Local value',
      icon: 'dollar',
      unit: '$M/yr',
      factor: 1,
      min: 0,
      max: 7,
      digits: 1,
      deltaUnit: 'M',
      caption: (r, placed) =>
        !placed
          ? 'Midtown retail/park tax · 420 jobs'
          : r.permanentJobs + ' perm. jobs · +$' + r.capexDeltaM + 'M pkg'
    },
    {
      key: 'parcel',
      method: 'parcel',
      field: 'parcelCoveragePct',
      name: 'CUP parcel & creek',
      icon: 'parcel',
      unit: '%',
      factor: 1,
      min: 0,
      max: 100,
      digits: 0,
      deltaUnit: 'pp',
      caption: (r, placed) => {
        if (!placed) return '18 ac walkable Midtown vision';
        if (r.riverOutOfCoverage) return 'Outside Midtown study map';
        const ft = Math.round(r.riverSetbackM * 3.28084);
        if (ft === 0) return 'Lick Creek tributary overlap';
        if (ft < 150) return ft + ' ft to Lick Creek (<150 ft buffer)';
        return ft.toLocaleString('en-US') + ' ft to Lick Creek trib.';
      },
      warn: (r, placed) => placed && !r.riverOutOfCoverage && r.riverSetbackM * 3.28084 < 150
    }
  ],
  env: [
    {
      key: 'energy',
      method: 'resources',
      field: 'netGridPeakMW',
      name: 'Net ERCOT peak',
      icon: 'bolt',
      unit: 'MW',
      factor: 1,
      min: 0,
      max: 42,
      digits: 1,
      deltaUnit: 'MW',
      caption: (r, placed) =>
        !placed
          ? '0 MW added to CSU / ERCOT'
          : r.peakMW.toFixed(1) + ' MW facility · ' + r.energyGWh.toFixed(0) + ' GWh/yr'
    },
    {
      key: 'cooling',
      method: 'resources',
      field: 'waterMGal',
      name: 'Simsboro water',
      icon: 'water',
      unit: 'M gal/yr',
      factor: 1,
      min: 0,
      max: 75,
      digits: 1,
      percentDelta: true,
      caption: (r, placed) =>
        !placed
          ? 'Zero potable aquifer cooling'
          : r.reclaimedMGal > 0
            ? r.simsboroPct.toFixed(2) + '% CSU cap + ' + r.reclaimedMGal.toFixed(1) + 'M reclaimed'
            : r.simsboroPct.toFixed(2) + '% of 22,626 ac-ft CSU cap'
    },
    {
      key: 'co2',
      method: 'resources',
      field: 'co2KtYr',
      name: 'Net grid CO₂',
      icon: 'sun',
      unit: 'kt/yr',
      factor: 1,
      min: 0,
      max: 85,
      digits: 1,
      percentDelta: true,
      caption: (r, placed) =>
        !placed
          ? 'No industrial compute emissions'
          : r.offsiteSqMi > 0
            ? 'ERCT factor · ' + r.offsiteSqMi + ' sq mi remote land'
            : r.energy === 'e4'
              ? 'Behind-the-meter SMR · +60 MW heat'
              : 'EPA eGRID ERCT (0.334 t/MWh)'
    },
    {
      key: 'sound',
      method: 'sound',
      field: 'soundDbA',
      name: 'Receptor sound',
      icon: 'sound',
      unit: 'dBA',
      factor: 1,
      min: 20,
      max: 70,
      digits: 1,
      deltaUnit: 'dB'
    },
    {
      key: 'water',
      method: 'water',
      field: 'riverSetbackM',
      name: 'Creek clearance',
      icon: 'river',
      unit: 'ft',
      factor: 3.28084,
      min: 0,
      max: 2000,
      digits: 0,
      deltaUnit: 'ft',
      caption: (r, placed) => {
        if (!placed) return 'Full Lick Creek greenbelt intact';
        if (r.riverOutOfCoverage) return 'Beyond mapped creek reach';
        const ft = Math.round(r.riverSetbackM * 3.28084);
        if (ft === 0) return 'Lick Creek tributary overlap';
        if (ft < 150) return 'Inside 150 ft riparian buffer';
        return 'Edge to Lick Creek tributary';
      },
      warn: (r, placed) => placed && !r.riverOutOfCoverage && r.riverSetbackM * 3.28084 < 150
    }
  ],
  econ: [
    {
      key: 'capex',
      method: 'economic',
      field: 'capexDeltaM',
      name: 'Package cost Δ',
      icon: 'dollar',
      unit: '$M',
      factor: 1,
      min: 0,
      max: 300,
      digits: 0,
      deltaUnit: 'M',
      caption: (r, placed) =>
        !placed
          ? 'Midtown mixed-use benchmark'
          : r.upfrontPoolM > 0
            ? 'Incl. $10M upfront benefit pool'
            : 'Added site, tech & energy capex'
    },
    {
      key: 'tax',
      method: 'economic',
      field: 'taxMYr',
      name: 'Municipal tax',
      icon: 'parcel',
      unit: '$M/yr',
      factor: 1,
      min: 0,
      max: 5,
      digits: 1,
      deltaUnit: 'M',
      caption: (r, placed) =>
        !placed ? 'Midtown retail & sports tax' : 'Est. city/CSU tax (30 MW CUP)'
    },
    {
      key: 'benefit',
      method: 'economic',
      field: 'annualBenefitMYr',
      name: 'Benefit pool',
      icon: 'shield',
      unit: '$M/yr',
      factor: 1,
      min: 0,
      max: 3,
      digits: 2,
      deltaUnit: 'M',
      caption: (r, placed) =>
        !placed
          ? 'No data-center benefit pact'
          : r.benefits.length
            ? r.benefits.length + ' active module' + (r.benefits.length > 1 ? 's' : '') + ' + $10M pool'
            : 'Select B1–B4 modules to allocate'
    },
    {
      key: 'jobs',
      method: 'economic',
      field: 'permanentJobs',
      name: 'Permanent jobs',
      icon: 'users',
      unit: 'FTE',
      factor: 1,
      min: 0,
      max: 450,
      digits: 0,
      deltaUnit: 'jobs',
      caption: (r, placed) =>
        !placed
          ? 'Walkable Midtown benchmark (~2.1/ac)'
          : r.integration === 'd4'
            ? '32–52 data center + 45 civic/retail'
            : 'Low density vs. 420 Midtown alt'
    },
    {
      key: 'buildjobs',
      method: 'economic',
      field: 'constructionJobYears',
      name: 'Build work',
      icon: 'district',
      unit: 'job-yr',
      factor: 1,
      min: 0,
      max: 600,
      digits: 0,
      deltaUnit: 'j-yr',
      caption: (r, placed) =>
        !placed
          ? 'Park, retail & sports complex build'
          : r.trainingSlotsYr
            ? 'Temporary · +' + r.trainingSlotsYr + ' paid trainees/yr'
            : 'Temporary only (separate from FTE)'
    }
  ],
  social: [
    {
      key: 'receptor',
      method: 'social',
      field: 'nearestReceptorM',
      name: 'Nearest receptor',
      icon: 'loc',
      unit: 'ft',
      factor: 3.28084,
      min: 0,
      max: 3500,
      digits: 0,
      deltaUnit: 'ft',
      caption: (r, placed) =>
        !placed ? 'No industrial siting conflict' : r.nearestReceptorName
    },
    {
      key: 'sound',
      method: 'sound',
      field: 'soundDbA',
      name: 'Receptor sound',
      icon: 'sound',
      unit: 'dBA',
      factor: 1,
      min: 20,
      max: 70,
      digits: 1,
      deltaUnit: 'dB'
    },
    {
      key: 'protect',
      method: 'social',
      field: 'householdsProtected',
      name: 'Home protection',
      icon: 'shield',
      unit: 'homes',
      factor: 1,
      min: 0,
      max: 260,
      digits: 0,
      deltaUnit: '',
      caption: (r, placed) =>
        !placed
          ? 'No nearby acoustic burden'
          : r.householdsProtected
            ? 'Retrofits & bill aid (owners + renters)'
            : 'Enable B3 for nearest households'
    },
    {
      key: 'grants',
      method: 'social',
      field: 'grantKYr',
      name: 'Annual grants',
      icon: 'users',
      unit: '$k/yr',
      factor: 1,
      min: 0,
      max: 1600,
      digits: 0,
      deltaUnit: 'k',
      caption: (r, placed) =>
        !placed
          ? 'Standard city general fund'
          : r.grantKYr
            ? 'Endowment: schools, health & parks'
            : 'Enable B1 for resident grant fund'
    },
    {
      key: 'amenity',
      method: 'social',
      field: 'amenityAcres',
      name: 'Midtown amenity',
      icon: 'park',
      unit: 'acres',
      factor: 1,
      min: 0,
      max: 20,
      digits: 1,
      deltaUnit: 'ac',
      caption: (r, placed) =>
        !placed
          ? 'Full walkable park & sports vision'
          : r.heatDeliveredGWh > 0
            ? r.heatDeliveredGWh.toFixed(0) + ' GWh_th heat reuse + civic space'
            : r.amenityAcres > 0
              ? 'Public greenbelt & civic buffers'
              : 'Walled campus (add D2/D4 for public)'
    }
  ]
};

export const metricConfig = metricSets.overview;

export const displayNumber = (value, digits = 0) =>
  value == null
    ? '—'
    : value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const scale = (n, c) => Math.min(100, Math.max(0, ((n - c.min) / (c.max - c.min)) * 100));

export function createReadouts(container) {
  let activeDomain = 'overview';
  let entries = [];

  function build(domain, receptorId) {
    activeDomain = metricSets[domain] ? domain : 'overview';
    container.replaceChildren();
    entries = metricSets[activeDomain].map((c) => {
      const el = document.createElement('section');
      el.className = 'analysis-metric ' + c.key;
      el.innerHTML =
        '<button class="metric-name" data-method="' +
        (c.method || c.key) +
        '">' +
        icon(c.icon) +
        c.name +
        '</button><div class="metric-line"><strong><span></span> <small>' +
        c.unit +
        '</small></strong><span class="change"></span></div><div class="meter" aria-hidden="true"><i></i><b></b></div>';
      let caption = null,
        soundHint = null;
      if (c.key === 'sound') {
        soundHint = document.createElement('span');
        soundHint.className = 'sound-shield';
        el.querySelector('.metric-line').append(soundHint);
        const label = document.createElement('label');
        label.className = 'receiver';
        const sel = document.createElement('select');
        sel.id = 'receiver';
        sel.setAttribute('aria-label', 'Equipment sound listening point');
        places.forEach((p) => sel.add(new Option(p.name, p.id)));
        sel.value = receptorId || 'langford';
        label.append(sel);
        el.append(label);
      } else if (c.caption) {
        caption = document.createElement('span');
        caption.className = 'metric-caption';
        el.append(caption);
      }
      container.append(el);
      return {
        c,
        el,
        value: el.querySelector('strong span'),
        unit: el.querySelector('strong small'),
        change: el.querySelector('.change'),
        fill: el.querySelector('.meter i'),
        base: el.querySelector('.meter b'),
        caption,
        soundHint
      };
    });
  }

  build('overview', 'langford');

  return (placement, receptorId = 'langford', domain = activeDomain) => {
    if (domain !== activeDomain) build(domain, receptorId);
    const receiverSelect = container.querySelector('#receiver');
    if (receiverSelect && receiverSelect.value !== receptorId) receiverSelect.value = receptorId;
    const result = analyzePlacement(placement, { receptorId });
    const placed = Boolean(placement.point);
    for (const item of entries) {
      const { c, el, value, unit, change, fill, base, caption, soundHint } = item,
        n = result[c.field],
        diff = result.delta[c.field];
      const baseVal = diff == null || n == null ? null : n - diff;
      const rounded =
        diff == null
          ? null
          : c.percentDelta && baseVal
            ? Number(((100 * diff) / baseVal).toFixed(1))
            : Number((diff * c.factor).toFixed(c.digits));
      value.textContent = displayNumber(n == null ? null : n * c.factor, c.digits);
      unit.hidden = n == null;
      change.textContent =
        !placed && n == null
          ? 'No facility'
          : !placed
            ? 'Midtown alt'
            : n == null
              ? c.key === 'water' && result.riverOutOfCoverage
                ? 'Beyond creek map'
                : 'Not modeled'
              : rounded === 0
                ? 'At baseline'
                : (rounded > 0 ? '+' : '−') +
                  displayNumber(Math.abs(rounded), c.percentDelta && Number.isInteger(rounded) ? 0 : c.digits) +
                  (c.percentDelta ? '%' : c.deltaUnit ? ' ' + c.deltaUnit : '');
      change.classList.toggle('changed', !!rounded);
      change.title = 'Difference from Conventional baseline (D1 · T1 · E1) at Midtown Business Park';
      fill.style.width = (n == null ? 0 : scale(n * c.factor, c)) + '%';
      base.style.left = baseVal == null ? '0%' : scale(baseVal * c.factor, c) + '%';
      base.hidden = baseVal == null;
      if (caption) {
        caption.textContent = typeof c.caption === 'function' ? c.caption(result, placed) : c.caption;
        el.dataset.alert = typeof c.warn === 'function' && c.warn(result, placed) ? 'warn' : '';
      }
      if (soundHint) {
        const shielded = placed && result.soundShieldingDb >= 0.8;
        soundHint.textContent = !placed
          ? ''
          : shielded
            ? '−' + result.soundShieldingDb.toFixed(1) + ' dB screen'
            : 'Line of sight';
        soundHint.dataset.shielded = shielded ? 'yes' : 'no';
        soundHint.title = !placed
          ? ''
          : shielded
            ? 'Building, berm, or baffle wall reduces yard sound toward ' +
              result.receptorName +
              ' (dBA screen only; low-frequency 60–120 Hz requires certified dBC testing).'
            : 'Direct line of sight from west yard toward ' +
              result.receptorName +
              ' (dBA screen only; 60–120 Hz tonal hum requires certified dBC testing).';
      }
    }
    return result;
  };
}

export function methodsHTML(key) {
  const methods = key ? [analysisMethods[key]] : Object.values(analysisMethods);
  return (
    methods
      .filter(Boolean)
      .map(
        (m) =>
          '<section class="method"><h3>' +
          m.title +
          '</h3><p>' +
          m.text +
          '</p>' +
          (m.url ? '<a href="' + m.url + '" target="_blank" rel="noopener">Source record</a>' : '') +
          '</section>'
      )
      .join('') +
    '<p class="minor">Deltas compare against the Conventional baseline (D1 · T1 · E1 · no benefit pact) at 0° in Midtown Business Park for a 20 MW peak IT / 220 GWh/yr CUP-scale facility in ASHRAE Zone 2A (College Station, TX). All acoustics, aquifer shares, and fiscal figures are pre-application screening tools — never a permit, contract, or substitute for certified dBC engineering studies and binding CUP covenants.</p>'
  );
}

import { analyzePlacement, analysisMethods } from './analysis.js';
import { places } from '../geography.js';
import { icon } from '../icons.js';

export const metricConfig = [
  {
    key: 'energy',
    method: 'resources',
    field: 'energyGWh',
    name: 'Electricity',
    icon: 'bolt',
    unit: 'GWh/yr',
    factor: 1,
    min: 0,
    max: 210,
    digits: 1,
    percentDelta: true,
    caption: (r, placed) =>
      !placed
        ? 'No facility placed'
        : r.peakMW.toFixed(1) + ' MW peak · PUE ' + r.pue.toFixed(2)
  },
  {
    key: 'cooling',
    method: 'resources',
    field: 'waterMGal',
    name: 'Cooling water',
    icon: 'water',
    unit: 'M gal/yr',
    factor: 1,
    min: 0,
    max: 60,
    digits: 1,
    percentDelta: true,
    caption: (r, placed) =>
      !placed
        ? 'No facility placed'
        : '~' +
          (r.waterKGalDay >= 10 ? Math.round(r.waterKGalDay) : r.waterKGalDay.toFixed(1)) +
          'k gal/day · WUE ' +
          r.wue.toFixed(2)
  },
  {
    key: 'sound',
    field: 'soundDbA',
    name: 'Equipment sound',
    icon: 'sound',
    unit: 'dBA',
    factor: 1,
    min: 25,
    max: 75,
    digits: 1,
    deltaUnit: 'dB'
  },
  {
    key: 'water',
    field: 'riverSetbackM',
    name: 'River clearance',
    icon: 'river',
    unit: 'ft',
    factor: 3.28084,
    min: 0,
    max: 1500,
    digits: 0,
    deltaUnit: 'ft',
    caption: (r, placed) => {
      if (!placed) return 'Building edge to river';
      if (r.riverOutOfCoverage) return 'Beyond mapped river reach';
      const ft = Math.round(r.riverSetbackM * 3.28084);
      if (ft === 0) return 'River channel overlap';
      if (ft < 100) return 'Inside 100 ft river buffer';
      return 'Building edge to river';
    }
  },
  {
    key: 'parcel',
    field: 'parcelCoveragePct',
    name: 'Footprint inside parcel',
    icon: 'parcel',
    unit: '%',
    factor: 1,
    min: 0,
    max: 100,
    digits: 0,
    deltaUnit: 'pp',
    caption: (r, placed) => {
      if (!placed) return 'Share inside proposed parcel';
      if (r.utilityRunM == null) return 'Outside modeled district';
      const ft = Math.round(r.utilityRunM * 3.28084);
      return ft === 0 ? 'On Enterprise Dr right-of-way' : ft.toLocaleString('en-US') + ' ft to Enterprise Dr';
    }
  }
];
export const displayNumber = (value, digits = 0) =>
  value == null
    ? '—'
    : value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const scale = (n, c) => Math.min(100, Math.max(0, ((n - c.min) / (c.max - c.min)) * 100));

export function createReadouts(container) {
  const entries = metricConfig.map((c) => {
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
      sel.value = 'riel';
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
  return (placement, receptorId) => {
    const result = analyzePlacement(placement, { receptorId });
    const placed = Boolean(placement.point);
    for (const item of entries) {
      const { c, el, value, unit, change, fill, base, caption, soundHint } = item,
        n = result[c.field],
        diff = result.delta[c.field],
        rounded =
          diff == null
            ? null
            : c.percentDelta
              ? Number(((100 * diff) / (n - diff)).toFixed(1))
              : Number((diff * c.factor).toFixed(c.digits));
      value.textContent = displayNumber(n == null ? null : n * c.factor, c.digits);
      unit.hidden = n == null;
      change.textContent = !placed
        ? 'No facility'
        : n == null
          ? c.key === 'water' && result.riverOutOfCoverage
            ? 'Beyond river coverage'
            : 'Not modeled'
          : rounded === 0
            ? 'At reference'
            : (rounded > 0 ? '+' : '−') +
              displayNumber(Math.abs(rounded), c.percentDelta && Number.isInteger(rounded) ? 0 : c.digits) +
              (c.percentDelta ? '%' : ' ' + c.deltaUnit);
      change.classList.toggle('changed', !!rounded);
      change.title = 'Difference from reference design at proposed site';
      fill.style.width = (n == null ? 0 : scale(n * c.factor, c)) + '%';
      base.style.left = diff == null ? '0%' : scale((n - diff) * c.factor, c) + '%';
      base.hidden = diff == null;
      if (caption) {
        caption.textContent = typeof c.caption === 'function' ? c.caption(result, placed) : c.caption;
        el.dataset.alert =
          c.key === 'water' && placed && !result.riverOutOfCoverage && result.riverSetbackM * 3.28084 < 100
            ? 'warn'
            : '';
      }
      if (soundHint) {
        const shielded = placed && result.soundShieldingDb >= 0.8;
        soundHint.textContent = !placed
          ? ''
          : shielded
            ? 'Shielded −' + result.soundShieldingDb.toFixed(1) + ' dB'
            : 'Direct line of sight';
        soundHint.dataset.shielded = shielded ? 'yes' : 'no';
        soundHint.title = !placed
          ? ''
          : shielded
            ? 'Main hall sits between the west mechanical yard and ' + result.receptorName
            : 'Mechanical yard has direct line of sight toward ' + result.receptorName;
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
    '<p class="minor">Reference marks and deltas compare against the evaporative Reference design at 0° on the proposed Enterprise Drive site. Electricity, peak demand, CO₂, and cooling water depend on cooling design for the same 17.3 MW IT load in Southeast Michigan (ASHRAE Zone 5A). Equipment sound responds to cooling design, location, and rotation (including 3D building shielding of the west mechanical yard). The sound meter spans 25–75 dBA, water 0–60 M gal/yr, electricity 0–210 GWh/yr, river clearance 0–1,500 ft, and parcel fit 0–100%.</p>'
  );
}

import { analyzePlacement, analysisMethods } from './analysis.js';
import { places } from '../geography.js';
import { icon } from '../icons.js';

export const metricConfig = [
  {
    key: 'energy', method: 'resources', field: 'energyGWh', name: 'Electricity',
    icon: 'bolt', unit: 'GWh/yr', factor: 1, min: 0, max: 200, digits: 1, percentDelta: true
  },
  {
    key: 'cooling', method: 'resources', field: 'waterMGal', name: 'Cooling water',
    icon: 'water', unit: 'M gal/yr', factor: 1, min: 0, max: 3, digits: 1, percentDelta: true
  },
  {
    key: 'sound',
    field: 'soundDbA',
    name: 'Equipment sound',
    icon: 'sound',
    unit: 'dBA',
    factor: 1,
    min: 20,
    max: 65,
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
    caption: 'Building edge to mapped river centerline'
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
    caption: 'Share inside the proposed site'
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
    if (c.key === 'sound') {
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
      const caption = document.createElement('span');
      caption.className = 'metric-caption';
      caption.textContent = c.caption;
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
      base: el.querySelector('.meter b')
    };
  });
  return (placement, receptorId) => {
    const result = analyzePlacement(placement, { receptorId });
    for (const item of entries) {
      const { c, value, unit, change, fill, base } = item,
        n = result[c.field],
        diff = result.delta[c.field],
        rounded = diff == null ? null : c.percentDelta ? Number((100 * diff / (n - diff)).toFixed(1)) : Number((diff * c.factor).toFixed(c.digits));
      value.textContent = displayNumber(n == null ? null : n * c.factor, c.digits);
      unit.hidden = n == null;
      change.textContent =
        !placement.point ? 'No facility' : n == null
          ? c.key === 'water' && result.riverOutOfCoverage ? 'Beyond river coverage' : 'Not modeled'
          : rounded === 0
            ? 'At reference'
            : (rounded > 0 ? '+' : '−') + displayNumber(Math.abs(rounded), c.percentDelta && Number.isInteger(rounded) ? 0 : c.digits) + (c.percentDelta ? '%' : ' ' + c.deltaUnit);
      change.classList.toggle('changed', !!rounded);
      change.title = 'Difference from reference design at proposed site';
      fill.style.width = (n == null ? 0 : scale(n * c.factor, c)) + '%';
      base.style.left = diff == null ? '0%' : scale((n - diff) * c.factor, c) + '%';
      base.hidden = diff == null;
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
    '<p class="minor">Reference marks and changes compare with the reference design at its starting position on Enterprise Drive. Electricity and cooling-water changes are percentages of the reference design; their annual use depends on the design, not its location. All designs share the same modeled footprint and equipment sound assumption. The sound scale spans 20–65 dBA, river clearance 0–1,500 ft and parcel coverage 0–100%. Numbers show the full values. A percentage-point change measures the difference between two percentages.</p>'
  );
}

import { analyzePlacement, analysisMethods } from './analysis.js';
import { places } from '../geography.js';
import { icon } from '../icons.js';

export const metricConfig = [
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
export function createReadouts(container, resourceContainer) {
  const entries = metricConfig.map((c) => {
    const el = document.createElement('section');
    el.className = 'analysis-metric ' + c.key;
    el.innerHTML =
      '<button class="metric-name" data-method="' +
      c.key +
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
    } else {
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
  resourceContainer.innerHTML =
    '<div class="resource-grid"><div><span>Electricity</span><b id="energy-value"></b> <small>GWh</small></div><div><span>Cooling water</span><b id="water-value"></b> <small id="water-unit">M gal</small></div></div>';
  const energy = resourceContainer.querySelector('#energy-value'),
    water = resourceContainer.querySelector('#water-value'),
    waterUnit = resourceContainer.querySelector('#water-unit');
  return (placement, receptorId) => {
    const result = analyzePlacement(placement, { receptorId });
    for (const item of entries) {
      const { c, value, unit, change, fill, base } = item,
        n = result[c.field],
        diff = result.delta[c.field],
        rounded = diff == null ? null : Number((diff * c.factor).toFixed(c.digits));
      value.textContent = displayNumber(n == null ? null : n * c.factor, c.digits);
      unit.hidden = n == null;
      change.textContent =
        n == null
          ? c.key === 'water' && result.riverOutOfCoverage ? 'Beyond river coverage' : 'No facility'
          : rounded === 0
            ? 'At reference'
            : (rounded > 0 ? '+' : '−') + displayNumber(Math.abs(rounded), c.digits) + ' ' + c.deltaUnit;
      change.classList.toggle('changed', !!rounded);
      change.title = 'Difference from reference design at proposed site';
      fill.style.width = (n == null ? 0 : scale(n * c.factor, c)) + '%';
      base.style.left = diff == null ? '0%' : scale((n - diff) * c.factor, c) + '%';
      base.hidden = diff == null;
    }
    energy.textContent = displayNumber(result.energyGWh, placement.point ? 1 : 0);
    water.textContent =
      result.waterMGal === null ? 'Unmodeled' : displayNumber(result.waterMGal, placement.point ? 1 : 0);
    waterUnit.hidden = result.waterMGal === null;
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
    '<p class="minor">Reference marks and changes compare with the reference design at its starting position on Enterprise Drive. The sound scale spans 20–65 dBA, river clearance 0–1,500 ft and parcel coverage 0–100%. Numbers show the full values. A percentage-point change measures the difference between two percentages.</p>'
  );
}

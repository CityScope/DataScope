// Fetch source geometries directly in the browser; no third-party datasets are
// copied into this repository. Inventories identify review areas, not permits.
import { site } from './geography.js';
export const environmentalBounds = [-96.292, 30.55, -96.235, 30.592];
const mx = 111320 * Math.cos((site.center[0] * Math.PI) / 180);
const local = ([lng, lat]) => [(lng - site.center[1]) * mx, (site.center[0] - lat) * 111320];
export const environmentalSources = [
  {
    id: 'wetlands',
    label: 'Wetlands',
    color: '#4a94a1',
    endpoint: 'https://fwspublicservices.wim.usgs.gov/wetlandsmapservice/rest/services/Wetlands/MapServer/0',
    where: "WETLAND_TYPE <> 'Riverine'",
    fields: 'OBJECTID,ATTRIBUTE,WETLAND_TYPE,ACRES',
    source: 'https://www.fws.gov/program/national-wetlands-inventory/wetlands-mapper',
    detail:
      'USFWS National Wetlands Inventory along Lick Creek tributaries. Biological mapping identifies review areas, not federal jurisdictional determinations.'
  },
  {
    id: 'open-space',
    label: 'Parks & conservation',
    color: '#51866b',
    endpoint:
      'https://services.arcgis.com/v01gqwM5QqNysAAi/arcgis/rest/services/PADUS_Protection_Status_by_GAP_Status_Code/FeatureServer/0',
    where: '1=1',
    fields: 'OBJECTID,Unit_Nm,GAP_Sts,DesTp_Desc,MngNm_Desc,Category',
    source: 'https://www.usgs.gov/programs/gap-analysis-project/science/pad-us-data-overview',
    detail:
      'USGS PAD-US public open-space inventory covering College Station municipal parks and easements. Confirm parcel dedications and covenants with the city.'
  },
  {
    id: 'flood',
    label: 'Flood hazards',
    color: '#8176ae',
    endpoint: 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28',
    where: "SFHA_TF='T' OR ZONE_SUBTY='0.2 PCT ANNUAL CHANCE FLOOD HAZARD'",
    fields: 'OBJECTID,FLD_ZONE,ZONE_SUBTY,SFHA_TF',
    source: 'https://www.fema.gov/flood-maps/national-flood-hazard-layer',
    detail:
      'FEMA National Flood Hazard Layer for Brazos County drainage basins. Flood zones identify stormwater and regulatory review areas, not a blanket prohibition.'
  }
];
export const environmentalFeatures = [];
export const environmentalState = environmentalSources.map((s) => ({
  id: s.id,
  label: s.label,
  state: 'loading',
  count: 0
}));
let version = 0,
  started = false,
  loading = false;
const listeners = new Set();
export const environmentalVersion = () => version;
export function onEnvironmentChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const envelope = (ring) => [
  Math.min(...ring.map((p) => p[0])),
  Math.min(...ring.map((p) => p[1])),
  Math.max(...ring.map((p) => p[0])),
  Math.max(...ring.map((p) => p[1]))
];
const intersects = (a, b) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
export function normalizeEnvironmental(source, collection) {
  const features = [];
  for (const f of collection.features || []) {
    const polygons =
      f.geometry?.type === 'Polygon'
        ? [f.geometry.coordinates]
        : f.geometry?.type === 'MultiPolygon'
          ? f.geometry.coordinates
          : [];
    const pieces = polygons
      .filter((p) => p[0]?.length >= 4 && intersects(envelope(p[0]), environmentalBounds))
      .map((p) => {
        const rings = p.map((r) => r.slice(0, -1).map(local));
        return { poly: rings[0], holes: rings.slice(1), bbox: envelope(rings[0]) };
      });
    if (!pieces.length) continue;
    const props = f.properties || {},
      designation = String(props.DesTp_Desc || '');
    const label =
      source.id === 'wetlands'
        ? String(props.WETLAND_TYPE || 'Mapped wetland')
        : source.id === 'flood'
          ? props.ZONE_SUBTY === 'FLOODWAY'
            ? 'Regulatory floodway'
            : props.SFHA_TF === 'T'
              ? '1% annual-chance flood area'
              : '0.2% annual-chance flood area'
          : /easement/i.test(designation)
            ? 'Conservation easement'
            : String(props.Unit_Nm || 'Mapped public open space');
    features.push({
      id: source.id + ':' + (props.OBJECTID ?? f.id ?? features.length),
      layer: source.id,
      label,
      title: label + ' overlap',
      severity: 'review',
      color: source.color,
      pieces,
      detail:
        source.detail +
        (designation ? ' Designation: ' + designation + '.' : '') +
        (props.Unit_Nm ? ' Inventory name: ' + props.Unit_Nm + '.' : ''),
      source: source.source
    });
  }
  return features;
}
// FEMA also supports an ArcGIS JSON callback transport. Use that official
// read-only endpoint when a browser rejects the cross-origin fetch response.
export function arcgisPolygons(collection) {
  const signed = (ring) =>
    ring.reduce((sum, a, i) => {
      const b = ring[(i + 1) % ring.length];
      return sum + a[0] * b[1] - b[0] * a[1];
    }, 0) / 2;
  const contains = (p, ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i],
        b = ring[j];
      if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0])
        inside = !inside;
    }
    return inside;
  };
  return {
    error: collection.error,
    exceededTransferLimit: collection.exceededTransferLimit,
    features: (collection.features || []).map((f) => {
      const rings = f.geometry?.rings || [];
      const polygons = rings.filter((r) => signed(r) < 0).map((r) => [r]);
      for (const hole of rings.filter((r) => signed(r) >= 0)) {
        const owners = polygons
          .filter((p) => contains(hole[0], p[0]))
          .sort((a, b) => Math.abs(signed(a[0])) - Math.abs(signed(b[0])));
        if (owners[0]) owners[0].push(hole);
      }
      return { type: 'Feature', properties: f.attributes, geometry: { type: 'MultiPolygon', coordinates: polygons } };
    })
  };
}
let callbackSequence = 0;
function floodCallback(endpoint, parameters) {
  return new Promise((resolve, reject) => {
    const name = 'dataScopeFloodResponse' + ++callbackSequence,
      script = document.createElement('script');
    const params = new URLSearchParams(parameters);
    params.set('f', 'json');
    params.set('callback', name);
    let timer;
    const clean = () => {
      clearTimeout(timer);
      script.remove();
      delete window[name];
    };
    window[name] = (data) => {
      clean();
      resolve(arcgisPolygons(data));
    };
    script.onerror = () => {
      clean();
      reject(new Error('Flood source unavailable'));
    };
    timer = setTimeout(() => {
      clean();
      reject(new Error('Flood source timed out'));
    }, 25000);
    script.src = endpoint + '/query?' + params;
    document.head.append(script);
  });
}
export async function loadEnvironmentalLayers({ retry = false } = {}) {
  if (loading || (started && !retry)) return;
  started = true;
  loading = true;
  await Promise.allSettled(
    environmentalSources.map(async (source, i) => {
      const status = environmentalState[i];
      if (retry && status.state === 'ready') return;
      status.state = 'loading';
      listeners.forEach((fn) => fn());
      try {
        const params = new URLSearchParams({
          f: 'geojson',
          where: source.where,
          geometry: environmentalBounds.join(','),
          geometryType: 'esriGeometryEnvelope',
          inSR: '4326',
          outSR: '4326',
          spatialRel: 'esriSpatialRelIntersects',
          outFields: source.fields,
          returnGeometry: 'true',
          geometryPrecision: '6',
          maxAllowableOffset: '0.00001',
          resultRecordCount: '1000'
        });
        let collection;
        try {
          const response = await fetch(source.endpoint + '/query?' + params, {
            signal: AbortSignal.timeout(30000)
          });
          if (!response.ok) throw new Error('Source unavailable');
          collection = await response.json();
        } catch (error) {
          if (source.id !== 'flood' || typeof document === 'undefined') throw error;
          collection = await floodCallback(source.endpoint, params);
        }
        if (collection.error || collection.exceededTransferLimit || !Array.isArray(collection.features))
          throw new Error(collection.error?.message || 'Incomplete source response');
        const features = normalizeEnvironmental(source, collection);
        environmentalFeatures.push(...features);
        status.count = features.length;
        status.state = 'ready';
      } catch (error) {
        status.state = 'unavailable';
        console.warn('DataScope ' + source.id + ' overlay unavailable: ' + error.message);
      }
      version++;
      listeners.forEach((fn) => fn());
    })
  );
  loading = false;
}

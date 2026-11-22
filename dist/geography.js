// Workshop annotations use latitude, longitude. Outlines and landmark points are
// authored for neighborhood-scale comparison in College Station, Texas. Source
// records remain with their respective municipal, state, and federal publishers.
const udoUpdate =
  'https://communityimpact.com/bryan-college-station/government/college-station-changes-ordinance-for-future-data-center-construction/';
const cstxPlanning = 'https://www.cstx.gov/departments___city_hall/pds';
const cstxParks = 'https://www.cstx.gov/departments___city_hall/parks/parks/texas_independence_park';
const bvgcd = 'https://brazosvalleygcd.org/';
const ercot = 'https://www.ercot.com/gridmktinfo/dashboards';
const langfordSite = 'https://www.mrcthelangford.org/';
const bswSite = 'https://www.bswhealth.com/locations/college-station-hospital';
const csisd = 'https://pce.csisd.org/';
const lickCreek = 'https://www.cstx.gov/departments___city_hall/parks/parks/lick_creek_park';

// Approximate CUP study tract inside College Station's Midtown Business Park
// east of SH 6 / Midtown Drive, south of Rock Prairie Rd E & Texas Independence
// Park, north of William D. Fitch Pkwy, and west of the Lick Creek tributary.
export const site = {
  center: [30.5704, -96.2624],
  address: 'Midtown Business Park · Lakeway Dr & SH 6',
  parcel: 'Midtown CUP Study Area · College Station, TX 77845',
  boundary: [
    [30.57256, -96.26636],
    [30.57399, -96.2599],
    [30.57193, -96.25781],
    [30.56932, -96.25875],
    [30.56779, -96.26089],
    [30.57256, -96.26636]
  ],
  boundaryLabel: 'Midtown Business Park study tract',
  source: udoUpdate
};

// Named community receptors and nearby neighborhoods referenced during the
// Sept. 2025 Midtown review and Oct. 2026 UDO CUP discussions.
export const places = [
  {
    id: 'langford',
    name: 'The Langford Assisted Living',
    type: 'senior',
    lat: 30.57178,
    lng: -96.26896,
    source: langfordSite
  },
  {
    id: 'midtown-reserve',
    name: 'Midtown Reserve homes',
    type: 'housing',
    lat: 30.57485,
    lng: -96.26745,
    source: cstxPlanning
  },
  {
    id: 'independence',
    name: 'Texas Independence Park',
    type: 'park',
    lat: 30.5776,
    lng: -96.2626,
    source: cstxParks
  },
  {
    id: 'pebble-creek',
    name: 'Pebble Creek & Bridle Gate',
    type: 'housing',
    lat: 30.56535,
    lng: -96.2538,
    source: cstxPlanning
  },
  {
    id: 'pebble-elem',
    name: 'Pebble Creek Elementary',
    type: 'school',
    lat: 30.55824,
    lng: -96.24929,
    source: csisd
  },
  {
    id: 'medical',
    name: 'Baylor Scott & White Medical',
    type: 'medical',
    lat: 30.58315,
    lng: -96.27901,
    source: bswSite
  }
];

// Real OpenStreetMap centerlines for Lick Creek (north of Midtown) and Spring
// Creek (southeast drainage). Floodways and buffers require FEMA/city verification.
export const river = [
  [30.57619, -96.27262],
  [30.576, -96.27254],
  [30.57568, -96.27209],
  [30.57597, -96.27128],
  [30.57554, -96.27094],
  [30.5752, -96.27124],
  [30.57464, -96.27073],
  [30.57479, -96.27015],
  [30.57502, -96.26996],
  [30.57479, -96.26981],
  [30.5743, -96.26973],
  [30.57396, -96.26923],
  [30.57394, -96.26874],
  [30.57354, -96.26868],
  [30.57316, -96.26765],
  [30.57346, -96.26728],
  [30.57437, -96.26733],
  [30.57442, -96.26604],
  [30.57517, -96.26616],
  [30.57446, -96.26527],
  [30.57541, -96.26385],
  [30.57563, -96.26264],
  [30.57611, -96.26154],
  [30.57498, -96.26213],
  [30.57455, -96.25992],
  [30.57565, -96.25729],
  [30.57647, -96.25683],
  [30.57637, -96.25491],
  [30.57577, -96.25313],
  [30.57547, -96.25176]
];

export const springCreek = [
  [30.56178, -96.26385],
  [30.56336, -96.26405],
  [30.56371, -96.26362],
  [30.56495, -96.26257],
  [30.56499, -96.26171],
  [30.56504, -96.25994],
  [30.56549, -96.25996],
  [30.5663, -96.26016],
  [30.56669, -96.25976],
  [30.56683, -96.25932],
  [30.56662, -96.258],
  [30.56722, -96.25727],
  [30.56711, -96.25669],
  [30.56766, -96.25626],
  [30.56793, -96.25595],
  [30.56832, -96.25617],
  [30.56834, -96.25671],
  [30.56883, -96.25643],
  [30.56874, -96.25584],
  [30.56903, -96.25556],
  [30.56914, -96.25496],
  [30.5694, -96.25502],
  [30.56966, -96.25487],
  [30.56945, -96.25448],
  [30.56964, -96.25422],
  [30.57002, -96.25418],
  [30.57013, -96.25331],
  [30.56982, -96.25303],
  [30.56983, -96.2525],
  [30.57033, -96.25176]
];

export const sources = [
  {
    title: 'College Station Oct. 2026 UDO CUP Amendment',
    url: udoUpdate,
    description:
      'City Council unanimously defined data centers (>5,000 sq ft) and required a Conditional Use Permit limited to Business Park and Light/Heavy Industrial zones.'
  },
  {
    title: 'City of College Station Planning & Development',
    url: cstxPlanning,
    description:
      'Unified Development Ordinance zoning districts, Midtown Business Park planning records, and Rock Prairie Rd E / William D. Fitch Pkwy corridor plans.'
  },
  {
    title: 'Brazos Valley Groundwater Conservation District (BVGCD)',
    url: bvgcd,
    description:
      'Governs Simsboro / Carrizo-Wilcox Aquifer pumping allocations (~22,626 acre-ft/yr permitted to College Station Utilities, supplying ~98% of city water).'
  },
  {
    title: 'ERCOT Grid Conditions & Texas Interconnection',
    url: ercot,
    description:
      'Texas bulk grid reliability, summer peak demand, and large-load interconnection oversight alongside College Station Utilities (CSU) and PUCT rate rules.'
  },
  {
    title: 'Texas Independence Park at Midtown',
    url: cstxParks,
    description:
      '149-acre municipal park at 6904 Rock Prairie Rd E anchoring the walkable Midtown greenbelt, retail, and regional sports-complex vision.'
  },
  {
    title: 'The Langford Assisted Living Center',
    url: langfordSite,
    description:
      'Senior living community at 1851 Carroll Fancher Way west of Midtown Drive — a key sensitive acoustic and health receptor.'
  },
  {
    title: 'Baylor Scott & White Medical Center – College Station',
    url: bswSite,
    description:
      'Regional hospital campus at 700 Scott & White Drive along SH 6 — referenced in testimony regarding medical vulnerability and quiet corridors.'
  },
  {
    title: 'Pebble Creek Elementary & Lick Creek Park',
    url: lickCreek,
    description:
      'Pebble Creek Elementary (200 Parkview Dr) and Lick Creek Park (13600 E. Rock Prairie Rd) anchor residential and ecological buffers southeast of Midtown.'
  }
];

export const caseTimeline = [
  {
    step: '01',
    date: 'Nov 2024',
    tone: 'amber',
    icon: 'footprint',
    title: 'Closed-door Midtown proposal',
    tags: ['10-month NDA', '200 acres'],
    text: 'A developer negotiated privately to buy 200 city-owned acres in Midtown Business Park for a 600 MW AI data center next to homes and parks.',
    cites: [{ label: 'City Planning', url: cstxPlanning }]
  },
  {
    step: '02',
    date: 'Sept 2025',
    tone: 'red',
    icon: 'users',
    title: 'Residents push back; Council votes no',
    tags: ['5,000+ signatures', 'Rejected'],
    text: 'With only days of public notice, residents raised noise, groundwater, electric rate, and park-loss concerns. Council unanimously rejected the sale.',
    cites: [{ label: 'Texas Independence Park', url: cstxParks }]
  },
  {
    step: '03',
    date: 'Aug–Sept 2026',
    tone: 'blue',
    icon: 'bolt',
    title: 'County & state tighten oversight',
    tags: ['Water & grid audits', 'Stricter rules'],
    text: 'Brazos County added water-efficiency and self-funded grid rules to a nearby project while Texas paused new grid and environmental permits.',
    cites: [
      { label: 'ERCOT', url: ercot },
      { label: 'Aquifer District', url: bvgcd }
    ]
  },
  {
    step: '04',
    date: 'Oct 2026',
    tone: 'slate',
    icon: 'layers',
    title: 'Public permit now required',
    tags: ['Over 5,000 sq ft', 'Public hearing'],
    text: 'College Station updated its zoning rules so any data center over 5,000 sq ft requires a public Conditional Use Permit—even on private land.',
    cites: [{ label: 'Zoning Change', url: udoUpdate }]
  },
  {
    step: '05',
    date: 'Nov 2026',
    tone: 'amber',
    icon: 'target',
    title: 'Voters back local safeguards',
    tags: ['59% Mayor vote', 'Statewide focus'],
    text: 'Voters elected a mayor who opposed the Midtown site, while statewide elections elevated water, electric grid, and local-consent rules.',
    cites: [{ label: 'Langford Corridor', url: langfordSite }]
  },
  {
    step: '06',
    date: 'Now',
    tone: 'mint',
    icon: 'cube',
    isTool: true,
    title: 'Where DataScope enters',
    tags: ['Before any vote', 'Shared public tool'],
    text: 'Before a future project reaches a hearing, residents, planners, and local experts can compare designs, buffers, and a No-Build park option together.',
    cites: [],
    action: { label: 'Compare Midtown No-Build', preset: 'none' }
  }
];

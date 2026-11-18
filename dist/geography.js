// Workshop annotations use latitude, longitude. Outlines and landmark points are
// authored for neighborhood-scale comparison. Source data stays with its publisher.
const planning =
  'https://www.cityofallenpark.org/Documents/Agenda%20%26%20Minutes/Planning%20Commission/2026/2026.01.08%20AP%20PC%20Packet.pdf';
const minutes =
  'https://www.cityofallenpark.org/Documents/Agenda%20%26%20Minutes/Planning%20Commission/2026/Minutes/2026.06.04%20AP%20PC%20Minutes%20DRAFT.pdf';
const county = 'https://experience.arcgis.com/experience/f6cce4d36802431d8c577e97543c6f9c';
const water = 'https://gisp.mcgi.state.mi.us/arcgis/rest/services/BaseMap/CommonQueries/MapServer/15';
const school = 'https://www.resa.net/downloads/resa/wayne-county-schools-directory-print.pdf';
const parks = 'https://www.cityofallenpark.org/Documents/Community/Magazine/2023-Q1.pdf';
const housing = 'https://maplehts.com/map-directions/';

// Figure 1 on page 22 of the January packet identifies the project on the east
// side of Enterprise. The figure explicitly calls its lot lines approximate.
// This hand-trace was registered to the northeast tip of the parent parcel and
// the Arno intersections at Hanfor, Keppen, Russell and Euclid (Census TIGER).
// The current county viewer shows the larger parent lot at this location.
export const site = {
  center: [42.26862, -83.20767],
  address: '7500 Enterprise Drive',
  parcel: '30-008-99-0001-712',
  boundary: [
    [42.26955, -83.20844],
    [42.27037, -83.20504],
    [42.26687, -83.20802],
    [42.26733, -83.20902],
    [42.26723, -83.20947],
    [42.26722, -83.20983],
    [42.26713, -83.21007],
    [42.26716, -83.21047],
    [42.26955, -83.20844]
  ],
  boundaryLabel: 'Approximate study parcel',
  source: planning
};

// Named school and housing street addresses were cross-checked against Wayne
// County GIS and located using the Esri address locator. The park pin is an
// interior reference point checked against the city's park inventory and map.
export const places = [
  {
    id: 'riel',
    name: 'John Riel Memorial Park',
    type: 'park',
    lat: 42.26855,
    lng: -83.20563,
    source: parks
  },
  {
    id: 'melvindale',
    name: 'Melvindale High School',
    type: 'school',
    lat: 42.27421,
    lng: -83.2034,
    source: school
  },
  { id: 'maple', name: 'Maple Heights', type: 'housing', lat: 42.26933, lng: -83.1985, source: housing }
];

// Selected bends capture the local reach for orientation. These are approximate
// centerlines; neither line defines a bank, floodplain, wetland or legal buffer.
export const river = [
  [42.2743, -83.2192],
  [42.2738, -83.2172],
  [42.2746, -83.215],
  [42.2744, -83.2136],
  [42.2741, -83.2126],
  [42.2732, -83.211],
  [42.2723, -83.2117],
  [42.2717, -83.2116],
  [42.2714, -83.2104],
  [42.2726, -83.2081],
  [42.2716, -83.2067],
  [42.271, -83.2064],
  [42.2712, -83.2058],
  [42.2707, -83.2052],
  [42.2719, -83.2039],
  [42.2725, -83.2038],
  [42.2726, -83.2033],
  [42.2724, -83.2018],
  [42.2717, -83.2008],
  [42.2701, -83.1997],
  [42.2695, -83.1981],
  [42.2705, -83.1964],
  [42.2714, -83.1952]
];

export const sources = [
  {
    title: 'Allen Park planning review',
    url: planning,
    description:
      'Pages 21–23 identify the parcel, adjacent uses and changes to the equipment layout. The approximate lot outline is drawn from Figure 1.'
  },
  {
    title: 'June 2026 site plan decision',
    url: minutes,
    description:
      'Meeting minutes document the denial of the preliminary site plan and the commission’s findings about water, neighboring properties and noise.'
  },
  {
    title: 'Wayne County parcel viewer',
    url: county,
    description:
      'County assessment mapping provides parcel context. The project outline follows the city planning exhibit.'
  },
  {
    title: 'Michigan hydrography',
    url: water,
    description: 'Selected Ecorse River bends are generalized from the state’s stream centerlines.'
  },
  {
    title: 'Wayne County schools directory',
    url: school,
    description: 'Melvindale High School is at 4500 Enterprise Drive. The map uses an address point.'
  },
  {
    title: 'Allen Park parks inventory',
    url: parks,
    description:
      'John Riel Memorial Park is west of Arno Avenue, between Hanfor and O’Connor. The map uses an interior point.'
  },
  {
    title: 'Maple Heights',
    url: housing,
    description: 'The retirement community lists 4600 Allen Road. The map uses an address point.'
  }
];

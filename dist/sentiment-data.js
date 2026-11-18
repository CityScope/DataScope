// Fictional workshop material written for DataScope. Stance is the stance
// expressed in one sample message about a design choice. Replies are kept
// with their opening message and excluded from the discussion counts.
export const provenance =
  'Fictional discussion examples. Pins mark places discussed. Counts describe this sample only.';

export const stances = [
  { id: 'supportive', label: 'Supportive' },
  { id: 'conditional', label: 'Conditional' },
  { id: 'concerned', label: 'Concerned' }
];

export const topics = [
  { id: 'noise', label: 'Noise and light' },
  { id: 'water', label: 'Water and drainage' },
  { id: 'traffic', label: 'Traffic and access' },
  { id: 'power', label: 'Power and cooling' },
  { id: 'benefits', label: 'Jobs and local benefits' },
  { id: 'land', label: 'Land and public space' }
];

export const phases = [
  { id: 'planning', label: 'Planning' },
  { id: 'construction', label: 'Construction' },
  { id: 'operation', label: 'Operation' }
];

export const channels = [
  { id: 'forum', label: 'Local forum' },
  { id: 'group', label: 'Neighborhood group' },
  { id: 'meeting', label: 'Meeting comment' },
  { id: 'workshop', label: 'Workshop card' }
];

// Centers and message positions identify approximate places discussed, never a
// speaker's whereabouts. Neighborhood, school and park names are geographic
// references. Their staff and residents did not supply these examples.
export const zones = [
  { id: 'park', name: 'John Riel Memorial Park', center: [42.26855, -83.20563] },
  { id: 'enterprise', name: 'Enterprise Drive', center: [42.26863, -83.20942] },
  { id: 'school', name: 'Melvindale High School', center: [42.27421, -83.2034] },
  { id: 'river', name: 'Ecorse River bend', center: [42.27105, -83.20636] },
  { id: 'maple', name: 'Maple Heights area', center: [42.26933, -83.1985] }
];

function reply(stance, text) {
  return { stance, text };
}

// Offsets in meters are intentionally coarse. Each record stays at the feature
// being discussed when the user moves the hypothetical facility.
function discussion(
  id,
  zoneId,
  eastMeters,
  northMeters,
  stance,
  topic,
  phase,
  channel,
  title,
  excerpt,
  replies = []
) {
  const zone = zones.find((item) => item.id === zoneId);
  const [latitude, longitude] = zone.center;
  const coords = [
    latitude + northMeters / 111320,
    longitude + eastMeters / (111320 * Math.cos((latitude * Math.PI) / 180))
  ];
  return { id, zoneId, stance, topic, phase, channel, title, excerpt, coords, replies, synthetic: true };
}

export const discussions = [
  discussion(
    'park-quiet',
    'park',
    3,
    8,
    'concerned',
    'noise',
    'operation',
    'group',
    'An evening at the ball field',
    'From the benches you can hear the game and talk across a picnic table. Could we listen here on a warm evening with the cooling fans running?',
    [
      reply(
        'conditional',
        'I would compare the same hour with the equipment yard on each side of the building.'
      ),
      reply(
        'concerned',
        'Please include the gaps between trains. A daytime average would miss those quieter stretches.'
      )
    ]
  ),
  discussion(
    'park-sightline',
    'park',
    -28,
    25,
    'conditional',
    'land',
    'planning',
    'workshop',
    'Try the view from the path',
    'I could live with the western layout if someone marks the roof height from the park path. The flat map leaves me guessing how tall it feels.',
    [
      reply(
        'supportive',
        'A view from child height beside the ball field would help me compare the two.'
      )
    ]
  ),
  discussion(
    'park-testing',
    'park',
    15,
    -30,
    'concerned',
    'noise',
    'operation',
    'forum',
    'A generator test during a game',
    'If monthly tests and a Saturday game coincide, what will the players hear? Put a second listening point on the field side of the tracks.'
  ),
  discussion(
    'park-path',
    'park',
    -36,
    -43,
    'concerned',
    'traffic',
    'construction',
    'meeting',
    'Keep the walk to the park open',
    'People come in on foot from Arno. Which entrance would still be usable if a contractor temporarily closes a crossing?',
    [
      reply(
        'conditional',
        'Draw the detour with a stroller in mind. The shortest line on the map might end at a curb.'
      )
    ]
  ),
  discussion(
    'park-screen',
    'park',
    -16,
    48,
    'supportive',
    'noise',
    'planning',
    'workshop',
    'Use the building as a screen',
    'Of the two drawings, I prefer the equipment on the far side of the building. Let’s keep that version on the table while somebody checks the sound.'
  ),
  discussion(
    'park-fence',
    'park',
    52,
    -9,
    'conditional',
    'land',
    'construction',
    'group',
    'A place for the temporary fence',
    'Could the staging fence sit inside the work area? I would support a layout that keeps the park approach clear through baseball season.'
  ),

  discussion(
    'enterprise-skills',
    'enterprise',
    -8,
    10,
    'supportive',
    'benefits',
    'construction',
    'forum',
    'A route into the trades',
    'I would welcome paid electrician apprenticeships on this job. A posted application date would make that opportunity easier to use.',
    [
      reply(
        'conditional',
        'Could the contractor list which openings last through construction and which continue after opening?'
      ),
      reply(
        'supportive',
        'An evening information session would reach people already working a day shift.'
      )
    ]
  ),
  discussion(
    'enterprise-trucks',
    'enterprise',
    -24,
    -88,
    'conditional',
    'traffic',
    'construction',
    'workshop',
    'Room to turn off Enterprise',
    'I could support this entrance if a delivery truck can wait inside the site. Show the turn with two vehicles arriving together.'
  ),
  discussion(
    'enterprise-power',
    'enterprise',
    28,
    63,
    'conditional',
    'power',
    'planning',
    'meeting',
    'Who pays for the connection?',
    'I would want to see who covers an upgrade and what happens if demand grows. A line on a utility map does not tell me how much power is available.',
    [
      reply('supportive', 'A utility letter with a date and a named payer would answer my question.'),
      reply(
        'concerned',
        'Please include the cost of an upgrade that gets started if the building never opens.'
      )
    ]
  ),
  discussion(
    'enterprise-contracts',
    'enterprise',
    -24,
    44,
    'supportive',
    'benefits',
    'planning',
    'group',
    'Let small firms see the work',
    'Publishing smaller bid packages could give local contractors a chance. I would like the procurement notice and a way to hear the results.'
  ),
  discussion(
    'enterprise-hours',
    'enterprise',
    58,
    -40,
    'concerned',
    'traffic',
    'construction',
    'group',
    'Early deliveries',
    'Where do trucks wait if they arrive before the gate opens? The loading shift could start well before the posted construction hours.'
  ),
  discussion(
    'enterprise-reuse',
    'enterprise',
    24,
    -12,
    'supportive',
    'land',
    'planning',
    'forum',
    'Compare sites already served by roads',
    'I like starting with land along an existing industrial street. Let’s also compare a parcel with a building or paved pad that could be reused.'
  ),
  discussion(
    'enterprise-bills',
    'enterprise',
    12,
    80,
    'concerned',
    'power',
    'operation',
    'meeting',
    'A hot afternoon on the grid',
    'What happens to the site’s demand on the hottest weekday? I would want to see the plan for that hour alongside the annual electricity total.'
  ),

  discussion(
    'school-dismissal',
    'school',
    -18,
    -53,
    'concerned',
    'traffic',
    'construction',
    'group',
    'Deliveries at dismissal',
    'Even a few trucks can matter at the wrong ten minutes. Could a proposed delivery route be drawn over the school arrival and dismissal routes?',
    [
      reply('conditional', 'Show where trucks would queue if a driver gets here early.'),
      reply(
        'supportive',
        'I could work with a schedule that avoids both school peaks and is posted at the entrance.'
      )
    ]
  ),
  discussion(
    'school-learning',
    'school',
    24,
    19,
    'supportive',
    'benefits',
    'operation',
    'forum',
    'Technical training close to school',
    'A paid summer placement in cooling controls would interest students who want a technical career. I would support a program with a clear way to apply.'
  ),
  discussion(
    'school-crossing',
    'school',
    -35,
    21,
    'conditional',
    'traffic',
    'planning',
    'workshop',
    'Walk the route before choosing it',
    'I would consider the entrance shown if families can walk the approach with the traffic planner first. Mark where turning drivers look away from the sidewalk.'
  ),
  discussion(
    'school-play',
    'school',
    45,
    -20,
    'conditional',
    'noise',
    'operation',
    'meeting',
    'Listen during outdoor activities',
    'I could accept a schedule for equipment tests if it accounts for outdoor events. What would the sound be like at the field on a still afternoon?'
  ),
  discussion(
    'school-procurement',
    'school',
    12,
    48,
    'supportive',
    'benefits',
    'construction',
    'workshop',
    'Make the opportunities visible',
    'I would come to a trades evening with local training providers. Publish the entry requirements early enough for students to prepare.'
  ),
  discussion(
    'school-bus',
    'school',
    -62,
    -8,
    'concerned',
    'traffic',
    'construction',
    'forum',
    'Where a bus and a truck would meet',
    'Can we put both turning paths on the same drawing? A truck driver and a bus driver can each have a legal route and still struggle at one corner.'
  ),

  discussion(
    'river-rain',
    'river',
    10,
    22,
    'concerned',
    'water',
    'construction',
    'meeting',
    'Where would rain carry sediment?',
    'Before grading starts, trace a hard rain from the disturbed ground to the river. Where could a neighbor see whether the controls are working?',
    [
      reply(
        'conditional',
        'Comparing the two layouts against the same rainy day would make the drawings easier to judge.'
      ),
      reply(
        'supportive',
        'I like putting a public inspection point on the map if it can be reached safely.'
      )
    ]
  ),
  discussion(
    'river-edge',
    'river',
    -48,
    19,
    'conditional',
    'land',
    'planning',
    'forum',
    'Leave room beside the water',
    'I would consider a smaller footprint with more planted ground. How much of the continuous river-side strip would each placement leave?'
  ),
  discussion(
    'river-spill',
    'river',
    53,
    5,
    'concerned',
    'water',
    'operation',
    'group',
    'What goes down this drain?',
    'Cooling-water deliveries and rain runoff follow different paths. Could someone trace both and mark where a spill would be contained?'
  ),
  discussion(
    'river-cooling',
    'river',
    12,
    -27,
    'conditional',
    'power',
    'operation',
    'workshop',
    'Compare water and fan noise together',
    'I would consider dry cooling to limit water deliveries. Show the change in fan sound on the park side of the building in that same comparison.'
  ),
  discussion(
    'river-path',
    'river',
    -57,
    44,
    'supportive',
    'land',
    'planning',
    'group',
    'Keep the river bend visible',
    'I like the option with the largest unpaved strip near the bend. It gives people somewhere specific to ask about planting and long-term care.'
  ),
  discussion(
    'river-flood',
    'river',
    27,
    48,
    'concerned',
    'water',
    'planning',
    'forum',
    'Check what the distance leaves out',
    'Two points the same distance from the river could drain in different directions. I want the elevations and drain crossings before comparing stormwater risk.'
  ),

  discussion(
    'maple-night',
    'maple',
    -14,
    6,
    'concerned',
    'noise',
    'operation',
    'group',
    'The sound with a window open',
    'I care about the steady tone on summer nights. A reading at the property fence would be easier to understand with one near the Allen Road side too.',
    [
      reply('conditional', 'Please show the quietest overnight hour as well as the average.'),
      reply(
        'supportive',
        'Posting how to request a follow-up measurement would help if people hear something unexpected.'
      )
    ]
  ),
  discussion(
    'maple-briefing',
    'maple',
    22,
    -27,
    'supportive',
    'benefits',
    'planning',
    'workshop',
    'Take the plans to people',
    'I would attend a daytime conversation near the senior community. Large-print maps with both entrances marked would help people compare them.'
  ),
  discussion(
    'maple-traffic',
    'maple',
    8,
    31,
    'conditional',
    'traffic',
    'construction',
    'meeting',
    'Keep the pickup lane clear',
    'I could support a delivery route that leaves access for appointments. Please compare it with the morning passenger pickup times.'
  ),
  discussion(
    'maple-light',
    'maple',
    -39,
    -14,
    'concerned',
    'noise',
    'operation',
    'forum',
    'A view after dark',
    'Can the workshop show the lights from the road after sunset? A daytime rendering makes it hard to judge whether light reaches upper windows.'
  ),
  discussion(
    'maple-report',
    'maple',
    36,
    14,
    'conditional',
    'noise',
    'operation',
    'group',
    'Who follows up on a complaint?',
    'I could work with a trial period if we know who will answer, how quickly, and whether a second reading can be requested from a different spot.'
  )
];

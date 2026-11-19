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
  ),

  discussion(
    'park-dugout',
    'park',
    30,
    15,
    'concerned',
    'noise',
    'operation',
    'meeting',
    'Calling from the dugout',
    'A coach has to get a child\'s attention from across the diamond. How much would the cooling sound change the quieter end of practice?',
    [
      reply('conditional', 'Listen from both dugouts on the same day. Wind direction can change which one feels louder.')
    ]
  ),
  discussion(
    'park-shade',
    'park',
    -57,
    -12,
    'supportive',
    'land',
    'planning',
    'group',
    'Leave the picnic shade in place',
    'The layout with more space along the park edge gets my vote. I\'d rather keep an established shade tree than wait for a new row to grow.'
  ),
  discussion(
    'park-lights',
    'park',
    12,
    40,
    'conditional',
    'noise',
    'planning',
    'workshop',
    'Aim the loading lights away',
    'I could accept night work inside the building. Turn the loading doors away from the field and draw where an open door would cast light.'
  ),
  discussion(
    'park-dust',
    'park',
    -25,
    -37,
    'concerned',
    'land',
    'construction',
    'forum',
    'Dust on the infield',
    'When the infield is dry, another layer of dust is the last thing players need. Where would exposed soil and gravel piles sit during earthwork?'
  ),
  discussion(
    'park-walkaround',
    'park',
    -48,
    23,
    'supportive',
    'land',
    'planning',
    'meeting',
    'A walk around a marked outline',
    'I\'d join a park walk if we could see poles marking the building corners. They would make a vote on the setback more meaningful.'
  ),
  discussion(
    'park-drain',
    'park',
    -38,
    2,
    'conditional',
    'water',
    'planning',
    'forum',
    'Rain at the path entrance',
    'Show whether the path entrance is uphill or downhill from the proposed paving. I\'d support a layout that keeps sheet runoff away from the gate.',
    [
      reply('concerned', 'Please include the low spot where someone pushing a stroller would have to cross.')
    ]
  ),
  discussion(
    'park-shift',
    'park',
    7,
    -55,
    'concerned',
    'traffic',
    'construction',
    'group',
    'The half hour before a game',
    'Park traffic builds before the first pitch. A delivery window that ends at game time could still put trucks and families on the same approach road.'
  ),
  discussion(
    'park-planting',
    'park',
    -12,
    55,
    'supportive',
    'benefits',
    'operation',
    'workshop',
    'Who waters the new trees?',
    'I\'d welcome a paid seasonal crew for the screening trees. Put the watering and replacement work in the budget so the planting survives its first summers.'
  ),
  discussion(
    'park-raincheck',
    'park',
    38,
    -19,
    'conditional',
    'water',
    'operation',
    'meeting',
    'Check after the first downpour',
    'I\'d be comfortable trying the swale if people can return to the path after a storm and see where the water went.'
  ),
  discussion(
    'park-barrier',
    'park',
    43,
    8,
    'concerned',
    'noise',
    'planning',
    'forum',
    'Gaps at the ends of a wall',
    'A wall can look solid from the middle of a drawing. Could sound travel around its ends toward the benches? I\'d like the ends shown on the plan.'
  ),
  discussion(
    'park-dryday',
    'park',
    17,
    64,
    'conditional',
    'power',
    'operation',
    'workshop',
    'A dry-cooling day at the field',
    'I like the idea of using less water. Before choosing it, compare the extra fan hours on a hot afternoon when the field is in use.'
  ),
  discussion(
    'park-picnic',
    'park',
    57,
    -34,
    'concerned',
    'noise',
    'operation',
    'group',
    'Picnic tables between innings',
    'Between innings we can hear a conversation at the next table. A single reading during a cheer won\'t tell us what the machinery adds.'
  ),
  discussion(
    'park-weekend',
    'park',
    1,
    -63,
    'supportive',
    'traffic',
    'construction',
    'meeting',
    'Hold the queue on the work site',
    'I favor the entrance layout that lets trucks wait behind the gate. It leaves people space to turn around when the parking area fills.',
    [
      reply('conditional', 'It would help to see the gate closed as well as the gate open in that drawing.'),
      reply('supportive', 'Mark a waiting space for the second truck too.')
    ]
  ),
  discussion(
    'park-cranes',
    'park',
    -46,
    -46,
    'conditional',
    'land',
    'construction',
    'group',
    'Room for a crane swing',
    'If the long side faces the park, could a crane still unload it from inside the work fence? I would trade a little more setback for keeping the path open.'
  ),
  discussion(
    'park-security',
    'park',
    50,
    38,
    'concerned',
    'noise',
    'operation',
    'forum',
    'The lights after the last game',
    'The field eventually goes dark. I worry that a bright security apron facing the park could light up the approach all night.'
  ),
  discussion(
    'park-cleanup',
    'park',
    -10,
    -53,
    'supportive',
    'benefits',
    'construction',
    'group',
    'Pay for reopening the path',
    'I\'d support setting aside money to repair any park approach used during construction. Agreement on the condition of the path should come before the first truck.'
  ),
  discussion(
    'park-gravel',
    'park',
    30,
    -60,
    'conditional',
    'water',
    'planning',
    'workshop',
    'Try a smaller paved apron',
    'Could a narrower service apron make room for planted ground? I\'d favor it if the designer shows where a maintenance vehicle would still turn.'
  ),
  discussion(
    'park-diesel',
    'park',
    -37,
    42,
    'concerned',
    'power',
    'operation',
    'meeting',
    'What happens during a long outage?',
    'A daytime demonstration of the backup system might last minutes. Where would the exhaust and noise be directed if it had to run through a full park weekend?'
  ),
  discussion(
    'park-seating',
    'park',
    17,
    -17,
    'concerned',
    'land',
    'planning',
    'workshop',
    'A seat with a view of the trees',
    'The tree line is most of the view from this bench. Rotating a big blank wall toward it seems like a real loss, even if the center of the building stays put.'
  ),
  discussion(
    'park-bikes',
    'park',
    -60,
    7,
    'conditional',
    'traffic',
    'construction',
    'forum',
    'A detour a child can ride',
    'A detour that asks a young rider to dismount in traffic won\'t work for our family. I\'d accept a longer route if every crossing is clear.',
    [
      reply('supportive', 'Trace it with someone towing a bike trailer. The turning space matters as much as the distance.')
    ]
  ),
  discussion(
    'park-pathlamp',
    'park',
    44,
    -48,
    'supportive',
    'noise',
    'operation',
    'group',
    'Keep the park side dark',
    'The option with low, shielded lights on the service side would suit evening walkers. I\'d like that specific lighting arrangement kept in the design.'
  ),
  discussion(
    'park-berm',
    'park',
    -21,
    11,
    'concerned',
    'land',
    'planning',
    'meeting',
    'A berm can block the view too',
    'A high earth bank might hide the equipment, but it could also cut off views along the path. Can the section drawing show a seated person\'s eye level?'
  ),

  discussion(
    'enterprise-sharedentry',
    'enterprise',
    15,
    -36,
    'supportive',
    'traffic',
    'planning',
    'workshop',
    'Use space behind the gate',
    'The version with a waiting bay inside the parcel looks workable. A driver could check in without holding up someone headed to the next business.'
  ),
  discussion(
    'enterprise-secondshift',
    'enterprise',
    -28,
    73,
    'conditional',
    'benefits',
    'operation',
    'meeting',
    'Which jobs stay on this block?',
    'I\'d be interested in a maintenance job after construction. Show a shift schedule and the requirements for those positions separately from the one-time trade work.'
  ),
  discussion(
    'enterprise-coolingmeter',
    'enterprise',
    33,
    57,
    'supportive',
    'water',
    'operation',
    'forum',
    'Put a meter on the cooling line',
    'I\'d back a design that lets us follow monthly cooling-water use. A meter on that feed would say more than the combined bill for the whole building.',
    [
      reply('conditional', 'Include the weather for the month so a cool spring and a hot summer aren\'t compared as if they were alike.')
    ]
  ),
  discussion(
    'enterprise-ice',
    'enterprise',
    -52,
    -68,
    'concerned',
    'traffic',
    'operation',
    'group',
    'The turn after freezing rain',
    'A sharp delivery turn is harder when the pavement is slick. Who would clear the gate apron before the first service truck arrives?'
  ),
  discussion(
    'enterprise-shrug',
    'enterprise',
    25,
    35,
    'conditional',
    'land',
    'planning',
    'forum',
    'Leave the neighboring loading door usable',
    'A wide setback toward the park sounds reasonable until it pushes a service lane close to the next business. I\'d like to see both loading doors on one plan.'
  ),
  discussion(
    'enterprise-controls',
    'enterprise',
    10,
    12,
    'supportive',
    'benefits',
    'construction',
    'group',
    'Training on the actual controls',
    'I like a bid package that pairs a local apprentice with a controls technician. One supervised commissioning shift could teach more than a recruiting brochure.'
  ),
  discussion(
    'enterprise-switchgear',
    'enterprise',
    -32,
    48,
    'conditional',
    'power',
    'planning',
    'workshop',
    'A place to service the electrical gear',
    'Can the utility reach its gear from Enterprise without closing the whole drive? I\'d accept that equipment at the front if the work space fits on the parcel.'
  ),
  discussion(
    'enterprise-gatebeeps',
    'enterprise',
    -13,
    -81,
    'concerned',
    'noise',
    'construction',
    'meeting',
    'Reversing outside the gate',
    'A tight entrance means a lot of backing up. Where on this block would the alarms be loudest if deliveries have to reverse into the lot?'
  ),
  discussion(
    'enterprise-roofrain',
    'enterprise',
    43,
    24,
    'supportive',
    'water',
    'planning',
    'workshop',
    'Collect rain from the broad roof',
    'The roof is a large clean surface in the drawing. I\'d support reserving space for storage and looking at whether that water could serve the plantings.'
  ),
  discussion(
    'enterprise-fiber',
    'enterprise',
    -38,
    13,
    'conditional',
    'traffic',
    'construction',
    'forum',
    'One trench, or repeated closures?',
    'I\'d support digging along Enterprise if the utility and fiber crews coordinate. Which driveways would be accessible on each day of that work?',
    [
      reply('concerned', 'Please leave a way for a business to report that its delivery entrance was blocked.')
    ]
  ),
  discussion(
    'enterprise-vendor',
    'enterprise',
    21,
    -10,
    'supportive',
    'benefits',
    'planning',
    'meeting',
    'A small supplier can bid on upkeep',
    'Filter changes and grounds work could be approachable jobs for small firms. I favor putting those contracts on the same public calendar as larger bids.'
  ),
  discussion(
    'enterprise-recovery',
    'enterprise',
    36,
    -45,
    'conditional',
    'power',
    'operation',
    'group',
    'A neighbor for the waste heat',
    'Before promising heat to another building, draw the pipe route down Enterprise and ask who could use it in July. I\'d back a short connection with a willing customer.'
  ),
  discussion(
    'enterprise-yard',
    'enterprise',
    2,
    65,
    'supportive',
    'land',
    'planning',
    'forum',
    'Keep equipment in a single yard',
    'I prefer a compact service yard. That leaves space along the street for a continuous entrance and makes it easier to see where deliveries actually belong.'
  ),
  discussion(
    'enterprise-ballast',
    'enterprise',
    -44,
    -50,
    'concerned',
    'water',
    'construction',
    'workshop',
    'Dirt tracked into the catch basin',
    'During grading, mud can follow a truck off the lot even on a dry day. Where would wheels be cleaned before they pass the first street drain?'
  ),
  discussion(
    'enterprise-coordination',
    'enterprise',
    18,
    82,
    'supportive',
    'traffic',
    'construction',
    'group',
    'Tell the next door operator first',
    'A weekly notice with the dates of large deliveries would help shops plan their own shipments. I\'d use it if a changed date is marked clearly.',
    [
      reply('supportive', 'An update posted at the gate would also reach drivers who only make this trip once.')
    ]
  ),
  discussion(
    'enterprise-tariff',
    'enterprise',
    -15,
    31,
    'conditional',
    'power',
    'operation',
    'forum',
    'The bill if the tenant leaves',
    'I\'d accept a dedicated connection if the agreement says who pays for it after an early closure. The street would still have the equipment after the servers left.'
  ),
  discussion(
    'enterprise-restroom',
    'enterprise',
    1,
    -53,
    'supportive',
    'benefits',
    'construction',
    'workshop',
    'Give trade crews a decent base',
    'I support using part of the parcel for a crew break area and restrooms. Contractors shouldn\'t have to depend on neighboring businesses for either.'
  ),
  discussion(
    'enterprise-nightvent',
    'enterprise',
    47,
    48,
    'concerned',
    'noise',
    'operation',
    'meeting',
    'Across from a night shift',
    'Where would the ventilation outlets face? An industrial address can still have people working outside late who would hear machinery for an entire shift.'
  ),
  discussion(
    'enterprise-parking',
    'enterprise',
    15,
    -73,
    'conditional',
    'traffic',
    'construction',
    'meeting',
    'Parking at the busiest construction week',
    'At peak crew size, will every car fit behind the fence? I\'d support an off-site shuttle only if we know where riders board and where they park.'
  ),
  discussion(
    'enterprise-trainingday',
    'enterprise',
    -18,
    -19,
    'supportive',
    'benefits',
    'operation',
    'group',
    'A first-aid course open to neighbors',
    'I\'d welcome a shared training day for crews and nearby businesses. Practicing who to call at the gate is a concrete local benefit that can continue after opening.'
  ),
  discussion(
    'enterprise-hardstand',
    'enterprise',
    48,
    -19,
    'conditional',
    'land',
    'planning',
    'workshop',
    'Compare how much pavement gets reused',
    'For each position, shade the part of the new footprint that\'s already hard surface. A version that uses more of the existing apron would have my support.',
    [
      reply('conditional', 'Show which old pavement has to be torn up for utilities. Reuse looks different with a new trench through it.')
    ]
  ),

  discussion(
    'school-crossguard',
    'school',
    -42,
    -38,
    'conditional',
    'traffic',
    'construction',
    'meeting',
    'Leave the crossing visible',
    'I could accept the delivery approach if a child at the curb can see past a waiting truck. Mark the crossing guard\'s view on the drawing.'
  ),
  discussion(
    'school-robotics',
    'school',
    36,
    20,
    'supportive',
    'benefits',
    'operation',
    'group',
    'A real cooling problem for students',
    'I\'d like students to get a year\'s anonymous temperature readings and work out when the fans run hardest. That could be a classroom project without entering the facility.'
  ),
  discussion(
    'school-horns',
    'school',
    5,
    -44,
    'concerned',
    'noise',
    'construction',
    'forum',
    'Concrete work during an exam',
    'A single early concrete pour can take a whole morning. Which classroom side faces the construction entrance, and how far ahead would the school receive notice?'
  ),
  discussion(
    'school-tapwater',
    'school',
    -17,
    57,
    'conditional',
    'water',
    'operation',
    'workshop',
    'Put water use in familiar units',
    'I\'d consider the cooling design if its hot-day water use were shown alongside the annual figure. A single yearly number is difficult to explain to a science class.'
  ),
  discussion(
    'school-lamp',
    'school',
    64,
    8,
    'concerned',
    'noise',
    'operation',
    'group',
    'Looking up from the playing field',
    'What would players see over the fence on a damp evening? Glare from a yard light can stand out even where a daytime view seems screened.'
  ),
  discussion(
    'school-binoculars',
    'school',
    10,
    7,
    'supportive',
    'land',
    'planning',
    'workshop',
    'Draw the view from the bleachers',
    'The placement that keeps the lower roofline toward the school looks promising. I\'d use the seats as a common viewing point when comparing scale.',
    [
      reply('conditional', 'A line showing the winter tree canopy would help. The view changes once the leaves are down.')
    ]
  ),
  discussion(
    'school-pickup',
    'school',
    -66,
    -22,
    'concerned',
    'traffic',
    'construction',
    'meeting',
    'Late pickups count too',
    'School ends at one time, but students leave rehearsals and practices later. I worry that a route called clear after dismissal would still meet groups on foot.'
  ),
  discussion(
    'school-sensorlab',
    'school',
    31,
    -38,
    'supportive',
    'water',
    'operation',
    'forum',
    'A water-monitoring lesson',
    'I favor letting a science class look at runoff records from two storms. Students could compare what the site collected with what fell on the nearby streets.'
  ),
  discussion(
    'school-busstop',
    'school',
    -47,
    34,
    'conditional',
    'traffic',
    'planning',
    'group',
    'Space to wait in winter',
    'If snow is piled near a temporary stop, students may wait in the road. I\'d accept a detour with a plowed waiting area and a visible crossing.'
  ),
  discussion(
    'school-fieldtrip',
    'school',
    20,
    61,
    'supportive',
    'benefits',
    'construction',
    'meeting',
    'An accessible site visit',
    'I\'d support a visit for students curious about the trades. A wheelchair-accessible viewing point on the safe side of the fence should be part of the plan.'
  ),
  discussion(
    'school-relay',
    'school',
    -31,
    15,
    'conditional',
    'power',
    'operation',
    'workshop',
    'Who calls the school during an outage?',
    'If the site switches to backup during classes, I\'d like the school to have one contact to explain the change and expected testing time.'
  ),
  discussion(
    'school-gatewide',
    'school',
    -57,
    0,
    'concerned',
    'traffic',
    'planning',
    'forum',
    'A long trailer at a short crossing',
    'The tractor might clear a crossing before the trailer does. I\'d like to see the whole vehicle drawn at the point where its turn takes the most space.',
    [
      reply('conditional', 'Add a student on a bicycle to the same view. The gap can look much larger from above.')
    ]
  ),
  discussion(
    'school-pollinator',
    'school',
    47,
    -4,
    'supportive',
    'land',
    'planning',
    'group',
    'Planting as a class project',
    'A strip of native planting that students can see from an accessible path sounds worthwhile. I\'d like the construction contract to cover care through the first summer.'
  ),
  discussion(
    'school-netzero',
    'school',
    -6,
    48,
    'conditional',
    'power',
    'planning',
    'forum',
    'Ask for the hourly electricity chart',
    'Annual clean-power purchases seem hard for a class to interpret. I\'d support sharing an hourly example showing when the building draws the most electricity.'
  ),
  discussion(
    'school-music',
    'school',
    51,
    34,
    'concerned',
    'noise',
    'operation',
    'workshop',
    'An outdoor rehearsal has quiet passages',
    'If sound is sampled at the field, could a reading include the quiet parts of rehearsal? A peak during the loudest music would tell the group very little.'
  ),
  discussion(
    'school-puddle',
    'school',
    -35,
    -58,
    'concerned',
    'water',
    'construction',
    'group',
    'A puddle at the school approach',
    'A curb detour can send walkers into a puddle after rain. Who would check the temporary route on a wet school morning?'
  ),
  discussion(
    'school-intern',
    'school',
    6,
    32,
    'conditional',
    'benefits',
    'operation',
    'meeting',
    'Can students get there after class?',
    'A part-time placement would make sense if the shift begins after school and a student can reach the entrance on foot. Show the route from the school door.'
  ),
  discussion(
    'school-noisechart',
    'school',
    52,
    -33,
    'supportive',
    'noise',
    'operation',
    'forum',
    'Publish a test before and after opening',
    'I support taking a sound reading from the field before the equipment starts. Paired readings on similar afternoons give classes something they can examine.'
  ),
  discussion(
    'school-walkaudit',
    'school',
    -23,
    -19,
    'supportive',
    'traffic',
    'planning',
    'workshop',
    'Students can map the walk',
    'Invite a student group to mark where they cross on a printed plan. I like an entrance choice that uses those observations before the road work is designed.',
    [
      reply('supportive', 'Include the walk after a home game. Families can describe that route better than a traffic count can.')
    ]
  ),
  discussion(
    'school-heatday',
    'school',
    23,
    37,
    'concerned',
    'power',
    'operation',
    'meeting',
    'A high-demand afternoon',
    'I\'d worry if the design counts on spare electricity every afternoon. Show what happens to cooling demand on the same hot day that the school needs its air conditioning.'
  ),
  discussion(
    'school-sidewalk',
    'school',
    -61,
    18,
    'conditional',
    'land',
    'construction',
    'forum',
    'Keep room for a pair of wheelchairs',
    'A line labelled open sidewalk might narrow beside temporary signs. I\'d agree to it if two people can pass and the turning space at the corner stays clear.'
  ),
  discussion(
    'school-classwork',
    'school',
    33,
    -7,
    'conditional',
    'benefits',
    'planning',
    'group',
    'Learning materials before a vote',
    'I\'d welcome a student discussion of the proposals if the materials include the no-build choice and explain the limits of the sound and water estimates.',
    [
      reply('supportive', 'A printable map would let families do the same exercise at home.')
    ]
  ),

  discussion(
    'river-snowpile',
    'river',
    -28,
    38,
    'concerned',
    'water',
    'operation',
    'group',
    'Where does a snow pile melt?',
    'A pile of plowed snow could sit there for weeks and drain toward the bend. Which part of the paved area would hold it, and where would meltwater go?'
  ),
  discussion(
    'river-buffer',
    'river',
    33,
    17,
    'supportive',
    'land',
    'planning',
    'workshop',
    'A continuous planted strip',
    'Of the drawn options, I favor one long planted strip over three little patches. It leaves room beside the bend even when service vehicles need to turn.'
  ),
  discussion(
    'river-crossings',
    'river',
    -64,
    11,
    'conditional',
    'traffic',
    'construction',
    'meeting',
    'Keep deliveries away from the bank',
    'I\'d support a construction route that uses the paved entrance throughout. Mark where drivers would turn if the approved unloading spot was occupied.'
  ),
  discussion(
    'river-dye',
    'river',
    15,
    -47,
    'conditional',
    'water',
    'planning',
    'forum',
    'Follow the drain to its outlet',
    'Before selecting the tank location, confirm the outlet for each nearby inlet. I\'d change my preference if the drain led somewhere different from the surface slope.'
  ),
  discussion(
    'river-nest',
    'river',
    -51,
    33,
    'concerned',
    'noise',
    'construction',
    'group',
    'What carries across the water?',
    'Open water changes how the far side feels to someone walking there. Could a sound check cover the opposite bank while heavy equipment is actually working?'
  ),
  discussion(
    'river-monitor',
    'river',
    39,
    -11,
    'supportive',
    'benefits',
    'operation',
    'meeting',
    'Budget for independent sampling',
    'I\'d support paying a local lab to publish plain-language sampling results. Seeing the original dates and locations would let neighbors follow up on an odd result.',
    [
      reply('conditional', 'Show which measurements are upstream controls. A colored dot alone is difficult to interpret.')
    ]
  ),
  discussion(
    'river-pond',
    'river',
    1,
    56,
    'concerned',
    'land',
    'planning',
    'workshop',
    'Space to reach a detention basin',
    'A pond drawn tight against a fence might be difficult to maintain. How much room would a small excavator need without driving along the riverbank?'
  ),
  discussion(
    'river-hotwater',
    'river',
    57,
    -22,
    'concerned',
    'power',
    'operation',
    'forum',
    'Does warm water leave the system?',
    'The cooling diagram has a return arrow. Where does that water actually go on a hot day, and is there any connection at all to the river?'
  ),
  discussion(
    'river-mudsill',
    'river',
    -39,
    -17,
    'concerned',
    'water',
    'construction',
    'meeting',
    'Look beyond the silt fence',
    'A barrier on the river side leaves out mud that washes into the street. I\'d like a drawing of both routes from the earthworks after a heavy shower.'
  ),
  discussion(
    'river-deadend',
    'river',
    49,
    30,
    'conditional',
    'traffic',
    'operation',
    'group',
    'A service route with room to turn',
    'I could support the layout if a maintenance truck can leave facing forward. Reversing toward the planted edge puts pressure on the strip everyone is trying to keep.'
  ),
  discussion(
    'river-winterbank',
    'river',
    -16,
    47,
    'concerned',
    'land',
    'construction',
    'forum',
    'A bare bank through winter',
    'If work stops for the winter before plantings take root, what\'s holding the soil in place? Please show what this edge looks like in the middle of construction.'
  ),
  discussion(
    'river-valve',
    'river',
    43,
    6,
    'conditional',
    'water',
    'operation',
    'workshop',
    'A shutoff someone can reach',
    'I\'d want to see where a drain can be isolated during a spill. The route to the control has to stay reachable during a delivery or a heavy rain.',
    [
      reply('concerned', 'Can the night shift find the control if the loading bay is occupied?')
    ]
  ),
  discussion(
    'river-canopy',
    'river',
    -43,
    52,
    'supportive',
    'land',
    'planning',
    'meeting',
    'Set the fence back from the trees',
    'I favor moving the service fence inward if that keeps mature trees beside the bend. Show the space needed for the roots as well as the trunks.'
  ),
  discussion(
    'river-twostorms',
    'river',
    20,
    35,
    'concerned',
    'water',
    'planning',
    'group',
    'What if a second storm comes?',
    'One drawing shows an empty basin at the start of the rain. I\'d like to know where the water goes if the next storm arrives before the basin has drained.'
  ),
  discussion(
    'river-fans',
    'river',
    50,
    -42,
    'conditional',
    'noise',
    'operation',
    'forum',
    'Turn the fan yard away from the bend',
    'I could consider a layout with the building between the fans and the river. Test it at the bend, since the nearest property corner may be behind a barrier.'
  ),
  discussion(
    'river-outlet',
    'river',
    -61,
    -8,
    'concerned',
    'water',
    'operation',
    'workshop',
    'An outlet below high water',
    'If the river rises to cover an outlet, could water back up into the parcel? The normal-day arrows on the drainage sketch don\'t answer that question.'
  ),
  discussion(
    'river-stewards',
    'river',
    3,
    -24,
    'supportive',
    'benefits',
    'construction',
    'group',
    'A paid planting crew after grading',
    'I like reserving part of the restoration work for a local crew. Specify which plants they will replace if the first hard rain takes them out.'
  ),
  discussion(
    'river-refill',
    'river',
    29,
    -30,
    'conditional',
    'power',
    'operation',
    'meeting',
    'How often would coolant arrive?',
    'I\'d compare cooling options using the number and size of deliveries as well as total gallons. A smaller annual figure could still mean a difficult unloading location.'
  ),
  discussion(
    'river-lightspill',
    'river',
    -34,
    15,
    'concerned',
    'noise',
    'planning',
    'forum',
    'Night light along the bank',
    'A brightly lit corner can be the first thing you see from the bend. I want to know whether moving the security pole changes the light that reaches the water.'
  ),
  discussion(
    'river-drill',
    'river',
    -20,
    -49,
    'concerned',
    'water',
    'construction',
    'workshop',
    'The low point on a workday',
    'A spill drill at the gate might miss the lowest point on the site. Could the crew walk the downhill route before storing anything used to refuel equipment?',
    [
      reply('conditional', 'Mark a place to keep absorbent materials that stays dry during a storm.'),
      reply('supportive', 'I\'d like to see that short route on the posted construction map.')
    ]
  ),
  discussion(
    'river-gravelwalk',
    'river',
    11,
    9,
    'conditional',
    'land',
    'planning',
    'meeting',
    'Keep the bank accessible for inspection',
    'Leaving a green strip on paper is only half of it. I\'d support a service arrangement that lets an inspector reach it without squeezing between fencing and water.'
  ),
  discussion(
    'river-pipework',
    'river',
    38,
    48,
    'concerned',
    'water',
    'planning',
    'group',
    'The building is only one outline',
    'The building might clear the bend while a new drain or retaining wall sits much closer. Put those works on the same drawing before comparing setbacks.'
  ),

  discussion(
    'maple-sleep',
    'maple',
    -32,
    30,
    'concerned',
    'noise',
    'operation',
    'meeting',
    'A sound that starts and stops',
    'The switching on and off of fans can wake someone even if the average stays low. Would the equipment run steadily overnight or cycle every few minutes?'
  ),
  discussion(
    'maple-taxi',
    'maple',
    26,
    -33,
    'conditional',
    'traffic',
    'construction',
    'workshop',
    'Leave space for a wheelchair lift',
    'A van needs side clearance as well as a place to stop. I\'d support a detour that shows where the ramp opens and how the passenger reaches the door.'
  ),
  discussion(
    'maple-desk',
    'maple',
    16,
    13,
    'supportive',
    'benefits',
    'planning',
    'group',
    'A paper copy at a place people use',
    'I would pick up a large-print copy nearby and mark it by hand. Budgeting for paper responses would let neighbors without a phone take part.',
    [
      reply('supportive', 'A self-addressed return envelope would reach people who can\'t attend the evening workshop.')
    ]
  ),
  discussion(
    'maple-window',
    'maple',
    -12,
    46,
    'concerned',
    'noise',
    'operation',
    'forum',
    'Check an upper-floor window',
    'A panel that blocks equipment at street height may leave the upper floors in view. What would its top edge look like from a window facing the parcel?'
  ),
  discussion(
    'maple-quiettime',
    'maple',
    -43,
    7,
    'conditional',
    'noise',
    'construction',
    'group',
    'A predictable quiet period',
    'I could work appointments around a published period for loud work. If a pour moves by a day, how will nearby residents hear about the change?'
  ),
  discussion(
    'maple-sprinkler',
    'maple',
    39,
    -13,
    'concerned',
    'water',
    'operation',
    'meeting',
    'Will a service change affect this block?',
    'Would the water connection require any work affecting the senior building? I\'d want a written notice procedure for a pressure change or a temporary shutoff.'
  ),
  discussion(
    'maple-turnout',
    'maple',
    14,
    -49,
    'conditional',
    'traffic',
    'planning',
    'forum',
    'Show the emergency approach',
    'I\'d consider either site entrance if a response vehicle can still reach Maple Heights while trucks queue. Draw the narrowest turn and the waiting space together.'
  ),
  discussion(
    'maple-room',
    'maple',
    49,
    26,
    'supportive',
    'benefits',
    'planning',
    'workshop',
    'Bring the model to a daytime meeting',
    'A table that people can gather around in daylight would get my support. Put some chairs beside it so everyone can spend time comparing the positions.'
  ),
  discussion(
    'maple-backup',
    'maple',
    -18,
    -36,
    'concerned',
    'power',
    'operation',
    'group',
    'Two things happening in an outage',
    'A neighborhood power outage can already be disorienting. What should someone on Allen Road expect to hear if the facility switches on its backup equipment?'
  ),
  discussion(
    'maple-ice',
    'maple',
    31,
    40,
    'concerned',
    'traffic',
    'construction',
    'forum',
    'The cleared walk ends at the corner',
    'A plowed sidewalk can still end at a bank of snow. If trucks change the regular walk to pickup, who clears the last stretch for people using walkers?'
  ),
  discussion(
    'maple-tree',
    'maple',
    -45,
    41,
    'conditional',
    'land',
    'planning',
    'meeting',
    'Does the planting screen work in January?',
    'I\'d support a tree screen after seeing the winter view. An illustration with every tree in leaf makes the building look less exposed than it might feel.'
  ),
  discussion(
    'maple-call',
    'maple',
    7,
    59,
    'supportive',
    'noise',
    'operation',
    'group',
    'A phone number alongside the sound readings',
    'I like publishing the monitoring results with a telephone contact. Someone who hears a regular hum should be able to give its time without opening a web account.',
    [
      reply('conditional', 'Can the person calling ask for a paper summary of the follow-up?')
    ]
  ),
  discussion(
    'maple-coaches',
    'maple',
    48,
    -36,
    'concerned',
    'traffic',
    'construction',
    'meeting',
    'A group trip returning late',
    'A bus can return to the senior community later than its original schedule. How would a driver know a turn is temporarily blocked before reaching it?'
  ),
  discussion(
    'maple-drawdown',
    'maple',
    -5,
    27,
    'conditional',
    'water',
    'planning',
    'workshop',
    'Show the connection on a street map',
    'I\'d prefer the water connection that disturbs fewer road approaches. Which parts of the work happen inside the site and which need the public street?'
  ),
  discussion(
    'maple-lampheight',
    'maple',
    -27,
    -15,
    'concerned',
    'noise',
    'planning',
    'forum',
    'A bright line above the fence',
    'From an upper floor, even a narrow strip of exposed lighting can draw the eye. Show the top of the service yard at night from this side of town.'
  ),
  discussion(
    'maple-choices',
    'maple',
    37,
    7,
    'conditional',
    'benefits',
    'planning',
    'group',
    'Hear the comparison before commenting',
    'I\'d take part if someone can read the three choices aloud, describe the map and give me a way to submit a comment privately afterward.'
  ),
  discussion(
    'maple-daylight',
    'maple',
    19,
    -6,
    'supportive',
    'land',
    'planning',
    'meeting',
    'Turn the narrow end toward Allen Road',
    'I prefer looking toward the short end of the building. Try that rotation while keeping the line of trees in view and show the difference from the street.'
  ),
  discussion(
    'maple-rattles',
    'maple',
    -51,
    -24,
    'concerned',
    'noise',
    'construction',
    'workshop',
    'What happens during heavy compaction?',
    'If grading involves compacting the ground, will the contractor check vibration on this side before starting? A normal traffic reading won\'t describe that short period.'
  ),
  discussion(
    'maple-rates',
    'maple',
    28,
    55,
    'conditional',
    'power',
    'planning',
    'forum',
    'A bill a household can understand',
    'I\'d consider a larger connection if the utility can explain in plain language how project costs are assigned. Many people nearby plan expenses month by month.',
    [
      reply('concerned', 'Say what happens to the bill if only the first part of the project gets built.')
    ]
  ),
  discussion(
    'maple-calltree',
    'maple',
    -1,
    -59,
    'supportive',
    'benefits',
    'operation',
    'group',
    'Give neighbors a choice of alerts',
    'I support phone and printed alerts for planned generator tests. Let a resident choose one method instead of relying entirely on a neighborhood group online.'
  ),
  discussion(
    'maple-ramp',
    'maple',
    57,
    9,
    'conditional',
    'traffic',
    'construction',
    'meeting',
    'Try the temporary corner with a walker',
    'I\'d accept a longer walk with level paving and a proper curb ramp. On the plan I can\'t tell where the walking surface changes; could the team test it?'
  ),
  discussion(
    'maple-paving',
    'maple',
    -33,
    54,
    'concerned',
    'water',
    'construction',
    'forum',
    'A safe path after a downpour',
    'Water across an uneven temporary path is a difficult combination for a walker. Who checks the route near pickup after paving work changes the slope?'
  ),
  discussion(
    'maple-seat',
    'maple',
    23,
    -58,
    'conditional',
    'land',
    'planning',
    'workshop',
    'A rest spot on the longer route',
    'I could manage a longer detour if there is somewhere to sit along the way. Mark a rest point and the actual walking distance from the entrance.',
    [
      reply('supportive', 'A seat with arms and a clear spot for a wheelchair would serve several people at once.')
    ]
  )
];

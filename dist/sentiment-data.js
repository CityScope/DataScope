// Fictional workshop and social-feed material authored for DataScope.
// Stance is the viewpoint expressed in one sample message about a design choice.
// Replies stay with their opening message and are excluded from remark counts.
export const provenance =
  'Fictional community-session and social-media examples with illustrative map pins, not collected participant locations or live platform posts. Each icon marks one opening remark; replies stay in its thread. Counts describe this sample only.';

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

export const streams = [
  { id: 'session', label: 'Engagement sessions', short: 'Sessions' },
  { id: 'social', label: 'Social media & web', short: 'Social & web' }
];

export const channels = [
  { id: 'workshop', label: 'Workshop session', short: 'Workshop', stream: 'session' },
  { id: 'meeting', label: 'Public meeting', short: 'Meeting', stream: 'session' },
  { id: 'x', label: 'X / Twitter', short: 'X', stream: 'social' },
  { id: 'facebook', label: 'Facebook', short: 'Facebook', stream: 'social' },
  { id: 'reddit', label: 'Reddit', short: 'Reddit', stream: 'social' },
  { id: 'forum', label: 'Local web forum', short: 'Web forum', stream: 'social' }
];

const streamFor = new Map(channels.map((c) => [c.id, c.stream]));

// Centers and pin coordinates identify approximate corridors and places
// discussed, never a speaker's home or whereabouts. Place names are geographic
// references; their staff and residents did not supply these examples.
export const zones = [
  { id: 'park', name: 'John Riel Memorial Park & Arno', center: [42.2679, -83.2044] },
  { id: 'enterprise', name: 'Enterprise Drive', center: [42.2681, -83.2102] },
  { id: 'rail', name: 'Rail corridor & Reeck Drain', center: [42.27, -83.203] },
  { id: 'upper-stream', name: 'Upper Ecorse stream & I-94', center: [42.2735, -83.2124] },
  { id: 'river', name: 'Ecorse River bend', center: [42.2722, -83.2068] },
  { id: 'downstream', name: 'Lower Ecorse River', center: [42.2712, -83.1976] },
  { id: 'school', name: 'Melvindale High School & Outer Dr', center: [42.2744, -83.2032] },
  { id: 'maple', name: 'Maple Heights & Allen Road', center: [42.2684, -83.1984] }
];

function reply(stance, text) {
  return { stance, text };
}

// Coordinates stay anchored to the corridor or feature being discussed when
// the user moves the hypothetical facility in the Scenario Editor.
function discussion(
  id,
  zoneId,
  coords,
  stance,
  topic,
  phase,
  channel,
  title,
  excerpt,
  replies = []
) {
  return {
    id,
    zoneId,
    stance,
    topic,
    phase,
    channel,
    stream: streamFor.get(channel) || 'session',
    title,
    excerpt,
    coords,
    replies,
    synthetic: true
  };
}

export const discussions = [
  discussion(
    "park-quiet",
    "park",
    [42.26775, -83.20346],
    "concerned",
    "noise",
    "operation",
    "facebook",
    "An evening at the ball field",
    "From the benches you can hear the game and talk across a picnic table. Could we listen here on a warm evening with the cooling fans running?",
    [
      reply("conditional", "I would compare the same hour with the equipment yard on each side of the building."),
      reply("concerned", "Please include the gaps between trains. A daytime average would miss those quieter stretches.")
    ]
  ),
  discussion(
    "park-sightline",
    "park",
    [42.26803, -83.2043],
    "conditional",
    "land",
    "planning",
    "workshop",
    "Try the view from the path",
    "I could live with the western layout if someone marks the roof height from the park path. The flat map leaves me guessing how tall it feels.",
    [
      reply("supportive", "A view from child height beside the ball field would help me compare the two.")
    ]
  ),
  discussion(
    "park-testing",
    "park",
    [42.26744, -83.20408],
    "concerned",
    "noise",
    "operation",
    "x",
    "A generator test during a game",
    "If monthly tests and a Saturday game coincide, what will the players hear? Put a second listening point on the field side of the tracks."
  ),
  discussion(
    "park-path",
    "park",
    [42.26808, -83.20286],
    "concerned",
    "traffic",
    "construction",
    "meeting",
    "Keep the walk to the park open",
    "People come in on foot from Arno. Which entrance would still be usable if a contractor temporarily closes a crossing?",
    [
      reply("conditional", "Draw the detour with a stroller in mind. The shortest line on the map might end at a curb.")
    ]
  ),
  discussion(
    "park-screen",
    "park",
    [42.26804, -83.20514],
    "supportive",
    "noise",
    "planning",
    "workshop",
    "Use the building as a screen",
    "Of the two drawings, I prefer the equipment on the far side of the building. Let’s keep that version on the table while somebody checks the sound."
  ),
  discussion(
    "park-fence",
    "park",
    [42.26728, -83.20285],
    "conditional",
    "land",
    "construction",
    "reddit",
    "A place for the temporary fence",
    "Could the staging fence sit inside the work area? I would support a layout that keeps the park approach clear through baseball season."
  ),
  discussion(
    "enterprise-skills",
    "enterprise",
    [42.26694, -83.21195],
    "supportive",
    "benefits",
    "construction",
    "x",
    "A route into the trades",
    "I would welcome paid electrician apprenticeships on this job. A posted application date would make that opportunity easier to use.",
    [
      reply("conditional", "Could the contractor list which openings last through construction and which continue after opening?"),
      reply("supportive", "An evening information session would reach people already working a day shift.")
    ]
  ),
  discussion(
    "enterprise-trucks",
    "enterprise",
    [42.26645, -83.21039],
    "conditional",
    "traffic",
    "construction",
    "workshop",
    "Room to turn off Enterprise",
    "I could support this entrance if a delivery truck can wait inside the site. Show the turn with two vehicles arriving together."
  ),
  discussion(
    "enterprise-power",
    "enterprise",
    [42.26699, -83.2112],
    "conditional",
    "power",
    "planning",
    "meeting",
    "Who pays for the connection?",
    "I would want to see who covers an upgrade and what happens if demand grows. A line on a utility map does not tell me how much power is available.",
    [
      reply("supportive", "A utility letter with a date and a named payer would answer my question."),
      reply("concerned", "Please include the cost of an upgrade that gets started if the building never opens.")
    ]
  ),
  discussion(
    "enterprise-contracts",
    "enterprise",
    [42.2667, -83.20971],
    "supportive",
    "benefits",
    "planning",
    "reddit",
    "Let small firms see the work",
    "Publishing smaller bid packages could give local contractors a chance. I would like the procurement notice and a way to hear the results."
  ),
  discussion(
    "enterprise-hours",
    "enterprise",
    [42.26749, -83.21081],
    "concerned",
    "traffic",
    "construction",
    "forum",
    "Early deliveries",
    "Where do trucks wait if they arrive before the gate opens? The loading shift could start well before the posted construction hours."
  ),
  discussion(
    "enterprise-reuse",
    "enterprise",
    [42.26717, -83.20932],
    "supportive",
    "land",
    "planning",
    "facebook",
    "Compare sites already served by roads",
    "I like starting with land along an existing industrial street. Let’s also compare a parcel with a building or paved pad that could be reused."
  ),
  discussion(
    "enterprise-bills",
    "enterprise",
    [42.26804, -83.21074],
    "concerned",
    "power",
    "operation",
    "meeting",
    "A hot afternoon on the grid",
    "What happens to the site’s demand on the hottest weekday? I would want to see the plan for that hour alongside the annual electricity total."
  ),
  discussion(
    "school-dismissal",
    "school",
    [42.27458, -83.20249],
    "concerned",
    "traffic",
    "construction",
    "reddit",
    "Deliveries at dismissal",
    "Even a few trucks can matter at the wrong ten minutes. Could a proposed delivery route be drawn over the school arrival and dismissal routes?",
    [
      reply("conditional", "Show where trucks would queue if a driver gets here early."),
      reply("supportive", "I could work with a schedule that avoids both school peaks and is posted at the entrance.")
    ]
  ),
  discussion(
    "school-learning",
    "school",
    [42.27464, -83.20379],
    "supportive",
    "benefits",
    "operation",
    "forum",
    "Technical training close to school",
    "A paid summer placement in cooling controls would interest students who want a technical career. I would support a program with a clear way to apply."
  ),
  discussion(
    "school-crossing",
    "school",
    [42.27379, -83.2032],
    "conditional",
    "traffic",
    "planning",
    "workshop",
    "Walk the route before choosing it",
    "I would consider the entrance shown if families can walk the approach with the traffic planner first. Mark where turning drivers look away from the sidewalk."
  ),
  discussion(
    "school-play",
    "school",
    [42.27495, -83.20305],
    "conditional",
    "noise",
    "operation",
    "meeting",
    "Listen during outdoor activities",
    "I could accept a schedule for equipment tests if it accounts for outdoor events. What would the sound be like at the field on a still afternoon?"
  ),
  discussion(
    "school-procurement",
    "school",
    [42.27403, -83.20457],
    "supportive",
    "benefits",
    "construction",
    "workshop",
    "Make the opportunities visible",
    "I would come to a trades evening with local training providers. Publish the entry requirements early enough for students to prepare."
  ),
  discussion(
    "school-bus",
    "school",
    [42.274, -83.20179],
    "concerned",
    "traffic",
    "construction",
    "facebook",
    "Where a bus and a truck would meet",
    "Can we put both turning paths on the same drawing? A truck driver and a bus driver can each have a legal route and still struggle at one corner."
  ),
  discussion(
    "river-rain",
    "river",
    [42.27289, -83.20745],
    "concerned",
    "water",
    "construction",
    "meeting",
    "Where would rain carry sediment?",
    "Before grading starts, trace a hard rain from the disturbed ground to the river. Where could a neighbor see whether the controls are working?",
    [
      reply("conditional", "Comparing the two layouts against the same rainy day would make the drawings easier to judge."),
      reply("supportive", "I like putting a public inspection point on the map if it can be reached safely.")
    ]
  ),
  discussion(
    "river-edge",
    "river",
    [42.27219, -83.20788],
    "conditional",
    "land",
    "planning",
    "forum",
    "Leave room beside the water",
    "I would consider a smaller footprint with more planted ground. How much of the continuous river-side strip would each placement leave?"
  ),
  discussion(
    "river-spill",
    "river",
    [42.27262, -83.2065],
    "concerned",
    "water",
    "operation",
    "facebook",
    "What goes down this drain?",
    "Cooling-water deliveries and rain runoff follow different paths. Could someone trace both and mark where a spill would be contained?"
  ),
  discussion(
    "river-cooling",
    "river",
    [42.2711, -83.20767],
    "conditional",
    "power",
    "operation",
    "workshop",
    "Compare water and fan noise together",
    "I would consider dry cooling to limit water deliveries. Show the change in fan sound on the park side of the building in that same comparison."
  ),
  discussion(
    "river-path",
    "river",
    [42.27183, -83.20633],
    "supportive",
    "land",
    "planning",
    "x",
    "Keep the river bend visible",
    "I like the option with the largest unpaved strip near the bend. It gives people somewhere specific to ask about planting and long-term care."
  ),
  discussion(
    "river-flood",
    "river",
    [42.27087, -83.20699],
    "concerned",
    "water",
    "planning",
    "reddit",
    "Check what the distance leaves out",
    "Two points the same distance from the river could drain in different directions. I want the elevations and drain crossings before comparing stormwater risk."
  ),
  discussion(
    "maple-night",
    "maple",
    [42.26853, -83.19798],
    "concerned",
    "noise",
    "operation",
    "facebook",
    "The sound with a window open",
    "I care about the steady tone on summer nights. A reading at the property fence would be easier to understand with one near the Allen Road side too.",
    [
      reply("conditional", "Please show the quietest overnight hour as well as the average."),
      reply("supportive", "Posting how to request a follow-up measurement would help if people hear something unexpected.")
    ]
  ),
  discussion(
    "maple-briefing",
    "maple",
    [42.26825, -83.19919],
    "supportive",
    "benefits",
    "planning",
    "workshop",
    "Take the plans to people",
    "I would attend a daytime conversation near the senior community. Large-print maps with both entrances marked would help people compare them."
  ),
  discussion(
    "maple-traffic",
    "maple",
    [42.26765, -83.19804],
    "conditional",
    "traffic",
    "construction",
    "meeting",
    "Keep the pickup lane clear",
    "I could support a delivery route that leaves access for appointments. Please compare it with the morning passenger pickup times."
  ),
  discussion(
    "maple-light",
    "maple",
    [42.26899, -83.19847],
    "concerned",
    "noise",
    "operation",
    "x",
    "A view after dark",
    "Can the workshop show the lights from the road after sunset? A daytime rendering makes it hard to judge whether light reaches upper windows."
  ),
  discussion(
    "maple-report",
    "maple",
    [42.26789, -83.19975],
    "conditional",
    "noise",
    "operation",
    "reddit",
    "Who follows up on a complaint?",
    "I could work with a trial period if we know who will answer, how quickly, and whether a second reading can be requested from a different spot."
  ),
  discussion(
    "park-dugout",
    "park",
    [42.26853, -83.20398],
    "concerned",
    "noise",
    "operation",
    "meeting",
    "Calling from the dugout",
    "A coach has to get a child's attention from across the diamond. How much would the cooling sound change the quieter end of practice?",
    [
      reply("conditional", "Listen from both dugouts on the same day. Wind direction can change which one feels louder.")
    ]
  ),
  discussion(
    "park-shade",
    "park",
    [42.26748, -83.20483],
    "supportive",
    "land",
    "planning",
    "forum",
    "Leave the picnic shade in place",
    "The layout with more space along the park edge gets my vote. I'd rather keep an established shade tree than wait for a new row to grow."
  ),
  discussion(
    "park-lights",
    "park",
    [42.26768, -83.20229],
    "conditional",
    "noise",
    "planning",
    "workshop",
    "Aim the loading lights away",
    "I could accept night work inside the building. Turn the loading doors away from the field and draw where an open door would cast light."
  ),
  discussion(
    "park-dust",
    "park",
    [42.26854, -83.20545],
    "concerned",
    "land",
    "construction",
    "facebook",
    "Dust on the infield",
    "When the infield is dry, another layer of dust is the last thing players need. Where would exposed soil and gravel piles sit during earthwork?"
  ),
  discussion(
    "park-walkaround",
    "park",
    [42.26698, -83.20354],
    "supportive",
    "land",
    "planning",
    "meeting",
    "A walk around a marked outline",
    "I'd join a park walk if we could see poles marking the building corners. They would make a vote on the setback more meaningful."
  ),
  discussion(
    "park-drain",
    "park",
    [42.2686, -83.20311],
    "conditional",
    "water",
    "planning",
    "x",
    "Rain at the path entrance",
    "Show whether the path entrance is uphill or downhill from the proposed paving. I'd support a layout that keeps sheet runoff away from the gate.",
    [
      reply("concerned", "Please include the low spot where someone pushing a stroller would have to cross.")
    ]
  ),
  discussion(
    "park-shift",
    "park",
    [42.26768, -83.2057],
    "concerned",
    "traffic",
    "construction",
    "reddit",
    "The half hour before a game",
    "Park traffic builds before the first pitch. A delivery window that ends at game time could still put trucks and families on the same approach road."
  ),
  discussion(
    "park-planting",
    "park",
    [42.26717, -83.20199],
    "supportive",
    "benefits",
    "operation",
    "workshop",
    "Who waters the new trees?",
    "I'd welcome a paid seasonal crew for the screening trees. Put the watering and replacement work in the budget so the planting survives its first summers."
  ),
  discussion(
    "park-raincheck",
    "park",
    [42.26898, -83.205],
    "conditional",
    "water",
    "operation",
    "meeting",
    "Check after the first downpour",
    "I'd be comfortable trying the swale if people can return to the path after a storm and see where the water went."
  ),
  discussion(
    "park-barrier",
    "park",
    [42.26695, -83.20459],
    "concerned",
    "noise",
    "planning",
    "forum",
    "Gaps at the ends of a wall",
    "A wall can look solid from the middle of a drawing. Could sound travel around its ends toward the benches? I'd like the ends shown on the plan."
  ),
  discussion(
    "park-dryday",
    "park",
    [42.26808, -83.20177],
    "conditional",
    "power",
    "operation",
    "workshop",
    "A dry-cooling day at the field",
    "I like the idea of using less water. Before choosing it, compare the extra fan hours on a hot afternoon when the field is in use."
  ),
  discussion(
    "park-picnic",
    "park",
    [42.26819, -83.20603],
    "concerned",
    "noise",
    "operation",
    "facebook",
    "Picnic tables between innings",
    "Between innings we can hear a conversation at the next table. A single reading during a cheer won't tell us what the machinery adds."
  ),
  discussion(
    "park-weekend",
    "park",
    [42.26665, -83.20254],
    "supportive",
    "traffic",
    "construction",
    "meeting",
    "Hold the queue on the work site",
    "I favor the entrance layout that lets trucks wait behind the gate. It leaves people space to turn around when the parking area fills.",
    [
      reply("conditional", "It would help to see the gate closed as well as the gate open in that drawing."),
      reply("supportive", "Mark a waiting space for the second truck too.")
    ]
  ),
  discussion(
    "park-cranes",
    "park",
    [42.26902, -83.20361],
    "conditional",
    "land",
    "construction",
    "x",
    "Room for a crane swing",
    "If the long side faces the park, could a crane still unload it from inside the work fence? I would trade a little more setback for keeping the path open."
  ),
  discussion(
    "park-security",
    "park",
    [42.2676, -83.20644],
    "concerned",
    "noise",
    "operation",
    "reddit",
    "The lights after the last game",
    "The field eventually goes dark. I worry that a bright security apron facing the park could light up the approach all night."
  ),
  discussion(
    "park-cleanup",
    "park",
    [42.2676, -83.2014],
    "supportive",
    "benefits",
    "construction",
    "forum",
    "Pay for reopening the path",
    "I'd support setting aside money to repair any park approach used during construction. Agreement on the condition of the path should come before the first truck."
  ),
  discussion(
    "park-gravel",
    "park",
    [42.26906, -83.20573],
    "conditional",
    "water",
    "planning",
    "workshop",
    "Try a smaller paved apron",
    "Could a narrower service apron make room for planted ground? I'd favor it if the designer shows where a maintenance vehicle would still turn."
  ),
  discussion(
    "park-diesel",
    "park",
    [42.26655, -83.20407],
    "concerned",
    "power",
    "operation",
    "meeting",
    "What happens during a long outage?",
    "A daytime demonstration of the backup system might last minutes. Where would the exhaust and noise be directed if it had to run through a full park weekend?"
  ),
  discussion(
    "park-seating",
    "park",
    [42.26863, -83.20181],
    "concerned",
    "land",
    "planning",
    "workshop",
    "A seat with a view of the trees",
    "The tree line is most of the view from this bench. Rotating a big blank wall toward it seems like a real loss, even if the center of the building stays put."
  ),
  discussion(
    "park-bikes",
    "park",
    [42.26828, -83.2068],
    "conditional",
    "traffic",
    "construction",
    "facebook",
    "A detour a child can ride",
    "A detour that asks a young rider to dismount in traffic won't work for our family. I'd accept a longer route if every crossing is clear.",
    [
      reply("supportive", "Trace it with someone towing a bike trailer. The turning space matters as much as the distance.")
    ]
  ),
  discussion(
    "park-pathlamp",
    "park",
    [42.26666, -83.20156],
    "supportive",
    "noise",
    "operation",
    "x",
    "Keep the park side dark",
    "The option with low, shielded lights on the service side would suit evening walkers. I'd like that specific lighting arrangement kept in the design."
  ),
  discussion(
    "park-berm",
    "park",
    [42.26943, -83.20455],
    "concerned",
    "land",
    "planning",
    "meeting",
    "A berm can block the view too",
    "A high earth bank might hide the equipment, but it could also cut off views along the path. Can the section drawing show a seated person's eye level?"
  ),
  discussion(
    "enterprise-sharedentry",
    "enterprise",
    [42.2678, -83.20947],
    "supportive",
    "traffic",
    "planning",
    "workshop",
    "Use space behind the gate",
    "The version with a waiting bay inside the parcel looks workable. A driver could check in without holding up someone headed to the next business."
  ),
  discussion(
    "enterprise-secondshift",
    "enterprise",
    [42.26865, -83.21074],
    "conditional",
    "benefits",
    "operation",
    "meeting",
    "Which jobs stay on this block?",
    "I'd be interested in a maintenance job after construction. Show a shift schedule and the requirements for those positions separately from the one-time trade work."
  ),
  discussion(
    "enterprise-coolingmeter",
    "enterprise",
    [42.26793, -83.20833],
    "supportive",
    "water",
    "operation",
    "x",
    "Put a meter on the cooling line",
    "I'd back a design that lets us follow monthly cooling-water use. A meter on that feed would say more than the combined bill for the whole building.",
    [
      reply("conditional", "Include the weather for the month so a cool spring and a hot summer aren't compared as if they were alike.")
    ]
  ),
  discussion(
    "enterprise-ice",
    "enterprise",
    [42.26924, -83.21029],
    "concerned",
    "traffic",
    "operation",
    "reddit",
    "The turn after freezing rain",
    "A sharp delivery turn is harder when the pavement is slick. Who would clear the gate apron before the first service truck arrives?"
  ),
  discussion(
    "enterprise-shrug",
    "enterprise",
    [42.26877, -83.20896],
    "conditional",
    "land",
    "planning",
    "forum",
    "Leave the neighboring loading door usable",
    "A wide setback toward the park sounds reasonable until it pushes a service lane close to the next business. I'd like to see both loading doors on one plan."
  ),
  discussion(
    "enterprise-controls",
    "enterprise",
    [42.26966, -83.20981],
    "supportive",
    "benefits",
    "construction",
    "facebook",
    "Training on the actual controls",
    "I like a bid package that pairs a local apprentice with a controls technician. One supervised commissioning shift could teach more than a recruiting brochure."
  ),
  discussion(
    "enterprise-switchgear",
    "enterprise",
    [42.26901, -83.20813],
    "conditional",
    "power",
    "planning",
    "workshop",
    "A place to service the electrical gear",
    "Can the utility reach its gear from Enterprise without closing the whole drive? I'd accept that equipment at the front if the work space fits on the parcel."
  ),
  discussion(
    "enterprise-gatebeeps",
    "enterprise",
    [42.26817, -83.21002],
    "concerned",
    "noise",
    "construction",
    "meeting",
    "Reversing outside the gate",
    "A tight entrance means a lot of backing up. Where on this block would the alarms be loudest if deliveries have to reverse into the lot?"
  ),
  discussion(
    "enterprise-roofrain",
    "enterprise",
    [42.26825, -83.21143],
    "supportive",
    "water",
    "planning",
    "workshop",
    "Collect rain from the broad roof",
    "The roof is a large clean surface in the drawing. I'd support reserving space for storage and looking at whether that water could serve the plantings."
  ),
  discussion(
    "enterprise-fiber",
    "enterprise",
    [42.26748, -83.21006],
    "conditional",
    "traffic",
    "construction",
    "x",
    "One trench, or repeated closures?",
    "I'd support digging along Enterprise if the utility and fiber crews coordinate. Which driveways would be accessible on each day of that work?",
    [
      reply("concerned", "Please leave a way for a business to report that its delivery entrance was blocked.")
    ]
  ),
  discussion(
    "enterprise-vendor",
    "enterprise",
    [42.26873, -83.21],
    "supportive",
    "benefits",
    "planning",
    "meeting",
    "A small supplier can bid on upkeep",
    "Filter changes and grounds work could be approachable jobs for small firms. I favor putting those contracts on the same public calendar as larger bids."
  ),
  discussion(
    "enterprise-recovery",
    "enterprise",
    [42.26747, -83.21155],
    "conditional",
    "power",
    "operation",
    "reddit",
    "A neighbor for the waste heat",
    "Before promising heat to another building, draw the pipe route down Enterprise and ask who could use it in July. I'd back a short connection with a willing customer."
  ),
  discussion(
    "enterprise-yard",
    "enterprise",
    [42.26821, -83.20898],
    "supportive",
    "land",
    "planning",
    "forum",
    "Keep equipment in a single yard",
    "I prefer a compact service yard. That leaves space along the street for a continuous entrance and makes it easier to see where deliveries actually belong."
  ),
  discussion(
    "enterprise-ballast",
    "enterprise",
    [42.26881, -83.21146],
    "concerned",
    "water",
    "construction",
    "workshop",
    "Dirt tracked into the catch basin",
    "During grading, mud can follow a truck off the lot even on a dry day. Where would wheels be cleaned before they pass the first street drain?"
  ),
  discussion(
    "enterprise-coordination",
    "enterprise",
    [42.267, -83.21045],
    "supportive",
    "traffic",
    "construction",
    "facebook",
    "Tell the next door operator first",
    "A weekly notice with the dates of large deliveries would help shops plan their own shipments. I'd use it if a changed date is marked clearly.",
    [
      reply("supportive", "An update posted at the gate would also reach drivers who only make this trip once.")
    ]
  ),
  discussion(
    "enterprise-tariff",
    "enterprise",
    [42.26915, -83.2095],
    "conditional",
    "power",
    "operation",
    "x",
    "The bill if the tenant leaves",
    "I'd accept a dedicated connection if the agreement says who pays for it after an early closure. The street would still have the equipment after the servers left."
  ),
  discussion(
    "enterprise-restroom",
    "enterprise",
    [42.26758, -83.21238],
    "supportive",
    "benefits",
    "construction",
    "workshop",
    "Give trade crews a decent base",
    "I support using part of the parcel for a crew break area and restrooms. Contractors shouldn't have to depend on neighboring businesses for either."
  ),
  discussion(
    "enterprise-nightvent",
    "enterprise",
    [42.26742, -83.20866],
    "concerned",
    "noise",
    "operation",
    "meeting",
    "Across from a night shift",
    "Where would the ventilation outlets face? An industrial address can still have people working outside late who would hear machinery for an entire shift."
  ),
  discussion(
    "enterprise-parking",
    "enterprise",
    [42.26933, -83.21103],
    "conditional",
    "traffic",
    "construction",
    "meeting",
    "Parking at the busiest construction week",
    "At peak crew size, will every car fit behind the fence? I'd support an off-site shuttle only if we know where riders board and where they park."
  ),
  discussion(
    "enterprise-trainingday",
    "enterprise",
    [42.26649, -83.21151],
    "supportive",
    "benefits",
    "operation",
    "reddit",
    "A first-aid course open to neighbors",
    "I'd welcome a shared training day for crews and nearby businesses. Practicing who to call at the gate is a concrete local benefit that can continue after opening."
  ),
  discussion(
    "enterprise-hardstand",
    "enterprise",
    [42.26848, -83.20832],
    "conditional",
    "land",
    "planning",
    "workshop",
    "Compare how much pavement gets reused",
    "For each position, shade the part of the new footprint that's already hard surface. A version that uses more of the existing apron would have my support.",
    [
      reply("conditional", "Show which old pavement has to be torn up for utilities. Reuse looks different with a new trench through it.")
    ]
  ),
  discussion(
    "school-crossguard",
    "school",
    [42.27517, -83.20392],
    "conditional",
    "traffic",
    "construction",
    "meeting",
    "Leave the crossing visible",
    "I could accept the delivery approach if a child at the curb can see past a waiting truck. Mark the crossing guard's view on the drawing."
  ),
  discussion(
    "school-robotics",
    "school",
    [42.27353, -83.20386],
    "supportive",
    "benefits",
    "operation",
    "x",
    "A real cooling problem for students",
    "I'd like students to get a year's anonymous temperature readings and work out when the fans run hardest. That could be a classroom project without entering the facility."
  ),
  discussion(
    "school-horns",
    "school",
    [42.27495, -83.2012],
    "concerned",
    "noise",
    "construction",
    "reddit",
    "Concrete work during an exam",
    "A single early concrete pour can take a whole morning. Which classroom side faces the construction entrance, and how far ahead would the school receive notice?"
  ),
  discussion(
    "school-tapwater",
    "school",
    [42.27457, -83.20469],
    "conditional",
    "water",
    "operation",
    "workshop",
    "Put water use in familiar units",
    "I'd consider the cooling design if its hot-day water use were shown alongside the annual figure. A single yearly number is difficult to explain to a science class."
  ),
  discussion(
    "school-lamp",
    "school",
    [42.27354, -83.2022],
    "concerned",
    "noise",
    "operation",
    "forum",
    "Looking up from the playing field",
    "What would players see over the fence on a damp evening? Glare from a yard light can stand out even where a daytime view seems screened."
  ),
  discussion(
    "school-binoculars",
    "school",
    [42.2755, -83.20327],
    "supportive",
    "land",
    "planning",
    "workshop",
    "Draw the view from the bleachers",
    "The placement that keeps the lower roofline toward the school looks promising. I'd use the seats as a common viewing point when comparing scale.",
    [
      reply("conditional", "A line showing the winter tree canopy would help. The view changes once the leaves are down.")
    ]
  ),
  discussion(
    "school-pickup",
    "school",
    [42.27354, -83.20491],
    "concerned",
    "traffic",
    "construction",
    "meeting",
    "Late pickups count too",
    "School ends at one time, but students leave rehearsals and practices later. I worry that a route called clear after dismissal would still meet groups on foot."
  ),
  discussion(
    "school-sensorlab",
    "school",
    [42.27442, -83.20099],
    "supportive",
    "water",
    "operation",
    "facebook",
    "A water-monitoring lesson",
    "I favor letting a science class look at runoff records from two storms. Students could compare what the site collected with what fell on the nearby streets."
  ),
  discussion(
    "school-busstop",
    "school",
    [42.27503, -83.2051],
    "conditional",
    "traffic",
    "planning",
    "x",
    "Space to wait in winter",
    "If snow is piled near a temporary stop, students may wait in the road. I'd accept a detour with a plowed waiting area and a visible crossing."
  ),
  discussion(
    "school-fieldtrip",
    "school",
    [42.27328, -83.20288],
    "supportive",
    "benefits",
    "construction",
    "meeting",
    "An accessible site visit",
    "I'd support a visit for students curious about the trades. A wheelchair-accessible viewing point on the safe side of the fence should be part of the plan."
  ),
  discussion(
    "school-relay",
    "school",
    [42.27607, -83.2058],
    "conditional",
    "power",
    "operation",
    "workshop",
    "Who calls the school during an outage?",
    "If the site switches to backup during classes, I'd like the school to have one contact to explain the change and expected testing time."
  ),
  discussion(
    "school-gatewide",
    "school",
    [42.27467, -83.20568],
    "concerned",
    "traffic",
    "planning",
    "reddit",
    "A long trailer at a short crossing",
    "The tractor might clear a crossing before the trailer does. I'd like to see the whole vehicle drawn at the point where its turn takes the most space.",
    [
      reply("conditional", "Add a student on a bicycle to the same view. The gap can look much larger from above.")
    ]
  ),
  discussion(
    "school-pollinator",
    "school",
    [42.27549, -83.20454],
    "supportive",
    "land",
    "planning",
    "forum",
    "Planting as a class project",
    "A strip of native planting that students can see from an accessible path sounds worthwhile. I'd like the construction contract to cover care through the first summer."
  ),
  discussion(
    "school-netzero",
    "school",
    [42.27409, -83.20382],
    "conditional",
    "power",
    "planning",
    "facebook",
    "Ask for the hourly electricity chart",
    "Annual clean-power purchases seem hard for a class to interpret. I'd support sharing an hourly example showing when the building draws the most electricity."
  ),
  discussion(
    "school-music",
    "school",
    [42.27536, -83.20255],
    "concerned",
    "noise",
    "operation",
    "workshop",
    "An outdoor rehearsal has quiet passages",
    "If sound is sampled at the field, could a reading include the quiet parts of rehearsal? A peak during the loudest music would tell the group very little."
  ),
  discussion(
    "school-puddle",
    "school",
    [42.27404, -83.20255],
    "concerned",
    "water",
    "construction",
    "x",
    "A puddle at the school approach",
    "A curb detour can send walkers into a puddle after rain. Who would check the temporary route on a wet school morning?"
  ),
  discussion(
    "school-intern",
    "school",
    [42.27455, -83.20172],
    "conditional",
    "benefits",
    "operation",
    "meeting",
    "Can students get there after class?",
    "A part-time placement would make sense if the shift begins after school and a student can reach the entrance on foot. Show the route from the school door."
  ),
  discussion(
    "school-noisechart",
    "school",
    [42.27353, -83.20128],
    "supportive",
    "noise",
    "operation",
    "reddit",
    "Publish a test before and after opening",
    "I support taking a sound reading from the field before the equipment starts. Paired readings on similar afternoons give classes something they can examine."
  ),
  discussion(
    "school-walkaudit",
    "school",
    [42.27461, -83.20003],
    "supportive",
    "traffic",
    "planning",
    "workshop",
    "Students can map the walk",
    "Invite a student group to mark where they cross on a printed plan. I like an entrance choice that uses those observations before the road work is designed.",
    [
      reply("supportive", "Include the walk after a home game. Families can describe that route better than a traffic count can.")
    ]
  ),
  discussion(
    "school-heatday",
    "school",
    [42.27341, -83.19942],
    "concerned",
    "power",
    "operation",
    "meeting",
    "A high-demand afternoon",
    "I'd worry if the design counts on spare electricity every afternoon. Show what happens to cooling demand on the same hot day that the school needs its air conditioning."
  ),
  discussion(
    "school-sidewalk",
    "school",
    [42.27406, -83.19845],
    "conditional",
    "land",
    "construction",
    "forum",
    "Keep room for a pair of wheelchairs",
    "A line labelled open sidewalk might narrow beside temporary signs. I'd agree to it if two people can pass and the turning space at the corner stays clear."
  ),
  discussion(
    "school-classwork",
    "school",
    [42.27286, -83.19804],
    "conditional",
    "benefits",
    "planning",
    "facebook",
    "Learning materials before a vote",
    "I'd welcome a student discussion of the proposals if the materials include the no-build choice and explain the limits of the sound and water estimates.",
    [
      reply("supportive", "A printable map would let families do the same exercise at home.")
    ]
  ),
  discussion(
    "river-snowpile",
    "river",
    [42.27127, -83.20634],
    "concerned",
    "water",
    "operation",
    "forum",
    "Where does a snow pile melt?",
    "A pile of plowed snow could sit there for weeks and drain toward the bend. Which part of the paved area would hold it, and where would meltwater go?"
  ),
  discussion(
    "river-buffer",
    "river",
    [42.27073, -83.20626],
    "supportive",
    "land",
    "planning",
    "workshop",
    "A continuous planted strip",
    "Of the drawn options, I favor one long planted strip over three little patches. It leaves room beside the bend even when service vehicles need to turn."
  ),
  discussion(
    "river-crossings",
    "river",
    [42.27132, -83.205],
    "conditional",
    "traffic",
    "construction",
    "meeting",
    "Keep deliveries away from the bank",
    "I'd support a construction route that uses the paved entrance throughout. Mark where drivers would turn if the approved unloading spot was occupied."
  ),
  discussion(
    "river-dye",
    "river",
    [42.27012, -83.20423],
    "conditional",
    "water",
    "planning",
    "facebook",
    "Follow the drain to its outlet",
    "Before selecting the tank location, confirm the outlet for each nearby inlet. I'd change my preference if the drain led somewhere different from the surface slope."
  ),
  discussion(
    "river-nest",
    "river",
    [42.27154, -83.2057],
    "concerned",
    "noise",
    "construction",
    "x",
    "What carries across the water?",
    "Open water changes how the far side feels to someone walking there. Could a sound check cover the opposite bank while heavy equipment is actually working?"
  ),
  discussion(
    "river-monitor",
    "river",
    [42.27064, -83.20396],
    "supportive",
    "benefits",
    "operation",
    "meeting",
    "Budget for independent sampling",
    "I'd support paying a local lab to publish plain-language sampling results. Seeing the original dates and locations would let neighbors follow up on an odd result.",
    [
      reply("conditional", "Show which measurements are upstream controls. A colored dot alone is difficult to interpret.")
    ]
  ),
  discussion(
    "river-pond",
    "river",
    [42.27167, -83.20441],
    "concerned",
    "land",
    "planning",
    "workshop",
    "Space to reach a detention basin",
    "A pond drawn tight against a fence might be difficult to maintain. How much room would a small excavator need without driving along the riverbank?"
  ),
  discussion(
    "river-hotwater",
    "river",
    [42.27128, -83.203],
    "concerned",
    "power",
    "operation",
    "reddit",
    "Does warm water leave the system?",
    "The cooling diagram has a return arrow. Where does that water actually go on a hot day, and is there any connection at all to the river?"
  ),
  discussion(
    "river-mudsill",
    "river",
    [42.27226, -83.20463],
    "concerned",
    "water",
    "construction",
    "meeting",
    "Look beyond the silt fence",
    "A barrier on the river side leaves out mud that washes into the street. I'd like a drawing of both routes from the earthworks after a heavy shower."
  ),
  discussion(
    "river-deadend",
    "river",
    [42.27246, -83.20335],
    "conditional",
    "traffic",
    "operation",
    "forum",
    "A service route with room to turn",
    "I could support the layout if a maintenance truck can leave facing forward. Reversing toward the planted edge puts pressure on the strip everyone is trying to keep."
  ),
  discussion(
    "river-winterbank",
    "river",
    [42.273, -83.20352],
    "concerned",
    "land",
    "construction",
    "facebook",
    "A bare bank through winter",
    "If work stops for the winter before plantings take root, what's holding the soil in place? Please show what this edge looks like in the middle of construction."
  ),
  discussion(
    "river-valve",
    "river",
    [42.27217, -83.20274],
    "conditional",
    "water",
    "operation",
    "workshop",
    "A shutoff someone can reach",
    "I'd want to see where a drain can be isolated during a spill. The route to the control has to stay reachable during a delivery or a heavy rain.",
    [
      reply("concerned", "Can the night shift find the control if the loading bay is occupied?")
    ]
  ),
  discussion(
    "river-canopy",
    "river",
    [42.27279, -83.20255],
    "supportive",
    "land",
    "planning",
    "meeting",
    "Set the fence back from the trees",
    "I favor moving the service fence inward if that keeps mature trees beside the bend. Show the space needed for the roots as well as the trunks."
  ),
  discussion(
    "river-twostorms",
    "river",
    [42.27225, -83.20199],
    "concerned",
    "water",
    "planning",
    "x",
    "What if a second storm comes?",
    "One drawing shows an empty basin at the start of the rain. I'd like to know where the water goes if the next storm arrives before the basin has drained."
  ),
  discussion(
    "river-fans",
    "river",
    [42.27186, -83.20511],
    "conditional",
    "noise",
    "operation",
    "reddit",
    "Turn the fan yard away from the bend",
    "I could consider a layout with the building between the fans and the river. Test it at the bend, since the nearest property corner may be behind a barrier."
  ),
  discussion(
    "river-outlet",
    "river",
    [42.27232, -83.20585],
    "concerned",
    "water",
    "operation",
    "workshop",
    "An outlet below high water",
    "If the river rises to cover an outlet, could water back up into the parcel? The normal-day arrows on the drainage sketch don't answer that question."
  ),
  discussion(
    "river-stewards",
    "river",
    [42.271, -83.2056],
    "supportive",
    "benefits",
    "construction",
    "forum",
    "A paid planting crew after grading",
    "I like reserving part of the restoration work for a local crew. Specify which plants they will replace if the first hard rain takes them out."
  ),
  discussion(
    "river-refill",
    "river",
    [42.27208, -83.20392],
    "conditional",
    "power",
    "operation",
    "meeting",
    "How often would coolant arrive?",
    "I'd compare cooling options using the number and size of deliveries as well as total gallons. A smaller annual figure could still mean a difficult unloading location."
  ),
  discussion(
    "river-lightspill",
    "river",
    [42.27199, -83.20705],
    "concerned",
    "noise",
    "planning",
    "facebook",
    "Night light along the bank",
    "A brightly lit corner can be the first thing you see from the bend. I want to know whether moving the security pole changes the light that reaches the water."
  ),
  discussion(
    "river-drill",
    "river",
    [42.27144, -83.20371],
    "concerned",
    "water",
    "construction",
    "workshop",
    "The low point on a workday",
    "A spill drill at the gate might miss the lowest point on the site. Could the crew walk the downhill route before storing anything used to refuel equipment?",
    [
      reply("conditional", "Mark a place to keep absorbent materials that stays dry during a storm."),
      reply("supportive", "I'd like to see that short route on the posted construction map.")
    ]
  ),
  discussion(
    "river-gravelwalk",
    "river",
    [42.27288, -83.20579],
    "conditional",
    "land",
    "planning",
    "meeting",
    "Keep the bank accessible for inspection",
    "Leaving a green strip on paper is only half of it. I'd support a service arrangement that lets an inspector reach it without squeezing between fencing and water."
  ),
  discussion(
    "river-pipework",
    "river",
    [42.27142, -83.20706],
    "concerned",
    "water",
    "planning",
    "x",
    "The building is only one outline",
    "The building might clear the bend while a new drain or retaining wall sits much closer. Put those works on the same drawing before comparing setbacks."
  ),
  discussion(
    "maple-sleep",
    "maple",
    [42.26814, -83.19716],
    "concerned",
    "noise",
    "operation",
    "meeting",
    "A sound that starts and stops",
    "The switching on and off of fans can wake someone even if the average stays low. Would the equipment run steadily overnight or cycle every few minutes?"
  ),
  discussion(
    "maple-taxi",
    "maple",
    [42.26899, -83.19986],
    "conditional",
    "traffic",
    "construction",
    "workshop",
    "Leave space for a wheelchair lift",
    "A van needs side clearance as well as a place to stop. I'd support a detour that shows where the ramp opens and how the passenger reaches the door."
  ),
  discussion(
    "maple-desk",
    "maple",
    [42.26714, -83.19872],
    "supportive",
    "benefits",
    "planning",
    "forum",
    "A paper copy at a place people use",
    "I would pick up a large-print copy nearby and mark it by hand. Budgeting for paper responses would let neighbors without a phone take part.",
    [
      reply("supportive", "A self-addressed return envelope would reach people who can't attend the evening workshop.")
    ]
  ),
  discussion(
    "maple-window",
    "maple",
    [42.26871, -83.19714],
    "concerned",
    "noise",
    "operation",
    "facebook",
    "Check an upper-floor window",
    "A panel that blocks equipment at street height may leave the upper floors in view. What would its top edge look like from a window facing the parcel?"
  ),
  discussion(
    "maple-quiettime",
    "maple",
    [42.26831, -83.20063],
    "conditional",
    "noise",
    "construction",
    "x",
    "A predictable quiet period",
    "I could work appointments around a published period for loud work. If a pour moves by a day, how will nearby residents hear about the change?"
  ),
  discussion(
    "maple-sprinkler",
    "maple",
    [42.26729, -83.19741],
    "concerned",
    "water",
    "operation",
    "meeting",
    "Will a service change affect this block?",
    "Would the water connection require any work affecting the senior building? I'd want a written notice procedure for a pressure change or a temporary shutoff."
  ),
  discussion(
    "maple-turnout",
    "maple",
    [42.26954, -83.1984],
    "conditional",
    "traffic",
    "planning",
    "reddit",
    "Show the emergency approach",
    "I'd consider either site entrance if a response vehicle can still reach Maple Heights while trucks queue. Draw the narrowest turn and the waiting space together."
  ),
  discussion(
    "maple-room",
    "maple",
    [42.26721, -83.20007],
    "supportive",
    "benefits",
    "planning",
    "workshop",
    "Bring the model to a daytime meeting",
    "A table that people can gather around in daylight would get my support. Put some chairs beside it so everyone can spend time comparing the positions."
  ),
  discussion(
    "maple-backup",
    "maple",
    [42.26899, -83.19616],
    "concerned",
    "power",
    "operation",
    "forum",
    "Two things happening in an outage",
    "A neighborhood power outage can already be disorienting. What should someone on Allen Road expect to hear if the facility switches on its backup equipment?"
  ),
  discussion(
    "maple-ice",
    "maple",
    [42.26886, -83.20076],
    "concerned",
    "traffic",
    "construction",
    "facebook",
    "The cleared walk ends at the corner",
    "A plowed sidewalk can still end at a bank of snow. If trucks change the regular walk to pickup, who clears the last stretch for people using walkers?"
  ),
  discussion(
    "maple-tree",
    "maple",
    [42.26681, -83.19808],
    "conditional",
    "land",
    "planning",
    "meeting",
    "Does the planting screen work in January?",
    "I'd support a tree screen after seeing the winter view. An illustration with every tree in leaf makes the building look less exposed than it might feel."
  ),
  discussion(
    "maple-call",
    "maple",
    [42.26961, -83.19767],
    "supportive",
    "noise",
    "operation",
    "x",
    "A phone number alongside the sound readings",
    "I like publishing the monitoring results with a telephone contact. Someone who hears a regular hum should be able to give its time without opening a web account.",
    [
      reply("conditional", "Can the person calling ask for a paper summary of the follow-up?")
    ]
  ),
  discussion(
    "maple-coaches",
    "maple",
    [42.26726, -83.20081],
    "concerned",
    "traffic",
    "construction",
    "meeting",
    "A group trip returning late",
    "A bus can return to the senior community later than its original schedule. How would a driver know a turn is temporarily blocked before reaching it?"
  ),
  discussion(
    "maple-drawdown",
    "maple",
    [42.26671, -83.20082],
    "conditional",
    "water",
    "planning",
    "workshop",
    "Show the connection on a street map",
    "I'd prefer the water connection that disturbs fewer road approaches. Which parts of the work happen inside the site and which need the public street?"
  ),
  discussion(
    "maple-lampheight",
    "maple",
    [42.26674, -83.19968],
    "concerned",
    "noise",
    "planning",
    "reddit",
    "A bright line above the fence",
    "From an upper floor, even a narrow strip of exposed lighting can draw the eye. Show the top of the service yard at night from this side of town."
  ),
  discussion(
    "maple-choices",
    "maple",
    [42.26775, -83.20047],
    "conditional",
    "benefits",
    "planning",
    "forum",
    "Hear the comparison before commenting",
    "I'd take part if someone can read the three choices aloud, describe the map and give me a way to submit a comment privately afterward."
  ),
  discussion(
    "maple-daylight",
    "maple",
    [42.26743, -83.19936],
    "supportive",
    "land",
    "planning",
    "meeting",
    "Turn the narrow end toward Allen Road",
    "I prefer looking toward the short end of the building. Try that rotation while keeping the line of trees in view and show the difference from the street."
  ),
  discussion(
    "maple-rattles",
    "maple",
    [42.26844, -83.1999],
    "concerned",
    "noise",
    "construction",
    "workshop",
    "What happens during heavy compaction?",
    "If grading involves compacting the ground, will the contractor check vibration on this side before starting? A normal traffic reading won't describe that short period."
  ),
  discussion(
    "maple-rates",
    "maple",
    [42.26811, -83.19846],
    "conditional",
    "power",
    "planning",
    "facebook",
    "A bill a household can understand",
    "I'd consider a larger connection if the utility can explain in plain language how project costs are assigned. Many people nearby plan expenses month by month.",
    [
      reply("concerned", "Say what happens to the bill if only the first part of the project gets built.")
    ]
  ),
  discussion(
    "maple-calltree",
    "maple",
    [42.26881, -83.19915],
    "supportive",
    "benefits",
    "operation",
    "x",
    "Give neighbors a choice of alerts",
    "I support phone and printed alerts for planned generator tests. Let a resident choose one method instead of relying entirely on a neighborhood group online."
  ),
  discussion(
    "maple-ramp",
    "maple",
    [42.26905, -83.19774],
    "conditional",
    "traffic",
    "construction",
    "meeting",
    "Try the temporary corner with a walker",
    "I'd accept a longer walk with level paving and a proper curb ramp. On the plan I can't tell where the walking surface changes; could the team test it?"
  ),
  discussion(
    "maple-paving",
    "maple",
    [42.26995, -83.1989],
    "concerned",
    "water",
    "construction",
    "reddit",
    "A safe path after a downpour",
    "Water across an uneven temporary path is a difficult combination for a walker. Who checks the route near pickup after paving work changes the slope?"
  ),
  discussion(
    "maple-seat",
    "maple",
    [42.26974, -83.19694],
    "conditional",
    "land",
    "planning",
    "workshop",
    "A rest spot on the longer route",
    "I could manage a longer detour if there is somewhere to sit along the way. Mark a rest point and the actual walking distance from the entrance.",
    [
      reply("supportive", "A seat with arms and a clear spot for a wheelchair would serve several people at once.")
    ]
  ),
  discussion(
    "rail-quietgaps",
    "rail",
    [42.26983, -83.21072],
    "concerned",
    "noise",
    "operation",
    "meeting",
    "Between passing freight trains",
    "People say the tracks are already loud, but a freight train passes in three minutes and then the block goes quiet. Continuous cooling fans would fill every gap between trains.",
    [
      reply("conditional", "Record both a train pass-by and the quiet stretch ten minutes later so the comparison is honest."),
      reply("concerned", "Nighttime freight schedules vary; a steady low hum at 2 a.m. feels very different from a brief horn.")
    ]
  ),
  discussion(
    "rail-reeckculvert",
    "rail",
    [42.26931, -83.20878],
    "concerned",
    "water",
    "planning",
    "facebook",
    "Reeck Drain backs up after spring thaw",
    "Anyone who walks near the tracks after a heavy April rain has seen Reeck Drain fill right to the culvert lip. Adding roof runoff next to that channel needs real storage calculations.",
    [
      reply("supportive", "Posting the drain capacity study alongside the proposed detention basin size would clear up a lot of guesswork.")
    ]
  ),
  discussion(
    "rail-easementfeed",
    "rail",
    [42.27034, -83.20752],
    "supportive",
    "power",
    "planning",
    "workshop",
    "Run power along the rail corridor",
    "If the new electrical feeder can follow the existing railway right-of-way instead of trenching down residential streets, that would avoid months of neighborhood lane closures."
  ),
  discussion(
    "rail-crossingqueue",
    "rail",
    [42.26995, -83.20615],
    "concerned",
    "traffic",
    "construction",
    "x",
    "Construction trucks stuck behind a train",
    "When a slow freight train blocks the crossing, traffic already backs up two blocks. Where do five concrete trucks wait without sealing off side streets?"
  ),
  discussion(
    "rail-vibration",
    "rail",
    [42.27077, -83.20491],
    "conditional",
    "power",
    "planning",
    "reddit",
    "Track vibration beside high-voltage gear",
    "Heavy rail cars shake the ground along the parcel fence every day. I would feel better seeing how the underground water mains and switchgear pads are isolated from track vibration."
  ),
  discussion(
    "rail-drainclear",
    "rail",
    [42.27062, -83.20251],
    "supportive",
    "water",
    "operation",
    "workshop",
    "Fund routine clearing of Reeck Drain",
    "Branches and litter jam the grate beside the tracks every fall. Including regular culvert clearing in the site maintenance agreement would benefit the whole block.",
    [
      reply("conditional", "Make sure the city and drain commissioner both sign off on who inspects it after big storms.")
    ]
  ),
  discussion(
    "rail-emergencyroute",
    "rail",
    [42.27172, -83.20159],
    "concerned",
    "traffic",
    "operation",
    "meeting",
    "Fire truck access when a train stops",
    "What happens if an ambulance or fire crew needs to reach the site or the park side while a freight train is stopped across the north tracks? Show both alternate routes on the plan."
  ),
  discussion(
    "rail-soundreflect",
    "rail",
    [42.27106, -83.1998],
    "concerned",
    "noise",
    "planning",
    "forum",
    "Echoes off the building wall and boxcars",
    "A long flat metal facade facing the rail embankment could bounce both train rumble and fan noise toward Arno Avenue. Could acoustic cladding or angled louvers soften the reflection?"
  ),
  discussion(
    "rail-setbackmark",
    "rail",
    [42.27234, -83.19894],
    "conditional",
    "land",
    "planning",
    "workshop",
    "Stake the rail clearance line on site",
    "I could support a building inside the triangle if the railroad right-of-way setback is marked on the ground before anyone votes on the footprint."
  ),
  discussion(
    "rail-transformerhaul",
    "rail",
    [42.27204, -83.19671],
    "conditional",
    "traffic",
    "construction",
    "meeting",
    "Coordinate heavy deliveries with rail schedules",
    "Oversized transformers and chillers move slowly across tracks. Require a flagger and an advance notice to both the railroad and nearby households before those moves."
  ),
  discussion(
    "rail-craneswing",
    "rail",
    [42.27305, -83.19542],
    "concerned",
    "land",
    "construction",
    "x",
    "Keep crane booms clear of rail signals",
    "The eastern tracks sit right against the parcel line. Show the crane setup pad so booms and loads never swing over active rail lines or signal poles."
  ),
  discussion(
    "rail-spills",
    "rail",
    [42.26687, -83.20869],
    "concerned",
    "water",
    "operation",
    "reddit",
    "Containment between the yard and Reeck Drain",
    "Diesel fuel for backup generators and glycol in closed loops are stored close to the drainage ditch. Show the secondary containment curb and shutoff valve before anything reaches Reeck Drain.",
    [
      reply("supportive", "An inspection diagram showing where the shutoff valve sits would be genuinely reassuring.")
    ]
  ),
  discussion(
    "rail-bufferuse",
    "rail",
    [42.26719, -83.20695],
    "supportive",
    "land",
    "planning",
    "facebook",
    "Industrial land beside tracks fits better than homes",
    "Putting an industrial facility inside a triangle already bordered by two rail lines makes more sense than clearing open greenfield land next to quiet subdivisions."
  ),
  discussion(
    "rail-shortcut",
    "rail",
    [42.2688, -83.20704],
    "concerned",
    "traffic",
    "planning",
    "meeting",
    "Keep teens off the trackside shortcut",
    "Students sometimes cut along the rail embankment between the park and the high school. Fencing the site must not squeeze pedestrians closer to the live rails."
  ),
  discussion(
    "rail-monitorpost",
    "rail",
    [42.2695, -83.20529],
    "supportive",
    "noise",
    "operation",
    "workshop",
    "Place a permanent sound meter east of the tracks",
    "I would back the project with an independent continuous noise monitor right across the rail line that separates train spikes from steady equipment decibels.",
    [
      reply("conditional", "Publish the hourly readings publicly so residents do not have to file a records request.")
    ]
  ),
  discussion(
    "rail-glarecars",
    "rail",
    [42.27038, -83.20568],
    "conditional",
    "noise",
    "operation",
    "forum",
    "Shield yard floodlights along the embankment",
    "High pole lights facing east bounce off passing steel freight cars and into nearby backyards. Downward full-cutoff fixtures would make night lighting much easier to live with."
  ),
  discussion(
    "rail-conduitmap",
    "rail",
    [42.27111, -83.20431],
    "conditional",
    "power",
    "planning",
    "meeting",
    "Map existing fiber and gas lines by the tracks",
    "Several utility conduits already run parallel to the railroad. Confirm there is enough room for new power feeds without relocating neighborhood lines."
  ),
  discussion(
    "rail-nativebrush",
    "rail",
    [42.27262, -83.20408],
    "supportive",
    "land",
    "operation",
    "facebook",
    "Plant deep-rooted natives along Reeck Drain",
    "Replacing invasive weeds along the drain edge with native sedges and shrubs would filter runoff, stabilize the bank, and soften the view from the east."
  ),
  discussion(
    "rail-piledriving",
    "rail",
    [42.27303, -83.20189],
    "concerned",
    "noise",
    "construction",
    "x",
    "Foundation vibration near older basements",
    "If soft soil next to Reeck Drain requires driven piles, homes just east of the tracks could feel every strike. Offer pre-construction crack surveys and set strict daytime hours."
  ),
  discussion(
    "rail-winterplume",
    "rail",
    [42.27434, -83.20316],
    "conditional",
    "power",
    "operation",
    "reddit",
    "Check winter steam drift over the tracks",
    "Evaporative towers can throw a thick mist on freezing mornings. Show whether moist plumes would drift across the rail signals or turn into black ice on adjacent walkways."
  ),
  discussion(
    "rail-utilityjobs",
    "rail",
    [42.27508, -83.20191],
    "supportive",
    "benefits",
    "construction",
    "workshop",
    "Local electrical and substation apprenticeships",
    "Connecting 26 MW along the rail utility corridor takes skilled lineworkers and relay technicians. Partnering with local union halls could open paid apprenticeships for residents."
  ),
  discussion(
    "rail-detourmap",
    "rail",
    [42.2687, -83.20631],
    "conditional",
    "traffic",
    "construction",
    "forum",
    "Post clear crossing detour notices",
    "If utility trenching closes one rail crossing even for a weekend, put detour signs up three days early and share a plain map both online and at city hall."
  ),
  discussion(
    "rail-gentest",
    "rail",
    [42.26848, -83.2047],
    "concerned",
    "noise",
    "operation",
    "meeting",
    "Test backup generators during weekday midday",
    "Do not schedule monthly generator load tests on quiet Sunday mornings when the tracks are silent. Pick one predictable weekday midday slot and post it a week ahead."
  ),
  discussion(
    "rail-swalekeep",
    "rail",
    [42.26997, -83.20494],
    "conditional",
    "water",
    "planning",
    "workshop",
    "Keep the parcel drainage swale open",
    "The low grass channel on the east side of the lot currently slows down stormwater before it reaches Reeck Drain. Preserve or expand that retention strip in the site layout."
  ),
  discussion(
    "rail-outfallview",
    "rail",
    [42.26956, -83.20357],
    "supportive",
    "water",
    "operation",
    "meeting",
    "Visible outfall check point on Reeck Drain",
    "Give watershed volunteers a safe public vantage point near the drain culvert so anyone can confirm stormwater leaving the site runs clear after a storm."
  ),
  discussion(
    "rail-fenceheight",
    "rail",
    [42.27048, -83.20324],
    "conditional",
    "land",
    "planning",
    "facebook",
    "Avoid razor wire facing neighborhood streets",
    "Security fencing along the rail boundary is understandable, but dark coated mesh with evergreen screening looks far better from the park than bright galvanized chain link."
  ),
  discussion(
    "rail-shiftsync",
    "rail",
    [42.27027, -83.20192],
    "supportive",
    "traffic",
    "operation",
    "x",
    "Low daily staff traffic once operating",
    "Unlike a distribution warehouse running hundreds of semis a day, an operating data center adds relatively few cars at shift change. Show the actual post-construction vehicle counts."
  ),
  discussion(
    "rail-freightbridge",
    "rail",
    [42.27107, -83.20173],
    "concerned",
    "water",
    "planning",
    "reddit",
    "Where Reeck Drain meets the Ecorse River",
    "Follow the water all the way past the rail junction to where the drain meets the Ecorse River. A bottleneck under the bridge affects homes on both sides of the tracks."
  ),
  discussion(
    "upper-culvert",
    "upper-stream",
    [42.2751, -83.21463],
    "concerned",
    "water",
    "planning",
    "meeting",
    "Stormwater surging under the I-94 culvert",
    "During a summer cloudburst, water races down the upper Ecorse stream under I-94. Adding impervious pavement just downstream could back high water up into the western valley.",
    [
      reply("conditional", "Ask the county drain office to model backwater levels upstream of the I-94 culvert, not only at the parcel line.")
    ]
  ),
  discussion(
    "upper-calmnight",
    "upper-stream",
    [42.27395, -83.21412],
    "concerned",
    "noise",
    "operation",
    "facebook",
    "Sound carrying across I-94 after midnight",
    "Highway traffic masks a lot during rush hour, but at 3 a.m. when I-94 quiets down, low-frequency hums travel right across the open valley into our bedrooms."
  ),
  discussion(
    "upper-greenway",
    "upper-stream",
    [42.27474, -83.21341],
    "supportive",
    "land",
    "planning",
    "workshop",
    "Connect an upper valley stream trail",
    "If community benefit funds help clean up the wooded banks up the stream and link walking paths across the corridor, residents west of the freeway would see a real everyday amenity."
  ),
  discussion(
    "upper-pairedsensor",
    "upper-stream",
    [42.27382, -83.21338],
    "supportive",
    "water",
    "operation",
    "workshop",
    "Compare upstream and downstream water sensors",
    "Put one water gauge up the valley stream west of I-94 and one downstream of the site. Comparing the two readings would show immediately whether the facility changes flow or clarity.",
    [
      reply("supportive", "Real-time turbidity and temperature graphs online would build trust faster than an annual PDF.")
    ]
  ),
  discussion(
    "upper-ramptrucks",
    "upper-stream",
    [42.27434, -83.21207],
    "concerned",
    "traffic",
    "construction",
    "x",
    "Keep construction haulers on I-94 ramps",
    "Heavy dump trucks leaving the freeway should go straight to Enterprise Drive. Ban shortcutting through residential side streets west of I-94 and post weight limits clearly."
  ),
  discussion(
    "upper-roadsalt",
    "upper-stream",
    [42.27304, -83.21275],
    "conditional",
    "water",
    "operation",
    "reddit",
    "Winter highway salt mixing with site runoff",
    "The upper creek already carries heavy winter salt from I-94. Requiring salt-free deicing or covered storage on the new parcel would keep chloride levels from climbing further."
  ),
  discussion(
    "upper-wildlife",
    "upper-stream",
    [42.27348, -83.21114],
    "concerned",
    "land",
    "planning",
    "meeting",
    "Wooded creek corridor for birds and foxes",
    "Deer, herons, and migratory birds follow the trees up the valley stream. Keep nighttime floodlights shielded and leave the full riparian tree belt untouched."
  ),
  discussion(
    "upper-skyglare",
    "upper-stream",
    [42.27258, -83.21144],
    "concerned",
    "noise",
    "operation",
    "forum",
    "Night glow visible from western streets",
    "From the ridge across I-94 you look straight across the tree line toward Enterprise Drive. Warm-colored, downward-aimed security lights should be mandatory."
  ),
  discussion(
    "upper-highwater",
    "upper-stream",
    [42.27249, -83.20992],
    "concerned",
    "water",
    "planning",
    "facebook",
    "Remember the July storm high-water marks",
    "Two summers ago the stream climbed six feet up the valley bank west of the freeway. Design detention basins for modern cloudbursts, not 1970s rainfall tables."
  ),
  discussion(
    "upper-watermain",
    "upper-stream",
    [42.27269, -83.21218],
    "conditional",
    "water",
    "planning",
    "meeting",
    "How does cooling water affect west-side pressure?",
    "Explain which transmission main feeds the cooling system and verify that summer peak draw will not lower residential water pressure or hydrant flow west of I-94."
  ),
  discussion(
    "upper-i94feed",
    "upper-stream",
    [42.27203, -83.21106],
    "supportive",
    "power",
    "planning",
    "workshop",
    "Route transmission upgrades beside I-94",
    "Using the existing highway utility corridor for high-voltage lines keeps heavy poles and trenching away from front yards in the western neighborhood."
  ),
  discussion(
    "upper-dryfans",
    "upper-stream",
    [42.27113, -83.21179],
    "conditional",
    "power",
    "operation",
    "reddit",
    "Dry cooling saves water, but what about hot-day fans?",
    "I like dry cooling to protect regional water supplies, but I want to know whether the extra rooftop fan banks stand out above highway background sound on 90-degree afternoons.",
    [
      reply("conditional", "Show both water savings and peak summer fan decibels side by side before locking in a cooling system.")
    ]
  ),
  discussion(
    "upper-floodmap",
    "upper-stream",
    [42.2725, -83.21066],
    "concerned",
    "water",
    "planning",
    "forum",
    "Show updated 100-year and 500-year floodplains",
    "FEMA maps along small urban tributaries often lag behind recent development. Include the full upper valley floodplain overlay in public handouts."
  ),
  discussion(
    "upper-westmeeting",
    "upper-stream",
    [42.27123, -83.2101],
    "conditional",
    "benefits",
    "planning",
    "meeting",
    "Include households west of I-94 in notices",
    "The freeway feels like a border, so residents on this side often hear about industrial plans late. Mail workshop invites to both sides of the stream corridor."
  ),
  discussion(
    "upper-westwind",
    "upper-stream",
    [42.27201, -83.21031],
    "concerned",
    "land",
    "construction",
    "x",
    "Westerly winds carry grading dust east",
    "Prevailing winds blow straight down the valley from the west. Require active water misting and covered stockpiles during earthwork so dust does not blanket the creek and park."
  ),
  discussion(
    "upper-gaugeboard",
    "upper-stream",
    [42.27137, -83.20871],
    "supportive",
    "water",
    "operation",
    "facebook",
    "Open dashboard for stream gauges and rain",
    "A simple public webpage showing live creek height up the valley stream and rainfall on site would be helpful to everyone during storm season."
  ),
  discussion(
    "upper-oaks",
    "upper-stream",
    [42.27281, -83.20931],
    "conditional",
    "land",
    "planning",
    "workshop",
    "Protect mature oaks along the upper bank",
    "Old trees along the valley slope already absorb freeway sound and hold the clay bank together. Any utility crossing should bore underneath instead of clear-cutting the slope."
  ),
  discussion(
    "upper-crosssection",
    "upper-stream",
    [42.27165, -83.20774],
    "conditional",
    "land",
    "planning",
    "meeting",
    "Draw a valley cross-section from west to east",
    "A flat map hides how low the stream sits below I-94 and the surrounding streets. One true-scale cross-section would clarify both flood elevation and building height."
  ),
  discussion(
    "upper-detours",
    "upper-stream",
    [42.27395, -83.21152],
    "concerned",
    "traffic",
    "construction",
    "forum",
    "Avoid commuter spillover onto side streets",
    "If utility work narrows lanes near the highway ramps, morning commuters will cut down quiet residential blocks. Keep full ramp lanes open during weekday rush hours."
  ),
  discussion(
    "upper-restoration",
    "upper-stream",
    [42.27379, -83.21263],
    "supportive",
    "benefits",
    "operation",
    "workshop",
    "Sponsor upper-stream bank restoration",
    "Funding invasive-brush removal and native plantings along the eroding bends up the valley stream would turn a neglected creek edge into a shared community benefit.",
    [
      reply("supportive", "Partnering with local watershed stewards would make sure the plantings actually survive past year one.")
    ]
  ),
  discussion(
    "upper-seepage",
    "upper-stream",
    [42.2731, -83.21169],
    "concerned",
    "water",
    "construction",
    "reddit",
    "Groundwater seepage during excavation",
    "Digging deep electrical vaults near the valley floor often hits perched groundwater. Show how pumped water will be filtered before discharge into the creek."
  ),
  discussion(
    "upper-fuelplan",
    "upper-stream",
    [42.27449, -83.21135],
    "concerned",
    "power",
    "operation",
    "meeting",
    "Publish the generator fuel spill response plan",
    "Thousands of gallons of backup diesel near an urban stream require clear inspection logs and double-walled tanks. Share the spill response checklist publicly."
  ),
  discussion(
    "upper-gridheatwave",
    "upper-stream",
    [42.27301, -83.21374],
    "conditional",
    "power",
    "operation",
    "x",
    "Protect neighborhood power during heat waves",
    "Our block already flickers during August storms. Clarify whether the data center can shed load or run on-site backup during regional grid emergencies instead of competing with homes."
  ),
  discussion(
    "upper-overpasswalk",
    "upper-stream",
    [42.27326, -83.21032],
    "conditional",
    "traffic",
    "construction",
    "workshop",
    "Keep the highway overpass sidewalk open",
    "People walk and bike across the overpass every day to reach jobs and schools. Do not stage utility reels or equipment trailers on the pedestrian walkway."
  ),
  discussion(
    "upper-winterview",
    "upper-stream",
    [42.27429, -83.21298],
    "concerned",
    "land",
    "planning",
    "facebook",
    "Show the winter view without leaves",
    "In July the creek trees hide almost everything across the valley, but from November through April you can see right through the branches. Render the building in winter."
  ),
  discussion(
    "upper-streamwalk",
    "upper-stream",
    [42.27214, -83.21217],
    "supportive",
    "benefits",
    "planning",
    "meeting",
    "Walk the upper stream with engineers and neighbors",
    "Walking the creek bank together would let long-time residents point out erosion spots and old drain tiles that never show up on satellite imagery."
  ),
  discussion(
    "upper-basinupkeep",
    "upper-stream",
    [42.27467, -83.21036],
    "conditional",
    "water",
    "operation",
    "workshop",
    "Who maintains stormwater ponds in ten years?",
    "Detention basins work great on opening day and then fill with silt if nobody cleans them. Tie an enforceable maintenance schedule to the occupancy permit."
  ),
  discussion(
    "upper-taxvalue",
    "upper-stream",
    [42.27337, -83.21431],
    "supportive",
    "benefits",
    "operation",
    "forum",
    "Direct new tax revenue to local drainage fixes",
    "If the facility generates new local tax revenue, dedicating a visible share to fixing chronic neighborhood drainage along the Ecorse watershed would earn broader support."
  ),
  discussion(
    "down-allenbridge",
    "downstream",
    [42.27275, -83.20103],
    "concerned",
    "water",
    "planning",
    "meeting",
    "Flooding at the Allen Road river bridge",
    "Every time we get two inches of rain, the lower Ecorse River swells fast where it narrows under Allen Road. Downstream neighbors need proof that peak storm flow will not rise by even a percent.",
    [
      reply("conditional", "Require zero net increase in peak runoff rate for the 100-year storm, verified by an independent hydrologist."),
      reply("concerned", "Basements along the lower reach already flood when the creek crests and storm sewers back up.")
    ]
  ),
  discussion(
    "down-thermal",
    "downstream",
    [42.27146, -83.20225],
    "concerned",
    "water",
    "operation",
    "reddit",
    "Could warm runoff raise stream temperature?",
    "Even clean rainwater running off acres of hot dark roofing and paved equipment yards enters the creek warmer than shaded ground. Show how detention basins cool runoff before release."
  ),
  discussion(
    "down-turbidity",
    "downstream",
    [42.27216, -83.19992],
    "concerned",
    "water",
    "construction",
    "facebook",
    "Keep clay silt out of the lower river",
    "Once earthmoving begins upstream, clay mud washes straight downriver past Maple Heights toward Lincoln Park. Require double silt fences and daily inspection logs after rain."
  ),
  discussion(
    "down-dashboard",
    "downstream",
    [42.27128, -83.20104],
    "supportive",
    "water",
    "operation",
    "workshop",
    "Public water clarity and flow page for downriver",
    "I would support an automated monitoring station near the downstream rail bridge that posts water level, temperature, and clarity where residents can check it anytime."
  ),
  discussion(
    "down-habitat",
    "downstream",
    [42.27154, -83.19912],
    "concerned",
    "land",
    "planning",
    "meeting",
    "Turtles and herons along the eastern bend",
    "East of the train bridge the creek slows down into a quiet green strip full of snapping turtles, ducks, and blue herons. Keep equipment buffers wide enough to protect that habitat."
  ),
  discussion(
    "down-bankerosion",
    "downstream",
    [42.27033, -83.20117],
    "conditional",
    "water",
    "operation",
    "forum",
    "Prevent bank slumping from fast pond releases",
    "Releasing detained stormwater too quickly after a storm still carves away clay riverbanks downstream. Use slow-release outlet structures that mimic natural meadow drainage."
  ),
  discussion(
    "down-overlook",
    "downstream",
    [42.27046, -83.19931],
    "supportive",
    "land",
    "operation",
    "workshop",
    "Create a river overlook and cleanup access",
    "Right now the lower creek is fenced off and forgotten except when it floods. Adding a small landscaped overlook and volunteer cleanup path near Allen Road would give the river back to the community.",
    [
      reply("supportive", "Include a trash boom and a spot where city crews can haul out debris easily.")
    ]
  ),
  discussion(
    "down-spillboom",
    "downstream",
    [42.26951, -83.20011],
    "concerned",
    "water",
    "operation",
    "x",
    "Where would an emergency spill boom go?",
    "If a fuel tanker or cooling loop ever leaked during a storm, how many minutes before it reaches Allen Road? Mark the exact containment points downstream on the emergency map."
  ),
  discussion(
    "down-droughtwater",
    "downstream",
    [42.27067, -83.19846],
    "conditional",
    "power",
    "operation",
    "reddit",
    "Compare water use during dry late summers",
    "Three million gallons a year for evaporative cooling is one number on paper, but how much of that falls during July and August droughts? Dry cooling looks much better for water conservation."
  ),
  discussion(
    "down-valleysound",
    "downstream",
    [42.26936, -83.19911],
    "concerned",
    "noise",
    "operation",
    "facebook",
    "Sound travels down the open river channel",
    "On humid summer evenings you can hear voices and trains carry right down the river valley. Test whether low-frequency fan noise funnels eastward along the creek corridor."
  ),
  discussion(
    "down-logjam",
    "downstream",
    [42.27064, -83.19773],
    "supportive",
    "water",
    "operation",
    "meeting",
    "Clear logjams near the downstream rail trestle",
    "Fallen limbs pile up against the bridge pilings east of the parcel every spring. Funding annual debris removal along this reach would cut local flood risk right away."
  ),
  discussion(
    "down-floodfringe",
    "downstream",
    [42.2692, -83.19685],
    "concerned",
    "water",
    "planning",
    "forum",
    "Check FEMA flood fringe lines east of the tracks",
    "Homes backing onto the lower Ecorse River already carry steep flood insurance. Confirm the proposed building and any fill dirt stay strictly outside the regulatory floodway."
  ),
  discussion(
    "down-labtests",
    "downstream",
    [42.27014, -83.19746],
    "conditional",
    "water",
    "operation",
    "workshop",
    "Quarterly independent water sampling",
    "I could accept stormwater discharge to the creek if an accredited third-party lab tests the outfall quarterly and posts results in plain language for Allen Park and Melvindale."
  ),
  discussion(
    "down-basements",
    "downstream",
    [42.26971, -83.19619],
    "concerned",
    "water",
    "planning",
    "facebook",
    "Keep storm drains separate from neighborhood sewers",
    "Make sure zero roof runoff or cooling blowdown enters older combined sewer lines downriver. When the river is high, those lines have nowhere left to go."
  ),
  discussion(
    "down-bridgework",
    "downstream",
    [42.2712, -83.19766],
    "conditional",
    "traffic",
    "construction",
    "meeting",
    "Coordinate utility crossings at the Allen Road bridge",
    "Allen Road is a main north-south artery. If fiber or water upgrades have to cross near the river bridge, bundle the work into one short window instead of digging twice."
  ),
  discussion(
    "down-meadow",
    "downstream",
    [42.27014, -83.19545],
    "supportive",
    "land",
    "planning",
    "workshop",
    "Plant a wet-meadow filter strip along the creek",
    "Replacing mowed turf near the lower river flats with native wet-meadow plants would soak up heavy rain, cool runoff, and support pollinators."
  ),
  discussion(
    "down-dewater",
    "downstream",
    [42.27155, -83.19636],
    "concerned",
    "water",
    "construction",
    "x",
    "Filter dewatering pumps before they hit the river",
    "Construction pumps left running overnight can scour stream banks and cloud the water for miles. Require sediment filter bags and flow diffusers at every discharge point."
  ),
  discussion(
    "down-traveltime",
    "downstream",
    [42.27093, -83.1949],
    "conditional",
    "water",
    "planning",
    "forum",
    "Map runoff travel time from the site to Allen Road",
    "Show how long it takes water from the parcel to reach the downstream bridge during a heavy storm, and how much detention storage slows that peak."
  ),
  discussion(
    "down-youthinterns",
    "downstream",
    [42.27157, -83.19711],
    "supportive",
    "benefits",
    "operation",
    "workshop",
    "Paid youth watershed monitoring internships",
    "Hiring local high school and college students each summer to sample water quality and map wildlife along the Ecorse River would pair transparency with real paid experience.",
    [
      reply("supportive", "Melvindale and Allen Park science teachers could help design the sampling curriculum.")
    ]
  ),
  discussion(
    "down-glycol",
    "downstream",
    [42.27151, -83.19838],
    "concerned",
    "water",
    "operation",
    "meeting",
    "Zero cooling additives in storm drains",
    "Closed-loop systems use corrosion inhibitors and glycol; evaporative towers use biocides. Verify in writing that all blowdown goes to approved sanitary treatment, never the storm outfall."
  ),
  discussion(
    "down-jointbriefing",
    "downstream",
    [42.27088, -83.19705],
    "conditional",
    "benefits",
    "planning",
    "meeting",
    "Host a joint Allen Park and Melvindale river briefing",
    "The Ecorse River crosses municipal lines right here, so downstream impacts do not stop at one city border. Hold one shared public briefing for both communities."
  ),
  discussion(
    "down-reflections",
    "downstream",
    [42.27224, -83.19741],
    "concerned",
    "noise",
    "operation",
    "x",
    "Avoid lighting reflections off the water at night",
    "Bright white LEDs near the river reflect across the water and disturb both wildlife and nearby windows. Use motion-dimmed, warm shielded lighting after dark."
  ),
  discussion(
    "down-permeable",
    "downstream",
    [42.27099, -83.19906],
    "supportive",
    "water",
    "planning",
    "reddit",
    "Use permeable paving on parking and access lanes",
    "Even if the main data hall roof is solid, building the employee parking lot and perimeter aprons with permeable pavers would capture the first inch of every rainstorm on site."
  ),
  discussion(
    "down-plaincalc",
    "downstream",
    [42.27112, -83.19588],
    "conditional",
    "water",
    "planning",
    "workshop",
    "Explain detention sizing in everyday terms",
    "Instead of only cubic-feet-per-second tables, tell residents how many inches of rain the retention basin holds before a single gallon leaves for the river."
  ),
  discussion(
    "down-bridgewalk",
    "downstream",
    [42.27208, -83.19828],
    "concerned",
    "traffic",
    "construction",
    "facebook",
    "Protect the narrow sidewalk across the river bridge",
    "Walking across the Allen Road creek bridge is already tight next to traffic. Keep heavy construction vehicles off that bridge whenever Enterprise Drive gives direct highway access."
  ),
  discussion(
    "down-eastculvert",
    "downstream",
    [42.27015, -83.19821],
    "conditional",
    "water",
    "planning",
    "forum",
    "Inspect culverts east of Allen Road too",
    "Water does not disappear once it passes Allen Road. Check whether downstream culverts can handle sustained detained releases after multi-day storms."
  ),
  discussion(
    "down-stewardfund",
    "downstream",
    [42.27219, -83.19566],
    "supportive",
    "benefits",
    "operation",
    "meeting",
    "Dedicate an annual river stewardship fund",
    "An annual contribution tied to facility operations could pay for bank stabilization, trash cleanups, and rain gardens across downstream neighborhoods."
  ),
  discussion(
    "down-mudhotline",
    "downstream",
    [42.27161, -83.19986],
    "conditional",
    "water",
    "construction",
    "x",
    "Fast hotline if creek water turns muddy",
    "If a storm blows out a silt fence on a Saturday afternoon, neighbors need a direct number that reaches a site superintendent within an hour, not a Monday voicemail."
  )
];

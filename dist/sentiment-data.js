// Fictional workshop and social-feed material authored for DataScope College Station.
// Stance is the viewpoint expressed in one sample message about a design or CUP choice.
// Replies stay with their opening message and are excluded from remark counts.
export const provenance =
  'Fictional College Station community-session and social-media examples with illustrative corridor pins, not collected participant locations or live platform posts. Each icon marks one opening remark; replies stay in its thread. Counts describe this sample only.';

export const stances = [
  { id: 'supportive', label: 'Supportive' },
  { id: 'conditional', label: 'Conditional' },
  { id: 'concerned', label: 'Concerned' }
];

export const topics = [
  { id: 'noise', label: 'Noise, hum & health' },
  { id: 'water', label: 'Simsboro aquifer & water' },
  { id: 'power', label: 'ERCOT grid & energy' },
  { id: 'land', label: 'Midtown vision & buffers' },
  { id: 'benefits', label: 'Jobs, taxes & benefits' },
  { id: 'governance', label: 'NDAs, CUP rules & trust' }
];

export const phases = [
  { id: 'planning', label: 'Pre-CUP scoping' },
  { id: 'construction', label: 'Construction' },
  { id: 'operation', label: 'Operation' }
];

export const streams = [
  { id: 'session', label: 'Hybrid engagement sessions', short: 'Sessions' },
  { id: 'social', label: 'Social media & local web', short: 'Social & web' }
];

export const channels = [
  { id: 'workshop', label: 'Pop-up / Living Lab', short: 'Workshop', stream: 'session' },
  { id: 'meeting', label: 'Council / CUP hearing', short: 'Hearing', stream: 'session' },
  { id: 'x', label: 'X / Twitter', short: 'X', stream: 'social' },
  { id: 'facebook', label: 'Facebook', short: 'Facebook', stream: 'social' },
  { id: 'reddit', label: 'Reddit', short: 'Reddit', stream: 'social' },
  { id: 'forum', label: 'Local web forum', short: 'Forum', stream: 'social' }
];

const streamFor = new Map(channels.map((c) => [c.id, c.stream]));

// Centers and pin coordinates identify approximate College Station corridors
// discussed, never a speaker's home or whereabouts.
export const zones = [
  {
    "id": "midtown",
    "name": "Midtown Business Park & Midtown Dr",
    "center": [
      30.5706,
      -96.2624
    ]
  },
  {
    "id": "langford",
    "name": "The Langford & Carroll Fancher Way",
    "center": [
      30.5718,
      -96.2692
    ]
  },
  {
    "id": "independence",
    "name": "Texas Independence Park & Rock Prairie Rd E",
    "center": [
      30.5786,
      -96.2628
    ]
  },
  {
    "id": "pebble-creek",
    "name": "Pebble Creek & Bridle Gate",
    "center": [
      30.5648,
      -96.2528
    ]
  },
  {
    "id": "school",
    "name": "Pebble Creek Elementary & Parkview Dr",
    "center": [
      30.5582,
      -96.2493
    ]
  },
  {
    "id": "medical",
    "name": "Baylor Scott & White Medical Corridor",
    "center": [
      30.5831,
      -96.279
    ]
  },
  {
    "id": "fitch",
    "name": "William D. Fitch Pkwy & Lick Creek",
    "center": [
      30.562,
      -96.2596
    ]
  },
  {
    "id": "tamu",
    "name": "TAMU Students, Renters & CSU Ratepayers",
    "center": [
      30.5758,
      -96.2784
    ]
  }
];

function reply(stance, text) {
  return { stance, text };
}

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
    "midtown-01",
    "midtown",
    [30.57075,-96.26192],
    "concerned",
    "governance",
    "planning",
    "meeting",
    "Publish MW load and water specs before any CUP hearing",
    "After ten months behind an NDA on Project Aggie, no developer should get a Midtown CUP docket without public peak MW, 105°F water draw, and tenant class up front.",
    [
      reply("conditional", "Put mandatory disclosure right in the UDO completeness checklist before staff schedules a public notice."),
      reply("supportive", "Open numbers let TAMU engineers check claims before Council votes.")
    ]
  ),
  discussion(
    "midtown-02",
    "midtown",
    [30.57078,-96.26311],
    "conditional",
    "land",
    "planning",
    "workshop",
    "Test the zigzag acoustic yard wall on the table",
    "If a smaller 20–30 MW facility applies inside Midtown Business Park, enclosing the chillers behind heavy zigzag sound-absorbing walls makes far more sense than an open yard.",
    [
      reply("concerned", "Show whether zigzag walls still block 60–120 Hz low-frequency hum or only higher fan pitch.")
    ]
  ),
  discussion(
    "midtown-03",
    "midtown",
    [30.56995,-96.26203],
    "supportive",
    "benefits",
    "planning",
    "workshop",
    "Pair a compact Midtown plaza with Texas Independence Park",
    "Option D4 turns a blank industrial wall into shaded community rooms, retail, and a trail tie-in toward Texas Independence Park. That keeps Midtown walkable.",
    [
      reply("conditional", "Only if the developer funds the civic buildings up front instead of promising phase-two retail later.")
    ]
  ),
  discussion(
    "midtown-04",
    "midtown",
    [30.57145,-96.26198],
    "concerned",
    "benefits",
    "planning",
    "facebook",
    "Count permanent jobs per acre honestly",
    "Even the $700M RELLIS data center targets roughly 100 jobs by 2038. Compare 35 permanent tech roles against what \"The Station\" sports complex and retail bring to Midtown.",
    [
      reply("supportive", "Separating construction job-years from permanent FTEs on the dashboard stops apples-to-oranges claims.")
    ]
  ),
  discussion(
    "midtown-05",
    "midtown",
    [30.57005,-96.26359],
    "conditional",
    "water",
    "operation",
    "workshop",
    "Mandate reclaimed purple-pipe water for summer trim",
    "I could consider a Midtown CUP only if potable Simsboro Aquifer water is capped near zero and any 105°F cooling trim uses city reclaimed effluent.",
    [
      reply("concerned", "Confirm College Station has enough reclaimed capacity during multi-year Brazos Valley droughts.")
    ]
  ),
  discussion(
    "midtown-06",
    "midtown",
    [30.57044,-96.26099],
    "concerned",
    "power",
    "planning",
    "meeting",
    "Who pays when a substation upgrade gets built?",
    "CSU residential customers cannot subsidize feeders or transformers for out-of-town compute operators. Put full self-funding and decommissioning bonds in the CUP.",
    [
      reply("conditional", "Brazos County required ThisWay Global at RELLIS to self-fund electric gear—College Station should match or beat that.")
    ]
  ),
  discussion(
    "midtown-07",
    "midtown",
    [30.57151,-96.26323],
    "supportive",
    "benefits",
    "operation",
    "x",
    "City fractional equity with a guaranteed floor",
    "If a data center uses Midtown infrastructure, giving College Station a fractional revenue share plus a hard payment floor protects taxpayers if AI demand shifts."
  ),
  discussion(
    "midtown-08",
    "midtown",
    [30.56934,-96.26272],
    "concerned",
    "governance",
    "operation",
    "reddit",
    "Bankruptcy proved models are not contracts",
    "The RELLIS facility went through bankruptcy before opening. What happens to our acoustic berms, water caps, and benefit promises if an LLC flips the building?"
  ),
  discussion(
    "midtown-09",
    "midtown",
    [30.57153,-96.26094],
    "conditional",
    "noise",
    "planning",
    "workshop",
    "Rotate the mechanical yard toward SH 6 traffic",
    "Turning the building so the 10.6 m main hall screens The Langford and Pebble Creek drops modeled sound several decibels—let us test that alongside berms."
  ),
  discussion(
    "midtown-10",
    "midtown",
    [30.57056,-96.26431],
    "supportive",
    "power",
    "planning",
    "forum",
    "Off-site Texas solar matching keeps net grid demand flat",
    "Requiring 100% annual GWh matching from new Texas solar or wind stops a CUP facility from tightening ERCOT margins, though we should see where those 960 acres sit."
  ),
  discussion(
    "midtown-11",
    "midtown",
    [30.56963,-96.26106],
    "concerned",
    "land",
    "construction",
    "facebook",
    "Midtown Drive construction staging and mud",
    "Hundreds of concrete mixers rolling off SH 6 onto Midtown Drive during the 2027–2029 Rock Prairie rebuild will snarl every business and clinic nearby."
  ),
  discussion(
    "midtown-12",
    "midtown",
    [30.57214,-96.26237],
    "conditional",
    "water",
    "operation",
    "meeting",
    "Continuous public telemetry on water and power",
    "Require live monthly meter feeds to the city and BVGCD so nobody overrides closed-loop cooling into evaporative mode during a 105°F July heatwave."
  ),
  discussion(
    "midtown-13",
    "midtown",
    [30.56929,-96.26391],
    "supportive",
    "benefits",
    "construction",
    "workshop",
    "Unbundle bid packages for Brazos Valley contractors",
    "Breaking mechanical, concrete, and fiber scopes into local bid lots lets Bryan–College Station trades compete instead of flying in out-of-state crews."
  ),
  discussion(
    "midtown-14",
    "midtown",
    [30.57094,-96.26012],
    "concerned",
    "power",
    "operation",
    "x",
    "On-site microreactors need a much wider public debate",
    "Six 5 MWe microreactors solve ERCOT draw on paper, yet putting nuclear units in Midtown next to homes and a hospital would trigger massive opposition."
  ),
  discussion(
    "midtown-15",
    "midtown",
    [30.57149,-96.26426],
    "conditional",
    "land",
    "planning",
    "workshop",
    "Keep No-Build / Midtown Mixed-Use on every workshop screen",
    "If \"walkable Midtown retail and park\" stays side by side with data-center packages, residents can debate fiscal trade-offs without feeling steered into yes."
  ),
  discussion(
    "midtown-16",
    "midtown",
    [30.56888,-96.26201],
    "concerned",
    "noise",
    "operation",
    "forum",
    "Diesel backup generator tests on Midtown Drive",
    "Where do exhaust plumes and 100 dB generator runs go during an ERCOT grid watch? Put acoustic enclosures and wind-direction checks on the generators too."
  ),
  discussion(
    "midtown-17",
    "midtown",
    [30.57227,-96.26101],
    "supportive",
    "benefits",
    "planning",
    "meeting",
    "Host the simulation table neutrally at Texas A&M",
    "Running DataScope through Texas A&M and BVCOG rather than a developer consultant gives residents confidence the assumptions are actually scrutinized."
  ),
  discussion(
    "midtown-18",
    "midtown",
    [30.56989,-96.26492],
    "conditional",
    "water",
    "planning",
    "reddit",
    "Heat recovery only works with a real customer",
    "T4 waste-heat recovery sounds great, but in a hot Texas climate you need an aquatics center, medical laundry, or industrial hot-water customer signed up first."
  ),
  discussion(
    "midtown-19",
    "midtown",
    [30.56991,-96.26005],
    "concerned",
    "governance",
    "planning",
    "x",
    "State tax exemptions drain local leverage",
    "Texas gives data centers over $1B/yr in electricity sales-tax breaks. Local CUP benefits help, yet the 2027 Legislature still needs to fix the state subsidy."
  ),
  discussion(
    "midtown-20",
    "midtown",
    [30.5724,-96.2633],
    "supportive",
    "land",
    "planning",
    "workshop",
    "Earthen berms with native post-oak belts fit the corridor",
    "D2 landscaped berms hide ground-level transformers and use drought-tolerant Central Texas trees instead of thirsty turfgrass."
  ),
  discussion(
    "midtown-21",
    "midtown",
    [30.56861,-96.26351],
    "conditional",
    "benefits",
    "planning",
    "meeting",
    "Audit the $10M upfront community endowment",
    "An independent board with resident seats should oversee any community grant fund—and publish guaranteed floors separately from projected revenue."
  ),
  discussion(
    "midtown-22",
    "midtown",
    [30.57172,-96.25978],
    "concerned",
    "power",
    "planning",
    "facebook",
    "345 kV lines and private-land eminent domain",
    "Even a smaller Midtown cluster raises fears that regional transmission upgrades will cut across ranchland and residential edges outside city limits."
  ),
  discussion(
    "midtown-23",
    "midtown",
    [30.571,-96.26519],
    "supportive",
    "noise",
    "planning",
    "workshop",
    "Compare dry-cooling fan noise against water savings directly",
    "Seeing that T2 saves 98% of Simsboro water while adding ~3.5 dB of peak fan sound explains why you have to pair dry cooling with D3 acoustic walls."
  ),
  discussion(
    "midtown-24",
    "midtown",
    [30.56883,-96.26093],
    "conditional",
    "governance",
    "planning",
    "forum",
    "Give residents at least 45 days before Council votes",
    "Three or four days notice before the Sept. 2025 Midtown hearing destroyed trust. Build a 45-day open DataScope scoping window into every CUP review."
  ),
  discussion(
    "midtown-25",
    "midtown",
    [30.57285,-96.26169],
    "concerned",
    "land",
    "operation",
    "reddit",
    "Impervious concrete runoff into Lick Creek",
    "Covering 10–14 acres of Midtown savannah with concrete pads and rooftops pushes flash-flood runoff east unless detention ponds are oversized for Texas storms."
  ),
  discussion(
    "midtown-26",
    "midtown",
    [30.56906,-96.26499],
    "supportive",
    "benefits",
    "construction",
    "x",
    "Paid apprenticeships with Blinn and Texas A&M",
    "B4 paid training in high-voltage controls and liquid cooling gives local young adults durable careers across Texas, not just one building."
  ),
  discussion(
    "midtown-27",
    "midtown",
    [30.57058,-96.25924],
    "conditional",
    "power",
    "operation",
    "workshop",
    "Battery storage for ERCOT four-coincident-peak hours",
    "Pair any Midtown facility with on-site batteries and binding curtailment during ERCOT summer peaks so CSU avoids spiking transmission charges."
  ),
  discussion(
    "midtown-28",
    "midtown",
    [30.57223,-96.26446],
    "concerned",
    "governance",
    "planning",
    "meeting",
    "Do not use a 30 MW footprint to hide phased 300 MW expansion",
    "Cap total site MW and substation buildout inside the CUP so a modest first phase cannot quietly multiply into another Project Aggie without a new public vote."
  ),
  discussion(
    "langford-01",
    "langford",
    [30.57162,-96.26958],
    "concerned",
    "noise",
    "operation",
    "meeting",
    "Constant low-frequency hum reaches senior apartments at night",
    "Residents at The Langford keep windows cracked on mild evenings along Carroll Fancher Way. A 24/7 60–120 Hz transformer hum cannot be brushed off as \"like a small office.\"",
    [
      reply("conditional", "Require certified dBC spectral testing at the Langford property line before any certificate of occupancy is issued."),
      reply("concerned", "A-weighted dBA models miss the exact bass rumble that vibrates bedroom walls.")
    ]
  ),
  discussion(
    "langford-02",
    "langford",
    [30.57169,-96.26859],
    "concerned",
    "noise",
    "planning",
    "facebook",
    "EMF and cardiac-device worries for assisted-living residents",
    "Families of seniors with implanted defibrillators raised genuine health anxieties during the Midtown hearing. A map setback alone does not answer medical safety questions.",
    [
      reply("conditional", "Bring independent biomedical and electrical engineers to an on-site Langford Q&A—not a developer PR rep.")
    ]
  ),
  discussion(
    "langford-03",
    "langford",
    [30.57243,-96.26887],
    "conditional",
    "benefits",
    "planning",
    "workshop",
    "Fund acoustic window retrofits and bill relief at The Langford",
    "If any industrial facility is ever sited east of Midtown Drive, B3 household protection should explicitly cover senior-living units and neighboring rentals, not only single-family owners."
  ),
  discussion(
    "langford-04",
    "langford",
    [30.57098,-96.26948],
    "concerned",
    "land",
    "construction",
    "meeting",
    "Ambulance and visitor access along Carroll Fancher Way",
    "Emergency vehicles serving The Langford cannot get boxed in by oversized transformer haulers or contractor queues spilling off Midtown Drive."
  ),
  discussion(
    "langford-05",
    "langford",
    [30.57243,-96.27005],
    "conditional",
    "noise",
    "planning",
    "workshop",
    "Check shielding when the yard faces away from Carroll Fancher",
    "In the baseline D1 orientation, the west mechanical yard stares right at The Langford. Flipping the hall 180° and adding D3 zigzag walls drops modeled sound sharply."
  ),
  discussion(
    "langford-06",
    "langford",
    [30.57182,-96.27039],
    "supportive",
    "benefits",
    "planning",
    "workshop",
    "Hold daytime pop-up sessions inside The Langford",
    "Many older residents will not sit through a six-hour City Hall meeting past midnight. Bringing large-print maps and the tabletop here widens participation."
  ),
  discussion(
    "langford-07",
    "langford",
    [30.57126,-96.27024],
    "concerned",
    "noise",
    "operation",
    "x",
    "Diesel exhaust during winter outages",
    "After Winter Storm Uri, everyone knows generators run for days when ERCOT fails. Diesel particulates drifting west toward assisted-living intakes is a health red line."
  ),
  discussion(
    "langford-08",
    "langford",
    [30.57255,-96.26809],
    "conditional",
    "land",
    "planning",
    "forum",
    "Keep wooded buffers intact between Midtown Drive and the site",
    "Post-oak trees do not block bass frequencies, yet preserving a green screen and berm along Midtown Drive softens glare and heat-island views from upper-floor suites."
  ),
  discussion(
    "langford-09",
    "langford",
    [30.57048,-96.26915],
    "concerned",
    "water",
    "operation",
    "facebook",
    "Seniors on fixed incomes cannot absorb CSU water or power hikes",
    "If industrial loads force new Simsboro wells or CSU rate tiers, retirees at The Langford feel every dollar on their monthly utility bills."
  ),
  discussion(
    "langford-10",
    "langford",
    [30.57097,-96.2683],
    "supportive",
    "land",
    "planning",
    "workshop",
    "Walkable Midtown cafés and shaded benches benefit residents",
    "The D4 civic district or the No-Build Midtown park plan gives seniors and visiting families safe, shaded places to walk instead of staring at security fencing."
  ),
  discussion(
    "langford-11",
    "langford",
    [30.5731,-96.26907],
    "concerned",
    "governance",
    "planning",
    "meeting",
    "Who enforces noise limits at 2 a.m. on a Sunday?",
    "A modeling table is helpful for scoping, yet we need a real-time city noise monitor at Carroll Fancher Way with automatic fines or curtailment if dBC limits are breached."
  ),
  discussion(
    "langford-12",
    "langford",
    [30.57071,-96.27039],
    "conditional",
    "benefits",
    "operation",
    "workshop",
    "Direct part of a community endowment to senior health & transit",
    "If B1 endowment grants include Brazos Valley senior mobility vans and wellness programs, nearby residents see tangible civic value rather than abstract tax tables."
  ),
  discussion(
    "langford-13",
    "langford",
    [30.57206,-96.26751],
    "concerned",
    "noise",
    "construction",
    "reddit",
    "Pile driving and daytime rest hours",
    "Eighteen months of heavy grading, backup beepers, and crane work directly across Midtown Drive disrupts daytime medical care and quiet hours for older adults."
  ),
  discussion(
    "langford-14",
    "langford",
    [30.57129,-96.27107],
    "supportive",
    "water",
    "planning",
    "workshop",
    "Reclaimed water beats evaporative Simsboro draw",
    "Comparing T1 evaporative towers against T3 reclaimed-water hybrid cooling makes the aquifer savings unmistakable without cranking dry-cooler fans to maximum volume."
  ),
  discussion(
    "langford-15",
    "langford",
    [30.57114,-96.26758],
    "concerned",
    "land",
    "operation",
    "x",
    "Nighttime security floodlights across Midtown Drive",
    "Bright LED perimeter aprons on a 24/7 facility shine straight into east-facing senior apartments unless dark-sky shielding and low bollards are required in the CUP."
  ),
  discussion(
    "langford-16",
    "langford",
    [30.57321,-96.26806],
    "conditional",
    "noise",
    "planning",
    "meeting",
    "Publish independent acoustic peer review before approval",
    "The CityScope noise contour is fine for early screening, provided the city requires a third-party acoustic firm to verify 63 Hz and 125 Hz octave bands."
  ),
  discussion(
    "langford-17",
    "langford",
    [30.57014,-96.27021],
    "concerned",
    "governance",
    "planning",
    "facebook",
    "Do not treat seniors as an afterthought",
    "Project Aggie’s notice arrived days before the Council meeting. Sensitive campuses like The Langford deserve mandatory mailed notice 60 days ahead of any CUP hearing."
  ),
  discussion(
    "langford-18",
    "langford",
    [30.57267,-96.26716],
    "supportive",
    "benefits",
    "planning",
    "forum",
    "Independent assessment for household protection eligibility",
    "Tying B3 assistance to measured acoustic and thermal exposure rather than arbitrary street lines keeps neighborhood support fair."
  ),
  discussion(
    "langford-19",
    "langford",
    [30.57336,-96.26974],
    "concerned",
    "power",
    "operation",
    "meeting",
    "Reliability for medical oxygen and home health devices",
    "Any 30 MW or 600 MW industrial load tying into College Station Utilities must prove zero voltage sag or reliability loss for nearby medical and senior facilities."
  ),
  discussion(
    "langford-20",
    "langford",
    [30.57022,-96.26829],
    "conditional",
    "land",
    "planning",
    "workshop",
    "Compare D2 berms against a strict 1,500 ft sensitive-use buffer",
    "Use the map overview to test whether any Business Park parcel sits more than 1,500 ft from schools, hospitals, and senior living before approving Midtown."
  ),
  discussion(
    "langford-21",
    "langford",
    [30.57373,-96.26845],
    "concerned",
    "noise",
    "operation",
    "reddit",
    "Summer 105°F nights are when cooling fans peak",
    "Average annual sound numbers hide what happens at 10 p.m. in August when dry coolers stay at 100% speed after a 105°F afternoon."
  ),
  discussion(
    "langford-22",
    "langford",
    [30.57219,-96.27125],
    "supportive",
    "governance",
    "planning",
    "workshop",
    "Online and in-person input together",
    "Pairing this open web map with small facilitated sessions lets adult children of Langford residents weigh in alongside neighbors in the room."
  ),
  discussion(
    "langford-23",
    "langford",
    [30.57167,-96.26684],
    "concerned",
    "land",
    "planning",
    "x",
    "Heat-island exhaust plumes from dry coolers",
    "Blowing 30+ MW of hot exhaust air across paved aprons during Texas summers raises local nighttime temperatures right next to senior walkways."
  ),
  discussion(
    "langford-24",
    "langford",
    [30.57331,-96.27058],
    "conditional",
    "benefits",
    "operation",
    "meeting",
    "Publish annual audited benefit reports",
    "If a community trust or protection program is funded, post every dollar spent and every home retrofit completed on a public city portal."
  ),
  discussion(
    "langford-25",
    "langford",
    [30.57051,-96.27124],
    "concerned",
    "water",
    "planning",
    "forum",
    "Aquifer security matters for the next 40 years",
    "Our grandchildren are growing up in Brazos County. Once Simsboro head levels drop from regional pumping, a short-term corporate lease does not put the water back."
  ),
  discussion(
    "langford-26",
    "langford",
    [30.57344,-96.26718],
    "supportive",
    "noise",
    "planning",
    "workshop",
    "Zigzag walls visually show real engineering mitigation",
    "Inspecting the D3 baffle wall in 3D makes it much easier to understand how engineers break line-of-sight sound paths compared with reading a 200-page PDF."
  ),
  discussion(
    "langford-27",
    "langford",
    [30.57155,-96.27183],
    "conditional",
    "power",
    "planning",
    "meeting",
    "Self-funded microgrid backup could help local resilience",
    "If energy-integrated packages ever included community-accessible resilience hubs or feeder upgrades paid by the developer, that would be worth examining carefully."
  ),
  discussion(
    "langford-28",
    "langford",
    [30.5697,-96.26951],
    "concerned",
    "governance",
    "operation",
    "facebook",
    "Non-binding workshop slides cannot replace CUP law",
    "Make sure every slider or toggle someone likes on this platform translates word-for-word into enforceable Conditional Use Permit conditions."
  ),
  discussion(
    "independence-01",
    "independence",
    [30.57886,-96.26311],
    "concerned",
    "land",
    "planning",
    "meeting",
    "Midtown was promised a walkable park district, not walled servers",
    "Residents backed Texas Independence Park, greenbelts, retail, and \"The Station\" sports complex along Rock Prairie Rd E. Replacing that vision with windowless concrete halls breaks faith.",
    [
      reply("supportive", "Putting the No-Build Midtown Alternative right next to D1–D4 lets everyone compare 420 walkable jobs vs. 32 industrial jobs."),
      reply("conditional", "If a data center ever enters Midtown, D4 has to deliver actual trails, cafés, and civic space on day one.")
    ]
  ),
  discussion(
    "independence-02",
    "independence",
    [30.57816,-96.26295],
    "concerned",
    "land",
    "construction",
    "facebook",
    "Heavy trucks colliding with the 2027–2029 Rock Prairie Rd E rebuild",
    "Rock Prairie Road East is already facing a multi-year widening and rebuild. Dumping heavy concrete and transformer hauls into that corridor will paralyze east College Station.",
    [
      reply("conditional", "Route all CUP construction deliveries exclusively from SH 6 / Midtown Drive with banned turns onto Rock Prairie Rd E.")
    ]
  ),
  discussion(
    "independence-03",
    "independence",
    [30.5789,-96.26189],
    "supportive",
    "land",
    "planning",
    "workshop",
    "Keep Texas Independence Park trails quiet and shaded",
    "Using the 3D neighborhood view shows how quickly a tall blank wall intrudes on park sightlines unless wide vegetated setbacks and berms are kept along the northern edge."
  ),
  discussion(
    "independence-04",
    "independence",
    [30.57873,-96.26415],
    "conditional",
    "water",
    "planning",
    "workshop",
    "Tie stormwater detention into park greenbelts safely",
    "Any impervious pad south of Texas Independence Park should include native-planted detention basins so 100-year Texas storms do not scour Lick Creek trails."
  ),
  discussion(
    "independence-05",
    "independence",
    [30.57797,-96.26176],
    "concerned",
    "noise",
    "operation",
    "x",
    "Outdoor youth sports and evening concerts at the park",
    "Families come to Texas Independence Park and the planned sports complex for fresh air and ball games—not steady chiller fan roar drifting across the fields."
  ),
  discussion(
    "independence-06",
    "independence",
    [30.57945,-96.26281],
    "supportive",
    "benefits",
    "planning",
    "workshop",
    "Waste heat could warm a year-round Midtown aquatics pavilion",
    "Pairing T4 heat recovery with a D4 community aquatics or recreation center beside Texas Independence Park is the one concept that actually creates a daily amenity."
  ),
  discussion(
    "independence-07",
    "independence",
    [30.57799,-96.26403],
    "concerned",
    "benefits",
    "planning",
    "reddit",
    "Property tax relief vs. college-town identity",
    "Yes, the FY27 tax rate vote was tight, but no simulation can tell College Station whether saving a bit on property taxes is worth industrializing Midtown."
  ),
  discussion(
    "independence-08",
    "independence",
    [30.57858,-96.26085],
    "conditional",
    "land",
    "planning",
    "meeting",
    "Set a hard north-edge setback from Texas Independence Park",
    "Before approving any Business Park CUP, draw a non-negotiable park exclusion buffer so mechanical yards and substations stay far south of the trailhead."
  ),
  discussion(
    "independence-09",
    "independence",
    [30.57933,-96.26446],
    "concerned",
    "land",
    "operation",
    "forum",
    "Loss of wooded post-oak buffers and wildlife corridor",
    "The savannah and creek woods between Rock Prairie Rd E and Fitch support deer, hawks, and migratory songbirds linking into Lick Creek Park."
  ),
  discussion(
    "independence-10",
    "independence",
    [30.57748,-96.26241],
    "supportive",
    "governance",
    "planning",
    "workshop",
    "Build on the Parks Master Plan pop-up outreach model",
    "College Station got huge turnout during its 2025–2026 Parks Master Plan pop-ups. Putting DataScope at park events reaches families who never attend Tuesday night hearings."
  ),
  discussion(
    "independence-11",
    "independence",
    [30.57952,-96.26157],
    "concerned",
    "water",
    "planning",
    "facebook",
    "Closed-loop promises need proof during 105°F drought summers",
    "When Bryan–College Station is already fighting Georgetown’s aquifer export pipeline, residents will not accept verbal assurances on cooling water without metered caps."
  ),
  discussion(
    "independence-12",
    "independence",
    [30.57841,-96.26513],
    "conditional",
    "benefits",
    "operation",
    "workshop",
    "Fund Lick Creek & Independence Park trail maintenance via B1",
    "Dedicating part of a B1 community endowment to permanent trail upkeep, shade pavilions, and youth sports scholarships ties project revenue directly to Midtown life."
  ),
  discussion(
    "independence-13",
    "independence",
    [30.57789,-96.26056],
    "concerned",
    "noise",
    "operation",
    "meeting",
    "Test sound at the southern park trailhead on calm mornings",
    "Early-morning walkers hear every highway and transformer drone when wind dies down. Put a permanent acoustic monitoring point on the park’s southern boundary."
  ),
  discussion(
    "independence-14",
    "independence",
    [30.57989,-96.26371],
    "supportive",
    "power",
    "planning",
    "x",
    "Remote solar matching beats straining local feeders",
    "If a developer builds 1.5 sq mi of off-site Texas solar to match 220 GWh/yr, at least the project adds new generation capacity instead of freeloading on ERCOT."
  ),
  discussion(
    "independence-15",
    "independence",
    [30.57739,-96.26382],
    "concerned",
    "land",
    "planning",
    "reddit",
    "Bass Pro, Corinth retail, and The Station fit Midtown better",
    "Since Council rejected Project Aggie, retail and sports-tourism commitments returned quickly. Keep Midtown for people-serving uses and move heavy compute out to outer SH 6 / Hwy 47."
  ),
  discussion(
    "independence-16",
    "independence",
    [30.57906,-96.26027],
    "conditional",
    "land",
    "construction",
    "workshop",
    "Protect park sidewalks during utility trenching",
    "If fiber ducts or purple-pipe reclaimed lines run along Rock Prairie Rd E, require directional boring and full trail restoration within 30 days."
  ),
  discussion(
    "independence-17",
    "independence",
    [30.57919,-96.26556],
    "concerned",
    "governance",
    "planning",
    "facebook",
    "Clear out-of-town capital vs. local community priorities",
    "People felt blindsided when a $4B deal landed with three days notice. Letting residents toggle the No-Build Midtown Alternative first keeps the process honest."
  ),
  discussion(
    "independence-18",
    "independence",
    [30.57722,-96.2613],
    "supportive",
    "land",
    "planning",
    "meeting",
    "Compare impervious runoff across scenarios side by side",
    "Evaluating D1–D4 alongside the Midtown park/sports alternative makes stormwater, jobs per acre, and traffic trade-offs transparent on the same screen."
  ),
  discussion(
    "independence-19",
    "independence",
    [30.58007,-96.26216],
    "concerned",
    "noise",
    "planning",
    "forum",
    "Do not understate rooftop cooling noise from elevated fans",
    "Earth berms help block ground-level yards, yet rooftop dry coolers sit 17 meters up and still radiate over low trees toward Texas Independence Park."
  ),
  discussion(
    "independence-20",
    "independence",
    [30.57783,-96.26536],
    "conditional",
    "benefits",
    "planning",
    "workshop",
    "Community benefit pool must sit on top of city taxes",
    "Make sure the $10M upfront + $0.5M/yr benefit pool is legally separate from property tax abatement giveaways—no robbing Peter to pay Paul."
  ),
  discussion(
    "independence-21",
    "independence",
    [30.57822,-96.25961],
    "concerned",
    "power",
    "planning",
    "x",
    "Keep high-voltage substations out of park viewsheds",
    "Two 300 MW substations in Project Aggie would have looked like a power plant next to Midtown parks. Even a single 30 MW switchyard needs architectural screening."
  ),
  discussion(
    "independence-22",
    "independence",
    [30.57999,-96.26493],
    "supportive",
    "water",
    "planning",
    "workshop",
    "Reclaimed water line along Rock Prairie is worth studying",
    "Extending College Station’s non-potable reclaimed water line could irrigate park athletic fields while serving industrial cooling without touching the Simsboro Aquifer."
  ),
  discussion(
    "independence-23",
    "independence",
    [30.57691,-96.26293],
    "concerned",
    "land",
    "construction",
    "meeting",
    "Construction dust blowing onto park playgrounds",
    "Dry Brazos Valley clay kicks up massive dust clouds during earthwork. Require daily non-potable dust suppression and stabilized rock entrances."
  ),
  discussion(
    "independence-24",
    "independence",
    [30.5797,-96.26038],
    "conditional",
    "governance",
    "planning",
    "reddit",
    "Screen every UDO-eligible industrial tract citywide first",
    "Run a FindingPlaces-style parcel screen across all Business Park and Heavy Industrial zones in College Station before letting any applicant pick Midtown by default."
  ),
  discussion(
    "independence-25",
    "independence",
    [30.57871,-96.26631],
    "concerned",
    "benefits",
    "operation",
    "facebook",
    "Do not double-count temporary construction workers",
    "Press releases always tout hundreds of jobs, then 90% leave when the slab is poured. Keeping construction job-years separate from permanent FTEs is overdue."
  ),
  discussion(
    "independence-26",
    "independence",
    [30.57729,-96.26004],
    "supportive",
    "land",
    "planning",
    "workshop",
    "D4 compact district bridges industrial and civic needs",
    "Adding 4.5 acres of shaded civic plaza and trail connections shows how a smaller facility might coexist if Council ever approves a CUP along the corridor."
  ),
  discussion(
    "independence-27",
    "independence",
    [30.58046,-96.2633],
    "concerned",
    "power",
    "operation",
    "forum",
    "Microreactors next to a 149-acre family park is a non-starter",
    "Even with new NRC site-boundary rules, proposing small nuclear reactors across the fence from Texas Independence Park will unify the entire city against the project."
  ),
  discussion(
    "independence-28",
    "independence",
    [30.57717,-96.26491],
    "conditional",
    "noise",
    "operation",
    "meeting",
    "Publish quarterly noise and water compliance scorecards",
    "Tie CUP renewal and any economic incentives to verified acoustic and Simsboro water compliance posted publicly every quarter."
  ),
  discussion(
    "pebble-creek-01",
    "pebble-creek",
    [30.56491,-96.25332],
    "concerned",
    "noise",
    "operation",
    "meeting",
    "Protect Pebble Creek tranquility from 24/7 mechanical hum",
    "Pebble Creek and Bridle Gate homeowners turned out by the thousands because relentless chiller and transformer hum travels straight across open creek corridors at night.",
    [
      reply("conditional", "Check how the 10.6 m building and D3 zigzag walls change sound levels toward Pebble Creek—then verify with an independent dBC engineer."),
      reply("concerned", "5–10 dB modeling error is the difference between quiet backyard evenings and listening to an industrial hum all night.")
    ]
  ),
  discussion(
    "pebble-creek-02",
    "pebble-creek",
    [30.56432,-96.25224],
    "concerned",
    "land",
    "planning",
    "facebook",
    "Home-value stigma near industrial compute infrastructure",
    "Families invested their life savings in Pebble Creek and Bridle Gate expecting residential buffers and parks—not utility-scale substations across William D. Fitch Parkway.",
    [
      reply("conditional", "B3 household protection includes defined property-value protection and retrofits, though many neighbors still prefer zero industrial siting near homes.")
    ]
  ),
  discussion(
    "pebble-creek-03",
    "pebble-creek",
    [30.56548,-96.25279],
    "concerned",
    "water",
    "planning",
    "meeting",
    "Simsboro Aquifer caps leave zero margin for industrial waste",
    "College Station depends on the Simsboro Sand for 98% of its drinking water under a 22,626 acre-ft/yr permit while fighting regional export pipelines. Protect our groundwater first."
  ),
  discussion(
    "pebble-creek-04",
    "pebble-creek",
    [30.56434,-96.25364],
    "conditional",
    "noise",
    "planning",
    "workshop",
    "Show worst-case southeast wind propagation",
    "Prevailing southeast Gulf breezes blow one way, but cold fronts push sound straight from Midtown into Pebble Creek. Model both wind directions before approving any CUP."
  ),
  discussion(
    "pebble-creek-05",
    "pebble-creek",
    [30.56467,-96.2514],
    "concerned",
    "governance",
    "planning",
    "x",
    "The Nov. 2026 election sent an unmistakable mandate",
    "Mayor-elect Bob Yancy won nearly 60% running on stopping the Midtown data center and protecting Pebble Creek. Any CUP process must put neighborhood consent first."
  ),
  discussion(
    "pebble-creek-06",
    "pebble-creek",
    [30.56559,-96.25402],
    "conditional",
    "power",
    "planning",
    "workshop",
    "Only consider industrial tracts out by SH 6 / Hwy 47 or RELLIS",
    "If Brazos Valley wants AI compute, consolidate it in heavy industrial zones away from residential subdivisions like Pebble Creek, Bridle Gate, and Midtown Reserve."
  ),
  discussion(
    "pebble-creek-07",
    "pebble-creek",
    [30.56369,-96.25252],
    "concerned",
    "power",
    "operation",
    "facebook",
    "ERCOT grid strain and Winter Storm Uri memories",
    "Adding 30 MW—let alone 600 MW—to College Station Utilities raises real fears of rolling outages and higher residential electric bills during Texas heat domes and freezes."
  ),
  discussion(
    "pebble-creek-08",
    "pebble-creek",
    [30.56563,-96.25183],
    "conditional",
    "benefits",
    "planning",
    "workshop",
    "Household protection needs clear geographic triggers",
    "If B3 retrofits or electric bill credits are offered to Pebble Creek and Bridle Gate edges, publish the exact eligibility contour based on independent acoustic measurements."
  ),
  discussion(
    "pebble-creek-09",
    "pebble-creek",
    [30.56476,-96.25465],
    "concerned",
    "land",
    "construction",
    "reddit",
    "Cut-through truck traffic on Pebble Creek Parkway",
    "GPS apps send delivery trucks straight down William D. Fitch and Pebble Creek Parkway whenever SH 6 backs up. Enforce geofenced truck routes in the CUP."
  ),
  discussion(
    "pebble-creek-10",
    "pebble-creek",
    [30.56393,-96.25101],
    "supportive",
    "water",
    "planning",
    "workshop",
    "Closed-loop T2 drops Simsboro draw to 0.015% of city cap",
    "Seeing the actual Simsboro percentage (0.93% for evaporative towers vs. 0.015% for dry cooling) grounds the water debate in real BVGCD numbers instead of guesswork."
  ),
  discussion(
    "pebble-creek-11",
    "pebble-creek",
    [30.5662,-96.25352],
    "concerned",
    "noise",
    "operation",
    "forum",
    "Dry cooling trades water for louder rooftop fans",
    "The live readout makes the trade-off obvious: cutting water 98% raises peak sound 3.5 dB unless heavy acoustic baffling is required at the same time."
  ),
  discussion(
    "pebble-creek-12",
    "pebble-creek",
    [30.56361,-96.25366],
    "conditional",
    "governance",
    "operation",
    "meeting",
    "Automatic curtailment clauses when drought stages hit",
    "Bind any CUP operator to mandatory cooling-water curtailment matching resident Stage 2–4 drought restrictions so homeowners are not watering less while servers evaporate millions of gallons."
  ),
  discussion(
    "pebble-creek-13",
    "pebble-creek",
    [30.56511,-96.2507],
    "concerned",
    "power",
    "planning",
    "x",
    "Regional whack-a-mole with RELLIS and Grimes County",
    "Stopping Project Aggie here did not stop the 73 MW RELLIS plant in Bryan or SpaceX Terafab in Grimes County. We still share one ERCOT grid and one Simsboro aquifer."
  ),
  discussion(
    "pebble-creek-14",
    "pebble-creek",
    [30.56561,-96.25509],
    "supportive",
    "governance",
    "planning",
    "workshop",
    "Transparent pre-application scoping beats ambush votes",
    "Nobody wants another six-hour midnight council fight with 5,000 angry signatures. Putting real trade-offs on an open platform months ahead of a CUP is far healthier."
  ),
  discussion(
    "pebble-creek-15",
    "pebble-creek",
    [30.56322,-96.25157],
    "concerned",
    "land",
    "operation",
    "facebook",
    "Light pollution glowing over Lick Creek woods",
    "From Bridle Gate backyards you can see dark skies over the creek valley. Require full-cutoff downward fixtures and shielded perimeter security lights."
  ),
  discussion(
    "pebble-creek-16",
    "pebble-creek",
    [30.56634,-96.25223],
    "conditional",
    "benefits",
    "planning",
    "meeting",
    "Use B2 city revenue share to directly offset property taxes",
    "If the city ever approves a small CUP data center on an appropriate industrial parcel, dedicate fractional equity proceeds to residential property tax relief."
  ),
  discussion(
    "pebble-creek-17",
    "pebble-creek",
    [30.56415,-96.25498],
    "concerned",
    "water",
    "operation",
    "reddit",
    "What happens when rack power densities double in 5 years?",
    "AI servers double heat density every generation. Without binding CUP telemetry and clawbacks, operators will be tempted to retrofit evaporative sprayers during 105°F summers."
  ),
  discussion(
    "pebble-creek-18",
    "pebble-creek",
    [30.56416,-96.25009],
    "supportive",
    "land",
    "planning",
    "workshop",
    "Comparing No-Build Midtown side by side clarifies values",
    "Keeping Texas Independence Park and walkable Midtown retail on the board makes it clear this is a community vision choice, not just an engineering puzzle."
  ),
  discussion(
    "pebble-creek-19",
    "pebble-creek",
    [30.56646,-96.2546],
    "concerned",
    "noise",
    "operation",
    "meeting",
    "Backup generator testing schedules on weekends",
    "Prohibit routine diesel generator tests on evenings and weekends so Pebble Creek families are not interrupted during backyard gatherings."
  ),
  discussion(
    "pebble-creek-20",
    "pebble-creek",
    [30.56296,-96.25294],
    "conditional",
    "power",
    "planning",
    "forum",
    "Behind-the-meter solar + storage before microreactors",
    "Remote solar matching (E2) with on-site peak-shaving batteries is far more realistic for College Station today than waiting for 2030s microreactors."
  ),
  discussion(
    "pebble-creek-21",
    "pebble-creek",
    [30.56583,-96.2507],
    "concerned",
    "governance",
    "planning",
    "x",
    "Stop using §551.087 executive sessions to hide industrial deals",
    "Economic-incentive NDA exemptions were never meant to hide utility-scale power and water infrastructure from abutting homeowners until days before a vote."
  ),
  discussion(
    "pebble-creek-22",
    "pebble-creek",
    [30.56517,-96.25582],
    "supportive",
    "noise",
    "planning",
    "workshop",
    "3D rotation disc shows how building orientation shifts sound",
    "Turning the hall and seeing the purple 55 dBA lobe swing away from homes demonstrates why site layout matters—and why D3 360° walls stop shifting noise onto another neighbor."
  ),
  discussion(
    "pebble-creek-23",
    "pebble-creek",
    [30.56316,-96.25044],
    "concerned",
    "water",
    "construction",
    "facebook",
    "Drainage and flooding along Lick Creek tributaries",
    "Pebble Creek sits right along the Lick Creek drainage basin. Any Midtown concrete pad must meet zero-net-runoff detention for 100-year Brazos County rain events."
  ),
  discussion(
    "pebble-creek-24",
    "pebble-creek",
    [30.56689,-96.2532],
    "conditional",
    "benefits",
    "planning",
    "workshop",
    "Ensure endowment grants reach local CSISD elementary schools",
    "If a B1 community endowment is created, earmark STEM lab and special-education sensory resources directly for nearby College Station ISD campuses."
  ),
  discussion(
    "pebble-creek-25",
    "pebble-creek",
    [30.56337,-96.25466],
    "concerned",
    "power",
    "operation",
    "meeting",
    "Do not let CSU electric transfers mask residential rate risk",
    "Officials touted CSU electric fund transfers during Project Aggie, yet residential customers asked who holds the bag if wholesale ERCOT congestion prices spike."
  ),
  discussion(
    "pebble-creek-26",
    "pebble-creek",
    [30.56478,-96.24958],
    "supportive",
    "governance",
    "planning",
    "forum",
    "Include renters and TAMU voices alongside homeowners",
    "Homeowner turnouts at City Hall can skew older and wealthier. Combining neighborhood pop-ups with an open web map brings in young families and renters too."
  ),
  discussion(
    "pebble-creek-27",
    "pebble-creek",
    [30.56632,-96.2557],
    "concerned",
    "noise",
    "operation",
    "reddit",
    "Tonal hum penetrates double-pane brick homes",
    "Low-frequency transformer buzz around 120 Hz passes straight through brick veneer and windows. Make 1/3-octave band tonal penalties mandatory in the CUP."
  ),
  discussion(
    "pebble-creek-28",
    "pebble-creek",
    [30.56254,-96.25178],
    "conditional",
    "land",
    "planning",
    "workshop",
    "D2 berm and oak screening is the bare minimum for any Business Park lot",
    "Even for standard office or light-industrial warehouses in Midtown, deep post-oak buffers and berms along creek corridors should be required."
  ),
  discussion(
    "school-01",
    "school",
    [30.55796,-96.24899],
    "concerned",
    "noise",
    "operation",
    "meeting",
    "Sensory-sensitive and autistic children hear mechanical hum acutely",
    "Parents of sensory-sensitive students at Pebble Creek Elementary testified at City Hall about how constant low-frequency buzz triggers distress outdoors during recess.",
    [
      reply("concerned", "Standard dBA averages completely miss the tonal 60–120 Hz bands that overwhelm neurodivergent kids."),
      reply("conditional", "Require independent pediatric/acoustic dBC thresholds at school property lines and test live before occupancy.")
    ]
  ),
  discussion(
    "school-02",
    "school",
    [30.55851,-96.24873],
    "concerned",
    "land",
    "planning",
    "facebook",
    "Keep hard exclusion buffers around Pebble Creek Elementary",
    "Elementary schools should sit inside a strict non-industrial exclusion radius under the October 2026 CUP ordinance—no utility-scale substations or generator yards nearby.",
    [
      reply("supportive", "Using the Map overview layer to measure edge-to-edge distance from schools makes siting limits immediately visible.")
    ]
  ),
  discussion(
    "school-03",
    "school",
    [30.55822,-96.25019],
    "concerned",
    "land",
    "construction",
    "meeting",
    "School bus and parent drop-off safety on Parkview and Fitch",
    "Adding heavy dump trucks and transformer haulers near William D. Fitch Parkway during 7:30 a.m. drop-off and 3:15 p.m. dismissal puts young walkers and buses at risk."
  ),
  discussion(
    "school-04",
    "school",
    [30.55905,-96.24962],
    "conditional",
    "benefits",
    "planning",
    "workshop",
    "Direct B1 endowment grants toward CSISD STEM and sensory rooms",
    "If a small CUP facility is built on an industrial parcel far enough away, dedicated endowment grants for CSISD robotics, outdoor classrooms, and sensory support would benefit kids directly."
  ),
  discussion(
    "school-05",
    "school",
    [30.55728,-96.25],
    "concerned",
    "noise",
    "operation",
    "x",
    "Diesel exhaust emissions near school playgrounds",
    "Backup diesel generators emit NOx and fine particulates during multi-hour grid emergencies. Keep generator stacks far downwind of elementary school playfields."
  ),
  discussion(
    "school-06",
    "school",
    [30.55725,-96.24912],
    "conditional",
    "benefits",
    "operation",
    "workshop",
    "Pair B4 apprenticeships with College Station ISD career tech",
    "Paid internships and HVAC/electrical pathways linking CSISD high schoolers, Blinn, and Texas A&M create genuine local career ladders beyond temporary construction."
  ),
  discussion(
    "school-07",
    "school",
    [30.55834,-96.24789],
    "concerned",
    "water",
    "planning",
    "facebook",
    "Teaching kids water conservation while approving high-water cooling",
    "Every summer families get asked to conserve Simsboro Aquifer water. Approving an evaporative cooling plant would send the exact opposite message to our schools."
  ),
  discussion(
    "school-08",
    "school",
    [30.55879,-96.25049],
    "supportive",
    "governance",
    "planning",
    "workshop",
    "Use DataScope to screen parcels before any developer files",
    "Just like Hamburg’s FindingPlaces workshops, let parents, teachers, and planners apply hard school exclusion radii before any private parcel gets negotiated."
  ),
  discussion(
    "school-09",
    "school",
    [30.55768,-96.24779],
    "concerned",
    "power",
    "planning",
    "reddit",
    "High-voltage transmission corridors near school zones",
    "Verify whether any new 138 kV or 345 kV tie-in lines would route along William D. Fitch Parkway past Pebble Creek Elementary."
  ),
  discussion(
    "school-10",
    "school",
    [30.55922,-96.24836],
    "conditional",
    "noise",
    "planning",
    "workshop",
    "Schedule zero equipment testing during school hours",
    "If any CUP facility operates in south College Station, prohibit generator load-bank tests between 7 a.m. and 4 p.m. on weekdays—and keep them off weekends too."
  ),
  discussion(
    "school-11",
    "school",
    [30.55782,-96.25104],
    "concerned",
    "land",
    "planning",
    "meeting",
    "Do not normalize heavy industry beside elementary neighborhoods",
    "Once one CUP exception gets approved near schools and parks, the next developer points to it as precedent. Hold firm UDO zoning lines."
  ),
  discussion(
    "school-12",
    "school",
    [30.55882,-96.24743],
    "supportive",
    "benefits",
    "planning",
    "forum",
    "Transparent jobs & tax math helps school-board planning",
    "Separating municipal tax yield, school district ISD tax impact, and abatement rules shows what actually reaches classrooms vs. state recapture."
  ),
  discussion(
    "school-13",
    "school",
    [30.5586,-96.25128],
    "concerned",
    "power",
    "operation",
    "x",
    "Microreactors anywhere near an elementary school zone",
    "Putting E4 microreactors within a mile of Pebble Creek Elementary would be politically impossible regardless of federal site-boundary licensing rules."
  ),
  discussion(
    "school-14",
    "school",
    [30.55692,-96.24829],
    "conditional",
    "water",
    "planning",
    "workshop",
    "Reclaimed water cooling cuts aquifer impact 88%",
    "If College Station requires T3 reclaimed-water or T2 closed-loop dry cooling in its CUP ordinance, potable drinking water for growing CSISD schools stays protected."
  ),
  discussion(
    "school-15",
    "school",
    [30.55973,-96.24871],
    "concerned",
    "land",
    "construction",
    "facebook",
    "Construction dust and asthma triggers at recess",
    "Grading hundreds of acres upwind of Parkview Drive kicks up clay dust and diesel soot during dry fall semesters unless strict air monitoring is enforced."
  ),
  discussion(
    "school-16",
    "school",
    [30.55724,-96.25128],
    "supportive",
    "land",
    "planning",
    "workshop",
    "The No-Build Midtown park & sports vision serves families directly",
    "Texas Independence Park trails and \"The Station\" youth sports complex give elementary families safe recreation right down the road—compare that honestly against server racks."
  ),
  discussion(
    "school-17",
    "school",
    [30.55803,-96.24692],
    "concerned",
    "governance",
    "planning",
    "meeting",
    "Parents work shifts and cannot stay at City Hall until 1 a.m.",
    "The Sept. 2025 Midtown hearing lasted nearly six hours into the night. An interactive web platform lets working parents leave geo-pinned feedback on their own schedule."
  ),
  discussion(
    "school-18",
    "school",
    [30.55948,-96.25081],
    "conditional",
    "noise",
    "planning",
    "workshop",
    "Compare D3 zigzag walls with distance setbacks together",
    "Distance plus D3 zigzag acoustic baffling drops modeled sound below ambient traffic at Pebble Creek Elementary—still needs certified dBC verification."
  ),
  discussion(
    "school-19",
    "school",
    [30.55645,-96.24953],
    "concerned",
    "water",
    "operation",
    "reddit",
    "Regional aquifer exports plus local growth squeeze schools",
    "Between San Antonio’s Vista Ridge, Georgetown’s proposed Upwell pipeline, and booming Brazos County enrollment, we need GMA-12 legislative caps—not just parcel models."
  ),
  discussion(
    "school-20",
    "school",
    [30.55951,-96.24736],
    "supportive",
    "benefits",
    "construction",
    "x",
    "Local contractor participation supports CSISD families",
    "Many parents in south College Station work in electrical, plumbing, and civil trades. Local procurement standards keep construction paychecks in the district."
  ),
  discussion(
    "school-21",
    "school",
    [30.55807,-96.252],
    "concerned",
    "governance",
    "planning",
    "forum",
    "Hidden end-users: AI research vs. crypto mining",
    "Parents want to know whether a facility supports Texas A&M scientific computing or speculative crypto rigs. Mandate tenant-class disclosure before a CUP is complete."
  ),
  discussion(
    "school-22",
    "school",
    [30.55702,-96.24727],
    "conditional",
    "power",
    "planning",
    "workshop",
    "Remote wind or solar matching should show rural school impacts too",
    "If E2 solar or E3 wind builds 1.5–6.5 sq mi in a neighboring rural county, be transparent about land use and school-tax impacts on those host communities too."
  ),
  discussion(
    "school-23",
    "school",
    [30.56011,-96.24954],
    "concerned",
    "noise",
    "operation",
    "facebook",
    "Outdoor band, PE, and field days require quiet baselines",
    "Measure ambient sound on a calm weekday morning at the playground before modeling how much mechanical equipment adds above background."
  ),
  discussion(
    "school-24",
    "school",
    [30.55655,-96.25106],
    "supportive",
    "land",
    "planning",
    "meeting",
    "Use TAMU Energy & Water Institutes as neutral reviewers",
    "Having Texas A&M faculty audit developer cooling, noise, and grid numbers gives families an independent check instead of relying on vendor brochures."
  ),
  discussion(
    "school-25",
    "school",
    [30.55869,-96.2464],
    "concerned",
    "benefits",
    "planning",
    "x",
    "Texas school finance recapture limits local ISD windfalls",
    "Remind residents that Chapter 313-style abatements and state recapture change how much data-center property tax actually stays in College Station ISD classrooms."
  ),
  discussion(
    "school-26",
    "school",
    [30.55918,-96.25183],
    "conditional",
    "land",
    "planning",
    "workshop",
    "Keep trail connections safe between Pebble Creek and Midtown",
    "Any Midtown development—data center or mixed-use—should fund safe pedestrian crossings across William D. Fitch Parkway toward Texas Independence Park."
  ),
  discussion(
    "school-27",
    "school",
    [30.55622,-96.24851],
    "concerned",
    "power",
    "operation",
    "meeting",
    "Winter grid outages close schools and endanger families",
    "Do not add uncurtailable 24/7 compute loads to CSU until ERCOT and the 2027 Texas Legislature enact enforceable large-load winter curtailment standards."
  ),
  discussion(
    "school-28",
    "school",
    [30.56016,-96.24786],
    "supportive",
    "governance",
    "planning",
    "workshop",
    "Keeping disagreement visible builds real trust",
    "Showing concerned, conditional, and supportive remarks on one map stops either side from claiming unanimous consensus and focuses debate on enforceable guardrails."
  ),
  discussion(
    "medical-01",
    "medical",
    [30.58312,-96.27857],
    "concerned",
    "noise",
    "operation",
    "meeting",
    "Medical vulnerability and cardiac-device anxieties near Baylor Scott & White",
    "Patients and clinicians along the SH 6 medical corridor testified about low-frequency mechanical hum, vibration, and EMF worries near implanted cardiac defibrillators.",
    [
      reply("conditional", "Publish certified magnetic-field decay curves for any substation alongside independent dBC acoustic studies—never brush off medical concerns."),
      reply("concerned", "High-voltage 300 MW substations belong in heavy industrial parks far from regional medical campuses.")
    ]
  ),
  discussion(
    "medical-02",
    "medical",
    [30.58345,-96.27938],
    "concerned",
    "power",
    "operation",
    "meeting",
    "Hospital feeder stability and voltage quality on CSU",
    "Baylor Scott & White relies on rock-solid power quality for surgical suites and ICU equipment. Any large AI load ramping rapidly on CSU feeders must be electrically isolated."
  ),
  discussion(
    "medical-03",
    "medical",
    [30.58239,-96.27916],
    "conditional",
    "water",
    "planning",
    "workshop",
    "Hospital sterilization and laundry could pair with T4 heat recovery—if isolated",
    "Large medical campuses use huge amounts of domestic hot water year-round. Only an isolated closed-loop thermal tie-in with zero cross-contamination risk would ever make sense."
  ),
  discussion(
    "medical-04",
    "medical",
    [30.5838,-96.27817],
    "concerned",
    "land",
    "construction",
    "facebook",
    "Emergency-room ambulance routes on SH 6 and Rock Prairie",
    "Construction bottlenecks at the SH 6 / Rock Prairie interchange during 2027–2029 roadwork plus heavy data-center deliveries could delay trauma ambulances."
  ),
  discussion(
    "medical-05",
    "medical",
    [30.58287,-96.28018],
    "concerned",
    "noise",
    "operation",
    "x",
    "Patient recovery rooms need quiet nighttime baselines",
    "Inpatient rooms overlooking east College Station already buffer SH 6 traffic; adding persistent tonal chiller hum or diesel generator plumes degrades healing environments."
  ),
  discussion(
    "medical-06",
    "medical",
    [30.5826,-96.27812],
    "conditional",
    "governance",
    "planning",
    "workshop",
    "Require medical-campus setback review in every CUP",
    "The October 2026 UDO CUP process should require formal impact notice and engineering review for Baylor Scott & White whenever a data center sits within 2 miles."
  ),
  discussion(
    "medical-07",
    "medical",
    [30.58417,-96.279],
    "concerned",
    "water",
    "operation",
    "forum",
    "Municipal water pressure for hospital fire suppression & dialysis",
    "Dialysis clinics and hospital HVAC rely on steady Simsboro municipal supply. High-draw evaporative cooling towers (T1) create unacceptable competition during peak drought."
  ),
  discussion(
    "medical-08",
    "medical",
    [30.58198,-96.28002],
    "supportive",
    "water",
    "planning",
    "workshop",
    "Closed-loop T2 or reclaimed T3 protects potable hospital supply",
    "Requiring closed-loop or non-potable reclaimed cooling eliminates potable groundwater draw and preserves municipal pressure for medical facilities."
  ),
  discussion(
    "medical-09",
    "medical",
    [30.58363,-96.27739],
    "concerned",
    "power",
    "operation",
    "reddit",
    "Backup diesel generator exhaust drifting across SH 6",
    "During ERCOT emergency events, dozens of multi-megawatt diesel generators running simultaneously emit NO2 and PM2.5 right near respiratory clinics unless Tier 4 Final filters are mandatory."
  ),
  discussion(
    "medical-10",
    "medical",
    [30.58354,-96.28035],
    "supportive",
    "benefits",
    "planning",
    "workshop",
    "Direct B1 endowment grants toward community health clinics",
    "If a data center proceeds on a vetted industrial parcel, dedicating B1 endowment funding to local indigent care and mental-health services creates measurable public health return."
  ),
  discussion(
    "medical-11",
    "medical",
    [30.58184,-96.27869],
    "conditional",
    "power",
    "planning",
    "meeting",
    "Self-funded substation upgrades with zero hospital rate shift",
    "Mandate that the operator pays 100% of dedicated substation, breaker, and harmonic-filtering costs so medical campuses and residents see zero CSU rate bump."
  ),
  discussion(
    "medical-12",
    "medical",
    [30.58456,-96.278],
    "concerned",
    "power",
    "planning",
    "x",
    "On-site microreactors near a regional hospital campus",
    "Proposing E4 nuclear microreactors along the SH 6 medical corridor will trigger intense public anxiety and emergency-planning questions that a 3D demo cannot resolve."
  ),
  discussion(
    "medical-13",
    "medical",
    [30.58223,-96.28088],
    "supportive",
    "governance",
    "planning",
    "workshop",
    "Data centers support biomedical AI—if sited responsibly",
    "Drug discovery and medical imaging depend on compute infrastructure; the issue in College Station is not rejecting science, it is honest siting, open data, and strict buffers."
  ),
  discussion(
    "medical-14",
    "medical",
    [30.58286,-96.2772],
    "conditional",
    "noise",
    "planning",
    "meeting",
    "Require Tier 4 acoustic enclosures on every backup generator",
    "Specify hospital-grade exhaust silencers and D3 zigzag baffle walls for any CUP mechanical yard within audible range of the medical corridor."
  ),
  discussion(
    "medical-15",
    "medical",
    [30.58441,-96.27972],
    "concerned",
    "land",
    "planning",
    "facebook",
    "Do not replace medical-adjacent mixed-use pads with server warehouses",
    "Midtown land south of Baylor Scott & White was envisioned for clinics, lodging for patient families, and walkable cafés—not walled windowless infrastructure."
  ),
  discussion(
    "medical-16",
    "medical",
    [30.58136,-96.27983],
    "supportive",
    "land",
    "planning",
    "workshop",
    "D4 compact district supports patient families and shift staff",
    "Walkable cafés, shaded plazas, and community space in Midtown serve hospital nurses on break and visiting families far better than a fenced industrial compound."
  ),
  discussion(
    "medical-17",
    "medical",
    [30.58435,-96.27698],
    "concerned",
    "governance",
    "planning",
    "reddit",
    "Secrecy breeds health distrust immediately",
    "When SpaceX sued the Texas AG over Terafab records and Project Aggie hid behind NDAs, clinicians and residents assumed worst-case emissions. Full disclosure is non-negotiable."
  ),
  discussion(
    "medical-18",
    "medical",
    [30.58305,-96.2812],
    "conditional",
    "benefits",
    "operation",
    "workshop",
    "Offer B3 household protection to hospital shift workers living nearby",
    "Nurses and technicians renting in Midtown Reserve or south College Station sleep during the day—make sure daytime acoustic standards and renter retrofits are included."
  ),
  discussion(
    "medical-19",
    "medical",
    [30.58185,-96.27781],
    "concerned",
    "noise",
    "operation",
    "forum",
    "Daytime noise hits night-shift medical workers hard",
    "People forget that hundreds of Baylor Scott & White nurses sleep from 9 a.m. to 4 p.m. Daytime construction and generator testing directly harm shift-worker rest."
  ),
  discussion(
    "medical-20",
    "medical",
    [30.58504,-96.27848],
    "supportive",
    "power",
    "planning",
    "x",
    "Remote solar matching reduces regional air pollution",
    "Offsetting 220 GWh/yr with new Texas solar (E2) cuts ~63 kt/yr of ERCOT fossil CO2 and associated NOx/SO2 air pollution across central Texas."
  ),
  discussion(
    "medical-21",
    "medical",
    [30.58148,-96.28104],
    "conditional",
    "governance",
    "operation",
    "meeting",
    "Publish independent electromagnetic and acoustic compliance audits",
    "Annual third-party testing posted publicly removes speculation and gives physicians real data when patients ask about nearby infrastructure."
  ),
  discussion(
    "medical-22",
    "medical",
    [30.58351,-96.27647],
    "concerned",
    "water",
    "planning",
    "facebook",
    "Chemical biocide discharge from evaporative cooling blowdown",
    "Where does chemically treated cooling-tower blowdown go under T1? Verify pretreatment limits before discharge into city sanitary sewers or Lick Creek watersheds."
  ),
  discussion(
    "medical-23",
    "medical",
    [30.58418,-96.28068],
    "supportive",
    "benefits",
    "planning",
    "workshop",
    "TAMU health & engineering faculty can co-host the Living Lab",
    "Pairing Texas A&M Engineering, Architecture, and Public Health researchers inside a neutral Living Lab raises the scientific bar for every CUP review."
  ),
  discussion(
    "medical-24",
    "medical",
    [30.58105,-96.27911],
    "concerned",
    "land",
    "construction",
    "meeting",
    "Heavy equipment vibrations near diagnostic imaging",
    "Confirm that site grading, compaction, and heavy trucking on Midtown Drive stay well beyond vibration thresholds for MRI and imaging suites at Baylor Scott & White."
  ),
  discussion(
    "medical-25",
    "medical",
    [30.58507,-96.27708],
    "conditional",
    "power",
    "operation",
    "workshop",
    "Require harmonic-distortion limits on AI GPU power loads",
    "Large AI training clusters create rapid power-factor swings and harmonics; require IEEE 519 power-quality compliance in the CSU interconnection agreement."
  ),
  discussion(
    "medical-26",
    "medical",
    [30.58228,-96.28177],
    "concerned",
    "governance",
    "operation",
    "reddit",
    "Enforcement matters more than initial renderings",
    "Pretty architectural models look calm on screen; real trust comes from binding CUP revocation triggers if noise, water, or emissions breach permitted limits."
  ),
  discussion(
    "medical-27",
    "medical",
    [30.58229,-96.27683],
    "supportive",
    "land",
    "planning",
    "forum",
    "Map overview clearly shows the 1.3-mile separation to the hospital",
    "Seeing exact measured distances from Midtown Business Park to Baylor Scott & White helps separate facts from rumors while keeping legitimate substation questions front and center."
  ),
  discussion(
    "medical-28",
    "medical",
    [30.58517,-96.27939],
    "conditional",
    "benefits",
    "planning",
    "meeting",
    "Guarantee funding for community health in any benefit pact",
    "If residents opt into B1 endowment allocations, ring-fence multi-year grants for local preventive health and mobile clinics rather than one-off PR donations."
  ),
  discussion(
    "fitch-01",
    "fitch",
    [30.56192,-96.25913],
    "concerned",
    "water",
    "planning",
    "meeting",
    "Lick Creek drainage and FEMA floodplain risks south of Midtown",
    "Heavy Brazos County storms already flood low spots along William D. Fitch Parkway and Lick Creek tributaries. Adding acres of impervious roof and yard needs strict detention.",
    [
      reply("conditional", "Turn on the live FEMA flood and USFWS wetlands overlays in Map constraints to keep every pad well outside the riparian zone."),
      reply("concerned", "FEMA maps lag rapid College Station development—require Atlas 14 rainfall detention sizing.")
    ]
  ),
  discussion(
    "fitch-02",
    "fitch",
    [30.56242,-96.26016],
    "concerned",
    "land",
    "construction",
    "facebook",
    "Truck congestion at SH 6 and William D. Fitch Parkway",
    "The SH 6 / Fitch interchange is already packed during rush hour and game weekends. Hundreds of construction trucks turning into Midtown will back up lanes for miles."
  ),
  discussion(
    "fitch-03",
    "fitch",
    [30.56138,-96.2595],
    "conditional",
    "water",
    "operation",
    "workshop",
    "Maintain at least a 150–300 ft vegetated buffer on Lick Creek",
    "Keep the building edge well west of the Lick Creek tributary and restore native post-oak and prairie grasses to filter stormwater runoff naturally."
  ),
  discussion(
    "fitch-04",
    "fitch",
    [30.56184,-96.26084],
    "supportive",
    "power",
    "planning",
    "workshop",
    "Compare remote wind vs. solar land footprints honestly",
    "Showing that E2 solar uses ~1.5 sq mi while E3 wind spans ~6.5 sq mi of leased farmland (with ~1% pad footprint) lets residents weigh regional land impacts fairly."
  ),
  discussion(
    "fitch-05",
    "fitch",
    [30.56135,-96.26023],
    "concerned",
    "power",
    "planning",
    "meeting",
    "High-voltage transmission corridors along Fitch Parkway",
    "Will a new substation require overhead 138 kV or 345 kV towers down William D. Fitch Parkway? Underground local feeders and keep eminent domain off neighboring tracts."
  ),
  discussion(
    "fitch-06",
    "fitch",
    [30.56131,-96.25841],
    "conditional",
    "land",
    "planning",
    "workshop",
    "Use the southwest Midtown frontage for access, not residential streets",
    "Keep service gates directly off SH 6 / Midtown Drive so zero delivery or fuel trucks ever route east toward Pebble Creek or Lick Creek Park."
  ),
  discussion(
    "fitch-07",
    "fitch",
    [30.56301,-96.26002],
    "concerned",
    "water",
    "operation",
    "x",
    "Spill containment for diesel fuel and glycol cooling loops",
    "Closed-loop dry cooling (T2) uses glycol/water blends and backup generators store tens of thousands of gallons of diesel. Require double-walled containment uphill of Lick Creek."
  ),
  discussion(
    "fitch-08",
    "fitch",
    [30.56085,-96.25887],
    "supportive",
    "land",
    "planning",
    "forum",
    "Lick Creek Park ecological corridor deserves regional protection",
    "Preserving the wooded creek seam between Texas Independence Park and Lick Creek Park maintains College Station’s signature nature trail network."
  ),
  discussion(
    "fitch-09",
    "fitch",
    [30.5621,-96.258],
    "concerned",
    "governance",
    "planning",
    "reddit",
    "Statewide ERCOT and TCEQ pauses show grid and water audits are overdue",
    "Even Governor Abbott paused ERCOT interconnections and TCEQ permits in late 2026 pending audits, and Governor-elect Hinojosa ran on statewide water/grid safeguards. Don’t rush local approvals."
  ),
  discussion(
    "fitch-10",
    "fitch",
    [30.56274,-96.26129],
    "conditional",
    "noise",
    "planning",
    "workshop",
    "Measure sound across the creek valley at night",
    "Open creek valleys funnel mechanical hum much farther than flat urban streets. Pair D2 earthen berms with D3 acoustic walls on the eastern creek-facing flank."
  ),
  discussion(
    "fitch-11",
    "fitch",
    [30.56133,-96.2576],
    "supportive",
    "benefits",
    "planning",
    "workshop",
    "Fund Lick Creek Park restoration through B1 endowment grants",
    "Allocating part of the B1 endowment to native habitat restoration, creek water-quality monitoring, and trail boardwalks directly offsets local corridor disturbance."
  ),
  discussion(
    "fitch-12",
    "fitch",
    [30.56312,-96.25905],
    "concerned",
    "power",
    "operation",
    "facebook",
    "Ratepayer protection when ERCOT summer peaks hit 105°F",
    "Dry cooling spikes peak MW right during ERCOT’s 4–7 p.m. August peak. Require large-load demand response or dedicated generation before granting a CUP."
  ),
  discussion(
    "fitch-13",
    "fitch",
    [30.56063,-96.2599],
    "conditional",
    "water",
    "planning",
    "meeting",
    "Use purple-pipe reclaimed water from Lick Creek Wastewater Plant",
    "College Station’s Lick Creek Wastewater Treatment Plant sits right down the basin! Extending reclaimed effluent north to Midtown makes T3 hybrid cooling genuinely feasible."
  ),
  discussion(
    "fitch-14",
    "fitch",
    [30.56361,-96.25963],
    "concerned",
    "land",
    "construction",
    "x",
    "Sediment washing into Lick Creek during clay excavation",
    "Require third-party erosion inspections after every 1-inch rainstorm during construction, with public photos posted online so neighbors can see silt fences working."
  ),
  discussion(
    "fitch-15",
    "fitch",
    [30.5634,-96.26093],
    "supportive",
    "governance",
    "planning",
    "workshop",
    "Live FEMA and NWI overlays catch problems before design lock-in",
    "Pulling official federal wetlands, PAD-US parklands, and flood zones straight into the browser stops planners from sketching pads on sensitive drainage ground."
  ),
  discussion(
    "fitch-16",
    "fitch",
    [30.56053,-96.25784],
    "concerned",
    "benefits",
    "planning",
    "forum",
    "What if the city gives away tax abatements like RELLIS?",
    "Brazos County’s 40-year tax abatement on RELLIS raised hard questions about long-term public returns. College Station should prohibit 40-year abatements in Midtown."
  ),
  discussion(
    "fitch-17",
    "fitch",
    [30.56267,-96.25782],
    "conditional",
    "land",
    "planning",
    "workshop",
    "Keep D4 trail connections linking Midtown to Fitch bike paths",
    "If Midtown builds out—either as D4 or the No-Build mixed-use plan—include safe shared-use paths along Fitch Parkway connecting to Lick Creek Park."
  ),
  discussion(
    "fitch-18",
    "fitch",
    [30.5625,-96.26205],
    "concerned",
    "noise",
    "construction",
    "reddit",
    "Early-morning concrete pours along Fitch Parkway",
    "Summer Texas concrete pours often start at 4 a.m. to beat the heat. Ban pre-dawn heavy pours near residential edges without advance notice and acoustic shrouds."
  ),
  discussion(
    "fitch-19",
    "fitch",
    [30.56171,-96.2569],
    "supportive",
    "power",
    "planning",
    "meeting",
    "Transparently showing Capex Δ keeps wishlists realistic",
    "Seeing that E2 remote solar adds ~$250M and D3 acoustic walls add ~$11M helps residents and developers negotiate packages that can actually get financed and built."
  ),
  discussion(
    "fitch-20",
    "fitch",
    [30.56347,-96.26188],
    "concerned",
    "water",
    "operation",
    "facebook",
    "Regional Simsboro Aquifer depletion across GMA-12",
    "Even if one 30 MW facility uses under 1% of CSU’s permit, cumulative pumping across 10 counties in GMA-12 is draining the Carrizo-Wilcox faster than recharge."
  ),
  discussion(
    "fitch-21",
    "fitch",
    [30.56099,-96.26125],
    "conditional",
    "benefits",
    "operation",
    "workshop",
    "Include B2 revenue sharing with an inflation-adjusted floor",
    "A fixed annual floor protects College Station during low utilization, while fractional upside shares gains if AI infrastructure expands profitably."
  ),
  discussion(
    "fitch-22",
    "fitch",
    [30.56334,-96.25813],
    "concerned",
    "power",
    "operation",
    "x",
    "E4 microreactors add ~60 MW of extra waste heat to reject",
    "Notice the fine print on microreactors: 30 MWe of nuclear power generates ~60 MW of extra thermal waste heat—where does all that extra heat go in a 105°F Texas summer?"
  ),
  discussion(
    "fitch-23",
    "fitch",
    [30.56197,-96.26246],
    "supportive",
    "water",
    "planning",
    "workshop",
    "Comparing water vs. peak MW stops single-metric cherry-picking",
    "Putting Simsboro water, ERCOT peak MW, and dBA sound side by side in Live Analysis shows immediately that every technology choice is a trade-off."
  ),
  discussion(
    "fitch-24",
    "fitch",
    [30.56011,-96.25891],
    "concerned",
    "land",
    "planning",
    "meeting",
    "Heavy industrial CUP tracts belong further south on SH 6",
    "Use the October 2026 ordinance to guide any data centers toward outer heavy-industrial parcels along SH 6 or Hwy 47 rather than the heart of Midtown."
  ),
  discussion(
    "fitch-25",
    "fitch",
    [30.56408,-96.26079],
    "conditional",
    "governance",
    "operation",
    "forum",
    "Require performance bonds for site decommissioning",
    "Hardware goes obsolete in 5–10 years. Require a funded decommissioning and site-restoration bond so College Station is never stuck with a shuttered concrete shell."
  ),
  discussion(
    "fitch-26",
    "fitch",
    [30.56029,-96.2607],
    "concerned",
    "noise",
    "operation",
    "facebook",
    "Substation transformer hum carries down Fitch Parkway",
    "Transformers hum at pure 120 Hz tones even when servers are idle. Put sound-insulated enclosures around substations, not only cooling towers."
  ),
  discussion(
    "fitch-27",
    "fitch",
    [30.56071,-96.25684],
    "supportive",
    "benefits",
    "construction",
    "workshop",
    "Local trade pathways for electrical linemen and controls techs",
    "B4 training grants linked to CSU utility apprenticeships help College Station grow the skilled workforce needed for Texas’s grid expansion anyway."
  ),
  discussion(
    "fitch-28",
    "fitch",
    [30.56316,-96.2628],
    "conditional",
    "land",
    "planning",
    "meeting",
    "Verify traffic counts for both data-center and Midtown sports alternatives",
    "Be honest about traffic too: a walkable Midtown retail and sports complex generates far more weekend car trips on Fitch Pkwy than a quiet 32-person data center."
  ),
  discussion(
    "tamu-01",
    "tamu",
    [30.57611,-96.2785],
    "conditional",
    "governance",
    "planning",
    "reddit",
    "Students and renters pay CSU bills too—do not only survey homeowners",
    "City Hall hearings are dominated by retirees and Pebble Creek homeowners, yet tens of thousands of Texas A&M students and service workers pay CSU electric and water bills every month.",
    [
      reply("supportive", "Putting DataScope online and hosting campus/apartment pop-ups helps fix homeowner selection bias."),
      reply("conditional", "Include renters explicitly in B3 electric-bill protection and acoustic retrofits.")
    ]
  ),
  discussion(
    "tamu-02",
    "tamu",
    [30.57526,-96.27878],
    "supportive",
    "benefits",
    "operation",
    "workshop",
    "Paid Texas A&M & Blinn internships in cooling and grid controls",
    "Engineering and architecture students at Texas A&M would jump at paid B4 internships auditing thermal recovery, liquid cooling, and grid storage right here in College Station.",
    [
      reply("conditional", "Keep internships open to Blinn College trade students and non-degree local residents too, not just TAMU undergrads.")
    ]
  ),
  discussion(
    "tamu-03",
    "tamu",
    [30.57619,-96.27748],
    "concerned",
    "power",
    "operation",
    "x",
    "Will CSU residential electric rates jump for student apartments?",
    "Renters in older south College Station apartments already pay $250+ August electric bills. Guarantee zero transmission or substation cost-shifting onto residential CSU customers."
  ),
  discussion(
    "tamu-04",
    "tamu",
    [30.57593,-96.27943],
    "supportive",
    "governance",
    "planning",
    "workshop",
    "TAMU Living Lab can audit developer inputs independently",
    "Having Texas A&M’s Energy Institute, Texas Water Resources Institute, and School of Architecture host DataScope keeps the tool neutral and scientifically rigorous."
  ),
  discussion(
    "tamu-05",
    "tamu",
    [30.57507,-96.27791],
    "concerned",
    "benefits",
    "planning",
    "forum",
    "Housing spillover from RELLIS, Terafab, and Midtown growth",
    "Between RELLIS in Bryan, SpaceX Terafab in Grimes County, and Midtown projects, rents are climbing fast. Make sure B1 endowment grants can support affordable workforce housing."
  ),
  discussion(
    "tamu-06",
    "tamu",
    [30.57682,-96.27792],
    "conditional",
    "benefits",
    "planning",
    "workshop",
    "B3 household protection must cover renters, not only property owners",
    "If a data center brings noise or utility hikes, renters suffer the same sleep loss and higher bills without getting property-tax relief. Put renter credits directly in B3."
  ),
  discussion(
    "tamu-07",
    "tamu",
    [30.57504,-96.27976],
    "concerned",
    "water",
    "planning",
    "reddit",
    "Texas A&M and College Station share the same Simsboro Aquifer",
    "TAMU, Bryan, and College Station all pump from the Simsboro Sand. Any evaporative cooling draw adds pressure to a shared regional water fight across GMA-12."
  ),
  discussion(
    "tamu-08",
    "tamu",
    [30.57582,-96.27681],
    "supportive",
    "power",
    "planning",
    "x",
    "E2 solar matching and smart storage are real Texas engineering",
    "Texas leads the nation in utility solar and grid batteries. Requiring 100% annual renewable matching plus peak-shaving storage turns a liability into grid investment."
  ),
  discussion(
    "tamu-09",
    "tamu",
    [30.57664,-96.27934],
    "concerned",
    "governance",
    "planning",
    "meeting",
    "NDAs are incompatible with university-town transparency",
    "College Station is a research community—hiding MW loads, water draw, and end-user identity behind corporate NDAs insults local intelligence and fuels opposition."
  ),
  discussion(
    "tamu-10",
    "tamu",
    [30.57447,-96.27872],
    "conditional",
    "land",
    "planning",
    "workshop",
    "D4 walkable Midtown district gives grad students and young families a third place",
    "Adding shaded plazas, cafés, and trail links to Texas Independence Park makes south College Station less car-dependent than another fenced business park."
  ),
  discussion(
    "tamu-11",
    "tamu",
    [30.57693,-96.27686],
    "concerned",
    "benefits",
    "planning",
    "facebook",
    "32 permanent jobs barely dents local employment",
    "Even with B4 training programs, a standalone 30 MW data center creates far fewer permanent jobs per acre than mixed-use labs, clinics, or retail in Midtown."
  ),
  discussion(
    "tamu-12",
    "tamu",
    [30.57552,-96.28042],
    "supportive",
    "water",
    "planning",
    "workshop",
    "Showing reclaimed purple-pipe water vs. potable Simsboro",
    "Most people do not realize closed-loop dry cooling and reclaimed effluent cut drinking-water use 88–98%. Clear numbers help students and residents separate myths from real risks."
  ),
  discussion(
    "tamu-13",
    "tamu",
    [30.575,-96.27696],
    "concerned",
    "power",
    "operation",
    "reddit",
    "ERCOT grid reliability during finals week and August move-in",
    "August move-in week hits 105°F right when campus and apartments max out AC. Require interruptible large-load contracts so compute curtails before homes lose power."
  ),
  discussion(
    "tamu-14",
    "tamu",
    [30.57733,-96.27841],
    "conditional",
    "power",
    "planning",
    "workshop",
    "Study small modular reactors at RELLIS or remote sites, not Midtown",
    "Texas A&M is actively researching next-gen nuclear energy at RELLIS—that belongs on a dedicated research/industrial campus with proper buffers, not beside Midtown subdivisions."
  ),
  discussion(
    "tamu-15",
    "tamu",
    [30.57433,-96.27993],
    "concerned",
    "noise",
    "operation",
    "x",
    "Low-frequency hum is a real engineering limit of fast web models",
    "Glad this tool explicitly warns that 2D/3D screening models miss 60–120 Hz tonal resonance by 5–10 dB. Honesty about model limits makes the platform far more credible."
  ),
  discussion(
    "tamu-16",
    "tamu",
    [30.57641,-96.27606],
    "supportive",
    "governance",
    "planning",
    "forum",
    "Evening and online participation lets shift workers weigh in",
    "Restaurant, retail, and campus maintenance workers work evenings and weekends. Leaving pinned session notes online ensures their priorities stay visible to City Council."
  ),
  discussion(
    "tamu-17",
    "tamu",
    [30.57644,-96.28033],
    "concerned",
    "governance",
    "planning",
    "meeting",
    "State sales-tax exemptions for hyperscalers exceed $1B/yr",
    "Why should Texas renters pay full sales tax on essentials while multibillion-dollar AI data centers skip electricity sales tax? Push the 2027 Texas Legislature to repeal it."
  ),
  discussion(
    "tamu-18",
    "tamu",
    [30.57418,-96.27796],
    "conditional",
    "benefits",
    "operation",
    "workshop",
    "Track post-training wages and job placement publicly",
    "If B4 funds apprenticeships, require annual reporting on completion rates, hourly wages, and whether graduates land permanent careers in Brazos Valley."
  ),
  discussion(
    "tamu-19",
    "tamu",
    [30.57758,-96.27703],
    "concerned",
    "land",
    "planning",
    "facebook",
    "Traffic on SH 6 and Rock Prairie already stalls every game day",
    "Both a Midtown sports complex and a major construction site add traffic to SH 6. Show transit and bike connections rather than pretending cars disappear."
  ),
  discussion(
    "tamu-20",
    "tamu",
    [30.57482,-96.28094],
    "supportive",
    "water",
    "planning",
    "workshop",
    "Waste heat reuse (T4) fits sustainable campus engineering",
    "Capturing 35 GWh_th/yr of server heat for a Midtown aquatics center or nearby industrial hot-water use beats dumping all that energy straight into the Texas sky."
  ),
  discussion(
    "tamu-21",
    "tamu",
    [30.57541,-96.276],
    "concerned",
    "power",
    "planning",
    "reddit",
    "Check host-community impacts for remote 1.5 sq mi solar farms",
    "Sending 960 acres of solar panels out to Robertson or Burleson County shifts land-use impacts onto rural neighbors. Keep host-community trade-offs visible on the Energy tab."
  ),
  discussion(
    "tamu-22",
    "tamu",
    [30.57742,-96.27936],
    "conditional",
    "benefits",
    "planning",
    "meeting",
    "City fractional ownership (B2) needs independent legal review",
    "Municipal equity can bring long-term upside, yet College Station must structure it through a shielded trust with zero taxpayer liability if an operator goes bankrupt."
  ),
  discussion(
    "tamu-23",
    "tamu",
    [30.57376,-96.27947],
    "concerned",
    "noise",
    "planning",
    "x",
    "Do not overlook overnight construction deliveries near apartments",
    "Heavy equipment staging along SH 6 frontage roads wakes up nearby apartment complexes if overnight hours are not strictly restricted in the CUP."
  ),
  discussion(
    "tamu-24",
    "tamu",
    [30.57718,-96.27578],
    "supportive",
    "land",
    "planning",
    "workshop",
    "No-Build Midtown Alternative belongs as a first-class preset",
    "Treating \"No Data Center / Walkable Midtown\" as a full benchmark with its own tax and jobs readout stops the platform from acting like a pro-development sales pitch."
  ),
  discussion(
    "tamu-25",
    "tamu",
    [30.57585,-96.28122],
    "conditional",
    "governance",
    "operation",
    "forum",
    "Open API for continuous water, noise, and power telemetry",
    "Let Texas A&M students and local residents view live anonymized telemetry on water draw, peak MW, and fence-line dBC noise as a permanent CUP condition."
  ),
  discussion(
    "tamu-26",
    "tamu",
    [30.57429,-96.27688],
    "concerned",
    "water",
    "operation",
    "facebook",
    "105°F heatwaves are getting longer in Central Texas",
    "Design every cooling model for 2040 Texas summers—110°F afternoons and multi-week droughts—not historical 30-year weather averages."
  ),
  discussion(
    "tamu-27",
    "tamu",
    [30.57802,-96.27775],
    "supportive",
    "benefits",
    "planning",
    "workshop",
    "Allocating $10M upfront across community priorities",
    "Letting residents actually toggle B1–B4 and see annual grants, protected households, and training slots update live turns abstract benefit talks into concrete choices."
  ),
  discussion(
    "tamu-28",
    "tamu",
    [30.57404,-96.28095],
    "conditional",
    "governance",
    "planning",
    "meeting",
    "Use CityScope strictly for pre-CUP scoping, then codify in law",
    "Agree on setbacks, acoustic walls, cooling caps, and benefits here—then hand off certified dBC testing, enforceable clawbacks, and aquifer/grid reform to Council and the Legislature."
  )
];

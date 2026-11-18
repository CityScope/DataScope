# DataScope

A community workshop for exploring the proposed data center at 7500 Enterprise Drive in Allen Park, Michigan. Residents can move a building, compare alternatives and pin questions to the places they affect.

[Open the public workshop](https://cityscope-datascope.mitcityscience.chatgpt.site) or [open the sentiment map](https://cityscope-datascope.mitcityscience.chatgpt.site/?view=sentiment).

## Local preview

Run `npm start` from this folder, then open http://127.0.0.1:4174/. The app serves static files and includes its own Three.js and Leaflet libraries. Run `npm test` to check the analysis and workshop behavior.

## Explore a placement

The scenario table opens at the proposal site. A southwest setback is provided as an explicitly illustrative second starting point; it can be freely moved and rotated. Drag the building to relocate it, drag the ground to orbit and scroll or pinch to zoom. Site shows the building with its neighbors. Building gives a closer look at its architecture and equipment. District and Plan show the broader geography. **Move facility** lets you choose a location on the district table. **Rotate or nudge facility** turns the building or moves it in 50 ft steps. With the table focused, arrow keys move the building 10 ft and Shift + arrow moves it 50 ft.

The siting questions on the table focus on equipment sound, the river and the parcel. **Inspect design** labels the cooling equipment represented in each of the three illustrative layouts. The placement check flags a footprint that overlaps modeled infrastructure, selected industrial buildings or community uses. The building geometry is shared with the illustrated model. Open the check to inspect the findings or try a rail crossing. Locations outside the modeled district and browsers without 3D graphics open the placement in a two-dimensional plan. Esri imagery in this fallback loads directly from its provider with attribution.

## Live analysis

- **Equipment sound** estimates the contribution of one rotating equipment source at the listening point you choose. The reference level is an assumed 65 dBA at 15 m. Distance attenuates the level. Weather, barriers, other sound sources and background sound are outside the model.
- **River clearance** measures between the rotated building footprint and the mapped Ecorse River centerline. It reaches zero where they intersect. Outside the illustrated district, it displays “Beyond river coverage” instead of extrapolating the short mapped reach.
- **Footprint inside parcel** calculates the percentage of the building area inside the project parcel from the city planning exhibit.
- **Annual resource use** changes with the selected facility design. Electricity is estimated at a common computing workload. Dry cooling trades lower cooling-water demand for higher electricity consumption. Water use for the higher-efficiency design is shown as unmodeled.

Position and orientation update the spatial results while you manipulate the building. The reference marks compare with the starting proposal. Click a metric name for the calculation and its limitations, or open **Case evidence & sources** for the planning records and geography.

## Community participation

The **Sentiment map** contains 30 fictional opening posts and 14 replies about five places. Rings show the number and mix of opening posts at each place. Filter by viewpoint, topic, source and phase. Open a thread to read its replies. “View on table” connects school, park and housing discussions to their sound listening point; a river discussion opens the river clearance view. The pins identify the place discussed. Workshop notes are authored by participants and stay in their browser or export file.

Save named siting options and compare them alongside the proposal and no build. A pinned note keeps its geographic location, text and associated placement. Workshop files let participants exchange saved options and notes. Placement links encode the location, orientation and design. A local preview link opens on the computer running the workshop. Existing workshops from the earlier map interface also open here.

## Geography and graphics

The workshop uses Helvetica and a consistent light mineral palette across its controls, model, charts and map. Fine roof seams, grille lines and rail detail are painted into mipmapped surfaces; genuinely raised equipment remains solid geometry. Conflict footprints are drawn as disjoint areas to avoid repeated transparent shading.

The Allen Park Planning Commission denied the preliminary site plan on June 4, 2026. The approximate parcel follows Figure 1 of the January 2026 planning packet. The 3D scene shows a generalized industrial district with roads, a railway, park facilities, houses and trees. The three illustrative facility models share a 45,000 sq ft building envelope. Surveyed boundaries, engineered site layouts, acoustic studies and utility service capacity require separate evidence. The source PDFs and downloaded third-party spatial datasets are outside this repository.

Three.js and OrbitControls are distributed under the license in `dist/studio/vendor/LICENSE-three.txt`. Leaflet is distributed under `dist/vendor/LICENSE-leaflet.txt`.

# DataScope

A local community workshop for exploring the proposed data center at 7500 Enterprise Drive in Allen Park, Michigan. Residents can move a building, compare alternatives and pin questions to the places they affect.

## Open the workshop

Run `npm start` from this folder, then open http://127.0.0.1:4174/. The app serves static files and includes its own Three.js and Leaflet libraries. Run `npm test` to check the analysis and workshop behavior.

## Explore a placement

The scenario table opens at the proposal site. Drag the building to relocate it, drag the ground to orbit and scroll or pinch to zoom. Site shows the building with its neighbors. Building gives a closer look at its architecture and equipment. District and Plan show the broader geography. **Move facility** lets you choose a location on the district table. **Rotate or nudge facility** turns the building or moves it in 50 ft steps. With the table focused, arrow keys move the building 10 ft and Shift + arrow moves it 50 ft.

Choose **Aerial map** to compare the model with aerial imagery or explore a placement beyond the 3D district. The aerial view uses the same placement and analysis and also works in browsers without 3D graphics. Esri imagery loads directly from the provider with attribution. The alternative planning sketch remains available offline.

## Live analysis

- **Equipment sound** estimates the contribution of one rotating equipment source at the listening point you choose. The reference level is an assumed 65 dBA at 15 m. Distance attenuates the level. Weather, barriers, other sound sources and background sound are outside the model.
- **River clearance** measures between the rotated building footprint and the mapped Ecorse River centerline. It reaches zero where they intersect.
- **Footprint inside parcel** calculates the percentage of the building area inside the project parcel from the city planning exhibit.
- **Annual resource use** changes with the selected facility design. Electricity is estimated at a common computing workload. Dry cooling trades lower cooling-water demand for higher electricity consumption. Water use for the higher-efficiency design is shown as unmodeled.

Position and orientation update the spatial results while you manipulate the building. The reference marks compare with the starting proposal. Click a metric name for the calculation and its limitations, or open **Case evidence & sources** for the planning records and geography.

## Community participation

Save named siting options and compare them alongside the proposal and no build. A pinned note keeps its geographic location, text and associated placement. Workshop files let participants exchange saved options and notes. Placement links encode the location, orientation and design. A local preview link opens on the computer running the workshop. Existing workshops from the earlier map interface also open here.

## Geography and graphics

The Allen Park Planning Commission denied the preliminary site plan on June 4, 2026. The approximate parcel follows Figure 1 of the January 2026 planning packet. The 3D scene shows a generalized industrial district with roads, a railway, park facilities, houses and trees. The three illustrative facility models share a 45,000 sq ft building envelope. Surveyed boundaries, engineered site layouts, acoustic studies and utility service capacity require separate evidence. The source PDFs and downloaded third-party spatial datasets are outside this repository.

Three.js and OrbitControls are distributed under the license in `dist/studio/vendor/LICENSE-three.txt`. Leaflet is distributed under `dist/vendor/LICENSE-leaflet.txt`.

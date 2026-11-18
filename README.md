# DataScope

A resident-facing workshop for exploring data center siting in Allen Park and neighboring Melvindale, Michigan. The application runs from static files and uses relative asset paths.

## Local preview

Run `npm start` from this folder, then open http://127.0.0.1:4174. No dependency installation or build is required. Run `npm test` to check the workshop model.

## Workshop

Use the proposal parcel as a starting point. Drag the data center, select a map location, or use the 50 ft movement buttons. Adjust the orientation and design, save alternatives, and compare with the proposed site or no build. Nearby measurements use reference points, not site or property edges. The Evidence tab links the source records.

Notes preserve their location and the associated scenario. This build stores information in the current browser. Placement links encode only a location, orientation, and design. Workshop files include notes and saved options and can be exchanged voluntarily. A loopback preview link is reachable only on its own device.

## Geography and resource assumptions

The site plan was denied on June 4, 2026. The approximate parcel follows Figure 1 of the January 2026 planning packet. The movable 45,000 sq ft rectangular model is illustrative. Building envelopes, equipment layouts, acoustic performance, utility capacity, permitting and land availability require independent review. Reference, high-efficiency and dry-cooling calculations follow the workshop case study. Unknown water demand remains unmodeled.

Esri imagery loads from its provider with attribution. The generalized planning sketch remains available when imagery cannot load. The source PDFs and third-party spatial datasets are not part of the application.

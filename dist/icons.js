const paths = {
  cube: '<path d="m12 2 9 5v10l-9 5-9-5V7Zm-9 5 9 5 9-5m-9 5v10"/>',
  map: '<path d="m3 5 6-2 6 2 6-2v15l-6 3-6-3-6 3zm6-2v15m6-13v16"/>',
  sound: '<path d="M3 10h4l5-5v14l-5-5H3Zm13-2a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  river: '<path d="M3 6c4-4 6 4 10 0s6-3 8-2M3 12c4-4 6 4 10 0s6-3 8-2M3 18c4-4 6 4 10 0s6-3 8-2"/>',
  parcel: '<path d="m3 8 9-5 9 5-9 5zM3 13l9 5 9-5M3 17l9 5 9-5"/>',
  fan: '<circle cx="12" cy="12" r="2"/><path d="M10 10C4 1 15 0 15 6c0 2-1 3-2 4m1 3c11-2 8 8 2 6-2-1-3-3-3-5m-3-1c-5 10-12 2-7-2 2-1 4 0 6 1"/>',
  loc: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.1"/>',
  share: '<path d="M4 12v8h16v-8M12 15V3m-4 4 4-4 4 4"/>',
  expand: '<path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4"/>',
  compress: '<path d="M4 8h4V4m12 4h-4V4M4 16h4v4m12-4h-4v4"/>',
  play: '<polygon points="7 5 19 12 7 19 7 5" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
  pause: '<rect x="6.5" y="5" width="3.8" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="13.7" y="5" width="3.8" height="14" rx="1" fill="currentColor" stroke="none"/>',
  pinplus: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><path d="M9 10h6m-3-3v6"/>',
  footprint: '<path d="M3 8V4h4m10 0h4v4M3 16v4h4m14-4v4h-4"/><path d="M7 8h10v8H7z"/>',
  note: '<path d="M4 4h16v12H9l-5 4z"/><path d="M8 8h8m-8 4h5"/>',
  book: '<path d="M3 4c4-1 7 0 9 2 2-2 5-3 9-2v14c-4-1-7 0-9 2-2-2-5-3-9-2zM12 6v14"/>',
  compare:
    '<rect x="3" y="5" width="7" height="14" rx="1"/><rect x="14" y="5" width="7" height="14" rx="1"/>',
  controls:
    '<path d="M3 7h8m4 0h6M3 17h3m4 0h11"/><circle cx="13" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  layers: '<path d="m3 8 9-5 9 5-9 5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
  terrain: '<path d="m2 18 7-12 6 9 3-5 4 8Z"/>',
  chevron: '<path d="m7 10 5 5 5-5"/>',
  north: '<path d="m12 3 7 17-7-4-7 4Z"/>',
  measure: '<path d="m3 15 12-12 6 6L9 21zM12 6l3 3m-6 0 2 2m-5 1 3 3"/>',
  park: '<path d="m12 2-5 7h3l-5 7h6v5h2v-5h6l-5-7h3z"/>',
  school: '<path d="m3 10 9-6 9 6-9 5zM7 13v4l5 3 5-3v-4M21 10v6"/>',
  housing: '<path d="m2 11 10-8 10 8M5 10v10h14V10m-9 10v-7h4v7"/>',
  senior: '<path d="M4 20V9l8-5 8 5v11H4zm5 0v-5h6v5M9 11h6"/>',
  medical: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 8v8M8 12h8"/>',
  move: '<path d="M12 2v20M2 12h20M8 6l4-4 4 4m-8 12 4 4 4-4M6 8l-4 4 4 4m12-8 4 4-4 4"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  save: '<path d="M5 3h14v18l-7-4-7 4z"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  subtract: '<circle cx="12" cy="12" r="8"/><path d="M8 12h8"/>',
  plan: '<path d="M4 20V9l8-6 8 6v11zM8 19V9m4 10V8m4 11V9"/>',
  bolt: '<path d="M14 2 5 14h6l-1 8 9-13h-6z"/>',
  rotate: '<path d="M19 10a7 7 0 1 0 0 6M19 4v6h-6"/>',
  folder: '<path d="M3 6h7l2 3h9v11H3z"/>',
  inspect: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  link: '<path d="m9 15 6-6m-5-2 2-2a5 5 0 0 1 7 7l-2 2m-3 3-2 2a5 5 0 0 1-7-7l2-2"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  water: '<path d="M12 2S5 10 5 14a7 7 0 0 0 14 0c0-4-7-12-7-12Z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3z"/>',
  dollar: '<path d="M12 2v20M16.5 7.5a4 3 0 0 0-4.5-2.5c-2.5 0-4.5 1.2-4.5 3 0 2 2 2.7 4.5 3.3s4.5 1.4 4.5 3.5c0 2-2 3.2-4.5 3.2a4.5 3 0 0 1-4.8-2.5"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 19v-1a4.5 4.5 0 0 1 4.5-4.5h3A4.5 4.5 0 0 1 15 18v1"/><circle cx="17" cy="9" r="2.2"/><path d="M17 13.5c2.2 0 4 1.5 4 3.8V19"/>',
  district: '<path d="M3 20h18M5 20V8l5-3v15m4 0v-9l5-2v11M8 11h1m-1 4h1m7-2h1m-1 4h1"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4"/>',
  wind: '<path d="M3 8h11a2.5 2.5 0 1 0-2.5-2.5M3 13h15a2.5 2.5 0 1 1-2.5 2.5M3 17h7a2 2 0 1 1-2 2"/>',
  atom: '<circle cx="12" cy="12" r="1.8"/><ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(30 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(-30 12 12)"/>',
  heat: '<path d="M12 3c2.5 3.2 1.2 5.4 0 7-1.2 1.6-2.5 3.8 0 7M7 5c2 2.6 1 4.4 0 5.8S5 14 7 16.5M17 5c2 2.6 1 4.4 0 5.8s-2 3.2 0 5.7"/>',
  overview: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
  leaf: '<path d="M19 4C11 4 5 8.5 5 16c0 1.4.3 2.7.8 3.8M5.8 19.8C7.6 16 11.5 12.2 17 10M5.8 19.8c6.2.5 13.2-2.6 13.2-15.8"/>',
  grip: '<circle cx="9" cy="7" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="7" r="1.1" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="9" cy="17" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="17" r="1.1" fill="currentColor" stroke="none"/>',
  target: '<circle cx="12" cy="12" r="6.5"/><path d="M12 2.5v3m0 13v3M2.5 12h3m13 0h3"/>',
  workshop: '<path d="M4 4h16v12h-9l-5 4v-4H4zM8 8h8M8 12h5"/>',
  meeting:
    '<circle cx="9" cy="7.5" r="3"/><path d="M3.5 19v-1a4.5 4.5 0 0 1 4.5-4.5h2A4.5 4.5 0 0 1 14.5 18v1"/><circle cx="16.8" cy="8.5" r="2.2"/><path d="M16.8 13.5c2.2 0 3.7 1.5 3.7 3.8V19"/>',
  x: '<path d="M4 3h4l12 18h-4zM20 3 4 21"/>',
  facebook:
    '<path d="M14 22v-9h3l.5-4H14V7c0-1.2.4-2 2-2h2V1.5c-.6-.1-1.8-.2-3-.2-3 0-5 1.8-5 5V9H7v4h3v9z" fill="currentColor" stroke="none"/>',
  reddit:
    '<ellipse cx="12" cy="14" rx="8" ry="6"/><path d="m12 8 1.5-6 5 1M7 16q5 4 10 0"/><circle cx="20" cy="3" r="2"/><circle cx="8.5" cy="12" r=".8" fill="currentColor"/><circle cx="15.5" cy="12" r=".8" fill="currentColor"/><path d="M5 10C0 5 0 14 4 13M19 10c5-5 5 4 1 3"/>',
  forum:
    '<circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8M3.6 15h16.8M12 3a13.5 13.5 0 0 0 0 18M12 3a13.5 13.5 0 0 1 0 18"/>'
};
export function icon(name) {
  return (
    '<svg class="ico" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
    (paths[name] || '') +
    '</svg>'
  );
}
export function hydrateIcons(root = document) {
  root.querySelectorAll('i[data-icon]').forEach((el) => {
    el.outerHTML = icon(el.dataset.icon);
  });
}

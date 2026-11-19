// Bearings use the scene's east/south plane: zero is north, clockwise is positive.
export const normalizeBearing = angle => ((angle % 360) + 360) % 360;
export function dragBearing(initial, start, current, snap = 1) {
  if (Math.hypot(...current) < 1e-6 || Math.hypot(...start) < 1e-6) return normalizeBearing(initial);
  const delta = (Math.atan2(current[0], -current[1]) - Math.atan2(start[0], -start[1])) * 180 / Math.PI;
  return normalizeBearing(Math.round((initial + delta) / snap) * snap);
}

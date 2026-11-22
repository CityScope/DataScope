// Continuous, cursor-anchored zoom, adapted from MineScope's Leaflet controller.
// One gesture remains open while existing tiles, paths and markers transform.
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const controllers = new WeakMap();
export function smoothZoom(map) {
  if (controllers.has(map)) return controllers.get(map);
  const container = map.getContainer();
  let active = false, starting = false, frame = 0, target = 0, last = 0, input = 0;
  let anchor, point, direction = 0;
  const limited = n => clamp(n, map.getMinZoom(), map.getMaxZoom());
  function finish() {
    cancelAnimationFrame(frame); frame = 0;
    if (!active) return;
    active = false;
    map.fire('zoom');
    map._moveEnd(true);
  }
  function begin(at) {
    if (!active) {
      map._stop();
      if (map._animatingZoom) map._onZoomTransitionEnd();
      target = map.getZoom(); active = true; direction = 0;
      last = performance.now(); starting = true;
      map._moveStart(true, false); starting = false;
    }
    point = at; anchor = map.containerPointToLatLng(at);
    input = performance.now();
  }
  function tick(now) {
    frame = 0;
    if (!active) return;
    const elapsed = clamp(now - last, 0, 50); last = now;
    target = limited(target);
    const zoom = map.getZoom(), remaining = target - zoom;
    const step = clamp(remaining * (1 - Math.exp(-elapsed / 65)), -elapsed * .004, elapsed * .004);
    const next = Math.abs(remaining) < .001 ? target : zoom + step;
    if (next !== zoom) {
      const offset = point.subtract(map.getSize().divideBy(2));
      const center = map.unproject(map.project(anchor, next).subtract(offset), next);
      map._move(center, next, {pinch: true, round: false});
    }
    if (now - input >= 140 && next === target) finish();
    else frame = requestAnimationFrame(tick);
  }
  function queue(delta, at, wheel = false) {
    if (!Number.isFinite(delta) || !delta) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      map.setZoomAround(at, limited(map.getZoom() + delta), {animate: false}); return;
    }
    begin(at);
    if (direction && Math.sign(delta) !== direction) target = map.getZoom();
    direction = Math.sign(delta);
    target = limited(wheel ? clamp(target + delta, map.getZoom() - 1.25, map.getZoom() + 1.25) : target + delta);
    if (!frame) frame = requestAnimationFrame(tick);
  }
  function wheel(e) {
    if (!map._loaded || e.defaultPrevented || e.shiftKey || e.target.closest?.('.leaflet-control') || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? map.getSize().y : 1;
    const delta = -e.deltaY * unit / (e.ctrlKey ? 100 : 360);
    if (!Number.isFinite(delta) || !delta) return;
    e.preventDefault(); e.stopPropagation();
    queue(delta, map.mouseEventToContainerPoint(e), true);
  }
  const otherMove = () => { if (!starting) finish(); };
  container.addEventListener('wheel', wheel, {passive: false});
  container.addEventListener('pointerdown', finish, true);
  container.addEventListener('keydown', finish, true);
  window.addEventListener('blur', finish);
  map.on('movestart zoomstart', otherMove);
  function destroy() {
    finish();
    container.removeEventListener('wheel', wheel);
    container.removeEventListener('pointerdown', finish, true);
    container.removeEventListener('keydown', finish, true);
    window.removeEventListener('blur', finish);
    map.off('movestart zoomstart', otherMove);
    controllers.delete(map);
  }
  map.once('unload', destroy);
  const controller = {step: (delta, at = map.getSize().divideBy(2)) => queue(delta * .5, at), destroy};
  controllers.set(map, controller);
  return controller;
}

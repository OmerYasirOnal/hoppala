/** Relative-drag steering: the finger moves the target by its delta —
 *  it never needs to sit on the character. 1:1 in logical pixels,
 *  measured against the RENDERED canvas width (measureEl), which is
 *  narrower than the drag surface whenever the viewport is letterboxed. */
export function attachDrag(
  el: HTMLElement,
  logicalWidth: number,
  measureEl: HTMLElement = el,
  sensitivity: () => number = () => 1,
): { targetX(): number; reset(x: number): void } {
  let target = logicalWidth / 2;
  let lastClientX: number | null = null;
  let activePointerId: number | null = null;

  const scale = () => logicalWidth / measureEl.clientWidth;

  el.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0) return; // right-click / secondary pointers never start a drag
    // Buttons handle their own clicks — starting a drag (and pointer capture)
    // from them would swallow the mouse click entirely.
    if (e.target instanceof Element && e.target.closest('button')) return;
    if (activePointerId !== null) return; // one steering finger at a time
    activePointerId = e.pointerId;
    lastClientX = e.clientX;
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    if (e.pointerId !== activePointerId || lastClientX === null) return;
    target += (e.clientX - lastClientX) * scale() * sensitivity();
    lastClientX = e.clientX;
  });
  const end = (e: PointerEvent) => {
    if (e.pointerId !== activePointerId) return;
    activePointerId = null;
    lastClientX = null;
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    targetX: () => target,
    reset(x: number) {
      target = x;
      lastClientX = null;
      activePointerId = null;
    },
  };
}

/** Relative-drag steering: the finger moves the target by its delta —
 *  it never needs to sit on the character. 1:1 in logical pixels,
 *  measured against the RENDERED canvas width (measureEl), which is
 *  narrower than the drag surface whenever the viewport is letterboxed. */
export function attachDrag(
  el: HTMLElement,
  logicalWidth: number,
  measureEl: HTMLElement = el,
): { targetX(): number; reset(x: number): void } {
  let target = logicalWidth / 2;
  let lastClientX: number | null = null;

  const scale = () => logicalWidth / measureEl.clientWidth;

  el.addEventListener('pointerdown', (e) => {
    lastClientX = e.clientX;
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    if (lastClientX === null) return;
    target += (e.clientX - lastClientX) * scale();
    lastClientX = e.clientX;
  });
  const end = () => {
    lastClientX = null;
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);

  return {
    targetX: () => target,
    reset(x: number) {
      target = x;
      lastClientX = null;
    },
  };
}

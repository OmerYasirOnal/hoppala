/** Pure fixed-timestep accumulator: how many updates fit into this frame. */
export function advance(
  acc: number,
  frameDt: number,
  dt: number,
  maxFrame = 0.25,
): { steps: number; acc: number } {
  let a = acc + Math.min(frameDt, maxFrame);
  let steps = 0;
  while (a >= dt) {
    a -= dt;
    steps++;
  }
  return { steps, acc: a };
}

export function createLoop(opts: {
  update: (dt: number) => void;
  render: (alpha: number) => void;
  dt?: number;
}): { start(): void; stop(): void } {
  const dt = opts.dt ?? 1 / 60;
  let raf = 0;
  let last = 0;
  let acc = 0;
  const frame = (now: number) => {
    const frameDt = last === 0 ? dt : (now - last) / 1000;
    last = now;
    const r = advance(acc, frameDt, dt);
    acc = r.acc;
    for (let i = 0; i < r.steps; i++) opts.update(dt);
    opts.render(acc / dt);
    raf = requestAnimationFrame(frame);
  };
  return {
    start() {
      last = 0;
      acc = 0;
      raf = requestAnimationFrame(frame);
    },
    stop() {
      cancelAnimationFrame(raf);
    },
  };
}

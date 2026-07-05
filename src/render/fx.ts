import type { PlatformKind } from '../game/types';

/** A cosmetic particle. Position is parametric by age → interpolation-safe. */
export interface Particle {
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  spawnTime: number;
  life: number;
  size: number;
  color: string;
  gravity: number;
}

/** World-space position + alpha of a particle at absolute sim `time`. */
export function particleAt(p: Particle, time: number): { x: number; y: number; alpha: number; dead: boolean } {
  const age = time - p.spawnTime;
  if (age <= 0) return { x: p.x0, y: p.y0, alpha: 1, dead: false };
  const x = p.x0 + p.vx * age;
  const y = p.y0 + p.vy * age + 0.5 * p.gravity * age * age;
  const alpha = Math.max(0, 1 - age / p.life);
  return { x, y, alpha, dead: age > p.life };
}

const SHAKE_DECAY = 0.32; // seconds

/** Screen-shake magnitude at `age`. Starts at `amp`, eases to 0 by SHAKE_DECAY. */
export function shakeEnvelope(amp: number, age: number): number {
  if (age < 0 || age >= SHAKE_DECAY) return 0;
  const k = 1 - age / SHAKE_DECAY;
  return amp * k * k;
}

/** Decaying oscillation offset for the screen shake. {0,0} once past the window. */
export function shakeOffset(amp: number, age: number): { dx: number; dy: number } {
  const e = shakeEnvelope(amp, age);
  if (e === 0) return { dx: 0, dy: 0 };
  return { dx: Math.sin(age * 90) * e, dy: Math.cos(age * 110) * e };
}

/** Ease-out pulse (1 → 0 across `window`) for the land squash. */
export function easeOutPulse(age: number, window = 0.18): number {
  if (age < 0 || age >= window) return 0;
  const k = 1 - age / window;
  return k * k;
}

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

const KIND_BASE: Record<PlatformKind, [number, number, number]> = {
  static: [126, 224, 138],
  moving: [109, 183, 255],
  crumbling: [201, 160, 107],
  spring: [126, 224, 138],
  phantom: [224, 138, 208],
};

/** Per-zone, per-kind platform palette: body + lighter top highlight + darker edge. */
export function platformPalette(
  zoneTop: readonly [number, number, number],
  kind: PlatformKind,
): { body: string; top: string; edge: string } {
  const base = KIND_BASE[kind];
  // blend the kind's identity hue toward the zone's sky tint so platforms feel native
  const body: [number, number, number] = [
    base[0] + (zoneTop[0] - base[0]) * 0.18,
    base[1] + (zoneTop[1] - base[1]) * 0.18,
    base[2] + (zoneTop[2] - base[2]) * 0.18,
  ];
  const rgb = (c: readonly number[], f: number): string =>
    `rgb(${clamp255(c[0]! * f)},${clamp255(c[1]! * f)},${clamp255(c[2]! * f)})`;
  return { body: rgb(body, 1), top: rgb(body, 1.28), edge: rgb(body, 0.6) };
}

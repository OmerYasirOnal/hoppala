import type { Rng } from '../core/rng';
import { JUMP_HEIGHT, TUNING, type Platform, type PlatformKind } from './types';

export interface Difficulty {
  gapMin: number;
  gapMax: number;
  movingRatio: number;
  crumblingRatio: number;
  springRatio: number;
  platformW: number;
  moveSpeed: number;
}

const MAX_GAP = TUNING.maxGapFactor * JUMP_HEIGHT;

/** Altitude-driven difficulty. Monotonic by construction; every gap ≤ MAX_GAP. */
export function difficultyAt(altitude: number): Difficulty {
  const a = Math.max(0, altitude);
  const gapMax = Math.min(MAX_GAP, 90 + a * 0.011);
  const gapMin = Math.min(gapMax * 0.55, 60 + a * 0.004);
  const movingRatio = a < 1500 ? 0 : Math.min(0.35, ((a - 1500) / 6500) * 0.35);
  const crumblingRatio = a < 3000 ? 0 : Math.min(0.3, ((a - 3000) / 7000) * 0.3);
  const springRatio = a < 800 ? 0 : 0.06;
  const platformW = Math.max(56, TUNING.platformW - a * 0.0012);
  const moveSpeed = 1.2 + Math.min(1.8, a * 0.0002);
  return { gapMin, gapMax, movingRatio, crumblingRatio, springRatio, platformW, moveSpeed };
}

function pickKind(d: Difficulty, r: number): PlatformKind {
  if (r < d.crumblingRatio) return 'crumbling';
  if (r < d.crumblingRatio + d.movingRatio) return 'moving';
  if (r < d.crumblingRatio + d.movingRatio + d.springRatio) return 'spring';
  return 'static';
}

/** One platform above prevY. Reachable by construction (gap ≤ MAX_GAP). */
export function nextPlatform(prevY: number, altitude: number, rng: Rng, id: number): Platform {
  const d = difficultyAt(altitude);
  const gap = d.gapMin + rng() * (d.gapMax - d.gapMin);
  const y = prevY - gap;
  const kind = pickKind(d, rng());
  const w = d.platformW;
  if (kind === 'moving') {
    const amp = 40 + rng() * 60;
    const usable = TUNING.viewWidth - 2 * (amp + w / 2);
    const baseX = amp + w / 2 + rng() * Math.max(0, usable);
    return { id, kind, x: baseX, y, w, baseX, amp, speed: d.moveSpeed * (0.6 + rng() * 0.8), phase: rng() * Math.PI * 2, broken: false };
  }
  const x = w / 2 + rng() * (TUNING.viewWidth - w);
  return { id, kind, x, y, w, baseX: x, amp: 0, speed: 0, phase: 0, broken: false };
}

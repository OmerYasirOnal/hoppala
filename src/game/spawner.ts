import type { Rng } from '../core/rng';
import { JUMP_HEIGHT, TUNING, type Platform, type PlatformKind, type Pickup, type Enemy } from './types';

export interface Difficulty {
  gapMin: number;
  gapMax: number;
  movingRatio: number;
  crumblingRatio: number;
  springRatio: number;
  platformW: number;
  moveSpeed: number;
  phantomRatio: number;
  enemyRatio: number;
}

const MAX_GAP = TUNING.maxGapFactor * JUMP_HEIGHT;
const BOOST_RATIO = 0.03;
const BOOST_MIN_ALTITUDE = 2000;
const PHANTOM_OFFSET_MIN = 0.35;
const PHANTOM_OFFSET_SPAN = 0.3;

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
  const phantomRatio = a < 5000 ? 0 : Math.min(0.25, ((a - 5000) / 10000) * 0.25);
  const enemyRatio = a < 1000 ? 0 : Math.min(0.15, ((a - 1000) / 8000) * 0.15);
  return { gapMin, gapMax, movingRatio, crumblingRatio, springRatio, platformW, moveSpeed, phantomRatio, enemyRatio };
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

/**
 * Optional extras around a freshly spawned main-chain platform. Phantoms are
 * additional hazards/opportunities — never part of the guaranteed chain — and
 * boost pickups sit on top of static chain platforms.
 */
export function spawnExtras(
  mainPlat: Platform,
  prevY: number,
  altitude: number,
  rng: Rng,
  phantomId: number,
  pickupId: number,
  enemyId: number = 0,
): { phantom: Platform | null; pickup: Pickup | null; enemy: Enemy | null } {
  const d = difficultyAt(altitude);
  let phantom: Platform | null = null;
  if (d.phantomRatio > 0 && rng() < d.phantomRatio) {
    const lastGap = prevY - mainPlat.y;
    const y = prevY - lastGap * (PHANTOM_OFFSET_MIN + rng() * PHANTOM_OFFSET_SPAN);
    const w = d.platformW;
    const x = w / 2 + rng() * (TUNING.viewWidth - w);
    phantom = {
      id: phantomId,
      kind: 'phantom',
      x,
      y,
      w,
      baseX: x,
      amp: 0,
      speed: 0,
      phase: rng() * (TUNING.phantomOn + TUNING.phantomOff),
      broken: false,
    };
  }
  let pickup: Pickup | null = null;
  if (mainPlat.kind === 'static' && altitude >= BOOST_MIN_ALTITUDE && rng() < BOOST_RATIO) {
    pickup = {
      id: pickupId,
      x: mainPlat.x,
      y: mainPlat.y - TUNING.pickupR - 4,
      taken: false,
    };
  }
  let enemy: Enemy | null = null;
  if (d.enemyRatio > 0 && rng() < d.enemyRatio) {
    const lastGap = prevY - mainPlat.y;
    const y = prevY - lastGap * (0.4 + rng() * 0.3); // mid-gap, above the chain platform
    const patrol = rng() < 0.5;
    const amp = patrol ? 40 + rng() * 50 : 0;
    const usable = TUNING.viewWidth - 2 * (amp + TUNING.enemyR);
    const baseX = amp + TUNING.enemyR + rng() * Math.max(0, usable);
    enemy = { id: enemyId, x: baseX, y, baseX, amp, speed: patrol ? d.moveSpeed * (0.5 + rng() * 0.7) : 0, phase: rng() * Math.PI * 2, dead: false };
  }
  return { phantom, pickup, enemy };
}

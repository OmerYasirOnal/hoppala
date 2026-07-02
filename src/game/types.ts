export const TUNING = {
  viewWidth: 400,
  gravity: 2200,
  bounceVy: -1050,
  springMultiplier: 1.8,
  platformW: 68,
  platformH: 14,
  playerR: 16,
  dt: 1 / 60,
  maxGapFactor: 0.8,
} as const;

/** Peak height of a normal bounce: v² / 2g ≈ 250.6 px. */
export const JUMP_HEIGHT = (TUNING.bounceVy * TUNING.bounceVy) / (2 * TUNING.gravity);

export type PlatformKind = 'static' | 'moving' | 'crumbling' | 'spring';

export interface Platform {
  id: number;
  kind: PlatformKind;
  x: number; // center (updated each step for moving platforms)
  y: number; // top edge (world y-down: smaller = higher)
  w: number;
  baseX: number;
  amp: number; // 0 for non-moving
  speed: number; // rad/s
  phase: number;
  broken: boolean;
}

export interface Player {
  x: number;
  y: number; // center
  vy: number;
}

export type SimEvent = 'bounce' | 'spring' | 'break' | 'gameover';

export interface World {
  player: Player;
  platforms: Platform[];
  cameraY: number; // world y of the viewport top
  viewHeight: number;
  time: number;
  startY: number;
  maxAltitude: number; // px climbed
  over: boolean;
  nextSpawnY: number; // y of the highest platform placed so far
  idSeq: number;
  events: SimEvent[]; // emitted during the last step
}

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
  phantomOn: 1.6, // s visible per cycle
  phantomOff: 0.9, // s invisible per cycle
  boostVy: -1400, // px/s driven during a jetpack boost
  boostDuration: 1.2, // s
  pickupR: 12,
  steerSmoothing: 0.5, // 1 = instant snap to the drag target; lower = smoother/eased horizontal follow
} as const;

/** Peak height of a normal bounce: v² / 2g ≈ 250.6 px. */
export const JUMP_HEIGHT = (TUNING.bounceVy * TUNING.bounceVy) / (2 * TUNING.gravity);

export type PlatformKind = 'static' | 'moving' | 'crumbling' | 'spring' | 'phantom';

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
  prevX: number;
  prevY: number;
  boostT: number; // remaining jetpack time; 0 = normal physics
}

export interface Pickup {
  id: number;
  x: number;
  y: number; // center (world y-down)
  taken: boolean;
}

export type SimEvent = 'bounce' | 'spring' | 'break' | 'boost' | 'gameover';

export interface World {
  player: Player;
  platforms: Platform[];
  pickups: Pickup[];
  cameraY: number; // world y of the viewport top
  prevCameraY: number;
  viewHeight: number;
  time: number;
  startY: number;
  maxAltitude: number; // px climbed
  over: boolean;
  nextSpawnY: number; // y of the highest platform placed so far
  idSeq: number;
  events: SimEvent[]; // emitted during the last step
}

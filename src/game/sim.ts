import type { Rng } from '../core/rng';
import { nextPlatform } from './spawner';
import { JUMP_HEIGHT, TUNING, type Platform, type World } from './types';

const SPAWN_AHEAD_FACTOR = 1.0; // keep one screen of platforms above the camera
const CULL_MARGIN = 120;
const CAMERA_LINE = 0.4; // player is held above 40% of the view

function wrapX(x: number): number {
  const w = TUNING.viewWidth;
  return ((x % w) + w) % w;
}

/** Horizontal overlap test that respects edge wrap-around. */
function overlapsX(px: number, plat: Platform): boolean {
  const half = plat.w / 2 + TUNING.playerR * 0.7;
  const dx = Math.abs(px - plat.x);
  return Math.min(dx, TUNING.viewWidth - dx) <= half;
}

export function createWorld(rng: Rng, viewHeight: number): World {
  const startY = 0;
  const start: Platform = {
    id: 0, kind: 'static', x: TUNING.viewWidth / 2, y: startY + 60,
    w: TUNING.platformW, baseX: TUNING.viewWidth / 2, amp: 0, speed: 0, phase: 0, broken: false,
  };
  const world: World = {
    player: { x: TUNING.viewWidth / 2, y: startY, vy: TUNING.bounceVy },
    platforms: [start],
    cameraY: startY + 60 - viewHeight * (1 - CAMERA_LINE),
    viewHeight,
    time: 0,
    startY,
    maxAltitude: 0,
    over: false,
    nextSpawnY: start.y,
    idSeq: 1,
    events: [],
  };
  fillPlatforms(world, rng);
  return world;
}

function fillPlatforms(world: World, rng: Rng): void {
  const targetY = world.cameraY - world.viewHeight * SPAWN_AHEAD_FACTOR;
  while (world.nextSpawnY > targetY) {
    const altitude = world.startY - world.nextSpawnY;
    const p = nextPlatform(world.nextSpawnY, altitude, rng, world.idSeq++);
    world.platforms.push(p);
    world.nextSpawnY = p.y;
  }
}

export function step(world: World, targetX: number, rng: Rng): void {
  world.events = [];
  if (world.over) return;

  const dt = TUNING.dt;
  world.time += dt;
  const p = world.player;

  // steering: relative-drag target, wrapped into the world
  p.x = wrapX(targetX);

  // integrate vertical motion
  const footBefore = p.y + TUNING.playerR;
  p.vy += TUNING.gravity * dt;
  p.y += p.vy * dt;
  const footAfter = p.y + TUNING.playerR;

  // moving platforms oscillate
  for (const plat of world.platforms) {
    if (plat.amp > 0) plat.x = plat.baseX + Math.sin(world.time * plat.speed + plat.phase) * plat.amp;
  }

  // collision: only while falling, swept across this step's foot travel
  if (p.vy > 0) {
    for (const plat of world.platforms) {
      if (plat.broken) continue;
      if (footBefore <= plat.y && footAfter >= plat.y && overlapsX(p.x, plat)) {
        p.y = plat.y - TUNING.playerR;
        if (plat.kind === 'spring') {
          p.vy = TUNING.bounceVy * TUNING.springMultiplier;
          world.events.push('spring');
        } else {
          p.vy = TUNING.bounceVy;
          if (plat.kind === 'crumbling') {
            plat.broken = true;
            world.events.push('break');
          } else {
            world.events.push('bounce');
          }
        }
        break;
      }
    }
  }

  // camera: follow upward only
  world.cameraY = Math.min(world.cameraY, p.y - world.viewHeight * CAMERA_LINE);

  // altitude / score source
  world.maxAltitude = Math.max(world.maxAltitude, world.startY - p.y);

  // keep the board filled above, cull far below
  fillPlatforms(world, rng);
  const cullBelow = world.cameraY + world.viewHeight + CULL_MARGIN;
  world.platforms = world.platforms.filter((pl) => pl.y <= cullBelow);

  // death: fell below the view
  if (p.y - TUNING.playerR > world.cameraY + world.viewHeight) {
    world.over = true;
    world.events.push('gameover');
  }
}

export { JUMP_HEIGHT };

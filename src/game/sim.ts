import type { Rng } from '../core/rng';
import { nextPlatform, spawnExtras } from './spawner';
import { JUMP_HEIGHT, TUNING, type Enemy, type Platform, type World } from './types';

const SPAWN_AHEAD_FACTOR = 1.0; // keep one screen of platforms above the camera
const CULL_MARGIN = 120;
const CAMERA_LINE = 0.4; // player is held above 40% of the view

function wrapX(x: number): number {
  const w = TUNING.viewWidth;
  return ((x % w) + w) % w;
}

/** Signed shortest horizontal delta from `from` to `to` across the 0..viewWidth wrap seam. */
export function shortestWrapDelta(from: number, to: number): number {
  const w = TUNING.viewWidth;
  const d = (((to - from) % w) + w) % w; // 0..w
  return d > w / 2 ? d - w : d;          // (-w/2, w/2]
}

/** Horizontal overlap test that respects edge wrap-around. */
function overlapsX(px: number, plat: Platform): boolean {
  const half = plat.w / 2 + TUNING.playerR * 0.7;
  const dx = Math.abs(px - plat.x);
  return Math.min(dx, TUNING.viewWidth - dx) <= half;
}

/** Update the stomp combo + score bonus and record the kill for the score pop. */
function registerStomp(world: World, e: Enemy): void {
  world.combo = world.time <= world.comboEndsAt ? world.combo + 1 : 1;
  world.maxCombo = Math.max(world.maxCombo, world.combo);
  world.comboEndsAt = world.time + TUNING.comboWindow;
  const bonus = TUNING.stompBonus * world.combo;
  world.stompBonus += bonus;
  world.stompFx.push({ x: e.x, y: e.y, bonus, combo: world.combo });
}

/** Binary phantom visibility window — collision follows this exactly. */
export function phantomVisible(plat: Platform, time: number): boolean {
  const cycle = TUNING.phantomOn + TUNING.phantomOff;
  return (((time + plat.phase) % cycle) + cycle) % cycle < TUNING.phantomOn;
}

export function createWorld(rng: Rng, viewHeight: number): World {
  const startY = 0;
  const start: Platform = {
    id: 0, kind: 'static', x: TUNING.viewWidth / 2, y: startY + 60,
    w: TUNING.platformW, baseX: TUNING.viewWidth / 2, amp: 0, speed: 0, phase: 0, broken: false,
  };
  const startCameraY = startY + 60 - viewHeight * (1 - CAMERA_LINE);
  const world: World = {
    player: {
      x: TUNING.viewWidth / 2,
      y: startY,
      vy: TUNING.bounceVy,
      prevX: TUNING.viewWidth / 2,
      prevY: startY,
      boostT: 0,
    },
    platforms: [start],
    pickups: [],
    enemies: [],
    combo: 0,
    maxCombo: 0,
    stompBonus: 0,
    comboEndsAt: 0,
    stompFx: [],
    // places the start platform ~60% down the view; the follow rule takes over from the first step
    cameraY: startCameraY,
    prevCameraY: startCameraY,
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
    const prevY = world.nextSpawnY;
    const altitude = world.startY - prevY;
    const p = nextPlatform(prevY, altitude, rng, world.idSeq++);
    world.platforms.push(p);
    world.nextSpawnY = p.y;
    const extras = spawnExtras(p, prevY, altitude, rng, world.idSeq++, world.idSeq++, world.idSeq++);
    if (extras.phantom) world.platforms.push(extras.phantom);
    if (extras.pickup) world.pickups.push(extras.pickup);
    if (extras.enemy) world.enemies.push(extras.enemy);
  }
}

export function step(world: World, targetX: number, rng: Rng): void {
  world.events = [];
  world.stompFx = [];
  if (world.over) return;

  const dt = TUNING.dt;
  world.time += dt;
  const p = world.player;
  p.prevX = p.x;
  p.prevY = p.y;
  world.prevCameraY = world.cameraY;

  // steering: ease toward the wrapped drag target (smoothing keeps it fluid but still precise)
  p.x = wrapX(p.x + shortestWrapDelta(p.x, wrapX(targetX)) * TUNING.steerSmoothing);

  // integrate vertical motion (jetpack boost overrides gravity + collision)
  let footBefore = p.y + TUNING.playerR;
  if (p.boostT > 0) {
    p.boostT = Math.max(0, p.boostT - dt);
    p.vy = TUNING.boostVy;
    p.y += p.vy * dt;
  } else {
    p.vy += TUNING.gravity * dt;
    p.y += p.vy * dt;
  }
  const footAfter = p.y + TUNING.playerR;

  // moving platforms oscillate
  for (const plat of world.platforms) {
    if (plat.amp > 0) plat.x = plat.baseX + Math.sin(world.time * plat.speed + plat.phase) * plat.amp;
  }

  // enemies patrol horizontally (mirrors moving platforms)
  for (const e of world.enemies) {
    if (!e.dead && e.amp > 0) e.x = e.baseX + Math.sin(world.time * e.speed + e.phase) * e.amp;
  }

  // collision: only while falling and not boosting; among all platforms crossed
  // by this step's foot sweep, land on the topmost (smallest y) — first contact.
  if (p.vy > 0 && p.boostT === 0) {
    let hit: Platform | null = null;
    for (const plat of world.platforms) {
      if (plat.broken) continue;
      if (plat.kind === 'phantom' && !phantomVisible(plat, world.time)) continue;
      if (footBefore <= plat.y && footAfter >= plat.y && overlapsX(p.x, plat)) {
        if (hit === null || plat.y < hit.y) hit = plat;
      }
    }
    if (hit) {
      p.y = hit.y - TUNING.playerR;
      if (hit.kind === 'spring') {
        p.vy = TUNING.bounceVy * TUNING.springMultiplier;
        world.events.push('spring');
      } else {
        p.vy = TUNING.bounceVy;
        if (hit.kind === 'crumbling') {
          hit.broken = true;
          world.events.push('break');
        } else {
          world.events.push('bounce');
        }
      }
    }
  }

  // pickups: circle overlap (wrap-aware), grants a jetpack boost
  for (const pk of world.pickups) {
    if (pk.taken) continue;
    const dxr = Math.abs(p.x - pk.x);
    const dx = Math.min(dxr, TUNING.viewWidth - dxr);
    const dy = p.y - pk.y;
    const rr = TUNING.playerR + TUNING.pickupR;
    if (dx * dx + dy * dy <= rr * rr) {
      pk.taken = true;
      p.boostT = TUNING.boostDuration;
      world.events.push('boost');
    }
  }

  // enemies: stomp (foot swept onto the top while falling) kills + bounces; an active boost
  // plows through; any other body contact ends the run. Foot-sweep (not an end-position point
  // test) so a fast fall can't tunnel and a same-step platform bounce can't mask a valid stomp.
  for (const e of world.enemies) {
    if (e.dead || world.over) continue;
    const dxr = Math.abs(p.x - e.x);
    const dx = Math.min(dxr, TUNING.viewWidth - dxr);
    const rr = TUNING.playerR + TUNING.enemyR;
    const enemyTop = e.y - TUNING.enemyR;
    const dy = p.y - e.y;
    const bodyHit = dx * dx + dy * dy <= rr * rr;
    if (p.boostT > 0) {
      if (bodyHit) {
        e.dead = true;
        world.events.push('stomp');
        registerStomp(world, e);
      }
    } else if (dx <= rr && footBefore <= enemyTop && footAfter >= enemyTop) {
      e.dead = true;
      p.y = enemyTop - TUNING.playerR;
      p.vy = TUNING.stompVy;
      world.events.push('stomp');
      registerStomp(world, e);
    } else if (bodyHit) {
      world.over = true;
      world.events.push('gameover');
    }
  }

  // camera: follow upward only
  world.cameraY = Math.min(world.cameraY, p.y - world.viewHeight * CAMERA_LINE);

  // altitude / score source
  world.maxAltitude = Math.max(world.maxAltitude, world.startY - p.y);

  // keep the board filled above, cull far below
  fillPlatforms(world, rng);
  const cullBelow = world.cameraY + world.viewHeight + CULL_MARGIN;
  world.platforms = world.platforms.filter((pl) => pl.y <= cullBelow && !pl.broken);
  world.pickups = world.pickups.filter((pk) => pk.y <= cullBelow && !pk.taken);
  world.enemies = world.enemies.filter((e) => !e.dead && e.y <= cullBelow);

  // death: fell below the view
  if (p.y - TUNING.playerR > world.cameraY + world.viewHeight) {
    world.over = true;
    world.events.push('gameover');
  }
}

/**
 * Resume a dead run in place (Free-mode revive). Deterministic: a pure function of world state.
 * Reuses the jetpack boost for a safe re-entry — invulnerable upward flight back into the
 * reachable platform field. Preserves all score-bearing state (maxAltitude, stompBonus, combo).
 */
export function revive(world: World): void {
  world.over = false;
  const p = world.player;
  p.y = world.cameraY + world.viewHeight * 0.5; // mid-view, above the death line
  p.prevY = p.y; // collapse interpolation so the render doesn't streak from the old position
  p.vy = 0;
  p.boostT = TUNING.boostDuration; // invulnerable upward flight clears hazards + reaches platforms
  world.events = []; // don't replay the 'gameover' event
  world.stompFx = [];
}

export { JUMP_HEIGHT };

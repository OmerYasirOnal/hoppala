import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../src/core/rng';
import { createWorld, step } from '../src/game/sim';
import { TUNING, type Platform } from '../src/game/types';

const VIEW_H = 700;

function world(seed = 1) {
  return createWorld(mulberry32(seed), VIEW_H);
}

function plat(over: Partial<Platform>): Platform {
  return { id: 999, kind: 'static', x: 200, y: 0, w: 68, baseX: 200, amp: 0, speed: 0, phase: 0, broken: false, ...over };
}

describe('createWorld', () => {
  it('starts with a platform under the player and prefills one screen of platforms', () => {
    const w = world();
    expect(w.platforms.length).toBeGreaterThan(3);
    const start = w.platforms[0]!;
    expect(Math.abs(start.x - w.player.x)).toBeLessThan(1);
    expect(start.y).toBeGreaterThan(w.player.y);
    expect(w.over).toBe(false);
  });
});

describe('step physics', () => {
  it('bounces only when falling onto a platform top', () => {
    const w = world();
    w.platforms = [plat({ y: w.player.y + 40 })];
    w.player.vy = -100; // rising through — no bounce
    step(w, w.player.x, mulberry32(2));
    expect(w.events).not.toContain('bounce');
    // now place the player just above and falling
    w.player.y = w.platforms[0]!.y - TUNING.playerR - 1;
    w.player.vy = 300;
    let bounced = false;
    for (let i = 0; i < 10 && !bounced; i++) {
      step(w, w.player.x, mulberry32(3));
      bounced = w.events.includes('bounce');
    }
    expect(bounced).toBe(true);
    expect(w.player.vy).toBe(TUNING.bounceVy);
  });

  it('spring pads multiply the impulse and emit "spring"', () => {
    const w = world();
    w.platforms = [plat({ kind: 'spring', y: w.player.y + 30 })];
    w.player.y = w.platforms[0]!.y - TUNING.playerR - 1;
    w.player.vy = 300;
    let ev = false;
    for (let i = 0; i < 10 && !ev; i++) {
      step(w, w.player.x, mulberry32(4));
      ev = w.events.includes('spring');
    }
    expect(ev).toBe(true);
    expect(w.player.vy).toBeCloseTo(TUNING.bounceVy * TUNING.springMultiplier, 5);
  });

  it('crumbling platforms break after one bounce and stop colliding', () => {
    const w = world();
    const c = plat({ kind: 'crumbling', y: 0 });
    w.platforms = [c];
    w.player.y = -TUNING.playerR - 1;
    w.player.vy = 300;
    let broke = false;
    for (let i = 0; i < 10 && !broke; i++) {
      step(w, w.player.x, mulberry32(5));
      broke = w.events.includes('break');
    }
    expect(broke).toBe(true);
    expect(c.broken).toBe(true);
    // falling again through the broken platform: no bounce
    w.player.y = -TUNING.playerR - 1;
    w.player.vy = 300;
    w.events = [];
    for (let i = 0; i < 10; i++) step(w, w.player.x, mulberry32(6));
    expect(w.events).not.toContain('bounce');
  });

  it('wraps horizontally', () => {
    const w = world();
    step(w, -5, mulberry32(7));
    expect(w.player.x).toBeCloseTo(TUNING.viewWidth - 5, 5);
    step(w, TUNING.viewWidth + 12, mulberry32(8));
    expect(w.player.x).toBeCloseTo(12, 5);
  });

  it('camera follows up but never scrolls down', () => {
    const w = world();
    const before = w.cameraY;
    w.player.y = w.cameraY + 0.2 * VIEW_H; // high on screen
    step(w, w.player.x, mulberry32(9));
    const raised = w.cameraY;
    expect(raised).toBeLessThan(before);
    w.player.y = w.cameraY + VIEW_H * 0.9; // low on screen
    step(w, w.player.x, mulberry32(10));
    expect(w.cameraY).toBe(raised);
  });

  it('keeps the board reachable while climbing (spawn integration)', () => {
    const w = world(42);
    // force a long climb by teleporting the camera up repeatedly
    for (let i = 0; i < 200; i++) {
      w.player.y = w.cameraY + 0.1 * VIEW_H;
      w.player.vy = 0;
      step(w, w.player.x, mulberry32(11));
    }
    const ys = w.platforms.map((p) => p.y).sort((a, b) => b - a);
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i - 1]! - ys[i]!).toBeLessThanOrEqual(TUNING.maxGapFactor * ((TUNING.bounceVy * TUNING.bounceVy) / (2 * TUNING.gravity)) + 1e-6);
    }
  });

  it('ends the run when the player falls below the view and emits gameover once', () => {
    const w = world();
    w.platforms = []; // nothing to land on
    let i = 0;
    while (!w.over && i++ < 2000) step(w, w.player.x, mulberry32(12));
    expect(w.over).toBe(true);
    expect(w.events).toContain('gameover');
    const alt = w.maxAltitude;
    step(w, w.player.x, mulberry32(13)); // stepping a finished world is a no-op
    expect(w.maxAltitude).toBe(alt);
  });

  it('is deterministic: same seed + same input script → same result', () => {
    const run = () => {
      const w = world(777);
      for (let i = 0; i < 600; i++) step(w, 200, mulberry32(777 + i));
      return { alt: w.maxAltitude, n: w.platforms.length, over: w.over };
    };
    expect(run()).toEqual(run());
  });

  it('maxAltitude never decreases', () => {
    const w = world(3);
    let prev = 0;
    for (let i = 0; i < 300; i++) {
      step(w, 200, mulberry32(3));
      expect(w.maxAltitude).toBeGreaterThanOrEqual(prev);
      prev = w.maxAltitude;
    }
  });
});

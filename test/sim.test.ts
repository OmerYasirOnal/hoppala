import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../src/core/rng';
import { createWorld, step, phantomVisible } from '../src/game/sim';
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

  it('tracks previous positions for render interpolation', () => {
    const w = world();
    const x0 = w.player.x;
    const y0 = w.player.y;
    const cam0 = w.cameraY;
    step(w, x0, mulberry32(30));
    expect(w.player.prevX).toBe(x0);
    expect(w.player.prevY).toBe(y0);
    expect(w.prevCameraY).toBe(cam0);
  });

  it('lands on the first platform crossed in a fast sweep, not the lowest', () => {
    const w = world();
    w.platforms = [plat({ y: 50, x: 200 }), plat({ y: 20, x: 200 })];
    w.player.x = 200;
    w.player.y = 3; // foot at 19, just above the higher platform (y=20)
    w.player.vy = 2400; // one frame's fall spans both platforms
    step(w, 200, mulberry32(21));
    expect(w.events).toContain('bounce');
    expect(w.player.y).toBeCloseTo(20 - TUNING.playerR, 5);
  });
});

describe('v1.1 content', () => {
  it('phantoms collide only during their ON window', () => {
    const w = world();
    const ph = plat({ kind: 'phantom', y: 40, phase: 0 });
    w.platforms = [ph];
    // world.time starts at 0; after one step time=dt (<1.6s) → ON
    w.player.y = 40 - TUNING.playerR - 1;
    w.player.vy = 300;
    let bounced = false;
    for (let i = 0; i < 5 && !bounced; i++) {
      step(w, w.player.x, mulberry32(41));
      bounced = w.events.includes('bounce');
    }
    expect(bounced).toBe(true);
    // now force the OFF window and try again
    const w2 = world();
    const off = plat({ kind: 'phantom', y: 40, phase: TUNING.phantomOn + 0.1 }); // starts OFF
    w2.platforms = [off];
    w2.player.y = 40 - TUNING.playerR - 1;
    w2.player.vy = 300;
    step(w2, w2.player.x, mulberry32(42));
    expect(w2.events).not.toContain('bounce');
    expect(phantomVisible(off, 0.01)).toBe(false);
    expect(phantomVisible(ph, 0.01)).toBe(true);
  });

  it('collecting a pickup emits boost once and drives an ascent without collisions', () => {
    const w = world();
    w.platforms = [plat({ y: 200 })];
    w.pickups = [{ id: 9, x: w.player.x, y: w.player.y - 10, taken: false }];
    step(w, w.player.x, mulberry32(43));
    expect(w.events).toContain('boost');
    expect(w.pickups.every((pk) => pk.taken)).toBe(true);
    expect(w.player.boostT).toBeGreaterThan(0);
    // during boost: rises at boostVy and ignores platforms directly below? (none in path)
    const yBefore = w.player.y;
    step(w, w.player.x, mulberry32(44));
    expect(w.events).not.toContain('boost'); // once only
    expect(w.player.y).toBeLessThan(yBefore);
    expect(w.player.vy).toBe(TUNING.boostVy);
  });

  it('boost expires after boostDuration and normal physics resume', () => {
    const w = world();
    w.platforms = [];
    w.pickups = [];
    w.player.boostT = TUNING.boostDuration;
    const steps = Math.ceil(TUNING.boostDuration / TUNING.dt) + 2;
    for (let i = 0; i < steps; i++) step(w, w.player.x, mulberry32(45));
    expect(w.player.boostT).toBe(0);
    // gravity is acting again: vy grows more positive over subsequent steps
    const vy1 = w.player.vy;
    step(w, w.player.x, mulberry32(46));
    expect(w.player.vy).toBeGreaterThan(vy1);
  });

  it('seeded worlds now also spawn pickups/phantoms deterministically', () => {
    const run = () => {
      const w = world(4242);
      for (let i = 0; i < 400; i++) step(w, 200, mulberry32(4242 + i));
      return {
        alt: w.maxAltitude,
        plats: w.platforms.length,
        picks: w.pickups.length,
      };
    };
    expect(run()).toEqual(run());
  });
});

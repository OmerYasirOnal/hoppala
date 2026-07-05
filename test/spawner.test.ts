import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../src/core/rng';
import { difficultyAt, nextPlatform, spawnExtras } from '../src/game/spawner';
import { JUMP_HEIGHT, TUNING, type Pickup, type Enemy } from '../src/game/types';

describe('difficultyAt', () => {
  const samples = Array.from({ length: 41 }, (_, i) => i * 500); // 0..20000 px

  it('caps every vertical gap below the reachability limit', () => {
    for (const a of samples) {
      const d = difficultyAt(a);
      expect(d.gapMax).toBeLessThanOrEqual(TUNING.maxGapFactor * JUMP_HEIGHT);
      expect(d.gapMin).toBeGreaterThan(0);
      expect(d.gapMin).toBeLessThan(d.gapMax);
    }
  });

  it('is monotonic: gaps/ratios never decrease, width never increases', () => {
    for (let i = 1; i < samples.length; i++) {
      const lo = difficultyAt(samples[i - 1]!);
      const hi = difficultyAt(samples[i]!);
      expect(hi.gapMax).toBeGreaterThanOrEqual(lo.gapMax);
      expect(hi.movingRatio).toBeGreaterThanOrEqual(lo.movingRatio);
      expect(hi.crumblingRatio).toBeGreaterThanOrEqual(lo.crumblingRatio);
      expect(hi.platformW).toBeLessThanOrEqual(lo.platformW);
    }
  });

  it('introduces kinds at the spec altitudes (spring ~800, moving ~1500, crumbling ~3000)', () => {
    expect(difficultyAt(700).springRatio).toBe(0);
    expect(difficultyAt(900).springRatio).toBeGreaterThan(0);
    expect(difficultyAt(1400).movingRatio).toBe(0);
    expect(difficultyAt(2000).movingRatio).toBeGreaterThan(0);
    expect(difficultyAt(2900).crumblingRatio).toBe(0);
    expect(difficultyAt(4000).crumblingRatio).toBeGreaterThan(0);
  });
});

describe('nextPlatform', () => {
  it('never places an unreachable platform (1000 seeded spawns across altitudes)', () => {
    const rng = mulberry32(1234);
    let prevY = 0;
    for (let i = 0; i < 1000; i++) {
      const altitude = i * 20;
      const p = nextPlatform(prevY, altitude, rng, i);
      const gap = prevY - p.y;
      expect(gap).toBeGreaterThan(0);
      expect(gap).toBeLessThanOrEqual(TUNING.maxGapFactor * JUMP_HEIGHT + 1e-9);
      expect(p.x - p.w / 2).toBeGreaterThanOrEqual(-1e-9);
      expect(p.x + p.w / 2).toBeLessThanOrEqual(TUNING.viewWidth + 1e-9);
      prevY = p.y;
    }
  });

  it('moving platforms keep their oscillation inside the viewport', () => {
    const rng = mulberry32(99);
    for (let i = 0; i < 500; i++) {
      const p = nextPlatform(0, 10000, rng, i); // high altitude → moving possible
      if (p.kind === 'moving') {
        expect(p.baseX - p.amp - p.w / 2).toBeGreaterThanOrEqual(-1e-9);
        expect(p.baseX + p.amp + p.w / 2).toBeLessThanOrEqual(TUNING.viewWidth + 1e-9);
        expect(p.amp).toBeGreaterThan(0);
      }
    }
  });

  it('produces every kind at high altitude with a seeded rng', () => {
    const rng = mulberry32(5);
    const kinds = new Set<string>();
    for (let i = 0; i < 400; i++) kinds.add(nextPlatform(0, 12000, rng, i).kind);
    expect(kinds).toEqual(new Set(['static', 'moving', 'crumbling', 'spring']));
  });
});

describe('phantom difficulty', () => {
  it('ramps phantomRatio monotonically from 5000px, capped at 0.25', () => {
    expect(difficultyAt(4900).phantomRatio).toBe(0);
    expect(difficultyAt(6000).phantomRatio).toBeGreaterThan(0);
    let prev = 0;
    for (let a = 0; a <= 20000; a += 500) {
      const r = difficultyAt(a).phantomRatio;
      expect(r).toBeGreaterThanOrEqual(prev);
      expect(r).toBeLessThanOrEqual(0.25);
      prev = r;
    }
  });

  it('keeps the main chain solid: nextPlatform never yields a phantom', () => {
    const rng = mulberry32(77);
    for (let i = 0; i < 600; i++) {
      expect(nextPlatform(0, 20000, rng, i).kind).not.toBe('phantom');
    }
  });
});

describe('spawnExtras', () => {
  const main = (y: number, kind: 'static' | 'spring' = 'static') => ({
    id: 1, kind, x: 200, y, w: 68, baseX: 200, amp: 0, speed: 0, phase: 0, broken: false,
  });

  it('places phantoms inside the viewport at 0.35–0.65 of the last gap', () => {
    const rng = mulberry32(5);
    let seen = 0;
    for (let i = 0; i < 400 && seen < 30; i++) {
      const prevY = 0;
      const m = main(-150); // last gap = 150
      const { phantom } = spawnExtras(m, prevY, 20000, rng, 1000 + i, 2000 + i);
      if (!phantom) continue;
      seen++;
      expect(phantom.kind).toBe('phantom');
      const offset = prevY - phantom.y;
      expect(offset).toBeGreaterThanOrEqual(150 * 0.35 - 1e-9);
      expect(offset).toBeLessThanOrEqual(150 * 0.65 + 1e-9);
      expect(phantom.x - phantom.w / 2).toBeGreaterThanOrEqual(-1e-9);
      expect(phantom.x + phantom.w / 2).toBeLessThanOrEqual(400 + 1e-9);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('never spawns phantoms below the 5000px onset', () => {
    const rng = mulberry32(6);
    for (let i = 0; i < 300; i++) {
      expect(spawnExtras(main(-150), 0, 4000, rng, i, i).phantom).toBeNull();
    }
  });

  it('spawns boost pickups only on static platforms, from 2000px, centered on top', () => {
    const rngNever = mulberry32(9);
    for (let i = 0; i < 300; i++) {
      expect(spawnExtras(main(-150, 'spring'), 0, 20000, rngNever, i, i).pickup).toBeNull();
    }
    const rng = mulberry32(10);
    let found = 0;
    for (let i = 0; i < 600 && found < 5; i++) {
      const m = main(-150);
      const { pickup } = spawnExtras(m, 0, 3000, rng, i, 5000 + i);
      if (!pickup) continue;
      found++;
      expect(pickup.x).toBe(m.x);
      expect(pickup.y).toBeLessThan(m.y);
      expect(pickup.taken).toBe(false);
    }
    expect(found).toBeGreaterThan(0);
    const rngLow = mulberry32(11);
    for (let i = 0; i < 300; i++) {
      expect(spawnExtras(main(-150), 0, 1500, rngLow, i, i).pickup).toBeNull();
    }
  });
});

describe('enemy spawning', () => {
  const main = (y: number) => ({ id: 1, kind: 'static' as const, x: 200, y, w: 68, baseX: 200, amp: 0, speed: 0, phase: 0, broken: false });

  it('ramps enemyRatio from 1000px, capped at 0.15', () => {
    expect(difficultyAt(900).enemyRatio).toBe(0);
    expect(difficultyAt(2000).enemyRatio).toBeGreaterThan(0);
    let prev = 0;
    for (let a = 0; a <= 20000; a += 500) {
      const r = difficultyAt(a).enemyRatio;
      expect(r).toBeGreaterThanOrEqual(prev);
      expect(r).toBeLessThanOrEqual(0.15);
      prev = r;
    }
  });

  it('never spawns enemies below the 1000px onset', () => {
    const rng = mulberry32(6);
    for (let i = 0; i < 300; i++) {
      expect(spawnExtras(main(-150), 0, 500, rng, i, i, i).enemy).toBeNull();
    }
  });

  it('spawns enemies mid-gap (0.4–0.7 of the last gap), inside the viewport, above the platform', () => {
    const rng = mulberry32(5);
    let seen = 0;
    for (let i = 0; i < 800 && seen < 20; i++) {
      const m = main(-150); // last gap 150 (prevY 0 → mainPlat.y -150)
      const { enemy } = spawnExtras(m, 0, 20000, rng, 1000 + i, 2000 + i, 3000 + i) as { enemy: Enemy | null };
      if (!enemy) continue;
      seen++;
      const offset = 0 - enemy.y; // above prevY=0
      expect(offset).toBeGreaterThanOrEqual(150 * 0.4 - 1e-9);
      expect(offset).toBeLessThanOrEqual(150 * 0.7 + 1e-9);
      expect(enemy.y).toBeGreaterThan(m.y); // in the gap, below the next chain platform (not on its landing spot)
      expect(enemy.x - TUNING.enemyR).toBeGreaterThanOrEqual(-1e-9);
      expect(enemy.x + TUNING.enemyR).toBeLessThanOrEqual(TUNING.viewWidth + 1e-9);
      expect(enemy.dead).toBe(false);
    }
    expect(seen).toBeGreaterThan(0);
  });
});

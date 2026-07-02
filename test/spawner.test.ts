import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../src/core/rng';
import { difficultyAt, nextPlatform } from '../src/game/spawner';
import { JUMP_HEIGHT, TUNING } from '../src/game/types';

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

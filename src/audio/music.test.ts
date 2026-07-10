import { describe, it, expect } from 'vitest';
import { zoneRootHz } from './music';

describe('zoneRootHz', () => {
  it('zone 0 is the base root', () => {
    expect(zoneRootHz(0, 100)).toBeCloseTo(100, 5);
  });

  it('rises monotonically as the player climbs the zones', () => {
    const roots = Array.from({ length: 8 }, (_, i) => zoneRootHz(i, 100));
    for (let i = 1; i < roots.length; i++) {
      expect(roots[i]!).toBeGreaterThan(roots[i - 1]!);
    }
  });

  it('maps semitone offsets by equal temperament (e.g. +12 → octave)', () => {
    // ZONE_SEMITONES[5] === 12 → exactly one octave above base
    expect(zoneRootHz(5, 100)).toBeCloseTo(200, 5);
  });

  it('clamps out-of-range indices to the valid zone span', () => {
    expect(zoneRootHz(-3, 100)).toBeCloseTo(zoneRootHz(0, 100), 5);
    expect(zoneRootHz(99, 100)).toBeCloseTo(zoneRootHz(7, 100), 5);
  });
});

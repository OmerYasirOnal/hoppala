import { describe, expect, it } from 'vitest';
import { ZONES, zoneIndexAt, zoneProgress } from '../src/game/zones';

describe('ZONES', () => {
  it('is 8 zones, ascending, first at 0', () => {
    expect(ZONES.length).toBe(8);
    expect(ZONES[0]!.meters).toBe(0);
    for (let i = 1; i < ZONES.length; i++) expect(ZONES[i]!.meters).toBeGreaterThan(ZONES[i - 1]!.meters);
  });
});

describe('zoneIndexAt', () => {
  it('maps meters to the highest reached zone, clamped', () => {
    expect(zoneIndexAt(-10)).toBe(0);
    expect(zoneIndexAt(0)).toBe(0);
    expect(zoneIndexAt(99)).toBe(0);
    expect(zoneIndexAt(100)).toBe(1);
    expect(zoneIndexAt(700)).toBe(4);
    expect(zoneIndexAt(2500)).toBe(7);
    expect(zoneIndexAt(999999)).toBe(7);
  });
});

describe('zoneProgress', () => {
  it('is 0 at a boundary, ~1 approaching the next, and 1 in the last zone', () => {
    expect(zoneProgress(0)).toBe(0);
    expect(zoneProgress(50)).toBeCloseTo(0.5, 5); // between 0 and 100
    expect(zoneProgress(100)).toBe(0);
    expect(zoneProgress(2500)).toBe(1);
    expect(zoneProgress(9999)).toBe(1);
  });
});

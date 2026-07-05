import { describe, it, expect } from 'vitest';
import { trailLayout } from '../src/ui/trail';

const OPTS = { width: 320, vSpacing: 66, margin: 46 };

describe('trailLayout', () => {
  it('returns exactly `count` nodes', () => {
    expect(trailLayout(9, OPTS)).toHaveLength(9);
  });
  it('stacks nodes upward: y strictly decreases as index increases', () => {
    const n = trailLayout(9, OPTS);
    for (let i = 1; i < n.length; i++) expect(n[i]!.y).toBeLessThan(n[i - 1]!.y);
  });
  it('index 0 is the bottom (largest y), last index is the top (smallest y)', () => {
    const n = trailLayout(9, OPTS);
    expect(n[0]!.y).toBe(Math.max(...n.map((k) => k.y)));
    expect(n[8]!.y).toBe(Math.min(...n.map((k) => k.y)));
  });
  it('sides alternate left/right starting left', () => {
    const n = trailLayout(9, OPTS);
    expect(n[0]!.side).toBe('left');
    expect(n[1]!.side).toBe('right');
    expect(n[2]!.side).toBe('left');
  });
  it('keeps every x within the width and left<centre<right', () => {
    const n = trailLayout(9, OPTS);
    for (const k of n) {
      expect(k.x).toBeGreaterThan(0);
      expect(k.x).toBeLessThan(OPTS.width);
    }
    expect(n[0]!.x).toBeLessThan(OPTS.width / 2); // left lane
    expect(n[1]!.x).toBeGreaterThan(OPTS.width / 2); // right lane
  });
  it('is deterministic', () => {
    expect(trailLayout(9, OPTS)).toEqual(trailLayout(9, OPTS));
  });
});

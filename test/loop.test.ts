import { describe, it, expect } from 'vitest';
import { advance } from '../src/core/loop';

describe('advance (fixed-timestep accumulator)', () => {
  it('emits whole steps and keeps the remainder', () => {
    const r = advance(0, 0.035, 1 / 60);
    expect(r.steps).toBe(2);
    expect(r.acc).toBeCloseTo(0.035 - 2 / 60, 6);
  });
  it('clamps huge frame gaps (tab sleep) to maxFrame', () => {
    const r = advance(0, 5, 1 / 60, 0.25);
    expect(r.steps).toBe(15);
  });
  it('accumulates across frames', () => {
    let acc = 0;
    let total = 0;
    for (let i = 0; i < 6; i++) {
      const r = advance(acc, 0.01, 1 / 60);
      acc = r.acc;
      total += r.steps;
    }
    expect(total).toBe(3);
  });
});

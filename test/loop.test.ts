import { describe, it, expect, vi } from 'vitest';
import { advance, createLoop } from '../src/core/loop';

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
  it('returns zero steps for a non-positive dt instead of looping forever', () => {
    expect(advance(0.5, 0.1, 0)).toEqual({ steps: 0, acc: 0.5 });
    expect(advance(0.5, 0.1, -1)).toEqual({ steps: 0, acc: 0.5 });
  });
});

describe('createLoop', () => {
  it('start() is idempotent — a second call never schedules a duplicate frame', () => {
    const raf = vi.fn(() => 1);
    const caf = vi.fn();
    vi.stubGlobal('requestAnimationFrame', raf);
    vi.stubGlobal('cancelAnimationFrame', caf);
    try {
      const loop = createLoop({ update: () => {}, render: () => {} });
      loop.start();
      loop.start(); // no-op while running
      expect(raf).toHaveBeenCalledTimes(1);
      loop.stop();
      loop.start(); // restart allowed after stop
      expect(raf).toHaveBeenCalledTimes(2);
      loop.stop();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

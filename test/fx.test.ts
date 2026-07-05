import { describe, it, expect } from 'vitest';
import { particleAt, shakeEnvelope, shakeOffset, easeOutPulse, platformPalette, type Particle } from '../src/render/fx';

const P = (over: Partial<Particle> = {}): Particle => ({
  x0: 100, y0: 200, vx: 50, vy: -80, spawnTime: 1, life: 0.5, size: 3, color: '#fff', gravity: 600, ...over,
});

describe('particleAt', () => {
  it('is at the origin, fully opaque, alive at age 0', () => {
    const s = particleAt(P(), 1);
    expect(s.x).toBeCloseTo(100);
    expect(s.y).toBeCloseTo(200);
    expect(s.alpha).toBeCloseTo(1);
    expect(s.dead).toBe(false);
  });
  it('advances x linearly by vx*age', () => {
    const s = particleAt(P({ gravity: 0 }), 1.2); // age 0.2
    expect(s.x).toBeCloseTo(100 + 50 * 0.2);
  });
  it('reports a stale (negative-age) particle as dead so the draw loop culls it', () => {
    // e.g. a particle from a previous run whose spawnTime is ahead of the new run's world.time
    const s = particleAt(P(), 0.5); // time 0.5 < spawnTime 1 → age -0.5
    expect(s.dead).toBe(true);
    expect(s.alpha).toBe(0);
  });
  it('curves y downward under positive gravity (y-down world)', () => {
    const straight = particleAt(P({ vy: 0, gravity: 0 }), 1.3).y;
    const gravId = particleAt(P({ vy: 0, gravity: 600 }), 1.3).y;
    expect(gravId).toBeGreaterThan(straight);
  });
  it('fades alpha 1 -> 0 across life and dies past it', () => {
    expect(particleAt(P(), 1.25).alpha).toBeCloseTo(0.5); // half of 0.5s life
    expect(particleAt(P(), 1.5).alpha).toBeCloseTo(0);
    expect(particleAt(P(), 1.6).dead).toBe(true);
  });
});

describe('shakeEnvelope', () => {
  it('starts at amp and decays monotonically to zero', () => {
    expect(shakeEnvelope(6, 0)).toBeCloseTo(6);
    expect(shakeEnvelope(6, 0.1)).toBeLessThan(shakeEnvelope(6, 0));
    expect(shakeEnvelope(6, 0.2)).toBeLessThan(shakeEnvelope(6, 0.1));
    expect(shakeEnvelope(6, 0.32)).toBe(0);
    expect(shakeEnvelope(6, 1)).toBe(0);
  });
});

describe('shakeOffset', () => {
  it('never exceeds amp on either axis and is zero past the window', () => {
    for (let age = 0; age < 0.32; age += 0.02) {
      const o = shakeOffset(6, age);
      expect(Math.abs(o.dx)).toBeLessThanOrEqual(6 + 1e-9);
      expect(Math.abs(o.dy)).toBeLessThanOrEqual(6 + 1e-9);
    }
    expect(shakeOffset(6, 0.4)).toEqual({ dx: 0, dy: 0 });
  });
});

describe('easeOutPulse', () => {
  it('is 1 at age 0, 0 at/after the window, and monotonic between', () => {
    expect(easeOutPulse(0)).toBeCloseTo(1);
    expect(easeOutPulse(0.18)).toBe(0);
    expect(easeOutPulse(0.25)).toBe(0);
    expect(easeOutPulse(0.05)).toBeGreaterThan(easeOutPulse(0.12));
  });
});

describe('platformPalette', () => {
  it('returns distinct body/top/edge and is deterministic', () => {
    const a = platformPalette([120, 200, 140], 'static');
    const b = platformPalette([120, 200, 140], 'static');
    expect(a).toEqual(b);
    expect(a.body).not.toBe(a.top);
    expect(a.top).not.toBe(a.edge);
  });
  it('tints toward the zone and differs by kind', () => {
    expect(platformPalette([120, 200, 140], 'moving')).not.toEqual(platformPalette([120, 200, 140], 'crumbling'));
  });
});

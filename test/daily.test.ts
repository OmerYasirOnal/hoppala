import { describe, it, expect } from 'vitest';
import { dateKey, dayNumber, dailySeed } from '../src/core/daily';

describe('daily', () => {
  it('formats the LOCAL date as YYYY-MM-DD', () => {
    expect(dateKey(new Date(2026, 6, 2, 15, 30))).toBe('2026-07-02');
    expect(dateKey(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05');
  });

  it('numbers days from the 2026-01-01 local epoch (= day 1)', () => {
    expect(dayNumber(new Date(2026, 0, 1, 12))).toBe(1);
    expect(dayNumber(new Date(2026, 0, 2, 0, 5))).toBe(2);
    expect(dayNumber(new Date(2026, 6, 2))).toBe(183);
  });

  it('derives a stable uint32 seed per local day, different across days', () => {
    const a1 = dailySeed(new Date(2026, 6, 2, 9));
    const a2 = dailySeed(new Date(2026, 6, 2, 23, 59));
    const b = dailySeed(new Date(2026, 6, 3, 0, 1));
    expect(a1).toBe(a2);
    expect(a1).not.toBe(b);
    expect(Number.isInteger(a1)).toBe(true);
    expect(a1).toBeGreaterThanOrEqual(0);
    expect(a1).toBeLessThan(2 ** 32);
  });
});

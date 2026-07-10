import { describe, it, expect } from 'vitest';
import { shouldOfferRevive } from './revive-policy';

describe('shouldOfferRevive', () => {
  it('offers in free mode on web (no native ad) when unused', () => {
    expect(shouldOfferRevive('free', 0, false, false)).toBe(true);
  });

  it('offers in free mode with a native ad that is ready', () => {
    expect(shouldOfferRevive('free', 0, true, true)).toBe(true);
  });

  it('withholds in free mode when the native ad is not ready (no dead-tap)', () => {
    expect(shouldOfferRevive('free', 0, true, false)).toBe(false);
  });

  it('never offers in daily mode, regardless of ad readiness', () => {
    expect(shouldOfferRevive('daily', 0, false, true)).toBe(false);
    expect(shouldOfferRevive('daily', 0, true, true)).toBe(false);
  });

  it('never offers after a revive has been used', () => {
    expect(shouldOfferRevive('free', 1, false, true)).toBe(false);
    expect(shouldOfferRevive('free', 1, true, true)).toBe(false);
  });
});

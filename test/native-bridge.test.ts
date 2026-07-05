import { describe, it, expect } from 'vitest';
import { hapticFor, shouldSubmitDaily, LEADERBOARDS } from '../src/platform/native-install';

describe('native-install: hapticFor', () => {
  it('maps every sim/UI event to its haptic kind', () => {
    expect(hapticFor('bounce')).toBe('impactLight');
    expect(hapticFor('spring')).toBe('impactMedium');
    expect(hapticFor('break')).toBe('impactLight');
    expect(hapticFor('boost')).toBe('impactMedium');
    expect(hapticFor('stomp')).toBe('impactMedium');
    expect(hapticFor('record')).toBe('notifySuccess');
    expect(hapticFor('gameover')).toBe('notifyError');
  });
});

describe('native-install: shouldSubmitDaily', () => {
  it('is true only when the run day matches today, false when stale or absent', () => {
    expect(shouldSubmitDaily(183, 183)).toBe(true);
    expect(shouldSubmitDaily(182, 183)).toBe(false);
    expect(shouldSubmitDaily(184, 183)).toBe(false);
    expect(shouldSubmitDaily(undefined, 183)).toBe(false);
  });
});

describe('native-install: LEADERBOARDS', () => {
  it('has exact leaderboard ids for free and daily modes', () => {
    expect(LEADERBOARDS.free).toBe('hoppala.free.best');
    expect(LEADERBOARDS.daily).toBe('hoppala.daily');
  });
});

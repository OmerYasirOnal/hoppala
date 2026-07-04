import { describe, expect, it } from 'vitest';
import { boardForRun, formatRank } from '../src/online/rank';

describe('boardForRun', () => {
  it('maps free to global and daily to d_<key>', () => {
    expect(boardForRun('free')).toBe('global');
    expect(boardForRun('daily', '2026-07-04')).toBe('d_2026-07-04');
    expect(boardForRun('daily')).toBe('global');
  });
});

describe('formatRank', () => {
  it('formats with locale grouping', () => {
    expect(formatRank({ rank: 123, total: 4532 }, 'en')).toBe('#123 / 4,532');
    expect(formatRank({ rank: 1, total: 12 }, 'tr')).toBe('#1 / 12');
  });
});

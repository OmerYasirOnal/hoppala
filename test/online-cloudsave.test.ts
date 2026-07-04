import { describe, expect, it } from 'vitest';
import { mergeCloudSave } from '../src/online/cloudsave';

const base = { name: 'A', best: 10, updatedAt: 100 };

describe('mergeCloudSave', () => {
  it('returns local when remote is null', () => {
    expect(mergeCloudSave(base, null)).toEqual(base);
  });
  it('takes the max best', () => {
    expect(mergeCloudSave({ ...base, best: 10 }, { name: 'B', best: 25, updatedAt: 50 }).best).toBe(25);
  });
  it('picks name from the newer save', () => {
    expect(mergeCloudSave({ ...base, name: 'Local', updatedAt: 200 }, { name: 'Remote', best: 0, updatedAt: 100 }).name).toBe('Local');
    expect(mergeCloudSave({ ...base, name: 'Local', updatedAt: 100 }, { name: 'Remote', best: 0, updatedAt: 200 }).name).toBe('Remote');
  });
  it('falls back to a non-empty name when the newer one is empty', () => {
    expect(mergeCloudSave({ ...base, name: '', updatedAt: 200 }, { name: 'Remote', best: 0, updatedAt: 100 }).name).toBe('Remote');
  });
  it('maxes dailyBest on matching key, newer wins on differing key', () => {
    const l = { ...base, updatedAt: 100, dailyBest: { key: '2026-07-04', score: 5 } };
    const r = { name: 'B', best: 0, updatedAt: 50, dailyBest: { key: '2026-07-04', score: 8 } };
    expect(mergeCloudSave(l, r).dailyBest).toEqual({ key: '2026-07-04', score: 8 });
    const r2 = { name: 'B', best: 0, updatedAt: 200, dailyBest: { key: '2026-07-05', score: 3 } };
    expect(mergeCloudSave(l, r2).dailyBest).toEqual({ key: '2026-07-05', score: 3 });
  });
});

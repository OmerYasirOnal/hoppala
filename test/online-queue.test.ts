import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enqueue, drain, peek } from '../src/online/queue';

function mockLocalStorage(store: Record<string, string> = {}) {
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
  });
  return store;
}

describe('online queue', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('enqueues and drains, clearing the queue', () => {
    mockLocalStorage();
    enqueue('global', 100);
    enqueue('d_2026-07-04', 50);
    expect(peek()).toEqual([{ board: 'global', score: 100 }, { board: 'd_2026-07-04', score: 50 }]);
    expect(drain()).toEqual([{ board: 'global', score: 100 }, { board: 'd_2026-07-04', score: 50 }]);
    expect(peek()).toEqual([]);
  });

  it('collapses to the max score per board', () => {
    mockLocalStorage();
    enqueue('global', 100);
    enqueue('global', 40);
    enqueue('global', 250);
    expect(peek()).toEqual([{ board: 'global', score: 250 }]);
  });

  it('survives corrupted / unavailable storage', () => {
    mockLocalStorage({ 'hoppala:pending': '{not json' });
    expect(peek()).toEqual([]);
    expect(() => enqueue('global', 10)).not.toThrow();
  });
});

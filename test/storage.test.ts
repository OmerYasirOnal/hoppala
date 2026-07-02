import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSave, saveBest, saveMuted, saveDailyBest } from '../src/storage';

function mockLocalStorage(store: Record<string, string> = {}) {
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
  });
  return store;
}

describe('storage', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('defaults when empty and roundtrips best + muted', () => {
    mockLocalStorage();
    expect(loadSave()).toEqual({ best: 0, muted: false });
    saveBest(123);
    saveMuted(true);
    expect(loadSave()).toEqual({ best: 123, muted: true });
  });

  it('survives corrupted JSON', () => {
    mockLocalStorage({ 'hoppala:v1': '{not json' });
    expect(loadSave()).toEqual({ best: 0, muted: false });
  });

  it('never throws when localStorage is unavailable (private mode)', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    });
    expect(loadSave()).toEqual({ best: 0, muted: false });
    expect(() => saveBest(5)).not.toThrow();
  });

  it('roundtrips dailyBest additively and tolerates legacy saves', () => {
    const store = mockLocalStorage({ 'hoppala:v1': JSON.stringify({ best: 42, muted: true }) });
    expect(loadSave()).toEqual({ best: 42, muted: true });
    saveDailyBest('2026-07-02', 133);
    expect(loadSave()).toEqual({ best: 42, muted: true, dailyBest: { key: '2026-07-02', score: 133 } });
    expect(JSON.parse(store['hoppala:v1']!).best).toBe(42);
  });

  it('drops a malformed dailyBest instead of crashing', () => {
    mockLocalStorage({ 'hoppala:v1': JSON.stringify({ best: 1, muted: false, dailyBest: 'nope' }) });
    expect(loadSave()).toEqual({ best: 1, muted: false });
  });
});

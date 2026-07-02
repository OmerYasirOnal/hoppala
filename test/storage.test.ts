import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSave, saveBest, saveMuted } from '../src/storage';

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
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSave, saveBest, saveMuted, saveDailyBest, saveName, saveOnboarded, saveLang, saveHaptics, resetSave, toCloudSave, writeCloudSave, saveSensitivity, saveMaxZone } from '../src/storage';

function mockLocalStorage(store: Record<string, string> = {}) {
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
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

describe('storage v1.2 extensions', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('roundtrips name/onboarded/lang/haptics additively', () => {
    mockLocalStorage({ 'hoppala:v1': JSON.stringify({ best: 5, muted: false }) });
    saveName('Zıpzıp#4821');
    saveOnboarded();
    saveLang('en');
    saveHaptics(false);
    const s = loadSave();
    expect(s.best).toBe(5);
    expect(s.name).toBe('Zıpzıp#4821');
    expect(s.onboarded).toBe(true);
    expect(s.lang).toBe('en');
    expect(s.haptics).toBe(false);
  });

  it('maps to CloudSave and writes a merged CloudSave back preserving local-only fields', () => {
    mockLocalStorage({ 'hoppala:v1': JSON.stringify({ best: 5, muted: true, onboarded: true, name: 'Old' }) });
    expect(toCloudSave()).toEqual({ name: 'Old', best: 5, dailyBest: undefined, maxZone: 0, updatedAt: 0 });
    writeCloudSave({ name: 'New', best: 40, dailyBest: { key: '2026-07-04', score: 9 }, updatedAt: 123 });
    const s = loadSave();
    expect(s).toMatchObject({ best: 40, muted: true, onboarded: true, name: 'New', dailyBest: { key: '2026-07-04', score: 9 }, updatedAt: 123 });
  });

  it('resetSave clears everything', () => {
    const store = mockLocalStorage({ 'hoppala:v1': JSON.stringify({ best: 99, muted: true }) });
    resetSave();
    expect(store['hoppala:v1']).toBeUndefined();
    expect(loadSave()).toEqual({ best: 0, muted: false });
  });
});

describe('storage v1.3 extensions', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('roundtrips sensitivity and maxZone additively', () => {
    mockLocalStorage({ 'hoppala:v1': JSON.stringify({ best: 5, muted: false }) });
    saveSensitivity(1.4);
    saveMaxZone(3);
    const s = loadSave();
    expect(s.best).toBe(5);
    expect(s.sensitivity).toBe(1.4);
    expect(s.maxZone).toBe(3);
  });

  it('carries maxZone through CloudSave mapping', () => {
    mockLocalStorage({ 'hoppala:v1': JSON.stringify({ best: 5, muted: true, maxZone: 2 }) });
    expect(toCloudSave().maxZone).toBe(2);
    writeCloudSave({ name: 'N', best: 9, maxZone: 5, updatedAt: 1 });
    expect(loadSave().maxZone).toBe(5);
  });
});

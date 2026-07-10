import type { CloudSave } from './online/types';

const KEY = 'hoppala:v1';

export interface Save {
  best: number;
  muted: boolean;
  dailyBest?: { key: string; score: number };
  name?: string;
  onboarded?: boolean;
  lang?: 'tr' | 'en' | 'system';
  haptics?: boolean;
  music?: boolean;
  sensitivity?: number;
  maxZone?: number;
  updatedAt?: number;
}

function read(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { best: 0, muted: false };
    const v = JSON.parse(raw) as Partial<Save>;
    const save: Save = { best: typeof v.best === 'number' ? v.best : 0, muted: v.muted === true };
    const db = v.dailyBest;
    if (db && typeof db === 'object' && typeof db.key === 'string' && typeof db.score === 'number') {
      save.dailyBest = { key: db.key, score: db.score };
    }
    if (typeof v.name === 'string') save.name = v.name;
    if (v.onboarded === true) save.onboarded = true;
    if (v.lang === 'tr' || v.lang === 'en' || v.lang === 'system') save.lang = v.lang;
    if (typeof v.haptics === 'boolean') save.haptics = v.haptics;
    if (typeof v.music === 'boolean') save.music = v.music;
    if (typeof v.sensitivity === 'number') save.sensitivity = v.sensitivity;
    if (typeof v.maxZone === 'number') save.maxZone = v.maxZone;
    if (typeof v.updatedAt === 'number') save.updatedAt = v.updatedAt;
    return save;
  } catch {
    return { best: 0, muted: false };
  }
}

function write(save: Save): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* private mode / quota — play on without persistence */
  }
}

export function loadSave(): Save {
  return read();
}

export function saveBest(best: number): void {
  write({ ...read(), best });
}

export function saveMuted(muted: boolean): void {
  write({ ...read(), muted });
}

export function saveDailyBest(key: string, score: number): void {
  write({ ...read(), dailyBest: { key, score } });
}

export function saveName(name: string): void {
  write({ ...read(), name, updatedAt: Date.now() });
}

export function saveOnboarded(): void {
  write({ ...read(), onboarded: true });
}

export function saveLang(lang: 'tr' | 'en' | 'system'): void {
  write({ ...read(), lang });
}

export function saveHaptics(on: boolean): void {
  write({ ...read(), haptics: on });
}

export function saveMusic(on: boolean): void {
  write({ ...read(), music: on });
}

export function saveSensitivity(sensitivity: number): void {
  write({ ...read(), sensitivity });
}

export function saveMaxZone(maxZone: number): void {
  write({ ...read(), maxZone });
}

export function resetSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Snapshot of the cloud-syncable fields. */
export function toCloudSave(): CloudSave {
  const s = read();
  return { name: s.name ?? '', best: s.best, dailyBest: s.dailyBest, maxZone: s.maxZone ?? 0, updatedAt: s.updatedAt ?? 0 };
}

/** Write an already-merged CloudSave back, preserving local-only fields (muted/onboarded/lang/haptics/music). */
export function writeCloudSave(c: CloudSave): void {
  const s = read();
  write({
    ...s,
    name: c.name || s.name,
    best: Math.max(c.best, s.best),
    dailyBest: c.dailyBest,
    maxZone: Math.max(c.maxZone ?? 0, s.maxZone ?? 0),
    updatedAt: c.updatedAt,
  });
}

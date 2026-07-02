const KEY = 'hoppala:v1';

export interface Save {
  best: number;
  muted: boolean;
  dailyBest?: { key: string; score: number };
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

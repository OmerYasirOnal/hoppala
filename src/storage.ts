const KEY = 'hoppala:v1';

export interface Save {
  best: number;
  muted: boolean;
}

function read(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { best: 0, muted: false };
    const v = JSON.parse(raw) as Partial<Save>;
    return { best: typeof v.best === 'number' ? v.best : 0, muted: v.muted === true };
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

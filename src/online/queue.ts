import type { BoardId } from './types';

const QKEY = 'hoppala:pending';

export interface Pending {
  board: BoardId;
  score: number;
}

function read(): Pending[] {
  try {
    const raw = localStorage.getItem(QKEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (p): p is Pending =>
        !!p && typeof (p as Pending).board === 'string' && typeof (p as Pending).score === 'number',
    );
  } catch {
    return [];
  }
}

function write(list: Pending[]): void {
  try {
    localStorage.setItem(QKEY, JSON.stringify(list));
  } catch {
    /* private mode / quota — drop silently */
  }
}

/** Add a pending submission, collapsing to the max score per board. */
export function enqueue(board: BoardId, score: number): void {
  const list = read();
  const existing = list.find((p) => p.board === board);
  if (existing) {
    if (score > existing.score) existing.score = score;
  } else {
    list.push({ board, score });
  }
  write(list);
}

/** Return all pending submissions (already collapsed) and clear the queue. */
export function drain(): Pending[] {
  const list = read();
  write([]);
  return list;
}

/** Read pending submissions without clearing. */
export function peek(): Pending[] {
  return read();
}

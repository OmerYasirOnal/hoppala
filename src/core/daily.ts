/**
 * Daily-mode date math. LOCAL calendar day by design (Wordle convention):
 * "today's board" follows the player's clock. Pure — callers pass the Date.
 */
const EPOCH_Y = 2026;
const EPOCH_M = 0; // January
const EPOCH_D = 1;

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Days since 2026-01-01 (local), where 2026-01-01 itself is day 1. DST-safe via Date.UTC. */
export function dayNumber(d: Date): number {
  const here = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const epoch = Date.UTC(EPOCH_Y, EPOCH_M, EPOCH_D);
  return Math.round((here - epoch) / 86_400_000) + 1;
}

/** FNV-1a over "hoppala:<dateKey>" — stable uint32 seed for mulberry32. */
export function dailySeed(d: Date): number {
  const s = `hoppala:${dateKey(d)}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface RunIdentity {
  day: number;
  key: string;
  seed: number;
}

/** One consistent identity for a daily run, captured at play start. */
export function runIdentity(d: Date): RunIdentity {
  return { day: dayNumber(d), key: dateKey(d), seed: dailySeed(d) };
}

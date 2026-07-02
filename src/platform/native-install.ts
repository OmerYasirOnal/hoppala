import type { SimEvent } from '../game/types';

export type HapticKind = 'impactLight' | 'impactMedium' | 'notifySuccess' | 'notifyError' | 'none';

/**
 * SimEvent (from game/sim step()) plus 'record', the UI-triggered mid-run
 * celebration fired from main.ts (see sfx.play('record')). Both flow through
 * the platform bridge for haptics.
 */
export type HapticEvent = SimEvent | 'record';

const HAPTIC_MAP: Record<HapticEvent, HapticKind> = {
  bounce: 'impactLight',
  spring: 'impactMedium',
  break: 'impactLight',
  boost: 'impactMedium',
  record: 'notifySuccess',
  gameover: 'notifyError',
};

export function hapticFor(event: HapticEvent): HapticKind {
  return HAPTIC_MAP[event] ?? 'none';
}

/** Stale-day guard: only submit a daily-mode score if it was played on today's board. */
export function shouldSubmitDaily(day: number | undefined, todayDay: number): boolean {
  return day === todayDay;
}

export const LEADERBOARDS = { free: 'hoppala.free.best', daily: 'hoppala.daily' } as const;

import type { SimEvent } from '../game/types';

export type GameMode = 'free' | 'daily';

/** Seam for sub-project B (Capacitor): haptics + Game Center attach here. */
export interface PlatformBridge {
  onEvent(event: SimEvent): void;
  submitScore(score: number, mode: GameMode): void;
  showLeaderboard?(): void;
}

let current: PlatformBridge = {
  onEvent() {},
  submitScore() {},
};

export function setBridge(b: PlatformBridge): void {
  current = b;
}

/** Stable import for main.ts — delegates to whatever bridge is installed. */
export const bridge: PlatformBridge = {
  onEvent: (e) => current.onEvent(e),
  submitScore: (score, mode) => current.submitScore(score, mode),
  showLeaderboard: () => current.showLeaderboard?.(),
};

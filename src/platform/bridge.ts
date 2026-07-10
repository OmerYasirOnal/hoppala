import type { SimEvent } from '../game/types';

export type GameMode = 'free' | 'daily';

/** Seam for sub-project B (Capacitor): haptics + Game Center attach here. */
export interface PlatformBridge {
  onEvent(event: SimEvent | 'record'): void;
  submitScore(score: number, mode: GameMode, day?: number): void;
  showLeaderboard?(): void;
  /** Native rewarded ad (AdMob). Resolves true when a reward is earned. Absent on web → caller uses the stub. */
  showRewardedAd?(): Promise<boolean>;
  /** Whether a native rewarded ad is preloaded and ready to show instantly. Absent on web. */
  isRewardedAdReady?(): boolean;
  /** Ask the native layer to (re)preload a rewarded ad in the background. Absent on web. */
  preloadRewardedAd?(): void;
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
  submitScore: (score, mode, day) => current.submitScore(score, mode, day),
  showLeaderboard: () => current.showLeaderboard?.(),
  // Exposed only when the active (native) bridge implements it, so the web build falls back to the stub.
  get showRewardedAd() {
    return current.showRewardedAd ? () => current.showRewardedAd!() : undefined;
  },
  get isRewardedAdReady() {
    return current.isRewardedAdReady ? () => current.isRewardedAdReady!() : undefined;
  },
  get preloadRewardedAd() {
    return current.preloadRewardedAd ? () => current.preloadRewardedAd!() : undefined;
  },
};

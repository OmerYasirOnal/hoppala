import { registerPlugin, Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { dayNumber } from '../core/daily';
import { hapticFor, shouldSubmitDaily, LEADERBOARDS, type HapticKind } from './native-install';
import { setBridge, type PlatformBridge } from './bridge';
import { initAdMob, showRewardedAd, isRewardedAdReady, preloadRewardedAd } from './admob';

interface GameCenterPlugin {
  authenticate(): Promise<void>;
  submitScore(options: { leaderboardId: string; score: number }): Promise<void>;
  showLeaderboard(options?: { leaderboardId?: string }): Promise<void>;
}

const GameCenter = registerPlugin<GameCenterPlugin>('GameCenter');

/** Native plugin calls must never throw into the game loop. */
function safe(fn: () => Promise<unknown>): void {
  try {
    void fn().catch(() => {});
  } catch {
    /* synchronous throw from a broken/missing native bridge — ignore */
  }
}

function playHaptic(kind: HapticKind): void {
  switch (kind) {
    case 'impactLight':
      safe(() => Haptics.impact({ style: ImpactStyle.Light }));
      return;
    case 'impactMedium':
      safe(() => Haptics.impact({ style: ImpactStyle.Medium }));
      return;
    case 'notifySuccess':
      safe(() => Haptics.notification({ type: NotificationType.Success }));
      return;
    case 'notifyError':
      safe(() => Haptics.notification({ type: NotificationType.Error }));
      return;
    case 'none':
      return;
  }
}

/** Wires the real Capacitor platform bridge in place of the no-op default. */
export function install(): void {
  // Game Center is Apple-only. On Android the plugin isn't implemented, so we skip it entirely — Android's
  // leaderboard is the cross-platform Firebase board (online.submit, driven from main.ts). AdMob + haptics
  // run on both platforms.
  const isIOS = Capacitor.getPlatform() === 'ios';

  const nativeBridge: PlatformBridge = {
    onEvent(event) {
      playHaptic(hapticFor(event));
    },
    submitScore(score, mode, day) {
      if (!isIOS) return;
      if (mode === 'daily') {
        if (!shouldSubmitDaily(day, dayNumber(new Date()))) return;
        safe(() => GameCenter.submitScore({ leaderboardId: LEADERBOARDS.daily, score }));
        return;
      }
      safe(() => GameCenter.submitScore({ leaderboardId: LEADERBOARDS.free, score }));
    },
    showLeaderboard() {
      if (!isIOS) return;
      safe(() => GameCenter.showLeaderboard());
    },
    showRewardedAd,
    isRewardedAdReady,
    preloadRewardedAd,
  };

  setBridge(nativeBridge);
  if (isIOS) safe(() => GameCenter.authenticate());
  safe(() => initAdMob());
}

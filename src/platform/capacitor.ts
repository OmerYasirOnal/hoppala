import { registerPlugin } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { dayNumber } from '../core/daily';
import { hapticFor, shouldSubmitDaily, LEADERBOARDS, type HapticKind } from './native-install';
import { setBridge, type PlatformBridge } from './bridge';
import { initAdMob, showRewardedAd } from './admob';

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

/** Wires the real Capacitor/GameCenter platform bridge in place of the no-op default. */
export function install(): void {
  const nativeBridge: PlatformBridge = {
    onEvent(event) {
      playHaptic(hapticFor(event));
    },
    submitScore(score, mode, day) {
      if (mode === 'daily') {
        if (!shouldSubmitDaily(day, dayNumber(new Date()))) return;
        safe(() => GameCenter.submitScore({ leaderboardId: LEADERBOARDS.daily, score }));
        return;
      }
      safe(() => GameCenter.submitScore({ leaderboardId: LEADERBOARDS.free, score }));
    },
    showLeaderboard() {
      safe(() => GameCenter.showLeaderboard());
    },
    showRewardedAd,
  };

  setBridge(nativeBridge);
  safe(() => GameCenter.authenticate());
  safe(() => initAdMob());
}

import type { GameMode } from '../platform/bridge';

/**
 * Whether the game-over screen should offer the rewarded "Watch & Continue" revive.
 * Pure decision so it can be unit-tested without the DOM or native ad layer.
 *
 * - Free mode only — daily stays fair/deterministic and never revives.
 * - One revive per run.
 * - With a native ad network present, only offer when an ad is actually ready (no silent
 *   dead-taps, App-Review-safe). On web (no native network) the stub is always available.
 */
export function shouldOfferRevive(
  mode: GameMode,
  revivesUsed: number,
  hasNativeAd: boolean,
  nativeAdReady: boolean,
): boolean {
  if (mode !== 'free') return false;
  if (revivesUsed >= 1) return false;
  return hasNativeAd ? nativeAdReady : true;
}

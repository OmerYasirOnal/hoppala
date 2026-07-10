// AdMob identifiers for Hoppala. These are app-embedded identifiers (public by nature,
// extractable from any shipped binary) — NOT secrets. See docs/specs/2026-07-06-hoppala-admob-integration-design.md
// and docs/specs/2026-07-10-hoppala-android-design.md (platform-aware IDs).
import { Capacitor } from '@capacitor/core';

const platform: 'ios' | 'android' = Capacitor.getPlatform() === 'android' ? 'android' : 'ios';

// Test-ad mode is per-platform, because the two platforms are at different release stages:
//  • iOS ships real ads (its AdMob app + rewarded unit are approved) → TESTING off.
//  • Android has no real AdMob app yet (deferred to the Play Store round), so it stays on Google's
//    TEST ads — this keeps the revive fully FUNCTIONAL on Android (test ads always fill) instead of
//    resolving to a non-existent real unit. Flip Android → false once its real IDs exist.
const TESTING_BY_PLATFORM: Record<'ios' | 'android', boolean> = { ios: false, android: true };

/** Whether the current platform serves Google TEST rewarded ads (vs. the real unit). */
export const TESTING = TESTING_BY_PLATFORM[platform];

/** Rewarded ad units per platform. `real` = the AdMob-console unit; `test` = Google's official test unit. */
const REWARDED = {
  ios: {
    real: 'ca-app-pub-9920930529636149/4744801032',
    test: 'ca-app-pub-3940256099942544/1712485313',
  },
  android: {
    // TODO(android-release): replace with the real AdMob Android rewarded unit and flip
    // TESTING_BY_PLATFORM.android → false. See docs/specs/2026-07-10-hoppala-android-design.md §5.
    real: 'ca-app-pub-9920930529636149/ANDROID_REWARDED_TBD',
    test: 'ca-app-pub-3940256099942544/5224354917',
  },
} as const;

/** The rewarded ad unit to request — test unit while TESTING, real unit for submission builds; per platform. */
export const REWARDED_AD_UNIT_ID = TESTING ? REWARDED[platform].test : REWARDED[platform].real;

// AdMob identifiers for Hoppala. These are app-embedded identifiers (public by nature,
// extractable from any shipped binary) — NOT secrets. See docs/specs/2026-07-06-hoppala-admob-integration-design.md
// and docs/specs/2026-07-10-hoppala-android-design.md (platform-aware IDs).
import { Capacitor } from '@capacitor/core';

const platform: 'ios' | 'android' = Capacitor.getPlatform() === 'android' ? 'android' : 'ios';

// Test-ad mode is per-platform. Both platforms now have real AdMob apps + rewarded units, so both ship
// real ads. (Real ads only fill once each store listing is live/approved; until then the revive button
// gates on ad-readiness and simply stays hidden — never a dead tap.)
const TESTING_BY_PLATFORM: Record<'ios' | 'android', boolean> = { ios: false, android: false };

/** Whether the current platform serves Google TEST rewarded ads (vs. the real unit). */
export const TESTING = TESTING_BY_PLATFORM[platform];

/** Rewarded ad units per platform. `real` = the AdMob-console unit; `test` = Google's official test unit. */
const REWARDED = {
  ios: {
    real: 'ca-app-pub-9920930529636149/4744801032',
    test: 'ca-app-pub-3940256099942544/1712485313',
  },
  android: {
    // Real AdMob Android rewarded unit "Hoppala Revive" (app id ...~5791865802).
    real: 'ca-app-pub-9920930529636149/2716100152',
    test: 'ca-app-pub-3940256099942544/5224354917',
  },
} as const;

/** The rewarded ad unit to request — test unit while TESTING, real unit for submission builds; per platform. */
export const REWARDED_AD_UNIT_ID = TESTING ? REWARDED[platform].test : REWARDED[platform].real;

// AdMob identifiers for Hoppala. These are app-embedded identifiers (public by nature,
// extractable from any shipped binary) — NOT secrets. See docs/specs/2026-07-06-hoppala-admob-integration-design.md
// and docs/specs/2026-07-10-hoppala-android-design.md (platform-aware IDs).
import { Capacitor } from '@capacitor/core';

// ⚠️ FLIP TO `false` FOR REAL SUBMISSION BUILDS (see the spec ship runbooks).
// While `true`, native builds serve Google's TEST rewarded ads — safe to tap, no invalid
// clicks on the real units. (Used for both the iOS TestFlight verify and the Android emulator verify.)
export const TESTING = false;

/** Rewarded ad units per platform. `real` = the AdMob-console unit; `test` = Google's official test unit. */
const REWARDED = {
  ios: {
    real: 'ca-app-pub-9920930529636149/4744801032',
    test: 'ca-app-pub-3940256099942544/1712485313',
  },
  android: {
    // TODO(android-release): replace with the real AdMob Android rewarded unit before a TESTING=false
    // Android build. Emulator verification uses the test unit below (TESTING=true), so this is unused until
    // the Play Store round. See docs/specs/2026-07-10-hoppala-android-design.md §5.
    real: 'ca-app-pub-9920930529636149/ANDROID_REWARDED_TBD',
    test: 'ca-app-pub-3940256099942544/5224354917',
  },
} as const;

const platform: 'ios' | 'android' = Capacitor.getPlatform() === 'android' ? 'android' : 'ios';

/** The rewarded ad unit to request — test unit while TESTING, real unit for submission builds; per platform. */
export const REWARDED_AD_UNIT_ID = TESTING ? REWARDED[platform].test : REWARDED[platform].real;

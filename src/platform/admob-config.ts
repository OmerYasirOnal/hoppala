// AdMob identifiers for Hoppala. These are app-embedded identifiers (public by nature,
// extractable from any shipped binary) — NOT secrets. See docs/specs/2026-07-06-hoppala-admob-integration-design.md.

// ⚠️ FLIP TO `false` FOR THE REAL SUBMISSION BUILD (see the spec §9 ship runbook).
// While `true`, native builds serve Google's TEST rewarded ads — safe to tap, no invalid
// clicks on the real unit.
export const TESTING = true;

/** Real iOS rewarded ad unit "Hoppala Revive" (used when TESTING = false). */
const REAL_REWARDED = 'ca-app-pub-9920930529636149/4744801032';
/** Google's official iOS rewarded TEST ad unit (used when TESTING = true). */
const TEST_REWARDED = 'ca-app-pub-3940256099942544/1712485313';

/** The rewarded ad unit to request — test unit while TESTING, real unit for the submission build. */
export const REWARDED_AD_UNIT_ID = TESTING ? TEST_REWARDED : REAL_REWARDED;

/** iOS AdMob App ID — also set as GADApplicationIdentifier in Info.plist. */
export const IOS_APP_ID = 'ca-app-pub-9920930529636149~6215619200';

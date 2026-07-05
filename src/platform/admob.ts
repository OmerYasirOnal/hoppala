import { AdMob, AdmobConsentStatus, RewardAdPluginEvents, type AdOptions } from '@capacitor-community/admob';
import { REWARDED_AD_UNIT_ID, TESTING } from './admob-config';

const AD_OPTS: AdOptions = { adId: REWARDED_AD_UNIT_ID, isTesting: TESTING };

/** Whether a rewarded ad is prepared and ready to show instantly. */
let loaded = false;

/** Prepare the next rewarded ad in the background (fire-and-forget) for instant playback. */
function preload(): void {
  loaded = false;
  AdMob.prepareRewardVideoAd(AD_OPTS)
    .then(() => {
      loaded = true;
    })
    .catch(() => {
      loaded = false; // will be retried lazily by showRewardedAd()
    });
}

/**
 * Best-effort AdMob bring-up: SDK init, App Tracking Transparency, UMP (GDPR) consent, and the
 * first ad preload. Every step is guarded — nothing here ever blocks startup or throws into the app.
 */
export async function initAdMob(): Promise<void> {
  try {
    await AdMob.initialize({ initializeForTesting: TESTING });
  } catch {
    return; // SDK unavailable — leave bridge.showRewardedAd to resolve false gracefully
  }
  // iOS App Tracking Transparency prompt (no-op on platforms without ATT).
  try {
    await AdMob.requestTrackingAuthorization();
  } catch {
    /* ATT unavailable — continue */
  }
  // UMP / GDPR consent: request info, and only surface the form when it's required.
  try {
    const info = await AdMob.requestConsentInfo();
    if (info.status === AdmobConsentStatus.REQUIRED) {
      await AdMob.showConsentForm();
    }
  } catch {
    /* consent flow unavailable — continue */
  }
  preload();
}

/**
 * Show a rewarded ad and resolve `true` ONLY when the user earns the reward, `false` on decline
 * or any failure. Guaranteed to resolve (never hangs the caller). Re-preloads for the next revive.
 */
export async function showRewardedAd(): Promise<boolean> {
  // Cold path: if nothing is preloaded, prepare now (a short load) before showing.
  if (!loaded) {
    try {
      await AdMob.prepareRewardVideoAd(AD_OPTS);
      loaded = true;
    } catch {
      preload(); // try to warm one up for next time
      return false;
    }
  }

  let rewarded = false;
  const sub = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
    rewarded = true;
  });
  try {
    await AdMob.showRewardVideoAd();
    return rewarded;
  } catch {
    return false; // FailedToShow / dismissed-with-error
  } finally {
    await sub.remove().catch(() => {});
    preload(); // warm the next rewarded ad
  }
}

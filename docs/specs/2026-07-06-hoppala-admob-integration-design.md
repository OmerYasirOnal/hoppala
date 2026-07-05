# Hoppala — Native AdMob Rewarded Integration (Part B code)

- **Status:** Approved (user: "tam hazırla, mükemmel olmalı, her şey tam çalışmalı"). The AdMob console app + Rewarded ad unit already exist (IDs below). This round writes the CODE so the v1.9 rewarded-revive plays a REAL AdMob ad on native.
- **Round:** Part B code (follows v1.9 which shipped the `bridge.showRewardedAd?` hook + web stub). Ships to the App Store as a native build AFTER v1.9 clears review.
- **North star:** the first real ad revenue, done right — a polished, robust, retention-safe rewarded revive where every state works (loaded / not-loaded / reward / dismissed / failed) and nothing breaks the game.

## 1. Context & goal

v1.9 shipped the revive UX + `bridge.showRewardedAd?()` seam + a web stub. This round makes native (iOS) play a REAL AdMob **rewarded** ad through that same seam, so "📺 Watch & Continue" on game-over shows a real rewarded ad and grants the revive on reward. It also does AdMob correctly: SDK init, **App Tracking Transparency (ATT)**, **UMP (GDPR) consent**, ad **preloading** for instant playback, and graceful handling of every failure so the game never hangs.

**AdMob IDs (from the console, app-embedded, not secrets):**
- iOS App ID: `ca-app-pub-9920930529636149~6215619200`
- iOS Rewarded ad unit "Hoppala Revive": `ca-app-pub-9920930529636149/4744801032`
- Google's iOS rewarded TEST unit (for dev): `ca-app-pub-3940256099942544/1712485313`

## 2. Principles preserved

- **Native-only, web core untouched.** `@capacitor-community/admob@8` is imported ONLY inside `src/platform/capacitor.ts`, which is already lazy-imported (`import('./platform/capacitor')` only when `'Capacitor' in window`). So AdMob lands in the lazy Capacitor chunk, **excluded from the <60KB web core budget** (verify with `pnpm build`). The web build + PWA stay identical for browser users; the v1.9 stub remains their fallback.
- **Nothing ad-related throws into the game loop.** All AdMob calls go through the existing `safe()` wrapper (or equivalent try/catch), exactly like the GameCenter calls. A missing/broken ad NEVER crashes play — `showRewardedAd` resolves `false` and the game stays on the normal game-over screen.
- **Deterministic sim untouched.** No `src/game/*` changes. The revive itself (from v1.9) is unchanged; this round only supplies a real ad behind the existing bridge hook.
- **Offline-first + non-blocking.** Init/consent/preload are best-effort and never block startup or play.
- **No secrets committed.** The AdMob IDs are app-embedded identifiers (public by nature); they live in `src/platform/admob-config.ts` + Info.plist. No API keys.

## 3. Architecture

Three code seams + one native config:

1. **`src/platform/admob-config.ts` (NEW):** the IDs + a `TESTING` flag. `TESTING = true` for now (dev/test builds serve Google test ads — zero risk of invalid clicks on the real unit); flipped to `false` for the real submission build. Exposes `REWARDED_AD_UNIT_ID` (real vs test chosen by `TESTING`) and `IOS_APP_ID`.
2. **`src/platform/admob.ts` (NEW):** all AdMob logic — `initAdMob()` (initialize + ATT + UMP consent), a preload manager, and `showRewardedAd(): Promise<boolean>`. Isolated here so `capacitor.ts` stays a thin wiring file and the ad logic is one focused unit. Imports `@capacitor-community/admob`.
3. **`src/platform/capacitor.ts` (MODIFY):** in `install()`, call `initAdMob()` (best-effort) and set `nativeBridge.showRewardedAd = showRewardedAd`.
4. **`ios/App/App/Info.plist` (MODIFY):** `GADApplicationIdentifier` = the App ID; `SKAdNetworkItems` = Google's SKAdNetwork identifiers (attribution); `NSUserTrackingUsageDescription` = the ATT prompt copy.

## 4. Components

### 4.1 `admob-config.ts`

```
export const TESTING = true; // FLIP TO false FOR THE REAL SUBMISSION BUILD (see §9)
const REAL_REWARDED = 'ca-app-pub-9920930529636149/4744801032';
const TEST_REWARDED = 'ca-app-pub-3940256099942544/1712485313';
export const REWARDED_AD_UNIT_ID = TESTING ? TEST_REWARDED : REAL_REWARDED;
export const IOS_APP_ID = 'ca-app-pub-9920930529636149~6215619200';
```

### 4.2 `admob.ts` — init + consent + rewarded lifecycle

- **`initAdMob()`** (called once from `install()`, all best-effort/non-blocking):
  1. `AdMob.initialize({ initializeForTesting: TESTING })`.
  2. **ATT:** `AdMob.requestTrackingAuthorization()` (iOS shows the system prompt once; a no-op elsewhere).
  3. **UMP consent:** `AdMob.requestConsentInfo()`; if `status === AdmobConsentStatus.REQUIRED`, `AdMob.showConsentForm()`. Wrapped so a failure never blocks.
  4. Kick off the first **preload**.
- **Preload manager:** keep a private `loaded` flag. `preload()` calls `AdMob.prepareRewardVideoAd({ adId: REWARDED_AD_UNIT_ID, isTesting: TESTING })`; on success set `loaded = true`; on `FailedToLoad` set `loaded = false` (and it will be retried on the next `showRewardedAd`/preload). This gives **instant playback** when the user taps.
- **`showRewardedAd(): Promise<boolean>`** — the robust core, wired to `bridge.showRewardedAd`:
  1. If not `loaded`, `await prepareRewardVideoAd(...)` first (so a cold tap still works, just with a short load); if that throws → resolve `false`.
  2. Register a one-shot `RewardAdPluginEvents.Rewarded` listener that flips a local `rewarded = true`.
  3. `await AdMob.showRewardVideoAd()`.
  4. On completion (dismissed), remove the listener and `resolve(rewarded)`.
  5. On any throw (`FailedToShow`/no-ad) → `resolve(false)`.
  6. `finally`: `loaded = false` and fire-and-forget `preload()` for the NEXT revive.
  - Every branch resolves a boolean; it can never hang the caller. The v1.9 `doRevive` already treats `false` as "stay on game-over" and has an in-flight guard — so a failed/declined ad is handled gracefully with no UX breakage.

### 4.3 `capacitor.ts` wiring

In `install()`: after building `nativeBridge`, add `showRewardedAd: () => showRewardedAd()` to it (so `bridge.showRewardedAd` — the getter from v1.9 — resolves to the native impl), and call `initAdMob()` via `safe(...)`. No other changes; GameCenter/haptics wiring untouched.

### 4.4 Info.plist

Add: `GADApplicationIdentifier` (string = `ca-app-pub-9920930529636149~6215619200`); `SKAdNetworkItems` (array of `SKAdNetworkIdentifier` dicts — Google's published list, incl. `cstr6suwn9.skadnetwork` and the standard AdMob set); `NSUserTrackingUsageDescription` (e.g. TR/EN "İzniniz, gösterilen reklamları sizin için daha alakalı hale getirir." / "Your permission makes the ads you see more relevant.").

### 4.5 Web / dev behaviour (the "everything works" bar)

- On the web (no Capacitor), `bridge.showRewardedAd` stays `undefined` → `main.ts` uses the v1.9 stub → the revive flow is fully exercisable in the browser during dev. Unchanged.
- On native with `TESTING = true`, real Google TEST rewarded ads play end-to-end (safe to click). The whole game-over → Watch & Continue → ad → reward → revive → resume transition is verifiable on a device build.
- No UI redesign needed: the v1.9 game-over button + `doRevive` in-flight guard + `showHud()` resume already deliver the polished transition; this round makes the ad behind it real + robust.

## 5. Rewarded lifecycle (summary)

`initAdMob()` → preload → user dies → taps "Watch & Continue" → `bridge.showRewardedAd()` → (preloaded ad shows instantly, or a brief load) → user watches → `Rewarded` fires → ad dismissed → resolve `true` → `revive(world)` resumes the run → preload the next ad. Decline/fail anywhere → resolve `false` → stay on game-over, one revive still available.

## 6. Testing

- **`pnpm exec tsc --noEmit`** clean (the AdMob types resolve). All existing tests green, unmodified (no sim/web-logic change).
- **`pnpm build`**: passes; **web core still < 60KB gzip** (AdMob must be in the lazy Capacitor chunk, NOT the core — this is the key budget check).
- **`npx cap sync ios`**: succeeds; the AdMob pod/SPM package is added to the iOS project.
- **Device verification (at submission, post-v1.9):** on a real device build with `TESTING = true`, die in Free mode → "Watch & Continue" → a Google test rewarded ad plays → reward → the run resumes with a boost; declining the ad leaves you on game-over. This is the "geçişler/menüler tam çalışıyor" gate, run when the submission build is made.
- No unit tests for the native SDK (untestable off-device); the design keeps the risky logic (revive) already unit-tested in v1.9, and `showRewardedAd` is a thin, fully-guarded wrapper.

## 7. Acceptance criteria

1. `@capacitor-community/admob@8` integrated; web core < 60KB gzip unchanged; existing tests green; no `src/game/*` change.
2. On native, `bridge.showRewardedAd` plays a real rewarded ad and resolves `true` only on an earned reward, `false` on decline/failure — never hangs.
3. AdMob is initialized with ATT + UMP consent handled, all non-blocking and crash-safe (`safe()`).
4. Ads are preloaded for instant playback and re-preloaded after each show.
5. Info.plist has `GADApplicationIdentifier`, `SKAdNetworkItems`, and `NSUserTrackingUsageDescription`.
6. `TESTING = true` (test ads) in this build; the flip-to-`false` + resubmit steps are documented.

## 8. Non-goals (deferred)

- The **App Store resubmit** (build 3) + the **App Privacy update** (add Device ID / ad data + "Used for Tracking: Yes" + confirm the ATT string) happen AFTER v1.9 clears review — their own follow-up, per §9.
- No banner/interstitial/native ad formats — rewarded only.
- No Android build this round (the config is iOS-focused; the code is cross-platform and Android can be added later).

## 9. Ship runbook (after v1.9 is approved)

1. Flip `TESTING` → `false` in `admob-config.ts` (real ad unit).
2. `pnpm build && npx cap sync ios`; bump native build number (2 → 3), keep/raise the marketing version.
3. `xcodebuild archive` + `-exportArchive destination=upload` (the no-API-key trick).
4. ASC: attach build 3; **App Privacy → add Identifiers/Device ID used for advertising + set Used-for-Tracking: Yes** (AdMob now tracks); confirm the ATT string; Add for Review → user Submits.
5. Real-device test the rewarded flow first (TestFlight) before submitting.
6. Complete AdMob payment/tax setup (user's personal step) to actually receive revenue.

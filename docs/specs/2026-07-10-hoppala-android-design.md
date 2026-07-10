# Hoppala Android — sub-project design

Status: approved (brainstorm 2026-07-10). Scope this round: a **working Android build with real AdMob rewarded
ads, verified in an emulator.** Play Store submission is a deferred follow-on (the user has a Google Play
developer account).

## 1. Why / scope

Hoppala already runs as web + iOS (Capacitor). The user wants Android too. Most of the stack is already
cross-platform; this round adds the Android Capacitor platform, makes AdMob platform-aware, and verifies the
whole flow on an Android emulator.

**Goals:** `android/` Capacitor project; the game runs on Android (WebView); Firebase online leaderboard +
haptics work; AdMob rewarded revive works on Android (its own AdMob app + ad unit); end-to-end emulator verify.

**Non-goals (deferred to a follow-on):** Google Play Store submission (keystore, Play Console listing, upload);
Google Play Games Services leaderboard (Android uses the existing Firebase leaderboard instead); Android release
signing config beyond debug.

## 2. What's already cross-platform (no work)

- **Firebase online leaderboard + cloud save**: pure JS running in the WebView → works on Android identically to
  web/iOS. This is Android's leaderboard (no native integration needed).
- **Haptics** (`@capacitor/haptics`): supported on Android.
- **The whole game** (canvas/sim/UI): runs in the Android WebView unchanged.
- **AdMob code** (`src/platform/admob.ts`): cross-platform; only the *IDs* are iOS-specific today.

## 3. iOS-only pieces → how they behave on Android

- **Game Center** (`GameCenter` native plugin, `capacitor.ts`): Apple-only. On Android the plugin isn't
  implemented, so `GameCenter.authenticate()/submitScore()/showLeaderboard()` reject and are swallowed by the
  existing `safe()` wrapper — harmless no-ops. For cleanliness we **guard Game Center calls to iOS only**
  (`Capacitor.getPlatform() === 'ios'`) so Android doesn't emit failed-plugin noise. Score submission on Android
  still happens via the Firebase leaderboard (`online.submit`, called independently from `main.ts`).
- **App Tracking Transparency (ATT)**: iOS-only; `requestTrackingAuthorization()` is a no-op on Android (the
  plugin handles the platform difference). Android instead relies on the UMP consent flow (already in
  `initAdMob`) + the `AD_ID` permission.

## 4. Changes

### 4.1 `src/platform/admob-config.ts` — platform-aware IDs
Return the rewarded ad unit for the current platform via `Capacitor.getPlatform()`:
- iOS real: `ca-app-pub-9920930529636149/4744801032` (existing).
- iOS test: `ca-app-pub-3940256099942544/1712485313` (existing).
- **Android real**: the new AdMob Android rewarded unit (from §5).
- **Android test**: Google's official Android rewarded test unit `ca-app-pub-3940256099942544/5224354917`.
- `REWARDED_AD_UNIT_ID` = `TESTING ? test[platform] : real[platform]`.
- Keep `IOS_APP_ID`-style app IDs as documentation constants; the actual app IDs live in the native manifests.

### 4.2 `src/platform/capacitor.ts` — guard Game Center to iOS
Wrap the Game Center wiring/authenticate in `if (Capacitor.getPlatform() === 'ios')`. `initAdMob()` and haptics
run on all native platforms.

### 4.3 `android/app/src/main/AndroidManifest.xml` (after `cap add android`)
- `<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="<Android AdMob App ID>"/>`
- `<uses-permission android:name="com.google.android.gms.permission.AD_ID"/>` (advertising ID; required by the
  Play Data Safety form + AdMob on Android 13+).
- `INTERNET` permission is present by default (Capacitor).

### 4.4 Scaffolding
`npx cap add android` (creates `android/`, appId `com.omeryasironal.hoppala`), then `pnpm build && npx cap sync
android`. The `android/` dir is committed (like `ios/`), with generated build artifacts gitignored.

## 5. AdMob Android console (agent-driven, like iOS)

Create an **Android app "Hoppala"** in AdMob + an **Android rewarded ad unit "Hoppala Revive"** → yields the real
**Android AdMob App ID** (`ca-app-pub-9920930529636149~XXXX`) and **Android rewarded unit ID**
(`ca-app-pub-9920930529636149/XXXX`). Link the Google Play listing later (once the app is on Play). Until then the
app is "review pending" like iOS was — dev/verification uses Google's **test** IDs (`TESTING = true`), which
always fill, so the emulator test shows a real ad.

## 6. Prerequisites (tooling)

Installed this round (no Android Studio GUI needed): **JDK 17** (`brew install openjdk@17`), **Android
command-line SDK** (`brew install --cask android-commandlinetools`), then via `sdkmanager`: `platform-tools`,
`platforms;android-35`, `build-tools;35.0.0`, `emulator`, a `system-images;android-35;google_apis;arm64-v8a`, and
an AVD. `ANDROID_HOME`/`JAVA_HOME` exported for the Gradle build.

## 7. Verification

- Build a **debug APK** (`gradlew assembleDebug` via Capacitor) and install to an emulator.
- Confirm on the emulator: the game loads and plays; drag steering works; the Firebase leaderboard opens and
  reads/writes; haptics fire (or degrade silently); **die → 📺 Watch & Continue → a Google test rewarded ad
  plays → revive resumes the run**.
- `pnpm test` + `pnpm build` stay green; no `src/game`/`src/core` change; web core bundle unchanged (AdMob stays
  in the lazy Capacitor chunk).
- Adversarial review of the (small) code diff.

## 8. Follow-on (next round, not now)

Play Store: generate a release keystore, configure signing, build an AAB (`bundleRelease`), create the Play
Console listing (store metadata, screenshots, content rating, **Data Safety** form mirroring the iOS App
Privacy: advertising Device ID + tracking), upload, and submit. The user has a Google Play developer account, so
this is unblocked whenever we choose to do it.

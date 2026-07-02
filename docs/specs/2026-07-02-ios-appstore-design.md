# Hoppala iOS + App Store Connect — Design Spec (Sub-project B)

**Owner:** Ömer Yasir Önal · **Date:** 2026-07-02 · **Status:** proposed design, pre-implementation

> Sub-project B of the App Store expansion. Builds on the shipped v0.2.0 web game and the
> v1.1 bridge seam (`src/platform/bridge.ts`). Approach approved 2026-07-02: **Capacitor +
> official Haptics plugin + a custom ~80-line Swift Game Center bridge**. Apple Developer
> Program membership is ACTIVE (same account as Unisum); Xcode 26.6 + CocoaPods are on this Mac.

## 1. Goal

Ship Hoppala to the **App Store** as a native iOS app: the same TS game, wrapped with
Capacitor, upgraded with native haptics and **Game Center leaderboards** (the "minimum
functionality" answer to App Review guideline 4.2), delivered through TestFlight → review.

## 2. Identity & store facts (confirm at spec review)

- **Bundle ID:** `com.omeryasironal.hoppala` (proposal — must match nothing existing in the
  account; changeable ONLY before first upload).
- **App name on the store:** `Hoppala` — availability is only verified when the ASC record
  is created; fallback `Hoppala!`, subtitle `Zıpla, tırman, paylaş` / EN `Jump, climb, share`.
- **Price:** Free. No IAP, no ads, no tracking → App Privacy: **Data Not Collected**
  (Game Center identity is handled by Apple, not collected by us).
- **Primary language:** Turkish; EN localization included (the game already auto-localizes).
- **Category:** Games › Arcade. Age rating: 4+.

## 3. Architecture

### 3.1 Capacitor shell
- Deps (native project only — the WEB bundle stays dependency-free): `@capacitor/core`,
  `@capacitor/cli`, `@capacitor/ios`, `@capacitor/haptics` (latest stable major; min iOS
  version = Capacitor's default for that major).
- `capacitor.config.ts`: `appId: 'com.omeryasironal.hoppala'`, `appName: 'Hoppala'`,
  `webDir: 'dist'`, no server URL (fully local assets — no thin-wrapper 4.2 smell).
- `ios/` directory committed to the repo. Web deploy pipeline unchanged.

### 3.2 Runtime bridge wiring (keeps web bundle at ~6KB)
- New `src/platform/capacitor.ts` implements `PlatformBridge`:
  - `onEvent`: haptics map — bounce→`impact(light)`, spring/boost→`impact(medium)`,
    break→`impact(light)`, record→`notification(success)`, gameover→`notification(error)`.
  - `submitScore(score, mode, day)`: forwards to the Game Center plugin; a **daily** score
    is submitted only if `day === dayNumber(new Date())` at submit time (stale runs are
    dropped, no offline queue — YAGNI).
  - `showLeaderboard()`: opens the native Game Center UI.
- `main.ts` loads it via guarded dynamic import — `if ('Capacitor' in window) void import('./platform/capacitor').then(m => m.install());` — Vite code-splits the chunk; web
  visitors never download it.

### 3.3 Custom Swift Game Center plugin (`ios/App/App/GameCenterPlugin.swift`)
- Capacitor plugin exposing: `authenticate()` (called once at app start; presents Apple's
  login VC when required), `submitScore({ leaderboardId, score })` (GKLeaderboard.submitScore),
  `showLeaderboard({ leaderboardId })` (GKGameCenterViewController). Failures are silent
  no-ops game-side (never block gameplay).
- **Leaderboards (configured in ASC):**
  - `hoppala.free.best` — classic leaderboard, score = meters, all-time.
  - `hoppala.daily` — **recurring leaderboard, daily reset** (Game Center native feature;
    matches the daily board exactly).

### 3.4 Store assets & metadata
- 1024×1024 store icon generated from `public/icon.svg` via the existing sharp script
  pattern; iOS app icon set from the same source.
- Screenshots: 6.9" + 6.5" sets captured from the iOS Simulator (menu, mid-run with
  phantoms, boost moment, game-over/share, daily mode) — automated via `xcrun simctl`.
- Description TR+EN drawn from the README; keywords; support URL = GitHub repo,
  marketing URL = hoppala.vercel.app; privacy policy URL = a static page added to the web
  app (`/privacy`, "no data collected", TR/EN).

## 4. Delivery pipeline

1. Capacitor scaffold + plugins + Swift plugin + icons; `pnpm build && npx cap sync ios`.
2. Xcode: automatic signing with the active team; build + run on simulator (agent-verifiable)
   and on the user's iPhone (user step).
3. **User steps (with exact walkthroughs provided):** create the ASC app record (bundle ID +
   name), configure the two Game Center leaderboards, provide an App Store Connect **API key**
   (or app-specific password) for uploads.
4. Archive + upload from CLI: `xcodebuild archive` + `xcodebuild -exportArchive` +
   `xcrun altool --upload-app` (API-key auth). TestFlight processing → user plays the build
   on-device (haptics + Game Center smoke).
5. Screenshots/metadata into ASC → submit for review (user presses the final button).
6. App Review 4.2 posture: native haptics, Game Center (auth + 2 leaderboards + native UI),
   offline local content, daily recurring competition — comfortably more than a wrapped website.

## 5. Testing

- TS side: `capacitor.ts` mapping is thin; unit-test the pure parts (haptic event→style map,
  stale-daily-submit guard) with the plugin calls stubbed. Web suite stays green and the web
  bundle budget check must show no growth.
- Native side: build must pass `xcodebuild -destination 'generic/platform=iOS Simulator' build`;
  simulator smoke (game boots from local assets, no console errors). Game Center flows verified
  on TestFlight (sandbox GC works on device; simulator support is flaky — device is the gate).

## 6. Out of scope

Android/Play Store, offline score queueing, achievements (v2 of B), IAP/ads/analytics,
push notifications, App Clips.

## 7. Risks

- **Name collision** on "Hoppala" → fallback name (decided at record creation).
- **Guideline 4.2** residual risk → mitigations in §4.6; if rejected, the appeal/iteration
  path is more native surface (achievements, widgets) — explicitly deferred until needed.
- **Recurring leaderboard timezone**: GC daily reset is UTC-based; the game's local-day board
  may differ near midnight for non-UTC players. Accepted for v1 (scores still land on the
  correct GC day-bucket at submit time; the in-game daily best remains the local-day truth).

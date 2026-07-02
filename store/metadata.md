# Hoppala — App Store Connect metadata pack

Source of truth for all claims: `README.md` (endless vertical jumper, drag-to-steer,
phantom platforms, jetpack boost pickups, daily board, offline PWA/native play,
Game Center leaderboards, zero-runtime-dependency <60KB gzip web bundle). Nothing
below claims a feature that isn't in the README or the game source
(`src/game/`, `src/platform/`).

---

## Turkish (tr)

**App name:** Hoppala

**Subtitle (30 char max):** Zıpla, tırman, paylaş

**Promotional text (170 char max):**
Sonsuz zıplayan bir platform oyunu: sürükleyerek yönlendir, hayalet
platformlardan sakın, jetpack'i yakala, günlük tahtada arkadaşlarınla yarış.

**Full description:**

Hoppala, telefonunun tarayıcısında (veya App Store'dan) oynanan sonsuz dikey
zıplama oyunu. Parmağınla sürükleyerek yönlendir, platformdan platforma zıpla
ve yıldızlara doğru tırman.

- **Sürükle-yönlendir:** Karakterin parmağının altında olmak zorunda değil —
  sürükleme mesafesi kadar hareket eder.
- **Hayalet platformlar:** Yükseldikçe belirip kaybolan platformlar zamanlamanı
  test eder.
- **Jetpack takviyesi:** Topladığın güçlendiriciler seni kısa süreliğine
  fırlatır.
- **İki mod:** Serbest oyun ve herkesin aynı günlük tahtada yarıştığı Günlük
  mod (Wordle tarzı, sabit günlük tohum).
- **Game Center liderlik tabloları:** Serbest modda en iyi skorun ve günlük
  modda günün skoru için ayrı liderlik tabloları.
- **Çevrimdışı oynanabilir:** Ana ekrana ekle, internetsiz oyna (PWA/offline
  destek).
- **Minik boyut:** Sıfır çalışma zamanı bağımlılığı, sıkıştırılmış web paketi
  60KB'ın altında.

Kayıt yok, reklam yok, izinsiz veri toplama yok — sadece zıpla ve tırman.

**Keywords (≤100 char):**
`zıplama,jumper,tırmanma,sürükle,arcade,günlük,skor tablosu,jetpack,çevrimdışı,rekor,kule,platform`
(97 characters)

---

## English (en)

**App name:** Hoppala

**Subtitle (30 char max):** Jump, climb, share

**Promotional text (170 char max):**
An endless vertical jumper: drag to steer, dodge phantom platforms, grab a
jetpack boost, and race friends on the shared daily board.

**Full description:**

Hoppala is an endless vertical jumper you can play straight from your phone's
browser (or as a native app). Drag to steer, bounce from platform to platform,
and climb from the ground into the stars.

- **Relative-drag steering:** your finger never has to sit on the character —
  it moves by however far you drag.
- **Phantom platforms:** platforms that flicker in and out as you climb higher,
  testing your timing.
- **Jetpack boosts:** grab a pickup for a short burst of upward thrust.
- **Two modes:** free play, and a Daily mode where everyone shares the same
  board — Wordle-style, one seed per day.
- **Game Center leaderboards:** separate boards for your free-play best and
  the daily run.
- **Play offline:** add it to your home screen and keep playing without a
  connection (PWA/offline support).
- **Tiny footprint:** zero runtime dependencies, gzipped web bundle under
  60KB.

No sign-up, no ads, no data collection beyond what's needed to play — just
jump and climb.

**Keywords (≤100 char):**
`jumper,platformer,climber,drag steer,arcade,daily,leaderboard,jetpack,offline,record,tower,endless`
(98 characters)

---

## Shared metadata (both locales)

| Field | Value |
|---|---|
| Support URL | https://github.com/OmerYasirOnal/hoppala |
| Marketing URL | https://hoppala.vercel.app |
| Privacy Policy URL | https://hoppala.vercel.app/privacy.html |
| Category | Games › Arcade |
| Age rating | 4+ |
| Price | Free |
| App Privacy (ASC "App Privacy" section) | Data Not Collected |

Note: the privacy policy URL depends on `public/privacy.html` from Task 1
being live on the deployed site — it was not re-verified live as part of this
task (deploy of Tasks 1-3 happens together per the task-4 brief); confirm
`https://hoppala.vercel.app/privacy.html` returns 200 before ASC submission.

---

## Game Center leaderboard definitions (for ASC setup)

IDs below match what's already wired in the app
(`src/platform/native-install.ts` → `LEADERBOARDS`), so ASC's leaderboard IDs
must match exactly or score submission will silently fail.

### 1. Free / classic run

| Field | Value |
|---|---|
| Leaderboard ID | `hoppala.free.best` |
| Reference name (internal) | Hoppala — Free Best |
| Name (tr) | Serbest Rekor |
| Name (en) | Free Best |
| Score format | Integer |
| Score format suffix | "m" (meters climbed — see `meters()` in `src/main.ts`, `Math.floor(world.maxAltitude / 10)`) |
| Sort order | High to Low |
| Recurrence | None (all-time) |

### 2. Daily board

| Field | Value |
|---|---|
| Leaderboard ID | `hoppala.daily` |
| Reference name (internal) | Hoppala — Daily |
| Name (tr) | Günlük Tahta |
| Name (en) | Daily Board |
| Score format | Integer |
| Score format suffix | "m" (meters climbed, same unit as free — daily mode uses the same `meters()` scoring, just a fixed daily RNG seed) |
| Sort order | High to Low |
| Recurrence | Recurring, resets daily (00:00 local per `src/core/daily.ts` `dayNumber`/`dateKey`) |

Both leaderboards score the same unit (meters climbed, `world.maxAltitude / 10`
floored) — the game only ever tracks one score dimension, so there's no
"m" vs. unitless split between them.

---

## Screenshot provenance

All screenshots are PNG, portrait, one consistent target size per capture
method (iOS Simulator captures at the simulator's native resolution; the web
build was driven at a fixed CSS viewport so all its captures share one pixel
size).

| # | File | Resolution | Source | What it shows |
|---|---|---|---|---|
| 1 | `01-menu-1320x2868.png` | 1320×2868 | iOS Simulator — iPhone 17 Pro Max (booted via `xcrun simctl`), native build installed from `xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -sdk iphonesimulator`, captured with `xcrun simctl io booted screenshot` | Menu screen: title, "Drag to steer" hint, Free / Daily #<day> buttons, scrolling platform background. Includes the simulator status bar (time/Dynamic Island/battery) since simctl can't hide it without extra tooling. |
| 2 | `02-midrun-phantoms-1290x2796.png` | 1290×2796 | Web build (`pnpm dev`, Vite on :5173) driven headlessly via Chrome DevTools Protocol on Brave, viewport emulated at 430×932 CSS px @3x DPR | Mid-run gameplay at 618m altitude with a phantom platform (pink, `#e08ad0`) rendered at full visible-window opacity next to the player, plus static/moving platforms in view. |
| 3 | `03-boost-1290x2796.png` | 1290×2796 | Web build via CDP, same viewport as #2 | A boost moment: the player sits on a jetpack pickup with the flame sprite rendered (`world.player.boostT > 0` render path in `src/render/renderer.ts`) at 4082m. |
| 4 | `04-gameover-share-1290x2796.png` | 1290×2796 | Web build via CDP, same viewport as #2 | Game-over / share screen: final score (133m), best-score line, "Again" and "Share" buttons — the real `ui.showGameOver()` render path. |
| 5 | `05-daily-badge-1290x2796.png` | 1290×2796 | Web build via CDP, same viewport as #2 | Daily mode HUD early in a run: score "37 m" plus the `#183` day badge (`#daybadge` element, real daily-mode identity from `src/core/daily.ts`). |

### How gameplay states were reached (web build, CDP)

The web build's game loop (`src/core/loop.ts`) advances physics off real
wall-clock time, and platform difficulty (moving/crumbling/phantom ratios,
boost-pickup odds) only ramps up after several thousand px of climbed
altitude (`difficultyAt()` in `src/game/spawner.ts`) — reaching phantom/boost
states through literally-simulated real-time play would take tens of minutes
of scripted input per shot. To capture these states within reasonable effort,
a small **temporary, dev-only debug hook** was added to `src/main.ts`
(`window.__shot`, guarded to this working session only) exposing:

- `pause()` / a paused render loop, so the state doesn't drift between
  scripting a state and taking the screenshot.
- `warp(deltaPx)` — advances `world.cameraY` by `deltaPx` and calls the
  game's real `update()` once, which internally calls the same
  `fillPlatforms()` used by normal play — this generates a real, valid chunk
  of the platform chain (with real altitude-gated ratios) up to the new
  camera height in one call, instead of requiring thousands of physics ticks.
- `snapToPhantom()` / `snapToBoost()` — after a `warp()`, scan the
  now-generated `world.platforms`/`world.pickups` for a phantom platform or
  boost pickup and reposition the player next to it, then call the real
  `renderer.draw()` — so the pixels captured are the game's actual render
  path, not a mockup.
- `forceGameOver()` — moves the player below the death line and calls
  `update()`, triggering the real game-over path (`ui.showGameOver`,
  `bridge.submitScore`, etc.).

This hook was **reverted before committing** (`git checkout -- src/main.ts`);
it never shipped and is not part of the committed diff. The rendered pixels
in shots 2-5 are the game's real Canvas 2D render output for a state that's
reachable in normal play (the generator, difficulty ramp, and render code are
all unmodified) — only *how quickly* that state was reached was accelerated
for screenshot purposes.

The iOS Simulator shot (menu) required no such hook since the menu is
reachable at app launch with no input.

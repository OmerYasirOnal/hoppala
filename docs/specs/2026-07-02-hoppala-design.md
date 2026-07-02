# Hoppala — Mobile-Web Vertical Jumper: Design Spec

**Owner:** Ömer Yasir Önal · **Date:** 2026-07-02 · **Status:** approved design, pre-implementation

> A standalone project in its own repo, deliberately distinct from the portfolio/content-platform.
> "Hoppala" — the Turkish exclamation you make when something bounces.

## 1. Goal

A doodle-style **endless vertical jumper** that plays instantly in a phone browser: tap a link,
play in under two seconds, add to home screen, play offline. Score chasing ("one more run"),
shareable results, zero install friction.

**Success criteria:** 60fps on a mid-range phone; < 60KB gzip bundle; playable offline after
first visit; a friend can be beating your score within 30 seconds of receiving the link.

## 2. Non-goals (v1 — YAGNI)

Online leaderboard, accounts, coins/cosmetics, enemies/projectiles, daily challenges,
app-store packaging, analytics, ads, background music. All are v2 candidates at most.

## 3. Platform & identity

- **Mobile-web PWA**, portrait-first, also playable on desktop (mouse drag). Deployed to
  Vercel (`hoppala.vercel.app`; custom domain can attach later).
- **Visual identity:** no sprite assets — everything is procedural Canvas drawing. The
  character is a soft bouncy blob with eyes. **Altitude atmosphere**: background gradient
  shifts as you climb — ground palette → sky → dusk → starfield. Distinct from the
  portfolio's dev-tools aesthetic.
- **Copy:** minimal UI text (~6 strings), auto TR/EN via `navigator.language`
  (`tr*` → Turkish, else English). Code and docs in English.

## 4. Gameplay

### Core loop
The character bounces automatically; the player steers horizontally by **relative drag**:
touch anywhere and drag — the character's horizontal target moves by the finger's delta
(finger never needs to cover the character; 1:1 logical-pixel sensitivity as the starting
tuning). Screen edges **wrap around** (exit left, enter right). Falling below the bottom
of the camera view ends the run.

- **Score = maximum altitude reached, displayed in meters** (logical px / 10, rounded).
- Camera follows only upward (classic rule): it never scrolls down.

### Platforms
| Type | Behavior | Appears from |
|---|---|---|
| Static | fixed | start |
| Moving | oscillates horizontally (sine), speed scales with altitude | ~150 m |
| Crumbling | breaks after one bounce (cannot be reused) | ~300 m |
| Spring pad | a static platform variant with a spring: jump impulse ×1.8 | ~80 m (rare) |

### Difficulty curve
Altitude-driven, monotonic: vertical gaps widen toward (but never beyond) the reachability
cap; moving/crumbling ratios rise; platform width shrinks slightly. All parameters come from
one pure function `difficultyAt(altitude)` so the curve is unit-testable.

**Reachability invariant (hard rule):** the generator must always place at least one
next platform whose vertical gap ≤ 0.8 × max jump height AND horizontal offset reachable
given wrap-around — an impossible board must be unproducible by construction, enforced by
tests across seeded runs.

### Initial physics tuning (playtest-adjustable, single constants module)
- Logical viewport: 400 × (device aspect) px, letterboxed; devicePixelRatio-scaled canvas.
- Gravity 2200 px/s²; bounce impulse −1050 px/s (≈ 250 px jump height); spring ×1.8.
- Platform size 68×14 px. Fixed timestep 1/60 s updates; rAF rendering with interpolation.

### Run lifecycle
Menu → playing → game over. Game over shows score, best (localStorage), **Share** (Web
Share API; clipboard fallback with a "copied" toast) and **Play again**. `visibilitychange`
auto-pauses; resize/orientation reflows the letterbox. Sound: tiny WebAudio-synthesized
blips (bounce/spring/record), no audio files, mute toggle persisted with the best score.

## 5. Architecture

Vite + TypeScript (strict). Pure simulation, thin presentation:

| Module | Responsibility | Depends on |
|---|---|---|
| `src/core/loop.ts` | fixed-timestep update / rAF render loop with interpolation | — |
| `src/core/rng.ts` | seeded PRNG (mulberry32) | — |
| `src/game/types.ts` | world/entity/state types + tuning constants | — |
| `src/game/sim.ts` | physics step: bounce, gravity, wrap, platform collision, camera | types |
| `src/game/spawner.ts` | procedural platform generation + `difficultyAt` | types, rng |
| `src/render/renderer.ts` | Canvas 2D drawing + altitude atmosphere (reads sim, never mutates) | types |
| `src/input/drag.ts` | Pointer Events → relative horizontal target | — |
| `src/ui/screens.ts` | menu/playing/gameover state machine, DOM overlay, i18n strings | storage |
| `src/audio/sfx.ts` | WebAudio synth blips + mute | — |
| `src/storage.ts` | best score + mute flag (localStorage, namespaced key) | — |

`sim.ts`, `spawner.ts`, `rng.ts` import no DOM APIs — fully unit-testable. The renderer and
input layers are deliberately thin adapters.

**PWA:** `vite-plugin-pwa` — manifest (name, theme, portrait orientation, icons generated
from one SVG source) + precache service worker → installable, offline-capable.

## 6. Testing

- **Vitest** over the pure modules:
  - reachability invariant across many seeded generations (property-style loop);
  - `difficultyAt` monotonicity and bounds;
  - physics: bounce/collision only when falling, wrap-around continuity, camera never
    scrolls down;
  - deterministic seeded sim run (fixed input script → identical score twice);
  - storage roundtrip with mocked localStorage.
- **CI:** GitHub Actions — typecheck + vitest + build on every push/PR.
- Visual/feel: manual device testing via Vercel preview deploys (protected previews are
  reachable via share links).

## 7. Performance & edge cases

60fps target on mid-range Android; bundle budget < 60KB gzip (no engine, no images except
generated icons). Object churn kept low (platform pool reuse). devicePixelRatio-aware canvas
sizing; iOS Safari address-bar viewport handled with `dvh`-based letterbox; context-menu /
double-tap-zoom / overscroll suppressed inside the game surface.

## 8. Delivery

- New GitHub repo `hoppala` (this repo), branch `master`, conventional commits.
- Vercel project (GitHub integration): production on `master` push, per-PR previews.
- README with a play link, a GIF, and a short "how it's built" section (portfolio value).
- After v1 ships: add Hoppala to the portfolio's `projects` collection (separate task in the
  portfolio repo, out of this spec's scope).

## 9. v2 candidates (explicitly deferred)

Online leaderboard (would need a tiny backend or KV), themes/cosmetics, enemies, daily seed
("everyone plays the same board today" — pairs naturally with share), app-store wrap via
Capacitor if it ever earns it.

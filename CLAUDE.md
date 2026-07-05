# Hoppala

Doodle-style endless vertical jumper — a mobile-web PWA. Vanilla TypeScript + Canvas 2D,
**no game engine; zero runtime dependencies in the core** (Firebase is an isolated, lazy-loaded online dependency, v1.2+). Play target: `hoppala.vercel.app`.

## Authoritative docs

- Spec (approved): `docs/specs/2026-07-02-hoppala-design.md`
- v1 plan (8 tasks, full code): `docs/plans/2026-07-02-hoppala-v1.md`
- Execution ledger (gitignored scratch): `.superpowers/sdd/progress.md` — which plan tasks are done; trust it + `git log`.

## Commands

pnpm only. `pnpm dev` · `pnpm test` (Vitest) · `pnpm build` (`tsc --noEmit && vite build`) · `pnpm preview` · `pnpm icons` (regenerate PWA PNGs from `public/icon.svg`).

## Architecture rules (bind all changes)

- **Pure simulation:** `src/game/sim.ts`, `src/game/spawner.ts`, `src/core/rng.ts` must never import DOM APIs — they are deterministic (seeded `mulberry32`) and unit-tested. Rendering/input/UI/audio/storage are thin adapters; composition only in `src/main.ts`.
- **Online layer (v1.2+):** `src/online/*` is a strictly-additive, offline-first layer. Firebase is confined to `src/online/firebase.ts` (dynamic-imported into its own Vite chunk, excluded from the <60KB core budget by `scripts/check-bundle-size.mjs`). It degrades to the offline experience when unconfigured/unreachable and must never block play. Anti-cheat is Firestore-rules-only (free Spark plan).
- World is **y-down**: higher = smaller `y`; altitude px = `startY - player.y`; score meters = `floor(altitude / 10)`.
- All tuning constants live in `TUNING` (`src/game/types.ts`); jump height derives from physics — never hardcode it elsewhere.
- **Reachability invariant:** the spawner can never produce a vertical gap > `0.8 × JUMP_HEIGHT`; tests enforce it — keep them passing.
- Budgets: bundle < 60KB gzip, 60fps on a mid-range phone.
- UI copy: minimal string set in `src/ui/screens.ts`, auto TR/EN via `navigator.language`. Code/docs in English.
- Conventional commits (`feat|fix|chore|docs|test(scope): ...`). CI (GitHub Actions) runs `pnpm test` + `pnpm build` on every push.

## v1 non-goals (do not add without a new spec round)

Accounts (real login), coins/cosmetics, enemies, analytics, ads, background music. (Daily mode shipped in v0.2.0; **online leaderboard + cloud save shipped in v1.2** via anonymous Firebase; app-store packaging is sub-project B.) Note: ads are the acknowledged future monetization endgame (retention-first) but remain a non-goal until their own spec round.

## Related

The user's portfolio (`~/Projects/portfolio`) is a separate project with its own session — don't mix contexts. After v1 ships, the portfolio gets a small task to list Hoppala in its projects collection.

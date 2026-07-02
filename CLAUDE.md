# Hoppala

Doodle-style endless vertical jumper — a mobile-web PWA. Vanilla TypeScript + Canvas 2D,
**no game engine, zero runtime dependencies**. Play target: `hoppala.vercel.app`.

## Authoritative docs

- Spec (approved): `docs/specs/2026-07-02-hoppala-design.md`
- v1 plan (8 tasks, full code): `docs/plans/2026-07-02-hoppala-v1.md`
- Execution ledger (gitignored scratch): `.superpowers/sdd/progress.md` — which plan tasks are done; trust it + `git log`.

## Commands

pnpm only. `pnpm dev` · `pnpm test` (Vitest) · `pnpm build` (`tsc --noEmit && vite build`) · `pnpm preview` · `pnpm icons` (regenerate PWA PNGs from `public/icon.svg`).

## Architecture rules (bind all changes)

- **Pure simulation:** `src/game/sim.ts`, `src/game/spawner.ts`, `src/core/rng.ts` must never import DOM APIs — they are deterministic (seeded `mulberry32`) and unit-tested. Rendering/input/UI/audio/storage are thin adapters; composition only in `src/main.ts`.
- World is **y-down**: higher = smaller `y`; altitude px = `startY - player.y`; score meters = `floor(altitude / 10)`.
- All tuning constants live in `TUNING` (`src/game/types.ts`); jump height derives from physics — never hardcode it elsewhere.
- **Reachability invariant:** the spawner can never produce a vertical gap > `0.8 × JUMP_HEIGHT`; tests enforce it — keep them passing.
- Budgets: bundle < 60KB gzip, 60fps on a mid-range phone.
- UI copy: minimal string set in `src/ui/screens.ts`, auto TR/EN via `navigator.language`. Code/docs in English.
- Conventional commits (`feat|fix|chore|docs|test(scope): ...`). CI (GitHub Actions) runs `pnpm test` + `pnpm build` on every push.

## v1 non-goals (do not add without a new spec round)

Online leaderboard, accounts, coins/cosmetics, enemies, analytics, ads, background music. (Daily mode shipped in v0.2.0; app-store packaging is active sub-project B.)

## Related

The user's portfolio (`~/Projects/portfolio`) is a separate project with its own session — don't mix contexts. After v1 ships, the portfolio gets a small task to list Hoppala in its projects collection.

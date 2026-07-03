# ASC Submission Runbook — Hoppala: Zıpla ve Tırman

**State as of 2026-07-03:** Build 1 (v1.0) uploaded and **"Ready to Submit"** in TestFlight;
internal tester (omeryasironal@hotmail.com) installed and device-tested the game — user
approved the build ("loved it"). App record: `com.omeryasironal.hoppala`, ASC app id
6786738365, team 9X8FDSW5D8. All remaining work is FILLING ASC FORMS + attaching the build,
then Add for Review.

## How the agent operates ASC (browser automation)

ASC requires the user's Apple ID session. Per the machine rules (~/.claude/CLAUDE.md):
automation runs ONLY on the Brave binary with the isolated automation profile
(`~/.claude/brave-automation-profile`) — NEVER the user's real profile.

Bootstrap: launch HEADFUL Brave with the automation profile +
`--remote-debugging-port=9223` on `https://appstoreconnect.apple.com` → ask the USER to
log in (Apple ID + 2FA) in that window ONCE → then drive the forms over CDP. Verify each
field after typing (read back values). The user stays nearby for any re-auth prompt and
presses the FINAL "Submit to App Review" themselves.

## Checklist (in order)

1. **Game Center leaderboards** (unless user confirms already created):
   app page → Game Center → create `hoppala.free.best` (Classic, Integer, High-to-Low,
   TR "Serbest Rekor" / EN "Free Best") and `hoppala.daily` (Recurring daily, Integer,
   High-to-Low, TR "Günlük Tahta" / EN "Daily Board"). Full field tables: `store/metadata.md` §Game Center.
2. **Version 1.0 page — Turkish locale**: upload the 5 PNGs from
   `store/screenshots/65in/` (1284×2778, order 01→05) into the iPhone 6.5" panel;
   Promotional Text / Description / Keywords from `store/metadata.md` §Turkish;
   Support URL `https://github.com/OmerYasirOnal/hoppala`; Marketing URL
   `https://hoppala.vercel.app`; Copyright `2026 Ömer Yasir Önal`.
3. **Build**: Add Build → select Build 1. Then enable the version's **Game Center**
   section and ATTACH BOTH leaderboards to the version (skipping this hides them in prod).
4. **App Review Information**: user's name/email/phone (ask user); notes:
   "Free arcade game, no login required. Game Center is optional — the game is fully
   playable without signing in. Daily mode gives everyone the same procedurally-seeded
   board per local day."
5. **Version Release**: Automatically release this version.
6. **English locale**: add English via the locale dropdown; paste §English values from
   `store/metadata.md`; re-upload the same 5 screenshots.
7. **App Information**: Subtitle TR `Hayalet platformlara dikkat!` / EN
   `Mind the phantom platforms!`; Category Games → Arcade; no third-party content.
   Age rating questionnaire: all None → 4+.
8. **App Privacy**: questionnaire → **Data Not Collected**; policy URL
   `https://hoppala.vercel.app/privacy.html` (verified live).
9. **Pricing and Availability**: Free (0), all territories.
10. **Add for Review** → review the summary → the USER presses **Submit to App Review**.
11. After submit: append status to `.superpowers/sdd/progress.md`; if Apple rejects,
    bring the rejection text back — 4.2 defense: Game Center, haptics, daily competition,
    offline local content, tiny native wrapper with real plugin code.

## Follow-ups already queued (post-submission, do not block)

- `ITSAppUsesNonExemptEncryption=false` in `ios/App/App/Info.plist` (skips the
  compliance question on every future build upload).
- Portfolio: add the App Store link to `~/Projects/portfolio` hoppala.md `links.appstore`
  once live (separate session/repo).
- v1.2 candidates: achievements, `onEvent('start')` bridge event, GIF README refresh with
  daily mode.

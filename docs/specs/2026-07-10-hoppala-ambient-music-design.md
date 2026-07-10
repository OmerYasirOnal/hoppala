# Hoppala — generative ambient music — design

Status: approved by direct user request 2026-07-10 ("güzel sessiz dingin bir müzik olsun … his ekle" — add a
nice, quiet, calm ambient music and more feel). This lifts the "background music" v1 non-goal via its own round,
consistent with how enemies (v1.4) and ads (v1.9) were added.

## 1. Why

Retention-first (see [[hoppala-monetization-strategy]] in memory): a calm ambient bed adds "feel"/atmosphere and
session comfort without changing gameplay. It must stay on-ethos: **no audio files** (the core is zero-runtime-
deps and <60KB gzip), so the music is **procedural Web Audio**, like the existing `sfx.ts`.

## 2. Goals / non-goals

**Goals:** a quiet, evolving ambient pad that plays under the menu + gameplay; subtly reactive to the climb (the
8 altitude zones); a Settings toggle (on by default), gated by the existing master mute; persisted preference.

**Non-goals:** licensed/recorded music, per-zone distinct tracks, beat/percussion, a full mixer. Sim/core stay
byte-identical (audio is a thin adapter, composed only in `main.ts`).

## 3. Design

- **`src/audio/music.ts` (NEW)** — `createMusic()` builds one Web Audio graph:
  - A soft **add9 pad**: 4 detuned sine/triangle voices (root · fifth · octave · ninth) → a gentle low-pass
    (with a slow "breathing" LFO on the cutoff) → a feedback delay for space → a **swell** gain (a very slow
    tremolo rides here, so the master gain can stay a clean 0/target) → **master** gain (pure enable/mute) →
    destination.
  - **Zone-reactive:** `setZone(i)` glides the chord root along an ascending pentatonic (`ZONE_SEMITONES`, 8
    entries matching `game/zones.ts`) so climbing gently lifts the key; `chime()` plays a soft rising two-note
    bell on each new zone. Pure `zoneRootHz()` mapping is unit-tested.
  - **Lifecycle:** `start()` (idempotent, creates/resumes the context inside a user gesture — autoplay policy),
    `setEnabled()` (fades master to target/0), `setSuspended()` (suspends/resumes the audio thread on
    backgrounding to save CPU/battery).
- **`main.ts`** composes it: a `musicOn` pref (default true) + `applyMusic()` = `setEnabled(musicOn && !muted)`,
  called from onPlay / master-mute / the settings toggle / the first-gesture unlock; `setZone`/`chime` on new
  zones; `setSuspended(document.hidden)` on `visibilitychange`.
- **Settings/storage:** a `music` boolean in `Save` (`saveMusic`), a **Müzik/Music** toggle row, preserved
  across cloud-save merges as a local-only pref.

## 4. Architecture rules honored

Zero deps (procedural), no `src/game`/`src/core` change, TR/EN strings in the minimal set, bundle stays
<60KB gzip (music is ~+0.8KB). A separate `AudioContext` from `sfx.ts` (acceptable on iOS 15+/Android WebView;
consolidation deferred as a future cleanup if audio grows).

## 5. Verification

Pure `zoneRootHz` unit tests; web smoke (AudioContext running after a gesture, settings toggle present, no
errors); it also rides along in the Android emulator build. The actual "vibe" is judged by ear by the user.

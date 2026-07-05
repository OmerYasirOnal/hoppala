import './styles.css';
import { createLoop } from './core/loop';
import { mulberry32, type Rng } from './core/rng';
import { createWorld, step } from './game/sim';
import { TUNING, type World } from './game/types';
import { attachDrag } from './input/drag';
import { createRenderer } from './render/renderer';
import { createSfx } from './audio/sfx';
import { createUI, t } from './ui/screens';
import { loadSave, saveBest, saveMuted, saveDailyBest, saveSensitivity, saveMaxZone } from './storage';
import { dayNumber, dateKey, runIdentity, type RunIdentity } from './core/daily';
import { bridge, type GameMode } from './platform/bridge';
import { online } from './online';
import { boardForRun, formatRank } from './online/rank';
import { renderLeaderboard, type LeaderboardView } from './ui/leaderboard';
import { askNickname } from './ui/nickname';
import { renderSettings } from './ui/settings';
import { saveOnboarded, saveLang, saveHaptics, resetSave } from './storage';
import { lang, setLang, zoneLabel } from './ui/screens';
import { ZONES, zoneIndexAt, zoneProgress } from './game/zones';
import { renderZones } from './ui/zones';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const app = document.getElementById('app') as HTMLElement;
const uiRoot = document.getElementById('ui') as HTMLElement;

const renderer = createRenderer(canvas);
renderer.resize();
window.addEventListener('resize', () => {
  renderer.resize();
  world.viewHeight = renderer.viewHeight();
  // shrinking the view (rotation) must not teleport the death line above the player
  const deathLine = world.cameraY + world.viewHeight;
  if (world.player.y + TUNING.playerR > deathLine) {
    world.cameraY = world.player.y + TUNING.playerR - world.viewHeight;
    world.prevCameraY = world.cameraY;
  }
});

const sfx = createSfx();
const save = loadSave();
let muted = save.muted;
let best = save.best;
// seed from the all-time best so pre-v1.3 players immediately see the zones they earned
let maxZone = Math.max(save.maxZone ?? 0, zoneIndexAt(best));
let sensitivity = save.sensitivity ?? 1;
const drag = attachDrag(app, TUNING.viewWidth, canvas, () => sensitivity);
let runZone = 0; // highest zone index shown as a banner this run
sfx.setMuted(muted);

const isNative = 'Capacitor' in window;
const uiLang: 'tr' | 'en' = save.lang === 'tr' || save.lang === 'en' ? save.lang : lang();
setLang(uiLang); // re-point the string table to the persisted override before createUI/showMenu run

let rng: Rng = mulberry32(Date.now() >>> 0);
let world: World = createWorld(rng, renderer.viewHeight());
let playing = false;
let paused = false;
let recordCelebrated = false;
let overGen = 0;
let firstRun = !save.onboarded;
let mode: GameMode = 'free';
/** Snapshot of the daily run's identity, captured once at play start. Null in free mode. */
let runId: RunIdentity | null = null;
/** Baseline this run's in-progress record blip and game-over isRecord are compared against. */
let runBestBaseline = 0;

const dailyBestFor = (key: string): number => {
  const save = loadSave();
  return save.dailyBest?.key === key ? save.dailyBest!.score : 0;
};

const meters = () => Math.floor(world.maxAltitude / 10) + world.stompBonus;

function shareText(score: number): string {
  return mode === 'daily' && runId
    ? `Hoppala #${runId.day} — ${score} m! https://hoppala.vercel.app`
    : `Hoppala 🟡 ${score} m! https://hoppala.vercel.app`;
}

async function share(): Promise<void> {
  const text = shareText(meters());
  try {
    if (navigator.share) {
      await navigator.share({ text });
      return;
    }
    await navigator.clipboard.writeText(text);
    ui.toast(t.copied);
  } catch {
    /* user cancelled — fine */
  }
}

let cachedGlobal: LeaderboardView['rows'] = [];
let cachedDaily: LeaderboardView['rows'] = [];

async function openLeaderboard(initialTab: 'global' | 'daily' = mode === 'daily' ? 'daily' : 'global'): Promise<void> {
  let tab = initialTab;
  let closed = false;
  const draw = async (loading: boolean): Promise<void> => {
    const todayKey = dateKey(new Date());
    const board = tab === 'global' ? 'global' : boardForRun('daily', todayKey);
    const myScore = tab === 'global' ? best : dailyBestFor(todayKey);
    const offline = !online.ready();
    const rows = loading ? (tab === 'global' ? cachedGlobal : cachedDaily) : await online.top(board, 100);
    if (!loading) {
      if (tab === 'global') cachedGlobal = rows;
      else cachedDaily = rows;
    }
    const meUid = online.uid();
    let me: LeaderboardView['me'] = null;
    // Pinned "you" row when the player has a score — highlights their standing even outside the top-100.
    if (!loading && myScore > 0 && online.name()) {
      const r = await online.myRank(board, myScore);
      if (r) me = { rank: r.rank, name: online.name()!, score: myScore };
    }
    if (closed) return;
    const view: LeaderboardView = {
      tab, rows, meUid, me, offline, loading,
      onTab: (next) => { tab = next; void draw(true).then(() => draw(false)); },
      onRefresh: () => void draw(true).then(() => draw(false)),
      onClose: () => { closed = true; },
    };
    renderLeaderboard(uiRoot, view);
  };
  await draw(true);
  await draw(false);
}

const ui = createUI(uiRoot, {
  onPlay(m: GameMode) {
    sfx.unlock();
    mode = m;
    const now = new Date();
    if (m === 'daily') {
      runId = runIdentity(now);
      runBestBaseline = dailyBestFor(runId.key);
    } else {
      runId = null;
      runBestBaseline = best;
    }
    const seed = m === 'daily' ? runId!.seed : Date.now() >>> 0;
    rng = mulberry32(seed);
    world = createWorld(rng, renderer.viewHeight());
    drag.reset(TUNING.viewWidth / 2);
    recordCelebrated = false;
    playing = true;
    loop.start(); // idempotent (loop guards double-start) — guarantee the rAF loop runs whenever a run begins
    runZone = 0;
    ui.showHud(m === 'daily' ? { day: runId!.day } : undefined);
    if (firstRun) {
      firstRun = false;
      saveOnboarded();
      ui.showOnboardingTip();
    }
  },
  onShare() {
    void share();
  },
  onToggleMute() {
    muted = !muted;
    sfx.setMuted(muted);
    saveMuted(muted);
    return muted;
  },
  onLeaderboard() {
    void online.ensureName((s) => askNickname(uiRoot, s)).then(() => openLeaderboard());
  },
  onSettings() {
    const s = loadSave();
    renderSettings(uiRoot, {
      muted, haptics: s.haptics ?? true, lang: s.lang ?? 'system', name: online.name(), native: isNative, version: '1.7.0',
      sensitivity,
    }, {
      onMute: (m) => { muted = m; sfx.setMuted(m); saveMuted(m); ui.setMuted(m); },
      onHaptics: (on) => saveHaptics(on),
      onLang: (l) => { saveLang(l); location.reload(); }, // reload re-renders every screen in the new language
      onEditName: () => { void online.editName((current) => askNickname(uiRoot, current)); },
      onReset: () => { resetSave(); location.reload(); },
      onClose: () => {},
      onSensitivity: (n) => { sensitivity = n; saveSensitivity(n); },
    });
  },
  onZones() {
    renderZones(uiRoot, {
      rows: ZONES.map((z, i) => ({ key: z.key, name: zoneLabel(z.key), meters: z.meters, color: `rgb(${z.top[0]},${z.top[1]},${z.top[2]})`, reached: i <= maxZone })),
      reachedCount: maxZone + 1,
      onClose: () => {},
    });
  },
  onPause() {
    if (!playing || paused) return;
    paused = true;
    loop.stop();
    ui.showPause({
      onResume: () => {
        paused = false;
        loop.start();
      },
      onMainMenu: () => {
        paused = false;
        playing = false;
        loop.start(); // onPause stopped the loop; restart it so the menu renders and the next run isn't soft-locked
        ui.showMenu(best, { day: dayNumber(new Date()), best: dailyBestFor(dateKey(new Date())) });
      },
    });
  },
});
ui.setMuted(muted);
ui.showMenu(best, { day: dayNumber(new Date()), best: dailyBestFor(dateKey(new Date())) });
app.addEventListener('pointerdown', () => sfx.unlock(), { once: true });

if ('Capacitor' in window) {
  void import('./platform/capacitor').then((m) => m.install()).catch(() => {});
}

void online.init().then(async () => {
  maxZone = loadSave().maxZone ?? maxZone;
  if (playing || best <= 0) return;              // don't disturb an in-progress run
  const r = await online.myRank('global', best);
  if (r && !playing) {
    ui.showMenu(best, { day: dayNumber(new Date()), best: dailyBestFor(dateKey(new Date())) }, formatRank(r, uiLang));
  }
});

window.addEventListener('online', () => void online.init()); // retry auth if needed, then flush queued scores

const loop = createLoop({
  update: () => {
    if (!playing) return;
    step(world, drag.targetX(), rng);
    const foot = world.player.y + TUNING.playerR;
    for (const e of world.events) {
      bridge.onEvent(e);
      if (e !== 'gameover' && e !== 'stomp') sfx.play(e);
      if (e === 'bounce') renderer.burst(world.player.x, foot, 'dust', world.time);
      else if (e === 'spring') renderer.burst(world.player.x, foot, 'spring', world.time);
      else if (e === 'break') {
        renderer.burst(world.player.x, foot, 'break', world.time);
        renderer.crumble(world.player.x, foot, TUNING.platformW, world.time);
      }
      else if (e === 'boost') renderer.burst(world.player.x, foot, 'boost', world.time);
    }
    for (const fx of world.stompFx) {
      renderer.addPop(fx.x, fx.y, fx.bonus, fx.combo, world.time);
      renderer.burst(fx.x, fx.y, 'stomp', world.time);
      renderer.shake(2 + Math.min(fx.combo, 6), world.time);
      sfx.play('stomp', 1 + Math.min(fx.combo, 8) * 0.1);
    }
    const m = meters();
    ui.setScore(m);
    const zi = zoneIndexAt(m);
    ui.setZone(zoneLabel(ZONES[zi]!.key), zoneProgress(m));
    const comboFrac = (world.comboEndsAt - world.time) / TUNING.comboWindow;
    if (world.combo >= 2 && comboFrac > 0) ui.setCombo(world.combo, comboFrac);
    else ui.clearCombo();
    if (zi > runZone) {
      runZone = zi;
      ui.showZoneBanner(zoneLabel(ZONES[zi]!.key));
      if (zi > maxZone) {
        maxZone = zi;
        saveMaxZone(maxZone);
        online.pushMaxZone(maxZone);
        const z = ZONES[zi]!;
        ui.showZoneCelebration(zoneLabel(z.key), `rgb(${z.top[0]},${z.top[1]},${z.top[2]})`);
      }
    }
    if (!recordCelebrated && runBestBaseline > 0 && m > runBestBaseline) {
      recordCelebrated = true;
      sfx.play('record');
      bridge.onEvent('record');
    }
    if (world.over) {
      playing = false;
      const gen = ++overGen;
      sfx.play('gameover');
      const isRecord = m > runBestBaseline;
      if (mode === 'free' && isRecord) {
        best = m;
        saveBest(best);
      }
      if (mode === 'daily' && runId && isRecord) saveDailyBest(runId.key, m);
      bridge.submitScore(m, mode, runId?.day);
      const board = boardForRun(mode, runId?.key);
      const daily = mode === 'daily' && runId ? { day: runId.day, best: Math.max(runBestBaseline, m) } : undefined;
      ui.showGameOver(m, best, isRecord, daily, undefined, world.maxCombo); // instant
      online.submit(board, m);
      if (mode === 'free' && isRecord) online.pushBest(m);
      if (online.enabled()) {
        void online.myRank(board, m).then((r) => {
          if (gen !== overGen || playing) return; // player already moved on
          const named = !!online.name();
          const rankStr = named && r ? `${formatRank(r, uiLang)} ${t.players}` : t.syncPending;
          ui.showGameOver(m, best, isRecord, daily, rankStr, world.maxCombo);
        });
      }
    }
  },
  render: (alpha) => renderer.draw(world, alpha),
  dt: TUNING.dt,
});
loop.start();

document.addEventListener('visibilitychange', () => {
  if (document.hidden) loop.stop();
  else if (!paused) loop.start();
});

import './styles.css';
import { createLoop } from './core/loop';
import { mulberry32, type Rng } from './core/rng';
import { createWorld, step } from './game/sim';
import { TUNING, type World } from './game/types';
import { attachDrag } from './input/drag';
import { createRenderer } from './render/renderer';
import { createSfx } from './audio/sfx';
import { createUI, t } from './ui/screens';
import { loadSave, saveBest, saveMuted, saveDailyBest } from './storage';
import { dayNumber, dateKey, runIdentity, type RunIdentity } from './core/daily';
import { bridge, type GameMode } from './platform/bridge';

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

const drag = attachDrag(app, TUNING.viewWidth, canvas);
const sfx = createSfx();
const save = loadSave();
let muted = save.muted;
let best = save.best;
sfx.setMuted(muted);

let rng: Rng = mulberry32(Date.now() >>> 0);
let world: World = createWorld(rng, renderer.viewHeight());
let playing = false;
let recordCelebrated = false;
let mode: GameMode = 'free';
/** Snapshot of the daily run's identity, captured once at play start. Null in free mode. */
let runId: RunIdentity | null = null;
/** Baseline this run's in-progress record blip and game-over isRecord are compared against. */
let runBestBaseline = 0;

const dailyBestFor = (key: string): number => {
  const save = loadSave();
  return save.dailyBest?.key === key ? save.dailyBest!.score : 0;
};

const meters = () => Math.floor(world.maxAltitude / 10);

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
    ui.showHud(m === 'daily' ? { day: runId!.day } : undefined);
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
});
ui.setMuted(muted);
ui.showMenu(best, { day: dayNumber(new Date()), best: dailyBestFor(dateKey(new Date())) });
app.addEventListener('pointerdown', () => sfx.unlock(), { once: true });

if ('Capacitor' in window) {
  void import('./platform/capacitor').then((m) => m.install()).catch(() => {});
}

const loop = createLoop({
  update: () => {
    if (!playing) return;
    step(world, drag.targetX(), rng);
    for (const e of world.events) {
      bridge.onEvent(e);
      if (e !== 'gameover') sfx.play(e);
    }
    const m = meters();
    ui.setScore(m);
    if (!recordCelebrated && runBestBaseline > 0 && m > runBestBaseline) {
      recordCelebrated = true;
      sfx.play('record');
    }
    if (world.over) {
      playing = false;
      sfx.play('gameover');
      const isRecord = m > runBestBaseline;
      if (mode === 'free' && isRecord) {
        best = m;
        saveBest(best);
      }
      if (mode === 'daily' && runId && isRecord) saveDailyBest(runId.key, m);
      bridge.submitScore(m, mode, runId?.day);
      ui.showGameOver(
        m,
        best,
        isRecord,
        mode === 'daily' && runId ? { day: runId.day, best: Math.max(runBestBaseline, m) } : undefined,
      );
    }
  },
  render: (alpha) => renderer.draw(world, alpha),
  dt: TUNING.dt,
});
loop.start();

document.addEventListener('visibilitychange', () => {
  if (document.hidden) loop.stop();
  else loop.start();
});

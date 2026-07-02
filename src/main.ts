import './styles.css';
import { createLoop } from './core/loop';
import { mulberry32, type Rng } from './core/rng';
import { createWorld, step } from './game/sim';
import { TUNING, type World } from './game/types';
import { attachDrag } from './input/drag';
import { createRenderer } from './render/renderer';
import { createSfx } from './audio/sfx';
import { createUI, t } from './ui/screens';
import { loadSave, saveBest, saveMuted } from './storage';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const app = document.getElementById('app') as HTMLElement;
const uiRoot = document.getElementById('ui') as HTMLElement;

const renderer = createRenderer(canvas);
renderer.resize();
window.addEventListener('resize', () => {
  renderer.resize();
  world.viewHeight = renderer.viewHeight();
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

const meters = () => Math.floor(world.maxAltitude / 10);

function shareText(score: number): string {
  return `Hoppala 🟡 ${score} m! https://hoppala.vercel.app`;
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
  onPlay() {
    sfx.unlock();
    rng = mulberry32(Date.now() >>> 0);
    world = createWorld(rng, renderer.viewHeight());
    drag.reset(TUNING.viewWidth / 2);
    recordCelebrated = false;
    playing = true;
    ui.showHud();
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
ui.showMenu(best);
app.addEventListener('pointerdown', () => sfx.unlock(), { once: true });

const loop = createLoop({
  update: () => {
    if (!playing) return;
    step(world, drag.targetX(), rng);
    for (const e of world.events) {
      if (e === 'gameover') continue;
      sfx.play(e);
    }
    const m = meters();
    ui.setScore(m);
    if (!recordCelebrated && best > 0 && m > best) {
      recordCelebrated = true;
      sfx.play('record');
    }
    if (world.over) {
      playing = false;
      sfx.play('gameover');
      const isRecord = m > best;
      if (isRecord) {
        best = m;
        saveBest(best);
      }
      ui.showGameOver(m, best, isRecord);
    }
  },
  render: () => renderer.draw(world),
  dt: TUNING.dt,
});
loop.start();

document.addEventListener('visibilitychange', () => {
  if (document.hidden) loop.stop();
  else loop.start();
});

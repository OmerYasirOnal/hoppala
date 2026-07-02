import './styles.css';
import { createLoop } from './core/loop';
import { mulberry32, type Rng } from './core/rng';
import { createWorld, step } from './game/sim';
import { TUNING, type World } from './game/types';
import { attachDrag } from './input/drag';
import { createRenderer } from './render/renderer';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const app = document.getElementById('app') as HTMLElement;

const renderer = createRenderer(canvas);
renderer.resize();
window.addEventListener('resize', () => renderer.resize());

const drag = attachDrag(app, TUNING.viewWidth);

let rng: Rng = mulberry32(Date.now() >>> 0);
let world: World = createWorld(rng, renderer.viewHeight());

const loop = createLoop({
  update: () => {
    step(world, drag.targetX(), rng);
    if (world.over) {
      // Task 6 replaces this with the game-over screen
      rng = mulberry32(Date.now() >>> 0);
      world = createWorld(rng, renderer.viewHeight());
      drag.reset(TUNING.viewWidth / 2);
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

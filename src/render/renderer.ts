import { TUNING, type Platform, type World } from '../game/types';
import { phantomVisible } from '../game/sim';
import { ZONES, zoneIndexAt, zoneProgress } from '../game/zones';
import { particleAt, easeOutPulse, type Particle } from './fx';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function skyAt(altitude: number): { top: string; bottom: string; stars: number } {
  const meters = altitude / 10;
  const i = zoneIndexAt(meters);
  const lo = ZONES[i]!;
  const hi = ZONES[Math.min(i + 1, ZONES.length - 1)]!;
  const t = zoneProgress(meters);
  const c = (a: [number, number, number], b: [number, number, number]) =>
    `rgb(${lerp(a[0], b[0], t) | 0},${lerp(a[1], b[1], t) | 0},${lerp(a[2], b[2], t) | 0})`;
  return { top: c(lo.top, hi.top), bottom: c(lo.bottom, hi.bottom), stars: Math.min(1, Math.max(0, (meters - 700) / 1000)) };
}

const PLATFORM_COLORS: Record<Platform['kind'], string> = {
  static: '#7ee08a',
  moving: '#6db7ff',
  crumbling: '#c9a06b',
  spring: '#7ee08a',
  phantom: '#e08ad0',
};

export function createRenderer(canvas: HTMLCanvasElement): {
  resize(): void;
  draw(world: World, alpha?: number): void;
  viewHeight(): number;
  addPop(x: number, y: number, bonus: number, combo: number, time: number): void;
  burst(x: number, y: number, kind: 'dust' | 'spring' | 'break' | 'boost' | 'stomp', time: number): void;
} {
  const ctx = canvas.getContext('2d')!;
  let viewH = 700;
  let cssW = 400;
  let cssH = 700;
  const pops: { x: number; y: number; bonus: number; combo: number; spawnTime: number }[] = [];
  const particles: Particle[] = [];
  const MAX_PARTICLES = 120;
  let prevPlayerVy = 0;
  let landPulseTime = -1;

  function resize(): void {
    const parent = canvas.parentElement!;
    cssW = Math.min(parent.clientWidth, (parent.clientHeight * 9) / 16);
    cssH = parent.clientHeight;
    viewH = (TUNING.viewWidth * cssH) / cssW;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform((cssW * dpr) / TUNING.viewWidth, 0, 0, (cssW * dpr) / TUNING.viewWidth, 0, 0);
  }

  function burst(x: number, y: number, kind: 'dust' | 'spring' | 'break' | 'boost' | 'stomp', time: number): void {
    const spec = {
      dust: { n: 5, spread: 55, up: -35, g: 420, colors: ['rgba(255,255,255,0.75)'] },
      spring: { n: 8, spread: 85, up: -130, g: 520, colors: ['#ffd23e', 'rgba(255,255,255,0.85)'] },
      break: { n: 8, spread: 80, up: -45, g: 720, colors: ['#c9a06b', '#a8814f'] },
      boost: { n: 10, spread: 70, up: -70, g: 320, colors: ['#ff9f43', '#ffd23e'] },
      stomp: { n: 10, spread: 130, up: -85, g: 620, colors: ['#ffffff', '#ffd23e'] },
    }[kind];
    for (let i = 0; i < spec.n; i++) {
      // deterministic pseudo-spread from index+time (cosmetic, no Math.random → replays match)
      const ang = (i / spec.n) * Math.PI * 2 + time * 2.7;
      const sp = spec.spread * (0.45 + (((i * 37) % 10) / 10) * 0.55);
      if (particles.length >= MAX_PARTICLES) particles.shift();
      particles.push({
        x0: x,
        y0: y,
        vx: Math.cos(ang) * sp,
        vy: spec.up - Math.abs(Math.sin(ang)) * sp * 0.5,
        spawnTime: time,
        life: 0.45 + (((i * 13) % 5) / 10),
        size: 2.5 + (((i * 7) % 3) * 0.6),
        color: spec.colors[i % spec.colors.length]!,
        gravity: spec.g,
      });
    }
  }

  function drawPlatform(p: Platform, camY: number, time: number): void {
    if (p.broken) return;
    const y = p.y - camY;
    if (p.kind === 'phantom') {
      const cycle = TUNING.phantomOn + TUNING.phantomOff;
      const tt = (((time + p.phase) % cycle) + cycle) % cycle;
      const a = phantomVisible(p, time)
        ? Math.min(1, tt / 0.25, (TUNING.phantomOn - tt) / 0.25)
        : 0;
      if (a <= 0) return;
      ctx.globalAlpha = Math.max(0.15, a);
    }
    ctx.fillStyle = PLATFORM_COLORS[p.kind];
    ctx.beginPath();
    ctx.roundRect(p.x - p.w / 2, y, p.w, TUNING.platformH, 7);
    ctx.fill();
    if (p.kind === 'spring') {
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath();
      ctx.roundRect(p.x - 10, y - 8, 20, 8, 3);
      ctx.fill();
    }
    if (p.kind === 'crumbling') {
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.x - 8, y + 2);
      ctx.lineTo(p.x - 2, y + TUNING.platformH - 3);
      ctx.lineTo(p.x + 5, y + 4);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawPlayer(world: World, camY: number, px: number, py: number, time: number): void {
    const r = TUNING.playerR;
    const y = py - camY;
    const vy = world.player.vy;
    const base = Math.min(0.16, Math.abs(vy) / 6500);
    // directional squash/stretch: tall while rising, squat while falling
    let sx = vy < 0 ? 1 - base * 0.7 : 1 + base * 0.6;
    let sy = vy < 0 ? 1 + base : 1 - base * 0.6;
    // land splat overlaid briefly after a bounce
    const pulse = landPulseTime >= 0 ? easeOutPulse(time - landPulseTime) : 0;
    sx += pulse * 0.35;
    sy -= pulse * 0.3;
    const blinking = time % 3.5 < 0.12;
    for (const ox of [0, -TUNING.viewWidth, TUNING.viewWidth]) {
      const x = px + ox;
      if (x < -r || x > TUNING.viewWidth + r) continue;
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath();
      ctx.ellipse(x, y, r * sx, r * sy, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1c1c28';
      const look = vy < 0 ? -3 : 2;
      if (blinking) {
        ctx.strokeStyle = '#1c1c28';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x - 7, y - 3 + look);
        ctx.lineTo(x - 3, y - 3 + look);
        ctx.moveTo(x + 3, y - 3 + look);
        ctx.lineTo(x + 7, y - 3 + look);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(x - 5, y - 3 + look, 2.6, 0, Math.PI * 2);
        ctx.arc(x + 5, y - 3 + look, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function draw(world: World, alpha = 1): void {
    const camY = world.prevCameraY + (world.cameraY - world.prevCameraY) * alpha;

    const sky = skyAt(world.maxAltitude);
    const g = ctx.createLinearGradient(0, 0, 0, viewH);
    g.addColorStop(0, sky.top);
    g.addColorStop(1, sky.bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, TUNING.viewWidth, viewH);

    if (sky.stars > 0.05) {
      ctx.fillStyle = `rgba(255,255,255,${0.5 * sky.stars})`;
      for (let i = 0; i < 40; i++) {
        // deterministic star field scrolled with parallax
        const sx = ((i * 89) % TUNING.viewWidth) + (i % 3);
        const sy = (((i * 211) % 900) - ((camY * 0.15) % 900) + 900) % 900;
        if (sy < viewH) ctx.fillRect(sx, sy, 2, 2);
      }
    }

    for (const p of world.platforms) drawPlatform(p, camY, world.time);

    for (const pk of world.pickups) {
      if (pk.taken) continue;
      const bob = Math.sin(world.time * 4 + pk.id) * 2;
      const y = pk.y - camY + bob;
      ctx.fillStyle = '#ff9f43';
      ctx.beginPath();
      ctx.arc(pk.x, y, TUNING.pickupR - 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath();
      ctx.moveTo(pk.x, y - TUNING.pickupR + 1);
      ctx.lineTo(pk.x - 4, y + 2);
      ctx.lineTo(pk.x + 4, y + 2);
      ctx.fill();
    }

    // enemies: procedural monster, glow-accented by the current zone, wrap-x like the player
    const zt = ZONES[zoneIndexAt(world.maxAltitude / 10)]!.top;
    for (const e of world.enemies) {
      if (e.dead) continue;
      const ey = e.y - camY;
      for (const ox of [0, -TUNING.viewWidth, TUNING.viewWidth]) {
        const ex = e.x + ox;
        if (ex < -TUNING.enemyR || ex > TUNING.viewWidth + TUNING.enemyR) continue;
        ctx.fillStyle = `rgba(${zt[0]},${zt[1]},${zt[2]},0.5)`; // zone-tinted glow halo
        ctx.beginPath();
        ctx.arc(ex, ey, TUNING.enemyR + 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3a1d5c'; // dark body — high contrast in every zone
        ctx.beginPath();
        ctx.arc(ex, ey, TUNING.enemyR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; // light outline so the silhouette reads in dark zones
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ex - 5, ey - 3, 3.2, 0, Math.PI * 2);
        ctx.arc(ex + 5, ey - 3, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1c1c28';
        ctx.beginPath();
        ctx.arc(ex - 5, ey - 3, 1.6, 0, Math.PI * 2);
        ctx.arc(ex + 5, ey - 3, 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ff5a6e'; // angry mouth
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ex - 6, ey + 7);
        ctx.lineTo(ex + 6, ey + 7);
        ctx.stroke();
      }
    }

    const w = TUNING.viewWidth;
    const rawDx = world.player.x - world.player.prevX;
    const dx = ((rawDx + w * 1.5) % w) - w / 2;
    const px = (((world.player.prevX + dx * alpha) % w) + w) % w;
    const py = world.player.prevY + (world.player.y - world.player.prevY) * alpha;
    // a +→− vy flip means the ball just bounced up: trigger the land splat
    if (prevPlayerVy > 0 && world.player.vy < 0) landPulseTime = world.time;
    prevPlayerVy = world.player.vy;
    drawPlayer(world, camY, px, py, world.time);

    if (world.player.boostT > 0) {
      ctx.fillStyle = 'rgba(255, 159, 67, 0.85)';
      ctx.beginPath();
      ctx.moveTo(px - 6, py - camY + TUNING.playerR - 2);
      ctx.lineTo(px + 6, py - camY + TUNING.playerR - 2);
      ctx.lineTo(px, py - camY + TUNING.playerR + 14 + Math.sin(world.time * 30) * 3);
      ctx.fill();
    }

    const POP_DURATION = 0.8;
    ctx.textAlign = 'center';
    for (let i = pops.length - 1; i >= 0; i--) {
      const pop = pops[i]!;
      const age = world.time - pop.spawnTime;
      if (age < 0 || age > POP_DURATION) {
        pops.splice(i, 1);
        continue;
      }
      const t = age / POP_DURATION;
      const px = (((pop.x % TUNING.viewWidth) + TUNING.viewWidth) % TUNING.viewWidth);
      const py = pop.y - camY - t * 26; // rise
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = pop.combo >= 3 ? '#ffd23e' : '#7ee08a';
      ctx.font = `bold ${14 + Math.min(pop.combo, 6) * 2}px system-ui, sans-serif`;
      ctx.fillText(`+${pop.bonus}${pop.combo >= 2 ? ` ×${pop.combo}` : ''}`, px, py);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';

    const pw = TUNING.viewWidth;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]!;
      const s = particleAt(p, world.time);
      if (s.dead) {
        particles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(((s.x % pw) + pw) % pw, s.y - camY, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  return {
    resize,
    draw,
    viewHeight: () => viewH,
    addPop(x: number, y: number, bonus: number, combo: number, time: number): void {
      pops.push({ x, y, bonus, combo, spawnTime: time });
    },
    burst,
  };
}

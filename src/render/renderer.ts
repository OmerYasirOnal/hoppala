import { TUNING, type Platform, type World } from '../game/types';
import { phantomVisible } from '../game/sim';
import { ZONES, zoneIndexAt, zoneProgress } from '../game/zones';

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
} {
  const ctx = canvas.getContext('2d')!;
  let viewH = 700;
  let cssW = 400;
  let cssH = 700;

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

  function drawPlayer(world: World, camY: number, px: number, py: number): void {
    const r = TUNING.playerR;
    const y = py - camY;
    for (const ox of [0, -TUNING.viewWidth, TUNING.viewWidth]) {
      const x = px + ox;
      if (x < -r || x > TUNING.viewWidth + r) continue;
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath();
      const squash = Math.min(0.18, Math.abs(world.player.vy) / 6000);
      ctx.ellipse(x, y, r * (1 + squash), r * (1 - squash), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1c1c28';
      const look = world.player.vy < 0 ? -3 : 2;
      ctx.beginPath();
      ctx.arc(x - 5, y - 3 + look, 2.6, 0, Math.PI * 2);
      ctx.arc(x + 5, y - 3 + look, 2.6, 0, Math.PI * 2);
      ctx.fill();
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
    drawPlayer(world, camY, px, py);

    if (world.player.boostT > 0) {
      ctx.fillStyle = 'rgba(255, 159, 67, 0.85)';
      ctx.beginPath();
      ctx.moveTo(px - 6, py - camY + TUNING.playerR - 2);
      ctx.lineTo(px + 6, py - camY + TUNING.playerR - 2);
      ctx.lineTo(px, py - camY + TUNING.playerR + 14 + Math.sin(world.time * 30) * 3);
      ctx.fill();
    }
  }

  return { resize, draw, viewHeight: () => viewH };
}

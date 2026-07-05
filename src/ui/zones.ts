import { t } from './screens';
import { trailLayout } from './trail';

export interface ZonesView {
  rows: { key: string; name: string; meters: number; color: string; reached: boolean }[];
  reachedCount: number;
  best: number;
  onClose(): void;
}

/** Renders the Journey Map overlay (a winding trail of the zones). Replaces any existing one. */
export function renderZones(root: HTMLElement, view: ZonesView): void {
  root.querySelector('.zones-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay zones-overlay';

  const zones = view.rows.length;
  const nodeCount = zones + 1; // + the ∞ cap
  const W = 320;
  const vSpacing = 66;
  const margin = 46;
  const H = Math.round((nodeCount - 1) * vSpacing + margin * 2);
  const nodes = trailLayout(nodeCount, { width: W, vSpacing, margin });
  const current = Math.min(Math.max(view.reachedCount - 1, 0), zones - 1); // highest reached zone
  const cosmosReached = current >= zones - 1;

  const P = (i: number): string => `${nodes[i]!.x.toFixed(1)} ${nodes[i]!.y.toFixed(1)}`;
  let travelled = `M ${P(0)}`;
  for (let i = 1; i <= current; i++) travelled += ` L ${P(i)}`;
  let beyond = `M ${P(current)}`;
  for (let i = current + 1; i < nodeCount; i++) beyond += ` L ${P(i)}`;

  const parts = nodes.map((n, i) => {
    const isCap = i === nodeCount - 1;
    const reached = isCap ? cosmosReached : i <= current;
    const isCurrent = i === current;
    const r = isCap ? 13 : 15;
    const fill = isCap ? (reached ? '#ffd23e' : '#33405e') : reached ? view.rows[i]!.color : '#33405e';
    const stroke = reached ? 'rgba(255,255,255,0.85)' : '#22304d';
    const ring = isCurrent
      ? `<circle cx="${n.x}" cy="${n.y}" r="${r + 5}" fill="none" stroke="#fff" stroke-width="2" opacity="0.9"/>`
      : '';
    const glyph = isCap ? '∞' : reached ? '' : '🔒';
    const glyphEl = glyph
      ? `<text x="${n.x}" y="${n.y + (isCap ? 6 : 5)}" text-anchor="middle" font-size="${isCap ? 17 : 12}" fill="${reached ? '#1c1c28' : '#9fb0d4'}">${glyph}</text>`
      : '';
    const left = n.side === 'left';
    const lx = left ? n.x + r + 9 : n.x - r - 9;
    const anchor = left ? 'start' : 'end';
    let label: string;
    if (isCap) label = escapeHtml(t.climbForever);
    else if (!reached) label = '???';
    else {
      const name = escapeHtml(view.rows[i]!.name);
      label = isCurrent
        ? `▲ ${name} · ${view.best} m`
        : `${name} · ${i === 0 ? escapeHtml(t.start) : `${view.rows[i]!.meters} m`}`;
    }
    const cls = isCurrent ? 'jm-here' : reached ? 'jm-on' : 'jm-off';
    const labelEl = `<text x="${lx}" y="${n.y + 4}" text-anchor="${anchor}" class="${cls}">${label}</text>`;
    return `${ring}<circle cx="${n.x}" cy="${n.y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>${glyphEl}${labelEl}`;
  });

  const svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" class="jm-svg" xmlns="http://www.w3.org/2000/svg">
    <path d="${beyond}" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="3" stroke-dasharray="3 7" stroke-linecap="round"/>
    <path d="${travelled}" fill="none" stroke="#7ee08a" stroke-width="4" stroke-linecap="round"/>
    ${parts.join('')}
  </svg>`;

  overlay.innerHTML = `
    <div class="modal jm-modal">
      <h2>${t.journey}</h2>
      <div class="dim" style="margin:-6px 0 8px">${t.reached}: ${view.reachedCount}/${zones}</div>
      <div class="jm-scroll">${svg}</div>
      <div class="modal-actions"><button id="z-close">${t.close}</button></div>
    </div>`;
  (overlay.querySelector('#z-close') as HTMLButtonElement).addEventListener('click', () => {
    overlay.remove();
    view.onClose();
  });
  root.append(overlay);

  // auto-scroll so the current node is centred
  const scroller = overlay.querySelector('.jm-scroll') as HTMLElement | null;
  if (scroller) scroller.scrollTop = Math.max(0, nodes[current]!.y - scroller.clientHeight / 2);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

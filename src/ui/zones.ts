import { t } from './screens';

export interface ZonesView {
  rows: { key: string; name: string; meters: number; color: string; reached: boolean }[];
  reachedCount: number;
  onClose(): void;
}

/** Renders the zones-collection overlay. Replaces any existing one under root. */
export function renderZones(root: HTMLElement, view: ZonesView): void {
  root.querySelector('.zones-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay zones-overlay';
  const list = view.rows
    .map(
      (r) =>
        `<div class="zrow ${r.reached ? 'got' : 'locked'}"><span class="zdot" style="background:${r.reached ? r.color : '#33405e'}"></span><span class="zname">${r.reached ? escapeHtml(r.name) : '???'}</span><span class="zmeta">${r.reached ? `${r.meters} m+` : '🔒'}</span></div>`,
    )
    .join('');
  overlay.innerHTML = `
    <div class="modal">
      <h2>${t.zones} <span class="dim">${view.reachedCount}/${view.rows.length}</span></h2>
      <div class="zlist">${list}</div>
      <div class="modal-actions"><button id="z-close">${t.close}</button></div>
    </div>`;
  (overlay.querySelector('#z-close') as HTMLButtonElement).addEventListener('click', () => {
    overlay.remove();
    view.onClose();
  });
  root.append(overlay);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

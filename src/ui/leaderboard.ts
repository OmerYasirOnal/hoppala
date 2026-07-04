import type { ScoreRow } from '../online/types';
import { t } from './screens';

export interface LeaderboardView {
  tab: 'global' | 'daily';
  rows: ScoreRow[];
  meUid: string | null;
  me?: { rank: number; name: string; score: number } | null; // pinned "you" row when outside the top list
  offline: boolean;
  loading: boolean;
  onTab(tab: 'global' | 'daily'): void;
  onRefresh(): void;
  onClose(): void;
}

/** Renders the leaderboard overlay. Replaces any existing leaderboard overlay under root. */
export function renderLeaderboard(root: HTMLElement, view: LeaderboardView): void {
  root.querySelector('.lb-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay lb-overlay';

  const list = view.loading
    ? `<div class="lb-empty">${t.loading}</div>`
    : view.rows.length === 0
      ? `<div class="lb-empty">${view.offline ? t.offline : '—'}</div>`
      : view.rows
          .map((r, i) => {
            const me = r.uid === view.meUid ? ' me' : '';
            const name = escapeHtml(r.name);
            return `<div class="lb-row${me}"><span class="lb-rank">${i + 1}</span><span class="lb-name">${name}</span><span class="lb-score">${r.score} m</span></div>`;
          })
          .join('');

  overlay.innerHTML = `
    <div class="modal lb-modal">
      <div class="lb-tabs">
        <button class="lb-tab ${view.tab === 'global' ? 'active' : ''}" data-tab="global">${t.global}</button>
        <button class="lb-tab ${view.tab === 'daily' ? 'active' : ''}" data-tab="daily">${t.daily}</button>
        ${view.offline ? `<span class="lb-badge">${t.offline}</span>` : ''}
      </div>
      <div class="lb-list">${list}</div>
      ${
        view.me && !view.rows.some((r) => r.uid === view.meUid)
          ? `<div class="lb-pinned"><div class="lb-row me"><span class="lb-rank">${view.me.rank}</span><span class="lb-name">${escapeHtml(view.me.name)} · ${t.you}</span><span class="lb-score">${view.me.score} m</span></div></div>`
          : ''
      }
      <div class="modal-actions">
        <button class="ghost" id="lb-refresh">${t.refresh}</button>
        <button id="lb-close">${t.close}</button>
      </div>
    </div>`;

  overlay.querySelectorAll('.lb-tab').forEach((btn) =>
    btn.addEventListener('click', () => view.onTab((btn as HTMLElement).dataset.tab as 'global' | 'daily')),
  );
  (overlay.querySelector('#lb-refresh') as HTMLButtonElement).addEventListener('click', view.onRefresh);
  (overlay.querySelector('#lb-close') as HTMLButtonElement).addEventListener('click', () => {
    overlay.remove();
    view.onClose();
  });
  root.append(overlay);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

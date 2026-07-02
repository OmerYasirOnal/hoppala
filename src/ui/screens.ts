const STRINGS = {
  tr: { title: 'Hoppala', play: 'Başla', again: 'Tekrar', share: 'Paylaş', best: 'Rekor', record: 'Yeni rekor!', copied: 'Kopyalandı!', hint: 'Sürükleyerek yönlendir' },
  en: { title: 'Hoppala', play: 'Play', again: 'Again', share: 'Share', best: 'Best', record: 'New record!', copied: 'Copied!', hint: 'Drag to steer' },
} as const;

export function lang(): 'tr' | 'en' {
  return navigator.language?.toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

export const t = STRINGS[lang()];

export function createUI(
  root: HTMLElement,
  handlers: { onPlay(): void; onShare(): void; onToggleMute(): boolean },
): {
  showMenu(best: number): void;
  showGameOver(score: number, best: number, isRecord: boolean): void;
  showHud(): void;
  setScore(m: number): void;
  setMuted(muted: boolean): void;
  toast(msg: string): void;
} {
  root.innerHTML = `
    <div class="hud hidden"><span id="score">0 m</span></div>
    <button class="mute" id="mute" aria-label="sound">🔊</button>
    <div class="panel" id="panel"></div>
    <div class="toast hidden" id="toast"></div>
  `;
  const hud = root.querySelector('.hud') as HTMLElement;
  const scoreEl = root.querySelector('#score') as HTMLElement;
  const panel = root.querySelector('#panel') as HTMLElement;
  const muteBtn = root.querySelector('#mute') as HTMLButtonElement;
  const toastEl = root.querySelector('#toast') as HTMLElement;

  muteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setMuted(handlers.onToggleMute());
  });

  function setMuted(muted: boolean): void {
    muteBtn.textContent = muted ? '🔇' : '🔊';
  }

  function button(label: string, ghost: boolean, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.textContent = label;
    if (ghost) b.className = 'ghost';
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    return b;
  }

  function showMenu(best: number): void {
    hud.classList.add('hidden');
    panel.classList.remove('hidden');
    panel.innerHTML = `<h1>${t.title}</h1><div class="sub">${t.hint}</div>${best > 0 ? `<div class="sub">${t.best}: ${best} m</div>` : ''}`;
    panel.append(button(t.play, false, handlers.onPlay));
  }

  function showGameOver(score: number, best: number, isRecord: boolean): void {
    hud.classList.add('hidden');
    panel.classList.remove('hidden');
    panel.innerHTML = `
      <div class="score-big">${score} m</div>
      ${isRecord ? `<div class="sub">🏆 ${t.record}</div>` : `<div class="sub">${t.best}: ${best} m</div>`}
    `;
    panel.append(button(t.again, false, handlers.onPlay));
    panel.append(button(t.share, true, handlers.onShare));
  }

  function showHud(): void {
    panel.classList.add('hidden');
    panel.innerHTML = '';
    hud.classList.remove('hidden');
  }

  function toast(msg: string): void {
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    setTimeout(() => toastEl.classList.add('hidden'), 1600);
  }

  return {
    showMenu,
    showGameOver,
    showHud,
    setScore: (m) => {
      scoreEl.textContent = `${m} m`;
    },
    setMuted,
    toast,
  };
}

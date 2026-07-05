import type { GameMode } from '../platform/bridge';

const STRINGS = {
  tr: {
    title: 'Hoppala', play: 'Başla', again: 'Tekrar', share: 'Paylaş', best: 'Rekor', record: 'Yeni rekor!',
    copied: 'Kopyalandı!', hint: 'Sürükleyerek yönlendir', free: 'Serbest', daily: 'Günlük', dailyBest: 'Günün rekoru',
    leaderboard: 'Sıralama', global: 'Global', rank: 'Sıralaman', players: 'oyuncu', syncPending: 'senkron bekliyor',
    settings: 'Ayarlar', sound: 'Ses', haptics: 'Titreşim', language: 'Dil', system: 'Sistem', nickname: 'Takma ad',
    enterName: 'Takma adını seç', save: 'Kaydet', cancel: 'Vazgeç', reset: 'Verileri sıfırla',
    resetConfirm: 'Tüm veriler silinsin mi?', offline: 'çevrimdışı', refresh: 'Yenile', loading: 'Yükleniyor…',
    close: 'Kapat', you: 'Sen', version: 'Sürüm', credits: 'Künye', invalidName: '3–16 karakter, uygun bir ad gir',
    sensitivity: 'Hassasiyet',
  },
  en: {
    title: 'Hoppala', play: 'Play', again: 'Again', share: 'Share', best: 'Best', record: 'New record!',
    copied: 'Copied!', hint: 'Drag to steer', free: 'Free', daily: 'Daily', dailyBest: "Today's best",
    leaderboard: 'Leaderboard', global: 'Global', rank: 'Your rank', players: 'players', syncPending: 'sync pending',
    settings: 'Settings', sound: 'Sound', haptics: 'Haptics', language: 'Language', system: 'System', nickname: 'Nickname',
    enterName: 'Pick your nickname', save: 'Save', cancel: 'Cancel', reset: 'Reset data',
    resetConfirm: 'Erase all data?', offline: 'offline', refresh: 'Refresh', loading: 'Loading…',
    close: 'Close', you: 'You', version: 'Version', credits: 'Credits', invalidName: 'Enter a valid 3–16 char name',
    sensitivity: 'Sensitivity',
  },
} as const;

export function lang(): 'tr' | 'en' {
  return navigator.language?.toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

export let t = STRINGS[lang()];

/** Re-point the active string table. Called at boot from the saved override (main.ts). */
export function setLang(l: 'tr' | 'en'): void {
  t = STRINGS[l];
}

export function createUI(
  root: HTMLElement,
  handlers: { onPlay(mode: GameMode): void; onShare(): void; onToggleMute(): boolean; onLeaderboard(): void; onSettings(): void },
): {
  showMenu(best: number, daily: { day: number; best: number }, rank?: string): void;
  showGameOver(score: number, best: number, isRecord: boolean, daily?: { day: number; best: number }, rank?: string): void;
  showHud(daily?: { day: number }): void;
  setScore(m: number): void;
  setMuted(muted: boolean): void;
  toast(msg: string): void;
  showOnboardingTip(): void;
} {
  root.innerHTML = `
    <div class="hud hidden"><span id="score">0 m</span><span id="daybadge" class="daybadge hidden"></span></div>
    <button class="mute" id="mute" aria-label="sound">🔊</button>
    <div class="panel" id="panel"></div>
    <div class="toast hidden" id="toast"></div>
  `;
  const hud = root.querySelector('.hud') as HTMLElement;
  const scoreEl = root.querySelector('#score') as HTMLElement;
  const dayBadge = root.querySelector('#daybadge') as HTMLElement;
  const panel = root.querySelector('#panel') as HTMLElement;
  const muteBtn = root.querySelector('#mute') as HTMLButtonElement;
  const toastEl = root.querySelector('#toast') as HTMLElement;
  let lastScore = -1;

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

  function showMenu(best: number, daily: { day: number; best: number }, rank?: string): void {
    hud.classList.add('hidden');
    panel.classList.remove('hidden');
    const rankLine = rank ? `<div class="sub">${t.best}: ${best} m · ${rank}</div>` : best > 0 ? `<div class="sub">${t.best}: ${best} m</div>` : '';
    panel.innerHTML = `<h1>${t.title}</h1><div class="sub">${t.hint}</div>${rankLine}${daily.best > 0 ? `<div class="sub">${t.dailyBest}: ${daily.best} m</div>` : ''}`;
    panel.append(button(t.free, false, () => handlers.onPlay('free')));
    panel.append(button(`${t.daily} #${daily.day}`, false, () => handlers.onPlay('daily')));
    panel.append(button(`🏆 ${t.leaderboard}`, true, handlers.onLeaderboard));
    panel.append(button(`⚙ ${t.settings}`, true, handlers.onSettings));
  }

  function showGameOver(score: number, best: number, isRecord: boolean, daily?: { day: number; best: number }, rank?: string): void {
    hud.classList.add('hidden');
    panel.classList.remove('hidden');
    const subLine = isRecord
      ? `<div class="sub">🏆 ${t.record}</div>`
      : daily
        ? `<div class="sub">${t.dailyBest}: ${daily.best} m</div>`
        : `<div class="sub">${t.best}: ${best} m</div>`;
    const rankLine = rank ? `<div class="sub">${t.rank}: ${rank}</div>` : '';
    panel.innerHTML = `
      <div class="score-big">${score} m</div>
      ${subLine}
      ${rankLine}
    `;
    panel.append(button(t.again, false, () => handlers.onPlay(daily ? 'daily' : 'free')));
    panel.append(button(`🏆 ${t.leaderboard}`, true, handlers.onLeaderboard));
    panel.append(button(t.share, true, handlers.onShare));
  }

  function showHud(daily?: { day: number }): void {
    panel.classList.add('hidden');
    panel.innerHTML = '';
    hud.classList.remove('hidden');
    if (daily) {
      dayBadge.textContent = `#${daily.day}`;
      dayBadge.classList.remove('hidden');
    } else {
      dayBadge.classList.add('hidden');
    }
  }

  function toast(msg: string): void {
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    setTimeout(() => toastEl.classList.add('hidden'), 1600);
  }

  function showOnboardingTip(): void {
    const tip = document.createElement('div');
    tip.className = 'coach-tip';
    tip.textContent = `${t.hint} 👆`;
    root.append(tip);
    setTimeout(() => tip.classList.add('fade'), 1400);
    setTimeout(() => tip.remove(), 2400);
  }

  return {
    showMenu,
    showGameOver,
    showHud,
    setScore: (m) => {
      if (m === lastScore) return;
      lastScore = m;
      scoreEl.textContent = `${m} m`;
    },
    setMuted,
    toast,
    showOnboardingTip,
  };
}

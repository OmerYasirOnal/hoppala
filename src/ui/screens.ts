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
    zones: 'Bölgeler', reached: 'Ulaşılan', zone_meadow: 'Çayır', zone_sky: 'Gökyüzü', zone_clouds: 'Bulutlar', zone_dawn: 'Şafak', zone_aurora: 'Kutup', zone_strato: 'Stratosfer', zone_space: 'Uzay', zone_cosmos: 'Kozmos', newZone: 'Yeni bölge',
    bestCombo: 'En yüksek combo',
    pause: 'Durdur', resume: 'Devam', mainMenu: 'Ana menü', paused: 'Durduruldu',
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
    zones: 'Zones', reached: 'Reached', zone_meadow: 'Meadow', zone_sky: 'Sky', zone_clouds: 'Clouds', zone_dawn: 'Dawn', zone_aurora: 'Aurora', zone_strato: 'Stratosphere', zone_space: 'Space', zone_cosmos: 'Cosmos', newZone: 'New zone',
    bestCombo: 'Best combo',
    pause: 'Pause', resume: 'Resume', mainMenu: 'Main menu', paused: 'Paused',
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

/** Localized zone name for a zones.ts key. */
export function zoneLabel(key: string): string {
  return (t as Record<string, string>)[`zone_${key}`] ?? key;
}

export function createUI(
  root: HTMLElement,
  handlers: { onPlay(mode: GameMode): void; onShare(): void; onToggleMute(): boolean; onLeaderboard(): void; onSettings(): void; onZones(): void; onPause(): void },
): {
  showMenu(best: number, daily: { day: number; best: number }, rank?: string): void;
  showGameOver(score: number, best: number, isRecord: boolean, daily?: { day: number; best: number }, rank?: string, bestCombo?: number): void;
  showHud(daily?: { day: number }): void;
  setScore(m: number): void;
  setMuted(muted: boolean): void;
  toast(msg: string): void;
  showOnboardingTip(): void;
  setZone(name: string, progress: number): void;
  showZoneBanner(name: string): void;
  showZoneCelebration(name: string, color: string): void;
  setCombo(combo: number, fraction: number): void;
  clearCombo(): void;
  showPause(cbs: { onResume(): void; onMainMenu(): void }): void;
} {
  root.innerHTML = `
    <div class="hud hidden"><span id="score">0 m</span><span id="zone" class="zone"></span><span id="daybadge" class="daybadge hidden"></span><div id="zonebar" class="zonebar"><div id="zonebar-fill"></div></div></div>
    <div class="combo-meter" id="combo-meter"><span id="combo-x"></span><div class="combo-bar"><div id="combo-fill"></div></div></div>
    <button class="mute" id="mute" aria-label="sound">🔊</button>
    <button class="pause hidden" id="pause" aria-label="pause">⏸</button>
    <div class="panel" id="panel"></div>
    <div class="toast hidden" id="toast"></div>
  `;
  const hud = root.querySelector('.hud') as HTMLElement;
  const scoreEl = root.querySelector('#score') as HTMLElement;
  const dayBadge = root.querySelector('#daybadge') as HTMLElement;
  const zoneEl = root.querySelector('#zone') as HTMLElement;
  const zoneFill = root.querySelector('#zonebar-fill') as HTMLElement;
  const comboMeter = root.querySelector('#combo-meter') as HTMLElement;
  const comboX = root.querySelector('#combo-x') as HTMLElement;
  const comboFill = root.querySelector('#combo-fill') as HTMLElement;
  const panel = root.querySelector('#panel') as HTMLElement;
  const muteBtn = root.querySelector('#mute') as HTMLButtonElement;
  const toastEl = root.querySelector('#toast') as HTMLElement;
  let lastScore = -1;

  muteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setMuted(handlers.onToggleMute());
  });

  const pauseBtn = root.querySelector('#pause') as HTMLButtonElement;
  pauseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handlers.onPause();
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
    clearCombo();
    hud.classList.add('hidden');
    pauseBtn.classList.add('hidden');
    panel.classList.remove('hidden');
    const rankLine = rank ? `<div class="sub">${t.best}: ${best} m · ${rank}</div>` : best > 0 ? `<div class="sub">${t.best}: ${best} m</div>` : '';
    panel.innerHTML = `<h1>${t.title}</h1><div class="sub">${t.hint}</div>${rankLine}${daily.best > 0 ? `<div class="sub">${t.dailyBest}: ${daily.best} m</div>` : ''}`;
    panel.append(button(t.free, false, () => handlers.onPlay('free')));
    panel.append(button(`${t.daily} #${daily.day}`, false, () => handlers.onPlay('daily')));
    panel.append(button(`🏆 ${t.leaderboard}`, true, handlers.onLeaderboard));
    panel.append(button(`🗺️ ${t.zones}`, true, handlers.onZones));
    panel.append(button(`⚙ ${t.settings}`, true, handlers.onSettings));
  }

  function showGameOver(score: number, best: number, isRecord: boolean, daily?: { day: number; best: number }, rank?: string, bestCombo = 0): void {
    clearCombo();
    pauseBtn.classList.add('hidden');
    hud.classList.add('hidden');
    panel.classList.remove('hidden');
    const subLine = isRecord
      ? `<div class="sub">🏆 ${t.record}</div>`
      : daily
        ? `<div class="sub">${t.dailyBest}: ${daily.best} m</div>`
        : `<div class="sub">${t.best}: ${best} m</div>`;
    const rankLine = rank ? `<div class="sub">${t.rank}: ${rank}</div>` : '';
    const comboLine = bestCombo >= 2 ? `<div class="sub">${t.bestCombo}: ×${bestCombo}</div>` : '';
    panel.innerHTML = `
      <div class="score-big">${score} m</div>
      ${subLine}
      ${rankLine}
      ${comboLine}
    `;
    panel.append(button(t.again, false, () => handlers.onPlay(daily ? 'daily' : 'free')));
    panel.append(button(`🏆 ${t.leaderboard}`, true, handlers.onLeaderboard));
    panel.append(button(t.share, true, handlers.onShare));
  }

  function showHud(daily?: { day: number }): void {
    setZone('', 0);
    clearCombo();
    panel.classList.add('hidden');
    panel.innerHTML = '';
    hud.classList.remove('hidden');
    pauseBtn.classList.remove('hidden');
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
    tip.className = 'coach-tip big';
    tip.textContent = `👆 ${t.hint}`;
    root.append(tip);
    setTimeout(() => tip.classList.add('fade'), 2000);
    setTimeout(() => tip.remove(), 2900);
  }

  let lastZoneName = '';
  let lastPct = -1;
  function setZone(name: string, progress: number): void {
    if (name !== lastZoneName) {
      lastZoneName = name;
      zoneEl.textContent = name;
    }
    const pct = Math.round(progress * 100);
    if (pct !== lastPct) {
      lastPct = pct;
      zoneFill.style.width = `${pct}%`;
    }
  }

  function showZoneBanner(name: string): void {
    const b = document.createElement('div');
    b.className = 'zone-banner';
    b.textContent = name;
    root.append(b);
    setTimeout(() => b.classList.add('fade'), 900);
    setTimeout(() => b.remove(), 1600);
  }

  function showZoneCelebration(name: string, color: string): void {
    const c = document.createElement('div');
    c.className = 'zone-celebrate';
    c.style.setProperty('--zc', color);
    c.innerHTML = `<div class="zc-card"><div class="zc-title">🎉 ${t.newZone}</div><div class="zc-name">${name}</div></div>`;
    root.append(c);
    c.addEventListener('click', () => c.remove());
    setTimeout(() => c.classList.add('fade'), 2200);
    setTimeout(() => c.remove(), 3000);
  }

  function showPause(cbs: { onResume(): void; onMainMenu(): void }): void {
    root.querySelector('.pause-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay pause-overlay';
    overlay.innerHTML = `<div class="modal"><h2>${t.paused}</h2></div>`;
    const modal = overlay.querySelector('.modal') as HTMLElement;
    const resume = button(t.resume, false, () => {
      overlay.remove();
      cbs.onResume();
    });
    const menu = button(t.mainMenu, true, () => {
      overlay.remove();
      cbs.onMainMenu();
    });
    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    actions.append(menu, resume);
    modal.append(actions);
    root.append(overlay);
  }

  function setCombo(combo: number, fraction: number): void {
    comboMeter.classList.add('on');
    comboX.textContent = `×${combo}`;
    comboX.style.fontSize = `${18 + Math.min(combo, 8) * 2}px`;
    comboX.style.color = combo >= 5 ? '#ff7a45' : '#ffd23e';
    comboFill.style.width = `${Math.max(0, Math.min(1, fraction)) * 100}%`;
  }
  function clearCombo(): void {
    comboMeter.classList.remove('on');
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
    setZone,
    showZoneBanner,
    showZoneCelebration,
    setCombo,
    clearCombo,
    showPause,
  };
}

import { t } from './screens';

export interface SettingsState {
  muted: boolean;
  haptics: boolean;
  lang: 'tr' | 'en' | 'system';
  name: string | null;
  native: boolean; // haptics row only shown on native
  version: string;
}

export interface SettingsCallbacks {
  onMute(muted: boolean): void;
  onHaptics(on: boolean): void;
  onLang(lang: 'tr' | 'en' | 'system'): void;
  onEditName(): void;
  onReset(): void;
  onClose(): void;
}

/** Renders the settings overlay. Replaces any existing settings overlay under root. */
export function renderSettings(root: HTMLElement, state: SettingsState, cbs: SettingsCallbacks): void {
  root.querySelector('.settings-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay settings-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h2>${t.settings}</h2>
      <label class="row"><span>${t.sound}</span><input type="checkbox" id="set-sound" ${state.muted ? '' : 'checked'} /></label>
      ${state.native ? `<label class="row"><span>${t.haptics}</span><input type="checkbox" id="set-haptics" ${state.haptics ? 'checked' : ''} /></label>` : ''}
      <label class="row"><span>${t.language}</span>
        <select id="set-lang">
          <option value="system" ${state.lang === 'system' ? 'selected' : ''}>${t.system}</option>
          <option value="tr" ${state.lang === 'tr' ? 'selected' : ''}>Türkçe</option>
          <option value="en" ${state.lang === 'en' ? 'selected' : ''}>English</option>
        </select>
      </label>
      <div class="row"><span>${t.nickname}</span><button class="ghost" id="set-name">${state.name ?? '—'}</button></div>
      <div class="row"><span>${t.version}</span><span class="dim">${state.version}</span></div>
      <div class="row"><span>${t.credits}</span><span class="dim">Hoppala · vanilla TS</span></div>
      <div class="modal-actions">
        <button class="ghost danger" id="set-reset">${t.reset}</button>
        <button id="set-close">${t.close}</button>
      </div>
    </div>`;

  (overlay.querySelector('#set-sound') as HTMLInputElement).addEventListener('change', (e) => {
    cbs.onMute(!(e.target as HTMLInputElement).checked);
  });
  const hapt = overlay.querySelector('#set-haptics') as HTMLInputElement | null;
  hapt?.addEventListener('change', (e) => cbs.onHaptics((e.target as HTMLInputElement).checked));
  (overlay.querySelector('#set-lang') as HTMLSelectElement).addEventListener('change', (e) => {
    cbs.onLang((e.target as HTMLSelectElement).value as 'tr' | 'en' | 'system');
  });
  (overlay.querySelector('#set-name') as HTMLButtonElement).addEventListener('click', cbs.onEditName);
  (overlay.querySelector('#set-reset') as HTMLButtonElement).addEventListener('click', () => {
    if (confirm(t.resetConfirm)) cbs.onReset();
  });
  (overlay.querySelector('#set-close') as HTMLButtonElement).addEventListener('click', () => {
    overlay.remove();
    cbs.onClose();
  });
  root.append(overlay);
}

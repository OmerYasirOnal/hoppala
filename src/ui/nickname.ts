import { validateName } from '../online/nickname';
import { t } from './screens';

/** Modal asking for a nickname, pre-filled with `suggested`. Resolves to a valid name or null (cancel). */
export function askNickname(root: HTMLElement, suggested: string): Promise<string | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h2>${t.enterName}</h2>
        <input id="nick-input" class="nick-input" maxlength="16" value="${suggested}" autocomplete="off" />
        <div class="nick-error hidden" id="nick-error">${t.invalidName}</div>
        <div class="modal-actions"></div>
      </div>`;
    const input = overlay.querySelector('#nick-input') as HTMLInputElement;
    const error = overlay.querySelector('#nick-error') as HTMLElement;
    const actions = overlay.querySelector('.modal-actions') as HTMLElement;

    function done(value: string | null): void {
      overlay.remove();
      resolve(value);
    }
    function submit(): void {
      const valid = validateName(input.value);
      if (!valid) {
        error.classList.remove('hidden');
        return;
      }
      done(valid);
    }

    const saveBtn = document.createElement('button');
    saveBtn.textContent = t.save;
    saveBtn.addEventListener('click', submit);
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'ghost';
    cancelBtn.textContent = t.cancel;
    cancelBtn.addEventListener('click', () => done(null));
    actions.append(saveBtn, cancelBtn);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });
    root.append(overlay);
    input.focus();
    input.select();
  });
}

import { t } from './screens';

/**
 * Web placeholder for a rewarded ad: a short countdown, then resolves true (reward earned).
 * The real network (native AdMob via bridge.showRewardedAd) replaces this later.
 */
export function showRewardedAdStub(root: HTMLElement, seconds = 3): Promise<boolean> {
  return new Promise((resolve) => {
    root.querySelector('.ad-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay ad-overlay';
    let left = seconds;
    const draw = (): void => {
      overlay.innerHTML = `<div class="modal ad-modal"><div class="ad-badge">📺 ${t.adPlaceholder}</div><div class="ad-count">${left}</div></div>`;
    };
    draw();
    root.append(overlay);
    const timer = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(timer);
        overlay.remove();
        resolve(true);
      } else {
        draw();
      }
    }, 1000);
  });
}

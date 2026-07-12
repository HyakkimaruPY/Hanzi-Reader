/* Ciclo de vida visual dos componentes alterados e otimizações de interação. */
'use strict';

const root = document.documentElement;
const SETTINGS_MODAL_IDS = new Set(['mo-style']);
const numericSelector = '.stat-val,.hzvr-ring strong,.hzvr-streak-count strong,.hzvr-streak-best strong,.hzts-chip b,.hzw2-session strong,.hzpc-score,.hzpc-stats strong,.hzw2-status strong';

function fitNumericElement(element) {
  if (!(element instanceof Element)) return;
  const length = String(element.textContent || '').replace(/\s/g, '').length;
  element.dataset.valueSize = length <= 2 ? 'normal' : length <= 4 ? 'compact' : length <= 7 ? 'condensed' : 'tiny';
}
function fitNumericIndicators(scope = document) {
  if (scope instanceof Element && scope.matches(numericSelector)) fitNumericElement(scope);
  scope.querySelectorAll?.(numericSelector).forEach(fitNumericElement);
}

function resetTemporarySettings(rootElement) {
  if (!rootElement) return;
  rootElement.querySelectorAll('.hz-lang-acc.open,.h41-acc.open,.tone-box.open,[data-temporary-open].open').forEach(element => element.classList.remove('open'));
  rootElement.querySelectorAll('[aria-expanded="true"]').forEach(element => {
    if (element.closest('.hz-lang-acc,.h41-acc,[data-temporary-open]')) element.setAttribute('aria-expanded', 'false');
  });
  rootElement.querySelectorAll('.is-editing,.is-previewing,.previewing').forEach(element => element.classList.remove('is-editing', 'is-previewing', 'previewing'));
  const scroller = rootElement.matches?.('.sc,.mscroll') ? rootElement : rootElement.querySelector('.sc,.mscroll,#style-scroll');
  if (scroller) scroller.scrollTop = 0;
  try { window.hzPracticeAudio?.cancelScope('settings-preview'); } catch {}
  try { window.curAudio?.pause?.(); } catch {}
}

function watchSettingsModals() {
  document.querySelectorAll('.mo').forEach(modal => {
    if (modal.dataset.hzLifecycleBound) return;
    modal.dataset.hzLifecycleBound = '1';
    let wasOpen = modal.classList.contains('open');
    const observer = new MutationObserver(() => {
      const open = modal.classList.contains('open');
      if (wasOpen && !open && SETTINGS_MODAL_IDS.has(modal.id)) { resetTemporarySettings(modal); root.classList.remove('hz-settings-scrolling'); }
      if (!wasOpen && open) {
        modal.querySelector('.mscroll,#style-scroll')?.scrollTo({ top: 0, behavior: 'instant' });
        document.dispatchEvent(new CustomEvent('hz:modal-mounted', { detail: { id: modal.id } }));
      }
      wasOpen = open;
    });
    observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
  });
}

function bindSmoothScroller(scroller) {
  if (!scroller || scroller.dataset.hzSmoothBound) return;
  scroller.dataset.hzSmoothBound = '1';
  let endTimer = 0;
  const activate = () => {
    root.classList.add('hz-settings-scrolling');
    clearTimeout(endTimer);
    endTimer = setTimeout(() => root.classList.remove('hz-settings-scrolling'), 170);
  };
  const deactivate = () => { clearTimeout(endTimer); root.classList.remove('hz-settings-scrolling'); };
  // pointerdown/touchstart/wheel acontecem antes do primeiro frame de scroll:
  // efeitos caros já ficam suspensos quando o conteúdo começa a se mover.
  ['pointerdown', 'touchstart', 'wheel', 'scroll'].forEach(type => scroller.addEventListener(type, activate, { passive: true }));
  if ('onscrollend' in scroller) scroller.addEventListener('scrollend', deactivate, { passive: true });
}
function bindSettingsScrollers() {
  bindSmoothScroller(document.querySelector('#ss .sc'));
  bindSmoothScroller(document.getElementById('style-scroll'));
}

let settingsWarmHandle = 0;
function prewarmReaderSettings() {
  const scroller = document.getElementById('style-scroll');
  if (!scroller || settingsWarmHandle) return;
  const run = () => {
    settingsWarmHandle = 0;
    if (!scroller.isConnected) return;
    // Mede fora da interação do usuário e guarda uma altura intrínseca real
    // para os blocos que usam content-visibility. Isso evita trabalho de
    // layout no primeiro abrir e saltos ao rolar rapidamente.
    root.classList.add('hz-settings-prewarming');
    try {
      for (const block of scroller.children) {
        if (!(block instanceof HTMLElement)) continue;
        const height = Math.ceil(block.getBoundingClientRect().height);
        if (height > 0) block.style.setProperty('--hz-settings-block-size', `${height}px`);
      }
      void scroller.scrollHeight;
      scroller.dataset.hzPrewarmed = '1';
    } finally {
      root.classList.remove('hz-settings-prewarming');
    }
  };
  if ('requestIdleCallback' in window) settingsWarmHandle = requestIdleCallback(run, { timeout: 700 });
  else settingsWarmHandle = setTimeout(run, 80);
}
function watchReaderSettingsContent() {
  const scroller = document.getElementById('style-scroll');
  if (!scroller || scroller.dataset.hzWarmObserved) return;
  scroller.dataset.hzWarmObserved = '1';
  const observer = new MutationObserver(() => prewarmReaderSettings());
  observer.observe(scroller, { childList: true, subtree: true });
  window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
  prewarmReaderSettings();
}

document.addEventListener('hz:screen-change', event => {
  if (event.detail?.previous === 'ss' && event.detail?.id !== 'ss') resetTemporarySettings(document.getElementById('ss'));
  if (event.detail?.id === 'ss') requestAnimationFrame(() => document.querySelector('#ss .sc')?.scrollTo({ top: 0, behavior: 'instant' }));
}, { passive: true });
document.addEventListener('hz:practice-activity-change', event => {
  if (!event.detail?.activity) window.hzPracticeAudio?.cancel();
  fitNumericIndicators(document.getElementById('hz-sp-host') || document);
}, { passive: true });

const valueObserver = new MutationObserver(records => {
  for (const record of records) {
    const target = record.type === 'characterData' ? record.target.parentElement : record.target;
    if (target?.closest?.(numericSelector)) fitNumericElement(target.closest(numericSelector));
    for (const node of record.addedNodes || []) if (node instanceof Element) fitNumericIndicators(node);
  }
});

function boot() {
  watchSettingsModals(); bindSettingsScrollers(); watchReaderSettingsContent(); fitNumericIndicators();
  valueObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
  root.classList.add('hz-lifecycle-ready');
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();

export { fitNumericIndicators, resetTemporarySettings };

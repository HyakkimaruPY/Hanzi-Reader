/*
 * Lightweight bootstrap for manual handwriting search.
 *
 * This file is intentionally small: it only inserts the dictionary pencil
 * button and loads the real handwriting recogniser (manualSearchCore.mjs)
 * on demand, when the user actually opens manual search.  This prevents
 * the main Hanzi Reader home screen from parsing and initialising the
 * recogniser index during startup.
 */

const PENCIL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4.2L18.7 9.5l-4.2-4.2L4 15.8V20Z"></path><path d="M13.2 6.6l4.2 4.2"></path><path d="M15.3 4.5l1.2-1.2a1.4 1.4 0 0 1 2 0l2.2 2.2a1.4 1.4 0 0 1 0 2l-1.2 1.2"></path></svg>';

let booted = false;
let loadingCore = false;

function applySearchRowLayout(searchWrap, handBtn) {
  if (!searchWrap || !handBtn) return;
  const input = searchWrap.querySelector('#dict-q');
  const searchBtn = searchWrap.querySelector('#dict-go');
  const backMini = searchWrap.querySelector('.dict-back-mini');

  if (backMini && backMini.parentNode === searchWrap) {
    searchWrap.insertBefore(backMini, searchWrap.firstChild);
    backMini.style.setProperty('order', '0', 'important');
    backMini.style.setProperty('flex', '0 0 38px', 'important');
    backMini.style.setProperty('width', '38px', 'important');
    backMini.style.setProperty('min-width', '38px', 'important');
    backMini.style.setProperty('height', '42px', 'important');
  }

  if (input && input.parentNode === searchWrap) {
    searchWrap.insertBefore(input, handBtn);
    input.style.setProperty('order', '1', 'important');
    input.style.setProperty('flex', '1 1 0', 'important');
    input.style.setProperty('min-width', '0', 'important');
    input.style.setProperty('width', 'auto', 'important');
    input.style.setProperty('max-width', 'none', 'important');
  }

  if (searchBtn && searchBtn.parentNode === searchWrap) {
    if (handBtn.parentNode !== searchWrap) searchWrap.insertBefore(handBtn, searchBtn);
    searchWrap.appendChild(searchBtn);
  }

  searchWrap.style.setProperty('display', 'flex', 'important');
  searchWrap.style.setProperty('flex-wrap', 'nowrap', 'important');
  searchWrap.style.setProperty('align-items', 'center', 'important');
  searchWrap.style.setProperty('gap', '4px', 'important');
  searchWrap.style.setProperty('grid-template-columns', 'none', 'important');
  searchWrap.style.setProperty('grid-auto-flow', 'column', 'important');

  handBtn.style.setProperty('order', '2', 'important');
  handBtn.style.setProperty('flex', '0 0 44px', 'important');
  handBtn.style.setProperty('width', '44px', 'important');
  handBtn.style.setProperty('min-width', '44px', 'important');
  handBtn.style.setProperty('max-width', '44px', 'important');
  handBtn.style.setProperty('height', '42px', 'important');
  handBtn.style.setProperty('display', 'inline-flex', 'important');
  handBtn.style.setProperty('align-items', 'center', 'important');
  handBtn.style.setProperty('justify-content', 'center', 'important');

  if (searchBtn) {
    searchBtn.style.setProperty('order', '3', 'important');
    searchBtn.style.setProperty('flex', '0 0 44px', 'important');
    searchBtn.style.setProperty('width', '44px', 'important');
    searchBtn.style.setProperty('min-width', '44px', 'important');
    searchBtn.style.setProperty('max-width', '44px', 'important');
    searchBtn.style.setProperty('height', '42px', 'important');
    searchBtn.style.setProperty('display', 'inline-flex', 'important');
    searchBtn.style.setProperty('align-items', 'center', 'important');
    searchBtn.style.setProperty('justify-content', 'center', 'important');
  }
}

async function openCoreFromLazyButton(lazyBtn) {
  if (loadingCore) return;
  loadingCore = true;
  lazyBtn.disabled = true;
  lazyBtn.setAttribute('aria-busy', 'true');
  try {
    const searchWrap = lazyBtn.closest('.dict-search');
    lazyBtn.remove();
    const mod = await import('./manualSearchCore.mjs');
    if (mod && typeof mod.initManualSearch === 'function') {
      mod.initManualSearch({ autoOpen: true });
    }
    // Fallback in case the core was already initialised without the option.
    setTimeout(() => document.getElementById('dict-hand-btn')?.click(), 90);
    if (searchWrap) {
      const realBtn = document.getElementById('dict-hand-btn');
      if (realBtn) applySearchRowLayout(searchWrap, realBtn);
    }
  } catch (err) {
    console.error('[manualSearch] failed to lazy-load recogniser:', err);
    lazyBtn.disabled = false;
    lazyBtn.removeAttribute('aria-busy');
  } finally {
    loadingCore = false;
  }
}

function installButton() {
  const searchWrap = document.querySelector('.dict-search');
  if (!searchWrap) {
    setTimeout(installButton, 150);
    return;
  }
  if (document.getElementById('dict-hand-btn') || document.getElementById('dict-hand-lazy-btn')) return;
  const searchBtn = searchWrap.querySelector('#dict-go');
  if (!searchBtn) {
    setTimeout(installButton, 150);
    return;
  }

  const handBtn = document.createElement('button');
  handBtn.id = 'dict-hand-lazy-btn';
  handBtn.className = 'dict-hand-btn';
  handBtn.type = 'button';
  handBtn.title = 'Escrita manual';
  handBtn.setAttribute('aria-label', 'Abrir busca por escrita manual');
  handBtn.innerHTML = PENCIL_ICON;

  searchWrap.insertBefore(handBtn, searchBtn);
  searchWrap.appendChild(searchBtn);
  applySearchRowLayout(searchWrap, handBtn);
  [0, 80, 250, 700, 1400].forEach(ms => setTimeout(() => applySearchRowLayout(searchWrap, handBtn), ms));
  new MutationObserver(() => applySearchRowLayout(searchWrap, handBtn)).observe(searchWrap, { childList: true });
  handBtn.addEventListener('click', () => openCoreFromLazyButton(handBtn), { passive: true });
}

export function initManualSearchBootstrap() {
  if (booted) return;
  booted = true;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installButton, { once: true });
  } else {
    installButton();
  }
}

initManualSearchBootstrap();

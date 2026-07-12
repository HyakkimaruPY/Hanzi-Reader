/* Controlador incremental de navegação e ciclo de vida.
 * Preserva showScreen existente e adiciona cancelamento, tokens e contratos.
 */
'use strict';

const screenEntries = new Map();
let generation = 0;
let currentScreen = document.querySelector('.screen.active')?.id || '';
let currentController = new AbortController();
let navigating = false;
let lastFocus = null;

function safeCall(fn, context) {
  if (typeof fn !== 'function') return;
  try { return fn(context); } catch (error) {
    window.dispatchEvent(new CustomEvent('hz:lifecycle-error', { detail: { error, screen: context?.id || '' } }));
  }
}

function contextFor(id, previous, signal, token) {
  return Object.freeze({ id, previous, signal, token, element: document.getElementById(id) });
}

function register(id, lifecycle = {}) {
  if (!id || typeof lifecycle !== 'object') throw new TypeError('Tela e ciclo de vida são obrigatórios');
  screenEntries.set(String(id), lifecycle);
  return () => screenEntries.delete(String(id));
}

function signalFor(id = currentScreen) {
  if (id !== currentScreen) return AbortSignal.abort('inactive-screen');
  return currentController.signal;
}

function cancelCurrent(reason = 'navigation') {
  if (!currentController.signal.aborted) currentController.abort(reason);
}

function install() {
  const original = window.showScreen;
  if (typeof original !== 'function' || original.__hzNavigationController) return false;

  const wrapped = function navigate(id) {
    id = String(id || '');
    const target = document.getElementById(id);
    if (!target) return original.apply(this, arguments);
    const previous = document.querySelector('.screen.active')?.id || currentScreen;

    if (navigating && id === currentScreen) return undefined;
    if (previous === id) return original.apply(this, arguments);

    navigating = true;
    const token = ++generation;
    lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelCurrent('screen-change');

    const previousLifecycle = screenEntries.get(previous);
    const previousContext = contextFor(previous, id, AbortSignal.abort('screen-change'), token);
    safeCall(previousLifecycle?.pause, previousContext);
    safeCall(previousLifecycle?.unmount, previousContext);

    window.dispatchEvent(new CustomEvent('hz:screen-will-change', {
      detail: { id, previous, token }, bubbles: true
    }));

    const result = original.apply(this, arguments);
    currentScreen = document.querySelector('.screen.active')?.id || id;
    currentController = new AbortController();
    const nextLifecycle = screenEntries.get(currentScreen);
    const nextContext = contextFor(currentScreen, previous, currentController.signal, token);
    safeCall(nextLifecycle?.mount, nextContext);
    safeCall(nextLifecycle?.resume, nextContext);

    queueMicrotask(() => { if (token === generation) navigating = false; });
    window.dispatchEvent(new CustomEvent('hz:navigation-committed', {
      detail: { id: currentScreen, previous, token, signal: currentController.signal }, bubbles: true
    }));
    return result;
  };

  wrapped.__hzNavigationController = true;
  wrapped.__hzOriginal = original;
  window.showScreen = wrapped;
  try { showScreen = wrapped; } catch {}
  return true;
}

function restoreFocus() {
  if (lastFocus?.isConnected) {
    try { lastFocus.focus({ preventScroll: true }); return true; } catch {}
  }
  const active = document.getElementById(currentScreen);
  const candidate = active?.querySelector('[autofocus],button:not([disabled]),a[href],input:not([disabled]),[tabindex="0"]');
  try { candidate?.focus({ preventScroll: true }); return Boolean(candidate); } catch { return false; }
}

const api = {
  register,
  signalFor,
  cancelCurrent,
  restoreFocus,
  get current() { return currentScreen; },
  get generation() { return generation; },
  install
};
window.hzNavigation = api;

function boot() { install(); document.documentElement.classList.add('hz-navigation-ready'); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();

export { register, signalFor, cancelCurrent, restoreFocus };

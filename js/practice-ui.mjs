/* Componentes compartilhados das atividades: ajuda em accordion e resumo. */
'use strict';

const esc = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
const lang = () => {
  const value = String(window.hzLang?.() || document.documentElement.lang || 'pt').toLowerCase();
  return value.startsWith('en') ? 'en' : value.startsWith('es') ? 'es' : 'pt';
};
const copy = {
  pt: { how: 'Como jogar', start: 'Começar', close: 'Fechar', understood: 'Entendi', accuracy: 'Precisão', again: 'Praticar novamente', back: 'Voltar para Prática' },
  en: { how: 'How to play', start: 'Start', close: 'Close', understood: 'Got it', accuracy: 'Accuracy', again: 'Practise again', back: 'Back to Practice' },
  es: { how: 'Cómo jugar', start: 'Comenzar', close: 'Cerrar', understood: 'Entendido', accuracy: 'Precisión', again: 'Practicar de nuevo', back: 'Volver a Práctica' }
};
const t = key => (copy[lang()] || copy.pt)[key] || copy.pt[key] || key;

export function practiceQuestionIcon() {
  return '<svg class="hz-question-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.55 2.55 0 014.9.95c0 1.8-2.6 2.05-2.6 3.75"/><path d="M12 17.15h.01"/></svg>';
}

function closeIcon() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
}

function removeAfterTransition(node) {
  const remove = () => node.remove();
  node.addEventListener('transitionend', remove, { once: true });
  setTimeout(remove, 220);
}

function createDialogGuard(overlay, card, onEscape) {
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const controller = new AbortController();
  const focusables = () => [...overlay.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(node => !node.hidden && node.getAttribute('aria-hidden') !== 'true');
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); onEscape?.(); return; }
    if (event.key !== 'Tab') return;
    const nodes = focusables();
    if (!nodes.length) { event.preventDefault(); card.focus({ preventScroll: true }); return; }
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }, { signal: controller.signal, capture: true });
  return {
    signal: controller.signal,
    focus() { card.focus({ preventScroll: true }); },
    dispose() {
      controller.abort();
      requestAnimationFrame(() => { if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }); });
    }
  };
}

export function showPracticeHelp(options = {}) {
  document.querySelectorAll('.hz-practice-help').forEach(node => node.remove());
  const topics = (options.topics || []).filter(item => item?.title && item?.detail);
  const overlay = document.createElement('div');
  overlay.className = 'hz-practice-help';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `<div class="hzph-backdrop" aria-hidden="true"></div>
    <section class="hzph-card" tabindex="-1">
      <header class="hzph-head">
        ${options.iconHtml ? `<div class="hzph-icon">${options.iconHtml}</div>` : ''}
        <div class="hzph-title"><p>${esc(options.kicker || t('how'))}</p><h2>${esc(options.title || t('how'))}</h2></div>
        <button type="button" class="hzph-close" data-practice-help-close aria-label="${esc(t('close'))}">${closeIcon()}</button>
      </header>
      ${options.visualHtml ? `<div class="hzph-visual">${options.visualHtml}</div>` : ''}
      <p class="hzph-summary">${esc(options.summary || '')}</p>
      <div class="hzph-topics">${topics.map((item, index) => `<section class="hzph-topic">
        <button type="button" aria-expanded="false" aria-controls="hzph-detail-${index}"><span>${esc(item.title)}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></button>
        <div id="hzph-detail-${index}" class="hzph-detail" hidden><p>${esc(item.detail)}</p></div>
      </section>`).join('')}</div>
      <footer class="hzph-actions"><button type="button" class="pri" data-practice-help-action>${esc(options.firstRun ? (options.startLabel || t('start')) : (options.closeLabel || t('understood')))}</button></footer>
    </section>`;
  document.body.appendChild(overlay);
  let closed = false, guard = null;
  const close = (reason = 'close') => {
    if (closed) return;
    if (options.firstRun && reason === 'backdrop') return;
    closed = true;
    guard?.dispose();
    overlay.classList.remove('open');
    removeAfterTransition(overlay);
    options.onClose?.(reason);
  };
  const card = overlay.querySelector('.hzph-card');
  guard = createDialogGuard(overlay, card, () => close('escape'));
  overlay.querySelectorAll('.hzph-topic > button').forEach(button => button.addEventListener('click', () => {
    const detail = document.getElementById(button.getAttribute('aria-controls'));
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    detail.hidden = !open;
    button.closest('.hzph-topic').classList.toggle('open', open);
  }, { signal: guard.signal }));
  overlay.querySelector('[data-practice-help-action]').addEventListener('click', () => {
    options.onStart?.();
    close(options.firstRun ? 'start' : 'close');
  }, { signal: guard.signal });
  overlay.querySelector('[data-practice-help-close]').addEventListener('click', () => close('dismiss'), { signal: guard.signal });
  overlay.querySelector('.hzph-backdrop').addEventListener('click', () => close('backdrop'), { signal: guard.signal });
  requestAnimationFrame(() => {
    overlay.classList.add('open');
    guard.focus();
  });
  return { close, element: overlay };
}

function trophyIcon() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4z"/><path d="M7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3"/></svg>';
}

export function showPracticeSummary(options = {}) {
  document.getElementById('hz-practice-celebration')?.remove();
  const score = Math.max(0, Math.min(100, Math.round(Number(options.score) || 0)));
  const percent = Math.max(0, Math.min(100, Math.round(Number(options.percent) || 0)));
  const stats = (options.stats || []).filter(Boolean).slice(0, 6);
  const overlay = document.createElement('div');
  overlay.id = 'hz-practice-celebration';
  overlay.className = 'hz-practice-celebration';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `<div class="hzpc-backdrop" aria-hidden="true"></div><section class="hzpc-card" tabindex="-1">
    <div class="hzpc-trophy">${trophyIcon()}</div>
    <p class="hzpc-kicker">${esc(options.kicker || '')}</p>
    <h2>${esc(options.title || '')}</h2>
    <div class="hzpc-score" aria-label="${esc(options.scoreAriaLabel || String(score))}">${esc(options.scoreLabel ?? String(score))}</div>
    ${options.subtitle ? `<p class="hzpc-subtitle">${esc(options.subtitle)}</p>` : ''}
    <div class="hzpc-stats"><div><span>${esc(options.accuracyLabel || t('accuracy'))}</span><strong>${percent}%</strong></div>${stats.map(item => `<div><span>${esc(item.label)}</span><strong>${esc(item.value)}</strong></div>`).join('')}</div>
    <div class="hzpc-music" aria-live="polite"></div>
    <div class="hzpc-actions">
      ${options.onAgain ? `<button type="button" class="pri hzpc-again">${esc(options.againLabel || t('again'))}</button>` : ''}
      <button type="button" class="hzpc-secondary hzpc-back">${esc(options.backLabel || t('back'))}</button>
      <button type="button" class="hzpc-secondary hzpc-close">${esc(options.closeLabel || t('close'))}</button>
    </div>
  </section>`;
  document.body.appendChild(overlay);
  let closed = false, guard = null;
  const close = reason => {
    if (closed) return;
    closed = true;
    guard?.dispose();
    overlay.classList.remove('open');
    try { window.hzStopCelebrate?.(); } catch {}
    removeAfterTransition(overlay);
    if (reason === 'again') options.onAgain?.();
    else if (reason === 'back') (options.onBack || options.onClose)?.();
    else options.onClose?.();
  };
  const card = overlay.querySelector('.hzpc-card');
  guard = createDialogGuard(overlay, card, () => close('close'));
  overlay.querySelector('.hzpc-again')?.addEventListener('click', () => close('again'), { signal: guard.signal });
  overlay.querySelector('.hzpc-back').addEventListener('click', () => close('back'), { signal: guard.signal });
  overlay.querySelector('.hzpc-close').addEventListener('click', () => close('close'), { signal: guard.signal });
  overlay.querySelector('.hzpc-backdrop').addEventListener('click', () => close('close'), { signal: guard.signal });
  requestAnimationFrame(() => { overlay.classList.add('open'); guard.focus(); });
  try {
    const info = window.hzCelebrate?.();
    if (info?.track) overlay.querySelector('.hzpc-music').textContent = `♫ ${info.track.title}`;
  } catch {}
  return { close, element: overlay };
}

if (typeof window !== 'undefined') {
  window.hzPracticeUI = { showHelp: showPracticeHelp, showSummary: showPracticeSummary, questionIcon: practiceQuestionIcon };
  window.hzShowPracticeCelebration = showPracticeSummary;
}

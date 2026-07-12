/*
 * Hanzi Reader — camada de refinamento v5.1 (script clássico, sem dependências).
 *
 * 1) Painel compartilhado de ordem dos traços (GIF + botão "Passos")
 * 2) Resgate de definições para ideogramas simples (fallback multi-fonte)
 * 3) Renderização progressiva de Leituras Simples e Livros
 * 4) Estabilização do ciclo de montagem das telas
 * 5) Introdução "Como jogar" da atividade de identificação/desenho de tons
 * 6) Integração do botão Voltar (histórico) e Esc com as atividades de prática
 *
 * Este arquivo roda no MESMO escopo global de js/script.mjs (ambos são
 * scripts clássicos), então funções como buildHTML, pushWordToken,
 * lookupStrokeOrder e as variáveis readerTokens/curBook são acessíveis
 * diretamente — a camada substitui apenas o miolo caro, preservando a
 * cadeia de wrappers já validada (v32 → h36 → h48 → h52).
 */
(function () {
'use strict';

const $id = id => document.getElementById(id);
const escX = s => String(s ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const prefs = {
  get(k, f = null) { try { const v = (window.hzStore?.prefs?.get(k, null)); if (v !== null && v !== undefined) return v; } catch {} try { return localStorage.getItem(k) ?? f; } catch { return f; } },
  set(k, v) { try { window.hzStore?.prefs?.set(k, v); return; } catch {} try { localStorage.setItem(k, v); } catch {} }
};

/* ================= i18n auxiliar (pt/en/es) ================= */
function uiLang() {
  const l = String(window.hzLang?.() || document.documentElement.lang || 'pt').toLowerCase();
  if (l.startsWith('en')) return 'en';
  if (l.startsWith('es')) return 'es';
  return 'pt';
}
const X_I18N = {
  pt: {
    steps: 'Passos', expand: 'Expandir', collapse: 'Recolher', stepOf: (a, b) => `Passo ${a} de ${b}`,
    stepsFail: 'Não foi possível carregar os passos agora.', strokeOrder: 'Ordem dos traços',
    loadingReading: 'Preparando leitura…', waitingPinyin: 'Aguardando pinyin…', processingText: 'Processando texto…', processingChapter: 'Processando capítulo…',
    howToPlay: 'Como jogar', start: 'Começar', close: 'Fechar', gotIt: 'Entendi',
    toneIntroTitle: 'Identificação e desenho de tons',
    toneIntroLead: 'Você ouvirá uma sílaba ou palavra e deverá indicar o tom desenhando a curva correspondente.',
    toneSteps: [
      'Toque em Ouvir para reproduzir o áudio quantas vezes precisar.',
      'Desenhe a curva do tom na área de resposta: alto e plano (1º), subindo (2º), descendo e subindo (3º), caindo (4º).',
      'O tom neutro é registrado com um toque curto, sem arrastar.',
      'Use Desfazer ou Limpar para corrigir antes de confirmar.',
      'Confirme a resposta para ver o resultado e somar pontos.',
      'A pontuação cresce com acertos em sequência; erros mostram a curva correta.',
      'Para encerrar, use a seta de sair — sua sessão é registrada.'
    ],
    toneLegend: ['1º · alto', '2º · sobe', '3º · desce-sobe', '4º · cai', 'neutro · toque'],
    finishPractice: 'Concluir prática'
  },
  en: {
    steps: 'Steps', expand: 'Expand', collapse: 'Collapse', stepOf: (a, b) => `Step ${a} of ${b}`,
    stepsFail: 'Could not load the steps right now.', strokeOrder: 'Stroke order',
    loadingReading: 'Preparing reading…', waitingPinyin: 'Waiting for pinyin…', processingText: 'Processing text…', processingChapter: 'Processing chapter…',
    howToPlay: 'How to play', start: 'Start', close: 'Close', gotIt: 'Got it',
    toneIntroTitle: 'Tone identification & drawing',
    toneIntroLead: 'You will hear a syllable or word and answer by drawing the matching tone curve.',
    toneSteps: [
      'Tap Listen to replay the audio as many times as you need.',
      'Draw the tone curve in the answer area: high and flat (1st), rising (2nd), dipping (3rd), falling (4th).',
      'The neutral tone is a short tap, without dragging.',
      'Use Undo or Clear to fix the drawing before confirming.',
      'Confirm to see the result and earn points.',
      'Streaks increase your score; mistakes reveal the correct curve.',
      'To finish, use the back arrow — your session is recorded.'
    ],
    toneLegend: ['1st · high', '2nd · rising', '3rd · dip', '4th · falling', 'neutral · tap'],
    finishPractice: 'Finish practice'
  },
  es: {
    steps: 'Pasos', expand: 'Expandir', collapse: 'Contraer', stepOf: (a, b) => `Paso ${a} de ${b}`,
    stepsFail: 'No fue posible cargar los pasos ahora.', strokeOrder: 'Orden de los trazos',
    loadingReading: 'Preparando la lectura…', waitingPinyin: 'Esperando el pinyin…', processingText: 'Procesando el texto…', processingChapter: 'Procesando el capítulo…',
    howToPlay: 'Cómo jugar', start: 'Comenzar', close: 'Cerrar', gotIt: 'Entendido',
    toneIntroTitle: 'Identificación y trazado de tonos',
    toneIntroLead: 'Escucharás una sílaba o palabra y responderás dibujando la curva del tono.',
    toneSteps: [
      'Toca Escuchar para repetir el audio cuantas veces necesites.',
      'Dibuja la curva del tono: alto y plano (1.º), ascendente (2.º), desciende y sube (3.º), descendente (4.º).',
      'El tono neutro se registra con un toque corto, sin arrastrar.',
      'Usa Deshacer o Limpiar para corregir antes de confirmar.',
      'Confirma la respuesta para ver el resultado y sumar puntos.',
      'Las rachas aumentan la puntuación; los errores muestran la curva correcta.',
      'Para terminar, usa la flecha de salir — tu sesión queda registrada.'
    ],
    toneLegend: ['1.º · alto', '2.º · sube', '3.º · baja-sube', '4.º · cae', 'neutro · toque'],
    finishPractice: 'Concluir práctica'
  }
};
function TX(key) { const d = X_I18N[uiLang()] || X_I18N.pt; return d[key] ?? X_I18N.pt[key] ?? key; }
window.hzTX = TX;
window.hzUiLang = uiLang;

/* ================= 1) Painel compartilhado GIF + Passos ================= */
/*
 * Reaproveita a implementação validada da aba de Dicionário (v3.9/v4.1):
 * lookupStrokeOrder → GIF; v41SliceStrokeGuide → imagens estáticas de cada
 * etapa; v41OpenGifModal / v41OpenStepModal → ampliação. O ponto de
 * integração é recriado aqui como um renderizador único, usado pelo
 * Dicionário (camada H54) e pela atividade de Escrita de Hanzi.
 */
function hzMountStrokePanel({ slot, stepsHost, stroke, char, compact = false }) {
  if (!slot) return;
  if (!stroke || !stroke.gif) {
    slot.innerHTML = `<div class="lexi-stroke-wrap"><div class="lexi-stroke-card lexi-stroke-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12h8M12 8v8" opacity=".4"/></svg></div></div>`;
    if (stepsHost) stepsHost.innerHTML = '';
    return;
  }
  const canSteps = Boolean(stroke.strokeDiagram && stroke.strokeCount);
  slot.innerHTML = `<div class="lexi-stroke-wrap${compact ? ' hz51-compact' : ''}"><button type="button" class="lexi-stroke-card hz51-gif" aria-label="${escX(TX('strokeOrder'))}"><img src="${escX(stroke.gif)}" alt="${escX(TX('strokeOrder'))}" class="v41-enhance-img"></button>${canSteps ? `<button type="button" class="lexi-steps-btn hz51-steps-toggle" aria-expanded="false">${escX(TX('steps'))}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></button>` : ''}</div>`;
  const gifBtn = slot.querySelector('.hz51-gif');
  if (gifBtn) gifBtn.onclick = () => { try { v41OpenGifModal(stroke.gif, char); } catch {} };
  if (!canSteps || !stepsHost) return;
  const toggle = slot.querySelector('.hz51-steps-toggle');
  let loaded = false, slices = [], expanded = false, loadingToken = 0;
  const bindClicks = () => stepsHost.querySelectorAll('[data-step-idx]').forEach(img => {
    img.onclick = () => { try { v41OpenStepModal(slices, parseInt(img.dataset.stepIdx, 10) || 0); } catch {} };
  });
  const imgTags = () => slices.map((s, i) => `<img src="${s}" alt="${escX(TX('stepOf')(i + 1, slices.length))}" data-step-idx="${i}" loading="lazy">`).join('');
  const renderRow = () => {
    stepsHost.innerHTML = `<div class="lexi-steps-block"><button type="button" class="lexi-steps-expand-btn" data-steps-expand>${escX(TX('expand'))}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg></button><div class="lexi-steps-row">${imgTags()}</div></div>`;
    stepsHost.querySelector('[data-steps-expand]').onclick = () => { expanded = true; renderGrid(); };
    bindClicks();
  };
  const renderGrid = () => {
    stepsHost.innerHTML = `<div class="lexi-steps-block"><button type="button" class="lexi-steps-expand-btn" data-steps-collapse>${escX(TX('collapse'))}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg></button><div class="lexi-steps-grid">${imgTags()}</div></div>`;
    stepsHost.querySelector('[data-steps-collapse]').onclick = () => { expanded = false; renderRow(); };
    bindClicks();
  };
  toggle.onclick = async () => {
    const open = !toggle.classList.contains('open');
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (!open) { stepsHost.innerHTML = ''; return; }
    if (!loaded) {
      const my = ++loadingToken;
      stepsHost.innerHTML = `<div class="lexi-steps-block"><div class="spin sm" style="margin:14px auto"></div></div>`;
      try { slices = await v41SliceStrokeGuide(stroke.strokeDiagram, parseInt(stroke.strokeCount, 10)); } catch { slices = []; }
      if (my !== loadingToken || !toggle.isConnected) return;
      if (!slices.length) { stepsHost.innerHTML = `<div class="lexi-entry"><div class="dict-empty">${escX(TX('stepsFail'))}</div></div>`; return; }
      loaded = true;
    }
    expanded ? renderGrid() : renderRow();
  };
}
window.hzMountStrokePanel = hzMountStrokePanel;

/* ================= 2) Resgate de definições p/ Hanzi simples ================= */
let tsMapsPromise = null;
function loadTradSimpMaps() {
  if (tsMapsPromise) return tsMapsPromise;
  tsMapsPromise = fetch('db/traditional-simplified.json', { cache: 'force-cache' })
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      const t2s = new Map(), s2t = new Map();
      const feed = obj => { for (const [a, b] of Object.entries(obj || {})) { if (a && b) { t2s.set(a, b); s2t.set(b, a); } } };
      if (data) {
        if (data.t2s || data.s2t) { feed(data.t2s); for (const [a, b] of Object.entries(data.s2t || {})) { s2t.set(a, b); t2s.set(b, a); } }
        else if (data.map) feed(data.map);
        else feed(data);
      }
      return { t2s, s2t };
    })
    .catch(() => ({ t2s: new Map(), s2t: new Map() }));
  return tsMapsPromise;
}
const rescueCache = new Map();
async function cedictApi(term) {
  try {
    const r = await fetch(`https://cccedict.vercel.app/api/dict?q=${encodeURIComponent(term)}`, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d : [];
  } catch { return []; }
}
function entriesToStdResult(term, entries, src) {
  const groups = [];
  let pinyin = '', traditional = '';
  for (const e of entries || []) {
    const texts = [];
    for (const t of [...(e.pt || []), ...(e.en || []), ...(e.english || []), ...(e.definitions || []), ...(e.defs || [])]) {
      const clean = String(typeof t === 'string' ? t : (t && t.text) || '').trim();
      if (clean) texts.push({ text: clean, ex: [], pyHint: e.pinyin || null });
    }
    if (e.definition && !texts.length) String(e.definition).split(/[;\/]/).map(s => s.trim()).filter(Boolean).forEach(text => texts.push({ text, ex: [], pyHint: e.pinyin || null }));
    if (texts.length) groups.push({ pos: e.pos || 'CC-CEDICT', defs: texts });
    pinyin = pinyin || e.pinyin || e.py || '';
    traditional = traditional || e.traditional || e.trad || '';
  }
  return groups.length ? { term, defs: groups, src, pinyin, traditional } : null;
}
async function fallbackJsonEntry(term) {
  try {
    const r = await fetch('db/dictionary-fallbacks.json', { cache: 'force-cache' });
    if (!r.ok) return null;
    const data = await r.json();
    const packaged = (data && data.entries || {})[term];
    if (!packaged) return null;
    const groups = [];
    for (const reading of packaged.readings || []) {
      const defs = [...(reading.pt || []), ...(reading.en || [])].filter(Boolean).map(text => ({ text, ex: [], pyHint: reading.pinyin || null }));
      if (defs.length) groups.push({ pos: 'tradução', defs });
    }
    if (!groups.length) {
      const defs = [...(packaged.pt || []), ...(packaged.en || [])].filter(Boolean).map(text => ({ text, ex: [] }));
      if (defs.length) groups.push({ pos: 'tradução', defs });
    }
    return groups.length ? { term, defs: groups, src: 'Dicionário local', pinyin: packaged.pinyin || '' } : null;
  } catch { return null; }
}
/*
 * Última camada do resolvedor unificado (H53): quando as fontes principais
 * não encontram nada para UM ideograma, tenta normalização NFC, variantes
 * simplificada/tradicional, a API CC-CEDICT e o banco local. Falhas de rede
 * nunca são gravadas como "não encontrado" permanente.
 */
window.hzResolveSingleCharFallback = async function (rawTerm) {
  const norm = String(rawTerm || '').normalize('NFC').trim();
  const chars = [...norm].filter(ch => /[\u3400-\u9fff\uf900-\ufaff]/.test(ch));
  if (chars.length !== 1) return null;
  const ch = chars[0];
  if (rescueCache.has(ch)) return rescueCache.get(ch);
  const { t2s, s2t } = await loadTradSimpMaps();
  const variants = [...new Set([ch, t2s.get(ch), s2t.get(ch)].filter(Boolean))];
  let result = null;
  // 1) Dicionário local expandido do app (curado, mais rico em PT)
  for (const v of variants) {
    try {
      const local = typeof window.v34EntryLocal === 'function' ? window.v34EntryLocal(v) : null;
      if (local) { result = entriesToStdResult(ch, [{ ...local }], 'Dicionário local'); if (result) break; }
    } catch {}
  }
  // 2) CC-CEDICT via API pública, testando também a variante trad/simp
  if (!result) {
    for (const v of variants) {
      const rows = await cedictApi(v);
      const exact = rows.filter(e => (e.simplified || e.simp || e.s || e.word) === v || (e.traditional || e.trad || e.t) === v);
      result = entriesToStdResult(ch, exact.length ? exact : rows.slice(0, 4), 'CC-CEDICT');
      if (result) break;
    }
  }
  // 3) Banco local empacotado
  if (!result) for (const v of variants) { result = await fallbackJsonEntry(v); if (result) { result.term = ch; break; } }
  if (result) {
    result.term = ch;
    rescueCache.set(ch, result);
    try { window.hzStore?.dictPut?.(ch, result); } catch {}
  }
  return result;
};

/* ================= 3) Renderização progressiva do leitor ================= */
/*
 * Substitui somente o miolo síncrono de v29OpenSimpleReading /
 * v29OpenBookChapter (o innerHTML único de buildHTML). A tokenização usa as
 * MESMAS funções globais (segmentChineseRun, pushWordToken, tokenSpace,
 * tokenPunct) e a mesma contabilidade de índices ci, então pinyin por
 * palavra, seleção, tradução, leitura em voz alta e progresso continuam
 * funcionando sem alterações.
 */
let hzReaderGen = 0;
const idleYield = () => new Promise(resolve => {
  const done = () => requestAnimationFrame(() => resolve());
  if ('requestIdleCallback' in window) requestIdleCallback(done, { timeout: 48 });
  else setTimeout(done, 16);
});
function pinyinScoped(nodes) {
  for (const p of nodes) {
    p.querySelectorAll('.wunit[data-tid]').forEach(el => {
      const tok = readerTokens[parseInt(el.dataset.tid, 10)];
      const sh = wordShouldShowPinyin(tok);
      el.classList.toggle('pyhide', !sh);
      el.classList.toggle('pytarget', showPinyin && pinyinLevelMode && sh);
    });
  }
}
async function renderReaderProgressive(text, { scroller, progress = 0, chapterLabel = false } = {}) {
  const gen = ++hzReaderGen;
  const rtext = $id('rtext');
  if (!rtext) return;
  try { showLoad(TX('waitingPinyin')); } catch {}
  await waitPinyin();
  if (gen !== hzReaderGen) return;
  try { showLoad(chapterLabel ? TX('processingChapter') : TX('processingText')); } catch {}

  text = v40NormalizeText(String(text || ''));
  window.__rtextRaw = text;
  readerTokens = []; readerCharRefs = [];
  rtext.innerHTML = '';
  try { performance.mark('hz-reader-start'); } catch {}

  const paragraphs = text.split('\n');
  let ci = 0, pendingGap = false, pIndex = 0;
  let userScrolled = false;
  const markScroll = e => { if (e.isTrusted) userScrolled = true; };
  scroller?.addEventListener('scroll', markScroll, { passive: true });

  const buildOneParagraph = () => {
    // Reproduz exatamente o laço de buildHTML para um único parágrafo,
    // preservando data-ci/data-cilen e a semântica de rpara-gap.
    while (pIndex < paragraphs.length) {
      const para = paragraphs[pIndex];
      if (!para.trim()) {
        pendingGap = true;
        ci += [...para].length;
        if (pIndex < paragraphs.length - 1) ci++;
        pIndex++;
        continue;
      }
      const paraStart = ci;
      let html = '', run = '';
      const flush = () => {
        if (!run) return;
        const words = segmentChineseRun(run);
        for (const w of words) { html += pushWordToken(w, ci); ci += [...w].length; }
        run = '';
      };
      const chars = [...para];
      for (let i = 0; i < chars.length; i++) {
        const chch = chars[i];
        if (isCJK(chch)) { run += chch; continue; }
        flush();
        if (chch === '\r') continue;
        if (/\s/.test(chch)) {
          const spStart = ci;
          let n = 1;
          while (i + 1 < chars.length && /\s/.test(chars[i + 1]) && chars[i + 1] !== '\r') { n++; i++; ci++; }
          html += tokenSpace(n, spStart); ci++; continue;
        }
        html += tokenPunct(chch, ci); ci++;
      }
      flush();
      const out = html ? `<p class="rpara${pendingGap ? ' rpara-gap' : ''}" data-ci="${paraStart}" data-cilen="${ci - paraStart}">${html}</p>` : '';
      pendingGap = false;
      if (pIndex < paragraphs.length - 1) ci++;
      pIndex++;
      if (out) return out;
    }
    return null;
  };

  const CJK_PER_BATCH_FIRST = 650, CJK_PER_BATCH = 1500;
  const waitReaderVisible = () => new Promise(resolve => {
    const check = () => {
      if (gen !== hzReaderGen) { resolve(false); return; }
      if (document.documentElement.dataset.activeScreen === 'sr') { resolve(true); return; }
      document.addEventListener('hz:screen-visible', check, { once: true });
    };
    check();
  });
  const appendBatch = budget => {
    let built = '', builtChars = 0;
    while (pIndex < paragraphs.length && builtChars < budget) {
      const startCi = ci;
      const p = buildOneParagraph();
      if (p == null) break;
      built += p;
      builtChars += (ci - startCi);
    }
    if (!built) return;
    const from = rtext.children.length;
    rtext.insertAdjacentHTML('beforeend', built); // um parse por lote; nada de nó-a-nó
    pinyinScoped([...rtext.children].slice(from));
  };
  const finalize = async () => {
    scroller?.removeEventListener('scroll', markScroll);
    if (gen !== hzReaderGen) return;
    try { performance.mark('hz-reader-done'); performance.measure('hz-reader-complete', 'hz-reader-start', 'hz-reader-done'); } catch {}
    // Passos finais (uma única vez): correção de sobreposição de pinyin e
    // restauração do ponto de leitura, se o usuário não rolou por conta própria.
    requestAnimationFrame(() => requestAnimationFrame(() => { try { v37FixPinyinOverlap(); } catch {} }));
    try { syncSettingControls(); } catch {}
    if (scroller && progress > 0.001 && !userScrolled) {
      await new Promise(r => requestAnimationFrame(r));
      const maxS = scroller.scrollHeight - scroller.clientHeight;
      if (maxS > 0) scroller.scrollTop = progress * maxS;
    }
  };

  // Primeiro lote: pinta o trecho inicial visível e devolve o controle ao
  // chamador imediatamente — os instaladores de controles do leitor rodam já.
  appendBatch(CJK_PER_BATCH_FIRST);
  try { hideLoad(); } catch {}
  try { performance.mark('hz-reader-first'); performance.measure('hz-reader-first-chunk', 'hz-reader-start', 'hz-reader-first'); } catch {}
  await new Promise(r => requestAnimationFrame(r));

  if (pIndex >= paragraphs.length) { await finalize(); return; }

  // Lotes restantes em segundo plano: rAF + requestIdleCallback (com
  // fallback), suspendendo quando o usuário sai da tela de leitura e
  // retomando somente se ela voltar a ficar ativa nesta mesma geração.
  (async () => {
    while (pIndex < paragraphs.length) {
      if (gen !== hzReaderGen) { scroller?.removeEventListener('scroll', markScroll); return; }
      if (document.documentElement.dataset.activeScreen !== 'sr') {
        const ok = await waitReaderVisible();
        if (!ok) { scroller?.removeEventListener('scroll', markScroll); return; }
      }
      appendBatch(CJK_PER_BATCH);
      await idleYield();
    }
    await finalize();
  })().catch(() => { scroller?.removeEventListener('scroll', markScroll); });
}
window.hzProgressiveReader = { render: renderReaderProgressive, get generation() { return hzReaderGen; } };

/* ================= 4) Estabilização do ciclo das telas ================= */
/*
 * Componentes que só apareciam depois de uma interação quase sempre foram
 * montados enquanto o container estava oculto (medidas = 0). Depois que a
 * tela fica realmente visível (hz:screen-visible já é emitido em double-rAF
 * pelo núcleo), um único evento de resize acorda ResizeObservers e canvases
 * que mediram cedo demais — sem atrasos arbitrários.
 */
document.addEventListener('hz:screen-visible', () => {
  requestAnimationFrame(() => { try { window.dispatchEvent(new Event('resize')); } catch {} });
}, { passive: true });
document.addEventListener('hz:practice-activity-change', () => {
  requestAnimationFrame(() => requestAnimationFrame(() => { try { window.dispatchEvent(new Event('resize')); } catch {} }));
}, { passive: true });

/* ================= 5) "Como jogar" — identificação/desenho de tons ================= */
const TONE_INTRO_KEY = 'hzIntroSeen.toneDraw';
function toneCurvesSvg() {
  // Representação simples dos quatro tons + tom neutro (toque).
  return `<svg viewBox="0 0 300 64" class="hz51-tone-curves" aria-hidden="true">
    <g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
      <path d="M14 18h34"/>
      <path d="M74 40 L108 14"/>
      <path d="M134 20 C144 40, 156 40, 168 16"/>
      <path d="M194 12 L228 42"/>
    </g>
    <circle cx="266" cy="28" r="5" fill="currentColor"/>
  </svg>`;
}
function openToneDrawIntro({ firstRun = false, onStart = null } = {}) {
  document.getElementById('hz51-tone-intro')?.remove();
  const legend = TX('toneLegend').map(l => `<span>${escX(l)}</span>`).join('');
  const steps = TX('toneSteps').map((s, i) => `<li><b>${i + 1}</b><span>${escX(s)}</span></li>`).join('');
  const wrap = document.createElement('div');
  wrap.id = 'hz51-tone-intro';
  wrap.className = 'hz51-overlay';
  wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true');
  wrap.innerHTML = `<div class="hz51-overlay-back"></div>
    <section class="hz51-intro-card" tabindex="-1">
      <p class="hz51-kicker">${escX(TX('howToPlay'))}</p>
      <h2>${escX(TX('toneIntroTitle'))}</h2>
      <p class="hz51-lead">${escX(TX('toneIntroLead'))}</p>
      ${toneCurvesSvg()}
      <div class="hz51-tone-legend">${legend}</div>
      <ol class="hz51-steps">${steps}</ol>
      <div class="hz51-intro-actions">
        ${firstRun ? `<button type="button" class="pri" data-intro-start>${escX(TX('start'))}</button>` : `<button type="button" class="pri" data-intro-start>${escX(TX('gotIt'))}</button>`}
      </div>
    </section>`;
  document.body.appendChild(wrap);
  const closeIt = () => { wrap.classList.remove('open'); setTimeout(() => wrap.remove(), 160); };
  wrap.querySelector('[data-intro-start]').onclick = () => { prefs.set(TONE_INTRO_KEY, '1'); closeIt(); onStart?.(); };
  wrap.querySelector('.hz51-overlay-back').onclick = () => { if (!firstRun) closeIt(); };
  requestAnimationFrame(() => { wrap.classList.add('open'); wrap.querySelector('.hz51-intro-card')?.focus?.({ preventScroll: true }); });
}
window.hzOpenToneDrawIntro = openToneDrawIntro;

// Intercepta o primeiro acesso ao card "Identificar o tom" (o jogo roda em
// iframe fechado; a introdução vive por cima, no host da atividade).
document.addEventListener('click', e => {
  const card = e.target.closest?.('#hzp-game');
  if (!card) return;
  if (prefs.get(TONE_INTRO_KEY) === '1') return;
  e.preventDefault(); e.stopPropagation();
  openToneDrawIntro({ firstRun: true, onStart: () => card.click() });
}, true);

// Botão flutuante "Como jogar" disponível durante a atividade.
function syncToneHelpFab(activity) {
  document.getElementById('hz51-tone-help')?.remove();
  if (activity !== 'tone-recognition') return;
  const host = $id('hz-sp-host');
  if (!host) return;
  const fab = document.createElement('button');
  fab.type = 'button'; fab.id = 'hz51-tone-help'; fab.className = 'hz51-help-fab';
  fab.setAttribute('aria-label', TX('howToPlay'));
  fab.textContent = '?';
  fab.onclick = () => openToneDrawIntro({ firstRun: false });
  host.appendChild(fab);
}
document.addEventListener('hz:practice-activity-change', e => syncToneHelpFab(e.detail?.activity), { passive: true });

/* ================= 6) Voltar do dispositivo + Esc nas práticas ================= */
/*
 * As atividades registram window.__hzPracticeFinish ao iniciar. Um estado é
 * empilhado no histórico quando uma atividade monta; o Voltar do dispositivo
 * consome esse estado e chama o finalizador (que gera a tela de prática
 * concluída) em vez de sair do app. Esc faz o mesmo no desktop.
 */
let histArmed = false, histSuppress = false;
function armPracticeHistory() {
  if (histArmed) return;
  try { history.pushState({ hzPractice: 1 }, ''); histArmed = true; } catch {}
}
function disarmPracticeHistory() {
  if (!histArmed) return;
  histArmed = false;
  histSuppress = true;
  try { history.back(); } catch { histSuppress = false; }
}
window.addEventListener('popstate', () => {
  if (histSuppress) { histSuppress = false; return; }
  if (!histArmed) return;
  histArmed = false;
  const fin = window.__hzPracticeFinish;
  if (typeof fin === 'function') {
    try { fin('back'); } catch {}
    // Se o usuário escolher "Nova sessão" na tela de conclusão, o Voltar
    // continua protegido; se fechar para o hub, o unmount desarma o estado.
    try { history.pushState({ hzPractice: 1 }, ''); histArmed = true; } catch {}
  } else { try { window.hzBackToHub?.(); } catch {} }
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (document.querySelector('.mo.open') || document.getElementById('hz51-tone-intro')) return;
  const fin = window.__hzPracticeFinish;
  if (typeof fin === 'function' && window.hzGetActivePracticeActivity?.()) { e.preventDefault(); try { fin('esc'); } catch {} }
});
if (typeof window.hzMountPracticeActivity === 'function' && !window.hzMountPracticeActivity.__hz51) {
  const orig = window.hzMountPracticeActivity;
  const wrapped = function (activity, mount) {
    const root = orig.call(this, activity, mount);
    if (root) armPracticeHistory();
    return root;
  };
  wrapped.__hz51 = true;
  window.hzMountPracticeActivity = wrapped;
}
if (typeof window.hzUnmountPracticeActivity === 'function' && !window.hzUnmountPracticeActivity.__hz51) {
  const orig = window.hzUnmountPracticeActivity;
  const wrapped = function () {
    window.__hzPracticeFinish = null;
    disarmPracticeHistory();
    return orig.apply(this, arguments);
  };
  wrapped.__hz51 = true;
  window.hzUnmountPracticeActivity = wrapped;
}
})();

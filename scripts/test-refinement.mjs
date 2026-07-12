/*
 * Testes da etapa de refinamento v5.1 — executável com `node scripts/test-refinement.mjs`.
 *
 * A) Avaliador de escrita (puro): ordem, direção, forma, posição, proporção.
 * B) Camada de persistência com fallback de memória (sem IndexedDB).
 * C) Paridade de chaves de i18n (pt/en/es) em todos os dicionários novos/alterados.
 * D) Asserções estáticas de regressão sobre cada módulo editado.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(ROOT, p), 'utf8');

let passed = 0, failed = 0;
const ok = (cond, label) => {
  if (cond) { passed++; console.log('  ✔', label); }
  else { failed++; console.error('  ✘', label); }
};
const section = t => console.log('\n== ' + t + ' ==');

/* ---------- utilitários ---------- */
function extractObjectLiteral(src, marker) {
  const at = src.indexOf(marker);
  if (at < 0) throw new Error('marker não encontrado: ' + marker);
  let i = src.indexOf('{', at);
  let depth = 0, out = '', str = null, esc = false, comment = null;
  for (; i < src.length; i++) {
    const ch = src[i], next = src[i + 1];
    out += ch;
    if (comment === '//') { if (ch === '\n') comment = null; continue; }
    if (comment === '/*') { if (ch === '*' && next === '/') { out += '/'; i++; comment = null; } continue; }
    if (str) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === str) str = null; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { str = ch; continue; }
    if (ch === '/' && next === '/') { comment = '//'; continue; }
    if (ch === '/' && next === '*') { comment = '/*'; continue; }
    if (ch === '{') depth++;
    if (ch === '}') { depth--; if (depth === 0) return out; }
  }
  throw new Error('objeto não fechado para ' + marker);
}
const evalObject = text => (new Function('return (' + text + ')'))();
const sameKeys = (a, b) => {
  const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i]);
};
const line = (x1, y1, x2, y2, n = 26) =>
  Array.from({ length: n }, (_, i) => ({ x: x1 + (x2 - x1) * i / (n - 1), y: y1 + (y2 - y1) * i / (n - 1) }));

/* =========================================================================
 * A) Avaliador de escrita
 * ========================================================================= */
section('A · Avaliador de escrita por traços');
const { evaluateDrawing } = await import('file://' + join(ROOT, 'js/hanzi-writing.mjs'));

const H = line(58, 150, 242, 150);
const S = line(150, 58, 150, 242);
const base = { canvasW: 300, canvasH: 300 };

const shi = evaluateDrawing([H, S], { ...base, refSeqs: ['HS'] });            // 十 correto
ok(shi.percent >= 70, `十 correto pontua alto (${shi.percent}%)`);
ok(shi.parts.order >= 85, `ordem correta reconhecida (${shi.parts.order}%)`);
ok(shi.recognized === true, 'traçado marcado como compatível');
ok(shi.codes === 'HS', `códigos H/S detectados (${shi.codes})`);

const shiInv = evaluateDrawing([S, H], { ...base, refSeqs: ['HS'] });         // ordem invertida
ok(shiInv.parts.order < shi.parts.order, `ordem invertida penaliza ordem (${shiInv.parts.order}% < ${shi.parts.order}%)`);

const missing = evaluateDrawing([H], { ...base, refSeqs: ['HS'] });           // traço faltando
ok(missing.percent < shi.percent, `traço faltando reduz a similaridade (${missing.percent}% < ${shi.percent}%)`);
ok(missing.parts.proportion < shi.parts.proportion, 'proporção cai com contagem errada');

const tinyCorner = evaluateDrawing(
  [line(12, 30, 58, 30), line(35, 12, 35, 55)],
  { ...base, refSeqs: ['HS'] }
);                                                                            // pequeno e no canto
ok(tinyCorner.parts.position < shi.parts.position, `posicionamento penaliza desenho no canto (${tinyCorner.parts.position}% < ${shi.parts.position}%)`);

const countOnly = evaluateDrawing([H, S], { ...base, refCount: 2 });          // sem sequência
ok(countOnly.hasRefSeq === false && countOnly.hasRefCount === true, 'modo somente-contagem sinalizado');
ok(countOnly.parts.order === 100, 'ordem vira razão de contagem quando não há sequência');

const dot = evaluateDrawing([line(150, 150, 156, 158, 6)], { ...base, refSeqs: ['D'] });
ok(dot.codes === 'D', `toque curto classificado como ponto (${dot.codes})`);
ok(dot.parts.order >= 85, 'ponto único casa com referência D');

const zStroke = [...line(90, 100, 210, 100, 14), ...line(210, 100, 210, 210, 14)]; // 𠃍 (dobra)
const zi = evaluateDrawing([zStroke], { ...base, refSeqs: ['Z'] });
ok(zi.parts.shape >= 60, `dobra pontua bem em forma para Z (${zi.parts.shape}%)`);

const nothing = evaluateDrawing([], base);
ok(nothing.percent === 0 && nothing.recognized === false, 'desenho vazio devolve zero com segurança');

/* =========================================================================
 * B) Camada de persistência (fallback de memória)
 * ========================================================================= */
section('B · Camada de persistência (StorageFallback sem IndexedDB)');
const lsData = new Map([['legadoPequeno', 'valor'], ['migrar', '@idb:migrar']]);
globalThis.window = {
  addEventListener() {},
};
globalThis.localStorage = {
  getItem: k => (lsData.has(k) ? lsData.get(k) : null),
  setItem: (k, v) => lsData.set(k, String(v)),
  removeItem: k => lsData.delete(k),
  get length() { return lsData.size; },
};
Object.defineProperty(globalThis.localStorage, 'keys', { value: () => [...lsData.keys()] });
// Object.keys(localStorage) na migração:
globalThis.localStorage = new Proxy(globalThis.localStorage, {
  ownKeys: () => [...lsData.keys()],
  getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
});

const store = await import('file://' + join(ROOT, 'js/storage-layer.mjs'));
const hzStore = globalThis.window.hzStore;
const status = await hzStore.status();
ok(status.mode === 'memory-fallback', `fallback ativo sem IndexedDB (${status.mode})`);

hzStore.prefs.set('hzLang', 'es');
ok(hzStore.prefs.get('hzLang') === 'es', 'PreferencesStore grava e lê com cache');
ok(lsData.get('hzLang') === 'es', 'preferência espelhada no localStorage');

await hzStore.saveSession('tone-sequence', { done: 12, hits: 9 });
await hzStore.saveSession('hanzi-writing', { chars: 3 });
const tsSessions = await hzStore.listSessions('tone-sequence');
ok(tsSessions.length === 1 && tsSessions[0].done === 12, 'sessões gravadas e filtradas por tipo');

ok((await hzStore.dictPut('好', { term: '好', defs: [{ defs: [{ text: 'bom' }] }] })) !== false, 'cache de dicionário aceita positivo');
const hit = await hzStore.dictGet('好');
ok(hit && hit.term === '好', 'cache de dicionário devolve o positivo');
ok((await hzStore.dictPut('xx', null)) === false, 'negativos nunca são persistidos');

await hzStore.kvPut('ls:migrar', 'conteudoGrande');
ok((await hzStore.legacyRead('migrar')) === 'conteudoGrande', 'ponteiro @idb: resolve para o conteúdo migrado');
ok((await hzStore.legacyRead('legadoPequeno')) === 'valor', 'chave não migrada continua lida do localStorage');

/* =========================================================================
 * C) Paridade de i18n pt/en/es
 * ========================================================================= */
section('C · Paridade de i18n (pt/en/es)');
{
  const src = read('js/script.mjs');
  const HZ = evalObject(extractObjectLiteral(src, 'const HZ_I18N='));
  ok(sameKeys(HZ.pt, HZ.en) && sameKeys(HZ.pt, HZ.es), `HZ_I18N com ${Object.keys(HZ.pt).length} chaves em pt/en/es`);
}
{
  const src = read('js/learning-engine.mjs');
  const T = evalObject(extractObjectLiteral(src, 'const text='));
  ok(sameKeys(T.pt, T.en) && sameKeys(T.pt, T.es), `learning-engine text com ${Object.keys(T.pt).length} chaves em pt/en/es`);
  for (const k of ['doneLbl', 'finishBtn', 'statHardest', 'statScore', 'celSubtitle'])
    ok(k in T.pt && k in T.en && k in T.es, `chave nova "${k}" presente nos 3 idiomas`);
  ok(typeof T.es.celSubtitle === 'function' && /tonal/.test(T.es.celSubtitle(3)), 'celSubtitle(es) formata corretamente');
}
{
  const src = read('js/refine-v51.js');
  const X = evalObject(extractObjectLiteral(src, 'const X_I18N ='));
  ok(sameKeys(X.pt, X.en) && sameKeys(X.pt, X.es), `X_I18N (Passos/intro de tons) pariteado`);
  ok(X.pt.toneSteps.length === 7 && X.es.toneSteps.length === 7 && X.en.toneSteps.length === 7, 'passos da intro de tons nos 3 idiomas');
  ok(X.pt.toneLegend.length === 5, 'legenda cobre os 4 tons + neutro');
}
{
  const src = read('js/hanzi-writing.mjs');
  const I = evalObject(extractObjectLiteral(src, 'const I18N = {'));
  ok(sameKeys(I.pt, I.en) && sameKeys(I.pt, I.es), `escrita de Hanzi com ${Object.keys(I.pt).length} chaves em pt/en/es`);
  ok([I.pt, I.en, I.es].every(d => d.introSteps.length === 8), 'intro da escrita com 8 passos nos 3 idiomas');
}

/* =========================================================================
 * D) Asserções estáticas de regressão
 * ========================================================================= */
section('D · Regressões estáticas');
{
  const s = read('js/script.mjs');
  ok(s.includes("hzMountStrokePanel({slot,stepsHost:root.querySelector('.h54-steps-slot')"), 'H54 usa o painel compartilhado (Passos restaurado)');
  ok(s.includes('hzResolveSingleCharFallback'), 'resolvedor tem resgate de caractere único');
  ok(s.includes('window.hzStore?.dictGet'), 'cache positivo persistente ligado ao resolvedor');
  ok(s.includes('at:Date.now()-570000'), 'negativos expiram em 30 s (sem gravação permanente)');
  ok(s.split('window.hzProgressiveReader').length >= 3, 'leitura simples e capítulo usam o renderizador progressivo');
  ok(s.includes('hz-lang-acc') && s.includes('hzWireLangAccordion') && s.includes("dispatchEvent(new CustomEvent('hz:lang-change'"), 'seletor de idioma em sanfona instalado');
  ok(s.includes("saved==='pt'||saved==='en'||saved==='es'"), 'hzLang aceita espanhol');
  ok(!s.includes('hz-lang-sel'), 'select antigo de idioma removido do núcleo');
  ok(s.includes('M2.8 15.9L21.2 12.7'), 'novo ícone de Prática (guzheng) aplicado');
  ok(s.includes('x="8.4" y="9.4"'), 'novo ícone de Flash Cards (3 cartões) aplicado');
  ok(s.includes('HZ_ES_MAP') && s.includes('hzApplyLangMap'), 'mapa espanhol das Configurações aplicado');
}
{
  const s = read('js/learning-engine.mjs');
  ok(!/this\.total/.test(s), 'limite fixo (this.total) removido da Sequência tonal');
  ok(s.includes('hzIntroSeen.toneSequence'), 'flag de introdução vista persistida');
  ok(s.includes('__hzPracticeFinish'), 'Voltar/Esc encerram gerando a conclusão');
  ok(s.includes('hzts-finish-session'), 'botão Concluir sessão presente');
  ok(s.includes("window.hzStore?.saveSession?.('tone-sequence'"), 'sessão tonal gravada na camada de persistência');
}
{
  const s = read('js/music-player.mjs');
  ok(!s.includes('refs.search?.focus'), 'autofocus do campo de busca removido');
  ok(s.includes("dialog.focus"), 'foco inicial vai para o container do modal');
  ok(s.includes("uiLang()==='es'"), 'player traduzido para espanhol');
}
{
  const s = read('js/visual-refresh.js');
  ok(s.includes('window.hzOpenWriting'), 'card de escrita delega para o módulo novo');
  ok(s.includes("lang()==='es'"), 'visual-refresh com espanhol');
  ok(s.includes("hz:lang-change"), 'reage à troca de idioma');
}
{
  const s = read('js/refine-v51.js');
  for (const needle of ['hzMountStrokePanel', 'hzResolveSingleCharFallback', 'hzProgressiveReader', "addEventListener('popstate'", 'hzIntroSeen.toneDraw', 'requestIdleCallback'])
    ok(s.includes(needle), `refine-v51 contém ${needle}`);
}
{
  const s = read('js/manualSearchCore.mjs');
  ok(s.includes('export function getManualSearchSeedData'), 'seed do reconhecedor exportado para a avaliação');
}
{
  const s = read('index.html');
  for (const needle of ['css/refine-v51.css', 'js/refine-v51.js', 'js/storage-layer.mjs', 'js/hanzi-writing.mjs'])
    ok(s.includes(needle), `index.html carrega ${needle}`);
}

/* ---------- resultado ---------- */
console.log(`\n${passed} passaram · ${failed} falharam`);
if (failed) process.exit(1);

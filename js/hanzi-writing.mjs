/*
 * Hanzi Reader — Escrita de Hanzi v2 (v5.1).
 *
 * • Campo de busca no topo: o usuário pesquisa o ideograma que quer treinar.
 * • Painel de referência quadrado e compacto com o GIF da ordem dos traços e
 *   o botão "Passos" (mesma source e mesmo painel compartilhado do Dicionário).
 * • Avaliação da escrita por traços, reutilizando a análise geométrica do
 *   reconhecimento manual (analyzeStroke/resample/rdp portados de
 *   manualSearchCore) e as sequências HSPDZ do mesmo banco como referência.
 * • Conclusão de sessão pelo botão "Concluir prática", pela seta de sair,
 *   pelo Voltar do dispositivo ou por Esc — sempre gerando a tela de prática
 *   concluída (componente compartilhado hzShowPracticeCelebration) e a trilha
 *   curta de encerramento.
 *
 * O resultado é sempre tratado como SIMILARIDADE ESTIMADA, nunca como
 * afirmação de que a escrita está "correta".
 */
'use strict';

import { HANZI_SCORING_CONFIG, weightedHanziScore } from './hanzi-scoring-config.mjs';
import { showPracticeHelp, showPracticeSummary } from './practice-ui.mjs';

/* ======================= análise geométrica (pura) ======================= */
/* Portado do reconhecedor manual (manualSearchCore.mjs) para reutilizar a
 * mesma lógica de classificação de traços H/S/P/D/Z. */
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function lengthOf(s) { let l = 0; for (let i = 1; i < s.length; i++) l += dist(s[i - 1], s[i]); return l; }
function bbox(s) {
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (const p of s) { if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y; if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y; }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}
function angleNorm(a) { while (a <= -Math.PI) a += Math.PI * 2; while (a > Math.PI) a -= Math.PI * 2; return a; }
function angleDiffDirected(a, b) { return Math.abs(angleNorm(a - b)); }
function angleDiffAxis(a, b) { let d = Math.abs(angleNorm(a - b)); return Math.min(d, Math.abs(Math.PI - d)); }
function dirScore(angle, proto, tol) { return Math.max(0, 1 - angleDiffDirected(angle, proto) / tol); }
function axisScore(angle, proto, tol) { return Math.max(0, 1 - angleDiffAxis(angle, proto) / tol); }
function resample(s, n = 22) {
  const L = lengthOf(s);
  if (!L || s.length < 2) return s.slice();
  const out = [s[0]];
  let target = L / (n - 1), acc = 0, next = target;
  for (let i = 1; i < s.length; i++) {
    let a = s[i - 1], b = s[i], seg = dist(a, b);
    if (!seg) continue;
    while (acc + seg >= next && out.length < n - 1) {
      const r = (next - acc) / seg;
      out.push({ x: a.x + (b.x - a.x) * r, y: a.y + (b.y - a.y) * r });
      next += target;
    }
    acc += seg;
  }
  out.push(s[s.length - 1]);
  return out;
}
function pathAngle(s, from = 0, to = 1) {
  if (!s || s.length < 2) return 0;
  const a = s[Math.max(0, Math.min(s.length - 1, Math.round((s.length - 1) * from)))];
  const b = s[Math.max(0, Math.min(s.length - 1, Math.round((s.length - 1) * to)))];
  return Math.atan2(b.y - a.y, b.x - a.x);
}
function rdp(points, eps) {
  if (points.length <= 2) return points.slice();
  const a = points[0], b = points[points.length - 1];
  const vx = b.x - a.x, vy = b.y - a.y;
  const den = Math.hypot(vx, vy) || 1;
  let maxD = -1, idx = -1;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const d = Math.abs(vy * p.x - vx * p.y + b.x * a.y - b.y * a.x) / den;
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD > eps) {
    const left = rdp(points.slice(0, idx + 1), eps);
    const right = rdp(points.slice(idx), eps);
    return left.slice(0, -1).concat(right);
  }
  return [a, b];
}
function analyzeStroke(raw) {
  const s = resample(raw, 24);
  const b = bbox(s);
  const L = lengthOf(s);
  const a = s[0], z = s[s.length - 1];
  const chord = Math.max(0.001, dist(a, z));
  const dx = z.x - a.x, dy = z.y - a.y, adx = Math.abs(dx), ady = Math.abs(dy);
  const main = Math.atan2(dy, dx);
  const startA = pathAngle(s, 0, 0.22);
  const midA = pathAngle(s, 0.28, 0.72);
  const endA = pathAngle(s, 0.78, 1);
  const straight = chord / (L || 1);
  const dotness = (L < 18 || (b.w < 14 && b.h < 14));
  const poly = rdp(s, Math.max(3.2, Math.min(12, L * 0.055)));
  const segs = [];
  for (let i = 1; i < poly.length; i++) {
    const p0 = poly[i - 1], p1 = poly[i];
    const len = dist(p0, p1);
    if (len > Math.max(4, L * 0.045)) segs.push({ a: p0, b: p1, len, ang: Math.atan2(p1.y - p0.y, p1.x - p0.x) });
  }
  let cornerEnergy = 0, maxTurn = 0, cornerCount = 0;
  for (let i = 1; i < segs.length; i++) {
    const d = angleDiffDirected(segs[i].ang, segs[i - 1].ang);
    const w = Math.min(segs[i].len, segs[i - 1].len) / (L || 1);
    if (d > 0.52 && w > 0.055) { cornerCount++; cornerEnergy += d * w * 2.2; maxTurn = Math.max(maxTurn, d); }
  }
  const tail = segs[segs.length - 1], prev = segs[segs.length - 2];
  const hook = tail && prev ? (angleDiffDirected(tail.ang, prev.ang) > 0.72 && tail.len < L * 0.36 && tail.len > Math.max(5, L * 0.045)) : false;
  const hasBrokenShape = (cornerCount >= 1 && maxTurn > 0.62 && (b.w > 10 && b.h > 10));
  const p = { H: 0, S: 0, P: 0, D: 0, Z: 0 };
  p.H += axisScore(main, 0, 1.05) * 1.45 + axisScore(midA, 0, 1.10) * 0.55;
  p.S += axisScore(main, Math.PI / 2, 1.05) * 1.45 + axisScore(midA, Math.PI / 2, 1.10) * 0.55;
  p.P += dirScore(main, 2.25, 1.15) * 1.65 + dirScore(startA, 2.25, 1.25) * 0.45 + dirScore(endA, 2.25, 1.35) * 0.25;
  p.D += dirScore(main, 0.78, 1.15) * 1.45 + dirScore(startA, 0.78, 1.25) * 0.38 + dirScore(endA, 0.78, 1.35) * 0.25;
  if (dotness) { p.D += 2.3; p.P += 0.28; p.H *= 0.45; p.S *= 0.45; }
  if (straight > 0.82) p.Z *= 0.25; else if (straight > 0.64) p.Z += 0.18;
  const zShape = Math.max(0, cornerEnergy * 0.72, hook ? 1.55 : 0, (hasBrokenShape ? 1.05 : 0));
  p.Z += zShape;
  if (hasBrokenShape && maxTurn > 1.05) p.Z += 0.75;
  if (hook && prev) {
    if (axisScore(prev.ang, Math.PI / 2, 1.0) > 0.45) p.S += 0.55;
    if (axisScore(prev.ang, 0, 1.0) > 0.45) p.H += 0.45;
  }
  if (ady > adx * 0.82 && dy > 0 && !hasBrokenShape) p.S += 0.62;
  if (adx > ady * 0.82 && Math.abs(dy) < b.h * 0.85 && !hasBrokenShape) p.H += 0.45;
  if (dx < 0 && dy > 0) { p.P += 0.9; p.D *= 0.62; }
  if (dx > 0 && dy > 0) { p.D += 0.75; p.P *= 0.72; }
  if (dx > 0 && dy < 0) { p.P += 0.25; p.H += 0.35; p.D *= 0.55; }
  let sum = 0;
  for (const k of 'HSPDZ') { p[k] = Math.max(0.001, p[k] || 0); sum += p[k]; }
  for (const k of 'HSPDZ') p[k] /= sum;
  let code = 'H', best = -1;
  for (const k of 'HSPDZ') if (p[k] > best) { best = p[k]; code = k; }
  return { code, probs: p, confidence: best, detail: { start: a, end: z, straight, cornerCount, cornerEnergy, maxTurn, hook, len: L, bbox: b } };
}
function compatible(a, b) {
  if (a === b) return true;
  return (a === 'D' && b === 'P') || (a === 'P' && b === 'D') || (a === 'Z' && (b === 'H' || b === 'S')) || (b === 'Z' && (a === 'H' || a === 'S'));
}
function editDistanceWeighted(codes, seq) {
  const n = codes.length, m = seq.length;
  let prev = Array(m + 1);
  for (let j = 0; j <= m; j++) prev[j] = j;
  for (let i = 1; i <= n; i++) {
    const cur = [i];
    for (let j = 1; j <= m; j++) {
      const sub = codes[i - 1] === seq[j - 1] ? 0 : (compatible(codes[i - 1], seq[j - 1]) ? 0.42 : 1);
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + sub);
    }
    prev = cur;
  }
  return prev[m];
}

/* ======================= avaliação ponderada (pura) ======================= */
const clamp01 = v => Math.max(0, Math.min(1, v));
/*
 * Afinidade entre um traço analisado e um código de referência. Evita
 * depender de um único critério (a classe primária): evidência geométrica
 * de dobra/gancho casa com Z, e probabilidades secundárias dão crédito
 * parcial mesmo quando o argmax aponta para outra classe.
 */
function pairAffinity(analysis, refCode) {
  if (analysis.code === refCode) return 1;
  const p = analysis.probs[refCode] || 0;
  const d = analysis.detail;
  if (refCode === 'Z' && (d.hook || (d.cornerCount >= 1 && d.maxTurn > 0.62))) return p > 0.3 ? 0.85 : 0.8;
  if ((refCode === 'H' || refCode === 'S') && analysis.code === 'Z' && d.cornerEnergy < 0.9) return 0.6;
  if (compatible(analysis.code, refCode)) return 0.6;
  if (p > 0.3) return 0.55;
  return p > 0.18 ? 0.3 : 0;
}
function editDistanceAnalyses(analyses, seq) {
  const n = analyses.length, m = seq.length;
  let prev = Array(m + 1);
  for (let j = 0; j <= m; j++) prev[j] = j;
  for (let i = 1; i <= n; i++) {
    const cur = [i];
    for (let j = 1; j <= m; j++) {
      const sub = clamp01(1 - pairAffinity(analyses[i - 1], seq[j - 1]));
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + sub);
    }
    prev = cur;
  }
  return prev[m];
}
function normalizeStrokes(strokes, box = 280) {
  const pts = [];
  strokes.forEach(s => s.forEach(p => pts.push(p)));
  if (!pts.length) return strokes;
  const b = bbox(pts);
  const scale = Math.min(box / Math.max(1, b.w), box / Math.max(1, b.h), 4);
  const ox = (box - b.w * scale) / 2, oy = (box - b.h * scale) / 2;
  return strokes.map(s => s.map(p => ({ x: ox + (p.x - b.minX) * scale, y: oy + (p.y - b.minY) * scale })));
}
function directionPairScore(analysis, refCode) {
  const raw = analysis.probs[refCode] || 0;
  let s = clamp01((raw - 0.18) / 0.55);
  const aff = pairAffinity(analysis, refCode);
  if (analysis.code === refCode) s = Math.max(s, 0.9);
  else if (aff >= 0.8) s = Math.max(s, 0.72 + raw * 0.3);
  else if (aff >= 0.55) s = Math.max(s, 0.55);
  return clamp01(s);
}
function shapePairScore(analysis, refCode) {
  const d = analysis.detail;
  if (refCode === 'Z') {
    let s = clamp01(d.cornerEnergy / 1.05);
    if (d.hook) s = Math.max(s, 0.8);
    if (d.maxTurn > 0.7) s = Math.max(s, 0.68);
    if (d.straight > 0.9 && !d.hook) s = Math.min(s, 0.25);
    return s;
  }
  // H/S/P/D esperam traço essencialmente contínuo, sem quebras fortes
  let s = clamp01((d.straight - 0.42) / 0.42);
  if (refCode === 'P' || refCode === 'D') s = clamp01((d.straight - 0.34) / 0.5); // piě/nà curvam de leve
  if (d.cornerCount >= 2 || d.maxTurn > 1.1) s *= 0.45;
  else if (d.cornerCount === 1) s *= 0.8;
  return s;
}
function alignPairs(analyses, seq) {
  // Alinhamento por programação dinâmica (LCS ponderado por afinidade)
  // devolvendo pares (índice do traço do usuário, índice da referência).
  const n = analyses.length, m = seq.length;
  const dp = Array.from({ length: n + 1 }, () => new Float32Array(m + 1));
  const aff = (i, j) => { const a = pairAffinity(analyses[i], seq[j]); return a >= 0.25 ? a : 0; };
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1] + aff(i - 1, j - 1));
  }
  const pairs = [];
  let i = n, j = m;
  while (i > 0 && j > 0) {
    const match = aff(i - 1, j - 1);
    if (match > 0 && Math.abs(dp[i][j] - (dp[i - 1][j - 1] + match)) < 1e-6) { pairs.push([i - 1, j - 1]); i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  return pairs.reverse();
}
/**
 * Avalia um desenho contra os dados de referência disponíveis.
 * @param {Array<Array<{x,y}>>} strokes traços do usuário (coordenadas do canvas)
 * @param {{refSeqs?:string[], refCount?:number, canvasW:number, canvasH:number}} opts
 * @returns {{percent:number, parts:{order,direction,shape,position,proportion}, codes:string, refSeq:string|null, hasRefSeq:boolean, hasRefCount:boolean, recognized:boolean}}
 */
export function evaluateDrawing(strokes, { refSeqs = null, refCount = null, canvasW = 300, canvasH = 300 } = {}) {
  const clean = (strokes || []).filter(s => s && s.length >= 2 && lengthOf(s) >= HANZI_SCORING_CONFIG.minimumStrokeLength);
  const n = clean.length;
  const empty = { percent: 0, parts: { order: 0, count: 0, direction: 0, shape: 0, position: 0, proportion: 0 }, codes: '', refSeq: null, hasRefSeq: false, hasRefCount: Boolean(refCount), recognized: false };
  if (!n) return empty;

  const normalized = normalizeStrokes(clean, 280);
  const analyses = normalized.map(analyzeStroke);
  const codes = analyses.map(a => a.code).join('');

  const seqs = (refSeqs || []).map(s => String(s || '').replace(/[^HSPDZ]/g, '')).filter(Boolean);
  const hasRefSeq = seqs.length > 0;
  let bestSeq = null, order = null, direction = null, shape = null;

  if (hasRefSeq) {
    let bestEdit = Infinity;
    for (const seq of seqs) {
      const d = editDistanceAnalyses(analyses, seq);
      if (d < bestEdit) { bestEdit = d; bestSeq = seq; }
    }
    const m = bestSeq.length;
    const editSim = clamp01(1 - bestEdit / Math.max(n, m));
    let prefix = 0;
    for (let i = 0; i < Math.min(n, m); i++) {
      const aff = pairAffinity(analyses[i], bestSeq[i]);
      if (aff >= 0.99) prefix += 1;
      else if (aff >= 0.5) prefix += 0.55;
      else break;
    }
    order = clamp01(editSim * 0.72 + (prefix / Math.max(n, m)) * 0.28);

    const pairs = alignPairs(analyses, bestSeq);
    if (pairs.length) {
      let dSum = 0, sSum = 0;
      for (const [ui, rj] of pairs) {
        dSum += directionPairScore(analyses[ui], bestSeq[rj]);
        sSum += shapePairScore(analyses[ui], bestSeq[rj]);
      }
      const coverage = pairs.length / Math.max(n, m);
      direction = clamp01((dSum / pairs.length) * (0.6 + 0.4 * coverage));
      shape = clamp01((sSum / pairs.length) * (0.6 + 0.4 * coverage));
    } else { direction = 0.15; shape = 0.15; }
  }

  // Consistência interna (usada quando não há sequência de referência):
  // cada traço é pontuado contra a própria classe primária detectada.
  const selfDir = analyses.reduce((s, a) => s + clamp01((a.confidence - 0.24) / 0.5), 0) / n;
  const selfShape = analyses.reduce((s, a) => s + shapePairScore(a, a.code), 0) / n;

  const expected = hasRefSeq ? bestSeq.length : (Number(refCount) || null);
  const countRatio = expected ? Math.min(n, expected) / Math.max(n, expected) : null;

  if (!hasRefSeq) {
    order = countRatio != null ? countRatio : 0.55;
    direction = clamp01(0.35 + selfDir * 0.5);
    shape = clamp01(0.35 + selfShape * 0.5);
  }

  // Posicionamento: centralização no quadrado + permanência dentro das margens
  const allPts = []; clean.forEach(s => s.forEach(p => allPts.push(p)));
  const raw = bbox(allPts);
  const size = Math.min(canvasW, canvasH) || 300;
  const offset = Math.hypot(raw.cx - canvasW / 2, raw.cy - canvasH / 2);
  const centerScore = clamp01(1 - offset / (HANZI_SCORING_CONFIG.naturalVariation.centerTolerance * size));
  const mL = canvasW * 0.03, mT = canvasH * 0.03;
  const insideW = Math.max(0, Math.min(raw.maxX, canvasW - mL) - Math.max(raw.minX, mL));
  const insideH = Math.max(0, Math.min(raw.maxY, canvasH - mT) - Math.max(raw.minY, mT));
  const fitScore = clamp01((insideW * insideH) / Math.max(1, raw.w * raw.h));
  let position = clamp01(centerScore * 0.62 + fitScore * 0.38);

  // Proporção: quantidade relativa de traços + preenchimento + aspecto próximo do quadrado
  const fill = (raw.w * raw.h) / Math.max(1, canvasW * canvasH);
  const fillScore = clamp01(1 - Math.abs(fill - HANZI_SCORING_CONFIG.naturalVariation.fillTarget) / HANZI_SCORING_CONFIG.naturalVariation.fillTolerance);
  const aspect = Math.abs(Math.log2(Math.max(4, raw.w) / Math.max(4, raw.h)));
  const aspectScore = clamp01(1 - aspect / HANZI_SCORING_CONFIG.naturalVariation.aspectTolerance);
  let proportion = clamp01((countRatio != null ? countRatio : 0.7) * 0.5 + fillScore * 0.3 + aspectScore * 0.2);

  // Dois riscos minúsculos em cantos opostos não podem parecer um Hanzi só
  // porque a caixa total ficou centralizada. A cobertura usa comprimento útil
  // por traço e ainda tolera naturalmente variações de tamanho da escrita.
  const totalLength = clean.reduce((sum, stroke) => sum + lengthOf(stroke), 0);
  const coverage = clamp01(totalLength / Math.max(1, size * Math.max(expected || n, n) * .22));
  shape *= .55 + coverage * .45;
  position *= .42 + coverage * .58;
  proportion *= .45 + coverage * .55;

  const pct = v => Math.round(clamp01(v) * 100);
  const parts = { order: pct(order), count: pct(countRatio == null ? .65 : countRatio), direction: pct(direction), shape: pct(shape), position: pct(position), proportion: pct(proportion) };
  const percent = weightedHanziScore(parts);
  const recognized = percent >= HANZI_SCORING_CONFIG.recognitionThreshold && (hasRefSeq ? order >= 0.5 : (countRatio == null || countRatio >= 0.75));
  return {
    percent,
    parts,
    codes, refSeq: bestSeq, hasRefSeq, hasRefCount: Boolean(expected), recognized
  };
}

/* ================= sequências de referência (banco do reconhecedor) ================= */
let refMapPromise = null;
async function refSeqsFor(ch) {
  if (!refMapPromise) {
    refMapPromise = import('./manualSearchCore.mjs').then(mod => {
      const map = new Map();
      const add = (c, seq) => {
        if (!c || !seq) return;
        const list = Array.isArray(seq) ? seq : [seq];
        const cur = map.get(c) || [];
        for (const raw of list) {
          const clean = String(raw || '').replace(/[^HSPDZ]/g, '');
          if (clean && !cur.includes(clean)) cur.push(clean);
        }
        if (cur.length) map.set(c, cur);
      };
      try {
        const { SEED, COMMON_EXTRA, VARIANTS } = mod.getManualSearchSeedData();
        SEED.forEach(e => add(e[0], e[1]));
        COMMON_EXTRA.forEach(e => add(e[0], e[1]));
        VARIANTS.forEach(e => add(e[0], e[1]));
      } catch {}
      // Mesmos complementos aplicados pelo reconhecedor em resetSeed()
      add('你', ['PSPZSPD', 'PSPZZPD', 'PSSZZSD', 'PSPZZSD']);
      add('他', ['PSZSHZ']);
      add('们', ['PSDSZ', 'PSDZ']);
      add('爱', ['PDDPDZHPZD', 'PDDPDZPZD', 'PDDPDZHPPD']);
      add('愛', ['PDDPDZDZDHPZD', 'PDDPDZDZDZPPD']);
      return map;
    }).catch(() => new Map());
  }
  const map = await refMapPromise;
  return map.get(ch) || null;
}

/* ============================== interface ============================== */
if (typeof document !== 'undefined') initHanziWritingUI();

function initHanziWritingUI() {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const uiLang = () => {
    const l = String(window.hzLang?.() || document.documentElement.lang || 'pt').toLowerCase();
    return l.startsWith('en') ? 'en' : l.startsWith('es') ? 'es' : 'pt';
  };
  const I18N = {
    pt: {
      title: 'Escrita de Hanzi', sub: 'Traços, ordem e memória motora',
      searchPh: 'Pesquisar ideograma… (ex.: 好)', searchGo: 'Buscar', typeHanzi: 'Digite um ideograma chinês para praticar.',
      refTitle: 'Referência', noGif: 'GIF indisponível para este ideograma — a avaliação usa os demais critérios.',
      showRef: 'Ver referência', hideRef: 'Ocultar referência', loadingRef: 'Buscando ordem dos traços…',
      strokes: 'traços', of: 'de', registerChar: 'Concluir caractere', finishPractice: 'Concluir prática',
      undo: 'Desfazer', clear: 'Limpar', needStrokes: 'Desenhe o ideograma antes de concluir o caractere.',
      simLabel: 'Similaridade estimada', estimatedNote: 'Medida estimada por análise de traços — não é uma correção oficial.',
      noSeqNote: 'Sem sequência de referência para este ideograma: ordem e direção foram estimadas pela contagem e consistência dos traços.',
      pOrder: 'Ordem', pCount: 'Quantidade', pDirection: 'Direção', pShape: 'Forma', pPosition: 'Posição', pProportion: 'Proporção',
      recognizedYes: 'Traçado compatível com a referência', recognizedNo: 'Traçado ainda distante da referência',
      registered: 'Caractere registrado na sessão',
      celTitle: 'Prática de escrita concluída!', celKicker: 'ESCRITA DE HANZI',
      celSubtitle: n => `${n} ideograma(s) avaliado(s) por similaridade de traços.`,
      mCharsDone: 'Ideogramas praticados', mRecognized: 'Reconhecidos', mAvgSim: 'Similaridade média',
      mOrder: 'Precisão de ordem', mDirection: 'Precisão de direção', mPosition: 'Posicionamento',
      mBest: 'Melhor resultado', mHardest: 'Maior dificuldade', mTime: 'Tempo de prática', mScore: 'Pontuação final',
      again: 'Nova sessão', helpBtn: 'Como jogar',
      introTitle: 'Como jogar — Escrita de Hanzi',
      introLead: 'Treine a escrita observando a referência e desenhando no quadrado de prática.',
      introSteps: [
        'Pesquise o ideograma que deseja treinar no campo do topo.',
        'Observe o GIF com a ordem dos traços no painel de referência.',
        'Toque em "Passos" para expandir as imagens estáticas de cada etapa.',
        'Desenhe no quadrado de prática, um traço por vez, na ordem correta.',
        'Use Desfazer para remover o último traço e Limpar para recomeçar.',
        'Toque em "Concluir caractere" para avaliar: ordem, direção, forma, posição e proporção são comparadas com a referência.',
        'Repita com quantos ideogramas quiser e finalize em "Concluir prática" (ou com a seta/Voltar).',
        'A porcentagem é uma similaridade estimada: acima de ~60% o traçado já é compatível com a referência.'
      ],
      start: 'Começar', gotIt: 'Entendi', min: 'min'
    },
    en: {
      title: 'Hanzi writing', sub: 'Strokes, order and motor memory',
      searchPh: 'Search a character… (e.g. 好)', searchGo: 'Search', typeHanzi: 'Type a Chinese character to practise.',
      refTitle: 'Reference', noGif: 'No GIF available for this character — evaluation uses the remaining criteria.',
      showRef: 'View reference', hideRef: 'Hide reference', loadingRef: 'Fetching stroke order…',
      strokes: 'strokes', of: 'of', registerChar: 'Finish character', finishPractice: 'Finish practice',
      undo: 'Undo', clear: 'Clear', needStrokes: 'Draw the character before finishing it.',
      simLabel: 'Estimated similarity', estimatedNote: 'Estimated by stroke analysis — not an official grading.',
      noSeqNote: 'No reference sequence for this character: order and direction were estimated from stroke count and consistency.',
      pOrder: 'Order', pCount: 'Stroke count', pDirection: 'Direction', pShape: 'Shape', pPosition: 'Position', pProportion: 'Proportion',
      recognizedYes: 'Drawing compatible with the reference', recognizedNo: 'Drawing still far from the reference',
      registered: 'Character recorded in this session',
      celTitle: 'Writing practice complete!', celKicker: 'HANZI WRITING',
      celSubtitle: n => `${n} character(s) evaluated by stroke similarity.`,
      mCharsDone: 'Characters practised', mRecognized: 'Recognised', mAvgSim: 'Average similarity',
      mOrder: 'Order accuracy', mDirection: 'Direction accuracy', mPosition: 'Positioning',
      mBest: 'Best result', mHardest: 'Hardest one', mTime: 'Practice time', mScore: 'Final score',
      again: 'New session', helpBtn: 'How to play',
      introTitle: 'How to play — Hanzi writing',
      introLead: 'Practise writing by watching the reference and drawing in the practice square.',
      introSteps: [
        'Search the character you want to practise in the top field.',
        'Watch the stroke-order GIF in the reference panel.',
        'Tap "Steps" to expand the static images of each stage.',
        'Draw in the practice square, one stroke at a time, in the right order.',
        'Use Undo to remove the last stroke and Clear to start over.',
        'Tap "Finish character" to evaluate: order, direction, shape, position and proportion are compared with the reference.',
        'Repeat with as many characters as you like and end with "Finish practice" (or the back arrow/Back button).',
        'The percentage is an estimated similarity: above ~60% your drawing is already compatible with the reference.'
      ],
      start: 'Start', gotIt: 'Got it', min: 'min'
    },
    es: {
      title: 'Escritura de Hanzi', sub: 'Trazos, orden y memoria motora',
      searchPh: 'Buscar un ideograma… (ej.: 好)', searchGo: 'Buscar', typeHanzi: 'Escribe un carácter chino para practicar.',
      refTitle: 'Referencia', noGif: 'GIF no disponible para este ideograma — la evaluación usa los demás criterios.',
      showRef: 'Ver referencia', hideRef: 'Ocultar referencia', loadingRef: 'Buscando el orden de los trazos…',
      strokes: 'trazos', of: 'de', registerChar: 'Concluir carácter', finishPractice: 'Concluir práctica',
      undo: 'Deshacer', clear: 'Limpiar', needStrokes: 'Dibuja el ideograma antes de concluir el carácter.',
      simLabel: 'Similitud estimada', estimatedNote: 'Medida estimada por análisis de trazos — no es una corrección oficial.',
      noSeqNote: 'Sin secuencia de referencia para este ideograma: orden y dirección se estimaron por la cantidad y consistencia de los trazos.',
      pOrder: 'Orden', pCount: 'Cantidad', pDirection: 'Dirección', pShape: 'Forma', pPosition: 'Posición', pProportion: 'Proporción',
      recognizedYes: 'Trazado compatible con la referencia', recognizedNo: 'Trazado aún lejos de la referencia',
      registered: 'Carácter registrado en la sesión',
      celTitle: '¡Práctica de escritura concluida!', celKicker: 'ESCRITURA DE HANZI',
      celSubtitle: n => `${n} ideograma(s) evaluado(s) por similitud de trazos.`,
      mCharsDone: 'Ideogramas practicados', mRecognized: 'Reconocidos', mAvgSim: 'Similitud media',
      mOrder: 'Precisión de orden', mDirection: 'Precisión de dirección', mPosition: 'Posicionamiento',
      mBest: 'Mejor resultado', mHardest: 'Mayor dificultad', mTime: 'Tiempo de práctica', mScore: 'Puntuación final',
      again: 'Nueva sesión', helpBtn: 'Cómo jugar',
      introTitle: 'Cómo jugar — Escritura de Hanzi',
      introLead: 'Practica la escritura observando la referencia y dibujando en el cuadrado de práctica.',
      introSteps: [
        'Busca el ideograma que quieres practicar en el campo superior.',
        'Observa el GIF con el orden de los trazos en el panel de referencia.',
        'Toca "Pasos" para expandir las imágenes estáticas de cada etapa.',
        'Dibuja en el cuadrado de práctica, un trazo a la vez, en el orden correcto.',
        'Usa Deshacer para quitar el último trazo y Limpiar para empezar de nuevo.',
        'Toca "Concluir carácter" para evaluar: orden, dirección, forma, posición y proporción se comparan con la referencia.',
        'Repite con cuantos ideogramas quieras y termina con "Concluir práctica" (o la flecha/Volver).',
        'El porcentaje es una similitud estimada: por encima de ~60% el trazado ya es compatible con la referencia.'
      ],
      start: 'Comenzar', gotIt: 'Entendido', min: 'min'
    }
  };
  const t = k => (I18N[uiLang()] || I18N.pt)[k] ?? I18N.pt[k] ?? k;
  const INTRO_KEY = 'hzIntroSeen.hanziWriting';
  const prefGet = k => { try { return window.hzStore?.prefs?.get(k, null) ?? localStorage.getItem(k); } catch { try { return localStorage.getItem(k); } catch { return null; } } };
  const prefSet = (k, v) => { try { window.hzStore?.prefs?.set(k, v); } catch { try { localStorage.setItem(k, v); } catch {} } };
  const SUGGESTIONS = ['你', '好', '我', '学', '中', '国', '人', '日', '月', '山', '水', '爱'];
  const isCjk = ch => /[\u3400-\u9fff\uf900-\ufaff]/.test(ch);

  function openWriting() {
    try { window.hzPreloadCelebration?.(); } catch {}
    const mount = root => {
      const panel = document.createElement('div');
      panel.id = 'hz-writing-panel';
      panel.className = 'hanzi-writing-game hzw2';
      root.appendChild(panel);
      const session = buildGame(panel);
      return () => { try { session.cleanup(); } catch {} panel.remove(); };
    };
    if (typeof window.hzMountPracticeActivity === 'function') { window.hzMountPracticeActivity('hanzi-writing', mount); return; }
    const hub = $('#hz-sp-hub'), host = $('#hz-sp-host');
    if (!hub || !host) return;
    hub.style.display = 'none'; host.style.display = 'flex'; host.replaceChildren();
    mount(host);
  }
  window.hzOpenWriting = openWriting;

  function buildGame(panel) {
    const state = {
      items: [], startedAt: Date.now(), char: '', ref: null, refToken: 0,
      strokes: [], active: null, finished: false, referenceUsed: false, ctx: null, w: 0, h: 0, dpr: 1
    };
    panel.innerHTML = `
      <div class="hzw2-shell">
        <header class="hzw2-head">
          <button type="button" class="hzwr-back hzw2-back" aria-label="${esc(t('finishPractice'))}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>
          <div class="hzw2-title"><h2>${esc(t('title'))}</h2><p>${esc(t('sub'))}</p></div>
          <div class="hzw2-head-right">
            <button type="button" class="hzw2-help" aria-label="${esc(t('helpBtn'))}">?</button>
            <div class="hzw2-session"><strong data-done>0</strong><span data-avg>—</span></div>
          </div>
        </header>
        <div class="hzw2-search">
          <input type="search" data-search enterkeyhint="search" autocomplete="off" placeholder="${esc(t('searchPh'))}" aria-label="${esc(t('searchPh'))}">
          <button type="button" class="pri" data-search-go>${esc(t('searchGo'))}</button>
        </div>
        <div class="hzw2-chips" role="list">${SUGGESTIONS.map(c => `<button type="button" role="listitem" data-chip="${c}">${c}</button>`).join('')}</div>
        <div class="hzw2-body">
          <aside class="hzw2-ref collapsed" data-ref>
            <button type="button" class="hzw2-ref-toggle" data-ref-toggle aria-expanded="false">${esc(t('showRef'))}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></button>
            <div class="hzw2-ref-inner" data-ref-inner>
              <div class="hzw2-ref-slot" data-ref-slot><div class="hzw2-ref-empty">${esc(t('refTitle'))}</div></div>
              <div class="hzw2-steps-host" data-steps-host></div>
            </div>
          </aside>
          <main class="hzw2-main">
            <div class="hzwr-canvas-wrap hzw2-canvas-wrap" data-canvas-wrap><canvas data-canvas></canvas></div>
            <div class="hzw2-status"><span data-char-label></span><span><strong data-count>0</strong><em data-expected></em> ${esc(t('strokes'))}</span></div>
            <div class="hzw2-actions">
              <button type="button" data-undo>${esc(t('undo'))}</button>
              <button type="button" data-clear>${esc(t('clear'))}</button>
              <button type="button" class="pri" data-register>${esc(t('registerChar'))}</button>
            </div>
            <div class="hzw2-result" data-result hidden></div>
            <button type="button" class="hzw2-finish" data-finish>${esc(t('finishPractice'))}</button>
          </main>
        </div>
      </div>`;

    const refs = {
      back: $('.hzw2-back', panel), help: $('.hzw2-help', panel), done: $('[data-done]', panel), avg: $('[data-avg]', panel),
      search: $('[data-search]', panel), go: $('[data-search-go]', panel),
      refBox: $('[data-ref]', panel), refToggle: $('[data-ref-toggle]', panel), refInner: $('[data-ref-inner]', panel),
      refSlot: $('[data-ref-slot]', panel), stepsHost: $('[data-steps-host]', panel),
      wrap: $('[data-canvas-wrap]', panel), canvas: $('[data-canvas]', panel),
      charLabel: $('[data-char-label]', panel), count: $('[data-count]', panel), expected: $('[data-expected]', panel),
      undo: $('[data-undo]', panel), clear: $('[data-clear]', panel), register: $('[data-register]', panel),
      result: $('[data-result]', panel), finish: $('[data-finish]', panel)
    };

    /* ---------- canvas ---------- */
    let resizeFrame = 0;
    function resize() {
      const r = refs.wrap.getBoundingClientRect();
      const size = Math.floor(Math.min(r.width, r.height));
      if (size < 1) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (state.ctx && state.w === size && state.h === size && state.dpr === dpr) return;
      state.dpr = dpr;
      state.w = size;
      state.h = size;
      refs.canvas.width = Math.round(size * dpr);
      refs.canvas.height = Math.round(size * dpr);
      // A geometria visual pertence ao CSS. Forçar pixels aqui fazia o canvas
      // tentar crescer além do quadrado disponível durante o primeiro layout.
      refs.canvas.style.width = '100%';
      refs.canvas.style.height = '100%';
      state.ctx = refs.canvas.getContext('2d');
      state.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }
    function scheduleResize() {
      if (resizeFrame) return;
      resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; resize(); });
    }
    function grid() {
      const c = state.ctx, w = state.w, h = state.h;
      c.clearRect(0, 0, w, h);
      c.fillStyle = '#f2e9dc'; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(116,75,42,.22)'; c.lineWidth = 1;
      c.strokeRect(.5, .5, w - 1, h - 1);
      c.setLineDash([7, 7]);
      [[w / 2, 0, w / 2, h], [0, h / 2, w, h / 2], [0, 0, w, h], [w, 0, 0, h]].forEach(a => { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(a[2], a[3]); c.stroke(); });
      c.setLineDash([]);
      if (state.char) {
        c.fillStyle = 'rgba(86,56,33,.13)';
        c.font = `${Math.round(w * .62)}px ${getComputedStyle(document.documentElement).getPropertyValue('--rf') || 'serif'}`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(state.char, w / 2, h / 2 + 4);
      }
    }
    function draw() {
      if (!state.ctx) return;
      grid();
      const c = state.ctx;
      c.strokeStyle = '#2e2820'; c.lineWidth = Math.max(5, state.w * .018);
      c.lineCap = 'round'; c.lineJoin = 'round';
      for (const path of state.strokes) {
        if (path.length < 2) continue;
        c.beginPath(); c.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) c.lineTo(path[i].x, path[i].y);
        c.stroke();
      }
    }
    const point = e => { const r = refs.canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * state.w / r.width, y: (e.clientY - r.top) * state.h / r.height }; };
    const onDown = e => { e.preventDefault(); refs.canvas.setPointerCapture?.(e.pointerId); state.active = [point(e)]; state.strokes.push(state.active); syncCounts(); draw(); };
    const onMove = e => { if (!state.active) return; e.preventDefault(); state.active.push(point(e)); draw(); };
    const onEnd = () => { state.active = null; };
    refs.canvas.addEventListener('pointerdown', onDown);
    refs.canvas.addEventListener('pointermove', onMove);
    refs.canvas.addEventListener('pointerup', onEnd);
    refs.canvas.addEventListener('pointercancel', onEnd);

    /* ---------- referência (GIF + Passos) ---------- */
    async function setChar(raw) {
      const ch = [...String(raw || '').trim()].find(isCjk) || '';
      if (!ch) { toastMsg(t('typeHanzi')); refs.search.classList.add('hzw2-shake'); setTimeout(() => refs.search.classList.remove('hzw2-shake'), 420); return; }
      state.char = ch;
      state.referenceUsed = !refs.refBox.classList.contains('collapsed');
      refs.search.value = ch;
      panel.querySelectorAll('[data-chip]').forEach(b => b.classList.toggle('on', b.dataset.chip === ch));
      refs.charLabel.innerHTML = `<b class="hzw2-char">${esc(ch)}</b>`;
      state.strokes = []; hideResult(); syncCounts(); draw();
      state.ref = null; refs.expected.textContent = '';
      const my = ++state.refToken;
      refs.refSlot.innerHTML = `<div class="hzw2-ref-loading"><div class="spin sm"></div><span>${esc(t('loadingRef'))}</span></div>`;
      refs.stepsHost.innerHTML = '';
      let stroke = null;
      try { if (typeof window.lookupStrokeOrder === 'function') stroke = await window.lookupStrokeOrder(ch); } catch {}
      if (my !== state.refToken || !panel.isConnected) return;
      state.ref = stroke || null;
      if (typeof window.hzMountStrokePanel === 'function') {
        window.hzMountStrokePanel({ slot: refs.refSlot, stepsHost: refs.stepsHost, stroke, char: ch, compact: true });
        if (!stroke || !stroke.gif) refs.refSlot.insertAdjacentHTML('beforeend', `<p class="hzw2-nogif">${esc(t('noGif'))}</p>`);
      } else if (stroke?.gif) {
        refs.refSlot.innerHTML = `<div class="lexi-stroke-card"><img src="${esc(stroke.gif)}" alt=""></div>`;
      } else {
        refs.refSlot.innerHTML = `<p class="hzw2-nogif">${esc(t('noGif'))}</p>`;
      }
      const seqs = await refSeqsFor(ch);
      if (my !== state.refToken) return;
      const expected = seqs?.length ? seqs[0].length : (parseInt(stroke?.strokeCount, 10) || null);
      state.expectedCount = expected;
      state.refSeqs = seqs;
      refs.expected.textContent = expected ? ` ${t('of')} ${expected}` : '';
      syncCounts();
    }

    function syncCounts() {
      refs.count.textContent = String(state.strokes.length);
      refs.done.textContent = String(state.items.length);
      const avg = state.items.length ? Math.round(state.items.reduce((s, i) => s + i.percent, 0) / state.items.length) : null;
      refs.avg.textContent = avg == null ? '—' : avg + '%';
    }
    function toastMsg(msg) { try { window.toast?.(msg); } catch {} }
    function hideResult() { refs.result.hidden = true; refs.result.innerHTML = ''; }

    /* ---------- avaliação e registro ---------- */
    function evaluateCurrent() {
      return evaluateDrawing(state.strokes, {
        refSeqs: state.refSeqs, refCount: state.expectedCount,
        canvasW: state.w || 300, canvasH: state.h || 300
      });
    }
    function showResult(res) {
      const bars = [['pOrder', res.parts.order], ['pCount', res.parts.count], ['pDirection', res.parts.direction], ['pShape', res.parts.shape], ['pPosition', res.parts.position], ['pProportion', res.parts.proportion]]
        .map(([k, v]) => `<div class="hzw2-bar"><span>${esc(t(k))}</span><div class="hzw2-bar-track"><i style="width:${v}%"></i></div><b>${v}%</b></div>`).join('');
      refs.result.hidden = false;
      refs.result.innerHTML = `
        <div class="hzw2-result-head ${res.recognized ? 'ok' : 'warn'}">
          <div class="hzw2-result-ring" style="--pct:${res.percent}"><b>${res.percent}%</b></div>
          <div><strong>${esc(t('simLabel'))}</strong><span>${esc(res.recognized ? t('recognizedYes') : t('recognizedNo'))}</span></div>
        </div>
        <div class="hzw2-bars">${bars}</div>
        <p class="hzw2-note">${esc(res.hasRefSeq ? t('estimatedNote') : t('noSeqNote'))}</p>`;
    }
    function registerCurrent() {
      if (state.strokes.filter(s => s.length >= 2).length < 1) { toastMsg(t('needStrokes')); return false; }
      const res = evaluateCurrent();
      state.items.push({ char: state.char || '·', percent: res.percent, parts: res.parts, recognized: res.recognized, strokes: state.strokes.length, hasRefSeq: res.hasRefSeq, referenceUsed: state.referenceUsed, at: Date.now() });
      showResult(res);
      state.strokes = [];
      syncCounts(); draw();
      try { window.hzStat?.bump?.('wRev'); } catch {}
      toastMsg(t('registered'));
      return true;
    }

    /* ---------- conclusão da sessão ---------- */
    function fmtDuration(ms) {
      const s = Math.max(0, Math.round(ms / 1000));
      const m = Math.floor(s / 60);
      return m ? `${m} ${t('min')} ${String(s % 60).padStart(2, '0')}s` : `${s}s`;
    }
    function finish(reason = 'ui') {
      if (state.finished) return;
      // desenho pendente conta como último caractere avaliado
      if (state.strokes.filter(s => s.length >= 2).length >= 1) registerCurrent();
      if (!state.items.length) { state.finished = true; window.__hzPracticeFinish = null; window.hzBackToHub?.(); return; }
      state.finished = true;
      window.__hzPracticeFinish = null;
      const items = state.items;
      const n = items.length;
      const avg = Math.round(items.reduce((s, i) => s + i.percent, 0) / n);
      const avgPart = key => Math.round(items.reduce((s, i) => s + (i.parts?.[key] || 0), 0) / n);
      const recognized = items.filter(i => i.recognized).length;
      const best = items.reduce((a, b) => (b.percent > a.percent ? b : a), items[0]);
      const worst = items.reduce((a, b) => (b.percent < a.percent ? b : a), items[0]);
      const duration = Date.now() - state.startedAt;
      const score = Math.max(0, Math.min(100, avg));
      const stats = [
        { label: t('mCharsDone'), value: n },
        { label: `${t('mRecognized')} / ${uiLang()==='en'?'Mistakes':uiLang()==='es'?'Errores':'Erros'}`, value: `${recognized} / ${n-recognized}` },
        { label: t('mOrder'), value: avgPart('order') + '%' },
        { label: t('mBest'), value: `${best.char} · ${best.percent}%` },
        { label: t('mHardest'), value: `${worst.char} · ${worst.percent}%` },
        { label: t('mTime'), value: fmtDuration(duration) }
      ];
      try {
        window.hzStore?.saveSession?.('hanzi-writing', {
          chars: n, recognized, avg, parts: { order: avgPart('order'), direction: avgPart('direction'), shape: avgPart('shape'), position: avgPart('position'), proportion: avgPart('proportion') },
          best: { char: best.char, percent: best.percent }, worst: { char: worst.char, percent: worst.percent },
          durationMs: duration, score, items: items.map(i => ({ c: i.char, p: i.percent, r: i.recognized ? 1 : 0, referenceUsed: i.referenceUsed ? 1 : 0 }))
        });
      } catch {}
      const restart = () => {
        state.items = []; state.strokes = []; state.startedAt = Date.now(); state.finished = false; state.referenceUsed = false;
        window.__hzPracticeFinish = r => finish(r);
        hideResult(); syncCounts(); draw();
      };
      const show = () => {
        if (typeof showPracticeSummary === 'function') {
          showPracticeSummary({
            kicker: t('celKicker'), title: t('celTitle'),
            score, percent: avg, scoreLabel: String(score),
            subtitle: t('celSubtitle')(n), stats,
            againLabel: t('again'), onAgain: restart, onBack: () => window.hzBackToHub?.(), onClose: () => window.hzBackToHub?.()
          });
        } else window.hzBackToHub?.();
      };
      if (reason === 'back' || reason === 'esc') requestAnimationFrame(show); else show();
    }

    /* ---------- introdução "Como jogar" ---------- */
    function openIntro(firstRun) {
      const steps=t('introSteps'),language=uiLang();
      const titles=language==='en'?['Goal','Select a Hanzi','View the reference','Draw and correct','Similarity and score','Finish or leave']
        :language==='es'?['Objetivo','Seleccionar un Hanzi','Consultar la referencia','Dibujar y corregir','Similitud y puntuación','Concluir o salir']
        :['Objetivo','Selecionar um Hanzi','Consultar a referência','Desenhar e corrigir','Similaridade e pontuação','Concluir ou sair'];
      const topics=[
        {title:titles[0],detail:t('introLead')},
        {title:titles[1],detail:steps[0]},
        {title:titles[2],detail:`${steps[1]} ${steps[2]}`},
        {title:titles[3],detail:`${steps[3]} ${steps[4]}`},
        {title:titles[4],detail:`${steps[5]} ${steps[7]}`},
        {title:titles[5],detail:steps[6]}
      ];
      showPracticeHelp({firstRun,kicker:t('helpBtn'),title:t('introTitle'),summary:t('introLead'),topics,startLabel:t('start'),closeLabel:t('gotIt'),onStart:()=>prefSet(INTRO_KEY,'1')});
    }

    /* ---------- eventos ---------- */
    refs.back.onclick = () => finish('ui');
    refs.finish.onclick = () => finish('ui');
    refs.register.onclick = () => registerCurrent();
    refs.undo.onclick = () => { state.strokes.pop(); hideResult(); syncCounts(); draw(); };
    refs.clear.onclick = () => { state.strokes = []; hideResult(); syncCounts(); draw(); };
    refs.help.onclick = () => openIntro(false);
    refs.go.onclick = () => setChar(refs.search.value);
    refs.search.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); setChar(refs.search.value); } });
    panel.querySelectorAll('[data-chip]').forEach(b => b.onclick = () => setChar(b.dataset.chip));
    refs.refToggle.onclick = () => {
      const open = refs.refBox.classList.toggle('collapsed') === false;
      if (open) state.referenceUsed = true;
      refs.refToggle.setAttribute('aria-expanded', String(open));
      refs.refToggle.firstChild.textContent = open ? t('hideRef') : t('showRef');
    };

    window.__hzPracticeFinish = r => finish(r);

    let ro = null;
    if ('ResizeObserver' in window) { ro = new ResizeObserver(scheduleResize); ro.observe(refs.wrap); }
    window.addEventListener('resize', scheduleResize, { passive: true });
    requestAnimationFrame(() => requestAnimationFrame(() => { scheduleResize(); syncCounts(); }));

    if (prefGet(INTRO_KEY) !== '1') openIntro(true);
    setChar('你');

    function cleanup() {
      window.__hzPracticeFinish = null;
      state.refToken++;
      document.querySelector('.hz-practice-help')?.remove();
      ro?.disconnect();
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      window.removeEventListener('resize', scheduleResize);
      refs.canvas.removeEventListener('pointerdown', onDown);
      refs.canvas.removeEventListener('pointermove', onMove);
      refs.canvas.removeEventListener('pointerup', onEnd);
      refs.canvas.removeEventListener('pointercancel', onEnd);
    }
    return { cleanup, finish };
  }
}

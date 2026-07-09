#!/usr/bin/env node
/*
  Validador dos bancos locais do Hanzi Reader.

  Uso:
    node scripts/validate-db.mjs

  O script valida:
  - pasta `db/` em minúsculas;
  - JSON válido;
  - ausência de duplicatas dentro de cada nível;
  - duplicatas cruzadas entre níveis;
  - termos vazios, sem caracteres chineses ou longos demais;
  - padrões gramaticais repetidos ou muito semelhantes;
  - estatísticas por nível, por tamanho e por tipo de padrão.
*/
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dbDir = path.join(root, 'db');
const oldDbDir = path.join(root, 'DB');
const hskPath = path.join(dbDir, 'hsk-expanded.json');
const grammarPath = path.join(dbDir, 'grammar-helpers.json');

let failed = false;
const warn = [];
const fail = msg => { failed = true; console.error('✗ ' + msg); };
const info = msg => console.log('• ' + msg);

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    fail(`JSON inválido ou ausente: ${file} — ${e.message}`);
    return null;
  }
}
function norm(s) {
  return String(s ?? '')
    .normalize('NFKC')
    .replace(/[\s，,。！？!?:：；;、"“”‘’（）()《》〈〉【】\[\]{}·]/g, '')
    .trim();
}
function hasCjk(s) { return /[\u3400-\u9fff]/.test(s); }
function jaccard(a, b) {
  const A = new Set([...a]);
  const B = new Set([...b]);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const uni = new Set([...A, ...B]).size || 1;
  return inter / uni;
}

if (!fs.existsSync(dbDir)) fail('A pasta `db/` não existe. O nome deve ser minúsculo.');
if (fs.existsSync(oldDbDir)) warn.push('Existe uma pasta `DB/` maiúscula. Remova-a do repositório depois de migrar para `db/`.');

const hsk = readJson(hskPath);
const grammar = readJson(grammarPath);

if (hsk) {
  const words = hsk.words || hsk.levels || {};
  const global = new Map();
  let total = 0;
  const lenStats = { one: 0, two: 0, three: 0, four: 0, fivePlus: 0 };
  for (let lv = 1; lv <= 9; lv++) {
    const arr = Array.isArray(words[String(lv)]) ? words[String(lv)] : [];
    const seen = new Map();
    let invalid = 0;
    for (const raw of arr) {
      const w = norm(raw);
      total++;
      const len = [...w].length;
      if (len === 1) lenStats.one++;
      else if (len === 2) lenStats.two++;
      else if (len === 3) lenStats.three++;
      else if (len === 4) lenStats.four++;
      else lenStats.fivePlus++;
      if (!w || !hasCjk(w) || len > 14) invalid++;
      if (seen.has(w)) fail(`Duplicata no HSK ${lv}: ${w}`);
      seen.set(w, true);
      if (global.has(w)) {
        warn.push(`Termo aparece em mais de um nível: ${w} — HSK ${global.get(w)} e HSK ${lv}`);
      } else {
        global.set(w, lv);
      }
    }
    if (!arr.length) fail(`HSK ${lv} está vazio.`);
    if (invalid) fail(`HSK ${lv} possui ${invalid} termos inválidos.`);
    info(`HSK ${lv}: ${arr.length} termos`);
  }
  info(`Total HSK: ${total} termos`);
  info(`Tamanhos: 1=${lenStats.one}, 2=${lenStats.two}, 3=${lenStats.three}, 4=${lenStats.four}, 5+=${lenStats.fivePlus}`);
  if (lenStats.two + lenStats.three + lenStats.four + lenStats.fivePlus < total * 0.70) {
    warn.push('Menos de 70% da base é multi-caractere. Para segmentação, convém manter predominância de palavras compostas.');
  }
}

if (grammar) {
  const patterns = Array.isArray(grammar.patterns) ? grammar.patterns : [];
  if (!patterns.length) fail('grammar-helpers.json não possui patterns.');
  const keys = new Map();
  const normTitles = [];
  let invalid = 0;
  for (const [i, g] of patterns.entries()) {
    const trigger = norm(g.trigger);
    const title = norm(g.title);
    const pat = norm(g.pattern || g.title);
    if (!trigger || !title || !hasCjk(trigger)) invalid++;
    const key = `${trigger}|${pat}`;
    if (keys.has(key)) fail(`Padrão gramatical duplicado: ${g.trigger} / ${g.pattern}`);
    keys.set(key, i);
    normTitles.push([title, i, g.title]);
  }
  if (invalid) fail(`${invalid} padrões gramaticais inválidos.`);
  // Similaridade alta por título normalizado. Apenas avisa para curadoria manual.
  for (let i = 0; i < normTitles.length; i++) {
    for (let j = i + 1; j < normTitles.length && j < i + 160; j++) {
      const [a, ai, at] = normTitles[i];
      const [b, bi, bt] = normTitles[j];
      if (a.length < 4 || b.length < 4) continue;
      const sim = jaccard(a, b);
      if (sim > 0.92 && a !== b) warn.push(`Padrões muito semelhantes: [${ai}] ${at} ⇄ [${bi}] ${bt}`);
    }
  }
  info(`Gramática: ${patterns.length} padrões`);
}

if (warn.length) {
  console.warn('\nAvisos de curadoria:');
  for (const w of warn.slice(0, 80)) console.warn('! ' + w);
  if (warn.length > 80) console.warn(`! ... mais ${warn.length - 80} avisos omitidos`);
}

if (failed) {
  console.error('\nResultado: DB inválido. Corrija os erros acima.');
  process.exit(1);
}
console.log('\nResultado: DB válido.');

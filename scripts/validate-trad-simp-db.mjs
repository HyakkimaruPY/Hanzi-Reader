import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dbPath = path.join(root, 'db', 'traditional-simplified.json');
const raw = fs.readFileSync(dbPath, 'utf8');
const db = JSON.parse(raw);
const chars = db.chars || db.charMap || {};
const phrases = db.phrases || db.phraseMap || {};
const errors = [];
const isCjk = s => /[\u3400-\u9fff\uf900-\ufaff]|[\u{20000}-\u{323AF}]/u.test(s);

function checkMap(name, map, expectSingle) {
  const seen = new Set();
  for (const [k, v] of Object.entries(map)) {
    if (!k || !v) errors.push(`${name}: entrada vazia`);
    if (k === v) errors.push(`${name}: identidade inútil ${k}`);
    if (!isCjk(k)) errors.push(`${name}: chave sem CJK ${k}`);
    if (expectSingle && [...k].length !== 1) errors.push(`${name}: chave não unitária ${k}`);
    if (!expectSingle && [...k].length < 2) errors.push(`${name}: frase curta demais ${k}`);
    if (seen.has(k)) errors.push(`${name}: duplicata ${k}`);
    seen.add(k);
  }
}
checkMap('chars', chars, true);
checkMap('phrases', phrases, false);

const samples = {
  '學習中文':'学习中文',
  '這裡有一個問題':'这里有一个问题',
  '繁體字轉換測試':'繁体字转换测试',
  '紅樓夢第一回':'红楼梦第一回',
  '觀察這個現象':'观察这个现象'
};
const keys = Object.keys(phrases).sort((a,b)=>[...b].length-[...a].length);
const maxLen = Math.max(1, ...keys.map(k => [...k].length));
function convert(text) {
  const arr = [...String(text || '')];
  let out = '';
  for (let i = 0; i < arr.length;) {
    let hit = false;
    for (let len = Math.min(maxLen, arr.length - i); len > 1; len--) {
      const sub = arr.slice(i, i + len).join('');
      if (phrases[sub]) { out += phrases[sub]; i += len; hit = true; break; }
    }
    if (hit) continue;
    out += chars[arr[i]] || arr[i];
    i++;
  }
  return out;
}
for (const [src, expected] of Object.entries(samples)) {
  const got = convert(src);
  if (got !== expected) errors.push(`sample falhou: ${src} => ${got}, esperado ${expected}`);
}
if ((db.stats?.chars || 0) !== Object.keys(chars).length) errors.push('stats.chars não bate');
if ((db.stats?.phrases || 0) !== Object.keys(phrases).length) errors.push('stats.phrases não bate');

if (errors.length) {
  console.error(errors.slice(0, 30).join('\n'));
  console.error(`Total de erros: ${errors.length}`);
  process.exit(1);
}
console.log(`DB tradicional→simplificado válido: ${Object.keys(chars).length} caracteres, ${Object.keys(phrases).length} frases, ${raw.length} bytes.`);

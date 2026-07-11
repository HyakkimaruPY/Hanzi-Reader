#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
const db=JSON.parse(fs.readFileSync('db/traditional-simplified.json','utf8'));
assert.ok(db&&typeof db==='object','base tradicional/simplificado inválida');
assert.ok(db.phrases&&Object.keys(db.phrases).length>1000,'mapeamento de frases insuficiente');
assert.ok(db.chars&&Object.keys(db.chars).length>1000,'mapeamento de caracteres insuficiente');
for(const [from,to] of Object.entries(db.chars).slice(0,100)){
  assert.ok(from&&typeof to==='string'&&to,'mapeamento de caractere inválido');
}
console.log(`✓ trad-simp: ${Object.keys(db.phrases).length} frases e ${Object.keys(db.chars).length} caracteres`);

#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const hsk=read('db/hsk-expanded.json');
const grammar=read('db/grammar-helpers.json');
assert.equal(typeof hsk.words,'object','hsk-expanded.json precisa de words');
assert.ok(Object.keys(hsk.words).length>=6,'base HSK precisa conter níveis');
const total=Object.values(hsk.words).reduce((sum,value)=>sum+(Array.isArray(value)?value.length:Object.keys(value||{}).length),0);
assert.ok(total>100,'base HSK parece vazia');
assert.ok(Array.isArray(grammar.patterns)&&grammar.patterns.length>100,'grammar-helpers.json parece incompleto');
console.log(`✓ db: ${total} entradas HSK e ${grammar.patterns.length} padrões gramaticais`);

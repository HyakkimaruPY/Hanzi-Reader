#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(file,'utf8');
const script=read('js/script.mjs');
const learning=read('js/learning-engine.mjs');
const visual=read('js/visual-refresh.js');
const css=read('css/visual-refresh.css')+'\n'+read('css/learning-engine.css');

assert.match(script,/\['music','Música',v29Svg\('music'\)\]/);
assert.match(script,/if\(tab==='music'\)\{window\.hzOpenMusic/);
assert.doesNotMatch(learning,/hzPracticeAmbience|ambienceEnabled|setDucked/);
assert.match(learning,/hzts-intro/);
assert.match(learning,/data-dock-size/);
assert.match(learning,/hzReaderDock\.v1/);
assert.match(learning,/function toneIcon\(\).*?<rect x="7"/s);
assert.match(visual,/const writingIcon=.*?<path d="M23 23h17/s);
assert.match(visual,/hzvr-summary-grid/);
assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
assert.match(css,/--hz-reader-dock-opacity/);
assert.match(css,/min-height:44px!important/);
assert.doesNotMatch(script,/setTimeout\(v43StartPreload,3000\)/);
assert.doesNotMatch(script,/setInterval\(\(\)=>\{try\{organizeReaderSettings/);
console.log('✓ ui-refinement: Música, Prática, perfil, leitor e navegação');

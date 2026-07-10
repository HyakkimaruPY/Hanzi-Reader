#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const fail=[];
const ok=msg=>console.log('✓ '+msg);
const bad=msg=>fail.push(msg);
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const index=read('index.html');
const script=read('js/script.mjs');
const adapter=read('js/source-adapter.mjs');

if(!index.includes('class="app-booting"'))bad('index.html não ativa o bloqueio visual de inicialização.');
else ok('boot visual bloqueia o scaffold legado');
if(!index.includes('window.hzAppReady'))bad('index.html não possui sinal de aplicação pronta.');
else ok('sinal de aplicação pronta presente');
if(/<script[^>]+pdf\.min\.js/i.test(index))bad('PDF.js ainda é carregado de forma bloqueante no HTML.');
else ok('PDF.js é carregado apenas sob demanda');
if(!script.includes('window.hzAppReady&&window.hzAppReady()'))bad('v29Boot não libera a interface principal.');
if(!script.includes('function ensurePDFLib()'))bad('loader sob demanda do PDF.js ausente.');
if(!script.includes('function ensurePinyinLib()')||!script.includes('Promise.race([ensurePinyinLib(),delay(850)])'))bad('pinyin-pro ainda pode bloquear o leitor.');
else ok('pinyin externo é carregado sob demanda com orçamento curto');
if(script.includes("const HR35_TTS_ENDPOINT='/api/tts'"))bad('rota TTS legada ainda ativa.');
else ok('cliente TTS aponta para /api/tts-edge');
if(adapter.includes('new MutationObserver'))bad('observer global de DOM ainda presente no source adapter.');
else ok('source adapter sem observer global de DOM');
if(!adapter.includes('renderDiscoverLoading()'))bad('tela neutra de carregamento das fontes ausente.');
else ok('troca para Fontes é protegida contra conteúdo legado');
if(!adapter.includes('let indexPromise = null')||!adapter.includes('if(indexPromise) return indexPromise'))bad('manifesto de sources não deduplica carregamentos concorrentes.');
else ok('manifesto de sources possui cache de requisição concorrente');

const gameMatch=script.match(/const HZP_GAME_B64='([^']+)'/);
if(!gameMatch)bad('módulo do jogo de tons não encontrado.');
else{
  const game=Buffer.from(gameMatch[1],'base64').toString('utf8');
  if(!game.includes('queueSize: 6'))bad('fila do jogo de tons voltou a pré-carregar desafios demais.');
  else if(game.includes('preloadChallenge(ch);'))bad('fila do jogo de tons ainda pré-carrega áudio de todos os desafios.');
  else ok('pré-carregamento do jogo de tons está limitado ao desafio atual');
}

const refs=[...index.matchAll(/(?:src|href)="((?:js|css)\/[^"?#]+)"/g)].map(m=>m[1]);
for(const ref of refs){
  if(!fs.existsSync(path.join(root,ref)))bad(`referência local ausente: ${ref}`);
}
if(refs.length)ok(`${refs.length} referências locais do HTML existem`);

const sourceIndex=JSON.parse(read('source/index.json'));
const entries=Array.isArray(sourceIndex)?sourceIndex:(sourceIndex.items||sourceIndex.sources||[]);
if(!entries.length)bad('source/index.json não possui conteúdos.');
for(const item of entries){
  if(!item.path)bad(`source sem path: ${item.id||item.title||'desconhecida'}`);
  else if(!fs.existsSync(path.join(root,'source',item.path)))bad(`source ausente: ${item.path}`);
}
if(entries.length)ok(`${entries.length} fontes locais referenciam arquivos existentes`);

for(const rel of ['db/hsk-expanded.json','db/grammar-helpers.json','db/traditional-simplified.json','api/tts-edge.js']){
  if(!fs.existsSync(path.join(root,rel)))bad(`arquivo obrigatório ausente: ${rel}`);
}
ok('arquivos obrigatórios verificados');

if(fail.length){
  console.error('\nFalhas do projeto:');
  for(const msg of fail)console.error('✗ '+msg);
  process.exit(1);
}
console.log('\nProjeto estruturalmente válido.');

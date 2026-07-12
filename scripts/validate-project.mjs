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
const visual=read('js/visual-refresh.js');
const learning=read('js/learning-engine.mjs');
const practiceAudio=read('js/practice-audio-service.mjs');
const core=read('js/learning-core.mjs');

if(!index.includes('css/visual-refresh.css')||!index.includes('js/visual-refresh.js'))bad('camada de identidade visual não está carregada no HTML.');
else ok('camada de identidade visual carregada por último');
if(!visual.includes('America/Sao_Paulo')||!visual.includes('hzStreak.v1'))bad('sequência diária no fuso de Brasília ausente.');
else ok('sequência diária persistente usa o fuso de Brasília');
if(!visual.includes('hz-select-shell')||!visual.includes("select.dispatchEvent(new Event('change'"))bad('select customizado não preserva o estado dos controles originais.');
else ok('selects nativos possuem camada customizada sincronizada');
if(!visual.includes('hzp-writing')||!visual.includes('hz-writing-canvas'))bad('terceira prática de escrita não foi instalada.');
else ok('módulo local de prática de escrita presente');


if(!index.includes('assets/panda-manhua-logo.svg')||!index.includes('type="image/svg+xml"'))bad('novo SVG não está aplicado ao splash e favicon.');
else ok('novo SVG vetorial aplicado ao splash e favicon');
if(!index.includes('css/learning-engine.css')||!index.includes('js/learning-engine.mjs'))bad('motor de aprendizagem não está carregado no HTML.');
else ok('motor de aprendizagem e sua camada visual estão carregados');
if(!visual.includes('hzvr-streak-count'))bad('estrutura flexível da sequência diária ausente.');
else ok('sequência diária usa pilha centralizada responsiva');
if(!script.includes("ava.classList.toggle('has-image',!!img)"))bad('estado da câmera do perfil não acompanha a presença da foto.');
else ok('foto do perfil controla o estado visual da câmera');
if(script.includes("['music','Música',v29Svg('music')]")||script.includes("if(tab==='music')"))bad('Música ainda aparece como item isolado na navegação.');
else if(!learning.includes("leisure:'Lazer'")||!learning.includes('hzp-music')||!learning.includes('assets/guzheng.svg'))bad('categoria Lazer ou card de Guzheng ausente.');
else ok('Música integrada à categoria Lazer, sem item isolado no rodapé');
if(!practiceAudio.includes('class PracticeAudioService')||!learning.includes('class ToneSequenceGame'))bad('áudio central ou jogo Sequência tonal ausente.');
else ok('Sequência tonal reutiliza camada central de áudio');
if(!practiceAudio.includes('this.queue = Promise.resolve()')||!practiceAudio.includes('cancelScope')||!practiceAudio.includes('playBestNative'))bad('camada central de áudio não possui fila, seleção e cancelamento explícitos.');
else ok('camada central de áudio possui fila, seleção e cancelamento');
if(!learning.includes('segmentChineseText')||!learning.includes('prefetchAt(this.index+1'))bad('leitura contínua não usa segmentação e pré-buffer.');
else ok('leitura contínua usa segmentação linguística e pré-buffer');
if(!core.includes('updateReviewItem')||!core.includes('selectAdaptiveToneItem'))bad('adaptação e revisão espaçada ausentes.');
else ok('progresso adaptativo e revisão espaçada presentes');

if(!index.includes('property="og:image"')||!index.includes('name="twitter:card"')||!index.includes('assets/social-preview.png'))bad('metadados sociais ou imagem de prévia ausentes.');
else ok('Open Graph e Twitter Cards configurados');
if(!index.includes('id="hz-music-minimize"')||!index.includes('id="hz-music-list"'))bad('modal refinado de Música ausente.');
else ok('modal central de Música e controles próprios presentes');

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

for(const rel of ['db/hsk-expanded.json','db/grammar-helpers.json','db/traditional-simplified.json','api/tts-edge.js','assets/panda-manhua-logo.svg','assets/guzheng.svg','assets/social-preview.png','css/learning-engine.css','css/music-player.css','js/learning-core.mjs','js/learning-engine.mjs','js/practice-ui.mjs','js/practice-audio-service.mjs','js/ui-lifecycle.mjs','js/music-player.mjs']){
  if(!fs.existsSync(path.join(root,rel)))bad(`arquivo obrigatório ausente: ${rel}`);
}
ok('arquivos obrigatórios verificados');

if(fail.length){
  console.error('\nFalhas do projeto:');
  for(const msg of fail)console.error('✗ '+msg);
  process.exit(1);
}
console.log('\nProjeto estruturalmente válido.');

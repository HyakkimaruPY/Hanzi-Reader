import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const [script,sourceAdapter,performanceEngine,visualCss,styleCss,manualSearch,manualSearchCore]=await Promise.all([
  readFile('js/script.mjs','utf8'),
  readFile('js/source-adapter.mjs','utf8'),
  readFile('js/performance-engine.mjs','utf8'),
  readFile('css/visual-refresh.css','utf8'),
  readFile('css/style.css','utf8'),
  readFile('js/manualSearch.mjs','utf8'),
  readFile('js/manualSearchCore.mjs','utf8')
]);

assert.match(script,/function buildHTML\(text,options=\{\}\)/,'buildHTML precisa preservar estado entre lotes');
assert.match(script,/window\.hzProgressiveReader=progressiveReader/,'leitor estável precisa ser exposto aos adaptadores');
assert.match(script,/hz-reader-virtual-chunk/,'textos longos precisam de blocos virtuais estáveis');
assert.doesNotMatch(script,/match\(\/\[\\s\\S\]\{1,900\}\/g\)/,'não dividir texto em blocos arbitrários de 900 caracteres');
assert.doesNotMatch(script,/setTimeout\(v29Boot|setTimeout\(v37Boot|setTimeout\(v38Boot/,'boots não podem repintar telas por timer');
assert.doesNotMatch(sourceAdapter,/\[250,1200,4000\]/,'Source não pode executar boots temporizados');
assert.match(sourceAdapter,/discoverSignature/,'Source deve evitar reconstrução idêntica');
assert.match(performanceEngine,/hz:screen-ready/,'ciclo visível precisa publicar estado pronto');
assert.doesNotMatch(visualCss,/#rscroll\{[^}]*contain:layout paint style/,'viewport do leitor não pode usar paint containment');
assert.match(visualCss,/#rscroll\{[^}]*contain:none/,'viewport do leitor deve evitar clipping de composição');
assert.match(visualCss,/\.screen\{transition:none!important\}/,'troca de tela não pode herdar transição genérica');
assert.match(styleCss,/--reader-py-scale/,'pinyin grande precisa de escala global sem milhares de medições');
assert.match(script,/cancelVirtualReader/,'leitor virtual precisa cancelar trabalho ao sair da tela');
assert.match(script,/buildHTML=function\(text,options\)/,'wrapper de simplificação deve preservar opções incrementais');
assert.doesNotMatch(script,/renderLib\(\);simplifyReaderNow\(\)/,'migração não pode remontar leitor ativo em segundo plano');

assert.match(script,/const unitOffsets=new Array\(chars\.length\+1\)/,'segmentação deve preservar índices Unicode por ponto de código');
assert.match(script,/function viewportChunkIndex\(state\)/,'virtualização deve localizar o bloco pela posição real no viewport');
assert.match(script,/queueMicrotask\(run\)/,'seleção do leitor deve responder no mesmo ciclo lógico');
assert.doesNotMatch(script,/document\.body\.classList\.toggle\('hz-selecting'/,'seleção não deve invalidar estilos de todo o body');
assert.doesNotMatch(script,/simplifyReaderNow\(\);/,'migração não pode substituir o HTML do leitor após a abertura');
assert.match(script,/const hzReaderSettingsRoot=document\.getElementById\('style-scroll'\)/,'observer de ajustes deve ficar restrito ao modal');
assert.doesNotMatch(script,/observe\(document\.body,\{childList:true,subtree:true\}\)/,'não observar o body inteiro para ajustes locais');

assert.match(script,/Promise\.all\(\[loadLib\(\),loadWords\(\),sourceReady\]\)/,'overlay inicial deve aguardar os cards e o manifesto local');
assert.doesNotMatch(script,/function v29Boot\(\)[^{]*\{[^}]*hzAppReady/s,'shell não pode liberar o overlay antes dos dados iniciais');
assert.match(script,/document\.createDocumentFragment\(\);list\.forEach/,'cards da biblioteca devem entrar no DOM em um único lote');
assert.doesNotMatch(script,/requestAnimationFrame\(\(\)=>renderLib\(\)\)/,'troca de visualização não pode atrasar a biblioteca um frame');
assert.match(sourceAdapter,/window\.hsrcReadyPromise=loadIndex\(\)/,'manifesto de Fontes deve participar do bootstrap');
assert.match(sourceAdapter,/if\(loaded\)\{commitDiscoverLocal\(dc\);return;\}/,'Fontes carregadas devem montar antes da ativação da tela');
assert.match(script,/if\(!window\.hsrcRenderDiscoverLocal\)try\{compactDiscover\(\)/,'renderer legado de Fontes não pode competir com o adapter local');

assert.match(script,/const READER_CHUNK_CHARS=240/,'blocos menores devem reduzir long tasks de montagem');
assert.match(script,/function unmountReaderChunk\(state,index\)/,'leitor virtual deve liberar blocos distantes');
assert.match(script,/Math\.abs\(i-center\)>READER_KEEP_DISTANCE/,'DOM do leitor deve permanecer em uma janela limitada');
assert.match(script,/state\.pending\.add\(Number\(entry\.target\.dataset\.chunk\)\)/,'IntersectionObserver não deve montar vários blocos fora do orçamento');
assert.doesNotMatch(script,/chunk\.mounted=true;chunk\.html=''/,'HTML virtual precisa permanecer disponível para remontagem');

assert.doesNotMatch(manualSearch,/observe\(document\.body/,'busca manual não deve observar todas as mutações da página');
assert.doesNotMatch(manualSearchCore,/observe\(document\.body/,'núcleo da busca manual não deve observar todas as mutações da página');
assert.doesNotMatch(script,/document\.getElementById\('ss'\)\|\|document\.body/,'internacionalização deve observar apenas Configurações');

console.log('Render stability checks: OK');

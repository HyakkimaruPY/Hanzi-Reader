import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const [script, sourceAdapter, performanceEngine, refine, audio, lifecycle, index, visualCss] = await Promise.all([
  readFile('js/script.mjs', 'utf8'),
  readFile('js/source-adapter.mjs', 'utf8'),
  readFile('js/performance-engine.mjs', 'utf8'),
  readFile('js/refine-v51.js', 'utf8'),
  readFile('js/practice-audio-service.mjs', 'utf8'),
  readFile('js/ui-lifecycle.mjs', 'utf8'),
  readFile('index.html', 'utf8'),
  readFile('css/visual-refresh.css', 'utf8')
]);

assert.match(script, /let hzScreenGeneration=0/, 'navegação precisa invalidar atualizações visuais obsoletas');
assert.match(script, /generation!==hzScreenGeneration/, 'telas fechadas não podem publicar estado visível atrasado');
assert.match(script, /hzUnmountPracticeActivity/, 'atividades precisam de unmount explícito');
assert.match(script, /hzPracticeCleanup/, 'atividades precisam remover recursos temporários');
assert.doesNotMatch(script, /setTimeout\((v29Boot|v37Boot|v38Boot|hzBoot)/, 'boots não podem repintar a interface por timer');
assert.doesNotMatch(script, /window\.addEventListener\('resize',[^\n]*renderLib/, 'resize do navegador não pode reconstruir a biblioteca');
assert.match(script, /hz:app-shell-mounted/, 'dependências tardias devem usar um evento de montagem');
assert.match(refine, /hzProgressiveReader/, 'o leitor progressivo precisa permanecer ativo');
assert.match(refine, /hzReaderGen/, 'renderizações progressivas precisam de token de cancelamento');
assert.doesNotMatch(sourceAdapter, /observe\(document\.body/, 'Source não pode observar o body inteiro');
assert.match(sourceAdapter, /discoverSignature/, 'Source deve evitar reconstruções idênticas');
assert.match(performanceEngine, /hz:screen-ready/, 'o ciclo visível deve publicar estado pronto');
assert.match(visualCss, /\.screen\{transition:none!important\}/, 'troca de tela não deve herdar fades genéricos');

assert.match(audio, /cancelScope/, 'análises de áudio precisam ser canceláveis por atividade');
assert.match(audio, /source\.start\([\s\S]*?, 0\);/, 'Web Audio deve preservar o primeiro frame usando offset zero');
assert.match(audio, /safeGainFor/, 'ganho precisa ser calculado por uma função limitada');
assert.match(audio, /clipRatio/, 'seleção de source precisa considerar clipping');
assert.match(lifecycle, /resetTemporarySettings/, 'Configurações precisam restaurar estado temporário ao fechar');
assert.match(lifecycle, /\{ passive: true \}/, 'scroll de Configurações precisa usar listener passivo');

assert.match(index, /DOMContentLoaded',release/, 'o scaffold deve ser liberado assim que o DOM utilizável estiver pronto');
assert.match(index, /pageshow',release/, 'restauração do navegador deve liberar a interface');
assert.doesNotMatch(index, /classList\.add\('app-boot-error'\)/, 'o cold start não deve transformar lentidão em bloqueio permanente');

console.log('Render and lifecycle stability checks: OK');

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [writing, learning, practiceUi, audio, storage, lifecycle, css, learningCss, script, index] = await Promise.all([
  readFile('js/hanzi-writing.mjs', 'utf8'), readFile('js/learning-engine.mjs', 'utf8'),
  readFile('js/practice-ui.mjs', 'utf8'), readFile('js/practice-audio-service.mjs', 'utf8'),
  readFile('js/storage-layer.mjs', 'utf8'), readFile('js/ui-lifecycle.mjs', 'utf8'),
  readFile('css/refine-v51.css', 'utf8'), readFile('css/learning-engine.css', 'utf8'), readFile('js/script.mjs', 'utf8'), readFile('index.html', 'utf8')
]);

assert.match(writing, /class="hzw2-ref collapsed"/, 'referência da escrita deve nascer recolhida');
assert.match(writing, /aria-expanded="false"/, 'toggle da referência deve anunciar estado fechado');
assert.doesNotMatch(writing, /recognized \* 25/, 'pontuação não pode receber bônus acima de 100');
assert.match(writing, /Math\.max\(0, Math\.min\(100, avg\)\)/, 'pontuação final da escrita deve ser limitada');
assert.match(writing, /pCount/, 'quantidade de traços deve participar da avaliação');
assert.match(css, /\.hzw2-ref-inner\{position:absolute/, 'referência mobile deve abrir sem empurrar o canvas');
assert.match(css, /\.hzw2-finish\{position:sticky/, 'conclusão da escrita deve permanecer acessível');
assert.match(writing, /Math\.floor\(Math\.min\(r\.width, r\.height\)\)/, 'canvas usa apenas o menor lado disponível');
assert.match(writing, /refs\.canvas\.style\.width = '100%'/, 'canvas não força largura em pixels durante o layout');
assert.match(css, /#hz-writing-panel\.hzw2\{[^}]*box-sizing:border-box/, 'painel de escrita respeita a área segura');
assert.match(learningCss, /\.hzpc-backdrop\{[^}]*background:#050505/, 'celebração cobre integralmente a atividade por trás');
assert.match(learning, /toneTab:'Tons'/, 'aba central de prática usa nome compacto');

assert.match(practiceUi, /hzph-topic/, 'ajuda compartilhada deve usar accordion');
assert.match(practiceUi, /hzpc-again/, 'PracticeSummary deve oferecer repetir');
assert.match(practiceUi, /hzpc-back/, 'PracticeSummary deve oferecer voltar');
assert.match(practiceUi, /hzpc-close/, 'PracticeSummary deve oferecer fechar');
assert.match(learning, /\[\['production'.*\['listening'.*\['leisure'/, 'categorias devem estar na ordem Escrita, Tons e escuta, Lazer');
assert.match(learning, /setPracticeCategory\(shell,'listening'/, 'Tons e escuta deve ser a categoria inicial');

assert.match(storage, /DICTIONARY_RECENT_LIMIT = 30/, 'histórico recente deve ser limitado');
assert.match(storage, /rememberDictionarySearch/, 'persistência deve evitar histórico ilimitado');
assert.match(audio, /analyzePcmBuffer/, 'áudio nativo deve ser analisado');
assert.match(audio, /playBestNative/, 'melhor source deve ser selecionada');
assert.match(audio, /preRollMs: 18/, 'Microsoft TTS deve ter pre-roll técnico curto');
assert.match(audio, /source\.start\([\s\S]*?, 0\);/, 'primeiro frame do áudio deve ser preservado');
assert.match(audio, /3\.2/, 'ganho deve possuir teto seguro');

assert.match(lifecycle, /resetTemporarySettings/, 'Configurações devem restaurar estado inicial');
assert.match(lifecycle, /hz-settings-scrolling/, 'rolagem deve suspender efeitos caros');
assert.match(script, /pointerup.*v37CaptureSelection\(true\)/, 'seleção deve confirmar no pointerup');
assert.match(script, /touchend.*v37CaptureSelection\(true\)/, 'seleção mobile deve confirmar no touchend');
assert.doesNotMatch(script, /H48_prepareSelection\(text,true\);\},720/, 'seleção não pode gerar áudio durante o ajuste');
assert.match(index, /pageshow',release/, 'abertura restaurada deve liberar o boot');

console.log('Refinement v5.2 checks: OK');

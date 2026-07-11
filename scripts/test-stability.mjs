import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p, import.meta.url),'utf8');
const script=read('js/script.mjs');
const learning=read('js/learning-engine.mjs');
const visual=read('js/visual-refresh.js');
const music=read('js/music-player.mjs');
const css=read('css/visual-refresh.css')+read('css/learning-engine.css')+read('css/style.css');
const checks=[
  ['stroke steps in final dictionary renderer', script.includes('h54-steps-btn') && script.includes('v41SliceStrokeGuide')],
  ['reader renderer has stable single-commit layer', script.includes('h55-render-stability-fix') && script.includes('stableReaderRender') && script.includes("mode:'single-commit'")],
  ['reader click delegation without inline token clicks', script.includes('installReaderDelegation') && !script.includes('onclick="onTap(this)"')],
  ['Spanish language selector available', script.includes('data-lang="es"') && script.includes("saved==='pt'||saved==='en'||saved==='es'")],
  ['tone sequence has no fixed 8 challenge limit', !learning.includes('this.total=8') && learning.includes('this.round?Math.round(this.score/this.round*100):0')],
  ['tone sequence completion uses shared celebration', learning.includes('showPracticeCelebration') && learning.includes("type:'tone-sequence'")],
  ['writing reference panel and assessment available', visual.includes('hzwr-gif-card') && visual.includes('evaluateWriting') && visual.includes('window.lookupStrokeOrder')],
  ['writing intro/help available', visual.includes('hzIntro.writing.v1') && visual.includes('writingIntroHTML')],
  ['music modal no search autofocus', !music.includes('refs.search?.focus') && music.includes("refs.modal?.focus")],
  ['new responsive styles present', css.includes('hzwr-workspace') && css.includes('hz-lang-accordion') && css.includes('hzts-session-stats')],
  ['library cards commit in one DOM replacement', script.includes('renderCardFragment') && script.includes('bc.replaceChildren(frag)')],
  ['reader containment disabled to avoid mobile blanks', css.includes('#rscroll{contain:none!important') && css.includes('#rtext{content-visibility:visible!important')],
  ['selection capture responds immediately', script.includes("'pointerup','touchend','keyup'") && script.includes("document.addEventListener('selectionchange',schedule")]

];
let failed=false;
for(const [name,ok] of checks){
  console.log(`${ok?'✓':'✗'} ${name}`);
  if(!ok)failed=true;
}
if(failed)process.exit(1);

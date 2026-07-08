
/* v3.0 estilo cartão dictionary + strict sentence filtering + restored natural audio routes */
(function(){
const V30_STYLE=`
/* v3.0 dictionary/audio polish */
#sx{background:#000}.dict-head{background:#000;border-bottom:1px solid #1e1e1e;padding:calc(var(--st) + 12px) 16px 8px}.dict-head h1{font-size:24px;font-weight:800;color:#fff}.dict-wrap{background:#000;color:#fff}.dict-search{grid-template-columns:42px 1fr 46px;align-items:center}.dict-back-mini{display:none;border:none;background:transparent;color:#fff;font-size:28px;line-height:1}.dict-search input{background:#1e1e1f;border:1px solid #333;border-radius:4px;padding:10px 42px 10px 12px;color:#fff;font-size:20px;font-weight:650}.dict-search button{border-radius:8px;background:#fff;color:#000;font-size:20px}.dict-tabs{position:sticky;top:0;z-index:3;background:#000;border:0;border-bottom:1px solid #2a2a2a;border-radius:0;padding:0;margin:2px -16px 0;grid-template-columns:repeat(3,1fr)}.dict-tab{border-radius:0;color:#047cc0;background:transparent;font-size:13px;font-weight:900;padding:13px 2px 11px;border-bottom:3px solid transparent;text-transform:uppercase;letter-spacing:.2px}.dict-tab.on{background:transparent;color:#18aaff;border-bottom-color:#16a7ff}.dict-results-lexi{display:flex;flex-direction:column;gap:0;margin:0 -16px}.lexi-hero{padding:22px 28px 12px;border-bottom:1px solid #2a2a2a}.lexi-zh{font-family:var(--rf);font-size:54px;line-height:1;color:#e583ff;font-weight:500}.lexi-zh.small{font-size:34px}.lexi-py{font-size:20px;color:#fff;font-weight:800;margin-top:10px;display:flex;align-items:center;gap:7px}.lexi-audio{border:none;background:transparent;color:#10a7ff;font-size:21px;font-weight:900;min-width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}.lexi-audio.pl{color:var(--ac);transform:scale(1.08)}.lexi-source{margin-left:auto;color:#18aaff;font-size:13px;font-weight:900}.lexi-entry{padding:16px 28px;border-bottom:1px solid #2a2a2a}.lexi-pos{font-size:17px;letter-spacing:1px;color:#cfcfcf;font-weight:950;text-transform:uppercase;margin-bottom:12px}.lexi-def{font-size:24px;line-height:1.38;color:#f5f5f5;margin:10px 0}.lexi-num{font-size:26px;font-weight:950;color:#fff;margin-right:10px}.lexi-see{font-size:14px;color:#999;margin-top:7px}.lexi-ex{border-left:3px solid #11aaff;padding:8px 0 8px 13px;margin:10px 0 0}.lexi-ex-zh{font-family:var(--rf);color:#11aaff;font-size:23px;line-height:1.45}.lexi-ex-py{font-size:15px;color:#fff;font-weight:800;margin-top:4px}.lexi-ex-tr{font-size:19px;color:#e6e6e6;line-height:1.35;margin-top:5px}.lexi-meta{font-size:12px;color:#777;margin-top:10px}.dict-item,.sent-card{background:#000;border:0;border-bottom:1px solid #2a2a2a;border-radius:0;padding:14px 28px}.dict-item{grid-template-columns:1fr 42px}.dict-item .zh{font-size:30px;color:#e583ff}.dict-item .trad{color:#bfbfbf}.dict-item .py{font-size:19px;color:#fff;font-weight:850}.dict-item .en{font-size:19px;color:#eaeaea}.dict-item .posline{font-size:13px;color:#eee;font-weight:950;text-transform:uppercase;letter-spacing:1px;margin-right:4px}.sent-card{border-radius:0}.sent-zh{font-size:26px;color:#10a7ff;line-height:1.4}.sent-py{font-size:20px;color:#fff;font-weight:850;line-height:1.35}.sent-tr{font-size:23px;color:#f2f2f2;line-height:1.35;border-top:none;padding-top:3px}.sent-src{font-size:11px;color:#777;margin-top:8px}.dict-empty{padding:28px;color:#8b8b8b;line-height:1.6}.inline-plus{float:right;color:#fff;font-size:18px;border:1px solid #aaa;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;line-height:1;margin-top:5px}.dict-subtitle{font-size:15px;color:#18aaff;font-weight:900;text-align:right;padding:10px 28px 6px;border-bottom:1px solid #1c1c1c}.lexi-trad{font-size:17px;color:#aaa;margin-top:8px}.dict-audio{background:transparent;color:#10a7ff;font-size:21px}.dict-audio.pl{color:var(--ac)}.lexi-chip{display:inline-flex;align-items:center;gap:5px;border:1px solid #263746;background:#071521;border-radius:14px;color:#1ca7ff;font-size:11px;font-weight:800;padding:3px 8px;margin-right:6px;margin-top:8px}.lexi-variants{font-size:15px;color:#a7a7a7;margin-top:8px}.lexi-variants b{color:#ddd}.dict-word-click{cursor:pointer}.dict-word-click:active{opacity:.6}@media (min-width:760px){.dict-wrap{max-width:880px}.dict-results-lexi{margin-left:0;margin-right:0}.dict-tabs{margin-left:0;margin-right:0}.lexi-entry,.lexi-hero,.dict-item,.sent-card,.dict-subtitle,.dict-empty{padding-left:34px;padding-right:34px}.lexi-def{font-size:23px}.sent-tr{font-size:21px}}`;
const st=document.createElement('style');st.textContent=V30_STYLE;document.head.appendChild(st);

const V30_LOCAL_DICT={
 '月':{trad:'月',simp:'月',pinyin:'yuè',pos:'NOUN',defs:['moon','month','monthly','fullmoon-shaped; round'],examples:[['月下散步','yuè xià sànbù','take a walk in the moonlight'],['本月','běn yuè','this month'],['月是故乡明。','yuè shì gùxiāng míng','The moon is brightest in one’s hometown.']]},
 '圆':{trad:'圓',simp:'圆',pinyin:'yuán',pos:'NOUN / VERB / ADJECTIVE',defs:['circle; sphere; ring','coin of fixed value and weight','make plausible; justify','round; circular; spherical'],examples:[['圆圈','yuánquān','circle; ring'],['圆形','yuánxíng','round shape'],['月圆了。','yuè yuán le','The moon is full.']]},
 '月亮':{trad:'月亮',simp:'月亮',pinyin:'yuèliang',pos:'NOUN',defs:['moon'],examples:[['今晚的月亮很圆。','jīnwǎn de yuèliang hěn yuán','The moon is very round tonight.']]},
 '月饼':{trad:'月餅',simp:'月饼',pinyin:'yuèbǐng',pos:'NOUN',defs:['moon cake, especially for the Mid-Autumn Festival'],examples:[['中秋节吃月饼。','zhōngqiū jié chī yuèbǐng','People eat mooncakes at Mid-Autumn Festival.']]},
 '围棋':{trad:'圍棋',simp:'围棋',pinyin:'wéiqí',pos:'NOUN',defs:['go; the board game weiqi'],examples:[['我喜欢下围棋。','wǒ xǐhuān xià wéiqí','I like playing Go.'],['围棋有黑白两种棋子。','wéiqí yǒu hēibái liǎng zhǒng qízǐ','Go has black and white stones.']]},
 '棋子':{trad:'棋子',simp:'棋子',pinyin:'qízǐ',pos:'NOUN',defs:['chess piece; game piece; stone in Go'],examples:[['黑色棋子先行。','hēisè qízǐ xiānxíng','The black stones move first.']]},
 '对弈':{trad:'對弈',simp:'对弈',pinyin:'duìyì',pos:'VERB / NOUN',defs:['to play chess or Go; a game between two sides'],examples:[['双方在棋盘上对弈。','shuāngfāng zài qípán shàng duìyì','The two sides play on the board.']]},
 '棋盘':{trad:'棋盤',simp:'棋盘',pinyin:'qípán',pos:'NOUN',defs:['chessboard; Go board'],examples:[['棋盘上有十九条线。','qípán shàng yǒu shíjiǔ tiáo xiàn','There are nineteen lines on the board.']]},
 '交叉点':{trad:'交叉點',simp:'交叉点',pinyin:'jiāochādiǎn',pos:'NOUN',defs:['intersection point; crossing point'],examples:[['棋子放在交叉点上。','qízǐ fàng zài jiāochādiǎn shàng','The stone is placed on an intersection.']]},
 '胜负':{trad:'勝負',simp:'胜负',pinyin:'shèngfù',pos:'NOUN',defs:['victory or defeat; outcome of a contest'],examples:[['围地的大小决定胜负。','wéidì de dàxiǎo juédìng shèngfù','The size of surrounded territory decides the outcome.']]}
};
const V30_EXTRA_WORDS=['月下散步','本月','隔月','逐月','月光','月初','月底','月份','月球','月台','月宫','月圆','圆形','圆圈','团圆','圆满','规定','黑白','两种','黑色','白色','落子','悔棋','完毕','交替','放置','网格','围地','吃子','大小','决定','十九条','条线'];
const V30_LOCAL_SENTENCES=[]/*v4.8: banco local de exemplo removido (nao usado mais - app e online-first)*/;
function v30IsCjkTerm(q){return [...String(q||'')].some(isCJK)}
function v30ContainsTerm(text,q){text=String(text||'');q=String(q||'').trim();if(!q)return false;const c=[...q].filter(isCJK).join('');if(c.length>1)return text.includes(c);if(c.length===1)return text.includes(c);return text.toLowerCase().includes(q.toLowerCase());}
function v30Js(s){return String(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n').replace(/\r/g,'');}
function v30CleanDef(t){return String(t||'').replace(/^to be /i,'to be ').replace(/\s+/g,' ').trim();}
function v30GuessPos(defs){const joined=(defs||[]).join('; ').toLowerCase();if(/^(to |to be |be |make |have |put |take |walk|play|decide)/.test(joined))return'VERB';if(/round|circular|spherical|bright|clear|black|white/.test(joined))return'ADJECTIVE';if(/quickly|slowly|monthly|often/.test(joined))return'ADVERB';return'NOUN';}
function v30DefListFromEntry(e){let defs=[];if(!e)return defs;if(Array.isArray(e.defs))defs=e.defs;if(Array.isArray(e.english))defs=e.english;if(Array.isArray(e.definitions))defs=e.definitions;if(typeof e.definition==='string')defs=e.definition.split(/[;/]/);if(typeof e.english==='string')defs=e.english.split(/[;/]/);return defs.map(v30CleanDef).filter(Boolean);}
function v30NormalizeCedict(e,q){if(!e)return null;const simp=e.simplified||e.simp||e.s||e.word||e.chinese||q;const trad=e.traditional||e.trad||e.t||'';const py=e.pinyin||e.py||getWordPY(simp||q);const defs=v30DefListFromEntry(e);if(!simp&&!defs.length)return null;return{simp,trad,pinyin:py,defs,pos:e.pos||v30GuessPos(defs),src:'CC-CEDICT'};}
function v30LocalEntry(q){const x=V30_LOCAL_DICT[q];if(!x)return null;return{simp:x.simp||q,trad:x.trad||'',pinyin:x.pinyin||getWordPY(q),defs:x.defs||[],pos:x.pos||v30GuessPos(x.defs||[]),src:'Local',examples:x.examples||[]};}
function v30ExactEntryFirst(entries,q){const seen=new Set(),out=[];for(const e of entries){if(!e)continue;const key=(e.simp||'')+'|'+(e.trad||'')+'|'+(e.pinyin||'')+'|'+(e.defs||[]).join('/');if(seen.has(key))continue;seen.add(key);out.push(e);}out.sort((a,b)=>{const ae=(a.simp===q||a.trad===q)?0:1;const be=(b.simp===q||b.trad===q)?0:1;return ae-be||((a.simp||'').length-(b.simp||'').length);});return out;}
async function v30LookupEntries(q){let raw=[];try{raw=await v29CedictRaw(q)}catch{}let entries=(raw||[]).map(e=>v30NormalizeCedict(e,q)).filter(Boolean);const loc=v30LocalEntry(q);if(loc)entries.unshift(loc);if(!entries.length){const res=await lookupAll(q);if(res&&res.defs){const defs=[];res.defs.forEach(s=>(s.defs||[]).forEach(d=>defs.push(d.text)));entries.push({simp:q,trad:'',pinyin:getWordPY(q),defs, pos:v30GuessPos(defs),src:res.src||'Wiktionary'});}}
return v30ExactEntryFirst(entries,q);
}
function v30EntryHtml(e,i,q){const trad=e.trad&&e.trad!==e.simp?v29TradMask(e.simp,e.trad):'';let html=`<div class="lexi-entry"><div class="lexi-pos">${esc(e.pos||v30GuessPos(e.defs))}<span class="lexi-source">${esc(e.src||'DICT')}</span></div>`;if(trad)html+=`<div class="lexi-trad">Tradicional ${esc(trad)}</div>`;(e.defs||[]).slice(0,10).forEach((d,k)=>{html+=`<div class="lexi-def"><span class="lexi-num">${k+1}</span>${esc(d)}</div>`;});const examples=(e.examples||[]).filter(x=>x&&x[0]&&v30ContainsTerm(x[0],q)).slice(0,4);for(const ex of examples){const key=v30CacheSentenceAudio(ex[0],[]);html+=`<div class="lexi-ex"><div class="lexi-ex-zh">${esc(ex[0])} <button class="lexi-audio" onclick="v30SpeakSentence('${key}')">▶</button></div><div class="lexi-ex-py">${esc(ex[1]||getWordPY(ex[0]))}</div><div class="lexi-ex-tr">${esc(ex[2]||'')}</div></div>`;}html+=`<div class="lexi-meta"><span class="lexi-chip">${esc(e.pinyin||getWordPY(e.simp))}</span>${e.trad&&e.trad!==e.simp?`<span class="lexi-chip">${esc(e.trad)}</span>`:''}</div></div>`;return html;}
async function v29RenderDictDefs(q,out){const entries=await v30LookupEntries(q);const main=entries[0]||{simp:q,trad:'',pinyin:getWordPY(q),defs:[],pos:'',src:'—'};const heroWord=main.simp||q;let html=`<div class="dict-results-lexi"><div class="lexi-hero"><div class="lexi-zh ${[...heroWord].length>3?'small':''}">${esc(heroWord)}</div><div class="lexi-py">PY ${esc(main.pinyin||getWordPY(q))}<button class="lexi-audio" onclick="speakWordMode('${v30Js(heroWord)}','natural')">▶</button><span class="lexi-source">${esc(main.src||'DICT')}</span></div>${main.trad&&main.trad!==main.simp?`<div class="lexi-variants"><b>Trad.</b> ${esc(v29TradMask(main.simp,main.trad))}</div>`:''}</div>`;if(entries.length){entries.slice(0,8).forEach((e,i)=>html+=v30EntryHtml(e,i,q));}else{html+=`<div class="dict-empty">Sem definição encontrada nos bancos atuais. Tente uma palavra composta ou um ideograma isolado.</div>`;}html+=`</div>`;out.innerHTML=html;}
async function v30WordCandidates(q){let entries=[];try{entries=(await v29CedictRaw(q)||[]).map(e=>v30NormalizeCedict(e,q)).filter(Boolean)}catch{}const locKeys=[...Object.keys(V30_LOCAL_DICT),...V30_EXTRA_WORDS,...HSK_LEVEL.keys()];const map=new Map();function add(w,meta={}){if(!w||w===q)return;if(v30ContainsTerm(w,q)){const old=map.get(w)||{};map.set(w,{...old,...meta,word:w});}}
for(const e of entries){add(e.simp,{entry:e}); if(e.trad)add(e.trad,{entry:e});}
for(const w of locKeys)add(w,{level:HSK_LEVEL.get(w)||''});
const arr=[...map.values()].sort((a,b)=>{const aw=a.word.startsWith(q)?0:1,bw=b.word.startsWith(q)?0:1;return aw-bw||a.word.length-b.word.length||a.word.localeCompare(b.word);}).slice(0,80);
return arr;
}
async function v29RenderDictWords(q,out){const words=await v30WordCandidates(q);if(!words.length){out.innerHTML='<div class="dict-empty">Não encontrei palavras formadas com esse termo nos bancos atuais.</div>';return;}out.innerHTML='<div class="dict-results-lexi"><div class="dict-subtitle">▼ Words containing / beginning</div>'+words.map(item=>{const w=item.word;const e=item.entry||v30LocalEntry(w);const py=(e&&e.pinyin)||getWordPY(w);const defs=(e&&e.defs&&e.defs.length?e.defs.slice(0,3).join('; '):'Toque para consultar a definição completa.');const trad=e&&e.trad&&e.trad!==e.simp?v29TradMask(e.simp,e.trad):'';return `<div class="dict-item dict-word-click" onclick="v30DictJump('${v30Js(w)}')"><div class="dict-item-main"><div class="zh">${esc(w)}${trad?` <span class="trad">${esc(trad)}</span>`:''}</div><div class="py">${esc(py)}</div><div class="en"><span class="posline">${esc(e?.pos||'')}</span>${esc(defs)}</div></div><button class="dict-audio" onclick="event.stopPropagation();speakWordMode('${v30Js(w)}','natural')">▶</button></div>`;}).join('')+'</div>';}
function v30DictJump(w){v29DictTerm=w;const q=document.getElementById('dict-q');if(q)q.value=w;v29DictTab='defs';v29RenderDictCurrent(true);}
function v30ExtractTranslation(x){try{const fl=(x.translations||[]).flat(Infinity).filter(Boolean);const pref=fl.find(t=>/^(eng|por|pt|en)$/i.test(t.lang||t.lang_tag||''))||fl[0];return pref?.text||'';}catch{return'';}}
function v30ExtractTatoebaAudio(x){const urls=[];function add(u){if(u&&typeof u==='string')urls.push(u.startsWith('//')?'https:'+u:u);}function scan(o){if(!o||typeof o!=='object')return;if(Array.isArray(o)){o.forEach(scan);return;}['url','download_url','audio_url','file','path','mp3'].forEach(k=>add(o[k]));if(o.id){add(`https://tatoeba.org/en/audio/download/${o.id}`);} }
scan(x.audios);scan(x.audio);if(x.id&&(x.has_audio||x.hasAudio||String(x.audio||'').length)){add(`https://audio.tatoeba.org/sentences/cmn/${x.id}.mp3`);add(`https://tatoeba.org/en/audio/download/${x.id}`);}return [...new Set(urls)];}
async function v29Tatoeba(q){const queries=[`https://tatoeba.org/en/api_v0/search?from=cmn&query=${encodeURIComponent(q)}&trans_to=eng&sort=relevance&orphans=no&has_audio=yes&word_count_max=28`,`https://tatoeba.org/en/api_v0/search?from=cmn&query=${encodeURIComponent(q)}&trans_to=eng&sort=relevance&orphans=no&word_count_max=28`];const found=[];for(const url of queries){try{const r=await fetch(url,{signal:AbortSignal.timeout(7500)});if(!r.ok)continue;const d=await r.json();for(const x of d.results||[]){const zh=x.text||'';if(!v30ContainsTerm(zh,q))continue;found.push({zh,tr:v30ExtractTranslation(x),audioUrls:v30ExtractTatoebaAudio(x),src:(x.has_audio||x.audios?.length)?'Tatoeba áudio':'Tatoeba'});} }catch{}}
const seen=new Set();return found.filter(s=>{if(seen.has(s.zh))return false;seen.add(s.zh);return true;}).slice(0,12);}
function v30CacheSentenceAudio(zh,urls){const key='s'+Math.random().toString(36).slice(2);window.V30_SENT_AUDIO=window.V30_SENT_AUDIO||{};window.V30_SENT_AUDIO[key]={zh,urls:urls||[]};return key;}
async function v29RenderDictSentences(q,out){let sents=await v29Tatoeba(q);const local=V30_LOCAL_SENTENCES.filter(s=>v30ContainsTerm(s.zh,q));for(const s of local){if(!sents.some(x=>x.zh===s.zh))sents.push({...s,audioUrls:[]});}sents=sents.filter(s=>v30ContainsTerm(s.zh,q));if(!sents.length){out.innerHTML='<div class="dict-empty">Não encontrei frases que contenham exatamente esse termo. Para palavra composta, agora o app não mostra frase aproximada sem a palavra pesquisada.</div>';return;}out.innerHTML='<div class="dict-results-lexi"><div class="dict-subtitle">▼ Frases com o termo pesquisado</div>'+sents.slice(0,14).map(s=>{const key=v30CacheSentenceAudio(s.zh,s.audioUrls||[]);return `<div class="sent-card"><div class="sent-top"><div><div class="sent-zh">${esc(s.zh)} <button class="lexi-audio" onclick="v30SpeakSentence('${key}')">▶</button></div><div class="sent-py">${esc(getWordPY(s.zh))}</div></div></div><div class="sent-tr">${esc(s.tr||'Tradução humana indisponível nesta fonte.')}</div><div class="sent-src">${esc(s.src||'Banco de frases')} • filtrado por presença real de “${esc(q)}”</div></div>`;}).join('')+'</div>';}

const V30_AUDIO_SOURCES=[
 {name:'Youdao dictvoice 1',url:w=>`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(w)}&type=1`},
 {name:'Youdao dictvoice 2',url:w=>`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(w)}&type=2`},
 {name:'Youdao fanyivoice zh',url:w=>`https://tts.youdao.com/fanyivoice?word=${encodeURIComponent(w)}&le=zh&keyfrom=speaker-target`},
 {name:'Youdao fanyivoice',url:w=>`https://tts.youdao.com/fanyivoice?word=${encodeURIComponent(w)}`}
];
playUrl=function(url){return new Promise((res,rej)=>{try{stopAudio();}catch{}const a=new Audio();curAudio=a;a.preload='auto';a.crossOrigin='anonymous';a.referrerPolicy='no-referrer';let done=false;const finish=(ok,err)=>{if(done)return;done=true;clearTimeout(t);if(ok)res();else rej(err||new Error('audio'));};const t=setTimeout(()=>{try{a.pause();}catch{}curAudio=null;finish(false,new Error('timeout'));},10500);a.onended=()=>{curAudio=null;finish(true);};a.onerror=()=>{curAudio=null;finish(false,new Error('audio'));};a.oncanplaythrough=()=>{};a.src=url;const p=a.play();if(p&&p.catch)p.catch(e=>{curAudio=null;finish(false,e);});});};
playNaturalDirect=async function(word){for(const src of V30_AUDIO_SOURCES){try{await playUrl(src.url(word));return true;}catch(e){}}return false;};
async function v30PlayUrls(urls){for(const u of urls||[]){try{await playUrl(u);return true;}catch{}}return false;}
playNaturalDb=async function(word,{discover=true}={}){if(await playNaturalDirect(word))return true;if(discover&&await playNaturalDiscovered(word))return true;return false;};
function v30AudioSegments(text){const parts=[];let run='';for(const ch of [...String(text||'')]){if(isCJK(ch)){run+=ch;continue;}if(run){parts.push(...segmentChineseRun(run));run='';}if(/[，,、；;：:。！？!?]/.test(ch))parts.push(ch);}if(run)parts.push(...segmentChineseRun(run));return parts.filter(Boolean);}
async function v30PlayTextNatural(text){const parts=v30AudioSegments(text);let ok=false;for(const p of parts){if(/[，,、；;：:]/.test(p)){await delay(95);continue;}if(/[。！？!?]/.test(p)){await delay(190);continue;}const got=await playNaturalDb(p,{discover:false})||([...p].length>1?await playCjkSequence([...p].filter(isCJK),28,{discover:false}):false);if(got)ok=true;await delay(42);}return ok;}
speakWordMode=async function(word,mode='natural'){stopAudio();setAudioBusy(mode,true);const cjk=[...String(word)].filter(isCJK);try{if(!cjk.length)return;let ok=false;if(mode==='natural'){ok=await playNaturalDb(word,{discover:true});if(!ok&&cjk.length>1)ok=await v30PlayTextNatural(word);if(!ok)ok=await playCjkSequence(cjk,28,{discover:false});}else{ok=await playCjkSequence(cjk,115,{discover:false});if(!ok)ok=await playNaturalDb(word,{discover:true});}if(!ok)toast('Áudio natural não encontrado nas rotas atuais');}finally{setAudioBusy(mode,false);}};
speakWord=function(word){return speakWordMode(word,'natural');};
window.v30SpeakSentence=async function(key){const data=(window.V30_SENT_AUDIO||{})[key];if(!data)return;setAudioBusy('natural',true);try{let ok=await v30PlayUrls(data.urls||[]);if(!ok)ok=await playNaturalDb(data.zh,{discover:true});if(!ok)ok=await v30PlayTextNatural(data.zh);if(!ok)toast('Áudio natural da frase não encontrado; fallback por palavras também falhou');}finally{setAudioBusy('natural',false);}};

function v30Boot(){try{const about=document.querySelector('#ss .ssub[style*="color:#8a8a8a"]');if(about)about.textContent='v3.0';const h=document.querySelector('#sx .dict-head h1');if(h)h.textContent='Dicionário';const ds=document.querySelector('.dict-search');if(ds&&!ds.querySelector('.dict-back-mini')){const b=document.createElement('button');b.className='dict-back-mini';b.textContent='‹';ds.insertBefore(b,ds.firstChild);}document.querySelectorAll('.dict-tab').forEach(btn=>{if(btn.dataset.dtab==='defs')btn.textContent='DICT';if(btn.dataset.dtab==='words')btn.textContent='WORDS';if(btn.dataset.dtab==='sents')btn.textContent='SENTS';});}catch{}}
window.v30DictJump=v30DictJump;
setTimeout(v30Boot,320);
})();



/* v3.1 HOTFIX: restaura o motor de áudio estável das versões 2.5/2.6.
   O bug das versões novas vinha do player reescrito com crossOrigin/referrerPolicy,
   que pode fazer endpoints de áudio antigos falharem no Android/WebView. */
(function(){
const HR31_AUDIO_SOURCES=[
  w=>`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(w)}&type=1`,
  w=>`https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=zh-CN&q=${encodeURIComponent(w)}&client=tw-ob`,
  w=>`https://tts.youdao.com/fanyivoice?word=${encodeURIComponent(w)}`,
  w=>`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(w)}&type=2`,
  w=>`https://tts.youdao.com/fanyivoice?word=${encodeURIComponent(w)}&le=zh`
];
function hr31StopAudio(){
  if(curAudio){try{curAudio.pause();}catch{} curAudio=null;}
  try{speechSynthesis?.cancel();}catch{}
}
function hr31SetBusy(mode,on){
  ['tip-audio','tip-natural','tip-slow','tone-natural','tone-slow'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('pl');});
  if(on){const ids=mode==='slow'?['tip-slow','tone-slow']:['tip-audio','tip-natural','tone-natural'];ids.forEach(id=>{const el=document.getElementById(id);if(el)el.classList.add('pl');});}
}
function hr31PlayUrl(url){
  return new Promise((res,rej)=>{
    const a=new Audio(url);
    curAudio=a;
    const t=setTimeout(()=>{try{a.pause();}catch{} curAudio=null;rej(new Error('to'));},7000);
    a.onended=()=>{clearTimeout(t);curAudio=null;res();};
    a.onerror=()=>{clearTimeout(t);curAudio=null;rej(new Error('audio'));};
    const p=a.play();
    if(p&&p.catch)p.catch(e=>{clearTimeout(t);curAudio=null;rej(e);});
  });
}
async function hr31PlayFromStableSources(text){
  for(const src of HR31_AUDIO_SOURCES){try{await hr31PlayUrl(src(text));return true;}catch(e){}}
  return false;
}
async function hr31PlayChars(chars,pauseMs){
  let ok=false;
  for(const ch of chars){
    if(!isCJK(ch))continue;
    if(await hr31PlayFromStableSources(ch))ok=true;
    await delay(pauseMs);
  }
  return ok;
}
function hr31Segments(text){
  const out=[];let run='';
  for(const ch of [...String(text||'')]){
    if(isCJK(ch)){run+=ch;continue;}
    if(run){try{out.push(...segmentChineseRun(run));}catch{out.push(run);}run='';}
    if(/[，,、；;：:。！？!?]/.test(ch))out.push(ch);
  }
  if(run){try{out.push(...segmentChineseRun(run));}catch{out.push(run);}}
  return out.filter(Boolean);
}
async function hr31PlayText(text){
  const parts=hr31Segments(text);let ok=false;
  for(const p of parts){
    if(/[，,、；;：:]/.test(p)){await delay(80);continue;}
    if(/[。！？!?]/.test(p)){await delay(170);continue;}
    const got=await hr31PlayFromStableSources(p)||([...p].some(isCJK)?await hr31PlayChars([...p].filter(isCJK),35):false);
    if(got)ok=true;
    await delay(36);
  }
  return ok;
}
playUrl=hr31PlayUrl;
playNaturalDirect=async function(word){return await hr31PlayFromStableSources(word);};
playNaturalDb=async function(word,{discover=true}={}){
  if(await hr31PlayFromStableSources(word))return true;
  if(discover&&typeof playNaturalDiscovered==='function'&&await playNaturalDiscovered(word))return true;
  return false;
};
playCjkSequence=async function(chars,pauseMs,{discover=false}={}){return await hr31PlayChars(chars,pauseMs);};
speakWordMode=async function(word,mode='natural'){
  hr31StopAudio();hr31SetBusy(mode,true);
  const cjk=[...String(word||'')].filter(isCJK);
  try{
    if(!cjk.length)return;
    let ok=false;
    if(mode==='slow'){
      ok=await hr31PlayChars(cjk,150);
      if(!ok)ok=await hr31PlayFromStableSources(word);
    }else{
      ok=await hr31PlayFromStableSources(word);
      if(!ok&&cjk.length>1)ok=await hr31PlayChars(cjk,38);
      if(!ok&&cjk.length===1)ok=await hr31PlayFromStableSources(cjk[0]);
    }
    if(!ok)toast('Não consegui reproduzir nas rotas de áudio desta conexão.');
  }finally{hr31SetBusy(mode,false);}
};
speakWord=function(word){return speakWordMode(word,'natural');};
window.v30SpeakSentence=async function(key){
  const data=(window.V30_SENT_AUDIO||{})[key];if(!data)return;
  hr31StopAudio();hr31SetBusy('natural',true);
  try{
    let ok=false;
    for(const u of data.urls||[]){try{await hr31PlayUrl(u);ok=true;break;}catch(e){}}
    if(!ok)ok=await hr31PlayFromStableSources(data.zh);
    if(!ok)ok=await hr31PlayText(data.zh);
    if(!ok)toast('Não consegui reproduzir o áudio da frase nas rotas atuais.');
  }finally{hr31SetBusy('natural',false);}
};
try{const about=document.querySelector('#ss .ssub[style*="color:#8a8a8a"]');if(about)about.textContent='v3.1';}catch{}
})();


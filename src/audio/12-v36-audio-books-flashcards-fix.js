
/* v3.8: restaura áudio robusto sem depender de /api/tts, corrige Livros, adiciona Analytics e Flashcards. */
(function(){
const HR36_STYLE=`
.book-actions{position:absolute;right:12px;top:12px;display:flex;gap:7px;z-index:6}.book-actions button,.card-actions button{width:32px;height:32px;border:1px solid rgba(255,255,255,.18);border-radius:50%;background:rgba(0,0,0,.56);color:#f0f0f0;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer}.book-actions button svg,.card-actions button svg{width:16px;height:16px;stroke:currentColor}.book-list .book-actions{position:static;grid-column:3;grid-row:1 / span 2;flex-direction:column;justify-content:center;align-items:center;height:100%;gap:6px}
.book-list .book-actions button{width:30px;height:30px}.card.has-actions{position:relative;padding-right:92px}.card-actions{position:absolute;right:12px;top:50%;transform:translateY(-50%);display:flex;gap:7px}.reader-ctrl{gap:8px;flex-wrap:wrap}.reader-ctrl .reader-next{border:1px solid rgba(var(--ac-rgb),.26);background:rgba(var(--ac-rgb),.08);color:var(--ac);border-radius:999px;padding:8px 11px;font-weight:800;font-size:12px}.analytics-modal .ms{max-width:min(620px,calc(100vw - 20px));background:linear-gradient(165deg,#1c1c1c,#121212)}.ana-title{font-size:13px;color:#aaa;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,.06)}.ana-bars{display:flex;flex-direction:column;gap:13px}.ana-row{display:grid;grid-template-columns:104px 1fr 40px;gap:10px;align-items:center}.ana-lbl{font-size:11.5px;color:#bbb;font-weight:700}.ana-bar{height:18px;background:linear-gradient(180deg,#1a1a1a,#252525);border-radius:999px;overflow:hidden;box-shadow:inset 0 1px 3px rgba(0,0,0,.55),inset 0 -1px 0 rgba(255,255,255,.03)}.ana-fill{height:100%;width:0;border-radius:999px;background:linear-gradient(90deg,var(--ac),#ffcf7a);box-shadow:0 0 10px rgba(var(--ac-rgb),.45),inset 0 1px 0 rgba(255,255,255,.35);transition:width .4s cubic-bezier(.22,.9,.3,1)}.ana-fill.beg{background:linear-gradient(90deg,#4f8158,#8fc99a);box-shadow:0 0 10px rgba(106,156,114,.4),inset 0 1px 0 rgba(255,255,255,.3)}.ana-fill.mid{background:linear-gradient(90deg,#a3782f,#e8b866);box-shadow:0 0 10px rgba(192,147,79,.4),inset 0 1px 0 rgba(255,255,255,.3)}.ana-fill.adv{background:linear-gradient(90deg,#8f3d5f,#d97ea8);box-shadow:0 0 10px rgba(180,86,125,.4),inset 0 1px 0 rgba(255,255,255,.3)}.ana-val{font-size:12.5px;color:#ddd;font-weight:800;text-align:right;font-variant-numeric:tabular-nums}.ana-list{margin-top:16px;border-top:1px solid rgba(255,255,255,.06);padding-top:12px;font-size:12.5px;color:#bbb;line-height:1.7}.flash-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:calc(var(--st) + 14px) 20px 10px}.flash-head h1{font-size:24px}.flash-tabs{display:flex;gap:8px;padding:0 16px 10px}.flash-tab{flex:1;border:1px solid #2d2d2d;background:#171717;color:#777;border-radius:12px;padding:10px;font-weight:850}.flash-tab.on{background:rgba(var(--ac-rgb),.12);border-color:rgba(var(--ac-rgb),.4);color:var(--ac)}.deck-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.deck-card{background:#1a1a1a;border:1px solid #2d2d2d;border-radius:16px;padding:14px;min-height:118px;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer}.deck-card.on{border-color:rgba(var(--ac-rgb),.55);box-shadow:0 0 0 1px rgba(var(--ac-rgb),.12) inset}.deck-name{font-weight:900;color:#fff}.deck-meta{font-size:12px;color:#888;margin-top:5px}.deck-actions{display:flex;gap:8px;margin-top:10px}.deck-actions button,.flash-small-btn{border:0;background:#292929;color:#ddd;border-radius:10px;padding:8px 10px;font-size:12px;font-weight:800}.study-card{background:#151515;border:1px solid #2d2d2d;border-radius:20px;padding:24px 18px;text-align:center;min-height:280px;display:flex;flex-direction:column;align-items:center;justify-content:center}.study-word{font-family:var(--rf);font-size:56px;color:#fff;line-height:1.08}.study-py{font-size:18px;color:var(--ac);margin-top:10px;font-weight:800}.study-def{font-size:15px;color:#ddd;line-height:1.55;margin-top:16px;white-space:pre-wrap}.study-grades{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px}.study-grades button{border:0;border-radius:12px;padding:11px 6px;font-weight:900}.g-again{background:#4b2020;color:#ffb3b3}.g-hard{background:#4b3c20;color:#ffe0a0}.g-good{background:#1f4528;color:#b8f5c1}.g-easy{background:#1f314a;color:#b7d9ff}.flash-word-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}.move-word-btn{border:1px solid #333;background:#242424;color:#aaa;border-radius:10px;padding:8px}.book-card .book-edit{display:none!important}.book-card .book-del{display:none!important}.hr36-noemoji{font-size:0}.hr36-noemoji svg{font-size:initial}.src-card2{position:relative}.src-char-count{display:inline-flex;border:1px solid rgba(var(--ac-rgb),.22);border-radius:999px;padding:2px 7px;color:#b99a65;font-size:11px;margin-left:6px}.src-cat{font-size:11px;color:#8c8170;text-transform:uppercase;letter-spacing:.7px;margin-top:4px}.tts-status-dot{display:none!important}@media(min-width:760px){.deck-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.study-card{max-width:620px;margin:0 auto}.study-grades{max-width:620px;margin-left:auto;margin-right:auto}}
`;
const st=document.createElement('style');st.textContent=HR36_STYLE;document.head.appendChild(st);
const SVG={trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>',edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',ana:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',play:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',next:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M13 5l7 7-7 7"/></svg>',plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',book:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>'};
function h36Stop(){if(curAudio){try{curAudio.pause();}catch{}curAudio=null;}try{speechSynthesis?.cancel();}catch{}}
function h36Busy(on){document.querySelectorAll('.lexi-audio,.dict-audio,[data-v34-speak],#tip-natural,#tone-pron,#read-play').forEach(el=>el&&el.classList.toggle('pl',!!on));}
function h36PlayUrl(url,timeout=9000){return new Promise((res,rej)=>{try{const a=new Audio(url);curAudio=a;const t=setTimeout(()=>{try{a.pause();}catch{}curAudio=null;rej(new Error('timeout'));},timeout);a.onended=()=>{clearTimeout(t);curAudio=null;res(true);};a.onerror=()=>{clearTimeout(t);curAudio=null;rej(new Error('audio'));};a.play().catch(e=>{clearTimeout(t);curAudio=null;rej(e);});}catch(e){rej(e);}});}
const toneMarks={'ā':['a',1],'á':['a',2],'ǎ':['a',3],'à':['a',4],'ē':['e',1],'é':['e',2],'ě':['e',3],'è':['e',4],'ī':['i',1],'í':['i',2],'ǐ':['i',3],'ì':['i',4],'ō':['o',1],'ó':['o',2],'ǒ':['o',3],'ò':['o',4],'ū':['u',1],'ú':['u',2],'ǔ':['u',3],'ù':['u',4],'ǖ':['v',1],'ǘ':['v',2],'ǚ':['v',3],'ǜ':['v',4],'ü':['v',5],'ń':['n',2],'ň':['n',3],'ǹ':['n',4],'ḿ':['m',2]};
function h36MarkedToNum(py){py=String(py||'').trim().toLowerCase();if(!py)return'';let tone='5',base='';for(const ch of [...py]){if(toneMarks[ch]){base+=toneMarks[ch][0];tone=String(toneMarks[ch][1]);}else if(/[1-5]$/.test(ch)){tone=ch;}else{base+=ch==='ü'?'v':ch;}}base=base.replace(/[^a-zv]/g,'');return base?base+tone:'';}
function h36PinyinNums(text){let arr=[];try{if(window.pinyinFn){const r=window.pinyinFn(text,{toneType:'num',type:'array'});if(Array.isArray(r))arr=r;else arr=String(r||'').split(/\s+/);}}catch{} if(!arr.length){try{arr=(getWordPY(text)||'').split(/\s+/).map(h36MarkedToNum);}catch{}} return arr.map(x=>/[1-5]$/.test(x)?x:h36MarkedToNum(x)).filter(Boolean);}
function h36AudioUrls(text){
  const raw=String(text||'').trim();
  const q=encodeURIComponent(raw);
  const isSentence=/[。！？!?，,；;]/.test(raw)||[...raw].filter(isCJK).length>3;
  const urls=[
    `https://fanyi.baidu.com/gettts?lan=zh&text=${q}&spd=5&source=web`,
    `https://dict.youdao.com/dictvoice?audio=${q}&type=1`,
    `https://dict.youdao.com/dictvoice?audio=${q}&type=2`,
    `https://tts.youdao.com/fanyivoice?word=${q}&le=zh&keyfrom=speaker-target`,
    `https://tts.youdao.com/fanyivoice?word=${q}&le=zh`,
    `https://tts.youdao.com/fanyivoice?word=${q}`,
    `https://fanyi.sogou.com/reventondc/synthesis?text=${q}&speed=1&lang=zh-CHS&from=translateweb&speaker=6`,
    `https://fanyi.qq.com/api/tts?text=${q}&lang=zh`
  ];
  if(!isSentence && [...raw].filter(isCJK).length<=3){
    h36PinyinNums(raw).forEach(p=>{
      urls.push(`https://resources.allsetlearning.com/pronwiki/resources/pinyin-audio/${p}.mp3`);
      urls.push(`https://resources.allsetlearning.com/pronwiki/resources/pinyin-audio/${p.replace('v','u')}.mp3`);
    });
  }
  return [...new Set(urls)];
}
async function h36TryDirect(text){for(const u of h36AudioUrls(text)){try{await h36PlayUrl(u,/[。！？!?，,；;]/.test(text)||String(text).length>8?14000:8500);return true;}catch{}}return false;}
function h36Seg(text){let out=[];let run='';for(const ch of [...String(text||'')]){if(isCJK(ch)){run+=ch;continue;}if(run){try{out.push(...segmentChineseRun(run));}catch{out.push(...run);}run='';}if(/[，,、；;：:。！？!?]/.test(ch))out.push(ch);}if(run){try{out.push(...segmentChineseRun(run));}catch{out.push(...run);}}return out.filter(Boolean);}
async function h36Speak(text,opts={}){h36Stop();h36Busy(true);text=String(text||'').trim();try{if(![...text].some(isCJK))return;let ok=false;if(text.length<=8)ok=await h36TryDirect(text);if(!ok && text.length>1){for(const part of h36Seg(text)){if(/[，,、；;：:]/.test(part)){await delay(75);continue;}if(/[。！？!?]/.test(part)){await delay(150);continue;}if(await h36TryDirect(part))ok=true;else{for(const ch of [...part].filter(isCJK)){if(await h36TryDirect(ch))ok=true;await delay(34);}}await delay(32);}}if(!ok){for(const ch of [...text].filter(isCJK)){if(await h36TryDirect(ch))ok=true;await delay(34);}}if(!ok)toast('Nenhuma rota de áudio respondeu agora.');}finally{h36Busy(false);}}
speakWordMode=function(word,mode='natural'){return h36Speak(word,{mode});};speakWord=function(word){return h36Speak(word);};window.v30SpeakSentence=function(key){const d=(window.V30_SENT_AUDIO||{})[key];return h36Speak((d&&d.zh)||key);};window.hr36Speak=h36Speak;
// Captura botões de áudio que ficaram presos a funções antigas.
document.addEventListener('click',function(e){const sp=e.target.closest('[data-v34-speak]');if(sp){e.preventDefault();e.stopPropagation();h36Speak(sp.getAttribute('data-v34-speak'));return;}const ba=e.target.closest('.lexi-audio,.dict-audio');if(ba){if(ba.dataset.sentPlay!=null||ba.dataset.wordIdx!=null||ba.dataset.exText!=null||ba.dataset.sentIdx!=null||ba.id==='dict-main-audio')return;const txt=ba.dataset.word||ba.dataset.zh||ba.getAttribute('aria-label')||defWord||'';if(txt){e.preventDefault();e.stopPropagation();h36Speak(txt);}}},true);

function h36BookKind(b){try{return v29Kind(b);}catch{return b.kind||((b.chapters&&b.chapters.length)?'book':'simple');}}
function h36Chapters(b){try{return v29GetChapters(b);}catch{return b.chapters||[];}}
function h36Progress(b){try{return Math.round(v29BookProgress(b)*100);}catch{return Math.round((b.progress||0)*100);}}
function h36IconBtn(cls,svg,title){return `<button class="${cls} hr36-noemoji" title="${esc(title)}" aria-label="${esc(title)}">${svg}</button>`;}
function h36AnalyzeText(text){const freq={beg:0,mid:0,adv:0,unk:0,total:0,top:new Map()};let toks=[];try{const runs=String(text||'').match(/[\u3400-\u9fff\uF900-\uFAFF]+/g)||[];for(const run of runs){toks.push(...segmentChineseRun(run));}if(!toks.length)throw new Error('no runs');}catch{toks=[...String(text||'')].filter(isCJK);}for(const w of toks){const lv=(typeof getWordLevel==='function'?getWordLevel(w):0)||0;freq.total++;if(lv<=2&&lv>0)freq.beg++;else if(lv<=4&&lv>0)freq.mid++;else if(lv<=6&&lv>0)freq.adv++;else freq.unk++;freq.top.set(w,(freq.top.get(w)||0)+1);}return freq;}
function h36ShowAnalytics(title,text){if(!document.getElementById('mo-analytics'))document.body.insertAdjacentHTML('beforeend',`<div class="mo analytics-modal" id="mo-analytics"><div class="ms"><div class="mbar"><div class="mhd"></div><button class="mx" data-v29-close aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div><div class="mtitle">Analytics</div><div class="mscroll" id="ana-body"></div></div></div>`);const a=h36AnalyzeText(text);const max=Math.max(1,a.beg,a.mid,a.adv,a.unk);const top=[...a.top.entries()].sort((x,y)=>y[1]-x[1]).slice(0,18).map(([w,n])=>`${esc(w)}×${n}`).join(' · ');document.getElementById('ana-body').innerHTML=`<div class="ana-title">${esc(title)} • ${a.total} tokens analisados</div><div class="ana-bars">${[['beg','HSK 1–2 / iniciante'],['mid','HSK 3–4 / intermediário'],['adv','HSK 5–6 / avançado'],['unk','Fora da base']].map(([k,l])=>`<div class="ana-row"><div class="ana-lbl">${l}</div><div class="ana-bar"><div class="ana-fill ${k}" style="width:${Math.round(a[k]/max*100)}%"></div></div><div class="ana-val">${a[k]}</div></div>`).join('')}</div><div class="ana-list"><b>Mais frequentes:</b><br>${top||'—'}</div>`;showModal('mo-analytics');}
window.showAnalyticsForBook=function(id){const b=books.find(x=>x.id===id);if(!b)return;const text=h36BookKind(b)==='book'?h36Chapters(b).map(c=>c.content||'').join('\n'):b.content||'';h36ShowAnalytics(b.title||'Conteúdo',text);};
const oldRenderLib36=renderLib;
function v39SetBookView(mode){
  if(mode!=='cover'&&mode!=='list')return;
  v29BookView=mode;
  localStorage.setItem('hbookView',mode);
  const vc=document.getElementById('view-cover'),vl=document.getElementById('view-list'),bw=document.getElementById('book-wrap');
  if(vc)vc.classList.toggle('on',mode==='cover');
  if(vl)vl.classList.toggle('on',mode==='list');
  if(bw)bw.className=mode==='cover'?'lib-grid':'simple-list book-list';
  requestAnimationFrame(()=>renderLib());
}
renderLib=function(){const bc=document.getElementById('bc');if(!bc)return;const q=(searchQ||'').toLowerCase();const mode=v29LibMode==='books'?'books':'simple';const base=books.filter(b=>mode==='books'?h36BookKind(b)==='book':h36BookKind(b)!=='book');const list=q?base.filter(b=>(b.title||'').toLowerCase().includes(q)||(b.source||'').toLowerCase().includes(q)||(b.synopsis||'').toLowerCase().includes(q)):base;document.getElementById('mode-simple')?.classList.toggle('on',mode==='simple');document.getElementById('mode-books')?.classList.toggle('on',mode==='books');document.getElementById('plus-simple')?.classList.toggle('on',mode==='simple');document.getElementById('plus-books')?.classList.toggle('on',mode==='books');if(mode==='simple'){bc.innerHTML=`<div class="lib-tools"><div class="lib-title">Leitura simples</div><button class="lib-chip" id="simple-import-chip">Importar</button></div><div class="simple-list" id="simple-list"></div>`;document.getElementById('simple-import-chip').onclick=()=>{v29ImportContext='simple';v29PrepImport('Adicionar leitura simples');showModal('mo-import');};const wrap=document.getElementById('simple-list');if(!list.length){wrap.innerHTML='<div class="emptyx"><b>Nenhuma leitura simples.</b><br>Toque em Importar ou adicione uma source.</div>';return;}list.forEach(b=>{const pct=Math.round((b.progress||0)*100);const el=document.createElement('div');el.className='card has-actions';el.innerHTML=`<div class="card-actions">${h36IconBtn('ana-btn',SVG.ana,'Analytics')}${h36IconBtn('del-btn',SVG.trash,'Excluir')}</div><div class="thumb">${SVG.book}</div><div class="bi"><div class="bt">${esc(b.title||'Sem título')}</div><div class="bs">${esc(b.source||'Leitura')}</div><div class="bm">${timeAgo(b.lastRead)}</div><div class="bpb"><div class="bpf" style="width:${pct}%"></div></div></div>`;el.querySelector('.del-btn').onclick=e=>{e.stopPropagation();confirmDelBook(b.id);};el.querySelector('.ana-btn').onclick=e=>{e.stopPropagation();h36ShowAnalytics(b.title||'Leitura',b.content||'');};el.onclick=e=>{if(e.target.closest('button'))return;openBook(b.id);};wrap.appendChild(el);});}else{bc.innerHTML=`<div class="lib-tools"><div class="lib-title">Livros</div><button class="lib-chip" id="book-new-chip">Novo livro</button><button class="lib-chip ${v29BookView==='cover'?'on':''}" id="view-cover">Capas</button><button class="lib-chip ${v29BookView==='list'?'on':''}" id="view-list">Lista</button></div><div class="${v29BookView==='cover'?'lib-grid':'simple-list book-list'}" id="book-wrap"></div>`;const bnc=document.getElementById('book-new-chip');if(bnc)bnc.onclick=()=>{try{v29OpenBookEditor();}catch(e){}};document.getElementById('view-cover').onclick=()=>v39SetBookView('cover');document.getElementById('view-list').onclick=()=>v39SetBookView('list');const wrap=document.getElementById('book-wrap');if(!list.length){wrap.innerHTML='<div class="emptyx"><b>Nenhum livro.</b><br>Toque em Novo livro ou adicione uma source de livro.</div>';return;}list.forEach(b=>{const ch=h36Chapters(b);const pct=h36Progress(b);const el=document.createElement('div');el.className='book-card';el.innerHTML=`<div class="book-actions">${h36IconBtn('book-ana',SVG.ana,'Analytics')}${h36IconBtn('book-edit2',SVG.edit,'Editar')}${h36IconBtn('book-del2',SVG.trash,'Excluir')}</div><div class="book-cover ${b.cover?'':'gen'}" style="${v29CoverStyle(b)}"></div><div><div class="book-name">${esc(b.title||'Sem título')}</div><div class="book-syn">${esc(b.synopsis||'Sem sinopse')}</div><div class="book-meta"><span>${ch.length} cap.</span><span>${pct}%</span></div></div>`;el.querySelector('.book-del2').onclick=e=>{e.stopPropagation();confirmDelBook(b.id);};el.querySelector('.book-edit2').onclick=e=>{e.stopPropagation();v29OpenBookEditor(b.id);};el.querySelector('.book-ana').onclick=e=>{e.stopPropagation();showAnalyticsForBook(b.id);};el.onclick=e=>{if(e.target.closest('button'))return;if(ch.length)openBook(b.id);else toast('Adicione pelo menos um capítulo');};addLP(el,()=>v29OpenChapterPicker(b.id));wrap.appendChild(el);});}};
document.addEventListener('click',e=>{if(e.target.closest('#mode-books')){v29LibMode='books';localStorage.setItem('hlibMode','books');renderLib();}if(e.target.closest('#mode-simple')){v29LibMode='simple';localStorage.setItem('hlibMode','simple');renderLib();}},true);
function h36EnsureFsStack(){
  const dock=document.getElementById('mini-dock');
  if(!dock)return null;
  let stack=document.getElementById('mini-dock-fs-stack');
  if(!stack){
    stack=document.createElement('div');
    stack.id='mini-dock-fs-stack';
    stack.style.cssText='display:flex;flex-direction:column;align-items:center;gap:6px';
    dock.appendChild(stack);
  }
  const fs=document.getElementById('reader-fs');
  if(fs&&fs.parentElement!==stack)stack.appendChild(fs);
  return stack;
}
function h36InstallNext(){
  const stack=h36EnsureFsStack();
  if(!stack)return;
  let b=document.getElementById('reader-next-chap');
  if(!b){
    b=document.createElement('button');
    b.id='reader-next-chap';
    b.className='mini-dock-btn mini-dock-mini hr36-noemoji';
    b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>Próximo';
    b.onclick=async()=>{
      if(!(curBook&&h36BookKind(curBook)==='book'))return;
      const idx=(curBook._readingChapterIndex||0)+1;
      const ch=h36Chapters(curBook);
      if(idx>=ch.length){toast('Livro concluído');return;}
      await v29OpenBookChapter(curBook.id,idx);
      h36InstallNext();
    };
    stack.insertBefore(b,stack.firstChild);
  }
  const has=curBook&&h36BookKind(curBook)==='book'&&((curBook._readingChapterIndex||0)+1<h36Chapters(curBook).length);
  b.style.display=has?'inline-flex':'none';
}
const oldOpenCh36=v29OpenBookChapter;v29OpenBookChapter=async function(id,idx){await oldOpenCh36(id,idx);h36InstallNext();};const oldSimple36=v29OpenSimpleReading;v29OpenSimpleReading=async function(id){await oldSimple36(id);h36InstallNext();};

const HR36_SOURCES=[
 {cat:'Leituras graduadas',type:'simple',level:2,title:'Mandarin Bean — textos graduados',chars:'variável',url:'https://mandarinbean.com/category/reading/',desc:'Índice externo com textos graduados; ao adicionar, o app tenta extrair a página.'},
 {cat:'Leituras graduadas',type:'simple',level:3,title:'Chinese Boost — reading practice',chars:'variável',url:'https://www.chineseboost.com/chinese-reading-practice/',desc:'Página pública com leituras e notas.'},
 {cat:'Leituras graduadas',type:'simple',level:3,title:'HSKReading — artigos por nível',chars:'variável',url:'https://hskreading.com/',desc:'Fonte online de leituras por nível HSK.'},
 {cat:'Novels / web',type:'simple',level:5,title:'Wikisource — 中文维基文库',chars:'grande',url:'https://zh.wikisource.org/wiki/Wikisource:%E9%A6%96%E9%A1%B5',desc:'Biblioteca pública de textos chineses; ideal para importar uma página específica.'},
 {cat:'Clássicos',type:'book',level:5,title:'三字经 — CText',chars:'~1.2k',url:'https://ctext.org/three-character-classic/zh',desc:'Clássico público. Adiciona por URL se a extração funcionar.',chapters:[{num:1,title:'三字经',url:'https://ctext.org/three-character-classic/zh'}]},
 {cat:'Clássicos',type:'book',level:6,title:'千字文 — Wikisource',chars:'~1k',url:'https://zh.wikisource.org/wiki/%E5%8D%83%E5%AD%97%E6%96%87',desc:'Texto clássico de mil caracteres.',chapters:[{num:1,title:'千字文',url:'https://zh.wikisource.org/wiki/%E5%8D%83%E5%AD%97%E6%96%87'}]},
 {cat:'Clássicos',type:'book',level:6,title:'论语 — CText',chars:'grande',url:'https://ctext.org/analects/zh',desc:'Livro clássico em capítulos.',chapters:[{num:1,title:'学而',url:'https://ctext.org/analects/xue-er/zh'},{num:2,title:'为政',url:'https://ctext.org/analects/wei-zheng/zh'}]},
 {cat:'Clássicos',type:'book',level:6,title:'道德经 — CText',chars:'~5k',url:'https://ctext.org/dao-de-jing/zh',desc:'Texto completo público em chinês clássico.',chapters:[{num:1,title:'第一章',url:'https://ctext.org/dao-de-jing/zh#n11600'},{num:2,title:'第二章',url:'https://ctext.org/dao-de-jing/zh#n11601'}]},
 {cat:'Uso moderno',type:'simple',level:4,title:'BBC 中文 — notícia curta',chars:'variável',url:'https://www.bbc.com/zhongwen/simp',desc:'Fonte jornalística moderna; use páginas específicas para melhor extração.'},
 {cat:'Uso moderno',type:'simple',level:5,title:'The Chairman’s Bao',chars:'variável',url:'https://www.thechairmansbao.com/',desc:'Fonte graduada externa; pode exigir acesso no site.'}
];
async function h36AddSource(i){const s=HR36_SOURCES[i]||V32_SOURCES[i];if(!s)return;showLoad('Importando source...');try{if(s.type==='book'){const chapters=[];for(const [idx,ch] of (s.chapters||[{num:1,title:s.title,url:s.url}]).entries()){let content=ch.content||'';if(!content&&ch.url)try{content=await fetchText(ch.url);}catch(e){content='';}chapters.push({id:v29NewId(),num:ch.num||idx+1,title:ch.title||('Capítulo '+(idx+1)),content:cleanRaw(content||`Fonte: ${ch.url||s.url}\n\nAbra o link da source e importe uma página específica se a extração automática falhar.`),progress:0,addedAt:Date.now(),sourceUrl:ch.url||s.url});}await dbPut(STB,{id:v29NewId(),kind:'book',title:s.title,source:s.url||'Source pública',cover:s.cover||'',synopsis:(s.desc||'').slice(0,100),chapters,lastRead:null,addedAt:Date.now(),lastChapterIndex:0});toast('Livro adicionado');}else{let content=s.content||'';if(!content&&s.url)content=await fetchText(s.url);await dbPut(STB,{id:v29NewId(),kind:'simple',title:s.title,source:s.url||'Source pública',content:cleanRaw(content),type:'source',progress:0,lastRead:null,addedAt:Date.now(),charsRead:0});toast('Leitura adicionada');}books=await dbAll(STB);renderLib();}catch(e){toast('Falha ao importar: '+(e.message||e));}finally{hideLoad();}}
renderDiscover=function(){const dc=document.getElementById('dc');if(!dc)return;const all=HR36_SOURCES;dc.innerHTML=`<div class="src-grid">${all.map((s,i)=>`<div class="src-card2"><div class="src-ico2" style="background:linear-gradient(135deg,#3a2a1a,#7b5b2a,#f5a623)">${esc((s.title||'?')[0])}</div><div><div class="src-title2">${esc(s.title)}</div><div class="src-meta2"><span class="src-level ${s.level<=2?'l12':s.level<=4?'l34':'l56'}">HSK ${s.level}</span>${s.type==='book'?'Livro':'Leitura simples'}<span class="src-char-count">${esc(s.chars||'—')} chars</span></div><div class="src-cat">${esc(s.cat||'source')}</div><div class="src-desc2">${esc(s.desc||'')}</div><div class="src-actions2"><button class="pri hr36-noemoji" data-add36="${i}">${SVG.plus} Adicionar</button>${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener">Abrir fonte</a>`:''}</div></div></div>`).join('')}</div>`;dc.querySelectorAll('[data-add36]').forEach(b=>b.onclick=()=>h36AddSource(+b.dataset.add36));};

function h36Decks(){try{return JSON.parse(localStorage.getItem('h36Decks')||'[]');}catch{return[];}}
function v40FreeStorageSpace(){
  try{
    const prefix='link-reader-cache:v6-clean:';
    const entries=[];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k&&k.startsWith(prefix)){
        let savedAt=0;
        try{savedAt=JSON.parse(localStorage.getItem(k)||'{}').savedAt||0;}catch{}
        entries.push({k,savedAt});
      }
    }
    entries.sort((a,b)=>a.savedAt-b.savedAt);
    // remove os mais antigos primeiro, até um terço deles (o suficiente pra abrir espaço
    // sem apagar todo o cache de textos importados de uma vez)
    const toRemove=Math.max(1,Math.ceil(entries.length/3));
    for(let i=0;i<toRemove&&i<entries.length;i++)localStorage.removeItem(entries[i].k);
    return toRemove>0;
  }catch{return false;}
}
function v40SafeLocalStorageSet(key,value){
  try{localStorage.setItem(key,value);return true;}
  catch(e){
    try{
      if(v40FreeStorageSpace()){
        localStorage.setItem(key,value);
        return true;
      }
    }catch{}
    try{toast('Armazenamento cheio — não foi possível salvar agora.');}catch{}
    return false;
  }
}
function h36SaveDecks(d){v40SafeLocalStorageSet('h36Decks',JSON.stringify(d));}
function h36EnsureDeck(){let d=h36Decks();if(!d.length){d=[{id:'default',name:'Padrão',createdAt:Date.now(),newLimit:20}];h36SaveDecks(d);}if(!localStorage.getItem('h36ActiveDeck'))v40SafeLocalStorageSet('h36ActiveDeck',d[0].id);return d;}
function h36ActiveDeck(){h36EnsureDeck();return localStorage.getItem('h36ActiveDeck')||'default';}
function h36TodayKey(){const d=new Date();const pad=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}
function h36EnsureDailyDeck(){
  const key='daily-'+h36TodayKey();
  const decks=h36Decks();
  if(!decks.find(d=>d.id===key)){decks.push({id:key,name:'Hoje — '+h36TodayKey(),createdAt:Date.now(),newLimit:20,daily:true});h36SaveDecks(decks);}
  return key;
}
const oldSaveWord36=saveWord;
saveWord=async function(word,py,result){
  const defText=result&&result.defs&&result.defs.length?result.defs[0].defs.slice(0,4).map((d,i)=>`${i+1}. ${d.text}`).join('\n'):'';
  const defsFlat=result&&result.defs?result.defs.flatMap(s=>(s.defs||[]).map(d=>d.text)):[];
  let segCount=1;
  try{const run=[...word].filter(isCJK).join('');if(run&&typeof segmentChineseRun==='function')segCount=segmentChineseRun(run).length||1;}catch{}
  const type=segCount>1?'phrase':'word';
  const lv=(typeof getWordLevel==='function'?getWordLevel(word):0)||99;
  const levelLabel=(lv>=1&&lv<=6)?('HSK '+lv):'Fora da base';
  const deckId=h36EnsureDailyDeck();
  const existing=words.find(w=>w.word===word&&(w.deckId||'default')===deckId);
  if(existing){
    existing.occurrences=(existing.occurrences||1)+1;
    existing.updatedAt=Date.now();
    if(!existing.definition&&defText){existing.definition=defText;existing.definitions=defsFlat;}
    await dbPut(STW,existing);
  }else{
    await dbPut(STW,{
      id:Date.now().toString(36)+Math.random().toString(36).slice(2),
      word,wordKey:word,pinyin:py,definition:defText,definitions:defsFlat,
      type,level:lv,levelLabel,
      source:curBook?curBook.title:'',savedAt:Date.now(),updatedAt:Date.now(),
      bookTitle:curBook?curBook.title:'',deckId,deckType:'daily',occurrences:1,
      reps:0,ease:2.5,due:Date.now()
    });
  }
  words=await dbAll(STW);
  try{if(document.getElementById('sw')&&document.getElementById('sw').classList.contains('active'))renderWords();}catch{}
  toast(`"${word}" salvo no baralho de hoje`);
};
function h36MoveWord(id,deckId){const w=words.find(x=>x.id===id);if(!w)return;w.deckId=deckId;dbPut(STW,w).then(loadWords);}
function h36RenderFlash(){h36EnsureDeck();const wc=document.getElementById('wc');if(!wc)return;const tab=(()=>{const t=localStorage.getItem('h36FlashTab');return(t==='decks'||t==='levels')?t:'decks';})();wc.innerHTML=`<div class="flash-tabs"><button class="flash-tab ${tab==='decks'?'on':''}" data-ftab="decks">Baralhos</button><button class="flash-tab ${tab==='levels'?'on':''}" data-ftab="levels">Baralhos por níveis</button></div><div id="flash-body"></div>`;wc.querySelectorAll('[data-ftab]').forEach(b=>b.onclick=()=>{localStorage.setItem('h36FlashTab',b.dataset.ftab);h36RenderFlash();});const body=document.getElementById('flash-body');
  if(tab==='decks'){
    const daily=h36DailyDecksFromWords();
    if(!daily.length){body.innerHTML='<div class="emptyx">Nenhuma palavra salva ainda.<br>Toque numa palavra no texto e salve — ela vira o baralho de hoje.</div>';return;}
    body.innerHTML=`<div class="deck-grid">${daily.map(d=>{const label=h36DateLabel(d.date);return `<div class="deck-card"><div><div class="deck-name">${esc(label)}${label!==d.date?' — '+d.date:''}</div><div class="deck-meta">${d.count} carta${d.count===1?'':'s'}</div></div><div class="deck-actions"><button data-study-daily="${esc(d.id)}">Estudar</button><button data-view-daily="${esc(d.id)}">Ver palavras</button></div></div>`;}).join('')}</div>`;
    body.querySelectorAll('[data-study-daily]').forEach(b=>b.onclick=()=>h36StudyDeck(b.dataset.studyDaily));
    body.querySelectorAll('[data-view-daily]').forEach(b=>b.onclick=()=>h36ViewDeckWords(b.dataset.viewDaily));
  }else{
    const order=[1,2,3,4,5,6,99,'phrase'];
    const labels={1:'HSK 1',2:'HSK 2',3:'HSK 3',4:'HSK 4',5:'HSK 5',6:'HSK 6',99:'Fora da base',phrase:'Frases'};
    const counts=order.map(k=>h36WordsByLevelDeduped(k).length);
    body.innerHTML=`<div class="deck-grid">${order.map((k,i)=>`<div class="deck-card"><div><div class="deck-name">${labels[k]}</div><div class="deck-meta">${counts[i]} palavra${counts[i]===1?'':'s'}</div></div><div class="deck-actions"><button data-study-level="${k}" ${counts[i]?'':'disabled'}>Estudar</button><button data-view-level="${k}" ${counts[i]?'':'disabled'}>Ver palavras</button></div></div>`).join('')}</div>`;
    body.querySelectorAll('[data-study-level]').forEach(b=>b.onclick=()=>{if(!b.disabled)h36StudyLevel(b.dataset.studyLevel);});
    body.querySelectorAll('[data-view-level]').forEach(b=>b.onclick=()=>{if(!b.disabled)h36ViewLevelWords(b.dataset.viewLevel);});
  }
}
function h36RunStudySession(allCards,exitFn){
  const body=document.getElementById('flash-body');
  if(!allCards.length){body.innerHTML='<div class="emptyx">Este baralho ainda não tem cartas.</div><button class="plain-btn" id="exit-study" style="margin-top:12px">Sair</button>';document.getElementById('exit-study').onclick=()=>{try{if(typeof v43StopMusic==='function')v43StopMusic();}catch{}exitFn();};return;}
  const now=Date.now();
  const shuffle=arr=>arr.map(v=>[Math.random(),v]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
  // Só entram na fila cartas realmente "devidas": nunca estudadas (sem due) ou
  // cuja data de revisão já passou. Isso é o que faltava — antes o baralho
  // reciclava tudo sempre, sem noção de "já revisei isso hoje".
  let queue=shuffle(allCards.filter(c=>!c.due||c.due<=now));
  // Baralhos grandes (100+ cartas) liberam algumas cartas extras mesmo antes
  // do horário, misturadas com as já devidas, pra sempre ter o que estudar.
  if(allCards.length>100){
    const notDue=shuffle(allCards.filter(c=>c.due&&c.due>now));
    const extra=notDue.slice(0,Math.max(0,20-queue.length));
    queue=shuffle([...queue,...extra]);
  }
  let i=0,show=false;
  if(!queue.length){
    body.innerHTML='<div class="study-card"><div class="deck-meta" style="font-size:16px;text-align:center">Nenhuma carta pra revisar agora.<br>Volte mais tarde!</div></div><button class="plain-btn" id="study-anyway" style="margin-top:12px">Estudar mesmo assim</button><button class="plain-btn" id="exit-study" style="margin-top:8px">Sair</button>';
    document.getElementById('exit-study').onclick=()=>{try{if(typeof v43StopMusic==='function')v43StopMusic();}catch{}exitFn();};
    document.getElementById('study-anyway').onclick=()=>{queue=shuffle(allCards);i=0;show=false;draw();};
    return;
  }
  function draw(){
    if(i>=queue.length){
      body.innerHTML=`<div class="study-card v42-celebrate"><div class="v42-bamboo-field">${[0,1,2,3,4].map(v42BambooSvg).join('')}</div><div class="v42-celebrate-msg"><div class="deck-meta v42-gold" style="font-size:17px">Você terminou a revisão de hoje!</div></div></div><button class="plain-btn" id="exit-study" style="margin-top:12px">Sair</button><div id="v43-mini-player-slot"></div>`;
      try{
        const{trackId,track}=v43PlayCelebrationTrack();
        const slot=document.getElementById('v43-mini-player-slot');
        if(slot){
          slot.innerHTML=`<div class="v43-mini-player" id="v43-mini-player"><img class="v43-mini-cover" src="${V43_COVER}"><div class="v43-mini-info"><div class="v43-mini-title">${esc(track.num)} · ${esc(track.title)}</div><div class="v43-mini-progress"><div class="v43-mini-progress-fill" id="v43-mini-fill"></div></div><div class="v43-mini-time" id="v43-mini-time">0:00 / 0:30</div></div></div>`;
          document.getElementById('v43-mini-player').onclick=()=>{
            v43CelebrationMode=false;
            if(v43CelebEndTimer){clearTimeout(v43CelebEndTimer);v43CelebEndTimer=null;}
            showModal('mo-music');
            v43RenderTrackList('');
            v43ShowPlayerView(trackId);
          };
        }
      }catch{}
      document.getElementById('exit-study').onclick=()=>{try{if(typeof v43StopMusic==='function')v43StopMusic();}catch{}exitFn();};
      return;
    }
    const c=queue[i];
    const isSentence=c.type==='sentence';
    const cardPy=c.pinyin||(isSentence&&typeof getWordPY==='function'?getWordPY(c.word):'');
    const cardDef=isSentence?(c.translation||'Sem tradução'):(c.definition||'Sem definição');
    const wordHtml=isSentence&&c.originWord&&typeof v41RenderSentenceWithHighlight==='function'?v41RenderSentenceWithHighlight(c.word,c.originWord):esc(c.word);
    body.innerHTML=`<div class="study-card"><div class="study-word">${wordHtml}</div>${show?`<div class="study-py">${esc(cardPy)}</div><div class="study-def">${esc(cardDef)}</div>`:'<div class="deck-meta">Toque para revelar</div>'}</div>${show?'<div class="study-grades"><button class="g-again" data-g="again">Again</button><button class="g-hard" data-g="hard">Hard</button><button class="g-good" data-g="good">Good</button><button class="g-easy" data-g="easy">Easy</button></div>':'<button class="plain-btn" id="reveal-card">Revelar</button>'}<button class="plain-btn" id="exit-study" style="margin-top:8px">Sair</button>`;
    document.getElementById('exit-study').onclick=()=>{try{if(typeof v43StopMusic==='function')v43StopMusic();}catch{}exitFn();};
    const rev=document.getElementById('reveal-card');
    if(rev)rev.onclick=()=>{show=true;draw();};
    body.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{
      const grade=b.dataset.g;
      try{window.hzStat&&window.hzStat.bump('wRev');}catch(e){}
      const days=grade==='again'?0.02:grade==='hard'?1:grade==='good'?3:7;
      c.reps=(c.reps||0)+1;
      c.due=Date.now()+days*86400000;
      dbPut(STW,c);
      i++;show=false;draw();
    });
  }
  draw();
}
window.h36RunStudySession=h36RunStudySession;
function h36StudyDeck(deckId){const cards=words.filter(w=>(w.deckId||'default')===deckId).sort((a,b)=>(a.due||0)-(b.due||0));h36RunStudySession(cards,h36RenderFlash);}
function h36LevelKeyOf(w){return w.type==='phrase'?'phrase':((w.level>=1&&w.level<=6)?w.level:99);}
function h36WordsByLevelDeduped(levelKey){const seen=new Set();const out=[];for(const w of words){if(w.mergedInto||w.type==='sentence')continue;if(h36LevelKeyOf(w)!==levelKey)continue;const key=w.wordKey||w.word;if(seen.has(key))continue;seen.add(key);out.push(w);}return out;}
function h36StudyLevel(levelKey){const cards=h36WordsByLevelDeduped(levelKey==='phrase'?'phrase':parseInt(levelKey)).sort((a,b)=>(a.due||0)-(b.due||0));h36RunStudySession(cards,h36RenderFlash);}
function h36ViewWordsList(list,emptyMsg){const body=document.getElementById('flash-body');if(!list.length){body.innerHTML=`<button class="plain-btn" id="back-to-decks">← Voltar</button><div class="emptyx">${esc(emptyMsg||'Nenhuma palavra aqui ainda.')}</div>`;document.getElementById('back-to-decks').onclick=h36RenderFlash;return;}
  body.innerHTML=`<button class="plain-btn" id="back-to-decks">← Voltar</button>`+list.map(w=>`<div class="wcard"><div class="flash-word-row"><div><div class="ww">${esc(w.word)}</div><div class="wpy">${esc(w.pinyin||'')}</div></div></div><div class="wdf">${esc(w.definition||'Sem definição')}</div><div><span class="wtag">${esc(w.levelLabel||(w.type==='phrase'?'Frase':'Palavra'))}</span>${w.occurrences>1?`<span class="wtag" style="margin-left:6px">${w.occurrences}×</span>`:''}</div></div>`).join('');
  document.getElementById('back-to-decks').onclick=h36RenderFlash;
}
function h36ViewDeckWords(deckId){h36ViewWordsList(words.filter(w=>(w.deckId||'default')===deckId).sort((a,b)=>b.savedAt-a.savedAt));}
function h36ViewLevelWords(levelKey){h36ViewWordsList(h36WordsByLevelDeduped(levelKey==='phrase'?'phrase':parseInt(levelKey)));}
function h36DailyDecksFromWords(){const map=new Map();for(const w of words){const id=w.deckId||'default';if(!id.startsWith('daily-'))continue;if(!map.has(id))map.set(id,{id,date:id.slice(6),count:0});map.get(id).count++;}return[...map.values()].sort((a,b)=>b.date.localeCompare(a.date));}
function h36DateLabel(dateStr){const today=h36TodayKey();const y=new Date();y.setDate(y.getDate()-1);const pad=n=>String(n).padStart(2,'0');const yesterday=`${y.getFullYear()}-${pad(y.getMonth()+1)}-${pad(y.getDate())}`;if(dateStr===today)return'Hoje';if(dateStr===yesterday)return'Ontem';return dateStr;}
renderWords=function(){loadWordsOnce=false;h36RenderFlash();};
function h36InstallFlashHead(){const sw=document.getElementById('sw');if(sw&&!sw.querySelector('.flash-head')){const wh=sw.querySelector('.wh');if(wh)wh.outerHTML=`<div class="flash-head"><h1>Flashcards</h1><button class="ib" id="bwclear" title="Limpar palavras">${SVG.trash}</button></div>`;const b=document.getElementById('bwclear');if(b)b.onclick=()=>{if(confirm('Limpar todas as palavras salvas?')){dbClr(STW).then(loadWords);}};}}
// boot
setTimeout(()=>{try{h36EnsureDeck();h36InstallFlashHead();renderDiscover();renderLib();loadWords();h36InstallNext();const about=document.querySelector('#ss .ssub[style*="color:#8a8a8a"]');if(about)about.textContent='v3.8';}catch(e){console.warn('v3.8 boot',e);}},900);
})();

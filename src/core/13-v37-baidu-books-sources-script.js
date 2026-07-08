
/* v3.8: Baidu gettts prioritized, robust library mode buttons, smarter source import/page splitting, richer exact sentence search. */
(function(){
const V37_VERSION='v3.8';
const V37_BAIDU_TTS=text=>`https://fanyi.baidu.com/gettts?lan=zh&text=${encodeURIComponent(String(text||'').trim())}&spd=5&source=web`;
function v37Svg(name){
 const icons={
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  book:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  ana:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  sound:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>',
  link:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
 };
 return icons[name]||icons.plus;
}
function v37InstallCss(){
 if(document.getElementById('v37-css'))return;
 document.head.insertAdjacentHTML('beforeend',`<style id="v37-css">
 .mode-row{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:8px!important}.mode-btn,.mode-plus{touch-action:manipulation}.mode-btn.on,.mode-plus.on{border-color:rgba(var(--ac-rgb),.52)!important;color:var(--ac)!important;background:rgba(var(--ac-rgb),.10)!important}.mode-plus svg{width:18px;height:18px}.book-actions,.card-actions{align-items:center!important}.book-actions button,.card-actions button{font-size:0!important}.book-actions svg,.card-actions svg{width:16px!important;height:16px!important}.src-grid{gap:12px}.src-card2{display:grid!important;grid-template-columns:54px 1fr!important;align-items:start!important}.src-ico2{width:48px!important;height:60px!important;border-radius:14px!important;display:flex;align-items:center;justify-content:center;color:#fff;font-family:var(--rf);font-size:24px;font-weight:800}.src-card2.long-src{border-color:rgba(var(--ac-rgb),.25)!important}.src-badges{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}.src-badge{border:1px solid rgba(var(--ac-rgb),.24);background:rgba(var(--ac-rgb),.06);color:#cda76b;border-radius:999px;padding:2px 7px;font-size:10.5px;font-weight:800}.src-actions2 button svg,.src-actions2 a svg{width:14px;height:14px}.sent-card.v37{border-color:rgba(var(--ac-rgb),.15)!important}.sent-src b{color:var(--ac)}.dict-empty small{color:#8b7355}.reader-next{display:inline-flex;align-items:center;gap:5px}.reader-next svg{width:16px;height:16px}.v37-audio-note{font-size:11px;color:#8c7b63;margin-top:6px}
 </style>`);
}
function v37SetMode(mode){
 try{showScreen('sl');}catch{}
 window.v29LibMode=mode==='books'?'books':'simple';
 try{localStorage.setItem('hlibMode',window.v29LibMode);}catch{}
 try{renderLib();}catch(e){console.warn('renderLib v37',e);}
 setTimeout(()=>{try{renderLib();}catch{}},50);
}
function v37InstallModeButtons(){
 const pairs=[['mode-simple','simple'],['mode-books','books']];
 pairs.forEach(([id,mode])=>{const el=document.getElementById(id);if(el&&!el._v37){el._v37=true;el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();v37SetMode(mode);},true);}});
 const ps=document.getElementById('plus-simple');if(ps&&!ps._v37){ps._v37=true;ps.innerHTML=v37Svg('plus');ps.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();v37SetMode('simple');try{window.v29ImportContext='simple';v29PrepImport('Adicionar leitura simples');showModal('mo-import');}catch{}},true);} 
 const pb=document.getElementById('plus-books');if(pb&&!pb._v37){pb._v37=true;pb.innerHTML=v37Svg('plus');pb.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();v37SetMode('books');try{v29OpenBookEditor();}catch{}},true);} 
}
document.addEventListener('click',e=>{const ms=e.target.closest('#mode-simple'), mb=e.target.closest('#mode-books'), ps=e.target.closest('#plus-simple'), pb=e.target.closest('#plus-books');if(ms){e.preventDefault();e.stopPropagation();v37SetMode('simple');}if(mb){e.preventDefault();e.stopPropagation();v37SetMode('books');}if(ps){e.preventDefault();e.stopPropagation();v37SetMode('simple');try{window.v29ImportContext='simple';v29PrepImport('Adicionar leitura simples');showModal('mo-import');}catch{}}if(pb){e.preventDefault();e.stopPropagation();v37SetMode('books');try{v29OpenBookEditor();}catch{}}},true);

function v37PageChars(){
 const fs=parseInt(getComputedStyle(document.documentElement).getPropertyValue('--fs'))||38;
 const vw=Math.min(window.innerWidth||390, 900)-36;
 const vh=Math.max(420,(window.innerHeight||720)-165);
 const charsPerLine=Math.max(7,Math.floor(vw/(fs*.92)));
 const lines=Math.max(5,Math.floor(vh/(fs*1.55)));
 return Math.max(170,Math.floor(charsPerLine*lines*1.18));
}
function v37CjkLen(t){return ([...String(t||'')].filter(isCJK).length);}
function v37SplitText(text,baseTitle='Página'){
 text=cleanRaw(String(text||'')).replace(/\n{3,}/g,'\n\n');
 const limit=v37PageChars();
 if(v37CjkLen(text)<=limit*1.18)return [{num:1,title:baseTitle,content:text}];
 const units=[];let buf='';
 for(const ch of [...text]){buf+=ch;if(/[。！？!?]\s*$/.test(buf)||buf.length>=limit*.55&&/[，,；;：:\n]/.test(ch)){units.push(buf);buf='';}}
 if(buf)units.push(buf);
 const pages=[];let cur='',n=1;
 for(const u of units){if(v37CjkLen(cur+u)>limit && cur.trim()){pages.push({num:n,title:`${baseTitle} ${n}`,content:cur.trim()});n++;cur='';}cur+=u;}
 if(cur.trim())pages.push({num:n,title:`${baseTitle} ${n}`,content:cur.trim()});
 return pages.length?pages:[{num:1,title:baseTitle,content:text}];
}
async function v37Fetch(url){return await fetchText(url);}
const V37_SOURCES=[
 {cat:'Leituras graduadas',type:'simple',level:1,title:'故事365 — histórias infantis',chars:'variável',url:'https://www.gushi365.com/',desc:'Site chinês nativo (mainland) de histórias infantis, mandarim simplificado, frases curtas — ótimo para nível iniciante.'},
 {cat:'Leituras graduadas',type:'simple',level:1,title:'故事365 — histórias curtas',chars:'variável',url:'https://www.gushi365.com/xiaogushi/',desc:'Seção específica de histórias curtas do 故事365 — página com texto corrido, sem listagem de links apenas.'},
 {cat:'Leituras graduadas',type:'simple',level:1,title:'七故事网 — contos e fábulas',chars:'variável',url:'https://www.qigushi.com/',desc:'Site 100% chinês (mainland), contos infantis/fábulas/ditados em mandarim simplificado — vocabulário básico.'},
 {cat:'Uso moderno',type:'simple',level:5,title:'人民网 — notícias',chars:'variável',url:'https://www.people.com.cn/',desc:'Portal de notícias oficial da China continental, 100% mandarim simplificado; importe a URL de um artigo específico.'},
 {cat:'Uso moderno',type:'simple',level:5,title:'新华网 — notícias',chars:'variável',url:'https://www.xinhuanet.com/',desc:'Agência de notícias estatal chinesa (mainland); conteúdo denso e 100% em mandarim simplificado.'}
];
window.V37_SOURCES=V37_SOURCES;
async function v37AddSource(i){
 const s=V37_SOURCES[i];if(!s)return;
 showLoad('Importando source...');
 try{
   const chapters=[];
   const rawCh=s.chapters||[{num:1,title:s.title,url:s.url,content:s.content||''}];
   for(const [idx,ch] of rawCh.entries()){
     let content=ch.content||'';
     if(!content && ch.url){try{content=await v37Fetch(ch.url);}catch(e){content='';}}
     content=cleanRaw(content||`Fonte: ${ch.url||s.url}\n\nA extração automática não conseguiu capturar o texto completo. Abra a fonte e importe a página específica pelo modo URL.`);
     const pages=v37SplitText(content,ch.title||s.title||'Página');
     pages.forEach((p,j)=>chapters.push({id:v29NewId(),num:chapters.length+1,title:pages.length>1?p.title:(ch.title||s.title||'Página'),content:p.content,progress:0,addedAt:Date.now(),sourceUrl:ch.url||s.url}));
   }
   const combined=chapters.map(c=>c.content).join('\n\n');
   const onePage=chapters.length<=1 && v37CjkLen(combined)<=v37PageChars()*1.18;
   if(s.type!=='book' || onePage){
     await dbPut(STB,{id:v29NewId(),kind:'simple',title:s.title,source:s.url||'Source pública',content:combined,type:'source',progress:0,lastRead:null,addedAt:Date.now(),charsRead:0});
     toast(onePage&&s.type==='book'?'Conteúdo curto salvo em Leitura simples':'Leitura adicionada');
     v37SetMode('simple');
   }else{
     await dbPut(STB,{id:v29NewId(),kind:'book',title:s.title,source:s.url||'Source pública',cover:s.cover||'',synopsis:(s.desc||'').slice(0,100),chapters,lastRead:null,addedAt:Date.now(),lastChapterIndex:0});
     toast(`Livro adicionado com ${chapters.length} páginas`);
     v37SetMode('books');
   }
   books=await dbAll(STB);renderLib();
 }catch(e){toast('Falha ao importar: '+(e.message||e));}
 finally{hideLoad();}
}
renderDiscover=function(){
 const dc=document.getElementById('dc');if(!dc)return;
 const cats=[...new Set(V37_SOURCES.map(s=>s.cat))];
 dc.innerHTML=cats.map(cat=>`<div class="src-section"><div class="sgt">${esc(cat)}</div><div class="src-grid">${V37_SOURCES.map((s,i)=>({s,i})).filter(x=>x.s.cat===cat).map(({s,i})=>`<div class="src-card2 ${s.type==='book'?'long-src':''}"><div class="src-ico2" style="background:linear-gradient(135deg,#26221d,rgba(var(--ac-rgb),.5),var(--ac))">${esc((s.title||'?')[0])}</div><div><div class="src-title2">${esc(s.title)}</div><div class="src-badges"><span class="src-badge">HSK ${s.level}</span><span class="src-badge">${s.type==='book'?'Livro/páginas':'Leitura simples'}</span><span class="src-badge">${esc(s.chars||'—')} chars</span></div><div class="src-desc2">${esc(s.desc||'')}</div><div class="src-actions2"><button class="pri hr36-noemoji" data-v37-add="${i}">${v37Svg('plus')}Adicionar</button>${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener">${v37Svg('link')}Abrir fonte</a>`:''}</div></div></div>`).join('')}</div></div>`).join('');
 dc.querySelectorAll('[data-v37-add]').forEach(b=>b.onclick=()=>v37AddSource(+b.dataset.v37Add));
};

function v37Contains(zh,q){const needle=[...String(q||'').trim()].filter(isCJK).join('');if(!needle)return false;return String(zh||'').includes(needle);}
const V37_LOCAL_SENTENCES=[]/*v4.8: banco local de exemplo removido (nao usado mais - app e online-first)*/;
async function v37Tatoeba(q){
 const found=[];try{const n=[...String(q||'')].filter(isCJK).join('');const url=`https://tatoeba.org/en/api_v0/search?from=cmn&query=${encodeURIComponent(n)}&trans_to=eng&sort=relevance&orphans=no&word_count_max=32`;const r=await fetch(url,{signal:AbortSignal.timeout(7500)});if(r.ok){const d=await r.json();for(const x of d.results||[]){const zh=x.text||'';if(!v37Contains(zh,n))continue;let en='';try{en=(x.translations||[]).flat().find(t=>t&&t.lang==='eng')?.text||(x.translations||[]).flat()[0]?.text||'';}catch{}found.push({zh,py:getWordPY(zh),en:en||'',pt:'',src:'Tatoeba'});}}}catch{}
 return found;
}
async function v37Jukuu(q){
 const n=[...String(q||'')].filter(isCJK).join('');if(!n)return[];
 const out=[];const urls=[`https://r.jina.ai/http://www.jukuu.com/search.php?q=${encodeURIComponent(n)}`,`https://r.jina.ai/http://dict.youdao.com/example/blng/eng/${encodeURIComponent(n)}/`];
 for(const url of urls){try{const r=await fetch(url,{signal:AbortSignal.timeout(7500)});if(!r.ok)continue;const txt=await r.text();const lines=txt.split(/\n+/).map(x=>x.trim()).filter(Boolean);for(let i=0;i<lines.length;i++){const zh=(lines[i].match(/[\u3400-\u9fff][\u3400-\u9fff，。！？、；：“”《》（）\s]{3,80}/)||[])[0];if(zh&&v37Contains(zh,n)&&!out.some(s=>s.zh===zh)){const en=(lines[i+1]||'').replace(/[#*_`>]/g,'').trim();out.push({zh:zh.replace(/\s+/g,''),py:getWordPY(zh),en:/[a-zA-Z]/.test(en)?en:'',pt:'',src:url.includes('jukuu')?'Jukuu via reader':'Youdao examples via reader'});if(out.length>=8)return out;}}}catch{}}
 return out;
}
function v37TransButton(en){return (typeof v34TransButton==='function')?v34TransButton(en):esc(en||'');}
function v37AudioButton(text){return `<button class="dict-audio v34-svg-only" data-v34-speak="${esc(text||'')}" title="Pronúncia">${v37Svg('sound')}</button>`;}
v29RenderDictSentences=async function(q,out){
 if(!out)return;const n=[...String(q||'').trim()].filter(isCJK).join('');out.innerHTML='<div class="dict-empty"><div class="spin sm"></div><small>Buscando frases exatas…</small></div>';
 let sents=[];try{if(Array.isArray(V34_SENTENCES))sents=sents.concat(V34_SENTENCES.filter(s=>v37Contains(s.zh,n)));}catch{}
 sents=sents.concat(V37_LOCAL_SENTENCES.filter(s=>v37Contains(s.zh,n)));
 const ext=[...(await v37Tatoeba(n)),...(await v37Jukuu(n))];
 for(const s of ext){if(v37Contains(s.zh,n)&&!sents.some(x=>x.zh===s.zh))sents.push(s);}
 sents=sents.filter(s=>v37Contains(s.zh,n));
 if(!sents.length){out.innerHTML='<div class="dict-empty">Não encontrei frases que contenham exatamente esse termo. O app não mostra frases aproximadas sem a palavra pesquisada.</div>';return;}
 out.innerHTML='<div class="dict-results-lexi"><div class="dict-subtitle">Frases que contêm “'+esc(n)+'”</div>'+sents.slice(0,18).map(s=>`<div class="sent-card v37"><div class="sent-top"><div><div class="sent-zh">${esc(s.zh)}</div><div class="sent-py">${esc(s.py||getWordPY(s.zh))}</div></div>${v37AudioButton(s.zh)}</div><div class="sent-tr">${s.pt?esc(s.pt):(s.en?v37TransButton(s.en):'Tradução humana indisponível nesta fonte.')}</div><div class="sent-src"><b>${esc(s.src||'Banco de frases')}</b> • contém “${esc(n)}”</div></div>`).join('')+'</div>';
 try{v34BindAudio(out);v34BindAuto(out);}catch{}
};

// Reinstala o botão Próximo e garante que abrir livro vá ao último ponto, enquanto segurar mostra capítulos.
if(typeof openBook==='function'){
 const oldOpenBook37=openBook;
 openBook=function(id){const b=(books||[]).find(x=>x.id===id);if(!b)return oldOpenBook37(id);const kind=(typeof h36BookKind==='function'?h36BookKind(b):(b.kind||''));if(kind==='book'){const ch=(typeof h36Chapters==='function'?h36Chapters(b):(b.chapters||[]));if(ch.length){return v29OpenBookChapter(id,Math.max(0,Math.min(b.lastChapterIndex||0,ch.length-1)));}}return oldOpenBook37(id);};
}
function v37Boot(){v37InstallCss();v37InstallModeButtons();try{renderDiscover();renderLib();}catch{}const about=document.querySelector('#ss .ssub[style*="color:#8a8a8a"]');if(about)about.textContent=V37_VERSION;}
setTimeout(v37Boot,1200);setTimeout(v37Boot,2300);window.addEventListener('resize',()=>{try{renderLib();}catch{}},{passive:true});
})();

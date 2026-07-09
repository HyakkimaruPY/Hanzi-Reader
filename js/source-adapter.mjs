/* Sources locais: manifesto JSON + filtros + adaptador para leitor existente.
   Fix desta rodada:
   - Não remove mais Importar por URL.
   - Mantém Discover sempre usando sources locais, bloqueando UIs antigas de sources online.
   - Garante o botão Importar em Livros mesmo após re-renderização.
   - Salva leituras/livros locais usando o banco IndexedDB diretamente como fallback.
*/
(function(){
'use strict';

const INDEX_URL = 'source/index.json';
const DB_NAME = 'hanzi_r2';
const DB_VERSION = 3;
const STORE_BOOKS = 'books';
const STORE_WORDS = 'words';
const PROG_KEY = 'hsrc.progress.';
const OVR_KEY = 'hsrc.override.';
let items = [];
let loaded = false;
let filters = { hsk:null, genre:null, type:null };
let _showScreenPatched = false;
let _renderLibPatched = false;
let _discoverObserver = null;

function esc(s){
  try{
    return (window.esc ? window.esc(s) : String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  }catch{return String(s ?? '');}
}
function toastx(m){try{(window.toast||console.log)(m);}catch{}}
function storageGet(k,d){try{return JSON.parse(localStorage.getItem(k) || JSON.stringify(d));}catch{return d;}}
function storageSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}
function pkey(id){return PROG_KEY + id;}
function okey(id){return OVR_KEY + id;}
function typeLabel(t){return t === 'book' ? 'Livro' : 'Leitura';}
function isBookData(d){return d && (d.type === 'book' || (Array.isArray(d.chapters) && d.chapters.length > 1));}
function newId(){try{return typeof v29NewId === 'function' ? v29NewId() : Date.now().toString(36)+Math.random().toString(36).slice(2);}catch{return Date.now().toString(36)+Math.random().toString(36).slice(2);}}
function normalizeType(t){return t === 'book' ? 'book' : 'simple_reading';}

function applyOverride(meta){
  const o = storageGet(okey(meta.id),{});
  return {...meta,...o,id:meta.id,path:meta.path,hsk:meta.hsk,type:normalizeType(meta.type),chapters_count:o.chapters_count ?? meta.chapters_count};
}
async function loadIndex(){
  if(loaded) return items;
  const r = await fetch(INDEX_URL,{cache:'no-store'});
  if(!r.ok) throw new Error('Não consegui carregar source/index.json: '+r.status);
  const data = await r.json();
  items = (Array.isArray(data.items) ? data.items : []).map(applyOverride);
  loaded = true;
  return items;
}
function values(field){return [...new Set(items.map(x=>x[field]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'pt-BR',{numeric:true}));}
function filtered(){
  return items.filter(x=>(!filters.hsk || String(x.hsk)===String(filters.hsk)) && (!filters.genre || x.genre===filters.genre) && (!filters.type || normalizeType(x.type)===filters.type));
}
function chipHtml(kind,val,label){
  const on = String(filters[kind] || '') === String(val);
  return `<button class="hsrc-chip ${on?'on':''}" data-hsrc-filter="${kind}" data-val="${esc(val)}">${esc(label||val)}</button>`;
}
function renderFilters(){
  const hsks = [...new Set(items.map(x=>Number(x.hsk)).filter(Boolean))].sort((a,b)=>a-b);
  return `<div class="hsrc-filter-block"><div class="hsrc-filter-title">Nível HSK</div><div class="hsrc-chips">${(hsks.length?hsks:[1,2,3,4,5,6]).map(n=>chipHtml('hsk',n,'HSK '+n)).join('')}</div></div>`+
         `<div class="hsrc-filter-block"><div class="hsrc-filter-title">Gênero</div><div class="hsrc-chips">${values('genre').map(g=>chipHtml('genre',g,g)).join('')}</div></div>`+
         `<div class="hsrc-filter-block"><div class="hsrc-filter-title">Tipo</div><div class="hsrc-chips">${['simple_reading','book'].map(t=>chipHtml('type',t,typeLabel(t))).join('')}</div></div>`;
}
function card(meta){
  const p = storageGet(pkey(meta.id),{});
  const pct = Math.round(((p.progress || 0) * 100));
  const ch = meta.type === 'book' ? `${meta.chapters_count || 0} cap.` : '1 página';
  return `<div class="hsrc-card" data-hsrc-open="${esc(meta.id)}"><div class="hsrc-top"><div><div class="hsrc-name">${esc(meta.title)}</div><div class="hsrc-local-tag">Conteúdo local · sem URL externa</div></div><span class="hsrc-badge">HSK ${esc(meta.hsk)}</span></div><div class="hsrc-syn">${esc(meta.synopsis||'')}</div><div class="hsrc-meta"><span class="hsrc-badge">${esc(meta.genre)}</span><span class="hsrc-badge">${typeLabel(meta.type)}</span><span class="hsrc-badge">${ch}</span>${pct?`<span class="hsrc-badge">${pct}%</span>`:''}</div><div class="hsrc-actions"><button class="hsrc-btn pri" data-hsrc-open="${esc(meta.id)}">Abrir</button><button class="hsrc-btn" data-hsrc-add="${esc(meta.id)}">Adicionar à biblioteca</button></div></div>`;
}

function renderDiscoverLoading(){
  const dc=document.getElementById('dc');
  if(!dc) return;
  dc.innerHTML='<div class="hsrc-wrap"><div class="hsrc-head"><div><div class="hsrc-title">Fontes</div><div class="hsrc-sub">Carregando fontes locais...</div></div><div class="hsrc-head-actions"><button class="hsrc-close" type="button" data-hsrc-close aria-label="Fechar fontes">×</button></div></div><div class="hsrc-empty"><div class="spin sm" style="margin:0 auto 10px"></div>Preparando banco local...</div></div>';
  try{dc.querySelector('[data-hsrc-close]').onclick=()=>showScreen('sl');}catch{}
}
async function renderDiscoverLocal(){
  const dc = document.getElementById('dc');
  if(!dc) return;
  try{
    if(!dc.querySelector('.hsrc-wrap')) renderDiscoverLoading();
    await loadIndex();
    const list = filtered();
    dc.innerHTML = `<div class="hsrc-wrap"><div class="hsrc-head"><div><div class="hsrc-title">Fontes</div><div class="hsrc-sub">Histórias progressivas em JSON, salvas dentro do projeto. Origem: Local.</div></div><div class="hsrc-head-actions"><span class="hsrc-badge">${items.length} conteúdos</span><button class="hsrc-close" type="button" data-hsrc-close aria-label="Fechar fontes">×</button></div></div>${renderFilters()}<div class="hsrc-grid">${list.map(card).join('') || '<div class="hsrc-empty">Nenhum conteúdo combina com os filtros ativos.</div>'}</div></div>`;
    wire(dc);
  }catch(e){
    dc.innerHTML = '<div class="hsrc-error">Erro ao carregar sources locais: '+esc(e.message || e)+'</div>';
  }
}

function wire(root){
  root.querySelectorAll('[data-hsrc-close]').forEach(b=>b.onclick=()=>{try{showScreen('sl');}catch{}try{ensureLibraryImportUi();}catch{}});
  root.querySelectorAll('[data-hsrc-filter]').forEach(b=>b.onclick=()=>{const k=b.dataset.hsrcFilter;const v=b.dataset.val;filters[k]=String(filters[k]||'')===String(v)?null:v;renderDiscoverLocal();});
  root.querySelectorAll('[data-hsrc-open]').forEach(b=>b.onclick=e=>{e.stopPropagation();openLocalSource(b.dataset.hsrcOpen);});
  root.querySelectorAll('[data-hsrc-add]').forEach(b=>b.onclick=e=>{e.stopPropagation();addToLibrary(b.dataset.hsrcAdd);});
}

async function loadSource(id){
  await loadIndex();
  const meta = items.find(x=>x.id===id);
  if(!meta) throw new Error('Source não encontrada: '+id);
  const r = await fetch('source/'+meta.path,{cache:'no-store'});
  if(!r.ok) throw new Error('Falha ao abrir JSON '+meta.path+': '+r.status);
  const data = await r.json();
  return applyDataOverrides(data);
}
function applyDataOverrides(data){
  const o = storageGet(okey(data.id),{});
  const d = {...data,...o,id:data.id,hsk:data.hsk,type:normalizeType(data.type)};
  if(Array.isArray(data.chapters)){
    let ch = data.chapters.slice();
    if(Array.isArray(o.chapterOrder)){
      const map = new Map(ch.map(c=>[String(c.id||c.num||c.title),c]));
      ch = o.chapterOrder.map(k=>map.get(String(k))).filter(Boolean).concat(ch.filter(c=>!o.chapterOrder.map(String).includes(String(c.id||c.num||c.title))));
    }
    if(Array.isArray(o.hiddenChapters)) ch = ch.filter(c=>!o.hiddenChapters.map(String).includes(String(c.id||c.num||c.title)));
    d.chapters = ch;
  }
  return d;
}
async function openLocalSource(id){
  try{
    const data = await loadSource(id);
    localStorage.setItem('hsrc.last',id);
    if(isBookData(data)) return openLocalBook(data);
    return openLocalSimple(data);
  }catch(e){toastx('Source local: '+(e.message || e));}
}

async function renderText(ctx,text,label,progress){
  try{showScreen('sr');}catch{}
  const top = document.querySelector('#sr .rtop');
  if(top){top.classList.toggle('clickable',ctx.kind==='book');top.onclick=ctx.kind==='book'?()=>showLocalChapterPicker(ctx):null;}
  const rsrc=document.getElementById('rsrc'),rpct=document.getElementById('rpct'),rtext=document.getElementById('rtext'),rs=document.getElementById('rscroll');
  const initialPct = Number(progress && progress.progress || 0);
  if(rsrc) rsrc.textContent = label;
  if(rpct) rpct.textContent = Math.round(initialPct*100)+'%';
  if(rtext) rtext.innerHTML = '';
  try{
    showLoad&&showLoad('Aguardando pinyin...');
    if(window.waitPinyin) await waitPinyin();
    showLoad&&showLoad('Processando texto local...');
    if(window.frame) await frame();
    if(rtext) rtext.innerHTML = window.buildHTML ? buildHTML(text||'') : esc(text||'').replace(/\n/g,'<br>');
    if(window.applyPinyin) applyPinyin();
  }catch(e){toastx('Erro: '+(e.message||e));}
  finally{try{hideLoad&&hideLoad();}catch{}}
  if(window.frame) await frame();
  if(rs){
    const maxS = rs.scrollHeight - rs.clientHeight;
    rs.scrollTop = initialPct * Math.max(0,maxS);
    rs.onscroll = ()=>{
      const max = rs.scrollHeight - rs.clientHeight;
      if(max<=0) return;
      const pct = rs.scrollTop/max;
      if(rpct) rpct.textContent = Math.round(pct*100)+'%';
      clearTimeout(rs._hsrc);
      rs._hsrc = setTimeout(()=>{
        if(ctx.kind==='book'){
          const p = storageGet(pkey(ctx.sourceId),{chapters:{}});
          const idx = Number(ctx._readingChapterIndex || 0);
          p.chapters = p.chapters || {};
          p.chapters[idx] = {...(p.chapters[idx]||{}),progress:pct,updatedAt:Date.now()};
          p.progress = pct; p.lastChapter = idx; p.updatedAt = Date.now();
          storageSet(pkey(ctx.sourceId),p);
        }else{
          progress.progress = pct; progress.updatedAt = Date.now(); storageSet(pkey(ctx.sourceId),progress);
        }
      },420);
    };
  }
  try{window.curBook=ctx; curBook=ctx;}catch{window.curBook=ctx;}
}
function openLocalSimple(data){
  const p=storageGet(pkey(data.id),{progress:0});
  const ctx={id:'src:'+data.id,sourceId:data.id,kind:'simple',title:data.title,source:'Conteúdo local',content:data.content||'',progress:p.progress||0,isLocalSource:true,hsk:data.hsk,genre:data.genre};
  return renderText(ctx,data.content||'',`Local • HSK ${data.hsk} • ${data.title}`,p);
}
function openLocalBook(data){
  const p=storageGet(pkey(data.id),{progress:0,lastChapter:0,chapters:{}});
  const ch=data.chapters||[];
  const idx=Math.max(0,Math.min(Number(p.lastChapter||0),ch.length-1));
  return openLocalChapter(data,idx,p);
}
function openLocalChapter(data,idx,p=storageGet(pkey(data.id),{chapters:{}})){
  const ch=data.chapters||[];
  const c=ch[idx]; if(!c) return;
  const cp=(p.chapters&&p.chapters[idx])||{};
  const ctx={id:'src:'+data.id,sourceId:data.id,kind:'book',title:data.title,source:'Conteúdo local',chapters:ch,lastChapterIndex:idx,_readingChapterIndex:idx,isLocalSource:true,hsk:data.hsk,genre:data.genre};
  const progress={...p,lastChapter:idx,progress:cp.progress||0,chapters:{...(p.chapters||{})}};
  return renderText(ctx,c.content||'',`${c.title||('Capítulo '+(idx+1))} • ${data.title}`,progress);
}
function ensureLocalChapterModal(){
  if(document.getElementById('mo-local-chapters')) return;
  document.body.insertAdjacentHTML('beforeend',`<div class="mo" id="mo-local-chapters"><div class="ms wide"><div class="mbar"><div class="mhd"></div><button class="mx" id="mo-local-chapters-x" aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div><div class="mtitle">Capítulos · conteúdo local</div><div class="mscroll"><div id="hsrc-chap-list" class="hsrc-chap-list"></div></div></div></div>`);
  document.getElementById('mo-local-chapters-x').onclick=()=>document.getElementById('mo-local-chapters').classList.remove('open');
}
function showLocalChapterPicker(ctx){
  ensureLocalChapterModal();
  const p=storageGet(pkey(ctx.sourceId),{chapters:{}});
  const list=document.getElementById('hsrc-chap-list');
  list.innerHTML=(ctx.chapters||[]).map((c,i)=>{const pct=Math.round(((p.chapters&&p.chapters[i]&&p.chapters[i].progress)||0)*100);return `<button class="hsrc-chap" data-hsrc-chap="${i}">${esc(c.title||('Capítulo '+(i+1)))}<small>Cap. ${i+1} • ${pct}% • Origem Local</small></button>`;}).join('');
  list.querySelectorAll('[data-hsrc-chap]').forEach(b=>b.onclick=async()=>{document.getElementById('mo-local-chapters').classList.remove('open');const full=await loadSource(ctx.sourceId);openLocalChapter(full,Number(b.dataset.hsrcChap));});
  document.getElementById('mo-local-chapters').classList.add('open');
}

function openDb(versioned=true){
  return new Promise((resolve,reject)=>{
    let req;
    try{req = versioned ? indexedDB.open(DB_NAME,DB_VERSION) : indexedDB.open(DB_NAME);}catch(e){reject(e);return;}
    req.onupgradeneeded = e=>{
      const d=e.target.result;
      if(!d.objectStoreNames.contains(STORE_BOOKS)) d.createObjectStore(STORE_BOOKS,{keyPath:'id'});
      if(!d.objectStoreNames.contains(STORE_WORDS)) d.createObjectStore(STORE_WORDS,{keyPath:'id'});
    };
    req.onsuccess=e=>resolve(e.target.result);
    req.onerror=()=>{
      if(versioned && req.error && String(req.error.name||'').includes('VersionError')) openDb(false).then(resolve,reject);
      else reject(req.error || new Error('IndexedDB falhou'));
    };
  });
}
async function putBookRecord(record){
  try{
    if(typeof dbPut === 'function' && typeof STB !== 'undefined'){
      await dbPut(STB,record);
      return;
    }
  }catch{}
  const d = await openDb();
  await new Promise((resolve,reject)=>{
    const tx=d.transaction(STORE_BOOKS,'readwrite');
    tx.objectStore(STORE_BOOKS).put(record);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error || new Error('Falha ao salvar no IndexedDB'));
  });
  try{d.close();}catch{}
}
async function refreshBooksCache(){
  try{if(typeof dbAll === 'function' && typeof STB !== 'undefined'){books = await dbAll(STB); window.books = books; return;}}catch{}
  try{
    const d=await openDb(false);
    const all=await new Promise((resolve,reject)=>{
      const tx=d.transaction(STORE_BOOKS,'readonly');
      const r=tx.objectStore(STORE_BOOKS).getAll();
      r.onsuccess=()=>resolve(r.result||[]);
      r.onerror=()=>reject(r.error);
    });
    try{books=all;}catch{}
    window.books=all;
    try{d.close();}catch{}
  }catch{}
}
async function addToLibrary(id){
  try{
    const d = await loadSource(id);
    const isBook = isBookData(d);
    let b;
    if(isBook){
      b={id:newId(),kind:'book',title:d.title,source:'Conteúdo local',cover:d.cover||'',synopsis:(d.synopsis||'').slice(0,100),chapters:(d.chapters||[]).map((c,i)=>({id:newId(),num:c.num||i+1,title:c.title||('Capítulo '+(i+1)),content:c.content||'',progress:0,addedAt:Date.now()})),lastRead:null,addedAt:Date.now(),lastChapterIndex:0,localSourceId:d.id,hsk:d.hsk,genre:d.genre};
    }else{
      b={id:newId(),kind:'simple',title:d.title,source:'Conteúdo local',content:d.content||'',type:'source-local',progress:0,lastRead:null,addedAt:Date.now(),charsRead:0,localSourceId:d.id,hsk:d.hsk,genre:d.genre};
    }
    await putBookRecord(b);
    await refreshBooksCache();
    try{v29LibMode=isBook?'books':'simple';localStorage.setItem('hlibMode',v29LibMode);}catch{}
    toastx('Adicionado à biblioteca');
    try{showScreen('sl');}catch{}
    setTimeout(()=>{try{if(typeof loadLib==='function')loadLib();else if(typeof renderLib==='function')renderLib();}catch{try{renderLib&&renderLib();}catch{}}},30);
  }catch(e){
    console.warn('[source-adapter] addToLibrary', e);
    toastx('Erro ao adicionar: '+(e.message||e));
  }
}

function restoreImportModalLinks(){
  try{
    const ourl=document.getElementById('ourl');
    const area=document.getElementById('url-area');
    if(ourl) ourl.style.setProperty('display','flex','important');
    if(area){
      area.style.removeProperty('display');
      area.classList.remove('hsrc-hidden');
    }
  }catch{}
}
function disableLegacyOnlineSources(){
  try{document.getElementById('oonline')?.remove();document.getElementById('mo-online')?.remove();}catch{}
}
function openLocalSources(type){
  if(type) filters.type=type;
  try{closeModals();}catch{}
  try{renderDiscoverLoading();}catch{}
  try{showScreen('sd');}catch{}
  setTimeout(renderDiscoverLocal,0);
}
function ensureReadSourcesButton(){
  const modal=document.getElementById('mo-import');
  if(!modal) return;
  let btn=document.getElementById('osrc');
  if(!btn){
    const ref=document.getElementById('ourl') || modal.querySelector('.mscroll')?.firstElementChild;
    const div=document.createElement('div');
    div.className='iopt'; div.id='osrc';
    div.innerHTML='<div class="iico url"><svg fill="none" height="20" stroke="white" stroke-width="2" viewBox="0 0 24 24" width="20"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"></path></svg></div><div><div class="ilbl">Read Sources</div><div class="isub">Importar leitura de source local</div></div>';
    if(ref&&ref.parentNode) ref.parentNode.insertBefore(div,ref);
    else modal.querySelector('.mscroll')?.prepend(div);
    btn=div;
  }
  if(btn){btn.onclick=()=>openLocalSources('simple_reading');btn.style.setProperty('display','flex','important');}
}
function ensureLibraryImportUi(){
  try{
    restoreImportModalLinks();
    ensureReadSourcesButton();
    disableLegacyOnlineSources();
    const mode = (typeof v29LibMode !== 'undefined' && v29LibMode === 'books') ? 'books' : 'simple';
    const bc=document.getElementById('bc');
    if(!bc) return;
    const tools=bc.querySelector('.lib-tools');
    if(mode==='books' && tools && !tools.querySelector('#book-import-chip')){
      const btn=document.createElement('button');
      btn.className='lib-chip'; btn.id='book-import-chip'; btn.textContent='Importar';
      const ref=tools.querySelector('#book-new-chip') || tools.querySelector('#view-cover') || null;
      tools.insertBefore(btn,ref);
      btn.onclick=()=>openLocalSources('book');
    }
    const simpleBtn=document.getElementById('simple-import-chip');
    if(simpleBtn && !simpleBtn.__hsrcFixed){
      const old=simpleBtn.onclick;
      simpleBtn.onclick=(ev)=>{try{v29ImportContext='simple';}catch{} if(typeof old==='function')old.call(simpleBtn,ev); setTimeout(()=>{restoreImportModalLinks();ensureReadSourcesButton();},20);};
      simpleBtn.__hsrcFixed=true;
    }
  }catch(e){console.warn('[source-adapter] ensure ui',e);}
}

function forceLocalDiscover(){
  try{window.renderDiscover = renderDiscoverLocal;}catch{}
  try{renderDiscover = renderDiscoverLocal;}catch{}
  try{window.v38RenderDiscover = renderDiscoverLocal;}catch{}
  try{v38RenderDiscover = renderDiscoverLocal;}catch{}
  try{window.H48_renderDiscover = renderDiscoverLocal;}catch{}
}
function patchShowScreen(){
  if(_showScreenPatched) return;
  const current = (typeof showScreen === 'function') ? showScreen : window.showScreen;
  if(typeof current !== 'function') return;
  const patched=function(id){
    const r=current.apply(this,arguments);
    setTimeout(()=>{
      restoreImportModalLinks(); ensureReadSourcesButton(); disableLegacyOnlineSources(); ensureLibraryImportUi();
      if(id==='sd'){ try{renderDiscoverLoading();}catch{} renderDiscoverLocal(); }
    },20);
    return r;
  };
  patched.__hsrc = true;
  try{window.showScreen = patched;}catch{}
  try{showScreen = patched;}catch{}
  _showScreenPatched = true;
}
function patchRenderLib(){
  if(_renderLibPatched) return;
  const current = (typeof renderLib === 'function') ? renderLib : window.renderLib;
  if(typeof current !== 'function') return;
  const patched=function(){
    const r=current.apply(this,arguments);
    setTimeout(ensureLibraryImportUi,0);
    return r;
  };
  patched.__hsrc = true;
  try{window.renderLib = patched;}catch{}
  try{renderLib = patched;}catch{}
  _renderLibPatched = true;
}
function installObserver(){
  if(_discoverObserver) return;
  try{
    _discoverObserver=new MutationObserver(()=>{
      restoreImportModalLinks(); ensureReadSourcesButton(); ensureLibraryImportUi(); disableLegacyOnlineSources();
      const dc=document.getElementById('dc');
      if(dc && document.getElementById('sd')?.classList.contains('active') && !dc.querySelector('.hsrc-wrap')) renderDiscoverLocal();
    });
    _discoverObserver.observe(document.body,{subtree:true,childList:true});
  }catch{}
}
function boot(){
  forceLocalDiscover(); patchShowScreen(); patchRenderLib(); restoreImportModalLinks(); ensureReadSourcesButton(); disableLegacyOnlineSources(); ensureLibraryImportUi(); installObserver();
  if(document.getElementById('sd')?.classList.contains('active')) renderDiscoverLocal();
}

window.hsrcRenderDiscoverLocal = renderDiscoverLocal;
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,60)); else setTimeout(boot,60);
[150,400,800,1500,3000,6000,10000].forEach(t=>setTimeout(boot,t));
})();

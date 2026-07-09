/* Sources locais: manifesto JSON + filtros + adaptador para leitor existente. */
/*
  Este arquivo foi movido da pasta `api/` para `js/` porque em ambientes de
  hospedagem como Vercel a pasta `api/` é reservada para funções
  serverless. Qualquer arquivo JavaScript colocado ali será executado
  como uma função, e não será servido como um módulo estático. Isto
  causava erros 500 ao carregar o aplicativo, já que `source-adapter.mjs`
  deveria ser consumido no navegador.

  Todo o conteúdo original do arquivo foi preservado abaixo sem
  modificações lógicas, além deste comentário e do ajuste de
  carregamento.
*/

(function(){
'use strict';
const INDEX_URL='source/index.json';
const PROG_KEY='hsrc.progress.';
const OVR_KEY='hsrc.override.';
let items=[];let loaded=false;let filters={hsk:null,genre:null,type:null};
function esc(s){try{return (window.esc?window.esc(s):String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':"'"}[c])));}catch{return String(s??'');}}
function toastx(m){try{(window.toast||console.log)(m);}catch{}}
function storageGet(k,d){try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d));}catch{return d;}}
function storageSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}
function typeLabel(t){return t==='book'?'Livro':'Leitura';}
function pkey(id){return PROG_KEY+id;}
function okey(id){return OVR_KEY+id;}
function applyOverride(meta){const o=storageGet(okey(meta.id),{});return {...meta,...o,id:meta.id,path:meta.path,hsk:meta.hsk,type:meta.type,chapters_count:o.chapters_count??meta.chapters_count};}
async function loadIndex(){if(loaded)return items;const r=await fetch(INDEX_URL,{cache:'no-store'});if(!r.ok)throw new Error('Não consegui carregar source/index.json: '+r.status);const data=await r.json();items=(Array.isArray(data.items)?data.items:[]).map(applyOverride);loaded=true;return items;}
function values(field){return [...new Set(items.map(x=>x[field]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'pt-BR',{numeric:true}));}
function filtered(){return items.filter(x=>(!filters.hsk||String(x.hsk)===String(filters.hsk))&&(!filters.genre||x.genre===filters.genre)&&(!filters.type||x.type===filters.type));}
function chipHtml(kind,val,label){const on=String(filters[kind]||'')===String(val);return `<button class="hsrc-chip ${on?'on':''}" data-hsrc-filter="${kind}" data-val="${esc(val)}">${esc(label||val)}</button>`;}
function renderFilters(){return `<div class="hsrc-filter-block"><div class="hsrc-filter-title">Nível HSK</div><div class="hsrc-chips">${[1,2,3,4,5,6].map(n=>chipHtml('hsk',n,'HSK '+n)).join('')}</div></div><div class="hsrc-filter-block"><div class="hsrc-filter-title">Gênero</div><div class="hsrc-chips">${values('genre').map(g=>chipHtml('genre',g,g)).join('')}</div></div><div class="hsrc-filter-block"><div class="hsrc-filter-title">Tipo</div><div class="hsrc-chips">${['simple_reading','book'].map(t=>chipHtml('type',t,typeLabel(t))).join('')}</div></div>`;}
function card(meta){const p=storageGet(pkey(meta.id),{});const pct=Math.round(((p.progress||0)*100));const ch=meta.type==='book'?`${meta.chapters_count||0} cap.`:'1 página';return `<div class="hsrc-card" data-hsrc-open="${esc(meta.id)}"><div class="hsrc-top"><div><div class="hsrc-name">${esc(meta.title)}</div><div class="hsrc-local-tag">Conteúdo local · sem URL externa</div></div><span class="hsrc-badge">HSK ${esc(meta.hsk)}</span></div><div class="hsrc-syn">${esc(meta.synopsis||'')}</div><div class="hsrc-meta"><span class="hsrc-badge">${esc(meta.genre)}</span><span class="hsrc-badge">${typeLabel(meta.type)}</span><span class="hsrc-badge">${ch}</span>${pct?`<span class="hsrc-badge">${pct}%</span>`:''}</div><div class="hsrc-actions"><button class="hsrc-btn pri" data-hsrc-open="${esc(meta.id)}">Abrir</button><button class="hsrc-btn" data-hsrc-add="${esc(meta.id)}">Adicionar à biblioteca</button></div></div>`;}
async function renderDiscoverLocal(){const dc=document.getElementById('dc');if(!dc)return;try{await loadIndex();const list=filtered();dc.innerHTML=`<div class="hsrc-wrap"><div class="hsrc-head"><div><div class="hsrc-title">Sources locais</div><div class="hsrc-sub">Histórias progressivas em JSON, salvas dentro do projeto. Origem: Local.</div></div><span class="hsrc-badge">${items.length} conteúdos</span></div>${renderFilters()}<div class="hsrc-grid">${list.map(card).join('')||'<div class="hsrc-empty">Nenhum conteúdo combina com os filtros ativos.</div>'}</div></div>`;wire(dc);}catch(e){dc.innerHTML='<div class="hsrc-error">Erro ao carregar sources locais: '+esc(e.message||e)+'</div>';}}
function wire(root){root.querySelectorAll('[data-hsrc-filter]').forEach(b=>b.onclick=()=>{const k=b.dataset.hsrcFilter;const v=b.dataset.val;filters[k]=String(filters[k]||'')===String(v)?null:v;renderDiscoverLocal();});root.querySelectorAll('[data-hsrc-open]').forEach(b=>b.onclick=e=>{e.stopPropagation();openLocalSource(b.dataset.hsrcOpen);});root.querySelectorAll('[data-hsrc-add]').forEach(b=>b.onclick=e=>{e.stopPropagation();addToLibrary(b.dataset.hsrcAdd);});}
async function loadSource(id){await loadIndex();const meta=items.find(x=>x.id===id);if(!meta)throw new Error('Source não encontrada: '+id);const r=await fetch('source/'+meta.path,{cache:'no-store'});if(!r.ok)throw new Error('Falha ao abrir JSON '+meta.path+': '+r.status);const data=await r.json();return applyDataOverrides(data);}  
function applyDataOverrides(data){const o=storageGet(okey(data.id),{});const d={...data,...o,id:data.id,hsk:data.hsk,type:data.type};if(Array.isArray(data.chapters)){let ch=data.chapters.slice();if(Array.isArray(o.chapterOrder)){const map=new Map(ch.map(c=>[String(c.id||c.num||c.title),c]));ch=o.chapterOrder.map(k=>map.get(String(k))).filter(Boolean).concat(ch.filter(c=>!o.chapterOrder.map(String).includes(String(c.id||c.num||c.title))));}if(Array.isArray(o.hiddenChapters))ch=ch.filter(c=>!o.hiddenChapters.map(String).includes(String(c.id||c.num||c.title)));d.chapters=ch;}return d;}
async function openLocalSource(id){try{const data=await loadSource(id);localStorage.setItem('hsrc.last',id);if(data.type==='book'||(data.chapters&&data.chapters.length>1))return openLocalBook(data);return openLocalSimple(data);}catch(e){toastx('Source local: '+(e.message||e));}}
async function renderText(ctx,text,label,progress){showScreen('sr');const top=document.querySelector('#sr .rtop');if(top){top.classList.toggle('clickable',ctx.kind==='book');top.onclick=ctx.kind==='book'?()=>showLocalChapterPicker(ctx):null;}const rsrc=document.getElementById('rsrc'),rpct=document.getElementById('rpct'),rtext=document.getElementById('rtext'),rs=document.getElementById('rscroll');const initialPct=Number(progress&&progress.progress||0);if(rsrc)rsrc.textContent=label;if(rpct)rpct.textContent=Math.round(initialPct*100)+'%';if(rtext)rtext.innerHTML='';try{showLoad&&showLoad('Aguardando pinyin...');if(window.waitPinyin)await waitPinyin();showLoad&&showLoad('Processando texto local...');if(window.frame)await frame();rtext.innerHTML=window.buildHTML?buildHTML(text||''):esc(text||'').replace(/\n/g,'<br>');if(window.applyPinyin)applyPinyin();}catch(e){toastx('Erro: '+(e.message||e));}finally{try{hideLoad&&hideLoad();}catch{}}if(window.frame)await frame();const maxS=rs.scrollHeight-rs.clientHeight;rs.scrollTop=initialPct*Math.max(0,maxS);rs.onscroll=()=>{const max=rs.scrollHeight-rs.clientHeight;if(max<=0)return;const pct=rs.scrollTop/max;if(rpct)rpct.textContent=Math.round(pct*100)+'%';clearTimeout(rs._hsrc);rs._hsrc=setTimeout(()=>{if(ctx.kind==='book'){const p=storageGet(pkey(ctx.sourceId),{chapters:{}});const idx=Number(ctx._readingChapterIndex||0);p.chapters=p.chapters||{};p.chapters[idx]={...(p.chapters[idx]||{}),progress:pct,updatedAt:Date.now()};p.progress=pct;p.lastChapter=idx;p.updatedAt=Date.now();storageSet(pkey(ctx.sourceId),p);}else{progress.progress=pct;progress.updatedAt=Date.now();storageSet(pkey(ctx.sourceId),progress);}},420);};try{window.curBook=ctx;curBook=ctx;}catch{window.curBook=ctx;}}
function openLocalSimple(data){const p=storageGet(pkey(data.id),{progress:0});const ctx={id:'src:'+data.id,sourceId:data.id,kind:'simple',title:data.title,source:'Conteúdo local',content:data.content||'',progress:p.progress||0,isLocalSource:true,hsk:data.hsk,genre:data.genre};return renderText(ctx,data.content||'',`Local • HSK ${data.hsk} • ${data.title}`,p);}
function openLocalBook(data){const p=storageGet(pkey(data.id),{progress:0,lastChapter:0,chapters:{}});const ch=data.chapters||[];const idx=Math.max(0,Math.min(Number(p.lastChapter||0),ch.length-1));return openLocalChapter(data,idx,p);}
function openLocalChapter(data,idx,p=storageGet(pkey(data.id),{chapters:{}})){const ch=data.chapters||[];const c=ch[idx];if(!c)return;const cp=(p.chapters&&p.chapters[idx])||{};const ctx={id:'src:'+data.id,sourceId:data.id,kind:'book',title:data.title,source:'Conteúdo local',chapters:ch,lastChapterIndex:idx,_readingChapterIndex:idx,isLocalSource:true,hsk:data.hsk,genre:data.genre};const progress={...p,lastChapter:idx,progress:cp.progress||0,chapters:{...(p.chapters||{})}};return renderText(ctx,c.content||'',`${c.title||('Capítulo '+(idx+1))} • ${data.title}`,progress);}  
function ensureLocalChapterModal(){if(document.getElementById('mo-local-chapters'))return;document.body.insertAdjacentHTML('beforeend',`<div class="mo" id="mo-local-chapters"><div class="ms wide"><div class="mbar"><div class="mhd"></div><button class="mx" id="mo-local-chapters-x" aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div><div class="mtitle">Capítulos · conteúdo local</div><div class="mscroll"><div id="hsrc-chap-list" class="hsrc-chap-list"></div></div></div></div>`);document.getElementById('mo-local-chapters-x').onclick=()=>document.getElementById('mo-local-chapters').classList.remove('open');}
function showLocalChapterPicker(ctx){ensureLocalChapterModal();const data={id:ctx.sourceId,title:ctx.title,chapters:ctx.chapters};const p=storageGet(pkey(ctx.sourceId),{chapters:{}});const list=document.getElementById('hsrc-chap-list');list.innerHTML=(ctx.chapters||[]).map((c,i)=>{const pct=Math.round(((p.chapters&&p.chapters[i]&&p.chapters[i].progress)||0)*100);return `<button class="hsrc-chap" data-hsrc-chap="${i}">${esc(c.title||('Capítulo '+(i+1)))}<small>Cap. ${i+1} • ${pct}% • Origem Local</small></button>`;}).join('');list.querySelectorAll('[data-hsrc-chap]').forEach(b=>b.onclick=async()=>{document.getElementById('mo-local-chapters').classList.remove('open');const full=await loadSource(ctx.sourceId);openLocalChapter(full,Number(b.dataset.hsrcChap));});document.getElementById('mo-local-chapters').classList.add('open');}
async function addToLibrary(id){try{const d=await loadSource(id);const newId=()=>window.v29NewId?v29NewId():Date.now().toString(36)+Math.random().toString(36).slice(2);if(!window.dbPut||!window.STB)throw new Error('Banco local ainda não carregou.');let b;if(d.type==='book'||(d.chapters&&d.chapters.length>1)){b={id:newId(),kind:'book',title:d.title,source:'Conteúdo local',cover:d.cover||'',synopsis:(d.synopsis||'').slice(0,100),chapters:(d.chapters||[]).map((c,i)=>({id:newId(),num:c.num||i+1,title:c.title||('Capítulo '+(i+1)),content:c.content||'',progress:0,addedAt:Date.now()})),lastRead:null,addedAt:Date.now(),lastChapterIndex:0,localSourceId:d.id};}else{b={id:newId(),kind:'simple',title:d.title,source:'Conteúdo local',content:d.content||'',type:'source-local',progress:0,lastRead:null,addedAt:Date.now(),charsRead:0,localSourceId:d.id};}await dbPut(STB,b);if(window.dbAll)window.books=await dbAll(STB);toastx('Adicionado à biblioteca');if(window.renderLib)renderLib();}catch(e){toastx('Erro ao adicionar: '+(e.message||e));}}
// When local sources are enabled we still want to allow importing from URL.
// The original implementation removed the URL-related buttons (#ourl and #url-area)
// along with the online source buttons (#oonline and #mo-online).  However, the
// ability to import text from a URL is a core feature of the classic 2.2 UI and
// should remain accessible.  To restore this functionality we stop removing
// #ourl and #url-area here.  We still remove the buttons used for the older
// external source list (#oonline, #mo-online), since external sources have
// been deprecated in favour of bundled local JSON sources.
function disableExternalSourceUi(){
  try{
    // Remove only the obsolete online source buttons.  Leave #ourl and
    // #url-area intact so that the Importar de URL option stays visible in
    // the import modal.
    const onlineBtn=document.getElementById('oonline');
    const onlineModal=document.getElementById('mo-online');
    if(onlineBtn) onlineBtn.remove();
    if(onlineModal) onlineModal.remove();
  }catch{}
}
try{window.renderDiscover=renderDiscoverLocal;}catch{}
const oldShow=window.showScreen; if(typeof oldShow==='function'&&!oldShow.__hsrc){window.showScreen=function(id){const r=oldShow.apply(this,arguments);if(id==='sd')setTimeout(renderDiscoverLocal,20);setTimeout(disableExternalSourceUi,30);return r;};window.showScreen.__hsrc=true;}
function boot(){disableExternalSourceUi();renderDiscoverLocal();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,600));else setTimeout(boot,600);setTimeout(boot,1800);setTimeout(boot,3600);
})();
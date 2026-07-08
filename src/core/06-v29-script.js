
/* v2.9 Library refactor + dictionary overlay. Built as an enhancement layer over v2.8. */
let v29LibMode=localStorage.getItem('hlibMode')||'simple';
let v29BookView=localStorage.getItem('hbookView')||'cover';
let v29EditingBookId=null;
let v29ChapterDragId=null;
let v29DictTab='defs';
let v29DictTerm='';
let v29ImportContext='simple';
const V29_EXAMPLE_COVER='https://picsum.photos/320/480';
const V29_SOURCE_IMPORTS={
  'Du Chinese':{title:'Du Chinese',cover:'',synopsis:'Fonte graduada para leitura em mandarim.',chapters:[{title:'Página inicial',num:1,url:'https://duchinese.net'}]},
  'Mandarin Bean':{title:'Mandarin Bean',cover:'',synopsis:'Textos graduados com áudio.',chapters:[{title:'Página inicial',num:1,url:'https://mandarinbean.com'}]},
  'Heavenly Path':{title:'Heavenly Path',cover:'',synopsis:'Guia de leituras graduadas.',chapters:[{title:'Página inicial',num:1,url:'https://heavenlypath.info'}]}
};
const V29_LOCAL_SENTENCES=[]/*v4.8: banco local de exemplo removido (nao usado mais - app e online-first)*/;
function v29Svg(name){
 const icons={
  book:'<path d="M12 6.6C10 4.9 7 4.4 4 5.1v13.2c3-.7 6-.2 8 1.6 2-1.8 5-2.3 8-1.6V5.1c-3-.7-5.9-.2-8 1.5z"/><path d="M12 6.6v13.3"/><path d="M7 9.6c1.6-.25 3.2-.05 4.6.7M14.4 10.3c1.4-.75 3-.95 4.6-.7"/>',
  word:'<rect x="3" y="5" width="14" height="10" rx="2"/><rect x="7" y="9" width="14" height="10" rx="2" fill="var(--nb,#0d0d0d)"/>',
  dict:'<circle cx="12" cy="12" r="9"/><polygon points="15.5 8.5 13.2 13.2 8.5 15.5 10.8 10.8 15.5 8.5"/>',
  src:'<rect x="4" y="4" width="4" height="16" rx="1"/><rect x="10" y="4" width="4" height="16" rx="1"/><rect x="16" y="4" width="4" height="16" rx="1"/>',
  set:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06A2 2 0 016.96 3.3l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
  music:'<circle cx="6.5" cy="18.5" r="2.5"/><circle cx="17.5" cy="16.5" r="2.5"/><path d="M9 18.5V6l11-2.5v12.5"/>',
  profile:'<circle cx="12" cy="8.2" r="3.6"/><path d="M4.8 20.2c.9-3.6 3.8-5.6 7.2-5.6s6.3 2 7.2 5.6"/>',
  practice:'<path d="M3.5 15.2l17-2.8"/><path d="M3.5 15.2v3.1a1.2 1.2 0 001.2 1.2h14.6a1.2 1.2 0 001.2-1.2v-5.9"/><path d="M7 14.6v3.2M12 13.8v4M17 13v4.4"/><path d="M6.5 9.2q2.75-2.2 5.5 0t5.5 0"/><path d="M8.6 5.6q1.7-1.3 3.4 0t3.4 0"/>',
  bookClosed:'<path d="M6.2 3h11.6A1.7 1.7 0 0119.5 4.7v14.6a1.7 1.7 0 01-1.7 1.7H6.2A1.7 1.7 0 014.5 19.3V4.7A1.7 1.7 0 016.2 3z"/><path d="M8.4 3v18"/><path d="M11.6 7.6h4.6M11.6 10.8h3.2"/>',
  plus:'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'
 };
 return icons[name]||icons.book;
}
function v29NavHTML(active='sl'){
 const tabs=[['sl','Leitura',v29Svg('book')],['sw','Flash Cards',v29Svg('word')],['sx','Dicionário',v29Svg('dict')],['practice','Prática',v29Svg('practice')],['profile','Meu Perfil',v29Svg('profile')]];
 return tabs.map(([id,label,svg])=>`<button class="ni${id===active?' on':''}" data-tab="${id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${svg}</svg>${label}</button>`).join('');
}
function v29InstallShell(){
 const sl=document.getElementById('sl');
 if(sl&&!document.getElementById('v29-head')){
   const old=sl.querySelector('.lh');
   if(old)old.outerHTML=`<div class="app-shell"><div class="app-head" id="v29-head"><div class="v43-header-row"><button class="v43-icon-btn" id="v43-settings-icon" data-tab="ss" title="Configurações"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06A2 2 0 016.96 3.3l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg></button><div class="mode-row hz-inline"><button class="mode-btn" id="mode-simple">Leitura simples</button><button class="mode-btn" id="mode-books">Livros</button></div><button class="v43-icon-btn" id="v43-search-toggle" title="Buscar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button></div><div class="v43-search-wrap" id="sbar"><input class="v43-search-expand" id="sin" type="search" placeholder="Buscar..." autocomplete="off"></div></div></div>`;
   const bc=document.getElementById('bc');
   if(bc&&!bc.parentElement.classList.contains('app-shell')){
     const shell=document.querySelector('#sl .app-shell');shell.appendChild(bc);shell.appendChild(document.getElementById('lib-nav'));
   }
 }
 if(!document.getElementById('sx')){
  const sx=document.createElement('div');sx.id='sx';sx.className='screen';
  sx.innerHTML=`<div class="dict-head"><h1>Dicionário</h1></div><div class="dict-wrap"><div class="dict-search"><input id="dict-q" placeholder="字 / 词 / frase" autocomplete="off"><button id="dict-go">⌕</button></div><div class="dict-tabs"><button class="dict-tab on" data-dtab="defs">Definições</button><button class="dict-tab" data-dtab="words">Palavras</button><button class="dict-tab" data-dtab="sents">Frases</button></div><div id="dict-results" class="dict-list"><div class="emptyx"><b>Pesquise uma palavra ou ideograma.</b><br>O dicionário usa definições, palavras relacionadas, exemplos e áudio natural quando disponível.</div></div></div><nav class="bnav" id="dict-nav"></nav>`;
  document.body.insertBefore(sx,document.getElementById('sr'));
 }
 document.querySelectorAll('.bnav').forEach(nav=>{if(!nav.classList.contains('rbnav'))nav.innerHTML=v29NavHTML(nav.id==='lib-nav'?'sl':'');});
 const dn=document.getElementById('dict-nav'); if(dn)dn.innerHTML=v29NavHTML('sx');
 const sn=document.getElementById('set-nav'); if(sn)sn.innerHTML=v29NavHTML('ss');
 const wn=document.getElementById('words-nav'); if(wn)wn.innerHTML=v29NavHTML('sw');
 const disn=document.getElementById('disc-nav'); if(disn)disn.innerHTML=v29NavHTML('sd');
 const about=document.querySelector('#ss .ssub[style*="color:#8a8a8a"]'); if(about)about.textContent='v2.9';
}
function v29InstallModals(){
 if(!document.getElementById('mo-book')){
  document.body.insertAdjacentHTML('beforeend',`<div class="mo" id="mo-book"><div class="ms wide"><div class="mbar"><div class="mhd"></div><button class="mx" type="button" data-v29-close aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div><div class="mtitle">Livro</div><div class="mscroll"><div class="form"><div class="cover-preview book-cover gen" id="book-cover-prev"></div><div class="fld"><label>Link direto da capa</label><input id="book-cover" placeholder="https://site.com/capa.jpg"><a class="ex-link" href="${V29_EXAMPLE_COVER}" target="_blank" rel="noopener">Ver exemplo de link direto</a></div><div class="fld"><label>Título</label><input id="book-title" placeholder="Nome do livro"></div><div class="fld"><label>Sinopse <span id="syn-count">0/100</span></label><textarea id="book-syn" maxlength="100" placeholder="Até 100 caracteres"></textarea></div><div class="row2"><button class="plain-btn" id="book-add-chap" type="button">Adicionar capítulos</button><button class="plain-btn" id="book-edit-chap" type="button">Editar capítulos</button></div><div class="small-note" id="book-chap-count">Capítulos: 0</div></div></div><div class="modal-actions"><button class="btn-sec" id="book-cancel">Cancelar</button><button class="btn-pri" id="book-save">Salvar</button></div></div></div>`);
 }
 if(!document.getElementById('mo-chapter')){
  document.body.insertAdjacentHTML('beforeend',`<div class="mo" id="mo-chapter"><div class="ms wide"><div class="mbar"><div class="mhd"></div><button class="mx" type="button" data-v29-close aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div><div class="mtitle">Adicionar capítulo</div><div class="mscroll"><div class="form"><div class="row2"><div class="fld"><label>Número</label><input id="chap-num" type="number" min="1" value="1"></div><div class="fld"><label>Nome</label><input id="chap-title" placeholder="Capítulo 1"></div></div><div class="fld"><label>Importar por URL</label><div class="url-row"><input id="chap-url" placeholder="https://..."><button class="plain-btn" id="chap-fetch" type="button">Buscar</button></div></div><div class="row2"><button class="plain-btn" id="chap-file-txt" type="button">TXT</button><button class="plain-btn" id="chap-file-pdf" type="button">PDF</button></div><div class="fld"><label>Texto do capítulo</label><textarea id="chap-text" style="min-height:190px" placeholder="Cole ou importe o texto chinês aqui..."></textarea></div><input type="file" id="chap-fi-txt" accept=".txt,text/plain" style="display:none"><input type="file" id="chap-fi-pdf" accept=".pdf,application/pdf" style="display:none"></div></div><div class="modal-actions"><button class="btn-sec" id="chap-close">Fechar</button><button class="btn-pri" id="chap-save">Salvar capítulo</button></div></div></div>`);
 }
 if(!document.getElementById('mo-chapters')){
  document.body.insertAdjacentHTML('beforeend',`<div class="mo" id="mo-chapters"><div class="ms wide"><div class="mbar"><div class="mhd"></div><button class="mx" type="button" data-v29-close aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div><div class="mtitle">Capítulos</div><div class="mscroll"><div id="chapters-edit-list" class="chapter-list"></div></div><div class="modal-actions"><button class="btn-sec" id="chapters-cancel">Cancelar</button><button class="btn-pri" id="chapters-save">Salvar ordem</button></div></div></div>`);
 }
 if(!document.getElementById('mo-chap-pick')){
  document.body.insertAdjacentHTML('beforeend',`<div class="mo" id="mo-chap-pick"><div class="ms wide"><div class="mbar"><div class="mhd"></div><button class="mx" type="button" data-v29-close aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div><div class="mtitle">Escolher capítulo</div><div class="chap-pop-list" id="chap-pick-list"></div></div></div>`);
 }
}
function v29Bind(){
 const on=(id,ev,fn)=>{const el=document.getElementById(id); if(el&&!el._v29){el.addEventListener(ev,fn);el._v29=true;}};
 on('mode-simple','click',()=>{v29LibMode='simple';localStorage.setItem('hlibMode',v29LibMode);renderLib();});
 on('mode-books','click',()=>{v29LibMode='books';localStorage.setItem('hlibMode',v29LibMode);renderLib();});
 on('plus-simple','click',()=>{v29ImportContext='simple';v29PrepImport('Adicionar leitura simples');showModal('mo-import');});
 on('plus-books','click',()=>v29OpenBookEditor());
 const sin=document.getElementById('sin'); if(sin&&!sin._v29){sin.addEventListener('input',e=>{searchQ=e.target.value.trim();renderLib();});sin._v29=true;}
 document.body.addEventListener('click',e=>{if(e.target.closest('[data-v29-close]'))closeModals();});
 on('book-cancel','click',closeModals); on('book-save','click',async()=>{await v29SaveBookForm();closeModals();await loadLib();toast('Livro salvo');});
 ['book-cover','book-title','book-syn'].forEach(id=>{const el=document.getElementById(id); if(el&&!el._v29){el.addEventListener('input',()=>{v29PreviewBookForm();v29AutoSaveBookForm();});el._v29=true;}});
 on('book-add-chap','click',()=>v29OpenChapterImport(v29EditingBookId)); on('book-edit-chap','click',()=>v29OpenChaptersEditor(v29EditingBookId));
 on('chap-fetch','click',async()=>{const url=document.getElementById('chap-url').value.trim();if(!url){toast('Digite uma URL');return;}showLoad('Extraindo capítulo...');try{document.getElementById('chap-text').value=await fetchText(url);if(!document.getElementById('chap-title').value)document.getElementById('chap-title').value=new URL(url).hostname;}catch(e){toast('Erro: '+e.message);}finally{hideLoad();}});
 on('chap-file-txt','click',()=>document.getElementById('chap-fi-txt').click()); on('chap-file-pdf','click',()=>document.getElementById('chap-fi-pdf').click());
 on('chap-fi-txt','change',async e=>{const f=e.target.files[0];if(f){showLoad('Lendo TXT...');try{document.getElementById('chap-text').value=cleanRaw(await readFile(f,'UTF-8'));if(!document.getElementById('chap-title').value)document.getElementById('chap-title').value=f.name.replace(/\.[^.]+$/,'');}catch(er){toast('Erro: '+er.message);}finally{hideLoad();}}e.target.value='';});
 on('chap-fi-pdf','change',async e=>{const f=e.target.files[0];if(f){showLoad('Extraindo PDF...');try{document.getElementById('chap-text').value=await v29ReadPdfText(f);if(!document.getElementById('chap-title').value)document.getElementById('chap-title').value=f.name.replace(/\.pdf$/i,'');}catch(er){toast('Erro PDF: '+er.message);}finally{hideLoad();}}e.target.value='';});
 on('chap-save','click',async()=>{await v29SaveChapter();}); on('chap-close','click',closeModals);
 on('chapters-save','click',async()=>{await v29SaveChaptersFromEditor();closeModals();toast('Capítulos salvos');}); on('chapters-cancel','click',closeModals);
 on('dict-go','click',()=>v29RunDict(document.getElementById('dict-q').value.trim()));
 const dq=document.getElementById('dict-q'); if(dq&&!dq._v29){dq.addEventListener('keydown',e=>{if(e.key==='Enter')v29RunDict(dq.value.trim());});dq._v29=true;}
 document.querySelectorAll('.dict-tab').forEach(b=>{if(!b._v29){b.addEventListener('click',()=>{v29DictTab=b.dataset.dtab;document.querySelectorAll('.dict-tab').forEach(x=>x.classList.toggle('on',x.dataset.dtab===v29DictTab));v29RenderDictCurrent();});b._v29=true;}});
 const rtop=document.querySelector('#sr .rtop'); if(rtop&&!rtop._v29){rtop.addEventListener('click',()=>{if(curBook&&v29GetChapters(curBook).length>1)v29OpenChapterPicker(curBook.id);});rtop._v29=true;}
}
function v29PrepImport(title){const mt=document.querySelector('#mo-import .mtitle'); if(mt)mt.textContent=title||'Adicionar texto';}
function v29BookColors(id){const n=[...String(id||'x')].reduce((a,c)=>a+c.charCodeAt(0),0);const sets=[['#384256','#7a5c91','#d9a868'],['#355c4d','#829a61','#d6b36a'],['#4b384c','#97626e','#d7a66e'],['#324b61','#5b8da0','#e1c27a'],['#473c2f','#8e664e','#d8b063']];return sets[n%sets.length];}
function v29CoverStyle(b){if(b.cover)return `background-image:url('${esc(String(b.cover).replace(/'/g,'%27'))}')`;const [g1,g2,g3]=v29BookColors(b.id);return `--g1:${g1};--g2:${g2};--g3:${g3}`;}
function v29GetChapters(b){return Array.isArray(b?.chapters)?b.chapters:[];}
function v29Kind(b){return b.kind||(b.chapters?'book':'simple');}
function v29BookProgress(b){const ch=v29GetChapters(b); if(!ch.length)return b.progress||0; const idx=b.lastChapterIndex||0; return Math.max(0,Math.min(1,ch[idx]?.progress||0));}
renderLib=function(){
 const bc=document.getElementById('bc'); if(!bc)return; const q=(searchQ||'').toLowerCase();
 const mode=v29LibMode==='books'?'books':'simple';
 const base=books.filter(b=>mode==='books'?v29Kind(b)==='book':v29Kind(b)!=='book');
 const list=q?base.filter(b=>(b.title||'').toLowerCase().includes(q)||(b.source||'').toLowerCase().includes(q)||(b.synopsis||'').toLowerCase().includes(q)):base;
 if(mode==='simple')list.sort((a,b)=>((b.lastRead||b.addedAt||0)-(a.lastRead||a.addedAt||0)));else list.sort((a,b)=>((a.order??a.addedAt??0)-(b.order??b.addedAt??0)));
 document.getElementById('mode-simple')?.classList.toggle('on',mode==='simple'); document.getElementById('mode-books')?.classList.toggle('on',mode==='books');
 document.getElementById('plus-simple')?.classList.toggle('on',mode==='simple'); document.getElementById('plus-books')?.classList.toggle('on',mode==='books');
 if(mode==='simple'){
   bc.innerHTML=`<div class="lib-tools"><div class="lib-title">Leitura simples</div><button class="lib-chip" id="simple-import-chip">Importar</button></div><div class="simple-list" id="simple-list"></div>`;
   document.getElementById('simple-import-chip').onclick=()=>{v29ImportContext='simple';v29PrepImport('Adicionar leitura simples');showModal('mo-import');};
   const wrap=document.getElementById('simple-list');
   if(!list.length){wrap.innerHTML='<div class="emptyx"><b>Nenhuma leitura simples.</b><br>Toque em + para importar URL, TXT, PDF textual ou texto colado.</div>';return;}
   list.forEach(b=>{const pct=Math.round((b.progress||0)*100);const el=document.createElement('div');el.className='card';el.innerHTML=`<div class="thumb"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">${v29Svg('book')}</svg></div><div class="bi"><div class="bt">${esc(b.title||'Sem título')}</div><div class="bs">${esc(b.source||'Leitura')}</div><div class="bm">${timeAgo(b.lastRead)}</div><div class="bpb"><div class="bpf" style="width:${pct}%"></div></div></div>`;el.onclick=()=>openBook(b.id);addLP(el,()=>confirmDelBook(b.id));wrap.appendChild(el);});
 }else{
   bc.innerHTML=`<div class="lib-tools"><div class="lib-title">Livros</div><button class="lib-chip" id="book-new-chip">Novo livro</button><button class="lib-chip ${v29BookView==='cover'?'on':''}" id="view-cover">Capas</button><button class="lib-chip ${v29BookView==='list'?'on':''}" id="view-list">Lista</button></div><div class="${v29BookView==='cover'?'lib-grid':'simple-list book-list'}" id="book-wrap"></div>`;
   document.getElementById('view-cover').onclick=()=>{v29BookView='cover';localStorage.setItem('hbookView',v29BookView);renderLib();};document.getElementById('view-list').onclick=()=>{v29BookView='list';localStorage.setItem('hbookView',v29BookView);renderLib();};
   const wrap=document.getElementById('book-wrap'); if(!list.length){wrap.innerHTML='<div class="emptyx"><b>Nenhum livro.</b><br>Toque em + em Livros para criar uma capa, sinopse e capítulos.</div>';return;}
   list.forEach(b=>{const ch=v29GetChapters(b);const pct=Math.round(v29BookProgress(b)*100);const el=document.createElement('div');el.className='book-card';el.innerHTML=`<button class="book-edit" data-edit-book="${b.id}" title="Editar">✎</button><div class="book-cover ${b.cover?'':'gen'}" style="${v29CoverStyle(b)}"></div><div><div class="book-name">${esc(b.title||'Sem título')}</div><div class="book-syn">${esc(b.synopsis||'Sem sinopse')}</div><div class="book-meta"><span>${ch.length} cap.</span><span>${pct}%</span></div></div>`;el.onclick=e=>{if(e.target.closest('[data-edit-book]')){v29OpenBookEditor(b.id);return;}if(ch.length)openBook(b.id);else toast('Adicione pelo menos um capítulo');};addLP(el,()=>v29OpenChapterPicker(b.id));wrap.appendChild(el);});
 }
};
async function v29LoadBook(id){books=await dbAll(STB);return books.find(b=>b.id===id);}
function v29NewId(){return Date.now().toString(36)+Math.random().toString(36).slice(2);}
async function v29OpenBookEditor(id){
 let b=id?await v29LoadBook(id):null;
 if(!b){b={id:v29NewId(),kind:'book',title:'Novo livro',source:'Livro',cover:'',synopsis:'',chapters:[],lastRead:null,addedAt:Date.now(),lastChapterIndex:0};await dbPut(STB,b);books=await dbAll(STB);}
 v29EditingBookId=b.id;document.getElementById('book-cover').value=b.cover||'';document.getElementById('book-title').value=b.title||'';document.getElementById('book-syn').value=b.synopsis||'';v29PreviewBookForm();showModal('mo-book');renderLib();
}
function v29PreviewBookForm(){const cover=document.getElementById('book-cover').value.trim();const prev=document.getElementById('book-cover-prev');if(prev){prev.className='cover-preview book-cover '+(cover?'':'gen');prev.setAttribute('style',cover?`background-image:url('${cover.replace(/'/g,'%27')}')`:'--g1:#384256;--g2:#7a5c91;--g3:#d9a868');}const syn=document.getElementById('book-syn').value||'';const c=document.getElementById('syn-count');if(c)c.textContent=syn.length+'/100';const b=books.find(x=>x.id===v29EditingBookId);const count=document.getElementById('book-chap-count');if(count)count.textContent='Capítulos: '+(v29GetChapters(b).length||0);}
let v29AutoTimer=null;function v29AutoSaveBookForm(){clearTimeout(v29AutoTimer);v29AutoTimer=setTimeout(v29SaveBookForm,350);}
async function v29SaveBookForm(){let b=books.find(x=>x.id===v29EditingBookId)||await v29LoadBook(v29EditingBookId);if(!b)return;b.kind='book';b.title=document.getElementById('book-title').value.trim()||'Novo livro';b.cover=document.getElementById('book-cover').value.trim();b.synopsis=(document.getElementById('book-syn').value||'').slice(0,100);b.source='Livro';b.updatedAt=Date.now();await dbPut(STB,b);books=await dbAll(STB);}
async function v29OpenChapterImport(id){await v29SaveBookForm();const b=books.find(x=>x.id===id)||await v29LoadBook(id);if(!b)return;v29EditingBookId=b.id;const n=(v29GetChapters(b).length||0)+1;document.getElementById('chap-num').value=n;document.getElementById('chap-title').value='Capítulo '+n;document.getElementById('chap-url').value='';document.getElementById('chap-text').value='';showModal('mo-chapter');}
async function v29ReadPdfText(file){const buf=await readFile(file);const lib=getPDFLib();if(!lib)throw new Error('PDF.js não carregou');const pdfObj=await lib.getDocument({data:buf.slice(0)}).promise;let full='';for(let p=1;p<=pdfObj.numPages;p++){const page=await pdfObj.getPage(p);const c=await page.getTextContent();full+=c.items.map(i=>i.str).join('')+'\n';}const clean=cleanRaw(full);if(!clean)throw new Error('PDF sem texto embutido; OCR ainda não está ativo neste pacote');return clean;}
async function v29SaveChapter(){let b=books.find(x=>x.id===v29EditingBookId)||await v29LoadBook(v29EditingBookId);if(!b)return;const text=cleanRaw(document.getElementById('chap-text').value||'');if(!text){toast('Capítulo vazio');return;}const n=parseInt(document.getElementById('chap-num').value||((v29GetChapters(b).length||0)+1));const title=document.getElementById('chap-title').value.trim()||('Capítulo '+n);b.chapters=v29GetChapters(b);b.chapters.push({id:v29NewId(),num:n,title,content:text,progress:0,addedAt:Date.now()});b.chapters.sort((a,b)=>(+a.num||0)-(+b.num||0));b.kind='book';b.updatedAt=Date.now();await dbPut(STB,b);books=await dbAll(STB);toast('Capítulo salvo');document.getElementById('chap-num').value=(b.chapters.length+1);document.getElementById('chap-title').value='Capítulo '+(b.chapters.length+1);document.getElementById('chap-text').value='';v29PreviewBookForm();renderLib();}
async function v29OpenChaptersEditor(id){await v29SaveBookForm();let b=books.find(x=>x.id===id)||await v29LoadBook(id);if(!b)return;v29EditingBookId=b.id;v29RenderChaptersEditor(b);showModal('mo-chapters');}
function v29RenderChaptersEditor(b){const list=document.getElementById('chapters-edit-list');const ch=v29GetChapters(b);if(!ch.length){list.innerHTML='<div class="emptyx">Nenhum capítulo ainda.</div>';return;}list.innerHTML='';ch.forEach((c,i)=>{const row=document.createElement('div');row.className='chap-row';row.draggable=true;row.dataset.cid=c.id;row.innerHTML=`<button class="chap-del" title="Excluir">×</button><input class="chap-num" type="number" min="1" value="${esc(c.num||i+1)}"><div class="chap-title">${esc(c.title||('Capítulo '+(i+1)))}</div><button class="chap-drag" title="Arrastar">☰</button>`;row.addEventListener('dragstart',()=>{v29ChapterDragId=c.id;row.classList.add('dragging');});row.addEventListener('dragend',()=>row.classList.remove('dragging'));row.addEventListener('dragover',e=>{e.preventDefault();const dragging=list.querySelector('.dragging');if(dragging&&dragging!==row){const rect=row.getBoundingClientRect();list.insertBefore(dragging,(e.clientY-rect.top)>rect.height/2?row.nextSibling:row);}});row.querySelector('.chap-del').onclick=async()=>{if(confirm('Você realmente deseja excluir este capítulo?')){let b=books.find(x=>x.id===v29EditingBookId);b.chapters=v29GetChapters(b).filter(x=>x.id!==c.id);await dbPut(STB,b);books=await dbAll(STB);v29RenderChaptersEditor(b);renderLib();}};list.appendChild(row);});}
async function v29SaveChaptersFromEditor(){let b=books.find(x=>x.id===v29EditingBookId)||await v29LoadBook(v29EditingBookId);if(!b)return;const old=new Map(v29GetChapters(b).map(c=>[c.id,c]));const rows=[...document.querySelectorAll('#chapters-edit-list .chap-row')];b.chapters=rows.map((r,i)=>{const c=old.get(r.dataset.cid);c.num=parseInt(r.querySelector('.chap-num').value||i+1);return c;});b.chapters.sort((a,b)=>(+a.num||0)-(+b.num||0));await dbPut(STB,b);books=await dbAll(STB);renderLib();}
function v29OpenChapterPicker(id){const b=books.find(x=>x.id===id);if(!b||!v29GetChapters(b).length)return;const list=document.getElementById('chap-pick-list');list.innerHTML='';v29GetChapters(b).forEach((c,i)=>{const btn=document.createElement('button');btn.className='chap-pick';btn.innerHTML=`${esc(c.title||('Capítulo '+(i+1)))}<small>Cap. ${esc(c.num||i+1)} • ${Math.round((c.progress||0)*100)}%</small>`;btn.onclick=()=>{closeModals();v29OpenBookChapter(b.id,i);};list.appendChild(btn);});showModal('mo-chap-pick');}
openBook=async function(id){const b=books.find(x=>x.id===id);if(!b)return;if(v29Kind(b)==='book'){const idx=Math.max(0,Math.min((b.lastChapterIndex||0),v29GetChapters(b).length-1));return v29OpenBookChapter(id,idx);}return v29OpenSimpleReading(id);};
async function v29OpenSimpleReading(id){curBook=books.find(b=>b.id===id);if(!curBook)return;showScreen('sr');document.getElementById('rsrc').textContent=curBook.source||curBook.title;document.getElementById('rpct').textContent=Math.round((curBook.progress||0)*100)+'%';document.querySelector('#sr .rtop')?.classList.remove('clickable');document.getElementById('rtext').innerHTML='';try{showLoad('Aguardando pinyin...');await waitPinyin();showLoad('Processando texto...');await frame();document.getElementById('rtext').innerHTML=buildHTML(curBook.content||'');applyPinyin();}catch(e){toast('Erro: '+e.message);}finally{hideLoad();}await frame();const rs=document.getElementById('rscroll');const maxS=rs.scrollHeight-rs.clientHeight;rs.scrollTop=(curBook.progress||0)*maxS;rs.onscroll=()=>v29SaveReaderProgress(rs,null);curBook.lastRead=Date.now();await dbPut(STB,curBook);}
async function v29OpenBookChapter(id,idx){curBook=books.find(b=>b.id===id)||await v29LoadBook(id);if(!curBook)return;const ch=v29GetChapters(curBook);const c=ch[idx];if(!c)return;curBook._readingChapterIndex=idx;showScreen('sr');document.querySelector('#sr .rtop')?.classList.add('clickable');document.getElementById('rsrc').textContent=(c.title||('Capítulo '+(idx+1)))+' • '+(curBook.title||'Livro');document.getElementById('rpct').textContent=Math.round((c.progress||0)*100)+'%';document.getElementById('rtext').innerHTML='';try{showLoad('Aguardando pinyin...');await waitPinyin();showLoad('Processando capítulo...');await frame();document.getElementById('rtext').innerHTML=buildHTML(c.content||'');applyPinyin();}catch(e){toast('Erro: '+e.message);}finally{hideLoad();}await frame();const rs=document.getElementById('rscroll');const maxS=rs.scrollHeight-rs.clientHeight;rs.scrollTop=(c.progress||0)*maxS;rs.onscroll=()=>v29SaveReaderProgress(rs,idx);curBook.lastRead=Date.now();curBook.lastChapterIndex=idx;await dbPut(STB,curBook);}
function v29SaveReaderProgress(rs,chapterIdx){const max=rs.scrollHeight-rs.clientHeight;if(max<=0)return;const pct=rs.scrollTop/max;document.getElementById('rpct').textContent=Math.round(pct*100)+'%';clearTimeout(rs._st);rs._st=setTimeout(async()=>{if(chapterIdx==null){curBook.progress=pct;curBook.charsRead=Math.floor(pct*(curBook.content||'').length);}else{curBook.chapters[chapterIdx].progress=pct;curBook.lastChapterIndex=chapterIdx;curBook.charsRead=(curBook.charsRead||0)+1;}curBook.lastRead=Date.now();await dbPut(STB,curBook);},450);}
// Override import saves: simple reading by default, chapter when explicitly inside chapter modal.
saveBook=async function(data){await dbPut(STB,{id:v29NewId(),kind:'simple',title:data.title,source:data.source,content:data.content||'',type:data.type,pdfData:data.pdfData||null,progress:0,lastRead:null,addedAt:Date.now(),charsRead:0});};
function v29TradMask(simp,trad){if(!trad||!simp||trad===simp)return'';const a=[...simp],b=[...trad];return '（'+a.map((c,i)=>b[i]&&b[i]!==c?b[i]:'－').join('')+'）';}
// -----------------------------------------------------------------------------
// Dicionários locais
//
// A partir da versão modular, permitimos a inclusão de dicionários off-line
// armazenados em /public/dicts. Cada arquivo JSON dentro desse diretório deve
// conter um array de objetos com as propriedades: simp, trad, pinyin e
// english (lista de definições em inglês). Quando o usuário consulta uma
// palavra no dicionário e a API online não retorna resultado (ou para
// complementar as fontes on-line), este módulo tenta carregar e consultar
// esses dicionários locais. Caso encontre alguma entrada, ela será usada.

let v29LocalDictEntries = null;

/**
 * Carrega todos os arquivos JSON em /dicts e concatena suas entradas em um
 * único array. Essa função só será executada uma vez. Os arquivos devem
 * ser servidos por Vercel em produção; em ambiente local, você também
 * conseguirá carregá-los via fetch.
 */
async function v29LoadLocalDicts(){
  if(Array.isArray(v29LocalDictEntries)) return v29LocalDictEntries;
  try {
    const list = [];
    // Procurar por até 20 dicionários. Se algum arquivo não existir,
    // simplesmente ignora.
    for(let i=1;i<=20;i++){
      const paths = [
        `/dicts/dict${i}.json`,
        `dicts/dict${i}.json`,
        `./dicts/dict${i}.json`,
        `/public/dicts/dict${i}.json`,
        `../public/dicts/dict${i}.json`
      ];
      let loaded = false;
      for(const fname of paths){
        if(loaded) break;
        try{
          const r = await fetch(fname);
          if(r && r.ok){
            const arr = await r.json();
            if(Array.isArray(arr)) list.push(...arr);
            loaded = true;
          }
        }catch{
          // arquivo ausente ou inacessível
        }
      }
    }
    v29LocalDictEntries = list;
  } catch(err){
    v29LocalDictEntries = [];
  }
  return v29LocalDictEntries;
}

/**
 * Pesquisa nos dicionários locais uma palavra ou ideograma. Retorna uma lista de
 * objetos no mesmo formato da API on-line: cada item terá simplified,
 * traditional, pinyin e english. A busca é feita por forma simplificada,
 * forma tradicional ou pinyin (sem distinguir maiúsculas/minúsculas).
 */
async function v29LocalDictSearch(q){
  const entries = await v29LoadLocalDicts();
  const results = [];
  const term = String(q || '').trim();
  if(!term) return results;
  for(const item of entries){
    try{
      const simp = item.simp || item.simplified || '';
      const trad = item.trad || item.traditional || '';
      const py = (item.pinyin || '').toLowerCase();
      if(simp === term || trad === term || py === term.toLowerCase()){
        results.push({
          simplified: simp,
          traditional: trad,
          pinyin: item.pinyin || '',
          english: item.english || []
        });
      }
    }catch{}
  }
  return results;
}

// Função que consulta a API online CC-CEDICT. Mantida para caso as fontes
// off-line não tenham a palavra. Em caso de falha na rede, retorna [] em vez
// de lançar erro.
async function v29CedictRemote(q){
  try{
    const r = await fetch(`https://cccedict.vercel.app/api/dict?q=${encodeURIComponent(q)}`,{signal:AbortSignal.timeout(6000)});
    if(!r.ok) return [];
    return await r.json();
  }catch{return [];
  }
}

// Substitui v29CedictRaw: busca primeiro nos dicionários locais; se não
// encontrar resultados, consulta a API online. Isso garante que palavras
// raras sejam resolvidas por fontes off-line.
async function v29CedictRaw(q){
  // verifica nos dicionários locais
  try{
    const local = await v29LocalDictSearch(q);
    if(local && local.length) return local;
  }catch{}
  // fallback para fonte remota
  return await v29CedictRemote(q);
}
async function v29RunDict(q){if(!q){toast('Digite uma palavra');return;}v29DictTerm=q;document.getElementById('dict-results').innerHTML='<div class="dict-card"><div class="spin sm" style="margin:0 auto"></div></div>';await v29RenderDictCurrent(true);}
async function v29RenderDictCurrent(force=false){const q=v29DictTerm;if(!q)return;document.querySelectorAll('.dict-tab').forEach(x=>x.classList.toggle('on',x.dataset.dtab===v29DictTab));const out=document.getElementById('dict-results');if(v29DictTab==='defs')return v29RenderDictDefs(q,out);if(v29DictTab==='words')return v29RenderDictWords(q,out);return v29RenderDictSentences(q,out);}
async function v29RenderDictDefs(q,out){const raw=await v29CedictRaw(q);const res=await lookupAll(q);let html='';const entry=raw&&raw[0];const py=entry?.pinyin||getWordPY(q);html+=`<div class="dict-card"><div class="dict-word">${esc(q)} <button class="dict-audio" onclick="speakWordMode('${esc(q)}','natural')">▶</button></div><div class="dict-py">${esc(py||'')}</div>${entry?`<div class="dict-trad">Tradicional ${esc(v29TradMask(entry.simplified||q,entry.traditional||''))}</div>`:''}`;if(res&&res.defs){res.defs.slice(0,5).forEach(s=>{if(s.pos)html+=`<div class="dict-pos">${esc(s.pos)}</div>`;(s.defs||[]).slice(0,7).forEach(d=>html+=`<div class="dict-def">${esc(d.text)}</div>`);});}else html+='<div class="dict-def">Sem definição encontrada nos bancos atuais.</div>';html+='</div>';out.innerHTML=html;}
async function v29RenderDictWords(q,out){const isOne=[...q].filter(isCJK).length===1;let words=[...HSK_LEVEL.keys()].filter(w=>isOne?w.includes(q):w.includes(q[0])&&w!==q).sort((a,b)=>a.length-b.length).slice(0,60);if(!words.length)words=[q];out.innerHTML=words.map(w=>{const py=getWordPY(w);const lv=HSK_LEVEL.get(w)||'?';return `<div class="dict-item"><div class="dict-item-main"><div class="zh">${esc(w)}</div><div class="py">${esc(py)} • HSK ${lv}</div><div class="en">Toque em definições para consultar o significado completo.</div></div><button class="dict-audio" onclick="speakWordMode('${esc(w)}','natural')">▶</button></div>`}).join('');}
async function v29Tatoeba(q){try{const url=`https://tatoeba.org/en/api_v0/search?from=cmn&query=${encodeURIComponent(q)}&trans_to=eng&sort=relevance&orphans=no&has_audio=&word_count_max=20`;const r=await fetch(url,{signal:AbortSignal.timeout(6500)});if(!r.ok)return[];const d=await r.json();return (d.results||[]).slice(0,8).map(x=>{let tr='';try{tr=(x.translations||[]).flat()[0]?.text||'';}catch{}return{zh:x.text||'',tr};}).filter(x=>x.zh);}catch{return[];}}
async function v29RenderDictSentences(q,out){let sents=await v29Tatoeba(q);if(!sents.length)sents=V29_LOCAL_SENTENCES.filter(s=>s.zh.includes(q));if(!sents.length)sents=V29_LOCAL_SENTENCES.slice(0,3).map(s=>({zh:s.zh.replace('这个词',q),tr:s.tr}));out.innerHTML=sents.slice(0,10).map(s=>`<div class="sent-card"><div class="sent-top"><div><div class="sent-zh">${esc(s.zh)}</div><div class="sent-py">${esc(getWordPY(s.zh))}</div></div><button class="dict-audio" onclick="speakWordMode('${esc(s.zh)}','natural')">▶</button></div><div class="sent-tr">${esc(s.tr||'Tradução humana indisponível nesta fonte.')}</div></div>`).join('');}
// Better discover cards: keep source links and allow quick book creation from a source.
renderDiscover=function(){const dc=document.getElementById('dc');if(!dc)return;dc.innerHTML=DISC.map(s=>`<div class="dcard"><div class="dico" style="background:${s.c}">${s.ic}</div><div class="dinfo"><div class="dname">${esc(s.n)}</div><div class="ddesc">${esc(s.d)}</div><div class="dlevels">${s.lv.map(l=>`<span class="dlvl ${lvlC(l)}">${l}</span>`).join('')}</div><button class="src-add" data-src-book="${esc(s.n)}">Criar livro-fonte</button></div></div>`).join('');dc.querySelectorAll('[data-src-book]').forEach(b=>b.onclick=async e=>{e.stopPropagation();const name=b.dataset.srcBook;const s=DISC.find(x=>x.n===name);const data=V29_SOURCE_IMPORTS[name]||{title:name,cover:'',synopsis:s?.d||'',chapters:[{title:'Página inicial',num:1,url:s?.url||''}]};const book={id:v29NewId(),kind:'book',title:data.title,source:'Fonte',cover:data.cover||'',synopsis:(data.synopsis||'').slice(0,100),chapters:[],lastRead:null,addedAt:Date.now(),lastChapterIndex:0};for(const [i,ch] of data.chapters.entries()){book.chapters.push({id:v29NewId(),num:ch.num||i+1,title:ch.title||('Capítulo '+(i+1)),content:`Fonte: ${ch.url}\n\nAbra o link e importe os capítulos desejados.`,progress:0,addedAt:Date.now()});}await dbPut(STB,book);books=await dbAll(STB);toast('Livro-fonte criado');});};
lookupAll=async function(word){try{const r=await lookupWikt(word);if(r)return r;}catch{}const cc=await lookupCC(word);if(cc)return cc;const mm=await lookupMM(word);if(mm)return mm;return null;};
function v29Boot(){v29InstallShell();v29InstallModals();v29Bind();document.querySelectorAll('.mo').forEach(m=>{if(!m._v29back){m.addEventListener('click',e=>{if(e.target===m)closeModals();});m._v29back=true;}});renderDiscover();renderLib();}
setTimeout(v29Boot,120);

// -----------------------------------------------------------------------------
// Sobrescreve v29RenderDictDefs para permitir uso de dicionários locais
// Quando lookupAll não retorna definições, usamos as definições vindas
// de v29CedictRaw (que agora pode ser local) como fallback. Esta função
// substitui a definição original que era monolítica e não tinha fallback.
v29RenderDictDefs = async function(q, out) {
  const raw = await v29CedictRaw(q);
  const res = await lookupAll(q);
  let html = '';
  const entry = raw && raw[0];
  const py = entry?.pinyin || getWordPY(q);
  html += `<div class="dict-card"><div class="dict-word">${esc(q)} <button class="dict-audio" onclick="speakWordMode('${esc(q)}','natural')">▶</button></div><div class="dict-py">${esc(py||'')}</div>${entry ? `<div class="dict-trad">Tradicional ${esc(v29TradMask(entry.simplified || q, entry.traditional || ''))}</div>` : ''}`;
  if(res && res.defs) {
    // Usa definições da fonte online quando disponíveis
    res.defs.slice(0,5).forEach(s => {
      if(s.pos) html += `<div class="dict-pos">${esc(s.pos)}</div>`;
      (s.defs || []).slice(0,7).forEach(d => html += `<div class="dict-def">${esc(d.text)}</div>`);
    });
  } else if(entry && Array.isArray(entry.english) && entry.english.length) {
    // Caso não haja definição em lookupAll, usa as definições do dicionário local
    html += `<div class="dict-pos">EN</div>`;
    entry.english.slice(0,7).forEach(def => {
      html += `<div class="dict-def">${esc(def)}</div>`;
    });
  } else {
    html += '<div class="dict-def">Sem definição encontrada nos bancos atuais.</div>';
  }
  html += '</div>';
  out.innerHTML = html;
};

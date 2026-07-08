
/* v5.0: Meu Perfil, sources compactas, importar online, organizar livros */
(function(){
'use strict';
const T=k=>window.hzT?window.hzT(k):({profile:'Meu Perfil',guest:'Convidado'})[k]||k;
const css=document.createElement('style');css.textContent=`
/* Perfil */
#spf{background:var(--lb)}
.spf-head{display:flex;align-items:center;gap:16px;border:1px solid rgba(var(--ac-rgb),.28);background:linear-gradient(180deg,rgba(26,22,17,.9),rgba(15,13,10,.92));border-radius:18px;padding:16px;margin-bottom:14px}
.spf-ava{width:74px;height:74px;border-radius:50%;border:2px solid rgba(var(--ac-rgb),.55);background:#191510 center/cover no-repeat;display:flex;align-items:center;justify-content:center;color:var(--ac);flex-shrink:0;cursor:pointer;position:relative;overflow:hidden}
.spf-ava svg{width:36px;height:36px}
.spf-ava .cam{position:absolute;right:-1px;bottom:-1px;width:24px;height:24px;border-radius:50%;background:var(--ac);color:#171310;display:flex;align-items:center;justify-content:center}
.spf-ava .cam svg{width:13px;height:13px}
.spf-name{flex:1;min-width:0}
.spf-name input{width:100%;background:transparent;border:0;border-bottom:1px dashed rgba(var(--ac-rgb),.4);color:#efe7d6;font-size:20px;font-weight:850;font-family:var(--rf);padding:4px 2px;outline:none}
.spf-sub{font-size:11px;color:#8a8172;letter-spacing:.1em;text-transform:uppercase;font-weight:800;margin-top:5px}
.spf-hint{display:flex;align-items:flex-start;gap:6px;font-size:11.5px;color:#9a8f7c;line-height:1.45;margin-top:9px;padding-top:8px;border-top:1px dashed rgba(var(--ac-rgb),.22)}
.spf-hint svg{flex-shrink:0;margin-top:2px;color:var(--ac)}
/* Sources compactas */
.osrc-list{display:flex;flex-direction:column;gap:9px}
.osrc-item{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:11px;align-items:center;border:1px solid #2a2a2a;background:#161616;border-radius:14px;padding:10px 11px}
.osrc-ico{width:44px;height:44px;border-radius:11px;border:1px solid rgba(var(--ac-rgb),.35);background:rgba(var(--ac-rgb),.08);display:flex;align-items:center;justify-content:center;color:var(--ac)}
.osrc-ico svg{width:22px;height:22px}
.osrc-t{font-size:14px;font-weight:800;color:#ece3d2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.osrc-u{font-size:11.5px;color:#8a8a8a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.osrc-b{display:flex;flex-direction:column;gap:6px;flex-shrink:0}
.osrc-b button,.osrc-b a{border:0;border-radius:9px;padding:7px 11px;font-size:11.5px;font-weight:850;text-decoration:none;text-align:center;display:block}
.osrc-b .imp{background:var(--ac);color:#171310}
.osrc-b .opn{background:#262626;color:#ccc}
@media(min-width:560px){.osrc-b{flex-direction:row}}
#mo-online .ms{max-width:640px;height:min(88vh,760px)}
#mo-online .mscroll{overscroll-behavior:contain}
/* Organizar livros */
body.hz-organize .book-card{animation:hzwig 0.35s ease-in-out infinite alternate;cursor:grab}
body.hz-organize .book-card.hz-drag{opacity:.65;transform:scale(1.05);z-index:10}
@keyframes hzwig{from{transform:rotate(-.7deg)}to{transform:rotate(.7deg)}}
.hz-org-x{border:1px solid rgba(var(--ac-rgb),.5)!important;color:var(--ac)!important;background:rgba(var(--ac-rgb),.1)!important}
.chap-ind{text-decoration:underline dotted;text-underline-offset:3px;cursor:pointer}
`;document.head.appendChild(css);
/* ---------- MEU PERFIL ---------- */
const GLOBE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.7 2.6 4 5.6 4 9s-1.3 6.4-4 9c-2.7-2.6-4-5.6-4-9s1.3-6.4 4-9z"/></svg>';
function pName(){try{return localStorage.getItem('hzProfileName')||T('guest');}catch(e){return T('guest');}}
function pImg(){try{return localStorage.getItem('hzProfileImg')||'';}catch(e){return'';}}
function ensureProfileScreen(){
 if(document.getElementById('spf'))return;
 const anchor=document.getElementById('ss');if(!anchor||!anchor.parentNode)return;
 const sec=document.createElement('div');sec.id='spf';sec.className='screen';
 sec.innerHTML=`<div class="bc" style="flex:1;overflow-y:auto">
   <div class="lib-title" style="font-size:24px;font-weight:800;padding:6px 2px 12px">${T('profile')}</div>
   <div class="spf-head">
     <div class="spf-ava" id="spf-ava" title="Trocar imagem"><span id="spf-ava-fallback"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="8.2" r="3.6"/><path d="M4.8 20.2c.9-3.6 3.8-5.6 7.2-5.6s6.3 2 7.2 5.6"/></svg></span><span class="cam"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg></span></div>
     <div class="spf-name"><input id="spf-name" maxlength="24" autocomplete="off"><div class="spf-sub">${T('profile')} · 漢讀</div><div class="spf-hint"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg> Toque no nome para editá-lo · toque na foto para trocar a imagem</div></div>
   </div>
   <input type="file" id="spf-file" accept="image/*" style="display:none">
   <div id="spf-stats"></div>
 </div><nav class="bnav" id="prof-nav"></nav>`;
 anchor.parentNode.insertBefore(sec,anchor.nextSibling);
 const nameIn=sec.querySelector('#spf-name');
 nameIn.value=pName();
 nameIn.addEventListener('change',()=>{try{localStorage.setItem('hzProfileName',nameIn.value.trim()||T('guest'));}catch(e){}});
 const ava=sec.querySelector('#spf-ava'),file=sec.querySelector('#spf-file');
 ava.addEventListener('click',()=>file.click());
 file.addEventListener('change',()=>{const f=file.files&&file.files[0];if(f)compressAvatar(f);file.value='';});
 applyAvatar();
}
function applyAvatar(){
 const ava=document.getElementById('spf-ava');if(!ava)return;
 const img=pImg();
 ava.style.backgroundImage=img?`url(${img})`:'';
 const fb=document.getElementById('spf-ava-fallback');if(fb)fb.style.display=img?'none':'';
}
/* compressão agressiva: 144px, WebP com qualidade decrescente até <=60KB (fallback JPEG) */
function compressAvatar(fileObj){
 const rd=new FileReader();
 rd.onload=()=>{
   const im=new Image();
   im.onload=()=>{
     try{
       const S=144,cv=document.createElement('canvas');cv.width=S;cv.height=S;
       const cx=cv.getContext('2d');
       const r=Math.max(S/im.width,S/im.height);
       const w=im.width*r,h=im.height*r;
       cx.drawImage(im,(S-w)/2,(S-h)/2,w,h);
       const LIMIT=60*1024;
       let best='';
       for(const type of ['image/webp','image/jpeg']){
         for(let q=0.8;q>=0.3;q-=0.1){
           const d=cv.toDataURL(type,q);
           if(d.length<50)continue; // formato não suportado
           if(d.length*0.75<=LIMIT){best=d;break;}
           best=best||d;
         }
         if(best&&best.length*0.75<=LIMIT)break;
       }
       if(best){
         try{localStorage.setItem('hzProfileImg',best);}catch(e){try{toast('Imagem grande demais para salvar');}catch(_){}} 
         applyAvatar();
         try{toast('Foto atualizada ('+Math.round(best.length*0.75/1024)+' KB)');}catch(e){}
       }
     }catch(e){}
   };
   im.src=rd.result;
 };
 rd.readAsDataURL(fileObj);
}
window.hzOpenProfile=function(){
 ensureProfileScreen();
 const pn=document.getElementById('prof-nav');
 if(pn&&typeof v29NavHTML==='function')pn.innerHTML=v29NavHTML('profile');
 const ni=document.getElementById('spf-name');if(ni&&!ni.value)ni.value=pName();
 showScreen('spf');
 try{if(window.hzStatsRender)window.hzStatsRender();}catch(e){}
 document.querySelectorAll('.ni[data-tab]').forEach(n=>n.classList.remove('on'));
 document.querySelectorAll('.ni[data-tab="profile"]').forEach(n=>n.classList.add('on'));
};
/* ---------- SOURCES COMPACTAS + IMPORTAR ONLINE ---------- */
function srcHost(u){try{return new URL(u).host+new URL(u).pathname.replace(/\/$/,'');}catch(e){return u||'fonte manual';}}
function osrcCard(sr,i,ctx){
 const dest=sr.type==='book'?'Livros':'Leitura simples';
 return `<div class="osrc-item"><div class="osrc-ico">${GLOBE}</div>
  <div style="min-width:0"><div class="osrc-t">${esc(sr.title)}</div><div class="osrc-u">${esc(sr.url?srcHost(sr.url):'Fonte manual · '+dest)}</div></div>
  <div class="osrc-b"><button class="imp" data-osrc-imp="${i}" title="Importar para ${dest}">Importar → ${dest==='Livros'?'Livros':'Leitura'}</button>${sr.url?`<a class="opn" href="${esc(sr.url)}" target="_blank" rel="noopener">Abrir source</a>`:''}</div></div>`;
}
async function hzImportOnline(i){
 try{
   await v34AddSource(i);
   const sr=V34_SOURCES[i];
   document.getElementById('mo-online')?.classList.remove('open');
   document.getElementById('mo-import')?.classList.remove('open');
   const btn=document.getElementById(sr.type==='book'?'mode-books':'mode-simple');
   if(btn)btn.click(); else renderLib();
   showScreen('sl');
 }catch(e){}
}
function wireOsrc(root){
 root.querySelectorAll('[data-osrc-imp]').forEach(b=>b.onclick=()=>hzImportOnline(+b.dataset.osrcImp));
}
/* substitui o seletor grande por lista compacta na tela Sources */
function compactDiscover(){
 const dc=document.getElementById('dc');if(!dc)return;
 dc.innerHTML='<div class="osrc-list">'+V34_SOURCES.map((sr,i)=>osrcCard(sr,i)).join('')+'</div>';
 wireOsrc(dc);
}
try{window.renderDiscover=compactDiscover;}catch(e){}
setTimeout(compactDiscover,1200);setTimeout(compactDiscover,3000);
/* modal Importar de source online */
function ensureOnlineModal(){
 if(document.getElementById('mo-online'))return;
 document.body.insertAdjacentHTML('beforeend',`<div class="mo" id="mo-online"><div class="ms">
  <div class="mbar"><div class="mhd"></div><button class="mx" id="mo-online-x" aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
  <div class="mtitle">Importar de source online</div>
  <div class="mscroll"><div class="osrc-list" id="mo-online-list"></div></div>
 </div></div>`);
 document.getElementById('mo-online-x').onclick=()=>document.getElementById('mo-online').classList.remove('open');
 document.getElementById('mo-online').addEventListener('click',e=>{if(e.target.id==='mo-online')e.target.classList.remove('open');});
}
function openOnlineModal(){
 ensureOnlineModal();
 const l=document.getElementById('mo-online-list');
 l.innerHTML=V34_SOURCES.map((sr,i)=>osrcCard(sr,i)).join('');
 wireOsrc(l);
 document.getElementById('mo-online').classList.add('open');
}
/* opção no topo do modal de importação */
function installImportOption(){
 const scroll=document.querySelector('#mo-import .mscroll');
 if(!scroll||document.getElementById('oonline'))return;
 scroll.insertAdjacentHTML('afterbegin',`<div class="iopt" id="oonline">
   <div class="iico" style="background:linear-gradient(135deg,rgba(var(--ac-rgb),.85),rgba(var(--ac-rgb),.45));display:flex;align-items:center;justify-content:center;color:#171310">${GLOBE}</div>
   <div><div class="ilbl">Importar de source online</div><div class="isub">Leituras e livros prontos, em um toque</div></div></div>`);
 document.getElementById('oonline').addEventListener('click',()=>{openOnlineModal();});
}
/* ---------- ORGANIZAR LIVROS (long-press -> arrastar; X encerra) ---------- */
window.hzEnterOrganize=function(){
 if(document.body.classList.contains('hz-organize'))return;
 if((v29LibMode||'simple')!=='books')return;
 document.body.classList.add('hz-organize');
 try{navigator.vibrate&&navigator.vibrate(20);}catch(e){}
 hzDecorateOrganize();
 try{toast('Arraste para reorganizar · toque no X para concluir');}catch(e){}
};
window.hzDecorateOrganize=function(){
 const tools=document.querySelector('#bc .lib-tools');
 const on=document.body.classList.contains('hz-organize');
 let x=document.getElementById('hz-org-x');
 if(on&&tools&&!x){
   tools.insertAdjacentHTML('beforeend','<button class="lib-chip hz-org-x" id="hz-org-x">✕ Concluir</button>');
   document.getElementById('hz-org-x').onclick=hzExitOrganize;
 }else if(!on&&x)x.remove();
 if(on)hzWireDrag();
};
function hzExitOrganize(){document.body.classList.remove('hz-organize');const x=document.getElementById('hz-org-x');if(x)x.remove();hzPersistOrder();}
function hzWireDrag(){
 const wrap=document.getElementById('book-wrap');
 if(!wrap||wrap._hzDrag)return;wrap._hzDrag=true;
 let drag=null;
 wrap.addEventListener('pointerdown',e=>{
   if(!document.body.classList.contains('hz-organize'))return;
   const card=e.target.closest('.book-card');if(!card)return;
   drag=card;card.classList.add('hz-drag');
   try{card.setPointerCapture(e.pointerId);}catch(err){}
   e.preventDefault();
 });
 wrap.addEventListener('pointermove',e=>{
   if(!drag)return;
   const el=document.elementFromPoint(e.clientX,e.clientY);
   const over=el&&el.closest?el.closest('.book-card'):null;
   if(over&&over!==drag&&over.parentNode===wrap){
     const r=over.getBoundingClientRect();
     const before=(e.clientY<r.top+r.height/2)||(e.clientX<r.left+r.width/2&&Math.abs(e.clientY-(r.top+r.height/2))<r.height/2);
     wrap.insertBefore(drag,before?over:over.nextSibling);
   }
 });
 const up=()=>{if(drag){drag.classList.remove('hz-drag');drag=null;hzPersistOrder();}};
 wrap.addEventListener('pointerup',up);wrap.addEventListener('pointercancel',up);
}
async function hzPersistOrder(){
 try{
   const wrap=document.getElementById('book-wrap');if(!wrap)return;
   const ids=[...wrap.querySelectorAll('.book-card')].map(c=>c.dataset.bookId);
   let changed=false;
   ids.forEach((id,i)=>{const b=books.find(x=>String(x.id)===String(id));if(b&&b.order!==i){b.order=i;changed=true;}});
   if(changed){for(const b of books){if(typeof b.order==='number')await dbPut(STB,b);}}
 }catch(e){}
}
function boot(){try{ensureProfileScreen();}catch(e){}try{installImportOption();}catch(e){}try{compactDiscover();}catch(e){}}
setTimeout(boot,800);setTimeout(boot,2400);
})();

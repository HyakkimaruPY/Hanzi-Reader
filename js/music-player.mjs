/*
 * Player de Guzheng do Hanzi Reader.
 * Uma única instância de áudio sobrevive à navegação quando minimizada.
 * Eventos de drag só existem durante a interação; close() libera áudio,
 * listeners transitórios, timers e elementos flutuantes.
 */
const TRACKS=Array.isArray(window.HZ_GUZHENG_TRACKS)?window.HZ_GUZHENG_TRACKS:[];
const COVER='assets/guzheng.svg';
const FAVORITES_KEY='v43Favorites';
const VOLUME_KEY='hzMusicVolume.v1';
const POSITION_KEY='hzMusicMiniPosition.v1';
const $=(selector,root=document)=>root.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
const fmt=value=>{const total=Math.max(0,Math.floor(Number(value)||0));return `${Math.floor(total/60)}:${String(total%60).padStart(2,'0')}`;};
const isEnglish=()=>String(window.hzLang?.()||document.documentElement.lang||'pt').toLowerCase().startsWith('en');
const copy=()=>isEnglish()?{
  album:'Guzheng',artist:'Fu Na · 發燒古箏',library:'Music library',tracks:'42 tracks',search:'Search music…',pick:'Choose a track',instrument:'Traditional Chinese strings',empty:'No music found.',mini:'Music player',close:'Close player',minimize:'Minimize player',expand:'Expand player',previous:'Previous',next:'Next',play:'Play',pause:'Pause',shuffle:'Shuffle',repeat:'Repeat',volume:'Volume',favorite:'Favorite'
}:{
  album:'Guzheng',artist:'Fu Na · 發燒古箏',library:'Biblioteca musical',tracks:'42 faixas',search:'Buscar música…',pick:'Escolha uma faixa',instrument:'Cordas tradicionais chinesas',empty:'Nenhuma música encontrada.',mini:'Player de música',close:'Fechar player',minimize:'Minimizar player',expand:'Expandir player',previous:'Anterior',next:'Próxima',play:'Reproduzir',pause:'Pausar',shuffle:'Aleatório',repeat:'Repetir',volume:'Volume',favorite:'Favoritar'
};

const state={
  audio:null,audioHandlers:null,currentId:null,shuffle:false,repeat:false,minimized:false,installed:false,
  renderFrame:0,searchTimer:0,volumeTimer:0,resizeFrame:0,resizeHandler:null,
  drag:null,position:null,wasPlaying:false,screenHandler:null
};
const refs={};

function readJSON(key,fallback){try{const value=JSON.parse(localStorage.getItem(key)||'null');return value??fallback;}catch{return fallback;}}
function favorites(){const value=readJSON(FAVORITES_KEY,[]);return new Set(Array.isArray(value)?value.map(Number):[]);}
function writeFavorites(set){try{localStorage.setItem(FAVORITES_KEY,JSON.stringify([...set]));}catch{}}
function initialVolume(){const value=Number(localStorage.getItem(VOLUME_KEY));return Number.isFinite(value)?Math.max(0,Math.min(1,value)):.78;}
function saveVolumeLater(value){clearTimeout(state.volumeTimer);state.volumeTimer=setTimeout(()=>{try{localStorage.setItem(VOLUME_KEY,String(value));}catch{}},180);}
function icon(name){
  const icons={
    play:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.8v14.4L19 12 7 4.8z"/></svg>',
    pause:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 4h4v16h-4zM13.5 4h4v16h-4z"/></svg>',
    prev:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2v14H6zM18 5.5v13L9 12l9-6.5z"/></svg>',
    next:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 5h2v14h-2zM6 5.5v13l9-6.5-9-6.5z"/></svg>',
    shuffle:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h3c5 0 5 10 10 10h5"/><path d="M18 14l3 3-3 3"/><path d="M3 17h3c2.2 0 3.4-1.9 4.6-4"/><path d="M14 7c.7 0 1.3 0 2 0h5"/><path d="M18 4l3 3-3 3"/></svg>',
    repeat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 013-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 01-3 3H3"/></svg>',
    volume:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M15 9a4 4 0 010 6M18 6a8 8 0 010 12"/></svg>',
    minimize:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 17h14"/></svg>',
    expand:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg>',
    close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/></svg>',
    star:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2.7l2.8 5.8 6.4.9-4.6 4.5 1.1 6.4-5.7-3-5.7 3 1.1-6.4-4.6-4.5 6.4-.9L12 2.7z"/></svg>'
  };return icons[name]||'';
}

function install(){
  if(state.installed)return true;
  refs.modal=$('#mo-music');
  if(!refs.modal)return false;
  Object.assign(refs,{
    list:$('#hz-music-list'),search:$('#hz-music-search'),title:$('#hz-music-current-title'),sub:$('#hz-music-current-sub'),
    seek:$('#hz-music-seek'),elapsed:$('#hz-music-elapsed'),duration:$('#hz-music-duration'),play:$('#hz-music-play'),
    prev:$('#hz-music-prev'),next:$('#hz-music-next'),shuffle:$('#hz-music-shuffle'),repeat:$('#hz-music-repeat'),
    volume:$('#hz-music-volume'),volumeValue:$('#hz-music-volume-value'),minimize:$('#hz-music-minimize'),close:$('#hz-music-close')
  });
  if(refs.prev)refs.prev.innerHTML=icon('prev');
  if(refs.next)refs.next.innerHTML=icon('next');
  if(refs.shuffle)refs.shuffle.innerHTML=icon('shuffle');
  if(refs.repeat)refs.repeat.innerHTML=icon('repeat');
  refs.minimize?.addEventListener('click',minimize);
  refs.close?.addEventListener('click',close);
  refs.play?.addEventListener('click',togglePlay);
  refs.prev?.addEventListener('click',previous);
  refs.next?.addEventListener('click',next);
  refs.shuffle?.addEventListener('click',()=>{state.shuffle=!state.shuffle;if(state.shuffle)state.repeat=false;updateControls();});
  refs.repeat?.addEventListener('click',()=>{state.repeat=!state.repeat;if(state.repeat)state.shuffle=false;updateControls();});
  refs.seek?.addEventListener('input',event=>{const audio=state.audio;if(!audio||!Number.isFinite(audio.duration))return;audio.currentTime=(Number(event.target.value)/1000)*audio.duration;scheduleUI();});
  refs.volume?.addEventListener('input',event=>{const value=Math.max(0,Math.min(1,Number(event.target.value)/100));ensureAudio().volume=value;updateVolume(value);saveVolumeLater(value);});
  refs.search?.addEventListener('input',()=>{clearTimeout(state.searchTimer);state.searchTimer=setTimeout(renderList,90);});
  refs.list?.addEventListener('click',event=>{
    const fav=event.target.closest('[data-music-fav]');
    if(fav){event.preventDefault();event.stopPropagation();toggleFavorite(Number(fav.dataset.musicFav));return;}
    const row=event.target.closest('[data-music-track]');if(row)playTrack(Number(row.dataset.musicTrack));
  });
  refs.list?.addEventListener('keydown',event=>{
    if(event.key!=='Enter'&&event.key!==' ')return;
    const fav=event.target.closest('[data-music-fav]');
    if(fav){event.preventDefault();event.stopPropagation();toggleFavorite(Number(fav.dataset.musicFav));return;}
    const row=event.target.closest('[data-music-track]');
    if(row){event.preventDefault();playTrack(Number(row.dataset.musicTrack));}
  });
  refs.modal.addEventListener('click',event=>{if(event.target===refs.modal)minimize();});
  refs.modal.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();minimize();}});
  state.installed=true;
  renderList();updateUI();
  return true;
}

function ensureAudio(){
  if(state.audio)return state.audio;
  const audio=new Audio();audio.preload='metadata';audio.volume=initialVolume();
  const handlers={timeupdate:scheduleUI,durationchange:scheduleUI,loadedmetadata:scheduleUI,play:scheduleUI,pause:scheduleUI,ended:onEnded,error:()=>{refs.sub&&(refs.sub.textContent=isEnglish()?'Could not load this track.':'Não foi possível carregar esta faixa.');scheduleUI();}};
  Object.entries(handlers).forEach(([type,handler])=>audio.addEventListener(type,handler));
  state.audio=audio;state.audioHandlers=handlers;updateVolume(audio.volume);return audio;
}
function destroyAudio(){
  const audio=state.audio;if(!audio)return;
  try{audio.pause();audio.removeAttribute('src');audio.load();}catch{}
  if(state.audioHandlers)Object.entries(state.audioHandlers).forEach(([type,handler])=>audio.removeEventListener(type,handler));
  state.audioHandlers=null;state.audio=null;
}
function currentTrack(){return TRACKS.find(item=>Number(item.id)===Number(state.currentId))||null;}
function playTrack(id,{autoplay=true}={}){
  const track=TRACKS.find(item=>Number(item.id)===Number(id));if(!track)return;
  const audio=ensureAudio();const changed=state.currentId!==track.id||audio.src!==track.url;
  state.currentId=track.id;
  if(changed){try{audio.pause();}catch{}audio.src=track.url;audio.currentTime=0;audio.preload='auto';}
  renderList();updateUI();
  if(autoplay)audio.play().catch(()=>{scheduleUI();});
  dispatchState('track');
}
function togglePlay(){
  const audio=ensureAudio();
  if(state.currentId==null){playTrack(TRACKS[0]?.id);return;}
  if(audio.paused)audio.play().catch(()=>{});else audio.pause();scheduleUI();
}
function next(){if(!TRACKS.length)return;let index=TRACKS.findIndex(item=>item.id===state.currentId);if(state.shuffle){let candidate=index;while(TRACKS.length>1&&candidate===index)candidate=Math.floor(Math.random()*TRACKS.length);index=candidate;}else index=(index+1+TRACKS.length)%TRACKS.length;playTrack(TRACKS[index].id);}
function previous(){if(!TRACKS.length)return;const audio=state.audio;if(audio&&audio.currentTime>4){audio.currentTime=0;scheduleUI();return;}let index=TRACKS.findIndex(item=>item.id===state.currentId);index=(index-1+TRACKS.length)%TRACKS.length;playTrack(TRACKS[index].id);}
function onEnded(){if(state.repeat){if(state.audio){state.audio.currentTime=0;state.audio.play().catch(()=>{});}return;}next();}
function toggleFavorite(id){const set=favorites();if(set.has(id))set.delete(id);else set.add(id);writeFavorites(set);renderList();}

function renderList(){
  if(!refs.list)return;const c=copy(),q=String(refs.search?.value||'').trim().toLowerCase(),fav=favorites();
  const items=TRACKS.filter(track=>!q||track.title.toLowerCase().includes(q)||track.num.includes(q)).sort((a,b)=>Number(fav.has(b.id))-Number(fav.has(a.id))||a.id-b.id);
  if(!items.length){refs.list.innerHTML=`<div class="hz-music-empty">${esc(c.empty)}</div>`;return;}
  refs.list.innerHTML=items.map(track=>`<div class="hz-music-track${track.id===state.currentId?' active':''}" data-music-track="${track.id}" role="button" tabindex="0" aria-current="${track.id===state.currentId?'true':'false'}"><span class="hz-music-track-num">${esc(track.num)}</span><span class="hz-music-track-copy"><strong>${esc(track.title)}</strong><span>${esc(c.instrument)}</span></span><span class="hz-music-track-dur">${fmt(track.dur)}</span><button class="hz-music-fav${fav.has(track.id)?' on':''}" type="button" data-music-fav="${track.id}" aria-label="${esc(c.favorite)}">${icon('star')}</button></div>`).join('');
}
function scheduleUI(){if(state.renderFrame)return;state.renderFrame=requestAnimationFrame(()=>{state.renderFrame=0;updateUI();updateMini();});}
function updateUI(){
  const c=copy(),audio=state.audio,track=currentTrack(),duration=Number.isFinite(audio?.duration)?audio.duration:(track?.dur||0),current=audio?.currentTime||0,ratio=duration?Math.max(0,Math.min(1,current/duration)):0;
  if(refs.title)refs.title.textContent=track?`${track.num} · ${track.title}`:c.pick;
  if(refs.sub)refs.sub.textContent=track?c.artist:c.instrument;
  if(refs.elapsed)refs.elapsed.textContent=fmt(current);if(refs.duration)refs.duration.textContent=fmt(duration);
  if(refs.seek){refs.seek.value=String(Math.round(ratio*1000));refs.seek.style.setProperty('--range-progress',`${ratio*100}%`);refs.seek.disabled=!track;}
  if(refs.play){refs.play.innerHTML=audio&&!audio.paused?icon('pause'):icon('play');refs.play.setAttribute('aria-label',audio&&!audio.paused?c.pause:c.play);}
  updateControls();
}
function updateControls(){const c=copy();refs.shuffle?.classList.toggle('on',state.shuffle);refs.repeat?.classList.toggle('on',state.repeat);refs.shuffle?.setAttribute('aria-pressed',String(state.shuffle));refs.repeat?.setAttribute('aria-pressed',String(state.repeat));refs.shuffle?.setAttribute('aria-label',c.shuffle);refs.repeat?.setAttribute('aria-label',c.repeat);}
function updateVolume(value=state.audio?.volume??initialVolume()){if(refs.volume){refs.volume.value=String(Math.round(value*100));refs.volume.style.setProperty('--range-progress',`${value*100}%`);}if(refs.volumeValue)refs.volumeValue.textContent=`${Math.round(value*100)}%`;}

function open(){
  if(!install())return;
  document.querySelectorAll('.mo.open').forEach(modal=>{if(modal!==refs.modal)modal.classList.remove('open');});
  removeMini(false);state.minimized=false;refs.modal.classList.add('open');refs.modal.setAttribute('aria-hidden','false');document.body.classList.add('hz-music-expanded');
  renderList();updateUI();requestAnimationFrame(()=>refs.search?.focus({preventScroll:true}));dispatchState('open');
}
function minimize(){
  if(!install())return;
  refs.modal.classList.remove('open');refs.modal.setAttribute('aria-hidden','true');document.body.classList.remove('hz-music-expanded');state.minimized=true;createMini();dispatchState('minimize');
}
function close(){
  if(state.renderFrame)cancelAnimationFrame(state.renderFrame);state.renderFrame=0;clearTimeout(state.searchTimer);clearTimeout(state.volumeTimer);
  refs.modal?.classList.remove('open');refs.modal?.setAttribute('aria-hidden','true');document.body.classList.remove('hz-music-expanded');
  removeMini(true);destroyAudio();state.currentId=null;state.minimized=false;state.shuffle=false;state.repeat=false;
  renderList();updateUI();dispatchState('close');
}
function isExpanded(){return Boolean(refs.modal?.classList.contains('open'));}
function minimizeIfExpanded(){if(isExpanded())minimize();}

function miniMarkup(){
  const c=copy(),track=currentTrack();return `<div class="hz-music-mini-art" data-drag-handle="true" aria-label="${esc(c.mini)}"><img src="${COVER}" alt="" draggable="false"></div><div class="hz-music-mini-copy" data-drag-handle="true"><strong>${esc(track?track.title:c.pick)}</strong><span>${esc(c.album)} · ${esc(c.artist)}</span></div><div class="hz-music-mini-actions"><button type="button" data-action="play" aria-label="${esc(state.audio&&!state.audio.paused?c.pause:c.play)}">${state.audio&&!state.audio.paused?icon('pause'):icon('play')}</button><button type="button" data-action="expand" aria-label="${esc(c.expand)}">${icon('expand')}</button><button type="button" data-action="close" aria-label="${esc(c.close)}">${icon('close')}</button></div><div class="hz-music-mini-progress"><i></i></div>`;}
function createMini(){
  let mini=$('#hz-music-mini');
  if(!mini){mini=document.createElement('aside');mini.id='hz-music-mini';mini.className='hz-music-mini';mini.setAttribute('role','region');document.body.appendChild(mini);mini.addEventListener('click',onMiniClick);mini.addEventListener('pointerdown',startDrag);}
  mini.innerHTML=miniMarkup();restoreMiniPosition(mini);installResizeClamp();updateMini();
}
function updateMini(){const mini=$('#hz-music-mini');if(!mini)return;const track=currentTrack(),audio=state.audio,duration=Number.isFinite(audio?.duration)?audio.duration:(track?.dur||0),ratio=duration?Math.max(0,Math.min(1,(audio?.currentTime||0)/duration)):0;const title=$('.hz-music-mini-copy strong',mini);if(title)title.textContent=track?track.title:copy().pick;const play=$('[data-action="play"]',mini);if(play){play.innerHTML=audio&&!audio.paused?icon('pause'):icon('play');play.setAttribute('aria-label',audio&&!audio.paused?copy().pause:copy().play);}mini.style.setProperty('--mini-progress',String(ratio));}
function onMiniClick(event){const action=event.target.closest('[data-action]')?.dataset.action;if(!action)return;if(action==='play')togglePlay();if(action==='expand')open();if(action==='close')close();}
function removeMini(clearPosition){const mini=$('#hz-music-mini');if(mini){mini.removeEventListener('click',onMiniClick);mini.removeEventListener('pointerdown',startDrag);mini.removeEventListener('pointermove',moveDrag);mini.removeEventListener('pointerup',endDrag);mini.removeEventListener('pointercancel',endDrag);mini.remove();}uninstallResizeClamp();state.drag=null;if(clearPosition){state.position=null;try{localStorage.removeItem(POSITION_KEY);}catch{}}}

function viewport(){const vv=window.visualViewport;return{left:vv?.offsetLeft||0,top:vv?.offsetTop||0,width:vv?.width||innerWidth,height:vv?.height||innerHeight};}
function boundsFor(mini){const vp=viewport(),rect=mini.getBoundingClientRect(),active=document.querySelector('.screen.active'),nav=active?.querySelector('.bnav:not(.rbnav)');const navRect=nav?.getBoundingClientRect();const navTop=navRect&&navRect.height>0?navRect.top:vp.top+vp.height;const pad=10;return{minX:vp.left+pad,maxX:Math.max(vp.left+pad,vp.left+vp.width-rect.width-pad),minY:vp.top+pad,maxY:Math.max(vp.top+pad,Math.min(navTop-pad,vp.top+vp.height-pad)-rect.height)};}
function clamp(value,min,max){return Math.min(max,Math.max(min,value));}
function clampMini(mini,x,y,{save=false}={}){const b=boundsFor(mini),nx=clamp(x,b.minX,b.maxX),ny=clamp(y,b.minY,b.maxY);mini.style.left=`${Math.round(nx)}px`;mini.style.top=`${Math.round(ny)}px`;mini.style.right='auto';mini.style.bottom='auto';state.position={x:nx,y:ny};if(save){try{localStorage.setItem(POSITION_KEY,JSON.stringify(state.position));}catch{}}}
function restoreMiniPosition(mini){
  const saved=state.position||readJSON(POSITION_KEY,null);requestAnimationFrame(()=>{
    const rect=mini.getBoundingClientRect();if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y))clampMini(mini,saved.x,saved.y);else{const b=boundsFor(mini);clampMini(mini,b.maxX,b.maxY);}
  });
}
function startDrag(event){
  const mini=event.currentTarget;if(event.button!=null&&event.button!==0)return;if(event.target.closest('button')||!event.target.closest('[data-drag-handle]'))return;
  const rect=mini.getBoundingClientRect();state.drag={pointerId:event.pointerId,dx:event.clientX-rect.left,dy:event.clientY-rect.top};mini.classList.add('dragging');mini.setPointerCapture?.(event.pointerId);mini.addEventListener('pointermove',moveDrag);mini.addEventListener('pointerup',endDrag,{once:true});mini.addEventListener('pointercancel',endDrag,{once:true});event.preventDefault();
}
function moveDrag(event){const mini=event.currentTarget;if(!state.drag||event.pointerId!==state.drag.pointerId)return;clampMini(mini,event.clientX-state.drag.dx,event.clientY-state.drag.dy);event.preventDefault();}
function endDrag(event){const mini=event.currentTarget;mini.removeEventListener('pointermove',moveDrag);mini.classList.remove('dragging');try{mini.releasePointerCapture?.(event.pointerId);}catch{}if(state.position)clampMini(mini,state.position.x,state.position.y,{save:true});state.drag=null;}
function installResizeClamp(){if(state.resizeHandler)return;state.resizeHandler=()=>{if(state.resizeFrame)return;state.resizeFrame=requestAnimationFrame(()=>{state.resizeFrame=0;const mini=$('#hz-music-mini');if(mini){const rect=mini.getBoundingClientRect();clampMini(mini,state.position?.x??rect.left,state.position?.y??rect.top);}});};state.screenHandler=()=>{requestAnimationFrame(()=>state.resizeHandler?.());};window.addEventListener('resize',state.resizeHandler,{passive:true});window.visualViewport?.addEventListener('resize',state.resizeHandler,{passive:true});document.addEventListener('hz:screen-change',state.screenHandler,{passive:true});}
function uninstallResizeClamp(){if(!state.resizeHandler)return;window.removeEventListener('resize',state.resizeHandler);window.visualViewport?.removeEventListener('resize',state.resizeHandler);if(state.screenHandler)document.removeEventListener('hz:screen-change',state.screenHandler);state.resizeHandler=null;state.screenHandler=null;if(state.resizeFrame)cancelAnimationFrame(state.resizeFrame);state.resizeFrame=0;}
function dispatchState(reason){window.dispatchEvent(new CustomEvent('hz:music-state',{detail:{reason,currentId:state.currentId,minimized:state.minimized,playing:Boolean(state.audio&&!state.audio.paused)}}));}

function boot(){install();window.hzOpenMusic=open;window.hzMusicPlayer={open,minimize,minimizeIfExpanded,close,isExpanded,isPlaying:()=>Boolean(state.audio&&!state.audio.paused),getState:()=>({currentId:state.currentId,minimized:state.minimized,playing:Boolean(state.audio&&!state.audio.paused),volume:state.audio?.volume??initialVolume()}),playTrack};window.hzMusicController={stop:close,openPicker:open,isPlaying:()=>Boolean(state.audio&&!state.audio.paused)};if(refs.modal?.classList.contains('open'))open();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();

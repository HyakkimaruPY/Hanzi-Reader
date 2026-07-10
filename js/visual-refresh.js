/* Hanzi Reader — visual/UX refresh (classic script, intentionally dependency-free). */
(function(){
'use strict';

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const lang=()=>{try{return window.hzLang?window.hzLang():'pt';}catch(_){return'pt';}};
const copy=()=>lang()==='en'?{
  writing:'Hanzi writing',writingSub:'Trace characters and practise motor memory',character:'Character to practise',random:'New',undo:'Undo',clear:'Clear',done:'Finish practice',strokes:'strokes',saved:'Practice recorded',
  profileSummary:'Today’s study',goal:'of a 30 min daily goal',streak:'day streak',best:'best',activities:'Activities',accumulated:'Accumulated study',last14:'Activity · last 14 days',today:'Today',
  read:'Reading',game:'Tone game',dictionary:'Dictionary',review:'Review',audio:'Audio heard',searched:'Words searched',wordReview:'Words reviewed',sentenceReview:'Sentences reviewed',minutes:'min'
}:{
  writing:'Escrita de Hanzi',writingSub:'Trace caracteres e pratique a memória motora',character:'Caractere para praticar',random:'Novo',undo:'Desfazer',clear:'Limpar',done:'Concluir prática',strokes:'traços',saved:'Prática registrada',
  profileSummary:'Estudo de hoje',goal:'de uma meta diária de 30 min',streak:'dias de sequência',best:'recorde',activities:'Atividades',accumulated:'Estudo acumulado',last14:'Atividade · últimos 14 dias',today:'Hoje',
  read:'Leitura',game:'Jogo de tons',dictionary:'Dicionário',review:'Revisão',audio:'Áudio ouvido',searched:'Palavras pesquisadas',wordReview:'Palavras revisadas',sentenceReview:'Frases revisadas',minutes:'min'
};

/* ---------- Select acessível e customizado ---------- */
let openSelect=null;
const selectMenu=shell=>shell?._hzMenu||$('.hz-select-menu',shell);
function closeSelect(shell,focus){
  if(!shell)return;
  shell.classList.remove('open');
  const trigger=$('.hz-select-trigger',shell),menu=selectMenu(shell);
  if(trigger)trigger.setAttribute('aria-expanded','false');
  if(menu){menu.classList.remove('hz-floating');menu.removeAttribute('style');if(menu.parentNode!==shell)shell.appendChild(menu);}
  if(openSelect===shell)openSelect=null;
  if(focus&&trigger)trigger.focus();
}
function floatSelectMenu(shell){
  const trigger=$('.hz-select-trigger',shell),menu=selectMenu(shell);if(!trigger||!menu)return;
  const r=trigger.getBoundingClientRect();document.body.appendChild(menu);menu.classList.add('hz-floating');
  menu.style.minWidth=Math.max(138,Math.round(r.width))+'px';menu.style.maxHeight=Math.min(280,window.innerHeight-24)+'px';menu.style.overflowY='auto';
  const width=Math.max(r.width,menu.getBoundingClientRect().width);menu.style.width=Math.round(width)+'px';
  const h=Math.min(menu.scrollHeight,280),below=window.innerHeight-r.bottom-8,above=r.top-8;
  const down=below>=Math.min(h,180)||below>=above;const top=down?r.bottom+6:Math.max(8,r.top-h-6);
  const left=Math.min(window.innerWidth-width-8,Math.max(8,r.right-width));
  menu.style.left=Math.round(left)+'px';menu.style.top=Math.round(top)+'px';
}
function syncSelect(select){
  const shell=select.closest('.hz-select-shell');if(!shell)return;
  const opt=select.options[select.selectedIndex]||select.options[0];
  const trigger=$('.hz-select-trigger',shell);
  if(trigger)trigger.textContent=opt?opt.textContent:'';
  $$('.hz-select-option',selectMenu(shell)||shell).forEach((b,i)=>{
    const on=i===select.selectedIndex;
    if(select.options[i])b.textContent=select.options[i].textContent;
    b.setAttribute('aria-selected',String(on));
    b.tabIndex=on?0:-1;
  });
}
function chooseOption(select,index){
  const opt=select.options[index];if(!opt||opt.disabled)return;
  select.selectedIndex=index;
  select.dispatchEvent(new Event('input',{bubbles:true}));
  select.dispatchEvent(new Event('change',{bubbles:true}));
  syncSelect(select);
  closeSelect(select.closest('.hz-select-shell'),true);
}
function enhanceSelect(select){
  if(!select||select.dataset.hzCustom==='1'||select.multiple||select.size>1)return;
  select.dataset.hzCustom='1';
  const shell=document.createElement('div');shell.className='hz-select-shell';
  const trigger=document.createElement('button');trigger.type='button';trigger.className='hz-select-trigger';
  trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
  const list=document.createElement('div');list.className='hz-select-menu';list.setAttribute('role','listbox');shell._hzMenu=list;
  const listId='hz-select-'+Math.random().toString(36).slice(2);list.id=listId;trigger.setAttribute('aria-controls',listId);
  Array.from(select.options).forEach((opt,i)=>{
    const b=document.createElement('button');b.type='button';b.className='hz-select-option';b.setAttribute('role','option');
    b.textContent=opt.textContent;b.disabled=opt.disabled;b.dataset.index=String(i);
    b.addEventListener('click',e=>{e.stopPropagation();chooseOption(select,i);});
    list.appendChild(b);
  });
  select.parentNode.insertBefore(shell,select);shell.append(trigger,select,list);select.classList.add('hz-native-select');
  trigger.addEventListener('click',e=>{
    e.stopPropagation();
    if(openSelect&&openSelect!==shell)closeSelect(openSelect,false);
    const on=!shell.classList.contains('open');
    shell.classList.toggle('open',on);trigger.setAttribute('aria-expanded',String(on));openSelect=on?shell:null;
    if(on){floatSelectMenu(shell);const active=$('.hz-select-option[aria-selected="true"]',list)||$('.hz-select-option',list);active?.focus();}
  });
  const keyHandler=e=>{
    const options=$$('.hz-select-option:not(:disabled)',list);if(!options.length)return;
    const current=Math.max(0,options.indexOf(document.activeElement));
    if(e.key==='Escape'){e.preventDefault();closeSelect(shell,true);return;}
    if(e.key==='ArrowDown'||e.key==='ArrowUp'||e.key==='Home'||e.key==='End'){
      e.preventDefault();let n=current;
      if(e.key==='ArrowDown')n=(current+1)%options.length;
      if(e.key==='ArrowUp')n=(current-1+options.length)%options.length;
      if(e.key==='Home')n=0;if(e.key==='End')n=options.length-1;options[n].focus();
    }
    if((e.key==='Enter'||e.key===' ')&&document.activeElement.classList.contains('hz-select-option')){
      e.preventDefault();chooseOption(select,Number(document.activeElement.dataset.index));
    }
  };
  shell.addEventListener('keydown',keyHandler);list.addEventListener('keydown',keyHandler);
  select.addEventListener('change',()=>{
    setTimeout(()=>{
      if(select.id==='hz-lang-sel'){
        const auto=select.options[0];if(auto)auto.textContent=window.hzT?window.hzT('langAuto'):(lang()==='en'?'Automatic':'Automático');
        document.getElementById('hzp-writing')?.remove();ensureWritingCard();
        if(document.getElementById('spf-stats'))renderProfileRefresh();
      }
      syncSelect(select);
    },0);
  });syncSelect(select);
}
function scanSelects(root=document){$$('select.lvlselect, #ss select, #mo-style select',root).forEach(enhanceSelect);}
document.addEventListener('pointerdown',e=>{if(openSelect&&!openSelect.contains(e.target)&&!selectMenu(openSelect)?.contains(e.target))closeSelect(openSelect,false);},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&openSelect)closeSelect(openSelect,true);},true);

/* ---------- Sequência diária no fuso de Brasília ---------- */
const STREAK_KEY='hzStreak.v1';
function brasilDate(date=new Date()){
  try{
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
    const get=t=>parts.find(p=>p.type===t)?.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  }catch(_){return date.toISOString().slice(0,10);}
}
function parseDay(s){const [y,m,d]=String(s).split('-').map(Number);return Date.UTC(y,m-1,d);}
function diffDays(a,b){return Math.round((parseDay(a)-parseDay(b))/86400000);}
function shiftDay(base,delta){const d=new Date(parseDay(base)+delta*86400000);return d.toISOString().slice(0,10);}
function loadStreak(){
  try{const d=JSON.parse(localStorage.getItem(STREAK_KEY)||'null');if(d&&d.v===1)return d;}catch(_){}
  return{v:1,lastDate:'',current:0,best:0,days:[]};
}
function saveStreak(s){try{localStorage.setItem(STREAK_KEY,JSON.stringify(s));}catch(_){}}
function touchStreak(){
  const today=brasilDate(),s=loadStreak();
  if(s.lastDate!==today){
    const gap=s.lastDate?diffDays(today,s.lastDate):999;
    s.current=gap===1?Math.max(1,Number(s.current)||0)+1:1;
    s.best=Math.max(Number(s.best)||0,s.current);
    s.lastDate=today;
    s.days=Array.from(new Set([...(Array.isArray(s.days)?s.days:[]),today])).sort().slice(-366);
    saveStreak(s);
  }
  return s;
}
window.hzBrasilDate=brasilDate;
window.hzGetStreak=()=>touchStreak();

/* ---------- Perfil e estatísticas ---------- */
const svgIcons={
  read:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5.5A3.5 3.5 0 017.5 2H11v18H7.5A3.5 3.5 0 004 23V5.5z"/><path d="M20 5.5A3.5 3.5 0 0016.5 2H13v18h3.5A3.5 3.5 0 0120 23V5.5z"/></svg>',
  game:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4z"/><path d="M7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3"/></svg>',
  dict:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M8 11h6M11 8v6"/></svg>',
  review:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 12a8 8 0 10-2.34 5.66"/><path d="M20 7v5h-5"/></svg>',
  audio:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15 9a4 4 0 010 6M18 6a8 8 0 010 12"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M16 16l5 5"/></svg>',
  flame:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13.5 2.5c.7 4-2.8 5.4-2.2 8.2.3 1.4 1.4 2.1 2.7 1.9 2.5-.5 2.8-3.4 2.2-5.6 3.2 2.2 5 5.2 4 8.8-1 3.7-4.4 6-8.2 6-4.5 0-8-3.1-8-7.5 0-3.1 1.7-5.4 4.5-7.8-.3 2.8.6 4.7 2.1 4.4 1.8-.4.1-4.7 2.9-8.4z"/></svg>'
};
function fmtMin(sec){const m=Math.max(0,Math.round((Number(sec)||0)/60));if(m<60)return `${m} min`;return `${Math.floor(m/60)}h ${String(m%60).padStart(2,'0')}m`;}
function metric(icon,label,value){return `<div class="hzvr-metric"><div class="hzvr-metric-head">${svgIcons[icon]||''}<span>${esc(label)}</span></div><strong>${esc(value)}</strong></div>`;}
function weekHTML(streak){
  const today=brasilDate();const labels=lang()==='en'?['S','M','T','W','T','F','S']:['D','S','T','Q','Q','S','S'];
  let html='<div class="hzvr-week">';
  for(let i=6;i>=0;i--){const key=shiftDay(today,-i);const dow=new Date(parseDay(key)).getUTCDay();const on=streak.days.includes(key);html+=`<div class="hzvr-day ${on?'on':''} ${key===today?'today':''}"><i>${on?'✓':'·'}</i><span>${labels[dow]}</span></div>`;}
  return html+'</div>';
}
function chartHTML(days){
  const today=brasilDate(),keys=[];for(let i=13;i>=0;i--)keys.push(shiftDay(today,-i));
  const vals=keys.map(k=>Math.round(((days[k]&&days[k].u)||0)/60));const max=Math.max(10,...vals);
  const bars=vals.map((v,i)=>`<div class="hzvr-bar" title="${keys[i]} · ${v} min"><i style="height:${Math.max(3,Math.round(v/max*100))}%"></i></div>`).join('');
  return `<div class="hzvr-chart"><div class="hzvr-chart-head"><strong>${esc(copy().last14)}</strong><span>${Math.max(...vals)} min ${lang()==='en'?'max.':'máx.'}</span></div><div class="hzvr-bars">${bars}</div><div class="hzvr-chart-labels"><span>${keys[0].slice(5).replace('-','/')}</span><span>${keys[13].slice(5).replace('-','/')}</span></div></div>`;
}
function renderProfileRefresh(){
  const host=$('#spf-stats');if(!host)return;
  const data=(window.hzStat&&window.hzStat.data)?window.hzStat.data():{tot:{},days:{}};
  const t=data.tot||{},days=data.days||{},streak=touchStreak(),c=copy();
  const todaySec=(days[brasilDate()]&&days[brasilDate()].u)||0;
  const todayMin=Math.round(todaySec/60),goal=Math.min(100,Math.round(todayMin/30*100));
  const circumference=2*Math.PI*42,offset=circumference-(goal/100*circumference);
  host.innerHTML=`
    <div class="hzvr-profile-grid">
      <div class="hzvr-hero">
        <div class="hzvr-ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="hzvr-ring-track" cx="50" cy="50" r="42"/><circle class="hzvr-ring-fill" cx="50" cy="50" r="42" stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"/></svg><strong>${todayMin}</strong><span>min</span></div>
        <div class="hzvr-hero-copy"><h2>${esc(c.profileSummary)}</h2><p>${esc(c.goal)}. ${todayMin>=30?(lang()==='en'?'Goal reached today.':'Meta alcançada hoje.'):(lang()==='en'?`${30-todayMin} minutes remaining.`:`Faltam ${30-todayMin} minutos.`)}</p></div>
      </div>
      <div class="hzvr-streak-card"><div class="hzvr-fire">${svgIcons.flame}</div><div class="hzvr-streak-main"><div class="hzvr-streak-count"><strong>${streak.current}</strong><span>${esc(c.streak)}</span></div>${weekHTML(streak)}</div><div class="hzvr-streak-best"><strong>${streak.best}</strong><span>${esc(c.best)}</span></div></div>
    </div>
    <div class="sgt">${esc(c.activities)}</div>
    <div class="hzvr-metrics">${metric('read',c.read,fmtMin(t.read))}${metric('game',c.game,fmtMin(t.game))}${metric('dict',c.dictionary,fmtMin(t.dict))}${metric('review',c.review,fmtMin(t.rev))}</div>
    <div class="sgt">${esc(c.accumulated)}</div>
    <div class="hzvr-metrics">${metric('audio',c.audio,fmtMin(t.audio))}${metric('search',c.searched,(Number(t.wSearch)||0).toLocaleString())}${metric('review',c.wordReview,(Number(t.wRev)||0).toLocaleString())}${metric('review',c.sentenceReview,(Number(t.sRev)||0).toLocaleString())}</div>
    <div class="sgt">${esc(c.last14)}</div>${chartHTML(days)}`;
}

/* ---------- Terceiro módulo de prática: escrita ---------- */
const writingChars=['你','好','学','中','国','我','人','日','月','山','水','爱'];
const writingIcon='<svg viewBox="0 0 64 64" fill="none" stroke="currentColor"><rect x="9" y="9" width="46" height="46" rx="8" stroke-opacity=".5"/><path d="M32 9v46M9 32h46M15.7 15.7l32.6 32.6M48.3 15.7L15.7 48.3" stroke-dasharray="3 3" stroke-opacity=".36"/><path d="M24 43l3-11 15-15a4.2 4.2 0 016 6L33 38l-9 5z" stroke-width="2.4"/></svg>';
function ensureWritingCard(){
  const game=$('#hzp-game');if(!game||$('#hzp-writing'))return;
  const c=copy(),card=document.createElement('div');card.id='hzp-writing';card.className='hzp-card hzvr-writing-card';
  card.innerHTML=`<div class="hzp-ico">${writingIcon}</div><div class="hzp-lbl">${esc(c.writing)}<br><span class="hzp-sub">${esc(c.writingSub)}</span></div><div class="hzp-chev"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg></div>`;
  game.insertAdjacentElement('afterend',card);card.addEventListener('click',openWriting);
}
function openWriting(){
  const hub=$('#hz-sp-hub'),host=$('#hz-sp-host');if(!hub||!host)return;
  $('#hz-sp-frame')?.remove();hub.style.display='none';host.style.display='flex';host.innerHTML='<div id="hz-writing-panel"></div>';
  const panel=$('#hz-writing-panel'),c=copy();
  panel.innerHTML=`<div class="hzwr-shell"><div class="hzwr-head"><button class="hzwr-back" id="hzwr-back" aria-label="Voltar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button><div class="hzwr-title"><h2>${esc(c.writing)}</h2><p>${esc(c.writingSub)}</p></div></div><div class="hzwr-board"><div class="hzwr-controls"><input class="hzwr-input" id="hzwr-input" value="你" maxlength="2" aria-label="${esc(c.character)}"><button class="hzwr-random" id="hzwr-random">${esc(c.random)}</button></div><div class="hzwr-canvas-wrap"><canvas id="hz-writing-canvas"></canvas></div><div class="hzwr-actions"><button id="hzwr-undo">${esc(c.undo)}</button><button id="hzwr-clear">${esc(c.clear)}</button><button class="pri" id="hzwr-done">${esc(c.done)}</button></div><div class="hzwr-suggestions">${writingChars.map((ch,i)=>`<button class="hzwr-char ${i===0?'on':''}" data-char="${ch}">${ch}</button>`).join('')}</div><div class="hzwr-status"><span>${esc(c.character)}: <strong id="hzwr-current">你</strong></span><span><strong id="hzwr-count">0</strong> ${esc(c.strokes)}</span></div></div></div>`;
  initWritingCanvas(panel);
  $('#hzwr-back',panel).onclick=()=>window.hzBackToHub?.();
}
function initWritingCanvas(panel){
  const canvas=$('#hz-writing-canvas',panel),wrap=canvas.parentElement,input=$('#hzwr-input',panel),count=$('#hzwr-count',panel),current=$('#hzwr-current',panel);
  let paths=[],active=null,target='你',ctx,dpr=1,w=0,h=0;
  function setTarget(value){
    const chars=Array.from(String(value||'').trim());target=chars[0]||'你';
    input.value=target;current.textContent=target;paths=[];count.textContent='0';
    $$('.hzwr-char',panel).forEach(b=>b.classList.toggle('on',b.dataset.char===target));draw();
  }
  function resize(){
    const r=wrap.getBoundingClientRect();dpr=Math.min(2,window.devicePixelRatio||1);
    w=Math.max(260,Math.round(r.width));h=Math.max(260,Math.round(r.height));
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';
    ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);draw();
  }
  function grid(){
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#f2e9dc';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='rgba(116,75,42,.22)';ctx.lineWidth=1;ctx.strokeRect(.5,.5,w-1,h-1);
    ctx.setLineDash([7,7]);
    [[w/2,0,w/2,h],[0,h/2,w,h/2],[0,0,w,h],[w,0,0,h]].forEach(a=>{ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(a[2],a[3]);ctx.stroke();});
    ctx.setLineDash([]);ctx.fillStyle='rgba(86,56,33,.14)';
    ctx.font=`${Math.round(w*.62)}px ${getComputedStyle(document.documentElement).getPropertyValue('--rf')||'serif'}`;
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(target,w/2,h/2+4);
  }
  function draw(){
    if(!ctx)return;grid();ctx.strokeStyle='#2e2820';ctx.lineWidth=Math.max(5,w*.018);ctx.lineCap='round';ctx.lineJoin='round';
    paths.forEach(p=>{if(p.length<2)return;ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);p.slice(1).forEach(q=>ctx.lineTo(q.x,q.y));ctx.stroke();});
  }
  function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*w/r.width,y:(e.clientY-r.top)*h/r.height};}
  canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.setPointerCapture?.(e.pointerId);active=[point(e)];paths.push(active);count.textContent=String(paths.length);draw();});
  canvas.addEventListener('pointermove',e=>{if(!active)return;e.preventDefault();active.push(point(e));draw();});
  const end=()=>{active=null;};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
  input.addEventListener('input',()=>setTarget(input.value));
  $$('.hzwr-char',panel).forEach(b=>b.onclick=()=>setTarget(b.dataset.char));
  $('#hzwr-random',panel).onclick=()=>setTarget(writingChars[Math.floor(Math.random()*writingChars.length)]);
  $('#hzwr-clear',panel).onclick=()=>{paths=[];count.textContent='0';draw();};
  $('#hzwr-undo',panel).onclick=()=>{paths.pop();count.textContent=String(paths.length);draw();};
  $('#hzwr-done',panel).onclick=()=>{
    if(!paths.length)return;
    try{window.hzStat?.bump('wRev');}catch(_){}
    try{window.toast?.(copy().saved);}catch(_){}
    const next=writingChars[(writingChars.indexOf(target)+1+writingChars.length)%writingChars.length];setTarget(next);
  };
  if('ResizeObserver' in window)new ResizeObserver(resize).observe(wrap);else window.addEventListener('resize',resize);
  requestAnimationFrame(resize);
}
function wrapPracticeBack(){
  if(window.hzBackToHub&&window.hzBackToHub._hzvr)return;
  const original=window.hzBackToHub;if(typeof original!=='function')return;
  const wrapped=function(){const host=$('#hz-sp-host');if(host&&$('#hz-writing-panel',host))host.innerHTML='';return original.apply(this,arguments);};
  wrapped._hzvr=true;window.hzBackToHub=wrapped;
}

/* ---------- Controles e semântica ---------- */
function enhanceReaderControls(){
  const fs=$('#reader-fs');
  if(fs){const on=document.body.classList.contains('reader-fullscreen');const label=lang()==='en'?(on?'Exit full screen':'Full screen'):(on?'Sair da tela cheia':'Tela cheia');fs.setAttribute('aria-label',label);fs.title=label;}
  const next=$('#reader-next-chap');if(next){next.setAttribute('aria-label',lang()==='en'?'Next chapter':'Próximo capítulo');next.title=next.getAttribute('aria-label');}
}
function markModals(){
  $$('.mo').forEach(m=>{
    m.classList.add('hzvr-modal');const title=$('.mtitle',m);
    if(title&&!title.id)title.id=`${m.id||'modal'}-title`;
    if(title)m.setAttribute('aria-labelledby',title.id);
    m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');
  });
}

/* ---------- Boot e observação de DOM dinâmico ---------- */
function refresh(root=document){scanSelects(root);ensureWritingCard();wrapPracticeBack();enhanceReaderControls();markModals();}
const observer=new MutationObserver(muts=>{
  let needs=false;
  for(const m of muts){for(const n of m.addedNodes){if(n.nodeType===1){needs=true;scanSelects(n);}}}
  if(needs)requestAnimationFrame(()=>refresh());
});
function boot(){
  touchStreak();refresh();window.hzStatsRender=renderProfileRefresh;if($('#spf-stats'))renderProfileRefresh();
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',e=>{if(e.target.closest?.('#reader-fs,#reader-next-chap'))setTimeout(enhanceReaderControls,0);},true);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')touchStreak();});
  window.addEventListener('focus',touchStreak);
  const oldShow=window.showScreen;
  if(typeof oldShow==='function'&&!oldShow._hzvr){
    const wrapped=function(id){
      const out=oldShow.apply(this,arguments);
      if(id==='spf')requestAnimationFrame(renderProfileRefresh);
      if(id!=='sp'&&$('#hz-writing-panel'))$('#hz-writing-panel').remove();
      setTimeout(refresh,0);return out;
    };
    wrapped._hzvr=true;window.showScreen=wrapped;
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
setTimeout(refresh,700);
setTimeout(()=>{window.hzStatsRender=renderProfileRefresh;refresh();},1800);
})();


/* Estatísticas de uso: tempo útil, contadores e gráfico — armazenamento agregado leve */
(function(){
'use strict';

/* Busca: esconder ao concluir ou ao interagir com o conteúdo */
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target&&e.target.id==='sin'){
    const sb=document.getElementById('sbar');if(sb)sb.classList.remove('open','vis');
    try{e.target.blur();}catch(err){}
  }
},true);
document.addEventListener('click',e=>{
  const sb=document.getElementById('sbar');
  if(!sb||(!sb.classList.contains('open')&&!sb.classList.contains('vis')))return;
  if(e.target.closest('#sbar')||e.target.closest('#v43-search-toggle'))return;
  if(e.target.closest('#bc .card, #bc .book-card, .bnav .ni')){
    sb.classList.remove('open','vis');
    try{if(typeof searchQ!=='undefined'){searchQ='';const sin=document.getElementById('sin');if(sin)sin.value='';renderLib();}}catch(err){}
  }
},true);

/* Configurações do leitor em blocos temáticos */
(function(){
const CSSR=document.createElement('style');CSSR.textContent='.h50-sec{font-size:11px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:rgba(var(--ac-rgb),.85);margin:16px 2px 8px;padding-top:12px;border-top:1px solid #262626}.h50-sec:first-child{margin-top:2px;border-top:0;padding-top:0}';
document.head.appendChild(CSSR);
function organizeReaderSettings(){
  const sc=document.getElementById('style-scroll');
  if(!sc||sc.dataset.h50==='1')return;
  const fsRow=document.getElementById('sfs-dec')?.closest('.style-row');
  const voice=document.getElementById('h41-voice');
  if(!fsRow||!voice)return; // aguarda instaladores
  sc.dataset.h50='1';
  const mk=t=>{const d=document.createElement('div');d.className='h50-sec';d.textContent=t;return d;};
  sc.insertBefore(mk('Aparência do leitor'),fsRow);
  const theme=document.getElementById('theme-row-v33');
  if(theme)sc.insertBefore(theme,voice); // tema do papel junto da aparência
  sc.insertBefore(mk('Voz e leitura em áudio'),voice);
  const last=[...sc.children].find(el=>el.id==='h41-voice-settings');
  const exp=document.getElementById('v36-expressive-toggle')?.closest('.style-row,.h41-acc,div');
  const after=(last&&last.nextElementSibling)||null;
  if(after&&!after.classList.contains('h50-sec'))sc.insertBefore(mk('Comportamento durante a leitura'),after);
}
setInterval(()=>{try{organizeReaderSettings();}catch(e){}},1500);
})();

const KEY='hzStats.v1';
function load(){try{const d=JSON.parse(localStorage.getItem(KEY)||'null');if(d&&d.v===1)return d;}catch(e){}return{v:1,tot:{useful:0,read:0,game:0,dict:0,rev:0,audio:0,wSearch:0,wRev:0,sRev:0},days:{}};}
let ST=load(),dirty=false;
function ymd(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function day(){const k=ymd();return ST.days[k]||(ST.days[k]={u:0,r:0,g:0,d:0,v:0});}
function prune(){const ks=Object.keys(ST.days).sort();while(ks.length>60){delete ST.days[ks.shift()];}}
function save(){if(!dirty)return;dirty=false;try{prune();localStorage.setItem(KEY,JSON.stringify(ST));}catch(e){}}
setInterval(save,20000);window.addEventListener('beforeunload',save);
window.hzStat={
  bump(k,n){n=n||1;if(k in ST.tot){ST.tot[k]+=n;dirty=true;}},
  addTime(cat,sec){ // cat: read|game|dict|rev|audio
    if(!(cat in ST.tot))return;
    ST.tot[cat]+=sec;ST.tot.useful+=sec;
    const d=day();d.u+=sec;
    if(cat==='read')d.r+=sec;else if(cat==='game')d.g+=sec;else if(cat==='dict')d.d+=sec;else if(cat==='rev')d.v+=sec;
    dirty=true;
  },
  data(){return ST;}
};
/* ---- tempo útil: tique de 15s condicionado a contexto + interação recente ---- */
let lastAct=Date.now(),readSession=0;
['pointerdown','keydown','wheel','touchstart','scroll'].forEach(ev=>document.addEventListener(ev,()=>{lastAct=Date.now();},{capture:true,passive:true}));
function activeScreen(){const sc=document.querySelector('.screen.active');return sc?sc.id:null;}
setInterval(()=>{
  try{
    if(document.visibilityState!=='visible')return;
    if(Date.now()-lastAct>90000)return; // ocioso
    const id=activeScreen();
    if(id==='sr'){ // leitura: só conta depois de 4 min contínuos
      readSession+=15;
      if(readSession>240)window.hzStat.addTime('read',15);
    }else{
      readSession=0;
      if(id==='sp'&&document.getElementById('hz-sp-frame'))window.hzStat.addTime('game',15);
      else if(id==='sx')window.hzStat.addTime('dict',15);
      else if(id==='sw'&&document.querySelector('.study-card'))window.hzStat.addTime('rev',15);
      /* sl (listas), ss (configurações) e demais: não contam */
    }
  }catch(e){}
},15000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible'){readSession=0;save();}});
/* ---- tempo de áudio reproduzido (mesmo sem interação ativa) ---- */
const AMAP=new WeakMap();
document.addEventListener('play',e=>{const a=e.target;if(a&&a.tagName==='AUDIO')AMAP.set(a,a.currentTime||0);},true);
function flushAudio(e){
  const a=e.target;if(!a||a.tagName!=='AUDIO')return;
  const t0=AMAP.get(a);if(t0==null)return;AMAP.delete(a);
  const dt=Math.max(0,Math.min(120,(a.currentTime||0)-t0));
  if(dt>=1)window.hzStat.addTime('audio',Math.round(dt));
}
document.addEventListener('pause',flushAudio,true);
document.addEventListener('ended',flushAudio,true);
/* ---- contadores por interação (com dedupe curto) ---- */
let lastKey='',lastKeyAt=0;
function once(k){const n=Date.now();if(k===lastKey&&n-lastKeyAt<5000)return false;lastKey=k;lastKeyAt=n;return true;}
document.addEventListener('click',e=>{
  try{
    const t=e.target;
    if(t.closest('#rtext .wunit')){const w=t.closest('.wunit').textContent.trim();if(once('w:'+w))window.hzStat.bump('wSearch');return;}
    if(t.closest('#dict-go')){const q=(document.getElementById('dict-q')||{}).value||'';if(q.trim()&&once('q:'+q))window.hzStat.bump('wSearch');return;}
    if(t.closest('.dict-item')||t.closest('.dict-word-click')){if(once('di:'+Date.now()%3))window.hzStat.bump('wSearch');return;}
    if(t.closest('[data-sent-play],[data-sent-idx],[data-ex-text],.tip-ex-play')||
       (t.closest('.lexi-audio')&&t.closest('.sent-card'))){window.hzStat.bump('sRev');return;}
    if(t.closest('.v41-save-sent-btn')){window.hzStat.bump('sRev');return;}
  }catch(err){}
},true);
document.addEventListener('keydown',e=>{
  try{if(e.key==='Enter'&&e.target&&e.target.id==='dict-q'){const q=e.target.value||'';if(q.trim()&&once('q:'+q))window.hzStat.bump('wSearch');}}catch(err){}
},true);
/* ---- perfil + gráfico nas configurações gerais ---- */
function fmtMin(sec){const m=Math.round(sec/60);if(m<60)return m+' min';const h=Math.floor(m/60);return h+'h '+String(m%60).padStart(2,'0')+'m';}
function chartSvg(){
  const ks=[];const d=new Date();
  for(let i=13;i>=0;i--){const t=new Date(d);t.setDate(d.getDate()-i);ks.push(t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0'));}
  const vals=ks.map(k=>(ST.days[k]?ST.days[k].u:0)/60);
  const max=Math.max(10,...vals);
  const W=308,H=88,bw=W/14;
  let bars='';
  vals.forEach((v,i)=>{
    const h=Math.max(2,Math.round(v/max*(H-18)));
    const peak=v===Math.max(...vals)&&v>0;
    bars+='<rect x="'+(i*bw+3).toFixed(1)+'" y="'+(H-14-h)+'" width="'+(bw-6).toFixed(1)+'" height="'+h+'" rx="3" fill="rgba(var(--ac-rgb),'+(peak?'0.95':(v>0?'0.55':'0.18'))+'"/>';
  });
  const labels='<text x="3" y="'+(H-2)+'" fill="#8a8172" font-size="9">'+ks[0].slice(5)+'</text><text x="'+(W-34)+'" y="'+(H-2)+'" fill="#8a8172" font-size="9">'+ks[13].slice(5)+'</text>';
  return '<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto;display:block">'+bars+labels+'</svg>';
}
function profileHTML(){
  const t=ST.tot;
  const cell=(l,v)=>'<div class="hz-stat-cell"><span>'+l+'</span><strong>'+v+'</strong></div>';
  return '<div class="sgt" style="margin-top:4px">Resumo</div>'+
   '<div class="hz-profile hz-block">'+
    '<div class="hz-stat-hero"><div class="hz-stat-big">'+fmtMin(t.useful)+'</div><div class="hz-stat-sub">tempo útil de estudo</div></div>'+
   '</div>'+
   '<div class="sgt">Atividades</div>'+
   '<div class="hz-profile hz-block">'+
    '<div class="hz-stat-grid" style="margin-bottom:0">'+
      cell('Leitura',fmtMin(t.read))+cell('Jogo de pinyin',fmtMin(t.game))+
      cell('Dicionário',fmtMin(t.dict))+cell('Revisão',fmtMin(t.rev))+
    '</div>'+
   '</div>'+
   '<div class="sgt">Estudo acumulado</div>'+
   '<div class="hz-profile hz-block">'+
    '<div class="hz-stat-grid" style="margin-bottom:0">'+
      cell('Áudio ouvido',fmtMin(t.audio))+cell('Palavras pesquisadas',t.wSearch.toLocaleString("pt-BR"))+
      cell('Palavras revisadas',t.wRev.toLocaleString("pt-BR"))+cell('Frases revisadas',t.sRev.toLocaleString("pt-BR"))+
    '</div>'+
   '</div>'+
   '<div class="sgt">Atividade · últimos 14 dias</div>'+
   '<div class="hz-profile hz-block">'+chartSvg()+'</div>';
}
const pcss=document.createElement('style');pcss.textContent=`
.hz-profile{border:1px solid rgba(var(--ac-rgb),.26);background:linear-gradient(180deg,rgba(26,22,17,.9),rgba(15,13,10,.92));border-radius:18px;padding:16px 15px 13px;margin-bottom:6px}
.hz-profile.hz-block{margin-bottom:14px;padding:14px}
#spf .sgt{font-size:11px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:rgba(var(--ac-rgb),.85);margin:2px 2px 8px}
.hz-stat-hero{text-align:center;margin-bottom:12px}
.hz-stat-big{font-size:30px;font-weight:850;color:var(--ac);font-variant-numeric:tabular-nums}
.hz-stat-sub{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8a8172;font-weight:800;margin-top:2px}
.hz-stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:13px}
.hz-stat-cell{border:1px solid #262320;background:#12100d;border-radius:11px;padding:8px 10px}
.hz-stat-cell span{display:block;font-size:10px;color:#8a8172;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.hz-stat-cell strong{display:block;font-size:15px;color:#ece3d2;margin-top:2px;font-variant-numeric:tabular-nums}
.hz-chart-title{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#8a8172;font-weight:800;margin:2px 0 6px}
@media(min-width:760px){.hz-stat-grid{grid-template-columns:repeat(4,1fr)}}
`;document.head.appendChild(pcss);
function renderProfile(){
  const host=document.getElementById('spf-stats');
  if(!host)return;
  host.innerHTML=profileHTML();
}
window.hzStatsRender=renderProfile;
const _pss=window.showScreen;
if(typeof _pss==='function')window.showScreen=function(id){if(id==='spf'){try{renderProfile();}catch(e){}}return _pss(id);};
})();

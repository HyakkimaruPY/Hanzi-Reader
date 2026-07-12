/* Camada de desempenho progressiva: sem dependências e sem alterar regras de negócio. */
const root=document.documentElement;
const metrics={bootAt:performance.now(),screens:[],longTasks:0,longTaskTime:0};
function lowPowerHint(){
  const cores=Number(navigator.hardwareConcurrency)||8;
  const memory=Number(navigator.deviceMemory)||8;
  const saveData=Boolean(navigator.connection?.saveData);
  return saveData||cores<=4||memory<=4;
}
root.classList.toggle('hz-low-power',lowPowerHint());
root.classList.toggle('hz-reduced-motion',matchMedia('(prefers-reduced-motion: reduce)').matches);

function syncScreenState(id){
  const activeId=id||document.querySelector('.screen.active')?.id||'';
  document.querySelectorAll('.screen').forEach(screen=>{
    const active=screen.id===activeId;
    screen.toggleAttribute('inert',!active);
    screen.setAttribute('aria-hidden',String(!active));
  });
  root.dataset.activeScreen=activeId;
}
window.addEventListener('hz:screen-change',event=>{
  const started=performance.now();
  // Estado funcional e de acessibilidade muda no mesmo frame da aba; antes ele
  // aguardava um rAF e deixava a tela nova visualmente ativa com estado antigo.
  syncScreenState(event.detail?.id);
  requestAnimationFrame(()=>metrics.screens.push({id:event.detail?.id||'',ms:Number((performance.now()-started).toFixed(2)),at:Date.now()}));
},{passive:true});


/* O leitor sinaliza somente o período de rolagem ativa. Isso reduz sombras e
   animações caras sem mudar a estrutura ou o conteúdo do texto. */
let readerScrollFrame=0,readerScrollEnd=0;
document.addEventListener('scroll',event=>{
  const target=event.target;if(!(target instanceof Element)||target.id!=='rscroll')return;
  if(!readerScrollFrame)readerScrollFrame=requestAnimationFrame(()=>{readerScrollFrame=0;root.classList.add('hz-reader-scrolling');});
  clearTimeout(readerScrollEnd);readerScrollEnd=setTimeout(()=>root.classList.remove('hz-reader-scrolling'),120);
},{capture:true,passive:true});

// A aba oculta não mantém efeitos decorativos correndo. O áudio não é afetado.
document.addEventListener('visibilitychange',()=>root.classList.toggle('hz-page-hidden',document.hidden),{passive:true});

if('PerformanceObserver' in window){
  try{
    const observer=new PerformanceObserver(list=>{for(const entry of list.getEntries()){metrics.longTasks++;metrics.longTaskTime+=entry.duration;}});
    observer.observe({type:'longtask',buffered:true});
  }catch{}
}
window.hzPerformance={
  snapshot(){return{...metrics,longTaskTime:Number(metrics.longTaskTime.toFixed(2)),domNodes:document.getElementsByTagName('*').length,heap:performance.memory?.usedJSHeapSize||null,lowPower:root.classList.contains('hz-low-power')};},
  mark(name){performance.mark(`hz:${name}`);},
  measure(name,start,end){try{return performance.measure(`hz:${name}`,`hz:${start}`,`hz:${end}`).duration;}catch{return null;}}
};

function boot(){syncScreenState();root.classList.add('hz-performance-ready');}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();


/* ===== hz-render-stability-integrated ===== */
{
/* Ciclo de vida leve e idempotente para telas que dependem do primeiro layout visível. */
const root=document.documentElement;
const screenStarts=new Map();
const metrics={screens:{},visibleEvents:0,duplicatePracticeRootsRemoved:0,bootAt:performance.now()};
let readyFrame=0;

function activeScreen(){return document.querySelector('.screen.active');}
function removeDuplicatePracticeRoots(){
  const host=document.getElementById('hz-sp-host');if(!host)return;
  const roots=[...host.querySelectorAll(':scope > .hz-practice-activity-root')];
  roots.slice(0,-1).forEach(node=>{node.remove();metrics.duplicatePracticeRootsRemoved++;});
}
function syncVisibleScreen(id){
  const screen=document.getElementById(id);if(!screen||!screen.classList.contains('active'))return;
  screen.classList.add('hz-screen-ready');
  if(id==='spf')window.hzStatsRender?.();
  if(id==='sp')removeDuplicatePracticeRoots();
  document.dispatchEvent(new CustomEvent('hz:screen-ready',{bubbles:true,detail:{id}}));
  metrics.visibleEvents++;
  const started=screenStarts.get(id);if(started!=null){const ms=performance.now()-started;(metrics.screens[id]??=[]).push(Number(ms.toFixed(2)));screenStarts.delete(id);}
}
document.addEventListener('hz:screen-change',event=>{
  const id=event.detail?.id;if(!id)return;screenStarts.set(id,performance.now());
  document.querySelectorAll('.screen.hz-screen-ready').forEach(screen=>{if(screen.id!==id)screen.classList.remove('hz-screen-ready');});
},{passive:true});
document.addEventListener('hz:screen-visible',event=>{
  const id=event.detail?.id;if(!id)return;
  if(readyFrame)cancelAnimationFrame(readyFrame);
  readyFrame=requestAnimationFrame(()=>{readyFrame=0;syncVisibleScreen(id);});
},{passive:true});
document.addEventListener('hz:reader-first-paint',event=>{
  document.dispatchEvent(new CustomEvent('hz:reader-mounted',{bubbles:true,detail:{source:'reader-first-paint',token:event.detail?.token}}));
},{passive:true});
document.addEventListener('hz:practice-activity-change',removeDuplicatePracticeRoots,{passive:true});

function boot(){
  root.classList.add('hz-render-stable');
  const current=activeScreen();if(current)requestAnimationFrame(()=>syncVisibleScreen(current.id));
  document.fonts?.ready?.then(()=>root.classList.add('hz-fonts-ready')).catch(()=>{});
}
window.hzRenderStability={
  snapshot(){
    const averages={};for(const [id,values] of Object.entries(metrics.screens)){averages[id]=values.length?Number((values.reduce((a,b)=>a+b,0)/values.length).toFixed(2)):0;}
    return{...metrics,screenAverages:averages,domNodes:document.getElementsByTagName('*').length,activePractice:window.hzGetActivePracticeActivity?.()||'',music:window.MusicPlaybackService?.getState?.()||null};
  },
  sync:()=>syncVisibleScreen(activeScreen()?.id||'')
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();

}

/* Camada de desempenho progressiva: sem dependências e sem alterar regras de negócio. */
const root=document.documentElement;
const metrics={bootAt:performance.now(),screens:[],longTasks:0,longTaskTime:0};
let screenFrame=0;
function lowPowerHint(){
  const cores=Number(navigator.hardwareConcurrency)||8;
  const memory=Number(navigator.deviceMemory)||8;
  const saveData=Boolean(navigator.connection?.saveData);
  return saveData||cores<=4||memory<=4;
}
root.classList.toggle('hz-low-power',lowPowerHint());
root.classList.toggle('hz-reduced-motion',matchMedia('(prefers-reduced-motion: reduce)').matches);

function syncScreenState(id){
  if(screenFrame)cancelAnimationFrame(screenFrame);
  screenFrame=requestAnimationFrame(()=>{
    screenFrame=0;
    const activeId=id||document.querySelector('.screen.active')?.id||'';
    document.querySelectorAll('.screen').forEach(screen=>{
      const active=screen.id===activeId;
      screen.toggleAttribute('inert',!active);
      screen.setAttribute('aria-hidden',String(!active));
    });
    root.dataset.activeScreen=activeId;
  });
}
window.addEventListener('hz:screen-change',event=>{
  const started=performance.now();syncScreenState(event.detail?.id);
  requestAnimationFrame(()=>metrics.screens.push({id:event.detail?.id||'',ms:Number((performance.now()-started).toFixed(2)),at:Date.now()}));
},{passive:true});

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

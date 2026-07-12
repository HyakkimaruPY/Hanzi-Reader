import {
  TONE_ITEMS,
  defaultLearningState,
  extractToneSequence,
  sanitizeLearningState,
  selectAdaptiveToneItem,
  segmentChineseText,
  toneLabel,
  unlockedToneLevel,
  updateReviewItem
} from './learning-core.mjs';

const LEARNING_KEY='hzLearning.v1';
const READER_KEY='hzReaderEngine.v2';
const DOCK_KEY='hzReaderDock.v1';
const $=(selector,root=document)=>root.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const uiLang=()=>{const l=String(window.hzLang?.()||document.documentElement.lang||'pt').toLowerCase();return l.startsWith('en')?'en':l.startsWith('es')?'es':'pt';};
const isEnglish=()=>uiLang()==='en';
const text={
  pt:{
    practice:'Prática',toneListen:'Tons e escuta',production:'Produção e escrita',leisure:'Lazer',toneTab:'Tons',productionTab:'Escrita',leisureTab:'Lazer',
    toneGame:'Identificar o tom',toneGameSub:'Áudio natural · reconhecimento',sequence:'Sequência tonal',sequenceSub:'Reconstrua a ordem dos tons que ouviu',writing:'Escrita de Hanzi',writingSub:'Coordenação e memória visual',music:'Música · Guzheng',musicSub:'Ouça cordas tradicionais chinesas',
    back:'Voltar',listen:'Ouvir',listenAgain:'Ouvir novamente',instruction:'Ouça sem ver a resposta e monte a sequência.',
    ready:'O áudio está pronto.',loading:'Preparando áudio natural…',select:'Selecione os tons na ordem ou toque em um bloco para desfazer.',check:'Conferir',undo:'Desfazer',
    correct:'Muito bem — a sequência está correta.',wrong:'Quase. Compare cada posição e tente ouvir a direção do tom.',correctAnswer:'Resposta correta',next:'Próximo desafio',
    level:'nível',skill:'discriminação tonal',sessionDone:'Sessão concluída',sessionSummary:'Você concluiu uma sessão de recuperação ativa.',restart:'Nova sessão',
    howTitle:'Como jogar',howIntro:'Você ouvirá uma palavra ou pequena sequência sem ver os tons.',how1:'Ouça o áudio.',how2:'Toque nos tons na ordem que escutou.',how3:'Use Conferir para confirmar.',how4:'Some 1 ponto por acerto e continue por quantos desafios quiser — não há limite.',howNote:'Você pode repetir o áudio. Não há cronômetro nem limite de tentativas. Para encerrar, use Concluir ou a seta de sair: o resumo da sessão aparece na hora.',startGame:'Começar',help:'Como jogar',
    doneLbl:'desafios',hitsLbl:'acertos',streakLbl:'sequência',accLbl:'precisão',finishBtn:'Concluir sessão',
    statChallenges:'Desafios realizados',statHits:'Acertos',statErrors:'Erros',statBestStreak:'Maior sequência',statHardest:'Tons com mais erros',statTime:'Tempo da sessão',statScore:'Pontuação',noErrors:'nenhum',
    celSubtitle:n=>`Sessão livre com ${n} desafio(s) de sequência tonal.`,
    enhanced:'Leitura contínua aprimorada',enhancedSub:'Segmentação linguística, pré-buffer do próximo trecho e fallback automático.',enabled:'Ativada',disabled:'Desativada',
    dockTitle:'Botão flutuante do leitor',dockSub:'Personalize apenas os controles sobre o texto.',dockSize:'Tamanho do grupo',dockOpacity:'Opacidade',dockActionSize:'Tamanho dos botões',dockAlign:'Alinhamento',auto:'Automático',small:'Pequeno',medium:'Médio',large:'Grande',left:'Esquerda',center:'Centro',right:'Direita',
    readerIdle:'Leitura contínua',readerPreparing:'Preparando trecho',readerPlaying:'Reproduzindo',readerPaused:'Pausado',readerFallback:'Fallback de voz ativo',readerEnd:'Fim da leitura',readerError:'Falha no motor aprimorado',
    play:'Reproduzir áudio',pause:'Pausar',resume:'Continuar'
  },
  en:{
    practice:'Practice',toneListen:'Tones and listening',production:'Production and writing',leisure:'Leisure',toneTab:'Tones',productionTab:'Writing',leisureTab:'Leisure',
    toneGame:'Identify the tone',toneGameSub:'Natural audio · recognition',sequence:'Tone sequence',sequenceSub:'Rebuild the order of the tones you heard',writing:'Hanzi writing',writingSub:'Coordination and visual memory',music:'Music · Guzheng',musicSub:'Listen to traditional Chinese strings',
    back:'Back',listen:'Listen',listenAgain:'Listen again',instruction:'Listen before seeing the answer, then build the sequence.',
    ready:'Audio is ready.',loading:'Preparing natural audio…',select:'Choose tones in order or tap a slot to undo.',check:'Check',undo:'Undo',
    correct:'Well done — the sequence is correct.',wrong:'Almost. Compare each position and listen for the tone direction.',correctAnswer:'Correct answer',next:'Next challenge',
    level:'level',skill:'tone discrimination',sessionDone:'Session complete',sessionSummary:'You completed an active-recall session.',restart:'New session',
    howTitle:'How to play',howIntro:'You will hear a word or short sequence before seeing its tones.',how1:'Listen to the audio.',how2:'Tap the tones in the order you heard.',how3:'Use Check to confirm.',how4:'Earn 1 point per correct answer and keep going for as long as you like — there is no limit.',howNote:'You may replay the audio. There is no timer or attempt limit. To finish, use Finish or the back arrow: your session summary appears right away.',startGame:'Start',help:'How to play',
    doneLbl:'challenges',hitsLbl:'correct',streakLbl:'streak',accLbl:'accuracy',finishBtn:'Finish session',
    statChallenges:'Challenges played',statHits:'Correct',statErrors:'Mistakes',statBestStreak:'Best streak',statHardest:'Tones with most errors',statTime:'Session time',statScore:'Score',noErrors:'none',
    celSubtitle:n=>`Open session with ${n} tone-sequence challenge(s).`,
    enhanced:'Enhanced continuous reading',enhancedSub:'Linguistic segmentation, next-segment prebuffering and automatic fallback.',enabled:'On',disabled:'Off',
    dockTitle:'Reader floating controls',dockSub:'Customize only the controls over the text.',dockSize:'Toolbar size',dockOpacity:'Opacity',dockActionSize:'Button size',dockAlign:'Alignment',auto:'Automatic',small:'Small',medium:'Medium',large:'Large',left:'Left',center:'Center',right:'Right',
    readerIdle:'Continuous reading',readerPreparing:'Preparing segment',readerPlaying:'Playing',readerPaused:'Paused',readerFallback:'Voice fallback active',readerEnd:'Reading complete',readerError:'Enhanced engine failed',
    play:'Play audio',pause:'Pause',resume:'Resume'
  },
  es:{
    practice:'Práctica',toneListen:'Tonos y escucha',production:'Producción y escritura',leisure:'Ocio',toneTab:'Tonos',productionTab:'Escritura',leisureTab:'Ocio',
    toneGame:'Identificar el tono',toneGameSub:'Audio natural · reconocimiento',sequence:'Secuencia tonal',sequenceSub:'Reconstruye el orden de los tonos que oíste',writing:'Escritura de Hanzi',writingSub:'Coordinación y memoria visual',music:'Música · Guzheng',musicSub:'Escucha cuerdas tradicionales chinas',
    back:'Volver',listen:'Escuchar',listenAgain:'Escuchar de nuevo',instruction:'Escucha sin ver la respuesta y arma la secuencia.',
    ready:'El audio está listo.',loading:'Preparando audio natural…',select:'Selecciona los tonos en orden o toca una casilla para deshacer.',check:'Comprobar',undo:'Deshacer',
    correct:'Muy bien — la secuencia es correcta.',wrong:'Casi. Compara cada posición y escucha la dirección del tono.',correctAnswer:'Respuesta correcta',next:'Siguiente desafío',
    level:'nivel',skill:'discriminación tonal',sessionDone:'Sesión concluida',sessionSummary:'Completaste una sesión de recuperación activa.',restart:'Nueva sesión',
    howTitle:'Cómo jugar',howIntro:'Escucharás una palabra o secuencia corta sin ver los tonos.',how1:'Escucha el audio.',how2:'Toca los tonos en el orden que oíste.',how3:'Usa Comprobar para confirmar.',how4:'Suma 1 punto por acierto y sigue cuantos desafíos quieras — no hay límite.',howNote:'Puedes repetir el audio. No hay cronómetro ni límite de intentos. Para terminar, usa Concluir o la flecha de salir: el resumen aparece al instante.',startGame:'Comenzar',help:'Cómo jugar',
    doneLbl:'desafíos',hitsLbl:'aciertos',streakLbl:'racha',accLbl:'precisión',finishBtn:'Concluir sesión',
    statChallenges:'Desafíos realizados',statHits:'Aciertos',statErrors:'Errores',statBestStreak:'Mayor racha',statHardest:'Tonos con más errores',statTime:'Tiempo de la sesión',statScore:'Puntuación',noErrors:'ninguno',
    celSubtitle:n=>`Sesión libre con ${n} desafío(s) de secuencia tonal.`,
    enhanced:'Lectura continua mejorada',enhancedSub:'Segmentación lingüística, precarga del siguiente fragmento y respaldo automático.',enabled:'Activada',disabled:'Desactivada',
    dockTitle:'Controles flotantes del lector',dockSub:'Personaliza solo los controles sobre el texto.',dockSize:'Tamaño del grupo',dockOpacity:'Opacidad',dockActionSize:'Tamaño de los botones',dockAlign:'Alineación',auto:'Automático',small:'Pequeño',medium:'Mediano',large:'Grande',left:'Izquierda',center:'Centro',right:'Derecha',
    readerIdle:'Lectura continua',readerPreparing:'Preparando fragmento',readerPlaying:'Reproduciendo',readerPaused:'En pausa',readerFallback:'Respaldo de voz activo',readerEnd:'Fin de la lectura',readerError:'Fallo del motor mejorado',
    play:'Reproducir audio',pause:'Pausar',resume:'Continuar'
  }
};
const tr=()=>text[uiLang()]||text.pt;

function practiceCelebrationIcon(){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4z"/><path d="M7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3"/><path d="M12 8.2l.8 1.6 1.8.3-1.3 1.3.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.3 1.8-.3z" stroke-width="1.1"/></svg>';}
function showPracticeCelebration(options={}){
  const existing=document.getElementById('hz-practice-celebration');if(existing){try{window.hzStopCelebrate?.();}catch{}existing.remove();}
  const english=isEnglish(),title=options.title||(english?'Session complete!':'Sessão concluída!'),score=Number(options.score)||0,total=Number(options.total)||0;
  const percent=Number.isFinite(options.percent)?Math.max(0,Math.min(100,Math.round(options.percent))):(total?Math.round(score/total*100):null);
  const overlay=document.createElement('div');overlay.id='hz-practice-celebration';overlay.className='hz-practice-celebration';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
  const stats=Array.isArray(options.stats)?options.stats.filter(Boolean):[];
  overlay.innerHTML=`<div class="hzpc-backdrop" aria-hidden="true"></div><section class="hzpc-card"><button type="button" class="hzpc-close" aria-label="${english?'Close':'Fechar'}">×</button><div class="hzpc-trophy">${practiceCelebrationIcon()}</div><p class="hzpc-kicker">${esc(options.kicker||(english?'ACTIVE PRACTICE':'PRÁTICA ATIVA'))}</p><h2>${esc(title)}</h2><div class="hzpc-score">${esc(options.scoreLabel??String(score))}</div>${options.subtitle?`<p class="hzpc-subtitle">${esc(options.subtitle)}</p>`:''}<div class="hzpc-stats">${percent!=null?`<div><span>${english?'Accuracy':'Precisão'}</span><strong>${percent}%</strong></div>`:''}${stats.map(item=>`<div><span>${esc(item.label)}</span><strong>${esc(item.value)}</strong></div>`).join('')}</div><div class="hzpc-music" aria-live="polite"></div><div class="hzpc-actions"><button type="button" class="hzpc-secondary">${esc(options.closeLabel||(english?'Back to practice':'Voltar à prática'))}</button>${options.onAgain?`<button type="button" class="pri hzpc-again">${esc(options.againLabel||(english?'New session':'Nova sessão'))}</button>`:''}</div></section>`;
  document.body.appendChild(overlay);
  let closed=false;
  const close=reason=>{
    if(closed)return;closed=true;overlay.classList.remove('open');
    try{window.hzStopCelebrate?.();}catch{}
    setTimeout(()=>overlay.remove(),140);
    if(reason==='again')options.onAgain?.();else options.onClose?.();
  };
  overlay.querySelector('.hzpc-close').addEventListener('click',()=>close('close'));
  overlay.querySelector('.hzpc-secondary').addEventListener('click',()=>close('close'));
  overlay.querySelector('.hzpc-again')?.addEventListener('click',()=>close('again'));
  overlay.querySelector('.hzpc-backdrop').addEventListener('click',()=>close('close'));
  requestAnimationFrame(()=>overlay.classList.add('open'));
  try{const info=window.hzCelebrate?.();const music=overlay.querySelector('.hzpc-music');if(info?.track&&music)music.textContent=`♫ ${info.track.title}`;}catch{}
  return{close,element:overlay};
}
window.hzShowPracticeCelebration=showPracticeCelebration;

function loadLearning(){
  try{return sanitizeLearningState(JSON.parse(localStorage.getItem(LEARNING_KEY)||'null'));}catch{return defaultLearningState();}
}
function saveLearning(state){
  try{localStorage.setItem(LEARNING_KEY,JSON.stringify(sanitizeLearningState(state)));}catch{}
}
function readerEnabled(){
  try{const raw=localStorage.getItem(READER_KEY);if(raw===null)return true;const parsed=JSON.parse(raw);return parsed&&typeof parsed==='object'?parsed.enabled!==false:raw!=='0';}catch{return true;}
}
function saveReaderEnabled(enabled){
  try{localStorage.setItem(READER_KEY,JSON.stringify({v:2,enabled:Boolean(enabled),changedAt:Date.now()}));}catch{}
}
const DOCK_DEFAULTS={size:'auto',opacity:null,actionSize:'medium',align:'right'};
let dockSettingsCache=null;
let dockPersistTimer=0;
let dockApplyFrame=0;
function sanitizeDockSettings(value){
  const size=['auto','small','medium','large'].includes(value?.size)?value.size:'auto';
  const actionSize=['small','medium','large'].includes(value?.actionSize)?value.actionSize:'medium';
  const align=['left','center','right'].includes(value?.align)?value.align:'right';
  const raw=Number(value?.opacity);
  const opacity=value?.opacity==null||!Number.isFinite(raw)?null:Math.max(.55,Math.min(1,raw));
  return{size,opacity,actionSize,align};
}
function loadDockSettings({refresh=false}={}){
  if(dockSettingsCache&&!refresh)return{...dockSettingsCache};
  try{dockSettingsCache=sanitizeDockSettings(JSON.parse(localStorage.getItem(DOCK_KEY)||'null'));}catch{dockSettingsCache={...DOCK_DEFAULTS};}
  return{...dockSettingsCache};
}
function persistDockSettings(){
  clearTimeout(dockPersistTimer);dockPersistTimer=0;
  const value=loadDockSettings();
  try{localStorage.setItem(DOCK_KEY,JSON.stringify({...value,v:2,changedAt:Date.now()}));}catch{}
}
function applyDockSettings(value=loadDockSettings()){
  dockSettingsCache=sanitizeDockSettings(value);
  const root=document.documentElement;
  root.dataset.readerDockSize=dockSettingsCache.size;
  root.dataset.readerActionSize=dockSettingsCache.actionSize;
  root.dataset.readerDockAlign=dockSettingsCache.align;
  root.style.setProperty('--reader-toolbar-opacity',String(dockSettingsCache.opacity??'var(--hz-reader-dock-opacity, .86)'));
  if(dockSettingsCache.opacity==null)root.style.removeProperty('--hz-reader-dock-opacity');
  else root.style.setProperty('--hz-reader-dock-opacity',String(dockSettingsCache.opacity));
  const sizeMap={small:'44px',medium:'48px',large:'54px'};
  const actionMap={small:'42px',medium:'46px',large:'52px'};
  if(dockSettingsCache.size==='auto')root.style.removeProperty('--reader-toolbar-size');
  else root.style.setProperty('--reader-toolbar-size',sizeMap[dockSettingsCache.size]);
  root.style.setProperty('--reader-action-size',actionMap[dockSettingsCache.actionSize]);
  window.dispatchEvent(new CustomEvent('hz:reader-dock-change',{detail:{...dockSettingsCache}}));
}
function updateDockSettings(patch,{persist=true}={}){
  dockSettingsCache=sanitizeDockSettings({...loadDockSettings(),...patch});
  if(!dockApplyFrame)dockApplyFrame=requestAnimationFrame(()=>{dockApplyFrame=0;applyDockSettings(dockSettingsCache);});
  if(persist){clearTimeout(dockPersistTimer);dockPersistTimer=setTimeout(persistDockSettings,180);}
  return{...dockSettingsCache};
}
function flushDockSettings(){persistDockSettings();}
window.hzReaderDockSettings={get:()=>loadDockSettings(),set:(patch,options)=>updateDockSettings(patch,options),flush:flushDockSettings};

class CentralAudioService{
  constructor(){
    this.audio=new Audio();
    this.audio.preload='auto';
    this.activeUrl='';
    this.cache=new Map();
    this.generation=0;
    this.stableSpeak=null;
    this.playResolve=null;
    this.playReject=null;
    this.queue=[];
    this.queueRunning=false;
    this.queueSequence=0;
    this.activePriority=0;
  }
  captureFallback(){
    if(!this.stableSpeak&&typeof window.hzEmotionSpeak==='function')this.stableSpeak=window.hzEmotionSpeak.bind(window);
  }
  key(textValue,options={}){
    let voice='';
    try{const settings=window.v36GetSettings?.()||{};voice=[settings.voice,settings.speed,settings.pitch,settings.style,options.rate].join('|');}catch{}
    return `${voice}::${String(textValue||'').trim()}`;
  }
  trimCache(){
    if(this.cache.size<=24)return;
    [...this.cache.entries()].sort((a,b)=>a[1].used-b[1].used).slice(0,this.cache.size-24).forEach(([key])=>this.cache.delete(key));
  }
  async getBlob(textValue,options={}){
    const clean=String(textValue||'').trim();
    if(!clean)throw new Error('empty audio text');
    const key=this.key(clean,options),cached=this.cache.get(key);
    if(cached){cached.used=Date.now();return cached.blob;}
    const build=window.hzEmotionBuildSsml||window.v36BuildSsmlAuto||window.h42BuildSsml||window.H46_buildSsml;
    const generate=window.hzEmotionAudioFromSsml||window.h42AudioFromSsml||window.H46_audioFromSsml;
    if(typeof build!=='function'||typeof generate!=='function')throw new Error('natural voice engine unavailable');
    const settings=window.v36GetSettings?.()||{};
    const blob=await generate(build(clean,settings),settings);
    if(!(blob instanceof Blob)||blob.size<1)throw new Error('empty audio response');
    this.cache.set(key,{blob,used:Date.now()});this.trimCache();
    return blob;
  }
  prefetch(textValue,options={}){return this.getBlob(textValue,options).catch(()=>null);}
  stopCurrent(reason='cancelled'){
    this.generation++;
    try{this.audio.pause();this.audio.removeAttribute('src');this.audio.load();}catch{}
    try{if(window.curAudio&&window.curAudio!==this.audio)window.curAudio.pause();}catch{}
    if(this.activeUrl){try{URL.revokeObjectURL(this.activeUrl);}catch{}this.activeUrl='';}
    if(this.playReject){this.playReject(new DOMException(reason,'AbortError'));}
    this.playResolve=null;this.playReject=null;
  }
  clearQueue(reason='cancelled'){
    const error=new DOMException(reason,'AbortError');
    while(this.queue.length){try{this.queue.shift().reject(error);}catch{}}
  }
  cancel(){this.clearQueue('cancelled');this.stopCurrent('cancelled');try{speechSynthesis.cancel();}catch{}}
  pause(){if(!this.audio.paused)this.audio.pause();}
  resume(){return this.audio.play();}
  async playBlob(blob,{interrupt=true}={}){
    if(interrupt)this.stopCurrent('interrupted');
    const token=++this.generation;
    if(this.activeUrl){try{URL.revokeObjectURL(this.activeUrl);}catch{}}
    this.activeUrl=URL.createObjectURL(blob);
    const audio=this.audio;
    audio.src=this.activeUrl;audio.preload='auto';
    try{window.curAudio=audio;}catch{}
    return new Promise((resolve,reject)=>{
      this.playResolve=resolve;this.playReject=reject;
      const timeout=setTimeout(()=>cleanup(new Error('audio playback timeout')),Math.max(30000,Math.min(240000,(blob?.size||0)*18)));
      const cleanup=(error)=>{
        if(token!==this.generation)return;
        clearTimeout(timeout);audio.onended=audio.onerror=null;this.playResolve=this.playReject=null;
        if(error)reject(error);else resolve(true);
      };
      audio.onended=()=>cleanup();
      audio.onerror=()=>cleanup(new Error('audio playback failed'));
      audio.play().catch(cleanup);
    });
  }
  speak(textValue,options={}){
    const priority=Number.isFinite(Number(options.priority))?Number(options.priority):50;
    const replace=options.interrupt!==false;
    if(replace){
      this.clearQueue('superseded');
      if(this.queueRunning)this.stopCurrent('superseded');
      try{speechSynthesis.cancel();}catch{}
    }
    return new Promise((resolve,reject)=>{
      this.queue.push({id:++this.queueSequence,textValue,options:{...options,interrupt:false},priority,resolve,reject});
      this.queue.sort((a,b)=>b.priority-a.priority||a.id-b.id);
      this.pumpQueue();
    });
  }
  async pumpQueue(){
    if(this.queueRunning)return;
    this.queueRunning=true;
    try{
      while(this.queue.length){
        const task=this.queue.shift();this.activePriority=task.priority;
        try{task.resolve(await this.speakNow(task.textValue,task.options));}
        catch(error){task.reject(error);}
      }
    }finally{this.activePriority=0;this.queueRunning=false;}
  }
  async speakNow(textValue,options={}){
    this.captureFallback();
    try{
      const blob=await this.getBlob(textValue,options);
      return await this.playBlob(blob,{interrupt:false});
    }catch(error){
      if(error?.name==='AbortError')throw error;
      if(this.stableSpeak){const ok=await this.stableSpeak(String(textValue||''),options.kind||'sentence');if(ok)return true;}
      return await this.browserSpeak(textValue,options);
    }
  }
  browserSpeak(textValue,options={}){
    return new Promise((resolve,reject)=>{
      if(!('speechSynthesis'in window))return reject(new Error('speech synthesis unavailable'));
      try{
        speechSynthesis.cancel();
        const utterance=new SpeechSynthesisUtterance(String(textValue||''));
        utterance.lang='zh-CN';utterance.rate=Number(options.rate)||.92;
        utterance.onend=()=>resolve(true);utterance.onerror=event=>reject(event.error||new Error('speech synthesis failed'));
        speechSynthesis.speak(utterance);
      }catch(error){reject(error);}
    });
  }
}
const audioService=new CentralAudioService();
window.hzLearningAudio=audioService;

function currentReaderText(){
  const root=$('#rtext');
  if(root){
    const units=[...root.querySelectorAll('.wunit')];
    if(units.length){
      const textValue=units.map(unit=>[...unit.querySelectorAll('.hzch')].map(node=>node.textContent||'').join('')||unit.querySelector('.hzrow')?.textContent||'').join('');
      if(textValue.trim())return textValue;
    }
    if(root.innerText.trim())return root.innerText;
  }
  return '';
}

class EnhancedReader{
  constructor(service){
    this.service=service;this.state='idle';this.segments=[];this.index=0;this.session=0;this.prefetch=new Map();this.paused=false;
  }
  status(message){
    const status=$('#read-speed');if(status){status.textContent=message;status.classList.add('h48-substatus','hzle-reader-status');status.style.display='inline-flex';}
  }
  button(){return $('#read-play');}
  update(){
    const button=this.button(),c=tr();if(!button)return;
    button.classList.add('h48-tts-main','hzle-reader-main');
    button.disabled=this.state==='preparing';
    if(this.state==='preparing')button.innerHTML=`<span class="h48-spin"></span>${esc(c.readerPreparing)}…`;
    else if(this.state==='playing')button.textContent=c.pause;
    else if(this.state==='paused')button.textContent=c.resume;
    else button.textContent=c.play;
  }
  reset(){
    this.session++;this.service.cancel();this.prefetch.clear();this.segments=[];this.index=0;this.state='idle';this.paused=false;this.status(tr().readerIdle);this.update();
  }
  async toggle(){
    if(this.state==='playing'){this.service.pause();this.state='paused';this.status(tr().readerPaused);this.update();return;}
    if(this.state==='paused'){try{await this.service.resume();this.state='playing';this.status(`${tr().readerPlaying} ${this.index+1}/${this.segments.length}`);}catch{this.reset();}this.update();return;}
    await this.start();
  }
  prefetchAt(index,token){
    if(index<0||index>=this.segments.length||this.prefetch.has(index))return;
    const promise=this.service.getBlob(this.segments[index]).then(blob=>{if(token!==this.session)throw new DOMException('stale','AbortError');return blob;});
    this.prefetch.set(index,promise);
  }
  async start(){
    const value=currentReaderText(),c=tr();
    if(!value.trim()){this.status(c.readerError);return;}
    this.reset();const token=++this.session;
    this.segments=segmentChineseText(value,{target:300,min:90,hardMax:620});
    if(!this.segments.length){this.status(c.readerError);return;}
    this.state='preparing';this.status(`${c.readerPreparing} 1/${this.segments.length}`);this.update();
    this.prefetchAt(0,token);this.prefetchAt(1,token);
    try{
      for(this.index=0;this.index<this.segments.length;this.index++){
        if(token!==this.session)return;
        const blob=await this.prefetch.get(this.index);
        if(token!==this.session)return;
        this.prefetchAt(this.index+1,token);this.prefetchAt(this.index+2,token);
        this.state='playing';this.status(`${c.readerPlaying} ${this.index+1}/${this.segments.length}`);this.update();
        await this.service.playBlob(blob,{interrupt:this.index===0});
        this.prefetch.delete(this.index);
      }
      if(token!==this.session)return;
      this.state='idle';this.status(c.readerEnd);this.update();
      try{window.hzStat?.bump?.('read',Math.max(1,Math.round(value.length/5)));}catch{}
    }catch(error){
      if(error?.name==='AbortError'||token!==this.session)return;
      this.state='fallback';this.status(c.readerFallback);this.update();
      try{
        const remaining=this.segments.slice(this.index).join(' ');
        await this.service.speak(remaining,{kind:'sentence'});
        if(token===this.session){this.state='idle';this.status(c.readerEnd);this.update();}
      }catch{
        if(token===this.session){this.state='error';this.status(c.readerError);this.update();}
      }
    }
  }
}
const enhancedReader=new EnhancedReader(audioService);
window.hzEnhancedReader=enhancedReader;

function installReaderCapture(){
  if(document.documentElement.dataset.hzReaderCapture)return;
  document.documentElement.dataset.hzReaderCapture='1';
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('#read-play');
    if(!button||!readerEnabled())return;
    event.preventDefault();event.stopImmediatePropagation();enhancedReader.toggle();
  },true);
  const sync=()=>requestAnimationFrame(()=>{const button=$('#read-play');if(readerEnabled()&&button&&enhancedReader.state==='idle'&&!button.classList.contains('hzle-reader-main'))enhancedReader.update();});
  document.addEventListener('hz:reader-mounted',sync,{passive:true});
  document.addEventListener('hz:screen-visible',event=>{if(event.detail?.id==='sr')sync();},{passive:true});
  sync();
}

function installReaderSetting(){
  applyDockSettings();
  const host=$('#style-scroll');if(!host||$('#hzle-reader-setting',host))return;
  const c=tr();
  const sizeButtons=(name,values)=>`<div class="hzle-size-options" role="group" aria-label="${esc(name)}">${values.map(([value,label,attr])=>`<button type="button" ${attr}="${value}" aria-pressed="false">${esc(label)}</button>`).join('')}</div>`;
  const block=document.createElement('section');block.id='hzle-reader-setting';block.className='hzle-settings-block';
  block.innerHTML=`<div class="style-row hzle-setting-card"><div><div class="style-lbl">${esc(c.enhanced)}</div><div class="style-sub">${esc(c.enhancedSub)}</div></div><button class="stog hzle-toggle" type="button" aria-pressed="false"></button></div><div class="hzle-dock-setting"><div class="hzle-dock-title"><strong>${esc(c.dockTitle)}</strong><span>${esc(c.dockSub)}</span></div><div class="hzle-setting-line"><span>${esc(c.dockSize)}</span>${sizeButtons(c.dockSize,[['auto',c.auto,'data-dock-size'],['small',c.small,'data-dock-size'],['medium',c.medium,'data-dock-size'],['large',c.large,'data-dock-size']])}</div><div class="hzle-setting-line"><span>${esc(c.dockActionSize)}</span>${sizeButtons(c.dockActionSize,[['small',c.small,'data-action-size'],['medium',c.medium,'data-action-size'],['large',c.large,'data-action-size']])}</div><div class="hzle-setting-line"><span>${esc(c.dockAlign)}</span>${sizeButtons(c.dockAlign,[['left',c.left,'data-dock-align'],['center',c.center,'data-dock-align'],['right',c.right,'data-dock-align']])}</div><div class="hzle-setting-line hzle-opacity-line"><label for="hzle-dock-opacity">${esc(c.dockOpacity)} <output id="hzle-opacity-value"></output></label><input id="hzle-dock-opacity" type="range" min="55" max="100" step="5" aria-describedby="hzle-opacity-value"></div></div>`;
  host.appendChild(block);
  const toggle=$('.hzle-toggle',block),range=$('#hzle-dock-opacity',block),output=$('#hzle-opacity-value',block);
  const responsiveDefault=()=>matchMedia('(max-width:480px)').matches?.78:matchMedia('(max-width:900px)').matches?.86:.92;
  const sync=(value=loadDockSettings())=>{
    const enabled=readerEnabled();toggle.classList.toggle('on',enabled);toggle.setAttribute('aria-pressed',String(enabled));toggle.setAttribute('aria-label',enabled?c.enabled:c.disabled);
    block.querySelectorAll('[data-dock-size]').forEach(button=>{const on=button.dataset.dockSize===value.size;button.classList.toggle('on',on);button.setAttribute('aria-pressed',String(on));});
    block.querySelectorAll('[data-action-size]').forEach(button=>{const on=button.dataset.actionSize===value.actionSize;button.classList.toggle('on',on);button.setAttribute('aria-pressed',String(on));});
    block.querySelectorAll('[data-dock-align]').forEach(button=>{const on=button.dataset.dockAlign===value.align;button.classList.toggle('on',on);button.setAttribute('aria-pressed',String(on));});
    const effective=value.opacity??responsiveDefault(),percent=Math.round(effective*100);if(document.activeElement!==range)range.value=String(percent);output.value=`${percent}%`;output.textContent=output.value;
  };
  toggle.addEventListener('click',()=>{const on=!readerEnabled();saveReaderEnabled(on);if(!on)enhancedReader.reset();sync();});
  block.addEventListener('click',event=>{
    const button=event.target.closest('button[data-dock-size],button[data-action-size],button[data-dock-align]');if(!button||!block.contains(button))return;
    event.preventDefault();const patch=button.dataset.dockSize?{size:button.dataset.dockSize}:button.dataset.actionSize?{actionSize:button.dataset.actionSize}:{align:button.dataset.dockAlign};sync(updateDockSettings(patch));
  });
  range.addEventListener('input',()=>{updateDockSettings({opacity:Number(range.value)/100});output.value=`${range.value}%`;output.textContent=output.value;},{passive:true});
  range.addEventListener('change',()=>{flushDockSettings();sync();});sync();
}

function toneIcon(){return '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="13" width="14" height="38" rx="4" opacity=".46"/><rect x="25" y="13" width="14" height="38" rx="4" opacity=".7"/><rect x="43" y="13" width="14" height="38" rx="4"/><path d="M11 25h6M29 32l6-8M47 23c0 0 2 15 6 15"/><path d="M13 56h38" opacity=".3"/><path d="M20 8h18m0 0-4-4m4 4-4 4" opacity=".75"/></svg>';}
function group(title,skill){
  const section=document.createElement('section');section.className='hzle-practice-group';section.dataset.hzleSkill=skill;section.setAttribute('role','tabpanel');
  section.innerHTML=`<h2>${esc(title)}</h2><div class="hzle-practice-list"></div>`;return section;
}
function compactCard(id,title,subtitle,icon){
  const card=document.createElement('button');card.type='button';card.id=id;card.className='hzp-card hzle-card';
  card.innerHTML=`<div class="hzp-ico">${icon}</div><div class="hzp-lbl">${esc(title)}<br><span class="hzp-sub">${esc(subtitle)}</span></div><div class="hzp-chev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg></div>`;
  return card;
}
function musicIcon(){return '<img class="hzle-guzheng" src="assets/guzheng.svg" alt="" width="76" height="76" loading="eager" decoding="async">';}
function setPracticeCategory(shell,key,{persist=true}={}){
  const allowed=['listening','production','leisure'];if(!allowed.includes(key))key='listening';
  shell.dataset.practiceCategory=key;
  shell.querySelectorAll('[data-practice-tab]').forEach(button=>{const on=button.dataset.practiceTab===key;button.classList.toggle('on',on);button.setAttribute('aria-selected',String(on));button.tabIndex=on?0:-1;});
  shell.querySelectorAll('.hzle-practice-group').forEach(panel=>{const on=panel.dataset.hzleSkill===key;panel.hidden=!on;panel.classList.toggle('on',on);});
  if(persist)try{localStorage.setItem('hzPracticeCategory.v1',key);}catch{}
}
function refreshPracticeCopy(shell){
  const c=tr();
  const values={listening:c.toneTab,production:c.productionTab,leisure:c.leisureTab};
  shell.querySelectorAll('[data-practice-tab]').forEach(button=>{button.textContent=values[button.dataset.practiceTab]||button.textContent;});
  shell.querySelector('[data-hzle-skill="listening"]>h2')?.replaceChildren(document.createTextNode(c.toneListen));
  shell.querySelector('[data-hzle-skill="production"]>h2')?.replaceChildren(document.createTextNode(c.production));
  shell.querySelector('[data-hzle-skill="leisure"]>h2')?.replaceChildren(document.createTextNode(c.leisure));
  const labels=[['#hzp-game',c.toneGame,c.toneGameSub],['#hzp-tone-sequence',c.sequence,c.sequenceSub],['#hzp-writing',c.writing,c.writingSub],['#hzp-music',c.music,c.musicSub]];
  labels.forEach(([selector,title,sub])=>{const label=$(selector+' .hzp-lbl',shell);if(label)label.innerHTML=`${esc(title)}<br><span class="hzp-sub">${esc(sub)}</span>`;});
}
function installPracticeHub(){
  const hub=$('#hz-sp-hub');if(!hub)return;
  if(hub.dataset.hzLearningOrganized){
    const shell=$('.hzle-practice-shell',hub),lateWriting=$('#hzp-writing',hub),target=$('[data-hzle-skill="production"] .hzle-practice-list',hub);
    if(lateWriting&&target&&lateWriting.parentElement!==target)target.appendChild(lateWriting);
    if(shell)refreshPracticeCopy(shell);return;
  }
  const oldTone=$('#hzp-game',hub),oldWriting=$('#hzp-writing',hub),oldMusic=$('#hzp-music',hub);if(!oldTone)return;
  hub.dataset.hzLearningOrganized='1';oldMusic?.remove();
  const title=$('.hzp-title',hub),waves=$('.hzp-waves',hub),shell=document.createElement('div');shell.className='hzle-practice-shell';
  if(waves)shell.appendChild(waves);if(title){title.textContent=tr().practice;shell.appendChild(title);}
  const tabs=document.createElement('div');tabs.className='hzle-practice-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label',tr().practice);
  tabs.innerHTML=[['listening',tr().toneTab],['production',tr().productionTab],['leisure',tr().leisureTab]].map(([key,label])=>`<button type="button" role="tab" data-practice-tab="${key}" aria-selected="false">${esc(label)}</button>`).join('');
  const panels=document.createElement('div');panels.className='hzle-practice-panels';
  const listening=group(tr().toneListen,'listening'),production=group(tr().production,'production'),leisure=group(tr().leisure,'leisure');
  oldTone.remove();listening.lastElementChild.appendChild(oldTone);
  const sequence=compactCard('hzp-tone-sequence',tr().sequence,tr().sequenceSub,toneIcon());sequence.addEventListener('click',openToneSequence);listening.lastElementChild.appendChild(sequence);
  if(oldWriting){oldWriting.remove();production.lastElementChild.appendChild(oldWriting);}
  const music=compactCard('hzp-music',tr().music,tr().musicSub,musicIcon());music.addEventListener('click',()=>window.hzOpenMusic?.());leisure.lastElementChild.appendChild(music);
  panels.append(listening,production,leisure);shell.append(tabs,panels);hub.replaceChildren(shell);
  tabs.addEventListener('click',event=>{const button=event.target.closest('[data-practice-tab]');if(button)setPracticeCategory(shell,button.dataset.practiceTab);});
  tabs.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;const buttons=[...tabs.querySelectorAll('[data-practice-tab]')],index=buttons.indexOf(document.activeElement);if(index<0)return;event.preventDefault();const next=buttons[(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length];next.focus();setPracticeCategory(shell,next.dataset.practiceTab);});
  let saved='listening';try{saved=localStorage.getItem('hzPracticeCategory.v1')||saved;}catch{}setPracticeCategory(shell,saved,{persist:false});refreshPracticeCopy(shell);
}


const TONE_RECENT_KEY='hzToneSequenceRecent.v2';
class ToneSequenceChallengeProvider{
  constructor(){this.poolPromise=null;this.queue=[];this.recent=this.readRecent();this.filling=null;this.pinyinReadyPromise=null;}
  readRecent(){try{const v=JSON.parse(localStorage.getItem(TONE_RECENT_KEY)||'[]');return Array.isArray(v)?v.slice(-36):[];}catch{return[];}}
  saveRecent(){try{localStorage.setItem(TONE_RECENT_KEY,JSON.stringify(this.recent.slice(-36)));}catch{}}
  userTerms(){
    const found=new Set();
    try{for(const term of JSON.parse(localStorage.getItem('hzDictionaryRecent.v1')||'[]')||[])if(term)found.add(String(term));}catch{}
    document.querySelectorAll('#rtext .wd,[data-word]').forEach(node=>{const value=node.dataset.word||node.textContent;if(value&&/[\u3400-\u9fff]/.test(value))found.add(String(value).trim());});
    return [...found].filter(Boolean).slice(-120);
  }
  async wordPool(){
    if(this.poolPromise)return this.poolPromise;
    this.poolPromise=(async()=>{
      const rows=[];const seen=new Set();
      const add=(word,level=1,source='hsk')=>{word=String(word||'').trim();const length=[...word].length;if(!word||length<1||length>5||seen.has(word)||!/[\u3400-\u9fff]/.test(word))return;seen.add(word);rows.push({word,level:Math.max(1,Math.min(4,Number(level)||1)),source});};
      this.userTerms().forEach(word=>add(word,2,'history'));
      try{const response=await fetch('db/hsk-expanded.json',{cache:'force-cache'});if(response.ok){const db=await response.json();for(const [level,list] of Object.entries(db.words||{})){if(Number(level)>6)continue;for(const word of Array.isArray(list)?list:[])add(word,Math.min(4,Math.ceil(Number(level)/2)),'hsk');}}}catch{}
      TONE_ITEMS.forEach(item=>add(item.hanzi,item.level,'fallback'));
      return rows;
    })();
    return this.poolPromise;
  }
  async waitForPinyin(){
    if(typeof window.pinyinFn==='function')return true;
    if(!this.pinyinReadyPromise)this.pinyinReadyPromise=(async()=>{
      try{await Promise.race([Promise.resolve(window.hzEnsurePinyinLib?.()),new Promise(resolve=>setTimeout(resolve,900))]);}catch{}
      return typeof window.pinyinFn==='function';
    })();
    return this.pinyinReadyPromise;
  }
  pinyinFor(word){
    try{const value=window.pinyinFn?.(word,{toneType:'symbol',type:'array'});if(Array.isArray(value))return value.join(' ');}catch{}
    try{return String(window.pinyinFn?.(word,{toneType:'symbol'})||'').trim();}catch{return'';}
  }
  async build(raw){
    const pinyin=this.pinyinFor(raw.word);const tones=extractToneSequence(pinyin);if(!pinyin||!tones.length||tones.length!==[...raw.word].length)return null;
    const historyTag=uiLang()==='en'?'From your vocabulary':uiLang()==='es'?'De tu vocabulario':'Do seu vocabulário';
    return{id:`dyn:${raw.word}`,hanzi:raw.word,pinyin,tones,meaning:raw.source==='history'?historyTag:'',level:raw.level||1,source:raw.source};
  }
  signature(item){return `${item.tones.join('-')}|${item.tones.length}`;}
  async makeOne(state){
    await this.waitForPinyin();
    const pool=await this.wordPool(),maxLevel=unlockedToneLevel(state),recentRows=this.recent.slice(-18).map(entry=>String(entry).split('::')),recentIds=new Set(recentRows.map(parts=>parts[0]).filter(Boolean)),recentSignatures=new Set(this.recent.slice(-8).map(entry=>String(entry).split('::')[1]).filter(Boolean));
    const candidates=[];for(let i=0;i<Math.min(pool.length,900);i++){
      const raw=pool[Math.floor(Math.random()*pool.length)];if(raw.level>maxLevel||recentIds.has(`dyn:${raw.word}`))continue;
      const item=await this.build(raw);if(!item)continue;const signature=this.signature(item);if(recentSignatures.has(signature)&&candidates.length<12)continue;candidates.push(item);if(candidates.length>=28)break;
    }
    const selected=selectAdaptiveToneItem(candidates.length?candidates:TONE_ITEMS,state,{maxLevel})||TONE_ITEMS[0];
    const signature=this.signature(selected);this.recent.push(`${selected.id}::${signature}`);this.recent=this.recent.slice(-36);this.saveRecent();return selected;
  }
  async fill(state){if(this.filling)return this.filling;this.filling=(async()=>{while(this.queue.length<5)this.queue.push(await this.makeOne(state));})().finally(()=>{this.filling=null;});return this.filling;}
  async next(state){if(!this.queue.length)await this.fill(state);const item=this.queue.shift()||TONE_ITEMS[0];this.fill(state);return item;}
}
const toneChallengeProvider=new ToneSequenceChallengeProvider();
window.ToneSequenceChallengeProvider=toneChallengeProvider;

const TONE_INTRO_SEEN_KEY='hzIntroSeen.toneSequence';
class ToneSequenceGame{
  constructor(panel){
    this.panel=panel;this.state=loadLearning();this.item=null;this.answer=[];this.replays=0;this.startedAt=0;this.locked=false;this.introduced=false;this.destroyed=false;this.finished=false;
    // v5.1: a sessão é contínua — sem quantidade máxima obrigatória.
    this.stats={done:0,hits:0,streak:0,bestStreak:0,replays:0,sessionStart:0,perTone:{1:{seen:0,err:0},2:{seen:0,err:0},3:{seen:0,err:0},4:{seen:0,err:0},5:{seen:0,err:0}}};
  }
  introSeen(){try{return localStorage.getItem(TONE_INTRO_SEEN_KEY)==='1';}catch{return false;}}
  markIntroSeen(){try{localStorage.setItem(TONE_INTRO_SEEN_KEY,'1');}catch{}}
  start(){if(this.introSeen())this.beginSession();else this.showIntro();}
  beginSession(){
    try{window.hzPreloadCelebration?.();}catch{}
    this.introduced=true;this.stats.sessionStart=Date.now();this.finished=false;
    window.__hzPracticeFinish=reason=>this.exit(reason);
    this.state.sessions.count=(Number(this.state.sessions.count)||0)+1;this.state.sessions.lastAt=Date.now();saveLearning(this.state);this.next();
  }
  exit(reason='ui'){
    if(this.destroyed||this.finished)return;
    if(this.stats.done>0){this.finish(reason);return;}
    window.__hzPracticeFinish=null;audioService.cancel();window.hzBackToHub?.();
  }
  showIntro(){
    audioService.cancel();const c=tr();
    this.panel.innerHTML=`<div class="hzts-intro"><button type="button" class="hzts-intro-back" aria-label="${esc(c.back)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button><div class="hzts-intro-icon">${toneIcon()}</div><p class="hzts-intro-kicker">${esc(c.sequence)}</p><h1>${esc(c.howTitle)}</h1><p class="hzts-intro-copy">${esc(c.howIntro)}</p><ol><li><b>1</b><span>${esc(c.how1)}</span></li><li><b>2</b><span>${esc(c.how2)}</span></li><li><b>3</b><span>${esc(c.how3)}</span></li><li><b>4</b><span>${esc(c.how4)}</span></li></ol><p class="hzts-intro-note">${esc(c.howNote)}</p><button type="button" class="pri" id="hzts-start">${esc(c.startGame)}</button></div>`;
    $('.hzts-intro-back',this.panel).addEventListener('click',()=>window.hzBackToHub?.());$('#hzts-start',this.panel).addEventListener('click',()=>{this.markIntroSeen();this.beginSession();});
  }
  showHelp(){
    // Ajuda durante a sessão: overlay por cima do jogo, sem perder o progresso.
    const c=tr();document.getElementById('hzts-help-overlay')?.remove();
    const wrap=document.createElement('div');wrap.id='hzts-help-overlay';wrap.className='hz51-overlay';wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');
    wrap.innerHTML=`<div class="hz51-overlay-back"></div><section class="hz51-intro-card" tabindex="-1"><p class="hz51-kicker">${esc(c.help)}</p><h2>${esc(c.howTitle)}</h2><p class="hz51-lead">${esc(c.howIntro)}</p><ol class="hz51-steps"><li><b>1</b><span>${esc(c.how1)}</span></li><li><b>2</b><span>${esc(c.how2)}</span></li><li><b>3</b><span>${esc(c.how3)}</span></li><li><b>4</b><span>${esc(c.how4)}</span></li></ol><p class="hz51-lead" style="margin-top:10px">${esc(c.howNote)}</p><div class="hz51-intro-actions"><button type="button" class="pri" data-help-close>${esc(c.back)}</button></div></section>`;
    document.body.appendChild(wrap);
    const close=()=>{wrap.classList.remove('open');setTimeout(()=>wrap.remove(),160);};
    wrap.querySelector('[data-help-close]').onclick=close;wrap.querySelector('.hz51-overlay-back').onclick=close;
    requestAnimationFrame(()=>{wrap.classList.add('open');wrap.querySelector('.hz51-intro-card')?.focus?.({preventScroll:true});});
  }
  async pick(){return toneChallengeProvider.next(this.state);}
  renderShell(){
    const c=tr();this.panel.innerHTML=`<div class="hzts-shell"><header class="hzts-head"><button type="button" class="hzts-back" aria-label="${esc(c.back)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button><div><h1>${esc(c.sequence)}</h1><p>${esc(c.skill)} · <span id="hzts-level"></span></p></div><div class="hzts-head-actions"><button type="button" class="hzts-help" aria-label="${esc(c.help)}">?</button><div class="hzts-headstats"><div class="hzts-chip"><b id="hzts-round">0</b><span>${esc(c.doneLbl)}</span></div><div class="hzts-chip streak"><b id="hzts-streak">0</b><span>${esc(c.streakLbl)}</span></div><div class="hzts-chip"><b id="hzts-score">0</b><span>${esc(c.hitsLbl)}</span></div><div class="hzts-chip acc"><b id="hzts-acc">—</b><span>${esc(c.accLbl)}</span></div></div></div></header><main class="hzts-card"><div class="hzts-kicker">${esc(c.instruction)}</div><button type="button" class="hzts-listen" id="hzts-listen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 010 7"/></svg><span>${esc(c.listen)}</span></button><div class="hzts-status" id="hzts-status" aria-live="polite"></div><div class="hzts-slots" id="hzts-slots"></div><div class="hzts-tones" id="hzts-tones"></div><div class="hzts-actions"><button type="button" id="hzts-undo">${esc(c.undo)}</button><button type="button" class="pri" id="hzts-check" disabled>${esc(c.check)}</button></div><section class="hzts-feedback" id="hzts-feedback" hidden></section><button type="button" class="hzts-finish-link" id="hzts-finish-session">${esc(c.finishBtn)}</button></main></div>`;
    $('.hzts-back',this.panel).addEventListener('click',()=>this.exit('ui'));
    $('#hzts-finish-session',this.panel).addEventListener('click',()=>this.exit('ui'));
    $('.hzts-help',this.panel).addEventListener('click',()=>this.showHelp());
    $('#hzts-listen',this.panel).addEventListener('click',()=>this.play(true));
    $('#hzts-undo',this.panel).addEventListener('click',()=>{if(!this.locked){this.answer.pop();this.renderAnswer();}});
    $('#hzts-check',this.panel).addEventListener('click',()=>this.check());
  }
  updateStats(){
    const s=this.stats;
    const set=(id,v)=>{const el=$(id,this.panel);if(el)el.textContent=v;};
    set('#hzts-round',String(s.done));set('#hzts-streak',String(s.streak));set('#hzts-score',String(s.hits));
    set('#hzts-acc',s.done?Math.round(s.hits/s.done*100)+'%':'—');
  }
  async next(){
    if(this.destroyed||this.finished)return;
    if(!this.panel.querySelector('.hzts-shell'))this.renderShell();
    this.item=await this.pick();if(this.destroyed||!this.item)return;this.answer=[];this.replays=0;this.startedAt=performance.now();this.locked=false;
    $('#hzts-feedback',this.panel).hidden=true;$('#hzts-feedback',this.panel).innerHTML='';
    this.updateStats();$('#hzts-level',this.panel).textContent=`${tr().level} ${this.item.level}`;
    $('#hzts-status',this.panel).textContent=tr().loading;
    $('#hzts-listen span',this.panel).textContent=tr().listen;$('#hzts-listen',this.panel).disabled=true;
    $('#hzts-tones',this.panel).innerHTML=[1,2,3,4,5].map(t=>`<button type="button" data-tone="${t}"><b>${t===5?'·':t}</b><span>${esc(toneLabel(t))}</span></button>`).join('');
    $('#hzts-tones',this.panel).querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>this.add(Number(button.dataset.tone))));
    this.renderAnswer();
    audioService.prefetch(this.item.hanzi).then(()=>{if(this.destroyed||!this.panel.isConnected||!this.item)return;const listen=$('#hzts-listen',this.panel),status=$('#hzts-status',this.panel);if(!listen||!status)return;listen.disabled=false;status.textContent=tr().ready;this.play(false);});
  }
  add(tone){if(this.locked||this.answer.length>=this.item.tones.length)return;this.answer.push(tone);this.renderAnswer();}
  renderAnswer(){
    const count=this.item?.tones.length||0,slots=$('#hzts-slots',this.panel);if(!slots)return;
    slots.innerHTML=Array.from({length:count},(_,index)=>`<button type="button" data-index="${index}" class="${this.answer[index]?'filled':''}">${this.answer[index]===5?'·':(this.answer[index]||index+1)}</button>`).join('');
    slots.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{if(!this.locked&&Number(button.dataset.index)<this.answer.length){this.answer.splice(Number(button.dataset.index),1);this.renderAnswer();}}));
    $('#hzts-check',this.panel).disabled=this.answer.length!==count||this.locked;
  }
  async play(countReplay=true){
    if(!this.item)return;if(countReplay)this.replays++;
    const button=$('#hzts-listen',this.panel),status=$('#hzts-status',this.panel);if(!button||!status)return;button.disabled=true;status.textContent=tr().loading;
    try{await audioService.speak(this.item.hanzi,{kind:'word'});if(!this.destroyed&&status.isConnected)status.textContent=tr().select;}
    catch(error){if(error?.name!=='AbortError'&&!this.destroyed&&status.isConnected)status.textContent=tr().readerError;}
    finally{if(!this.destroyed&&this.item&&button.isConnected)button.disabled=false;}
  }
  async check(){
    if(this.locked||this.answer.length!==this.item.tones.length)return;
    this.locked=true;const correct=this.answer.every((tone,index)=>tone===this.item.tones[index]);
    const s=this.stats;s.done++;s.replays+=this.replays;
    if(correct){s.hits++;s.streak++;s.bestStreak=Math.max(s.bestStreak,s.streak);}else s.streak=0;
    this.item.tones.forEach((tone,index)=>{const bucket=s.perTone[tone];if(!bucket)return;bucket.seen++;if(this.answer[index]!==tone)bucket.err++;});
    const responseMs=Math.round(performance.now()-this.startedAt);
    this.state=updateReviewItem(this.state,this.item,{correct,answer:this.answer,replays:this.replays,responseMs});saveLearning(this.state);
    try{window.hzStat?.bump?.('game',Math.max(1,Math.round(responseMs/1000)));}catch{}
    this.renderAnswer();this.updateStats();
    const feedback=$('#hzts-feedback',this.panel);feedback.hidden=false;
    const positions=this.item.tones.map((tone,index)=>`<span class="${this.answer[index]===tone?'ok':'bad'}"><b>${tone===5?'·':tone}</b><small>${this.answer[index]===tone?'✓':`${this.answer[index]||'–'} → ${tone===5?'·':tone}`}</small></span>`).join('');
    feedback.innerHTML=`<div class="hzts-result ${correct?'ok':'bad'}"><strong>${esc(correct?tr().correct:tr().wrong)}</strong></div><div class="hzts-answer"><div><span>${esc(tr().correctAnswer)}</span><h2>${esc(this.item.hanzi)}</h2><p>${esc(this.item.pinyin)}${this.item.meaning?` · ${esc(this.item.meaning)}`:''}</p></div><div class="hzts-position-grid">${positions}</div></div><div class="hzts-feedback-actions"><button type="button" id="hzts-replay">${esc(tr().listenAgain)}</button><button type="button" class="pri" id="hzts-next" disabled>${esc(tr().next)}</button></div>`;
    const next=$('#hzts-next',feedback),replay=$('#hzts-replay',feedback);
    replay.addEventListener('click',async()=>{next.disabled=true;replay.disabled=true;try{await this.play(true);}finally{replay.disabled=false;next.disabled=false;}});
    next.addEventListener('click',()=>this.next());
    try{await audioService.speak(this.item.hanzi,{kind:'word'});}catch{}
    next.disabled=false;
  }
  destroy(){this.destroyed=true;if(window.__hzPracticeFinish)window.__hzPracticeFinish=null;audioService.cancel();this.panel.replaceChildren();}
  fmtTime(ms){const total=Math.max(0,Math.round(ms/1000));const m=Math.floor(total/60),ss=String(total%60).padStart(2,'0');return `${m}:${ss}`;}
  finish(reason='ui'){
    // v5.1: a sessão só termina quando o usuário decide sair — aqui o
    // resultado é calculado e a tela de prática concluída (componente
    // compartilhado) é aberta, com a trilha curta de encerramento.
    if(this.finished)return;this.finished=true;window.__hzPracticeFinish=null;
    audioService.cancel();const c=tr(),s=this.stats;
    const errors=s.done-s.hits;
    const percent=s.done?Math.round(s.hits/s.done*100):0;
    const duration=s.sessionStart?Date.now()-s.sessionStart:0;
    const score=Math.max(0,s.hits*100+s.bestStreak*20-errors*15);
    const hardestList=Object.entries(s.perTone).filter(([,d])=>d.err>0).sort((a,b)=>b[1].err-a[1].err).slice(0,2)
      .map(([tone,d])=>`${tone==='5'?'·':tone} ${toneLabel(Number(tone))} (${d.err})`);
    const hardest=hardestList.length?hardestList.join(' · '):c.noErrors;
    try{window.hzStore?.saveSession?.('tone-sequence',{done:s.done,hits:s.hits,errors,percent,bestStreak:s.bestStreak,replays:s.replays,perTone:s.perTone,durationMs:duration,score,endedBy:reason});}catch{}
    const stats=[
      {label:c.statChallenges,value:s.done},
      {label:c.statHits,value:s.hits},
      {label:c.statErrors,value:errors},
      {label:c.statBestStreak,value:s.bestStreak},
      {label:c.statHardest,value:hardest},
      {label:c.statTime,value:this.fmtTime(duration)},
      {label:c.statScore,value:score.toLocaleString()}
    ];
    const restart=()=>{
      this.stats={done:0,hits:0,streak:0,bestStreak:0,replays:0,sessionStart:Date.now(),perTone:{1:{seen:0,err:0},2:{seen:0,err:0},3:{seen:0,err:0},4:{seen:0,err:0},5:{seen:0,err:0}}};
      this.finished=false;window.__hzPracticeFinish=r=>this.exit(r);
      const feedback=$('#hzts-feedback',this.panel);if(feedback){feedback.hidden=true;feedback.innerHTML='';}
      this.updateStats();this.next();
    };
    requestAnimationFrame(()=>showPracticeCelebration({title:c.sessionDone,score:s.hits,total:s.done,percent,scoreLabel:`${s.hits}/${s.done}`,subtitle:c.celSubtitle(s.done),stats,againLabel:c.restart,onAgain:restart,onClose:()=>window.hzBackToHub?.()}));
  }
}

function openToneSequence(){
  audioService.cancel();
  if(typeof window.hzMountPracticeActivity==='function'){
    window.hzMountPracticeActivity('tone-sequence',root=>{
      const panel=document.createElement('div');panel.id='hz-tone-sequence-panel';panel.className='tone-sequence-game';root.appendChild(panel);
      const game=new ToneSequenceGame(panel);game.start();return()=>game.destroy();
    });return;
  }
  const hub=$('#hz-sp-hub'),host=$('#hz-sp-host');if(!hub||!host)return;hub.style.display='none';host.style.display='flex';host.replaceChildren();
  const panel=document.createElement('div');panel.id='hz-tone-sequence-panel';panel.className='tone-sequence-game';host.appendChild(panel);new ToneSequenceGame(panel).start();
}
window.hzOpenToneSequence=openToneSequence;

function patchScreenNavigation(){
  const current=window.showScreen;if(typeof current!=='function'||current.__hzLearningAudio)return;
  const wrapped=function(id){
    if(id!=='sp'&&$('#hz-tone-sequence-panel'))audioService.cancel();
    if(id!=='sr'&&enhancedReader.state!=='idle')enhancedReader.reset();
    return current.apply(this,arguments);
  };
  wrapped.__hzLearningAudio=true;window.showScreen=wrapped;
}

function patchProfileAvatar(){
  const avatar=$('#spf-ava');if(!avatar)return;
  const hasImage=Boolean(avatar.style.backgroundImage&&avatar.style.backgroundImage!=='none'&&avatar.style.backgroundImage!=='url("")');
  avatar.classList.toggle('has-image',hasImage);avatar.setAttribute('tabindex','0');avatar.setAttribute('role','button');
  avatar.setAttribute('aria-label',hasImage?(isEnglish()?'Replace profile image':'Substituir imagem do perfil'):(isEnglish()?'Add profile image':'Adicionar imagem do perfil'));
  if(!avatar.dataset.hzKeyboard){avatar.dataset.hzKeyboard='1';avatar.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();$('#spf-file')?.click();}});}
}

function bootEnhancements(){
  audioService.captureFallback();installReaderCapture();installReaderSetting();installPracticeHub();patchProfileAvatar();patchScreenNavigation();
}
let enhancementQueued=false;
function queueEnhancements(){if(enhancementQueued)return;enhancementQueued=true;requestAnimationFrame(()=>{enhancementQueued=false;bootEnhancements();});}
function boot(){
  bootEnhancements();
  document.addEventListener('hz:screen-change',queueEnhancements,{passive:true});
  document.addEventListener('hz:reader-mounted',queueEnhancements,{passive:true});
  document.addEventListener('hz:lang-change',queueEnhancements,{passive:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();

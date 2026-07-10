import {
  TONE_ITEMS,
  defaultLearningState,
  sanitizeLearningState,
  selectAdaptiveToneItem,
  segmentChineseText,
  toneLabel,
  unlockedToneLevel,
  updateReviewItem
} from './learning-core.mjs';

const LEARNING_KEY='hzLearning.v1';
const READER_KEY='hzReaderEngine.v2';
const AMBIENCE_KEY='hzPracticeAmbience.v1';
const $=(selector,root=document)=>root.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const isEnglish=()=>String(window.hzLang?.()||document.documentElement.lang||'pt').toLowerCase().startsWith('en');
const text={
  pt:{
    practice:'Prática',toneListen:'Tons e escuta',production:'Produção e escrita',personal:'Revisão personalizada',
    toneGame:'Identificar o tom',toneGameSub:'Áudio natural · reconhecimento',sequence:'Sequência tonal',sequenceSub:'Reconstrua a ordem dos tons que ouviu',writing:'Escrita de Hanzi',writingSub:'Coordenação e memória visual',
    ambience:'Ambientação opcional',ambienceSub:'Desligada por padrão. A voz sempre reduz a trilha automaticamente.',chooseTrack:'Escolher trilha',on:'Ativada',off:'Desativada',
    back:'Voltar',listen:'Ouvir',listenAgain:'Ouvir novamente',instruction:'Ouça sem ver a resposta e monte a sequência.',
    ready:'O áudio está pronto.',loading:'Preparando áudio natural…',select:'Selecione os tons na ordem ou toque em um bloco para desfazer.',check:'Conferir',undo:'Desfazer',
    correct:'Muito bem — a sequência está correta.',wrong:'Quase. Compare cada posição e tente ouvir a direção do tom.',correctAnswer:'Resposta correta',yourAnswer:'Sua resposta',next:'Próximo desafio',tryAgain:'Tentar de novo',
    progress:'desafio',level:'nível',skill:'discriminação tonal',sessionDone:'Sessão concluída',sessionSummary:'Você concluiu uma sessão curta de recuperação ativa.',restart:'Nova sessão',
    enhanced:'Leitura contínua aprimorada',enhancedSub:'Segmentação linguística, pré-buffer do próximo trecho e fallback automático.',enabled:'Ativada',disabled:'Desativada',
    readerIdle:'Leitura contínua',readerPreparing:'Preparando trecho',readerPlaying:'Reproduzindo',readerPaused:'Pausado',readerFallback:'Fallback de voz ativo',readerEnd:'Fim da leitura',readerError:'Falha no motor aprimorado',
    play:'Reproduzir áudio',pause:'Pausar',resume:'Continuar'
  },
  en:{
    practice:'Practice',toneListen:'Tones and listening',production:'Production and writing',personal:'Personal review',
    toneGame:'Identify the tone',toneGameSub:'Natural audio · recognition',sequence:'Tone sequence',sequenceSub:'Rebuild the order of the tones you heard',writing:'Hanzi writing',writingSub:'Coordination and visual memory',
    ambience:'Optional ambience',ambienceSub:'Off by default. Voice audio always ducks the track automatically.',chooseTrack:'Choose track',on:'On',off:'Off',
    back:'Back',listen:'Listen',listenAgain:'Listen again',instruction:'Listen before seeing the answer, then build the sequence.',
    ready:'Audio is ready.',loading:'Preparing natural audio…',select:'Choose tones in order or tap a slot to undo.',check:'Check',undo:'Undo',
    correct:'Well done — the sequence is correct.',wrong:'Almost. Compare each position and listen for the tone direction.',correctAnswer:'Correct answer',yourAnswer:'Your answer',next:'Next challenge',tryAgain:'Try again',
    progress:'challenge',level:'level',skill:'tone discrimination',sessionDone:'Session complete',sessionSummary:'You completed a short active-recall session.',restart:'New session',
    enhanced:'Enhanced continuous reading',enhancedSub:'Linguistic segmentation, next-segment prebuffering and automatic fallback.',enabled:'On',disabled:'Off',
    readerIdle:'Continuous reading',readerPreparing:'Preparing segment',readerPlaying:'Playing',readerPaused:'Paused',readerFallback:'Voice fallback active',readerEnd:'Reading complete',readerError:'Enhanced engine failed',
    play:'Play audio',pause:'Pause',resume:'Resume'
  }
};
const tr=()=>isEnglish()?text.en:text.pt;

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
function ambienceEnabled(){try{return localStorage.getItem(AMBIENCE_KEY)==='1';}catch{return false;}}
function saveAmbience(enabled){try{localStorage.setItem(AMBIENCE_KEY,enabled?'1':'0');}catch{}}

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
  setDucked(on){
    try{window.hzMusicController?.setDucked?.(Boolean(on));}catch{}
  }
  stopCurrent(reason='cancelled'){
    this.generation++;
    try{this.audio.pause();this.audio.removeAttribute('src');this.audio.load();}catch{}
    try{if(window.curAudio&&window.curAudio!==this.audio)window.curAudio.pause();}catch{}
    if(this.activeUrl){try{URL.revokeObjectURL(this.activeUrl);}catch{}this.activeUrl='';}
    if(this.playReject){this.playReject(new DOMException(reason,'AbortError'));}
    this.playResolve=null;this.playReject=null;this.setDucked(false);
  }
  clearQueue(reason='cancelled'){
    const error=new DOMException(reason,'AbortError');
    while(this.queue.length){try{this.queue.shift().reject(error);}catch{}}
  }
  cancel(){this.clearQueue('cancelled');this.stopCurrent('cancelled');try{speechSynthesis.cancel();}catch{}}
  pause(){if(!this.audio.paused)this.audio.pause();}
  resume(){return this.audio.play();}
  async playBlob(blob,{interrupt=true,keepDucked=false}={}){
    if(interrupt)this.stopCurrent('interrupted');
    const token=++this.generation;
    if(this.activeUrl){try{URL.revokeObjectURL(this.activeUrl);}catch{}}
    this.activeUrl=URL.createObjectURL(blob);
    const audio=this.audio;
    audio.src=this.activeUrl;audio.preload='auto';
    try{window.curAudio=audio;}catch{}
    this.setDucked(true);
    return new Promise((resolve,reject)=>{
      this.playResolve=resolve;this.playReject=reject;
      const timeout=setTimeout(()=>cleanup(new Error('audio playback timeout')),Math.max(30000,Math.min(240000,(blob?.size||0)*18)));
      const cleanup=(error)=>{
        if(token!==this.generation)return;
        clearTimeout(timeout);audio.onended=audio.onerror=null;this.playResolve=this.playReject=null;
        if(!keepDucked)this.setDucked(false);
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
      return await this.playBlob(blob,{interrupt:false,keepDucked:Boolean(options.keepDucked)});
    }catch(error){
      if(error?.name==='AbortError')throw error;
      this.setDucked(true);
      try{
        if(this.stableSpeak){const ok=await this.stableSpeak(String(textValue||''),options.kind||'sentence');if(ok)return true;}
        return await this.browserSpeak(textValue,options);
      }finally{this.setDucked(false);}
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
        await this.service.playBlob(blob,{interrupt:this.index===0,keepDucked:this.index<this.segments.length-1});
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
  const observer=new MutationObserver(()=>{const button=$('#read-play');if(readerEnabled()&&button&&enhancedReader.state==='idle'&&!button.classList.contains('hzle-reader-main'))enhancedReader.update();});
  observer.observe(document.body,{childList:true,subtree:true});
}

function installReaderSetting(){
  if($('#hzle-reader-setting'))return;
  const host=$('#ss .sc')||$('#mo-style #style-scroll')||$('#mo-style .ms');if(!host)return;
  const card=document.createElement('div');card.id='hzle-reader-setting';card.className='card hzle-setting-card';
  card.innerHTML=`<div><strong>${esc(tr().enhanced)}</strong><span>${esc(tr().enhancedSub)}</span></div><button class="stog hzle-toggle" type="button" aria-pressed="false"></button>`;
  host.appendChild(card);
  const button=$('button',card);
  const sync=()=>{const on=readerEnabled();button.classList.toggle('on',on);button.setAttribute('aria-pressed',String(on));button.setAttribute('aria-label',on?tr().enabled:tr().disabled);};
  button.addEventListener('click',()=>{const on=!readerEnabled();saveReaderEnabled(on);if(!on)enhancedReader.reset();sync();});sync();
}

function toneIcon(){return '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor"><path d="M10 45h10V19H10M27 39l9-20 9 20M27 39h18M50 22c4 0 4 8 0 8s-4 8 0 8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 52h46" opacity=".35"/></svg>';}
function group(title){const section=document.createElement('section');section.className='hzle-practice-group';section.innerHTML=`<h2>${esc(title)}</h2><div class="hzle-practice-list"></div>`;return section;}
function compactCard(id,title,subtitle,icon){
  const card=document.createElement('button');card.type='button';card.id=id;card.className='hzp-card hzle-card';
  card.innerHTML=`<div class="hzp-ico">${icon}</div><div class="hzp-lbl">${esc(title)}<br><span class="hzp-sub">${esc(subtitle)}</span></div><div class="hzp-chev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg></div>`;
  return card;
}

function installPracticeHub(){
  const hub=$('#hz-sp-hub');if(!hub)return;
  if(hub.dataset.hzLearningOrganized){
    const lateWriting=$('#hzp-writing',hub),productionTarget=$('[data-hzle-skill="production"] .hzle-practice-list',hub);
    if(lateWriting&&productionTarget&&lateWriting.parentElement!==productionTarget){
      lateWriting.querySelector('.hzp-lbl').innerHTML=`${esc(tr().writing)}<br><span class="hzp-sub">${esc(tr().writingSub)}</span>`;
      productionTarget.appendChild(lateWriting);
    }
    return;
  }
  const oldTone=$('#hzp-game',hub),oldWriting=$('#hzp-writing',hub),oldMusic=$('#hzp-music',hub);
  if(!oldTone)return;
  hub.dataset.hzLearningOrganized='1';
  oldMusic?.remove();
  const title=$('.hzp-title',hub),waves=$('.hzp-waves',hub);
  const shell=document.createElement('div');shell.className='hzle-practice-shell';
  if(waves)shell.appendChild(waves);if(title){title.textContent=tr().practice;shell.appendChild(title);}
  const listening=group(tr().toneListen),production=group(tr().production),personal=group(tr().personal);
  listening.dataset.hzleSkill='listening';production.dataset.hzleSkill='production';personal.dataset.hzleSkill='personal';
  oldTone.remove();oldTone.querySelector('.hzp-lbl').innerHTML=`${esc(tr().toneGame)}<br><span class="hzp-sub">${esc(tr().toneGameSub)}</span>`;
  listening.lastElementChild.appendChild(oldTone);
  const sequence=compactCard('hzp-tone-sequence',tr().sequence,tr().sequenceSub,toneIcon());
  sequence.addEventListener('click',openToneSequence);listening.lastElementChild.appendChild(sequence);
  if(oldWriting){oldWriting.remove();oldWriting.querySelector('.hzp-lbl').innerHTML=`${esc(tr().writing)}<br><span class="hzp-sub">${esc(tr().writingSub)}</span>`;production.lastElementChild.appendChild(oldWriting);}
  const ambience=document.createElement('div');ambience.className='hzle-ambience-card';
  ambience.innerHTML=`<div class="hzle-ambience-copy"><strong>${esc(tr().ambience)}</strong><span>${esc(tr().ambienceSub)}</span></div><div class="hzle-ambience-actions"><button type="button" id="hzle-ambience-toggle"></button><button type="button" id="hzle-track">${esc(tr().chooseTrack)}</button></div>`;
  personal.lastElementChild.appendChild(ambience);
  shell.append(listening,production,personal);hub.replaceChildren(shell);
  const toggle=$('#hzle-ambience-toggle',shell),track=$('#hzle-track',shell);
  const sync=()=>{const on=ambienceEnabled();toggle.textContent=on?tr().on:tr().off;toggle.classList.toggle('on',on);toggle.setAttribute('aria-pressed',String(on));};
  toggle.addEventListener('click',()=>{
    const on=!ambienceEnabled();saveAmbience(on);sync();
    try{if(on)window.hzMusicController?.start?.();else window.hzMusicController?.stop?.();}catch{}
  });
  track.addEventListener('click',()=>window.hzMusicController?.openPicker?.()||window.hzOpenMusic?.());sync();
}

class ToneSequenceGame{
  constructor(panel){this.panel=panel;this.state=loadLearning();this.round=0;this.total=8;this.score=0;this.item=null;this.answer=[];this.replays=0;this.startedAt=0;this.locked=false;}
  start(){
    this.state.sessions.count=(Number(this.state.sessions.count)||0)+1;this.state.sessions.lastAt=Date.now();saveLearning(this.state);this.next();
  }
  pick(){return selectAdaptiveToneItem(TONE_ITEMS,this.state,{maxLevel:unlockedToneLevel(this.state)});}
  renderShell(){
    const c=tr();this.panel.innerHTML=`<div class="hzts-shell"><header class="hzts-head"><button type="button" class="hzts-back" aria-label="${esc(c.back)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button><div><h1>${esc(c.sequence)}</h1><p>${esc(c.skill)} · <span id="hzts-level"></span></p></div><div class="hzts-score"><span id="hzts-round">0/${this.total}</span><strong id="hzts-score">0</strong></div></header><main class="hzts-card"><div class="hzts-kicker">${esc(c.instruction)}</div><button type="button" class="hzts-listen" id="hzts-listen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 010 7"/></svg><span>${esc(c.listen)}</span></button><div class="hzts-status" id="hzts-status" aria-live="polite"></div><div class="hzts-slots" id="hzts-slots"></div><div class="hzts-tones" id="hzts-tones"></div><div class="hzts-actions"><button type="button" id="hzts-undo">${esc(c.undo)}</button><button type="button" class="pri" id="hzts-check" disabled>${esc(c.check)}</button></div><section class="hzts-feedback" id="hzts-feedback" hidden></section></main></div>`;
    $('.hzts-back',this.panel).addEventListener('click',()=>{audioService.cancel();window.hzBackToHub?.();});
    $('#hzts-listen',this.panel).addEventListener('click',()=>this.play(true));
    $('#hzts-undo',this.panel).addEventListener('click',()=>{if(!this.locked){this.answer.pop();this.renderAnswer();}});
    $('#hzts-check',this.panel).addEventListener('click',()=>this.check());
  }
  next(){
    if(this.round>=this.total){this.finish();return;}
    if(!this.panel.querySelector('.hzts-shell'))this.renderShell();
    this.round++;this.item=this.pick();this.answer=[];this.replays=0;this.startedAt=performance.now();this.locked=false;
    $('#hzts-feedback',this.panel).hidden=true;$('#hzts-feedback',this.panel).innerHTML='';
    $('#hzts-round',this.panel).textContent=`${this.round}/${this.total}`;$('#hzts-score',this.panel).textContent=String(this.score);$('#hzts-level',this.panel).textContent=`${tr().level} ${this.item.level}`;
    $('#hzts-status',this.panel).textContent=tr().loading;
    $('#hzts-listen span',this.panel).textContent=tr().listen;$('#hzts-listen',this.panel).disabled=true;
    $('#hzts-tones',this.panel).innerHTML=[1,2,3,4,5].map(t=>`<button type="button" data-tone="${t}"><b>${t===5?'·':t}</b><span>${esc(toneLabel(t))}</span></button>`).join('');
    $('#hzts-tones',this.panel).querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>this.add(Number(button.dataset.tone))));
    this.renderAnswer();
    audioService.prefetch(this.item.hanzi).then(()=>{if(this.item){$('#hzts-listen',this.panel).disabled=false;$('#hzts-status',this.panel).textContent=tr().ready;this.play(false);}});
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
    const button=$('#hzts-listen',this.panel);button.disabled=true;$('#hzts-status',this.panel).textContent=tr().loading;
    try{await audioService.speak(this.item.hanzi,{kind:'word'});$('#hzts-status',this.panel).textContent=tr().select;}
    catch(error){if(error?.name!=='AbortError')$('#hzts-status',this.panel).textContent=tr().readerError;}
    finally{if(this.item)button.disabled=false;}
  }
  async check(){
    if(this.locked||this.answer.length!==this.item.tones.length)return;
    this.locked=true;const correct=this.answer.every((tone,index)=>tone===this.item.tones[index]);if(correct){this.score++;}
    const responseMs=Math.round(performance.now()-this.startedAt);
    this.state=updateReviewItem(this.state,this.item,{correct,answer:this.answer,replays:this.replays,responseMs});saveLearning(this.state);
    try{window.hzStat?.bump?.('game',Math.max(1,Math.round(responseMs/1000)));}catch{}
    this.renderAnswer();$('#hzts-score',this.panel).textContent=String(this.score);
    const feedback=$('#hzts-feedback',this.panel);feedback.hidden=false;
    const positions=this.item.tones.map((tone,index)=>`<span class="${this.answer[index]===tone?'ok':'bad'}"><b>${tone===5?'·':tone}</b><small>${this.answer[index]===tone?'✓':`${this.answer[index]||'–'} → ${tone===5?'·':tone}`}</small></span>`).join('');
    feedback.innerHTML=`<div class="hzts-result ${correct?'ok':'bad'}"><strong>${esc(correct?tr().correct:tr().wrong)}</strong></div><div class="hzts-answer"><div><span>${esc(tr().correctAnswer)}</span><h2>${esc(this.item.hanzi)}</h2><p>${esc(this.item.pinyin)} · ${esc(this.item.meaning)}</p></div><div class="hzts-position-grid">${positions}</div></div><div class="hzts-feedback-actions"><button type="button" id="hzts-replay">${esc(tr().listenAgain)}</button><button type="button" class="pri" id="hzts-next" disabled>${esc(tr().next)}</button></div>`;
    const next=$('#hzts-next',feedback),replay=$('#hzts-replay',feedback);
    replay.addEventListener('click',async()=>{next.disabled=true;replay.disabled=true;try{await this.play(true);}finally{replay.disabled=false;next.disabled=false;}});
    next.addEventListener('click',()=>this.next());
    try{await audioService.speak(this.item.hanzi,{kind:'word'});}catch{}
    next.disabled=false;
  }
  finish(){
    audioService.cancel();const c=tr();this.panel.innerHTML=`<div class="hzts-finish"><div class="hzts-finish-mark">${this.score}/${this.total}</div><h1>${esc(c.sessionDone)}</h1><p>${esc(c.sessionSummary)}</p><button type="button" class="pri" id="hzts-restart">${esc(c.restart)}</button><button type="button" id="hzts-finish-back">${esc(c.back)}</button></div>`;
    $('#hzts-restart',this.panel).addEventListener('click',()=>{this.round=0;this.score=0;this.start();});$('#hzts-finish-back',this.panel).addEventListener('click',()=>window.hzBackToHub?.());
  }
}

function openToneSequence(){
  const hub=$('#hz-sp-hub'),host=$('#hz-sp-host');if(!hub||!host)return;
  audioService.cancel();$('#hz-sp-frame')?.remove();hub.style.display='none';host.style.display='flex';host.innerHTML='<div id="hz-tone-sequence-panel"></div>';
  new ToneSequenceGame($('#hz-tone-sequence-panel')).start();
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
const observer=new MutationObserver(()=>{installReaderSetting();installPracticeHub();patchProfileAvatar();});
function boot(){bootEnhancements();observer.observe(document.body,{childList:true,subtree:true});setTimeout(bootEnhancements,900);setTimeout(bootEnhancements,2600);setTimeout(bootEnhancements,5600);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();

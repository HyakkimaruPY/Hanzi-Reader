(function(){
'use strict';
const HZ49_VERSION='v4.9.3-html1-tts-music-logic';
const HZ49_EDGE_API='/api/edge-tts';
const HZ49_SEG_LEN=30;
let hz49LastUrl=null;
let hz49ReaderSpeaking=false;
let hz49TtsPatching=false;
let hz49MusicPatched=false;

function hz49Log(kind,title,data,status){try{(window.H44_dbg||window.h43DebugLog||function(){})(kind,title,data,status||'');}catch{}}
function hz49Toast(msg){try{(window.h42Toast||window.h41Toast||window.toast||function(x){console.warn(x);})(String(msg||''));}catch{try{console.warn(msg);}catch{}}}
function hz49CjkCount(s){return [...String(s||'')].filter(ch=>/[\u3400-\u9fff\uf900-\ufaff]/.test(ch)).length;}
function hz49Short(s,n=520){s=String(s??'');return s.length>n?s.slice(0,n)+'…':s;}
function hz49Delay(ms){return new Promise(r=>setTimeout(r,ms));}
function hz49CleanForSpeech(s){return String(s||'').replace(/\s+/g,'').replace(/[\u200b\u200c\u200d\ufeff]/g,'').trim();}
function hz49StopAudio(){
 try{const old=window.curAudio||null;if(old)old.pause();}catch{}
 try{if(hz49LastUrl){URL.revokeObjectURL(hz49LastUrl);hz49LastUrl=null;}}catch{}
 try{speechSynthesis&&speechSynthesis.cancel();}catch{}
 hz49ReaderSpeaking=false;
 try{document.getElementById('read-play')?.classList.remove('on','h48-working');}catch{}
}
function hz49PlayBlob(blob){return new Promise((resolve,reject)=>{try{hz49StopAudio();}catch{}const url=URL.createObjectURL(blob);hz49LastUrl=url;const a=new Audio(url);try{curAudio=a;}catch{}window.curAudio=a;const timeout=setTimeout(()=>{try{a.pause();}catch{}reject(new Error('timeout de áudio'));},Math.max(16000,Math.min(240000,(blob.size||20000)*12)));a.onended=()=>{clearTimeout(timeout);resolve(true);};a.onerror=()=>{clearTimeout(timeout);reject(new Error('falha no player de áudio'));};a.play().catch(e=>{clearTimeout(timeout);reject(e);});});}
function hz49PlayUrl(url,timeoutMs=15000){return new Promise((resolve,reject)=>{try{hz49StopAudio();}catch{}const a=new Audio();try{curAudio=a;}catch{}window.curAudio=a;a.preload='auto';a.src=url;const timeout=setTimeout(()=>{try{a.pause();}catch{}reject(new Error('timeout'));},timeoutMs);a.onended=()=>{clearTimeout(timeout);resolve(true);};a.onerror=()=>{clearTimeout(timeout);reject(new Error('audio'));};a.play().catch(e=>{clearTimeout(timeout);reject(e);});});}
async function hz49SpeakByUrl(text){
 const raw=hz49CleanForSpeech(text);if(!raw)return false;
 const short=raw.slice(0,180);const q=encodeURIComponent(short);
 const urls=[
  `https://dict.youdao.com/dictvoice?audio=${q}&type=1`,
  `https://dict.youdao.com/dictvoice?audio=${q}&type=2`,
  `https://tts.youdao.com/fanyivoice?word=${q}&le=zh`,
  `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=zh-CN&q=${q}&client=tw-ob`
 ];
 for(const u of urls){try{await hz49PlayUrl(u,/[。！？!?，,；;]/.test(raw)||raw.length>8?18000:10000);hz49Log('tts.fallback.url','fallback por URL tocou',{url:u.split('?')[0],chars:raw.length},'ok');return true;}catch(e){hz49Log('tts.fallback.url','rota URL falhou',{url:u.split('?')[0],error:e.message||String(e)},'error');}}
 return false;
}
function hz49SpeechSynthesis(text){return new Promise((resolve,reject)=>{try{
 if(!('speechSynthesis' in window))return reject(new Error('speechSynthesis indisponível'));
 speechSynthesis.cancel();
 const raw=hz49CleanForSpeech(text);if(!raw)return resolve(false);
 const getVoice=()=>{const voices=speechSynthesis.getVoices&&speechSynthesis.getVoices()||[];return voices.find(x=>/^zh[-_]?CN/i.test(x.lang||''))||voices.find(x=>/^zh/i.test(x.lang||''))||voices.find(x=>/Chinese|Mandarin|普通话|中文/i.test(x.name||''))||null;};
 const chunks=raw.match(/.{1,82}(?:[。！？!?；;，,、：:]|$)/g)?.filter(Boolean)||[raw];let i=0;
 const playNext=()=>{if(i>=chunks.length)return resolve(true);const u=new SpeechSynthesisUtterance(chunks[i++]);u.lang='zh-CN';u.rate=0.88;u.pitch=1.02;const v=getVoice();if(v)u.voice=v;u.onend=()=>setTimeout(playNext,60);u.onerror=e=>reject(new Error(e.error||'speechSynthesis'));speechSynthesis.speak(u);};
 if(!speechSynthesis.getVoices().length){speechSynthesis.onvoiceschanged=()=>{};setTimeout(playNext,90);}else playNext();
}catch(e){reject(e);}});}
function hz49ExtractTextFromSsml(ssml){return String(ssml||'').replace(/<break\b[^>]*>/gi,'。').replace(/<[^>]+>/g,'').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();}
async function hz49ApiSsmlBlob(ssml,settings={}){
 const payload={ssml,format:settings.quality||settings.format||'audio-24khz-48kbitrate-mono-mp3',voice:settings.voice||settings.classicVoice||'zh-CN-XiaoxiaoNeural'};
 const r=await fetch(HZ49_EDGE_API,{method:'POST',headers:{'Content-Type':'application/json','X-HZ-App':'1'},body:JSON.stringify(payload)});
 if(!r.ok){const raw=await r.text().catch(()=>String(r.status));throw new Error('API Edge TTS '+r.status+': '+hz49Short(raw,380));}
 return await r.blob();
}
async function hz49ApiTextBlob(text,settings={}){
 const payload={text:hz49CleanForSpeech(text),format:settings.quality||settings.format||'audio-24khz-48kbitrate-mono-mp3',voice:settings.voice||settings.classicVoice||'zh-CN-XiaoxiaoNeural',style:settings.classicStyle||settings.style||'general',speed:settings.speed||1,pitch:settings.pitch||0,volume:settings.volume||0};
 const r=await fetch(HZ49_EDGE_API,{method:'POST',headers:{'Content-Type':'application/json','X-HZ-App':'1'},body:JSON.stringify(payload)});
 if(!r.ok){const raw=await r.text().catch(()=>String(r.status));throw new Error('API Edge TTS '+r.status+': '+hz49Short(raw,380));}
 return await r.blob();
}
const hz49PrevAudioFromSsml=window.h42AudioFromSsml||window.H46_audioFromSsml||null;
async function hz49AudioFromSsml(ssml,settings={}){
 try{if(location.protocol==='http:'||location.protocol==='https:'){const b=await hz49ApiSsmlBlob(ssml,settings);hz49Log('tts.api.hz49','/api/edge-tts retornou áudio',{size:b.size,type:b.type},'ok');return b;}}
 catch(e){hz49Log('tts.api.hz49','/api/edge-tts falhou',{error:e.message||String(e),plain:hz49ExtractTextFromSsml(ssml).slice(0,120)},'error');}
 if(typeof hz49PrevAudioFromSsml==='function'){
  try{return await hz49PrevAudioFromSsml(ssml,settings);}catch(e){hz49Log('tts.direct.hz49','motor direto HTML1 falhou',{error:e.message||String(e)},'error');}
 }
 throw new Error('TTS neural indisponível no momento');
}
async function hz49Speak(text,kind='auto'){
 text=String(text||'').trim();if(!text)return false;
 try{if(typeof h36Busy==='function')h36Busy(true);else if(typeof setAudioBusy==='function')setAudioBusy(kind==='char'?'char':'natural',true);}catch{}
 try{
  try{
   const settings=(typeof window.v36GetSettings==='function'?window.v36GetSettings():(typeof window.h42Settings==='function'?window.h42Settings():{}));
   const ssml=(typeof window.v36BuildSsmlAuto==='function')?window.v36BuildSsmlAuto(text):(typeof window.h42BuildSsml==='function'?window.h42BuildSsml(text):null);
   const blob=ssml?await hz49AudioFromSsml(ssml,settings):await hz49ApiTextBlob(text,settings);
   await hz49PlayBlob(blob);return true;
  }catch(e){hz49Log('tts.primary.hz49','TTS neural falhou; fallback ativo',{error:e.message||String(e),kind,preview:text.slice(0,180)},'error');}
  if(await hz49SpeakByUrl(text))return true;
  await hz49SpeechSynthesis(text);hz49Log('tts.speechsynthesis.hz49','speechSynthesis tocou',{chars:text.length},'ok');return true;
 }catch(e){hz49Toast('Falha no TTS: '+(e.message||e));return false;}
 finally{try{if(typeof h36Busy==='function')h36Busy(false);else if(typeof setAudioBusy==='function')setAudioBusy(kind==='char'?'char':'natural',false);}catch{}}
}
function hz49ReaderText(){
 try{if(typeof curBook!=='undefined'&&curBook){const idx=curBook._readingChapterIndex??curBook.lastChapterIndex??curBook.lastChapter??0;const chs=curBook.chapters||curBook.pages;if(chs&&chs[idx])return chs[idx].content||chs[idx].text||chs[idx].body||'';if(curBook.content)return curBook.content;}}catch{}
 try{if(typeof H48_readerText==='function')return H48_readerText();}catch{}
 try{const raw=document.getElementById('rtext')?.innerText||'';if(raw.trim())return raw;}catch{}
 try{if(typeof readerTokens!=='undefined')return (readerTokens||[]).map(x=>x.word||x.char||'').join('');}catch{}
 return '';
}
async function hz49ReaderClick(e){
 const b=e.target&&e.target.closest&&e.target.closest('#read-play');if(!b)return;
 e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();
 if(hz49ReaderSpeaking){hz49StopAudio();b.textContent='Ler';return;}
 const text=hz49ReaderText();if(hz49CjkCount(text)<1)return hz49Toast('Sem texto chinês para ler.');
 hz49ReaderSpeaking=true;b.classList.add('on');b.textContent='Lendo…';
 try{await hz49Speak(text,'full');}
 finally{hz49ReaderSpeaking=false;b.classList.remove('on');try{b.textContent='Ler';}catch{}}
}
function hz49PatchTts(){
 if(hz49TtsPatching)return;hz49TtsPatching=true;
 try{window.h42AudioFromSsml=hz49AudioFromSsml;window.H46_audioFromSsml=hz49AudioFromSsml;try{h42AudioFromSsml=hz49AudioFromSsml;}catch{}}catch{}
 try{window.v36Speak=hz49Speak;window.H46_speak=hz49Speak;window.h42Speak=hz49Speak;window.h41SpeakText=hz49Speak;window.h36Speak=function(text){return hz49Speak(text,hz49CjkCount(text)<=1?'char':'compound')};try{h36Speak=window.h36Speak;}catch{}}catch{}
 try{window.speakWordMode=function(word,mode){return hz49Speak(word,hz49CjkCount(word)<=1?'char':'compound')};window.speakWord=function(word){return window.speakWordMode(word,'natural')};try{speakWordMode=window.speakWordMode;speakWord=window.speakWord;}catch{}}catch{}
 try{window.v30SpeakSentence=function(key){const d=(window.V30_SENT_AUDIO||{})[key];return hz49Speak((d&&d.zh)||key,'sentence')};}catch{}
 try{window.hzSpeakPhrase=function(zh){return hz49Speak(zh,'sentence')};}catch{}
 try{const p=document.getElementById('read-play');if(p){p.title='Ler texto completo com fallback do site';p.dataset.hz49='direct-reader';if(!hz49ReaderSpeaking&&/Gerar áudio|Gerar novamente|Reproduzir áudio/.test(p.textContent||''))p.textContent='Ler';}}catch{}
 try{const about=document.querySelector('#ss .ssub[style*="color:#8a8a8a"]');if(about)about.textContent=HZ49_VERSION;}catch{}
 hz49TtsPatching=false;
}

document.addEventListener('click',hz49ReaderClick,true);
document.addEventListener('pointerdown',function(e){const b=e.target&&e.target.closest&&e.target.closest('#read-play');if(b&&e.pointerType!=='touch'){}},true);

function hz49AudioUrlEndsWith(audio,url){try{return (audio.currentSrc||audio.src||'').split('#')[0]===url;}catch{return false;}}
function hz49PickTrack(){return Math.floor(Math.random()*V43_TRACKS.length);}
function hz49SetPreloadReady(trackId,track,start,source){
 try{v43PreloadedInfo={trackId,track,start,source:source||'html1'};v43PreloadPending=false;hz49Log('music.preload.hz49','segmento de 30s preparado',{trackId,title:track.title,start,url:track.url},'ok');}catch{}
}
function hz49InstallMusicPatch(){try{
 if(typeof v43GetAudioEl!=='function'||typeof v43PickSegmentStart!=='function'||typeof V43_TRACKS==='undefined')return;
 const oldFull=typeof v43PlayFullTrack==='function'?v43PlayFullTrack:null;
 v43StartPreload=function(){
  try{
   if(v43CurrentTrackId!=null||v43PreloadedInfo||v43PreloadPending)return;
   v43PreloadPending=true;
   const trackId=hz49PickTrack();const track=V43_TRACKS[trackId];const start=v43PickSegmentStart(trackId);const audio=v43GetAudioEl();
   audio.preload='auto';try{audio.crossOrigin='anonymous';audio.referrerPolicy='no-referrer';}catch{}
   const cleanup=()=>{audio.removeEventListener('loadedmetadata',onMeta);audio.removeEventListener('loadeddata',onData);audio.removeEventListener('canplay',onCan);audio.removeEventListener('canplaythrough',onCan);};
   const prepare=()=>{try{audio.currentTime=start;}catch{}hz49SetPreloadReady(trackId,track,start,'html1-preload');};
   const onMeta=()=>{prepare();};
   const onData=()=>{if(!v43PreloadedInfo)prepare();};
   const onCan=()=>{if(!v43PreloadedInfo)prepare();};
   audio.addEventListener('loadedmetadata',onMeta,{once:true});audio.addEventListener('loadeddata',onData,{once:true});audio.addEventListener('canplay',onCan,{once:true});audio.addEventListener('canplaythrough',onCan,{once:true});
   audio.src=track.url;try{audio.load();}catch{}
   setTimeout(()=>{try{if(v43PreloadPending&&!v43PreloadedInfo&&audio.src){prepare();}}catch{}},2400);
   setTimeout(cleanup,9000);
  }catch(e){try{v43PreloadPending=false;}catch{}hz49Log('music.preload.hz49','preload falhou',{error:e.message||String(e)},'error');}
 };
 v43PlayCelebrationTrack=function(){
  const audio=v43GetAudioEl();let trackId,track,start,alreadyBuffered=false;
  try{if(v43PreloadedInfo&&v43PreloadedInfo.track&&hz49AudioUrlEndsWith(audio,v43PreloadedInfo.track.url)){({trackId,track,start}=v43PreloadedInfo);alreadyBuffered=true;}}
  catch{}
  if(!track){trackId=hz49PickTrack();track=V43_TRACKS[trackId];start=v43PickSegmentStart(trackId);audio.src=track.url;try{audio.load();}catch{}}
  v43CelebrationMode=true;v43CurrentTrackId=trackId;v43PreloadedInfo=null;v43PreloadPending=false;v43CelebSegEnd=start+HZ49_SEG_LEN;
  const doPlay=()=>{try{audio.currentTime=start;}catch{}const p=audio.play();if(p&&p.catch)p.catch(err=>{hz49Log('music.play.hz49','play da celebração bloqueado/falhou',{error:err.message||String(err)},'error');try{if(typeof v42PlayCelebrationChime==='function')v42PlayCelebrationChime();}catch{}});};
  if(alreadyBuffered||audio.readyState>=1)doPlay();else{const onMeta=()=>{doPlay();audio.removeEventListener('loadedmetadata',onMeta);};audio.addEventListener('loadedmetadata',onMeta,{once:true});setTimeout(doPlay,700);}
  if(v43CelebEndTimer)clearTimeout(v43CelebEndTimer);
  v43CelebEndTimer=setTimeout(()=>{try{audio.pause();}catch{}v43CelebrationMode=false;v43CurrentTrackId=null;v43CelebEndTimer=null;setTimeout(v43StartPreload,900);},HZ49_SEG_LEN*1000+320);
  return{trackId,track,start};
 };
 if(oldFull){v43PlayFullTrack=function(trackId){try{v43PreloadedInfo=null;v43PreloadPending=false;}catch{}return oldFull(trackId);};}
 if(!hz49MusicPatched){
  hz49MusicPatched=true;
  ['pointerdown','touchstart','click','keydown'].forEach(ev=>document.addEventListener(ev,()=>setTimeout(()=>{try{v43StartPreload();}catch{}},500),{passive:true,capture:true}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(()=>{try{v43StartPreload();}catch{}},900);});
  setInterval(()=>{try{v43StartPreload();}catch{}},6500);
 }
 setTimeout(()=>{try{v43StartPreload();}catch{}},800);
 hz49Log('music.preload.hz49','lógica HTML1 de preload/restauração instalada',{seg:HZ49_SEG_LEN,tracks:V43_TRACKS.length},'ok');
}catch(e){hz49Log('music.preload.hz49','falha ao instalar patch de música',{error:e.message||String(e)},'error');}}
function boot(){hz49PatchTts();hz49InstallMusicPatch();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
[600,1200,2600,5200,8200].forEach(ms=>setTimeout(boot,ms));
setInterval(hz49PatchTts,3500);
})();

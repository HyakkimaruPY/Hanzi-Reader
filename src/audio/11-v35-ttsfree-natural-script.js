
/* v3.5: TTS natural para frases/palavras via proxy Vercel.
   Ordem nova: áudio real/banco curto -> TTSFree/Azure proxy para frases -> fallback por palavras/ideogramas.
   Não hardcoda cookies/CSRF do navegador: o web-flow do TTSFree é experimental e fica no backend. */
(function(){
const HR35_STYLE=`
.tts-status-dot{display:inline-flex;align-items:center;gap:5px;font-size:10px;color:#8b7355;border:1px solid rgba(var(--ac-rgb),.22);border-radius:999px;padding:3px 7px;margin-left:6px;background:rgba(var(--ac-rgb),.06)}
.tts-status-dot.on{color:var(--ac);border-color:rgba(var(--ac-rgb),.45);background:rgba(var(--ac-rgb),.12)}
`;
const st=document.createElement('style');st.textContent=HR35_STYLE;document.head.appendChild(st);
const HR35_WORD_SOURCES=[
  w=>`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(w)}&type=1`,
  w=>`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(w)}&type=2`,
  w=>`https://tts.youdao.com/fanyivoice?word=${encodeURIComponent(w)}`,
  w=>`https://tts.youdao.com/fanyivoice?word=${encodeURIComponent(w)}&le=zh`
];
const HR35_TTS_ENDPOINT='/api/tts';
const HR35_TTS_CACHE=new Map();
function hr35CjkText(t){return [...String(t||'')].filter(isCJK).join('');}
function hr35LooksSentence(t){t=String(t||'');const c=hr35CjkText(t);return c.length>=5||/[，。！？；：,.!?;:]/.test(t);}
function hr35SetBusy(on){document.querySelectorAll('[data-v34-speak],.lexi-audio,.dict-audio,#tip-natural,#tone-pron').forEach(el=>el&&el.classList.toggle('pl',!!on));}
function hr35StopAudio(){if(curAudio){try{curAudio.pause();}catch{}curAudio=null;}try{speechSynthesis?.cancel();}catch{}}
function hr35PlayUrl(url){return new Promise((res,rej)=>{const a=new Audio(url);curAudio=a;const t=setTimeout(()=>{try{a.pause();}catch{}curAudio=null;rej(new Error('timeout'));},12000);a.onended=()=>{clearTimeout(t);curAudio=null;res();};a.onerror=()=>{clearTimeout(t);curAudio=null;rej(new Error('audio'));};const p=a.play();if(p&&p.catch)p.catch(e=>{clearTimeout(t);curAudio=null;rej(e);});});}
function hr35PlayBlob(blob){return new Promise((res,rej)=>{const url=URL.createObjectURL(blob);const a=new Audio(url);curAudio=a;const cleanup=()=>{try{URL.revokeObjectURL(url);}catch{}};const t=setTimeout(()=>{try{a.pause();}catch{}cleanup();curAudio=null;rej(new Error('timeout'));},18000);a.onended=()=>{clearTimeout(t);cleanup();curAudio=null;res();};a.onerror=()=>{clearTimeout(t);cleanup();curAudio=null;rej(new Error('audio'));};const p=a.play();if(p&&p.catch)p.catch(e=>{clearTimeout(t);cleanup();curAudio=null;rej(e);});});}
async function hr35PlayWordSource(text){for(const src of HR35_WORD_SOURCES){try{await hr35PlayUrl(src(text));return true;}catch{}}return false;}
async function hr35PlayChars(chars,pause=42){let ok=false;for(const ch of chars){if(!isCJK(ch))continue;if(await hr35PlayWordSource(ch))ok=true;else if(await hr35PlayProxy(ch,{force:false,shortOk:true}))ok=true;await delay(pause);}return ok;}
function hr35Segments(text){const out=[];let run='';for(const ch of [...String(text||'')]){if(isCJK(ch)){run+=ch;continue;}if(run){try{out.push(...segmentChineseRun(run));}catch{out.push(run);}run='';}if(/[，,、；;：:。！？!?]/.test(ch))out.push(ch);}if(run){try{out.push(...segmentChineseRun(run));}catch{out.push(run);}}return out.filter(Boolean);}
async function hr35PlaySegmented(text){let ok=false;for(const p of hr35Segments(text)){if(/[，,、；;：:]/.test(p)){await delay(80);continue;}if(/[。！？!?]/.test(p)){await delay(165);continue;}const c=[...p].filter(isCJK);const got=await hr35PlayWordSource(p)||(c.length?await hr35PlayChars(c,30):false);if(got)ok=true;await delay(36);}return ok;}
async function hr35FetchProxyBlob(text,opts={}){text=String(text||'').trim();if(!text)return null;if(text.length>480)text=text.slice(0,480);const cacheKey=`${opts.voice||'zh-CN-XiaoxiaoNeural'}|${text}`;if(HR35_TTS_CACHE.has(cacheKey))return HR35_TTS_CACHE.get(cacheKey).slice(0);
  const r=await fetch(HR35_TTS_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,lang:'zh-CN',voice:opts.voice||'zh-CN-XiaoxiaoNeural',style:opts.style||'chat',provider:opts.provider||'auto'})});
  if(!r.ok)throw new Error('tts proxy '+r.status);
  const ct=(r.headers.get('content-type')||'').toLowerCase();
  let blob=null;
  if(ct.includes('audio'))blob=await r.blob();
  else{const d=await r.json();if(d.audioData){const bin=atob(String(d.audioData).replace(/^data:audio\/\w+;base64,/,''));const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);blob=new Blob([u],{type:d.mime||'audio/mpeg'});}else if(d.audioUrl){await hr35PlayUrl(d.audioUrl);return 'played-url';}}
  if(blob){HR35_TTS_CACHE.set(cacheKey,blob);return blob.slice(0);}return null;
}
async function hr35PlayProxy(text,opts={}){try{if(!opts.force&&!hr35LooksSentence(text)&&!opts.shortOk)return false;const b=await hr35FetchProxyBlob(text,opts);if(!b)return false;if(b==='played-url')return true;await hr35PlayBlob(b);return true;}catch(e){return false;}}
async function hr35Speak(text,mode='natural'){
  hr35StopAudio();hr35SetBusy(true);text=String(text||'').trim();const cjk=[...text].filter(isCJK);
  try{if(!cjk.length)return;
    let ok=false;
    if(hr35LooksSentence(text)){
      ok=await hr35PlayProxy(text,{force:true});
      if(!ok)ok=await hr35PlayWordSource(text);
      if(!ok)ok=await hr35PlaySegmented(text);
    }else{
      ok=await hr35PlayWordSource(text);
      if(!ok)ok=await hr35PlayProxy(text,{force:false,shortOk:cjk.length>1});
      if(!ok)ok=await hr35PlayChars(cjk,cjk.length===1?44:34);
    }
    if(!ok)toast('Áudio não encontrado nas rotas naturais atuais.');
  }finally{hr35SetBusy(false);}
}
// Exporta sobre o motor anterior, sem remover o comportamento estável de palavras curtas.
speakWordMode=function(word,mode='natural'){return hr35Speak(word,mode);};
speakWord=function(word){return hr35Speak(word,'natural');};
window.v30SpeakSentence=async function(key){const data=(window.V30_SENT_AUDIO||{})[key];if(!data)return;hr35StopAudio();hr35SetBusy(true);try{let ok=false;for(const u of data.urls||[]){try{await hr35PlayUrl(u);ok=true;break;}catch{}}if(!ok)ok=await hr35PlayProxy(data.zh,{force:true});if(!ok)ok=await hr35PlayWordSource(data.zh);if(!ok)ok=await hr35PlaySegmented(data.zh);if(!ok)toast('Áudio natural da frase não disponível nesta conexão.');}finally{hr35SetBusy(false);}};
// Pequeno marcador em Settings para deixar claro que o proxy neural é opcional no Vercel.
function hr35MarkSettings(){try{const about=[...document.querySelectorAll('#ss .srow')].find(r=>/Hanzi Reader/.test(r.textContent));if(about&&!about.querySelector('.tts-status-dot')){const b=document.createElement('span');b.className='tts-status-dot';b.textContent='TTSFree/Azure via /api/tts';about.appendChild(b);if(location.protocol==='http:'||location.protocol==='https:'){fetch('/api/tts?health=1').then(r=>{if(r.ok){b.classList.add('on');b.textContent='TTS neural ativo';}}).catch(()=>{});}}}catch{}}
setTimeout(hr35MarkSettings,700);
try{const about=document.querySelector('#ss .ssub[style*="color:#8a8a8a"]');if(about)about.textContent='v3.5';}catch{}
})();

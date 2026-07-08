
(function(){
'use strict';
const H46_VERSION='v4.6-edge-tts-fetch-proxy-fixed';
const H46_TOKEN_REFRESH_BEFORE_EXPIRY=180;
let H46_TOKEN={endpoint:null,token:null,expiredAt:0};
let H46_AUDIO_URL=null;

function H46_log(kind,title,data,status){
  try{(window.H44_dbg||window.h43DebugLog||function(){})(kind,title,data,status||'');}
  catch(e){}
}
function H46_toast(msg){try{(window.h42Toast||window.h41Toast||window.toast||alert)(String(msg||''));}catch{try{console.warn(msg);}catch{}}}
function H46_cjkCount(s){return [...String(s||'')].filter(ch=>/[\u3400-\u9fff]/.test(ch)).length;}
function H46_esc(s){try{return (window.esc?window.esc(s):String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));}catch{return String(s??'');}}
function H46_xml(s){return String(s??'').replace(/[<>&'\"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','\"':'&quot;'}[c]));}
function H46_headersObj(h){try{return Object.fromEntries(Array.from(h.entries()).slice(0,60));}catch{return {};}}
function H46_short(raw,max=22000){raw=String(raw??'');return raw.length>max?raw.slice(0,max)+'\n…[cortado '+(raw.length-max)+' chars]':raw;}
function H46_delay(ms){return new Promise(r=>setTimeout(r,ms));}
function H46_getAudio(){try{return curAudio;}catch{return window.curAudio||null;}}
function H46_setAudio(a){try{curAudio=a;}catch{}try{window.curAudio=a;}catch{}}
function H46_uuid(){try{if(crypto.randomUUID)return crypto.randomUUID().replace(/-/g,'');}catch{}const b=new Uint8Array(16);crypto.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;return Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');}
function H46_b64ToBytes(b64){const bin=atob(b64);const out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out;}
function H46_bytesToB64(bytes){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);}
function H46_date(){return new Date().toUTCString().replace(/GMT/,'').trim().toLowerCase()+' gmt';}
async function H46_hmac(keyBytes,data){const key=await crypto.subtle.importKey('raw',keyBytes,{name:'HMAC',hash:{name:'SHA-256'}},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(data)));}
const H46_SECRET='oik6PdDdMnOXemTbwvMn9de/h9lFnfBaCWbGMMZqqoSaQaqUOqjVGm5NqsmjcBI1x+sS9ugjB55HEJWRiFXYFw==';
async function H46_sign(urlStr){if(!window.crypto||!crypto.subtle)throw new Error('WebCrypto indisponível. Abra em Chrome/Edge moderno, HTTPS ou localhost.');const url=urlStr.split('://')[1];const encodedUrl=encodeURIComponent(url);const uuid=H46_uuid();const date=H46_date();const toSign=`MSTranslatorAndroidApp${encodedUrl}${date}${uuid}`.toLowerCase();const sig=await H46_hmac(H46_b64ToBytes(H46_SECRET),toSign);return `MSTranslatorAndroidApp::${H46_bytesToB64(sig)}::${date}::${uuid}`;}
function H46_css(){
 if(document.getElementById('h46-css'))return;
 const css=document.createElement('style');css.id='h46-css';css.textContent=`
 :root{--rf:'Noto Sans SC','Noto Sans CJK SC','Source Han Sans SC','PingFang SC','Microsoft YaHei','Segoe UI',Arial,sans-serif!important;--pyf:'Noto Sans','Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif!important;}
 body,#sr,.rtext,.hzrow,.hzch,.pt,.sp,.ww,.dict-word,.dict-item .zh,.sent-zh,.lexi-zh,.study-word{font-family:var(--rf)!important;font-variant-numeric:tabular-nums!important;font-feature-settings:'tnum' 1,'kern' 1!important;}
 .hzrow,.wunit,.rtext{font-variant-numeric:tabular-nums!important;}
 .h46-grid2{display:grid;grid-template-columns:1fr 1fr;gap:9px}.h46-grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px}
 .h46-row{margin:8px 0 11px}.h46-lab{font-size:11px;color:#9c8158;font-weight:900;text-transform:uppercase;letter-spacing:.75px;margin:6px 0 4px}.h46-note{font-size:11px;color:#8b806f;line-height:1.45;margin-top:4px}.h46-out{font-size:12px;color:var(--ac);font-weight:850;text-align:right}.h46-range{display:grid;grid-template-columns:1fr 56px;gap:8px;align-items:center}.h46-range input{width:100%}.h46-select,.h46-input{width:100%;border:1px solid #373737;background:#252525;color:#fff;border-radius:10px;padding:10px 11px;font-size:14px;margin:0 0 6px;outline:none}.h46-select:focus,.h46-input:focus{border-color:var(--ac)}
 .h41-acc.h46-open .h41-acc-b,.h41-acc.open .h41-acc-b{display:block!important}.h46-status{border:1px solid rgba(var(--ac-rgb),.24);background:rgba(var(--ac-rgb),.07);color:#d7bd8a;border-radius:12px;padding:9px 10px;font-size:12px;line-height:1.45;margin-top:8px;white-space:pre-wrap}.h46-mini-btn{border:1px solid rgba(var(--ac-rgb),.38);background:rgba(var(--ac-rgb),.10);color:var(--ac);border-radius:10px;padding:9px 10px;font-weight:850;font-size:12px;cursor:pointer}.h46-mini-btn:active{filter:brightness(1.15)}
 @media(max-width:520px){.h46-grid2,.h46-grid3{grid-template-columns:1fr}}
 `;document.head.appendChild(css);
}

const H46_VOICES=[
 {name:'zh-CN-XiaoxiaoNeural',label:'晓晓 · Xiaoxiao — feminina expressiva',gender:'F',styles:['general','affectionate','angry','assistant','calm','chat','chat-casual','cheerful','customerservice','disgruntled','excited','fearful','friendly','gentle','lyrical','newscast','poetry-reading','sad','serious','sorry','whispering'],roles:[]},
 {name:'zh-CN-XiaoyiNeural',label:'晓伊 · Xiaoyi — feminina doce',gender:'F',styles:['general','affectionate','angry','cheerful','disgruntled','embarrassed','fearful','gentle','sad','serious'],roles:[]},
 {name:'zh-CN-YunyangNeural',label:'云扬 · Yunyang — masculino narração/notícia',gender:'M',styles:['general','customerservice','narration-professional','newscast-casual'],roles:[]},
 {name:'zh-CN-XiaochenNeural',label:'晓辰 · Xiaochen — feminina comercial',gender:'F',styles:['general','livecommercial','live-commercial'],roles:[]},
 {name:'zh-CN-XiaohanNeural',label:'晓涵 · Xiaohan — feminina emocional',gender:'F',styles:['general','affectionate','angry','calm','cheerful','disgruntled','embarrassed','fearful','gentle','sad','serious'],roles:[]},
 {name:'zh-CN-XiaomengNeural',label:'晓梦 · Xiaomeng — feminina chat',gender:'F',styles:['general','chat'],roles:[]},
 {name:'zh-CN-XiaomoNeural',label:'晓墨 · Xiaomo — feminina + roles',gender:'F',styles:['general','affectionate','angry','calm','cheerful','depressed','disgruntled','embarrassed','envious','fearful','gentle','sad','serious'],roles:['Boy','Girl','YoungAdultFemale','YoungAdultMale','OlderAdultFemale','OlderAdultMale','SeniorFemale','SeniorMale']},
 {name:'zh-CN-XiaoruiNeural',label:'晓睿 · Xiaorui — feminina sóbria',gender:'F',styles:['general','angry','calm','fearful','sad'],roles:[]},
 {name:'zh-CN-XiaoshuangNeural',label:'晓双 · Xiaoshuang — criança/chat',gender:'F',styles:['general','chat'],roles:[]},
 {name:'zh-CN-XiaoxuanNeural',label:'晓萱 · Xiaoxuan — feminina',gender:'F',styles:['general'],roles:[]},
 {name:'zh-CN-XiaoyanNeural',label:'晓颜 · Xiaoyan — feminina',gender:'F',styles:['general'],roles:[]},
 {name:'zh-CN-XiaoyouNeural',label:'晓悠 · Xiaoyou — criança',gender:'F',styles:['general'],roles:[]},
 {name:'zh-CN-XiaozhenNeural',label:'晓甄 · Xiaozhen — feminina formal',gender:'F',styles:['general','angry','cheerful','disgruntled','fearful','sad','serious'],roles:[]},
 {name:'zh-CN-YunxiNeural',label:'云希 · Yunxi — masculino jovem',gender:'M',styles:['general','cheerful','depressed','embarrassed','fearful','narration-relaxed','sad','serious'],roles:[]},
 {name:'zh-CN-YunjianNeural',label:'云健 · Yunjian — masculino firme',gender:'M',styles:['general','narration-relaxed','sports-commentary','sports-commentary-excited'],roles:[]},
 {name:'zh-CN-YunfengNeural',label:'云枫 · Yunfeng — masculino emocional',gender:'M',styles:['general','angry','cheerful','depressed','disgruntled','fearful','sad','serious'],roles:[]},
 {name:'zh-CN-YunhaoNeural',label:'云皓 · Yunhao — masculino propaganda',gender:'M',styles:['general','advertisement-upbeat','advertisement_upbeat'],roles:[]},
 {name:'zh-CN-YunxiaNeural',label:'云夏 · Yunxia — masculino emocional',gender:'M',styles:['general','angry','calm','cheerful','fearful','sad'],roles:[]},
 {name:'zh-CN-YunyeNeural',label:'云野 · Yunye — masculino + roles',gender:'M',styles:['general','angry','calm','cheerful','disgruntled','embarrassed','fearful','sad','serious'],roles:['Boy','Girl','YoungAdultFemale','YoungAdultMale','OlderAdultFemale','OlderAdultMale','SeniorFemale','SeniorMale']},
 {name:'zh-CN-YunzeNeural',label:'云泽 · Yunze — masculino idoso/roles',gender:'M',styles:['general','angry','calm','cheerful','depressed','disgruntled','documentary-narration','fearful','sad','serious'],roles:['OlderAdultMale','SeniorMale']},
 {name:'zh-CN-XiaoxiaoMultilingualNeural',label:'晓晓 Multilingual — experimental',gender:'F',styles:['general','affectionate','cheerful','empathetic','excited','poetry-reading','sorry','story'],roles:[]},
 {name:'zh-CN-XiaoyouMultilingualNeural',label:'晓悠 Multilingual — experimental',gender:'F',styles:['general','angry','chat','cheerful','cute','poetry-reading','sad','story'],roles:[]},
 {name:'zh-CN-Bo:MAI-Voice-2',label:'Bo MAI Voice 2 — experimental',gender:'M',styles:['general','angry','confused','determined','disgusted','embarrassed','excited','fearful','happy','hopeful','jealous','joyful','regretful','relieved','sad','shouting','softvoice','surprised','whispering'],roles:[]},
 {name:'zh-CN-Mei:MAI-Voice-2',label:'Mei MAI Voice 2 — experimental',gender:'F',styles:['general','angry','confused','determined','disgusted','embarrassed','excited','fearful','happy','hopeful','jealous','joyful','regretful','relieved','sad','shouting','softvoice','surprised','whispering'],roles:[]}
];
const H46_STYLE_LABELS={general:'通用 / neutro',affectionate:'亲切 / carinhoso',angry:'生气 / bravo',assistant:'助手 / assistente',calm:'平静 / calmo',chat:'聊天 / conversa','chat-casual':'casual',cheerful:'开心 / alegre',customerservice:'客服 / atendimento',disgruntled:'不满 / descontente',excited:'兴奋 / animado',fearful:'害怕 / medo',friendly:'友好 / amigável',gentle:'温柔 / gentil',lyrical:'抒情 / lírico',newscast:'新闻 / jornal','newscast-casual':'notícia casual','narration-professional':'narração profissional','narration-relaxed':'narração relaxada','documentary-narration':'documentário','poetry-reading':'poesia',sad:'伤心 / triste',serious:'严肃 / sério',sorry:'抱歉 / arrependido',whispering:'耳语 / sussurro',depressed:'低落 / deprimido',embarrassed:'尴尬 / constrangido',envious:'羡慕 / invejoso',livecommercial:'comercial ao vivo','live-commercial':'comercial ao vivo','advertisement-upbeat':'propaganda animada',advertisement_upbeat:'propaganda animada',cute:'fofo',story:'história',happy:'feliz',confused:'confuso',determined:'determinado',disgusted:'nojo',hopeful:'esperançoso',jealous:'ciumento',joyful:'alegria',regretful:'arrependido',relieved:'aliviado',shouting:'gritando',softvoice:'voz suave',surprised:'surpreso','sports-commentary':'comentário esportivo','sports-commentary-excited':'comentário animado',empathetic:'empático'};
const H46_ROLE_LABELS={'':'Sem role',Girl:'Menina',Boy:'Menino',YoungAdultFemale:'Jovem mulher',YoungAdultMale:'Jovem homem',OlderAdultFemale:'Mulher adulta',OlderAdultMale:'Homem adulto',SeniorFemale:'Mulher idosa',SeniorMale:'Homem idoso'};
function H46_voiceMeta(name){return H46_VOICES.find(v=>v.name===name)||H46_VOICES[0];}
function H46_defaultSettings(){return {voice:'zh-CN-XiaoxiaoNeural',speed:1,pitch:0,volume:0,style:'general',degree:1.35,role:'',format:'audio-24khz-48kbitrate-mono-mp3',chunkMode:'line',linePause:450};}
function H46_loadSettings(){let s=H46_defaultSettings();try{s={...s,...JSON.parse(localStorage.getItem('h41VoiceSettings')||localStorage.getItem('v40VoiceSettings')||'{}')}}catch{}return s;}
function H46_saveSettings(patch){const next={...H46_loadSettings(),...patch};try{localStorage.setItem('h41VoiceSettings',JSON.stringify(next));}catch{}return next;}
function H46_applyVoiceOptions(){
 const voiceSel=document.getElementById('h41-voice-select'),styleSel=document.getElementById('h41-style'),roleSel=document.getElementById('h41-role'),roleHint=document.getElementById('h46-role-hint');
 if(!voiceSel||!styleSel||!roleSel)return;
 const settings=H46_loadSettings();
 const gender=(document.querySelector('.h41-tab.on')?.dataset.h41G)||H46_voiceMeta(settings.voice).gender.toLowerCase();
 const list=H46_VOICES.filter(v=>v.gender.toLowerCase()===(gender==='m'?'m':'f'));
 voiceSel.innerHTML=list.map(v=>`<option value="${H46_esc(v.name)}">${H46_esc(v.label)}</option>`).join('');
 voiceSel.value=list.some(v=>v.name===settings.voice)?settings.voice:list[0].name;
 const meta=H46_voiceMeta(voiceSel.value);
 const oldStyle=settings.style||'general';
 styleSel.innerHTML=meta.styles.map(s=>`<option value="${H46_esc(s)}">${H46_esc(H46_STYLE_LABELS[s]||s)}</option>`).join('');
 styleSel.value=meta.styles.includes(oldStyle)?oldStyle:(meta.styles.includes('cheerful')?'cheerful':meta.styles[0]||'general');
 roleSel.innerHTML=[''].concat(meta.roles||[]).map(r=>`<option value="${H46_esc(r)}">${H46_esc(H46_ROLE_LABELS[r]||r)}</option>`).join('');
 roleSel.disabled=!(meta.roles&&meta.roles.length);
 roleSel.value=(meta.roles||[]).includes(settings.role)?settings.role:'';
 if(roleHint)roleHint.textContent=(meta.roles&&meta.roles.length)?'Esta voz aceita role/personagem no SSML.':'Role desativado para esta voz, evitando atributo ignorado.';
 H46_saveSettings({voice:voiceSel.value,style:styleSel.value,role:roleSel.value});
}
function H46_refreshVoiceOutputs(){
 const s=H46_getSettings();
 const map={
  'h46-degree-out':Number(s.degree||1).toFixed(2),
  'h46-linepause-out':`${Number(s.linePause||0)}ms`,
  'h46-speed-out':`${Number(s.speed||1).toFixed(2)}x`,
  'h46-pitch-out':`${Number(s.pitch||0)>=0?'+':''}${Number(s.pitch||0)}Hz`,
  'h46-volume-out':`${Number(s.volume||0)>=0?'+':''}${Math.round(Number(s.volume||0)*100)}%`
 };
 Object.entries(map).forEach(([id,val])=>{const el=document.getElementById(id);if(el)el.textContent=val;});
}
function H46_installVoiceUi(){/* v4.9: substituído pelo painel v36 (ícones SVG, seções organizadas). */}
function H46_getSettings(){
 let base=H46_loadSettings();
 try{const ids={voice:'h41-voice-select',style:'h41-style',role:'h41-role',speed:'h41-speed',pitch:'h41-pitch',volume:'h41-volume',degree:'h41-degree',linePause:'h41-linePause',format:'h41-format',chunkMode:'h41-chunkMode'};Object.entries(ids).forEach(([k,id])=>{const el=document.getElementById(id);if(!el||el.value==null||el.value==='')return;base[k]=['speed','pitch','volume','degree','linePause'].includes(k)?Number(el.value):el.value;});}catch{}
 return {...H46_defaultSettings(),...base};
}
function H46_signed(n,suffix){n=Number(n)||0;return (n>=0?'+':'')+n+suffix;}
function H46_rate(speed){return H46_signed(Math.round((Number(speed||1)-1)*100),'%');}
function H46_pitch(v){return H46_signed(parseInt(v||0,10),'Hz');}
function H46_volume(v){return H46_signed(Math.round(Number(v||0)*100),'%');}
function H46_express(text,o){const meta=H46_voiceMeta(o.voice);const style=(o.style&&o.style!=='general'&&(meta.styles||[]).includes(o.style))?o.style:'';const role=(o.role&&(meta.roles||[]).includes(o.role))?o.role:'';const attrs=[];if(style)attrs.push(`style="${H46_xml(style)}"`);if(style&&o.degree)attrs.push(`styledegree="${H46_xml(o.degree)}"`);if(role)attrs.push(`role="${H46_xml(role)}"`);const prosody=`<prosody rate="${H46_xml(H46_rate(o.speed))}" pitch="${H46_xml(H46_pitch(o.pitch))}" volume="${H46_xml(H46_volume(o.volume))}">${H46_xml(text)}</prosody>`;return attrs.length?`<mstts:express-as ${attrs.join(' ')}>${prosody}</mstts:express-as>`:prosody;}
function H46_buildSsml(text,o=H46_getSettings()){const voice=o.voice||'zh-CN-XiaoxiaoNeural';const lang=voice.split('-').slice(0,2).join('-')||'zh-CN';const linePause=Math.max(0,Math.min(2000,Number(o.linePause??450)));const lines=String(text||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);let body='';if((o.chunkMode||'line')==='line'&&lines.length>1){body=lines.map((line,i)=>`    ${H46_express(line,o)}${i<lines.length-1&&linePause>0?`\n    <break time="${linePause}ms"/>`:''}`).join('\n');}else{body=`    ${H46_express(String(text||'').trim(),o)}`;}return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${H46_xml(lang)}">\n  <voice name="${H46_xml(voice)}">\n${body}\n  </voice>\n</speak>`;}
function H46_splitText(text,maxLen=1750){const clean=String(text||'').replace(/[ \t]+/g,' ').trim();if(!clean)return[];const out=[];let cur='';const sentences=clean.split(/(?<=[。！？!?\.])\s*/);for(const s of sentences){if(!s)continue;if((cur+s).length<=maxLen){cur+=s;}else{if(cur)out.push(cur.trim());if(s.length<=maxLen)cur=s;else{for(let i=0;i<s.length;i+=maxLen)out.push(s.slice(i,i+maxLen));cur='';}}}if(cur)out.push(cur.trim());return out;}
async function H46_endpoint(){const now=Date.now()/1000;if(H46_TOKEN.token&&H46_TOKEN.expiredAt&&now<H46_TOKEN.expiredAt-H46_TOKEN_REFRESH_BEFORE_EXPIRY)return H46_TOKEN.endpoint;const endpointUrl='https://dev.microsofttranslator.com/apps/endpoint?api-version=1.0';const clientId=H46_uuid();const signature=await H46_sign(endpointUrl);const headers={'Accept-Language':'zh-Hans','X-ClientVersion':'4.0.530a 5fe1dc6c','X-UserId':'0f04d16a175c411e','X-HomeGeographicRegion':'zh-Hans-CN','X-ClientTraceId':clientId,'X-MT-Signature':signature,'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0','Content-Type':'application/json; charset=utf-8','Accept-Encoding':'gzip'};H46_log('edge.endpoint.h46','request token Microsoft',{url:endpointUrl,method:'POST',headers:{...headers,'X-MT-Signature':signature.slice(0,80)+'...'}},'');let response;try{response=await fetch(endpointUrl,{method:'POST',headers});}catch(e){H46_log('edge.endpoint.h46','fetch/token falhou',{error:e.message||String(e)},'error');throw e;}const raw=await response.text();H46_log('edge.endpoint.h46','response token Microsoft',{status:response.status,ok:response.ok,headers:H46_headersObj(response.headers),raw:H46_short(raw,12000)},response.ok?'ok':'error');if(!response.ok)throw new Error('Falha ao obter endpoint: '+response.status+' — '+raw);let data;try{data=JSON.parse(raw);}catch(e){throw new Error('Endpoint retornou JSON inválido: '+e.message);}let exp=Math.floor(Date.now()/1000)+540;try{exp=JSON.parse(atob(data.t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).exp||exp;}catch{}H46_TOKEN={endpoint:data,token:data.t,expiredAt:exp};return data;}
async function H46_audioFromSsml(ssml,o=H46_getSettings()){const endpoint=await H46_endpoint();const url=`https://${endpoint.r}.tts.speech.microsoft.com/cognitiveservices/v1`;const headers={'Authorization':endpoint.t,'Content-Type':'application/ssml+xml','User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0','X-Microsoft-OutputFormat':o.format||'audio-24khz-48kbitrate-mono-mp3'};H46_log('edge.tts.h46','request SSML',{url,method:'POST',headers:{...headers,Authorization:String(endpoint.t||'').slice(0,48)+'...'},settings:o,ssml:H46_short(ssml,8000)},'');let response;try{response=await fetch(url,{method:'POST',headers,body:ssml});}catch(e){H46_log('edge.tts.h46','fetch SSML falhou',{error:e.message||String(e)},'error');throw e;}if(!response.ok){const text=await response.text().catch(()=> '');H46_log('edge.tts.h46','response erro Microsoft',{status:response.status,headers:H46_headersObj(response.headers),body:text},'error');throw new Error('Serviço de voz: '+response.status+' — '+text);}const blob=await response.blob();H46_log('edge.tts.h46','response áudio Microsoft',{status:response.status,headers:H46_headersObj(response.headers),blob:{size:blob.size,type:blob.type}},'ok');return blob;}
async function H46_edgeBlob(text,o=H46_getSettings()){text=String(text||'').trim();if(!text)throw new Error('Sem texto para TTS.');const chunks=text.length<1750?[text]:H46_splitText(text,1750);const blobs=[];for(let i=0;i<chunks.length;i++){H46_log('edge.chunk.h46','gerando bloco '+(i+1)+'/'+chunks.length,{chars:chunks[i].length,cjk:H46_cjkCount(chunks[i])},'');blobs.push(await H46_audioFromSsml(H46_buildSsml(chunks[i],o),o));await H46_delay(80);}return blobs.length===1?blobs[0]:new Blob(blobs,{type:o.format&&o.format.includes('opus')?(o.format.includes('ogg')?'audio/ogg':'audio/webm'):'audio/mpeg'});}
function H46_playBlob(blob){return new Promise((res,rej)=>{try{const old=H46_getAudio();if(old)old.pause();}catch{}try{if(H46_AUDIO_URL)URL.revokeObjectURL(H46_AUDIO_URL);}catch{}H46_AUDIO_URL=URL.createObjectURL(blob);const a=new Audio(H46_AUDIO_URL);H46_setAudio(a);const timeout=Math.max(20000,Math.min(300000,blob.size*13));const t=setTimeout(()=>{try{a.pause();}catch{}H46_setAudio(null);rej(new Error('timeout de áudio'));},timeout);a.onended=()=>{clearTimeout(t);H46_setAudio(null);res();};a.onerror=()=>{clearTimeout(t);H46_setAudio(null);rej(new Error('falha no player de áudio'));};a.play().catch(e=>{clearTimeout(t);H46_setAudio(null);rej(e);});});}
async function H46_baidu(text){const t=String(text||'').trim();if(!t)return false;const urls=[`https://fanyi.baidu.com/gettts?lan=zh&text=${encodeURIComponent(t)}&spd=5&source=web`,...(typeof h36AudioUrls==='function'?h36AudioUrls(t):[])];for(const u of urls){try{if(typeof h36PlayUrl==='function')await h36PlayUrl(u);else await new Promise((res,rej)=>{const a=new Audio(u);a.onended=res;a.onerror=rej;a.play().catch(rej);});return true;}catch{}}return false;}
async function H46_speak(text,kind='auto'){text=String(text||'').trim();if(!text)return false;try{if(typeof h36Busy==='function')h36Busy(true);const one=H46_cjkCount(text)<=1;if((kind==='char'||one)&&await H46_baidu(text))return true;const blob=await H46_edgeBlob(text,H46_getSettings());await H46_playBlob(blob);return true;}catch(e){H46_log('edge.tts.h46','Edge TTS final falhou',{error:e.message||String(e),kind,textPreview:text.slice(0,180)},'error');if(await H46_baidu(text))return true;H46_toast('Falha no Edge TTS: '+(e.message||e));return false;}finally{if(typeof h36Busy==='function')h36Busy(false);}}
function H46_readerText(){try{if(typeof curBook!=='undefined'&&curBook){const idx=curBook._readingChapterIndex??curBook.lastChapterIndex??curBook.lastChapter??0;const chs=curBook.chapters||curBook.pages;if(chs&&chs[idx])return chs[idx].content||chs[idx].text||chs[idx].body||'';if(curBook.content)return curBook.content;}}catch{}try{const raw=document.getElementById('rtext')?.innerText||'';if(raw.trim())return raw;}catch{}try{if(typeof readerTokens!=='undefined')return (readerTokens||[]).map(x=>x.word||x.char||'').join('');}catch{}return '';}
async function H46_startReading(){const text=H46_readerText();if(!String(text).trim())return H46_toast('Sem texto para ler.');try{v32Reading=true;}catch{}try{window.v32Reading=true;}catch{}try{if(typeof v32UpdateReadUi==='function')v32UpdateReadUi();}catch{}const b=document.getElementById('read-play');if(b){b.classList.add('h41-working');b.innerHTML=(typeof h42Svg==='function'?h42Svg('pause'):'Ⅱ');}try{await H46_speak(text,'full');}finally{try{v32Reading=false;}catch{}try{window.v32Reading=false;}catch{}try{if(typeof v32UpdateReadUi==='function')v32UpdateReadUi();}catch{}if(b)b.classList.remove('h41-working');}}
function H46_stopReading(){try{v32Reading=false;}catch{}try{window.v32Reading=false;}catch{}try{const a=H46_getAudio();if(a)a.pause();H46_setAudio(null);if(typeof v32UpdateReadUi==='function')v32UpdateReadUi();}catch{}}

// -----------------------------------------------------------------------------
// As solicitações do usuário especificam que a voz natural é o foco do leitor
// e que não deve haver fallback para serviços de síntese de voz nativos do
// navegador ou outros provedores. As seções de fallback previamente usadas
// para chamar SpeechSynthesis foram removidas. Apenas o fluxo de voz da
// Microsoft (com Baidu como fallback para caracteres únicos) permanece ativo.

const H46_TEXT_PROXIES=[
 {id:'direct',direct:true,url:u=>u},
 {id:'jina-reader',url:u=>'https://r.jina.ai/'+u},
 {id:'allorigins-raw',url:u=>'https://api.allorigins.win/raw?url='+encodeURIComponent(u)},
 {id:'allorigins-get',url:u=>'https://api.allorigins.win/get?url='+encodeURIComponent(u)},
 {id:'corsproxy.io',url:u=>'https://corsproxy.io/?'+encodeURIComponent(u)},
 {id:'codetabs',url:u=>'https://api.codetabs.com/v1/proxy?quest='+encodeURIComponent(u)},
 {id:'thingproxy',url:u=>'https://thingproxy.freeboard.io/fetch/'+u},
 {id:'isomorphic-git',url:u=>'https://cors.isomorphic-git.org/'+u},
 {id:'corsproxy-fly',url:u=>'https://corsproxy.fly.dev/'+u},
 {id:'cors-eu',url:u=>'https://cors.eu.org/'+u}
];
function H46_customTextProxies(){try{const arr=JSON.parse(localStorage.getItem('h46.textProxies')||'[]');if(!Array.isArray(arr))return[];return arr.filter(Boolean).map((base,i)=>({id:'custom-text-'+(i+1),url:u=>String(base).replace('{url}',encodeURIComponent(u)).replace('{raw}',u),custom:true}));}catch{return[];}}
function H46_cleanMarkdown(raw,url=''){let s=String(raw||'').replace(/^---[\s\S]*?---\n/m,'').replace(/^(Title|URL Source|Published Time|Markdown Content):.*$/gmi,'').replace(/```[\s\S]*?```/g,'').replace(/`([^`\n]+)`/g,'$1').replace(/^#{1,6}\s+/gm,'').replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/\*{1,3}([^*\n]+)\*{1,3}/g,'$1').replace(/_{1,2}([^_\n]+)_{1,2}/g,'$1').replace(/^\s*[-*+•]\s+/gm,'').replace(/^\s*\d+\.\s+/gm,'').replace(/^\s*>\s*/gm,'').replace(/\|[^\n]+\|/g,'');return H46_cleanRaw(s,url);}
function H46_cleanRaw(raw,url=''){try{if(typeof v38CleanRaw==='function')return v38CleanRaw(raw,url);}catch{}try{if(typeof cleanRaw==='function')return cleanRaw(raw);}catch{}return String(raw||'').replace(/\r\n/g,'\n').replace(/\r/g,'\n').replace(/\n{3,}/g,'\n\n').trim();}
function H46_cleanHtml(raw,url=''){try{if(typeof v38CleanHTML==='function')return v38CleanHTML(raw,url);}catch{}try{if(typeof cleanHTML==='function')return cleanHTML(raw);}catch{}return H46_cleanRaw(String(raw||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' '),url);}
function H46_jsonText(obj,url='',depth=0,bag=[]){
 if(depth>7||obj==null)return bag;
 if(typeof obj==='string'){const s=obj.trim();if(!s)return bag;if(/<html|<body|<article|<main|<p[\s>]/i.test(s))bag.push(H46_cleanHtml(s,url));else if(H46_cjkCount(s)>3||s.length>80)bag.push(H46_cleanMarkdown(s,url));return bag;}
 if(Array.isArray(obj)){obj.forEach(x=>H46_jsonText(x,url,depth+1,bag));return bag;}
 if(typeof obj==='object'){
  const priority=['content','text','body','article','chapter','chapterContent','html','markdown','plain','raw','description','summary','title'];
  for(const k of priority){if(obj[k]!=null)H46_jsonText(obj[k],url,depth+1,bag);}
  for(const [k,v] of Object.entries(obj)){if(!priority.includes(k))H46_jsonText(v,url,depth+1,bag);}
 }
 return bag;
}
function H46_parseJsonish(raw){if(raw==null)throw new Error('resposta vazia');let txt=String(raw).replace(/^\uFEFF/,'').trim();if(!txt)throw new Error('resposta vazia');try{return JSON.parse(txt);}catch{}const a=txt.indexOf('{'),b=txt.lastIndexOf('}');if(a>=0&&b>a){try{return JSON.parse(txt.slice(a,b+1));}catch{}}const aa=txt.indexOf('['),bb=txt.lastIndexOf(']');if(aa>=0&&bb>aa){try{return JSON.parse(txt.slice(aa,bb+1));}catch{}}throw new Error('JSON inválido');}
function H46_textFromRaw(raw,contentType='',url='',proxyId=''){
 const trimmed=String(raw||'').trim();if(!trimmed)return'';
 let parsed=null;
 if(/json/i.test(contentType)||/^[{\[]/.test(trimmed)){try{parsed=H46_parseJsonish(trimmed);}catch{}}
 if(parsed!=null){
  if(parsed&&typeof parsed==='object'){
   for(const k of ['contents','content','body','data','result','response','html','markdown','text']){
    if(typeof parsed[k]==='string'&&parsed[k].trim()){const nested=H46_textFromRaw(parsed[k],k==='html'?'text/html':'',url,proxyId);if(H46_cjkCount(nested)>5||nested.length>80)return nested;}
   }
  }
  const parts=H46_jsonText(parsed,url).map(x=>String(x||'').trim()).filter(Boolean);
  const uniq=[];const seen=new Set();for(const p of parts){const key=p.replace(/\s+/g,'').slice(0,180);if(key&&!seen.has(key)){seen.add(key);uniq.push(p);}}
  const joined=H46_cleanRaw(uniq.join('\n\n'),url);if(joined)return joined;
 }
 if(proxyId==='jina-reader')return H46_cleanMarkdown(trimmed,url);
 if(/^\s*</.test(trimmed)||/<html|<body|<article|<main|<p[\s>]/i.test(trimmed))return H46_cleanHtml(trimmed,url);
 return H46_cleanMarkdown(trimmed,url);
}
async function H46_fetchTimeout(url,init={},ms=14000){const ctl=new AbortController();const t=setTimeout(()=>{try{ctl.abort('timeout')}catch{}},ms);try{return await fetch(url,{...init,signal:ctl.signal});}finally{clearTimeout(t);}}
async function H46_fetchText(url){
 url=String(url||'').trim();if(!/^https?:\/\//i.test(url))throw new Error('URL inválida: use http/https');
 const proxies=H46_TEXT_PROXIES.concat(H46_customTextProxies());let last=null;const failures=[];
 for(const p of proxies){
  const target=p.url(url);
  try{
   H46_log('source.fetch.h46','buscando texto',{proxy:p.id,url:target,direct:!!p.direct},'');
   const r=await H46_fetchTimeout(target,{method:'GET',mode:'cors',credentials:'omit',cache:'no-store',headers:{'Accept':'text/html,application/json,text/plain,*/*'}},p.direct?9000:18000);
   const raw=await r.text();
   H46_log('source.fetch.h46','resposta source',{proxy:p.id,status:r.status,ok:r.ok,headers:H46_headersObj(r.headers),raw:H46_short(raw,6000)},r.ok?'ok':'error');
   if(!r.ok)throw new Error('HTTP '+r.status);
   const text=H46_textFromRaw(raw,r.headers.get('content-type')||'',url,p.id);
   if(!text||H46_cjkCount(text)<8&&text.length<80)throw new Error('texto insuficiente após parser');
   return text;
  }catch(e){last=e;failures.push({proxy:p.id,error:e.message||String(e)});H46_log('source.fetch.h46','rota falhou',{proxy:p.id,error:e.message||String(e)},'error');}
 }
 throw new Error('falha ao buscar/extrair URL. Último erro: '+(last?.message||last||'desconhecido'));
}
async function H46_importURL(url){try{if(typeof showLoad==='function')showLoad('Extraindo texto com fallback CORS/proxy...');const text=await H46_fetchText(url);const host=(()=>{try{return new URL(url).hostname;}catch{return url;}})();const lines=text.split('\n').map(x=>x.trim()).filter(Boolean);const title=lines[0]&&lines[0].length<80?lines[0]:host;if(typeof saveBook==='function')await saveBook({title,source:host,content:text,type:'url'});else if(typeof dbPut==='function'&&window.STB)await dbPut(STB,{id:Date.now().toString(36)+Math.random().toString(36).slice(2),title,source:host,content:text,type:'url',progress:0,lastRead:null,addedAt:Date.now(),charsRead:0});try{closeModals();}catch{}H46_toast('Importado!');try{await loadLib();}catch{}}catch(e){H46_toast('Erro: '+(e.message||e));}finally{try{hideLoad();}catch{}}}

function H46_normQuery(q){try{return (window.H44_normQuery?window.H44_normQuery(q):String(q||'').replace(/[^\u3400-\u9fff]/g,''))||String(q||'').trim();}catch{return String(q||'').trim();}}
function H46_sogouForm(q){try{return (window.H44_sogouForm?window.H44_sogouForm(q):'from=auto&to=en&client=wap&text='+encodeURIComponent(H46_normQuery(q))+'&uuid=null&pid=sogou-dict-vr&addSugg=on');}catch{return 'from=auto&to=en&client=wap&text='+encodeURIComponent(H46_normQuery(q))+'&uuid=null&pid=sogou-dict-vr&addSugg=on';}}
function H46_cacheSogou(q){try{return window.H44_getCachedSogou?window.H44_getCachedSogou(q):null;}catch{return null;}}
function H46_storeSogou(q,data,source){try{return window.H44_storeSogou?window.H44_storeSogou(q,data,source):false;}catch{return false;}}
const H46_SOGOU_PROXIES=[
 {id:'corsproxy.io',url:u=>'https://corsproxy.io/?'+encodeURIComponent(u)},
 {id:'thingproxy',url:u=>'https://thingproxy.freeboard.io/fetch/'+u},
 {id:'isomorphic-git',url:u=>'https://cors.isomorphic-git.org/'+u},
 {id:'corsproxy-fly',url:u=>'https://corsproxy.fly.dev/'+u},
 {id:'cors-eu',url:u=>'https://cors.eu.org/'+u},
 {id:'codetabs',url:u=>'https://api.codetabs.com/v1/proxy?quest='+encodeURIComponent(u)},
 {id:'allorigins-raw',url:u=>'https://api.allorigins.win/raw?url='+encodeURIComponent(u)},
 {id:'allorigins-get',url:u=>'https://api.allorigins.win/get?url='+encodeURIComponent(u)}
];
function H46_customSogouProxies(){try{const arr=JSON.parse(localStorage.getItem('h46.sogouProxies')||localStorage.getItem('h45.publicProxies')||'[]');if(!Array.isArray(arr))return[];return arr.filter(Boolean).map((base,i)=>({id:'custom-sogou-'+(i+1),url:u=>String(base).replace('{url}',encodeURIComponent(u)).replace('{raw}',u),custom:true}));}catch{return[];}}
async function H46_trySogouRoute(id,url,init,q){const r=await H46_fetchTimeout(url,init,12000);const raw=await r.text();H46_log('sogou.fetch.h46','response '+id,{status:r.status,ok:r.ok,headers:H46_headersObj(r.headers),raw:H46_short(raw)},r.ok?'ok':'error');if(!r.ok)throw new Error(id+' HTTP '+r.status);return H46_parseJsonish(raw);}
async function H46_sogouFetch(q){
 q=H46_normQuery(q);if(!q)return null;const cached=H46_cacheSogou(q);if(cached)return cached;
 const directUrl='https://fanyi.sogou.com/reventondc/suggV3';const form=H46_sogouForm(q);const headers={'accept':'application/json,text/plain,*/*','accept-language':'zh-CN','content-type':'application/x-www-form-urlencoded'};
 const failures=[];H46_log('sogou.prepare.h46','payload preparada com direct + proxies públicos',{query:q,directUrl,method:'POST',body:form},'');
 try{H46_log('sogou.direct.h46','request direta Sogou',{url:directUrl,method:'POST',headers,body:form},'');const data=await H46_trySogouRoute('direct',directUrl,{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',headers,body:form},q);H46_storeSogou(q,data,'direct-cors-readable-h46');return data;}catch(e){failures.push({route:'direct',error:e.message||String(e)});H46_log('sogou.direct.h46','direto bloqueado/falhou; iniciando proxies',{error:e.message||String(e)},'error');}
 if(location.protocol==='http:'||location.protocol==='https:'){
  /* v4.8.1: o header Referer nao pode ser setado via fetch() no navegador (forbidden header), e e
     exatamente esse header que a Sogou usa para autorizar/contextualizar a consulta (visto nos dois
     curls: referer=.../text?...keyword=<palavra>...). Por isso mandamos o referer pronto pro backend
     serverless (/api/sogou), que roda em Node e PODE setar esse header manualmente, igual o curl faz.
     O backend precisa montar a chamada assim:
       fetch('https://fanyi.sogou.com/reventondc/suggV3',{method:'POST',headers:{
         'content-type':'application/x-www-form-urlencoded','referer':payload.referer,
         'origin':'https://fanyi.sogou.com','accept':'application/json'
       },body:payload.rawBody})
     Sem isso a rota direta do navegador e os proxies publicos sempre batem sem o referer certo, o que
     explica por que ideogramas isolados (regra anti-bot mais agressiva da Sogou p/ 1 caractere) falham
     com mais frequencia que palavras compostas. */
  const refererUrl='https://fanyi.sogou.com/text?fr=default&keyword='+encodeURIComponent(q)+'&transfrom=auto&transto=en&model=general';
  try{const payload={text:q,rawBody:form,referer:refererUrl};H46_log('sogou.backend.h46','request /api/sogou',{url:'/api/sogou',method:'POST',payload},'');const data=await H46_trySogouRoute('backend','/api/sogou',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)},q);H46_storeSogou(q,data,'backend-h46');return data;}catch(e){failures.push({route:'backend',error:e.message||String(e)});}
 }
 const proxies=H46_customSogouProxies().concat(H46_SOGOU_PROXIES);
 for(const p of proxies){
  const postUrl=p.url(directUrl);try{H46_log('sogou.proxy.h46','request POST via proxy',{proxy:p.id,url:postUrl,body:form},'');const data=await H46_trySogouRoute('proxy-post-'+p.id,postUrl,{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',headers,body:form},q);H46_storeSogou(q,data,'proxy-post-h46:'+p.id);return data;}catch(e){failures.push({route:'proxy-post:'+p.id,error:e.message||String(e)});H46_log('sogou.proxy.h46','POST proxy falhou',{proxy:p.id,error:e.message||String(e)},'error');}
  const getTarget=directUrl+'?'+form;const getUrl=p.url(getTarget);try{H46_log('sogou.proxy.h46','request GET via proxy',{proxy:p.id,url:getUrl,target:getTarget},'');const data=await H46_trySogouRoute('proxy-get-'+p.id,getUrl,{method:'GET',mode:'cors',credentials:'omit',cache:'no-store',headers:{'Accept':'application/json,text/plain,*/*'}},q);H46_storeSogou(q,data,'proxy-get-h46:'+p.id);return data;}catch(e){failures.push({route:'proxy-get:'+p.id,error:e.message||String(e)});H46_log('sogou.proxy.h46','GET proxy falhou',{proxy:p.id,error:e.message||String(e)},'error');}
 }
 H46_log('sogou.proxy.h46','todas as rotas falharam',{query:q,failures},'error');try{if(window.H44_openDebug)window.H44_openDebug();}catch{}return H46_cacheSogou(q);
}
function H46_patchGlobals(){
 H46_css();H46_installVoiceUi();
 try{window.H46_fetchText=H46_fetchText;window.fetchText=H46_fetchText;fetchText=H46_fetchText;}catch{window.fetchText=H46_fetchText;}
 try{window.v38FetchText=H46_fetchText;v38FetchText=H46_fetchText;}catch{}
 try{window.v37Fetch=H46_fetchText;v37Fetch=H46_fetchText;}catch{}
 try{window.importURL=H46_importURL;importURL=H46_importURL;}catch{window.importURL=H46_importURL;}
 try{window.H46_sogouFetch=H46_sogouFetch;window.H45_sogouFetch=H46_sogouFetch;window.H44_sogouFetch=H46_sogouFetch;window.h42SogouFetch=H46_sogouFetch;if(typeof H45_sogouFetch!=='undefined')H45_sogouFetch=H46_sogouFetch;if(typeof H44_sogouFetch!=='undefined')H44_sogouFetch=H46_sogouFetch;if(typeof h42SogouFetch!=='undefined')h42SogouFetch=H46_sogouFetch;}catch{}
 try{window.H46_speak=H46_speak;window.h42Speak=H46_speak;window.h41SpeakText=H46_speak;window.h36Speak=async function(text){return H46_speak(text,H46_cjkCount(text)<=1?'char':'compound')};h36Speak=window.h36Speak;window.hr39SpeakWhole=window.h36Speak;}catch{}
 try{window.speakWordMode=async function(word,mode){return H46_speak(word,H46_cjkCount(word)<=1?'char':'compound')};window.speakWord=function(word){return window.speakWordMode(word,'natural')};speakWordMode=window.speakWordMode;speakWord=window.speakWord;}catch{}
 /* v4.8: nao reatribuir mais o onclick de #read-play aqui - o H48 e o unico dono do botao de leitura completa. */
 try{window.h42Settings=H46_getSettings;h42Settings=H46_getSettings;window.h42BuildSsml=H46_buildSsml;h42BuildSsml=H46_buildSsml;window.h42Endpoint=H46_endpoint;h42Endpoint=H46_endpoint;window.h42AudioFromSsml=H46_audioFromSsml;h42AudioFromSsml=H46_audioFromSsml;}catch{}
 try{const about=document.querySelector('#ss .ssub[style*="color:#8a8a8a"]');if(about)about.textContent=H46_VERSION;}catch{}
 H46_log('v46.boot','patch final Edge TTS + fetch/proxy carregado',{version:H46_VERSION,textProxies:H46_TEXT_PROXIES.map(x=>x.id),sogouProxies:H46_SOGOU_PROXIES.map(x=>x.id)},'ok');
}
function H46_boot(){H46_patchGlobals();setTimeout(H46_patchGlobals,600);setTimeout(H46_patchGlobals,1800);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',H46_boot);else H46_boot();
window.addEventListener('resize',()=>setTimeout(()=>{try{H46_css();}catch{}},50),{passive:true});
})();

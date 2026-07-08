
(()=>{
'use strict';
const H42_VERSION='v4.3-debug';
const H42_SECRET='oik6PdDdMnOXemTbwvMn9de/h9lFnfBaCWbGMMZqqoSaQaqUOqjVGm5NqsmjcBI1x+sS9ugjB55HEJWRiFXYFw==';
const H42_TOKEN_REFRESH_BEFORE_EXPIRY=3*60;
let h42TokenInfo={endpoint:null,token:null,expiredAt:null};
let h42AudioUrl=null;
const h42$=s=>document.querySelector(s);

const H43_DEBUG_VERSION='v4.3-debug';
let h43DebugOpen=false;
function h43DebugText(v){try{return typeof v==='string'?v:JSON.stringify(v,null,2);}catch(e){return String(v)}}
function h43DebugShort(s,n=9000){s=String(s??'');return s.length>n?s.slice(0,n)+'\n…[cortado: '+(s.length-n)+' caracteres restantes]':s;}
function h43DebugInit(){
  if(document.getElementById('h43-debug-btn'))return;
  const css=document.createElement('style');css.id='h43-debug-css';css.textContent=`
  #h43-debug-btn{position:fixed;right:14px;bottom:calc(92px + var(--sb,0px));z-index:10001;border:1px solid rgba(var(--ac-rgb),.55);background:#191919;color:#f5a623;border-radius:999px;padding:8px 11px;font:800 11px system-ui;letter-spacing:.04em;box-shadow:0 8px 24px rgba(0,0,0,.35)}
  #h43-debug-panel{position:fixed;left:0;right:0;bottom:0;height:min(74vh,680px);z-index:10000;background:#111;border-top:1px solid #333;border-radius:18px 18px 0 0;box-shadow:0 -18px 58px rgba(0,0,0,.7);transform:translateY(104%);transition:.24s transform;display:flex;flex-direction:column;color:#eee;font-family:system-ui,-apple-system,Segoe UI,sans-serif}
  #h43-debug-panel.open{transform:translateY(0)}
  .h43-dbg-head{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #252525}.h43-dbg-title{font-weight:900;color:#f5a623;flex:1}.h43-dbg-actions{display:flex;gap:6px;flex-wrap:wrap}.h43-dbg-actions button,.h43-dbg-copy{border:1px solid #333;background:#202020;color:#eee;border-radius:9px;padding:7px 9px;font-weight:800;font-size:11px}.h43-dbg-actions button:active{opacity:.7}
  #h43-debug-body{flex:1;overflow:auto;padding:10px 12px;display:flex;flex-direction:column;gap:10px}.h43-dbg-item{border:1px solid #2b2b2b;background:#181818;border-radius:13px;overflow:hidden}.h43-dbg-meta{display:flex;gap:8px;align-items:center;padding:8px 10px;border-bottom:1px solid #282828}.h43-dbg-kind{font-size:10px;font-weight:900;color:#f5a623;text-transform:uppercase;letter-spacing:.05em}.h43-dbg-time{font-size:10px;color:#777;margin-left:auto}.h43-dbg-title2{font-size:12px;font-weight:800;color:#ddd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:58vw}.h43-dbg-pre{white-space:pre-wrap;word-break:break-word;font:11.5px ui-monospace,SFMono-Regular,Menlo,monospace;color:#cfcfcf;line-height:1.45;padding:10px;max-height:220px;overflow:auto}.h43-dbg-error .h43-dbg-kind{color:#ff6b6b}.h43-dbg-ok .h43-dbg-kind{color:#7ee787}.h43-dbg-warn .h43-dbg-kind{color:#ffd166}
  .h43-dbg-paste{display:grid;gap:8px;padding:10px;border-top:1px solid #242424;background:#151515}.h43-dbg-paste textarea{width:100%;min-height:86px;border:1px solid #333;border-radius:10px;background:#0c0c0c;color:#eee;padding:9px;font:12px ui-monospace,monospace}.h43-dbg-paste .row{display:flex;gap:8px;flex-wrap:wrap}.h43-dbg-paste button{border:1px solid #333;background:#222;color:#eee;border-radius:9px;padding:8px 10px;font-weight:800;font-size:12px}.h43-dbg-note{font-size:11px;color:#888;line-height:1.45;padding:0 2px}
/* Leitor: Tradução e Leitura como retângulos gêmeos */
.mini-dock{gap:9px}
#sel-translate,#sel-read{display:inline-flex;width:118px;height:42px;border-radius:10px;justify-content:center;align-items:center;gap:7px;padding:0 8px;font-size:12.5px;font-weight:800;background:rgba(24,24,24,.92);color:#eee;border:1px solid rgba(var(--ac-rgb),.45);box-shadow:0 6px 20px rgba(0,0,0,.35)}
#sel-read.pri{background:rgba(24,24,24,.92);color:#eee}
#sel-translate svg,#sel-read svg{width:16px;height:16px}
/* Expandir/ocultar: quadrado, SVG maior, sempre visível */
#reader-fs{width:44px!important;height:44px!important;border-radius:10px!important;font-size:0}
#reader-fs svg{width:22px!important;height:22px!important}
/* Rodapé oculto: botão desce colado ao canto inferior direito */
.reader-fullscreen #reader-fs{right:0!important;bottom:calc(0px + var(--sb))!important;border-radius:12px 0 0 0!important;border-right:0!important;border-bottom:0!important}
/* Rodapé oculto: Tradução/Leitura só aparecem durante seleção de texto */
.reader-fullscreen #sel-translate,.reader-fullscreen #sel-read{display:none!important}
.reader-fullscreen.hz-selecting #sel-translate,.reader-fullscreen.hz-selecting #sel-read{display:inline-flex!important}
.reader-fullscreen .mini-dock{right:10px;bottom:calc(56px + var(--sb))}
/* Responsividade ampla: tablet 4:3, desktop, ultrawide, super ultrawide */
@media(min-width:760px) and (max-width:1024px){.lib-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}.ms{max-width:600px}}
@media(min-width:1400px){.app-shell,.bc,.wc,.sc,.dict-wrap{max-width:1200px!important}#sr .rscroll{max-width:980px}.simple-list{max-width:980px}.lib-grid{grid-template-columns:repeat(6,minmax(0,1fr))!important}.ms{max-width:700px}#mo-music .ms{max-width:620px}.hzp-card,.hzp-title,.hzp-waves{max-width:720px}}
@media(min-width:2000px){.app-shell,.bc,.wc,.sc,.dict-wrap{max-width:1400px!important}#sr .rscroll{max-width:1060px}.rtop{padding-left:max(18px,calc((100vw - 1060px)/2))!important;padding-right:max(18px,calc((100vw - 1060px)/2))!important}html.hz-bgart #sl,html.hz-bgart #sw,html.hz-bgart #sd,html.hz-bgart #ss,html.hz-bgart #sx,html.hz-bgart #sp{background-position:center!important}}
@media(min-width:2560px){.app-shell,.bc,.wc,.sc,.dict-wrap{max-width:1560px!important}}

/* Calha lateral segura e simétrica em todas as proporções */
:root{--gx:clamp(14px,3.2vw,26px)}
.bc,.wc,.sc,.dict-wrap{padding-left:max(var(--gx),env(safe-area-inset-left,0px))!important;padding-right:max(var(--gx),env(safe-area-inset-right,0px))!important;box-sizing:border-box}
#sr .rscroll{padding-left:max(var(--gx),env(safe-area-inset-left,0px))!important;padding-right:max(var(--gx),env(safe-area-inset-right,0px))!important;box-sizing:border-box}
.rtop{padding-left:max(var(--gx),env(safe-area-inset-left,0px))!important;padding-right:max(var(--gx),env(safe-area-inset-right,0px))!important}
.lh,.wh,.sh{padding-left:max(var(--gx),env(safe-area-inset-left,0px))!important;padding-right:max(var(--gx),env(safe-area-inset-right,0px))!important}
.bnav{padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px)}
.mo{padding-left:max(10px,env(safe-area-inset-left,0px));padding-right:max(10px,env(safe-area-inset-right,0px));box-sizing:border-box}
.ms{max-width:min(92vw,var(--hz-ms-max,560px))}
.mini-dock{right:max(14px,env(safe-area-inset-right,0px))!important}
.reader-fullscreen #reader-fs{right:0!important}
@media(min-width:700px) and (max-width:1180px){
 .app-shell,.bc,.wc,.sc,.dict-wrap{max-width:min(92vw,960px)!important;margin-left:auto!important;margin-right:auto!important}
 #sr .rscroll,.simple-list{max-width:min(92vw,860px)!important;margin-left:auto!important;margin-right:auto!important}
 .hzp-card,.hzp-title,.hzp-waves{max-width:min(88vw,640px)}
}

/* Frases do dicionário: salvar empilhado abaixo do ouvir (sem vazar à direita) */
.hz-sent-actions{display:flex;flex-direction:column;gap:7px;align-items:center;flex-shrink:0}
.sent-card .sent-top{grid-template-columns:minmax(0,1fr) 40px!important;align-items:start!important}
.hz-sent-actions .dict-audio,.hz-sent-actions .v41-save-sent-btn{width:34px;height:34px}

/* Header compacto: Config | Leitura simples | Livros | Busca */
.v43-header-row{padding:8px 12px 8px!important}
.v43-header-row .mode-row.hz-inline{flex:1;margin:0!important;padding:4px!important;border-radius:14px!important;gap:5px!important}
.mode-row.hz-inline .mode-btn{padding:9px 6px!important;font-size:13px!important;border-radius:11px!important}
.app-head{padding-bottom:2px}
/* Busca como linha abaixo do header; seção desce junto (fluxo normal) */
.v43-search-wrap{display:none;padding:2px 12px 8px}
.v43-search-wrap.open,.v43-search-wrap.vis{display:flex}
.v43-search-wrap .v43-search-expand{width:100%!important;opacity:1!important;padding:11px 15px!important;margin:0!important;border:1px solid #333!important;border-radius:13px!important;font-size:15px!important}
.v43-search-wrap.open .v43-search-expand{width:100%!important}
/* Linha da seção mais colada ao topo */
.lib-tools{margin-top:2px}

/* Header não expande: a seção e a lista sobem coladas ao topo */
/* Shell = coluna flex da tela: header auto, conteúdo rola por dentro, nav sempre no fim */
#sl .app-shell{flex:1 1 auto!important;min-height:0!important;display:flex!important;flex-direction:column!important}
#sl .app-shell .app-head{flex:0 0 auto}
#sl #bc{flex:1 1 auto!important;min-height:0!important;overflow-y:auto!important;padding-top:6px!important}
#sl .app-shell .bnav{flex-shrink:0}
.lib-tools{padding-top:4px!important}
`;document.head.appendChild(css);
  const btn=document.createElement('button');btn.id='h43-debug-btn';btn.type='button';btn.textContent='DBG';btn.title='Abrir console de debug';document.body.appendChild(btn);
  const panel=document.createElement('div');panel.id='h43-debug-panel';panel.innerHTML=`<div class="h43-dbg-head"><div class="h43-dbg-title">Debug API / Parse</div><div class="h43-dbg-actions"><button type="button" id="h43-debug-copy-all">Copiar tudo</button><button type="button" id="h43-debug-copy-last">Copiar último</button><button type="button" id="h43-debug-clear">Limpar</button><button type="button" id="h43-debug-close">Fechar</button></div></div><div id="h43-debug-body"></div><div class="h43-dbg-paste"><div class="h43-dbg-note">Cole aqui o JSON bruto que aparecer no Network/Preview caso o navegador bloqueie CORS. O parser abaixo usa as mesmas funções internas do dicionário.</div><textarea id="h43-debug-paste" placeholder="Cole a resposta JSON da Sogou aqui..."></textarea><div class="row"><button type="button" id="h43-debug-parse-paste">Parsear JSON colado</button><button type="button" id="h43-debug-copy-parse">Copiar parse</button></div></div>`;document.body.appendChild(panel);
  const toggle=()=>{h43DebugOpen=!panel.classList.contains('open');panel.classList.toggle('open',h43DebugOpen);localStorage.setItem('h43DebugOpen',h43DebugOpen?'1':'0')};
  btn.onclick=toggle;document.getElementById('h43-debug-close').onclick=toggle;
  document.getElementById('h43-debug-clear').onclick=()=>{window.HANZI_DEBUG_EVENTS=[];h43DebugRender()};
  document.getElementById('h43-debug-copy-all').onclick=()=>h43DebugCopy(h43DebugText(window.HANZI_DEBUG_EVENTS||[]));
  document.getElementById('h43-debug-copy-last').onclick=()=>{const a=window.HANZI_DEBUG_EVENTS||[];h43DebugCopy(h43DebugText(a[a.length-1]||{}));};
  document.getElementById('h43-debug-parse-paste').onclick=h43DebugParsePaste;
  document.getElementById('h43-debug-copy-parse').onclick=()=>h43DebugCopy(document.getElementById('h43-debug-paste').dataset.lastParse||'');
  window.HANZI_DEBUG_EVENTS=window.HANZI_DEBUG_EVENTS||[];
  if(localStorage.getItem('h43DebugOpen')==='1'||/[?&]debug=1\b/.test(location.search)){panel.classList.add('open');h43DebugOpen=true;}
  h43DebugRender();
}
function h43DebugCopy(txt){try{navigator.clipboard.writeText(String(txt||''));h42Toast('Debug copiado');}catch{const ta=document.createElement('textarea');ta.value=String(txt||'');document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();h42Toast('Debug copiado')}}
function h43DebugLog(kind,title,data,status=''){
  const ev={time:new Date().toISOString(),kind,title,status,data};
  window.HANZI_DEBUG_EVENTS=window.HANZI_DEBUG_EVENTS||[];window.HANZI_DEBUG_EVENTS.push(ev);if(window.HANZI_DEBUG_EVENTS.length>120)window.HANZI_DEBUG_EVENTS.shift();
  
  h43DebugRender();
  return ev;
}
function h43DebugRender(){const body=document.getElementById('h43-debug-body');if(!body)return;const arr=(window.HANZI_DEBUG_EVENTS||[]).slice().reverse();if(!arr.length){body.innerHTML='<div class="h43-dbg-note">Sem eventos ainda. Faça uma busca no dicionário ou toque em Play para gerar TTS.</div>';return;}body.innerHTML=arr.map((e,i)=>`<div class="h43-dbg-item h43-dbg-${e.status||''}"><div class="h43-dbg-meta"><span class="h43-dbg-kind">${h42Esc(e.kind||'log')}</span><span class="h43-dbg-title2">${h42Esc(e.title||'')}</span><button class="h43-dbg-copy" data-h43-copy="${i}">copiar</button><span class="h43-dbg-time">${h42Esc(new Date(e.time).toLocaleTimeString())}</span></div><pre class="h43-dbg-pre">${h42Esc(h43DebugShort(h43DebugText(e.data)))}</pre></div>`).join('');body.querySelectorAll('[data-h43-copy]').forEach(b=>b.onclick=()=>{const ev=arr[Number(b.dataset.h43Copy)];h43DebugCopy(h43DebugText(ev));});}
function h43DebugParsePaste(){const ta=document.getElementById('h43-debug-paste');const q=(document.getElementById('dict-q')?.value||'').trim();try{const raw=ta.value.trim();const data=JSON.parse(raw);const sugg=(typeof h42DeepSugg==='function'?h42DeepSugg(data,[]):[]);const sents=(typeof h42DeepSents==='function'?h42DeepSents(data,q,[]):[]);const parsed={query:q,sugg,sents,rootKeys:data&&typeof data==='object'?Object.keys(data):[],data};const out=h43DebugText(parsed);ta.dataset.lastParse=out;h43DebugLog('manual.parse','JSON colado parseado',parsed,'ok');}catch(e){h43DebugLog('manual.parse','Erro ao parsear JSON colado',{error:e.message,raw:ta.value.slice(0,1200)},'error');}}
/* v4.9: modo debug removido a pedido do usuário — h43DebugInit não é mais chamado. */

function h42Toast(msg){try{toast(msg)}catch{console.warn(msg)}}
function h42Esc(s){return String(s??'').replace(/[<>&'\"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&#39;','"':'&quot;'}[c]));}
function h42Xml(s){return String(s??'').replace(/[<>&'\"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));}
function h42Svg(n){const m={sound:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>',play:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',pause:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',mic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><path d="M12 18v4"/><path d="M8 22h8"/></svg>'};return m[n]||'';}
function h42Settings(){let base={voice:'zh-CN-XiaoxiaoNeural',speed:1,pitch:0,volume:0,style:'general',degree:1.35,role:'',format:'audio-24khz-48kbitrate-mono-mp3',chunkMode:'line',linePause:450};try{base={...base,...JSON.parse(localStorage.getItem('h41VoiceSettings')||localStorage.getItem('v40VoiceSettings')||'{}')}}catch{}try{const v=document.getElementById('h41-voice-select')?.value;if(v)base.voice=v;const sp=document.getElementById('h41-speed')?.value;if(sp)base.speed=Number(sp);const pi=document.getElementById('h41-pitch')?.value;if(pi!=null&&pi!=='')base.pitch=Number(pi);const st=document.getElementById('h41-style')?.value;if(st)base.style=st;}catch{}return base;}
function h42Signed(n,suffix){n=Number(n)||0;return (n>=0?'+':'')+n+suffix;}
function h42Rate(speed){return h42Signed(Math.trunc((Number(speed||1)-1)*100),'%');}
function h42Pitch(v){return h42Signed(parseInt(v||0,10),'Hz');}
function h42Volume(v){return h42Signed(Math.trunc(Number(v||0)*100),'%');}
function h42Uuid(){if(crypto.randomUUID)return crypto.randomUUID().replace(/-/g,'');const b=new Uint8Array(16);crypto.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;return Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');}
function h42Date(){return new Date().toUTCString().replace(/GMT/,'').trim().toLowerCase()+' gmt';}
function h42B64ToBytes(b64){const bin=atob(b64);const bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return bytes;}
function h42BytesToB64(bytes){let s='';for(let i=0;i<bytes.length;i++)s+=String.fromCharCode(bytes[i]);return btoa(s);}
async function h42Hmac(keyBytes,data){const key=await crypto.subtle.importKey('raw',keyBytes,{name:'HMAC',hash:{name:'SHA-256'}},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(data)));}
async function h42Sign(urlStr){if(!window.crypto||!crypto.subtle)throw new Error('WebCrypto indisponível. Abra em Chrome/Edge moderno, HTTPS/localhost, ou use o ZIP Vercel.');const url=urlStr.split('://')[1];const encodedUrl=encodeURIComponent(url);const uuidStr=h42Uuid();const formattedDate=h42Date();const bytesToSign=`MSTranslatorAndroidApp${encodedUrl}${formattedDate}${uuidStr}`.toLowerCase();const secret=h42B64ToBytes(H42_SECRET);const signData=await h42Hmac(secret,bytesToSign);return `MSTranslatorAndroidApp::${h42BytesToB64(signData)}::${formattedDate}::${uuidStr}`;}
async function h42Endpoint(){
 const now=Date.now()/1000;
 if(h42TokenInfo.token&&h42TokenInfo.expiredAt&&now<h42TokenInfo.expiredAt-H42_TOKEN_REFRESH_BEFORE_EXPIRY){h43DebugLog('edge.endpoint','token em cache',{region:h42TokenInfo.endpoint?.r,expiresAt:h42TokenInfo.expiredAt},'ok');return h42TokenInfo.endpoint;}
 const endpointUrl='https://dev.microsofttranslator.com/apps/endpoint?api-version=1.0';
 const clientId=h42Uuid();
 let signature='';
 try{signature=await h42Sign(endpointUrl);}catch(e){h43DebugLog('edge.endpoint','erro ao assinar endpoint',{endpointUrl,error:e.message},'error');throw e;}
 const headers={'Accept-Language':'zh-Hans','X-ClientVersion':'4.0.530a 5fe1dc6c','X-UserId':'0f04d16a175c411e','X-HomeGeographicRegion':'zh-Hans-CN','X-ClientTraceId':clientId,'X-MT-Signature':signature,'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0','Content-Type':'application/json; charset=utf-8'};
 h43DebugLog('edge.endpoint','request token Microsoft',{url:endpointUrl,method:'POST',headers:{...headers,'X-MT-Signature':signature.slice(0,80)+'...'},body:''});
 let response;
 try{response=await fetch(endpointUrl,{method:'POST',headers,body:''});}catch(e){h43DebugLog('edge.endpoint','fetch/token falhou',{url:endpointUrl,error:e.message||String(e),hint:'Se abrir via content://, WebCrypto/CORS podem variar conforme o navegador.'},'error');throw e;}
 const raw=await response.text().catch(e=>'[erro ao ler resposta: '+(e.message||e)+']');
 h43DebugLog('edge.endpoint','response token Microsoft',{status:response.status,ok:response.ok,headers:Object.fromEntries([...response.headers.entries()].slice(0,40)),raw:h43DebugShort(raw,12000)},response.ok?'ok':'error');
 if(!response.ok)throw new Error(`Falha ao obter endpoint/token: HTTP ${response.status}`);
 let data;try{data=JSON.parse(raw);}catch(e){h43DebugLog('edge.endpoint','JSON token inválido',{raw,error:e.message},'error');throw e;}
 let exp=Math.floor(Date.now()/1000)+540;try{exp=JSON.parse(atob(data.t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).exp||exp;}catch(e){h43DebugLog('edge.endpoint','não decodificou JWT',{error:e.message},'warn');}
 h42TokenInfo={endpoint:data,token:data.t,expiredAt:exp};
 h43DebugLog('edge.endpoint','endpoint parseado',{region:data.r,expiresAt:exp,expiresLocal:new Date(exp*1000).toLocaleString(),tokenPreview:String(data.t||'').slice(0,42)+'...'},'ok');
 return data;
}
function h42Express(text,o){const style=o.style&&o.style!=='general'?o.style:'';const role=o.role||'';const attrs=[];if(style)attrs.push(`style="${h42Xml(style)}"`);if(style&&o.degree)attrs.push(`styledegree="${h42Xml(o.degree)}"`);if(role)attrs.push(`role="${h42Xml(role)}"`);const prosody=`<prosody rate="${h42Xml(h42Rate(o.speed))}" pitch="${h42Xml(h42Pitch(o.pitch))}" volume="${h42Xml(h42Volume(o.volume))}">${h42Xml(text)}</prosody>`;return attrs.length?`<mstts:express-as ${attrs.join(' ')}>${prosody}</mstts:express-as>`:prosody;}
function h42BuildSsml(text,o=h42Settings()){const voice=o.voice||'zh-CN-XiaoxiaoNeural';const lang=voice.split('-').slice(0,2).join('-')||'zh-CN';const linePause=Math.max(0,Math.min(2000,Number(o.linePause??450)));const lines=String(text||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);let body='';if((o.chunkMode||'line')==='line'&&lines.length>1){body=lines.map((line,i)=>`    ${h42Express(line,o)}${i<lines.length-1&&linePause>0?`\n    <break time="${linePause}ms"/>`:''}`).join('\n');}else{body=`    ${h42Express(String(text||'').trim(),o)}`;}return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${h42Xml(lang)}">\n  <voice name="${h42Xml(voice)}">\n${body}\n  </voice>\n</speak>`;}
function h42SplitSmart(text,maxLen=1800){const clean=String(text||'').replace(/[ \t]+/g,' ').trim();if(!clean)return[];const parts=[];let cur='';for(const s of clean.split(/(?<=[。！？!?\.])\s*/)){if(!s)continue;if((cur+s).length<=maxLen)cur+=s;else{if(cur)parts.push(cur.trim());if(s.length<=maxLen)cur=s;else{for(let i=0;i<s.length;i+=maxLen)parts.push(s.slice(i,i+maxLen));cur='';}}}if(cur)parts.push(cur.trim());return parts;}
async function h42AudioFromSsml(ssml,o=h42Settings()){
 const endpoint=await h42Endpoint();
 const url=`https://${endpoint.r}.tts.speech.microsoft.com/cognitiveservices/v1`;
 const headers={'Authorization':endpoint.t,'Content-Type':'application/ssml+xml','User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0','X-Microsoft-OutputFormat':o.format||'audio-24khz-48kbitrate-mono-mp3'};
 h43DebugLog('edge.tts','request SSML',{url,method:'POST',headers:{...headers,Authorization:String(endpoint.t||'').slice(0,48)+'...'},settings:o,ssml});
 let response;
 try{response=await fetch(url,{method:'POST',headers,body:ssml});}catch(e){h43DebugLog('edge.tts','fetch SSML falhou',{url,error:e.message||String(e),ssml},'error');throw e;}
 const meta={status:response.status,ok:response.ok,headers:Object.fromEntries([...response.headers.entries()].slice(0,60)),url};
 if(!response.ok){const text=await response.text().catch(e=>'[erro ao ler erro: '+(e.message||e)+']');h43DebugLog('edge.tts','response erro Microsoft',{...meta,body:text},'error');throw new Error(`Serviço de voz: ${response.status} — ${text}`);}
 const blob=await response.blob();h43DebugLog('edge.tts','response áudio Microsoft',{...meta,blob:{size:blob.size,type:blob.type},object:'blob recebido; áudio binário não é exibido no debug'},'ok');return blob;
}
async function h42EdgeDirect(text,o=h42Settings()){text=String(text||'').trim();if(!text)throw new Error('Sem texto para TTS.');if(text.length<1800){return h42AudioFromSsml(h42BuildSsml(text,o),o);}const chunks=h42SplitSmart(text,1800);const blobs=[];for(const c of chunks)blobs.push(await h42AudioFromSsml(h42BuildSsml(c,o),o));return new Blob(blobs,{type:'audio/mpeg'});}
async function h42EdgeApi(text,o=h42Settings()){
 if(!(location.protocol==='http:'||location.protocol==='https:'))throw new Error('API backend indisponível fora de HTTP/HTTPS.');
 const payload={text,...o};h43DebugLog('edge.api','request /api/edge-tts',{url:'/api/edge-tts',method:'POST',payload});
 const r=await fetch('/api/edge-tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 if(!r.ok){const t=await r.text().catch(()=> '');h43DebugLog('edge.api','response /api/edge-tts erro',{status:r.status,headers:Object.fromEntries([...r.headers.entries()].slice(0,40)),body:t},'error');throw new Error('API Edge TTS HTTP '+r.status+': '+t);}
 const b=await r.blob();h43DebugLog('edge.api','response /api/edge-tts áudio',{status:r.status,headers:Object.fromEntries([...r.headers.entries()].slice(0,40)),blob:{size:b.size,type:b.type}},'ok');return b;
}
async function h42Edge(text,o=h42Settings()){let last=null;try{return await h42EdgeDirect(text,o);}catch(e){last=e;console.warn('Edge direto falhou:',e);}try{return await h42EdgeApi(text,o);}catch(e){last=e;console.warn('Edge API falhou:',e);}throw last||new Error('Edge TTS falhou.');}
function h42PlayBlob(blob){return new Promise((res,rej)=>{try{if(curAudio)curAudio.pause();}catch{}try{if(h42AudioUrl)URL.revokeObjectURL(h42AudioUrl)}catch{}h42AudioUrl=URL.createObjectURL(blob);const a=new Audio(h42AudioUrl);curAudio=a;const timeout=Math.max(15000,Math.min(240000,blob.size*12));const t=setTimeout(()=>{try{a.pause()}catch{}curAudio=null;rej(new Error('timeout de áudio'));},timeout);a.onended=()=>{clearTimeout(t);curAudio=null;res();};a.onerror=()=>{clearTimeout(t);curAudio=null;rej(new Error('falha no player de áudio'));};a.play().catch(e=>{clearTimeout(t);curAudio=null;rej(e);});});}
async function h42Baidu(text){const t=String(text||'').trim();if(!t)return false;const urls=[`https://fanyi.baidu.com/gettts?lan=zh&text=${encodeURIComponent(t)}&spd=5&source=web`,...(typeof h36AudioUrls==='function'?h36AudioUrls(t):[])];for(const u of urls){try{if(typeof h36PlayUrl==='function')await h36PlayUrl(u);else await new Promise((res,rej)=>{const a=new Audio(u);a.onended=res;a.onerror=rej;a.play().catch(rej);});return true;}catch{}}return false;}
function h42CjkLen(t){return [...String(t||'')].filter(ch=>/[\u3400-\u9fff]/.test(ch)).length;}
async function h42Speak(text,kind='auto'){text=String(text||'').trim();if(!text)return false;try{if(typeof h36Busy==='function')h36Busy(true);if(kind==='char'||h42CjkLen(text)<=1){if(await h42Baidu(text))return true;}try{const blob=await h42Edge(text,h42Settings());await h42PlayBlob(blob);return true;}catch(e){console.warn('Edge TTS final falhou:',e);}if(await h42Baidu(text))return true;h42Toast('Nenhuma rota de áudio respondeu agora.');return false;}finally{if(typeof h36Busy==='function')h36Busy(false);}}
function h42ReaderText(){try{if(curBook){const idx=curBook._readingChapterIndex??curBook.lastChapterIndex??curBook.lastChapter??0;const chs=curBook.chapters||curBook.pages;if(chs&&chs[idx])return chs[idx].content||chs[idx].text||chs[idx].body||'';if(curBook.content)return curBook.content;}}catch{}try{const t=(readerTokens||[]).map(x=>x.word||x.char||'').join('');if(t)return t;}catch{}return document.getElementById('rtext')?.innerText||'';}
async function h42StartReading(){const text=h42ReaderText();if(!String(text).trim())return h42Toast('Sem texto para ler.');try{v32Reading=true;v32UpdateReadUi&&v32UpdateReadUi()}catch{}const b=document.getElementById('read-play');if(b){b.classList.add('h41-working');b.innerHTML=h42Svg('pause');}try{await h42Speak(text,'full');}catch(e){h42Toast('Falha ao gerar áudio: '+(e.message||e));}finally{try{v32Reading=false;v32UpdateReadUi&&v32UpdateReadUi()}catch{}if(b)b.classList.remove('h41-working');}}
function h42StopReading(){try{v32Reading=false;if(curAudio)curAudio.pause();v32UpdateReadUi&&v32UpdateReadUi()}catch{}}
function h42CleanDef(s){return String(s||'').replace(/&nbsp;|&#160;/gi,' ').replace(/<[^>]+>/g,' ').replace(/\\[rn]/g,' ').replace(/\s+/g,' ').trim();}
async function h42SogouFetch(q){
 q=String(q||'').trim();if(!q)return null;
 const form='from=auto&to=en&client=wap&text='+encodeURIComponent(q)+'&uuid=null&pid=sogou-dict-vr&addSugg=on';
 const directUrl='https://fanyi.sogou.com/reventondc/suggV3';
 const headers={'accept':'application/json','accept-language':'zh-CN','content-type':'application/x-www-form-urlencoded'};
 h43DebugLog('sogou.prepare','payload preparada',{query:q,directUrl,method:'POST',headers,body:form,backendAvailable:(location.protocol==='http:'||location.protocol==='https:')});
 if(location.protocol==='http:'||location.protocol==='https:'){
   try{
     const payload={text:q,rawBody:form};h43DebugLog('sogou.backend','request /api/sogou',{url:'/api/sogou',method:'POST',payload});
     const r=await fetch('/api/sogou',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
     const raw=await r.text().catch(e=>'[erro ao ler resposta backend: '+(e.message||e)+']');
     h43DebugLog('sogou.backend','response /api/sogou',{status:r.status,ok:r.ok,headers:Object.fromEntries([...r.headers.entries()].slice(0,50)),raw:h43DebugShort(raw,16000)},r.ok?'ok':'error');
     if(r.ok){try{return JSON.parse(raw);}catch(e){h43DebugLog('sogou.backend','JSON inválido do backend',{error:e.message,raw},'error');}}
   }catch(e){h43DebugLog('sogou.backend','fetch backend falhou',{error:e.message||String(e)},'error');}
 }
 try{
   h43DebugLog('sogou.direct','request direta Sogou',{url:directUrl,method:'POST',headers,body:form});
   const r=await fetch(directUrl,{method:'POST',mode:'cors',headers,body:form});
   const raw=await r.text();
   h43DebugLog('sogou.direct','response direta Sogou',{status:r.status,ok:r.ok,headers:Object.fromEntries([...r.headers.entries()].slice(0,50)),raw:h43DebugShort(raw,16000)},r.ok?'ok':'error');
   if(r.ok){try{return JSON.parse(raw);}catch(e){h43DebugLog('sogou.direct','JSON inválido direto',{error:e.message,raw},'error');}}
 }catch(e){
   h43DebugLog('sogou.direct','CORS/fetch direto bloqueado',{error:e.message||String(e),explanation:'Se o Network mostra 200 mas o console acusa CORS, o JavaScript não consegue ler o corpo. Use o painel para copiar a payload e cole a resposta bruta do Network no campo manual.'},'error');
 }
 return null;
}
function h42DeepSugg(x,arr=[]){if(!x)return arr;if(Array.isArray(x)){x.forEach(v=>h42DeepSugg(v,arr));return arr;}if(typeof x==='object'){const k=x.k||x.key||x.word||x.phrase||x.text||x.src;const v=x.v||x.value||x.translation||x.trans||x.mean||x.meaning||x.en||x.dst;if(k&&v)arr.push({k:String(k),v:String(v)});Object.values(x).forEach(v=>h42DeepSugg(v,arr));}return arr;}
function h42DeepSents(x,q,arr=[]){if(!x)return arr;if(Array.isArray(x)){x.forEach(v=>h42DeepSents(v,q,arr));return arr;}if(typeof x==='object'){const vals=Object.values(x).filter(v=>typeof v==='string');const zh=vals.find(v=>/[\u3400-\u9fff]/.test(v)&&v.includes(q)&&v.length>=q.length+2&&/[。！？!?，,]/.test(v));const en=vals.find(v=>/[A-Za-z]/.test(v)&&!/[\u3400-\u9fff]{2,}/.test(v));if(zh)arr.push({zh:zh.trim(),py:typeof getWordPY==='function'?getWordPY(zh):'',en:h42CleanDef(en||''),src:'Sogou'});Object.values(x).forEach(v=>h42DeepSents(v,q,arr));}return arr;}
async function h42DictData(q){const n=[...String(q||'')].filter(ch=>/[\u3400-\u9fff]/.test(ch)).join('');const data=await h42SogouFetch(n);const raw=h42DeepSugg(data,[]);const seen=new Set(), sugg=[];for(const x of raw){const k=x.k+'|'+x.v;if(!seen.has(k)){seen.add(k);sugg.push(x);}}const sents=h42DeepSents(data,n,[]);return {n,data,sugg,sents,online:!!data};}
async function h42RenderDefs(q,out){const n=[...String(q||'')].filter(ch=>/[\u3400-\u9fff]/.test(ch)).join('');out.innerHTML='<div class="dict-card"><div class="spin sm" style="margin:0 auto"></div></div>';
 /* v4.8.1: busca Sogou e CC-CEDICT em paralelo (nao so como fallback quando Sogou falha). Ideogramas
    isolados costumam bater em regras anti-bot mais duras na Sogou, mas quase sempre existem no
    CC-CEDICT, entao juntar as duas fontes sempre resolve o caso de "1 caractere sem definição". */
 const [dd,cedictEntries]=await Promise.all([h42DictData(n),(async()=>{try{if(typeof hr39LookupShort==='function')return await hr39LookupShort(n);}catch{}return [];})()]);
 let exact=dd.sugg.find(x=>x.k===n)||dd.sugg.find(x=>String(x.k).startsWith(n))||dd.sugg[0];
 const fallbackDef=(cedictEntries&&cedictEntries[0])||null;
 let html=`<div class="dict-card"><div class="dict-word">${h42Esc(n)} <button class="dict-audio v34-svg-only" data-v34-speak="${h42Esc(n)}">${h42Svg('sound')}</button></div><div class="dict-py">${h42Esc(typeof getWordPY==='function'?getWordPY(n):'')}</div>`;
 if(exact)html+=`<div class="dict-pos">TRADUÇÃO / DEFINIÇÃO</div><div class="dict-def strong">${h42Esc(h42CleanDef(exact.v))}</div>`;
 if(fallbackDef&&(fallbackDef.en||fallbackDef.defs)){const cedictText=fallbackDef.en||(fallbackDef.defs||[]).join('; ');if(!exact||h42CleanDef(exact.v)!==h42CleanDef(cedictText))html+=`<div class="dict-pos">TRADUÇÃO / CC-CEDICT</div><div class="dict-def strong">${h42Esc(cedictText)}</div>`;}
 if(!exact&&!fallbackDef)html+='<div class="dict-def">Nenhuma fonte online respondeu agora para este termo. Toque em pesquisar novamente em alguns segundos — as fontes públicas (Sogou/CC-CEDICT) às vezes ficam temporariamente indisponíveis.</div>';
 const related=dd.sugg.filter(x=>x.k!==n).slice(0,18);if(related.length)html+='<div class="dict-pos">PALAVRAS / USOS RELACIONADOS</div>'+related.map((x,i)=>`<div class="dict-def"><b>${i+1}. ${h42Esc(x.k)}</b> — ${h42Esc(h42CleanDef(x.v))}</div>`).join('');
 if(n.length>1){html+='<div class="dict-pos">IDEOGRAMAS ISOLADOS</div>';for(const ch of [...n]){if(!/[\u3400-\u9fff]/.test(ch))continue;html+=`<div class="dict-def"><button class="dict-audio v34-svg-only" data-v34-speak="${h42Esc(ch)}">${h42Svg('sound')}</button> <b>${h42Esc(ch)}</b> <span class="dict-py">${h42Esc(typeof getWordPY==='function'?getWordPY(ch):'')}</span></div>`;}}
 html+=`<div class="dict-src-tag online">${dd.online&&fallbackDef?'Sogou + CC-CEDICT':dd.online?'Sogou online':(fallbackDef?'CC-CEDICT (fallback)':'Sem resposta online agora')}</div></div>`;out.innerHTML=html;try{v34BindAudio(out)}catch{}}
async function h42RenderWords(q,out){const n=[...String(q||'')].filter(ch=>/[\u3400-\u9fff]/.test(ch)).join('');out.innerHTML='<div class="dict-card"><div class="spin sm" style="margin:0 auto"></div></div>';const dd=await h42DictData(n);let words=dd.sugg.filter(x=>x.k&&String(x.k).includes(n)).map(x=>({word:x.k,py:typeof getWordPY==='function'?getWordPY(x.k):'',defs:[h42CleanDef(x.v)],src:'Sogou'}));
 /* v4.8.1: junta MDBG/CC-CEDICT sempre, nao so quando a Sogou volta vazia - ideogramas isolados tem
    mais chance de a Sogou nao formar sugestões, e o MDBG cobre esse buraco. */
 try{if(typeof hr39MdbgWords==='function'){const ex=await hr39MdbgWords(n);const seen=new Set(words.map(w=>w.word));for(const w of ex){if(String(w.word||'').includes(n)&&!seen.has(w.word)){seen.add(w.word);words.push(w);}}}}catch{}
 words=words.slice(0,80);if(!words.length){out.innerHTML='<div class="dict-empty">Nenhuma palavra retornada agora pelas fontes online (Sogou/CC-CEDICT). Tente novamente em alguns segundos.</div>';return;}out.innerHTML='<div class="dict-results-lexi"><div class="dict-subtitle">Palavras que contêm “'+h42Esc(n)+'”</div>'+words.map(w=>`<div class="dict-item"><div class="dict-item-main"><div class="zh">${h42Esc(w.word)}</div><div class="py">${h42Esc(w.py||((typeof getWordPY==='function')?getWordPY(w.word):''))}</div><div class="en">${h42Esc((w.defs||[]).slice(0,3).join('; '))}</div><div class="dict-src-tag">${h42Esc(w.src||'Sogou')}</div></div><button class="dict-audio v34-svg-only" data-v34-speak="${h42Esc(w.word)}">${h42Svg('sound')}</button></div>`).join('')+'</div>';try{v34BindAudio(out)}catch{}}
async function h42RenderSents(q,out){const n=[...String(q||'')].filter(ch=>/[\u3400-\u9fff]/.test(ch)).join('');out.innerHTML='<div class="dict-empty"><div class="spin sm"></div><small>Buscando frases…</small></div>';const dd=await h42DictData(n);const map=new Map();dd.sents.forEach(s=>{if(s.zh&&s.zh.includes(n)&&!map.has(s.zh))map.set(s.zh,s);});try{if(typeof hr39SentenceSearch==='function'){const ex=await hr39SentenceSearch(n);ex.forEach(s=>{if(s.zh&&s.zh.includes(n)&&!map.has(s.zh))map.set(s.zh,{...s,src:s.src||'externa'});});}}catch{}const arr=[...map.values()].slice(0,24);if(!arr.length){out.innerHTML='<div class="dict-empty">Nenhuma frase contendo exatamente este termo foi retornada agora pelas fontes online. Tente novamente em alguns segundos.</div>';return;}out.innerHTML='<div class="dict-results-lexi"><div class="dict-subtitle">Frases com “'+h42Esc(n)+'”</div><div class="online-first">O botão envia a frase inteira para a voz neural.</div>'+arr.map(s=>`<div class="sent-card v37"><div class="sent-top"><div><div class="sent-zh">${h42Esc(s.zh)}</div><div class="sent-py"><b>${h42Esc(s.py||((typeof getWordPY==='function')?getWordPY(s.zh):''))}</b></div></div><button class="dict-audio v34-svg-only" data-v34-speak="${h42Esc(s.zh)}">${h42Svg('sound')}</button></div><div class="sent-tr">${s.en?h42Esc(s.en):'Tradução indisponível nesta fonte.'}</div><div class="sent-src"><b>${h42Esc(s.src||'Sogou')}</b> • contém “${h42Esc(n)}”</div></div>`).join('')+'</div>';try{v34BindAudio(out)}catch{}}
function h42Patch(){window.h42Speak=h42Speak;try{h36Speak=async function(text){return h42Speak(text,h42CjkLen(text)<=1?'char':'compound')};window.h36Speak=h36Speak;window.hr39SpeakWhole=h36Speak;}catch{}try{speakWordMode=async function(word){return h42Speak(word,h42CjkLen(word)<=1?'char':'compound')};speakWord=function(word){return speakWordMode(word,'natural')};}catch{}try{window.v30SpeakSentence=function(key){const d=(window.V30_SENT_AUDIO||{})[key];return h42Speak((d&&d.zh)||key,'sentence')};}catch{}/* v4.8: nao reatribuir mais o onclick de #read-play aqui - o H48 e o unico dono do botao de leitura completa. */try{v29RenderDictDefs=h42RenderDefs;v29RenderDictWords=h42RenderWords;v29RenderDictSentences=h42RenderSents;}catch{}try{const about=document.querySelector('#ss .ssub[style*="color:#8a8a8a"]');if(about)about.textContent=H42_VERSION;}catch{}}
setTimeout(h42Patch,80);setTimeout(h42Patch,700);setTimeout(h42Patch,1600);setTimeout(h42Patch,3200);
})();

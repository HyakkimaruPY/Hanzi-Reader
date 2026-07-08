
(function(){
'use strict';
const H44_VERSION='v4.5-debug-bridge';
function H44_isCjkText(s){return /[\u3400-\u9fff]/.test(String(s||''));}
function H44_normQuery(q){return [...String(q||'')].filter(ch=>/[\u3400-\u9fff]/.test(ch)).join('') || String(q||'').trim();}
function H44_cacheKey(q){return 'h44.sogou.raw.'+H44_normQuery(q);}
function H44_now(){return new Date().toISOString();}
function H44_dbg(kind,title,data,status=''){try{if(typeof h43DebugLog==='function')h43DebugLog(kind,title,data,status);;}catch(e){}}
function H44_copy(txt){try{if(typeof h43DebugCopy==='function')return h43DebugCopy(txt);navigator.clipboard.writeText(String(txt||''));}catch(e){}}
function H44_parseData(data,q){
  const sugg=(typeof h42DeepSugg==='function'?h42DeepSugg(data,[]):[]);
  const sents=(typeof h42DeepSents==='function'?h42DeepSents(data,H44_normQuery(q),[]):[]);
  return {query:H44_normQuery(q),sugg,sents,rootKeys:data&&typeof data==='object'?Object.keys(data):[],data};
}
function H44_getCachedSogou(q){
  q=H44_normQuery(q); if(!q) return null;
  try{const raw=localStorage.getItem(H44_cacheKey(q)); if(!raw)return null; const box=JSON.parse(raw); if(!box||!box.data)return null; H44_dbg('sogou.cache','usando resposta Sogou colada/cached',{query:q,savedAt:box.savedAt,parsed:H44_parseData(box.data,q)},'ok'); return box.data;}catch(e){H44_dbg('sogou.cache','cache inválido',{query:q,error:e.message},'error');return null;}
}
function H44_storeSogou(q,data,source='manual-paste'){
  q=H44_normQuery(q); if(!q||!data)return false;
  try{localStorage.setItem(H44_cacheKey(q),JSON.stringify({query:q,source,savedAt:H44_now(),data}));H44_dbg('sogou.cache','resposta Sogou salva no HTML local',{query:q,source,parsed:H44_parseData(data,q)},'ok');return true;}catch(e){H44_dbg('sogou.cache','falha ao salvar cache',{query:q,error:e.message},'error');return false;}
}
window.H44_storeSogou=H44_storeSogou;
window.H44_getCachedSogou=H44_getCachedSogou;
function H44_openDebug(){try{const p=document.getElementById('h43-debug-panel'); if(p&&!p.classList.contains('open')){p.classList.add('open');localStorage.setItem('h43DebugOpen','1');}}catch(e){}}
function H44_renderCurrentDict(){try{if(typeof v29RenderDictCurrent==='function')v29RenderDictCurrent(true);}catch(e){H44_dbg('manual.render','não consegui rerenderizar dicionário',{error:e.message},'error');}}
function H44_installManualParser(){
  const old=window.h43DebugParsePaste || (typeof h43DebugParsePaste==='function'?h43DebugParsePaste:null);
  window.h43DebugParsePaste=function(){
    const ta=document.getElementById('h43-debug-paste');
    const q=(document.getElementById('dict-q')?.value||window.v29DictTerm||'').trim();
    try{
      const raw=(ta&&ta.value||'').trim();
      const data=JSON.parse(raw);
      const parsed=H44_parseData(data,q);
      if(ta){ta.dataset.lastParse=JSON.stringify(parsed,null,2);}      
      H44_storeSogou(q,data,'debug-paste');
      H44_dbg('manual.parse','JSON colado parseado e aplicado ao dicionário',parsed,'ok');
      H44_renderCurrentDict();
    }catch(e){
      H44_dbg('manual.parse','Erro ao parsear JSON colado',{error:e.message,raw:(ta&&ta.value||'').slice(0,2000)},'error');
      if(old)try{old();}catch{}
    }
  };
  try{const btn=document.getElementById('h43-debug-parse-paste'); if(btn)btn.onclick=window.h43DebugParsePaste;}catch(e){}
}
function H44_sogouForm(q){return 'from=auto&to=en&client=wap&text='+encodeURIComponent(H44_normQuery(q))+'&uuid=null&pid=sogou-dict-vr&addSugg=on';}
async function H44_sogouFetch(q){
  q=H44_normQuery(q); if(!q)return null;
  const cached=H44_getCachedSogou(q); if(cached)return cached;
  const form=H44_sogouForm(q);
  const headers={'accept':'application/json','accept-language':'zh-CN','content-type':'application/x-www-form-urlencoded'};
  const directUrl='https://fanyi.sogou.com/reventondc/suggV3';
  const isHttp=location.protocol==='http:'||location.protocol==='https:';
  H44_dbg('sogou.prepare','payload preparada v4.5',{query:q,directUrl,method:'POST',headers,body:form,backendAvailable:isHttp,protocol:location.protocol},'');
  if(isHttp){
    try{
      const payload={text:q,rawBody:form};
      H44_dbg('sogou.backend','request /api/sogou',{url:'/api/sogou',method:'POST',payload});
      const r=await fetch('/api/sogou',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const raw=await r.text();
      H44_dbg('sogou.backend','response /api/sogou',{status:r.status,ok:r.ok,headers:Object.fromEntries([...r.headers.entries()].slice(0,50)),raw:String(raw).slice(0,18000)},r.ok?'ok':'error');
      if(r.ok){const data=JSON.parse(raw);H44_storeSogou(q,data,'vercel-backend');return data;}
    }catch(e){H44_dbg('sogou.backend','backend indisponível ou retornou inválido',{error:e.message||String(e)},'error');}
  }
  // Em arquivo local/content://, a Sogou pode aparecer como 200 OK no Network, mas sem Access-Control-Allow-Origin.
  // O JS não consegue ler esse corpo. A tentativa abaixo fica só para registrar exatamente o bloqueio.
  try{
    H44_dbg('sogou.direct','request direta Sogou',{url:directUrl,method:'POST',headers,body:form});
    const r=await fetch(directUrl,{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',headers,body:form});
    const raw=await r.text();
    H44_dbg('sogou.direct','response direta Sogou legível',{status:r.status,ok:r.ok,headers:Object.fromEntries([...r.headers.entries()].slice(0,50)),raw:String(raw).slice(0,18000)},r.ok?'ok':'error');
    if(r.ok){const data=JSON.parse(raw);H44_storeSogou(q,data,'direct-cors-readable');return data;}
  }catch(e){
    H44_dbg('sogou.direct','CORS/fetch direto bloqueado no HTML local',{error:e.message||String(e),query:q,body:form,whatToDo:'Abra o painel DBG, copie a resposta bruta do Network > suggV3 > Preview/Response, cole no campo manual e clique em Parsear JSON colado. A partir daí o HTML usa esse JSON e salva no cache local.'},'error');
    H44_openDebug();
  }
  return H44_getCachedSogou(q);
}
try{window.h42SogouFetch=H44_sogouFetch; if(typeof h42SogouFetch!=='undefined')h42SogouFetch=H44_sogouFetch;}catch(e){window.h42SogouFetch=H44_sogouFetch;}
function H44_installTtsLabParity(){
  // Pequenos ajustes para ficar ainda mais próximo do laboratório TTS enviado.
  try{
    if(typeof h42Endpoint==='function'){
      const oldEndpoint=h42Endpoint;
      window.h42Endpoint=async function(){
        H44_dbg('edge.endpoint.v44','usando fluxo Edge TTS do laboratório',{note:'MSTranslatorAndroidApp + dev.microsofttranslator.com/apps/endpoint + SSML cognitiveservices/v1'});
        return oldEndpoint();
      };
      try{h42Endpoint=window.h42Endpoint;}catch{}
    }
  }catch(e){H44_dbg('edge.patch','falha ao instalar wrapper Edge',{error:e.message},'error');}
}
function H44_boot(){H44_installManualParser();H44_installTtsLabParity();try{const about=document.querySelector('#ss .ssub[style*="color:#8a8a8a"]');if(about)about.textContent=H44_VERSION;}catch{}H44_dbg('v44.boot','patch de debug/manual Sogou carregado',{version:H44_VERSION,protocol:location.protocol},'ok');}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',H44_boot);else setTimeout(H44_boot,50);
setTimeout(H44_boot,800);
})();

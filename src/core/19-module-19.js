
(function(){
'use strict';
const H45_VERSION='v4.5-public-proxy';
function H45_dbg(kind,title,data,status){try{(window.H44_dbg||window.h43DebugLog||function(){})(kind,title,data,status||'');}catch(e){}}
function H45_normQuery(q){try{return (window.H44_normQuery?window.H44_normQuery(q):String(q||'').replace(/[^\u3400-\u9fff]/g,'')).trim();}catch{return String(q||'').trim();}}
function H45_form(q){try{return (window.H44_sogouForm?window.H44_sogouForm(q):'from=auto&to=en&client=wap&text='+encodeURIComponent(H45_normQuery(q))+'&uuid=null&pid=sogou-dict-vr&addSugg=on');}catch{return 'from=auto&to=en&client=wap&text='+encodeURIComponent(H45_normQuery(q))+'&uuid=null&pid=sogou-dict-vr&addSugg=on';}}
function H45_cache(q){try{return window.H44_getCachedSogou?window.H44_getCachedSogou(q):null;}catch{return null;}}
function H45_store(q,data,source){try{return window.H44_storeSogou?window.H44_storeSogou(q,data,source):false;}catch{return false;}}
function H45_headersObj(h){try{return Object.fromEntries(Array.from(h.entries()).slice(0,60));}catch{return {};}}
function H45_trimRaw(raw,max=22000){raw=String(raw??'');return raw.length>max?raw.slice(0,max)+'\n…[cortado '+(raw.length-max)+' chars]':raw;}
function H45_parseJsonish(raw){
  if(raw==null)throw new Error('resposta vazia');
  let txt=String(raw).replace(/^\uFEFF/,'').trim();
  if(!txt)throw new Error('resposta vazia');
  try{return JSON.parse(txt);}catch(e){}
  try{const wrap=JSON.parse(txt); if(wrap&&typeof wrap.contents==='string')return H45_parseJsonish(wrap.contents); if(wrap&&typeof wrap.data==='string')return H45_parseJsonish(wrap.data);}catch(e){}
  const a=txt.indexOf('{'), b=txt.lastIndexOf('}');
  if(a>=0&&b>a){try{return JSON.parse(txt.slice(a,b+1));}catch(e){}}
  throw new Error('não consegui parsear JSON: '+txt.slice(0,160));
}
const H45_PROXIES=[
  {id:'corsproxy.io',url:u=>'https://corsproxy.io/?'+encodeURIComponent(u),body:true},
  {id:'thingproxy.freeboard.io',url:u=>'https://thingproxy.freeboard.io/fetch/'+u,body:true},
  {id:'cors.isomorphic-git.org',url:u=>'https://cors.isomorphic-git.org/'+u,body:true},
  {id:'cors-anywhere.herokuapp.com',url:u=>'https://cors-anywhere.herokuapp.com/'+u,body:true},
  {id:'api.codetabs.com',url:u=>'https://api.codetabs.com/v1/proxy?quest='+encodeURIComponent(u),body:true},
  {id:'cors.eu.org',url:u=>'https://cors.eu.org/'+u,body:true},
  {id:'corsproxy.fly.dev',url:u=>'https://corsproxy.fly.dev/'+u,body:true}
];
function H45_customProxies(){
  try{
    const raw=localStorage.getItem('h45.publicProxies');
    if(!raw)return [];
    const arr=JSON.parse(raw);
    if(!Array.isArray(arr))return [];
    return arr.filter(Boolean).map((base,i)=>({id:'custom-'+(i+1),url:u=>String(base).replace('{url}',encodeURIComponent(u)).replace('{raw}',u),body:true,custom:true}));
  }catch(e){H45_dbg('sogou.proxy.custom','lista custom inválida',{error:e.message},'error');return [];}
}
async function H45_fetchWithTimeout(url,init,ms){
  const ctl=new AbortController();
  const t=setTimeout(()=>{try{ctl.abort('timeout')}catch{}},ms||9000);
  try{return await fetch(url,{...init,signal:ctl.signal});}
  finally{clearTimeout(t);}
}
async function H45_tryProxy(proxy,targetUrl,form,q){
  const proxyUrl=proxy.url(targetUrl,form,q);
  const init={method:'POST',mode:'cors',credentials:'omit',cache:'no-store',headers:{'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json,text/plain,*/*'},body:form};
  H45_dbg('sogou.proxy','request via proxy público',{proxy:proxy.id,proxyUrl,targetUrl,method:'POST',body:form,custom:!!proxy.custom},'');
  const r=await H45_fetchWithTimeout(proxyUrl,init,11000);
  const raw=await r.text();
  H45_dbg('sogou.proxy','response via proxy público',{proxy:proxy.id,status:r.status,ok:r.ok,headers:H45_headersObj(r.headers),raw:H45_trimRaw(raw)},r.ok?'ok':'error');
  if(!r.ok)throw new Error(proxy.id+' HTTP '+r.status);
  const data=H45_parseJsonish(raw);
  return data;
}
async function H45_sogouFetch(q){
  q=H45_normQuery(q); if(!q)return null;
  const cached=H45_cache(q); if(cached)return cached;
  const form=H45_form(q);
  const headers={'accept':'application/json','accept-language':'zh-CN','content-type':'application/x-www-form-urlencoded'};
  const directUrl='https://fanyi.sogou.com/reventondc/suggV3';
  const isHttp=location.protocol==='http:'||location.protocol==='https:';
  H45_dbg('sogou.prepare','payload preparada v4.5 + proxies públicos',{query:q,directUrl,method:'POST',headers,body:form,backendAvailable:isHttp,protocol:location.protocol,proxyCount:H45_PROXIES.length,customProxyHint:'opcional: localStorage.h45.publicProxies = JSON array. Use {url} para URL codificada ou {raw} para URL crua.'},'');
  if(isHttp){
    try{
      const payload={text:q,rawBody:form};
      H45_dbg('sogou.backend','request /api/sogou',{url:'/api/sogou',method:'POST',payload},'');
      const r=await H45_fetchWithTimeout('/api/sogou',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)},9000);
      const raw=await r.text();
      H45_dbg('sogou.backend','response /api/sogou',{status:r.status,ok:r.ok,headers:H45_headersObj(r.headers),raw:H45_trimRaw(raw)},r.ok?'ok':'error');
      if(r.ok){const data=H45_parseJsonish(raw);H45_store(q,data,'vercel-backend');return data;}
    }catch(e){H45_dbg('sogou.backend','backend não respondeu/indisponível',{error:e.message||String(e)},'error');}
  }
  try{
    H45_dbg('sogou.direct','request direta Sogou',{url:directUrl,method:'POST',headers,body:form},'');
    const r=await H45_fetchWithTimeout(directUrl,{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',headers,body:form},6000);
    const raw=await r.text();
    H45_dbg('sogou.direct','response direta Sogou legível',{status:r.status,ok:r.ok,headers:H45_headersObj(r.headers),raw:H45_trimRaw(raw)},r.ok?'ok':'error');
    if(r.ok){const data=H45_parseJsonish(raw);H45_store(q,data,'direct-cors-readable');return data;}
  }catch(e){H45_dbg('sogou.direct','CORS/fetch direto bloqueado; iniciando proxies públicos',{error:e.message||String(e),query:q,body:form},'error');}
  const proxies=H45_customProxies().concat(H45_PROXIES);
  const failures=[];
  for(const proxy of proxies){
    try{
      const data=await H45_tryProxy(proxy,directUrl,form,q);
      H45_store(q,data,'public-proxy:'+proxy.id);
      H45_dbg('sogou.proxy','proxy público funcionou e foi salvo no cache',{proxy:proxy.id,query:q},'ok');
      return data;
    }catch(e){
      failures.push({proxy:proxy.id,error:e.message||String(e)});
      H45_dbg('sogou.proxy','proxy público falhou',{proxy:proxy.id,error:e.message||String(e)},'error');
    }
  }
  H45_dbg('sogou.proxy','todos os proxies falharam; use o campo manual DBG ou adicione proxies customizados',{query:q,failures,customProxyExample:['https://SEU_PROXY/?{url}','https://SEU_PROXY/{raw}']},'error');
  try{if(window.H44_openDebug)window.H44_openDebug();}catch{}
  return H45_cache(q);
}
window.H45_sogouFetch=H45_sogouFetch;
try{window.h42SogouFetch=H45_sogouFetch;if(typeof h42SogouFetch!=='undefined')h42SogouFetch=H45_sogouFetch;}catch(e){window.h42SogouFetch=H45_sogouFetch;}
try{window.H44_sogouFetch=H45_sogouFetch;if(typeof H44_sogouFetch!=='undefined')H44_sogouFetch=H45_sogouFetch;}catch(e){}
function H45_boot(){H45_dbg('v45.boot','patch de proxies públicos Sogou carregado',{version:H45_VERSION,protocol:location.protocol,proxies:H45_PROXIES.map(p=>p.id)},'ok');try{const about=document.querySelector('#ss .ssub[style*="color:#8a8a8a"]');if(about)about.textContent=H45_VERSION;}catch{}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',H45_boot);else setTimeout(H45_boot,80);
})();

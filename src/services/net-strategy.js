/* Service Layer · Estratégia de rede: direto primeiro, proxy só como contingência.
 * window.hzFetchSmart(url, opts) -> Response
 * 1) tenta fetch direto; 2) em falha (CORS/rede/HTTP), tenta /api/proxy;
 * registra a estratégia vencedora por host (localStorage) para acelerar próximas chamadas. */
(function(){
'use strict';
const KEY='hzNetStrategy';
function readMap(){try{return JSON.parse(localStorage.getItem(KEY)||'{}');}catch(e){return{};}}
function saveMap(m){try{localStorage.setItem(KEY,JSON.stringify(m));}catch(e){}}
function hostOf(u){try{return new URL(u,location.href).host;}catch(e){return String(u);}}
async function direct(url,opts){const r=await fetch(url,opts);if(!r.ok&&r.type!=='opaque')throw new Error('HTTP '+r.status);return r;}
async function viaProxy(url,opts){
  const r=await fetch('/api/proxy?url='+encodeURIComponent(url),Object.assign({},opts,{headers:Object.assign({},(opts&&opts.headers)||{},{'x-hz-app':'1'})}));
  if(!r.ok)throw new Error('proxy HTTP '+r.status);return r;
}
window.hzFetchSmart=async function(url,opts){
  const map=readMap(),h=hostOf(url);
  const order=map[h]==='proxy'?[viaProxy,direct]:[direct,viaProxy];
  let lastErr;
  for(const fn of order){
    try{const r=await fn(url,opts);map[h]=(fn===direct)?'direct':'proxy';saveMap(map);return r;}
    catch(e){lastErr=e;}
  }
  throw lastErr||new Error('network failed');
};
})();

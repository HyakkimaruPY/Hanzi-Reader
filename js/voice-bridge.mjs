
/* Voz: API-first. A autenticação Microsoft fica apenas em /api/tts-edge.js. */
(function(){
'use strict';
function ttsSettingsFallback(){try{return (window.H46_getSettings&&window.H46_getSettings())||(window.h42Settings&&window.h42Settings())||{};}catch{return{};}}
window.hzSpeakSsmlViaApi = async function(ssml, settings){ return window.hzTtsEdgeApiBlob(ssml, settings||ttsSettingsFallback()); };
function patchName(name){
  const fn=window[name];
  if(typeof fn!=='function' || fn.__hzApiFirst)return false;
  const wrapped=async function(ssml, settings){ return window.hzTtsEdgeApiBlob(ssml, settings||ttsSettingsFallback()); };
  wrapped.__hzApiFirst=true; wrapped.__hzOrig=fn; window[name]=wrapped; return true;
}
patchName('h42AudioFromSsml');patchName('H46_audioFromSsml');
})();

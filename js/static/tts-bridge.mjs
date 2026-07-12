/* ===== Hanzi Reader: TTS bridge client helper ===== */
export function setupTtsBridge(){
'use strict';
window.HZ_TTS_API_ROUTE = window.HZ_TTS_API_ROUTE || '/api/tts-edge';
window.hzTtsEdgeApiBlob = async function hzTtsEdgeApiBlob(ssml, settings){
  settings = settings || {};
  const outputFormat = settings.outputFormat || settings.format || settings.quality || settings.ttsQuality || 'audio-24khz-48kbitrate-mono-mp3';
  const payload = { ssml: String(ssml || ''), outputFormat, format: outputFormat };
  const r = await fetch(window.HZ_TTS_API_ROUTE, {
    method: 'POST',
    headers: {'Content-Type':'application/json','X-Hanzi-Reader':'1'},
    body: JSON.stringify(payload)
  });
  if(!r.ok){
    let detail='';
    try{ const j=await r.json(); detail = (j.step?('step: '+j.step+' | '):'') + (j.error || JSON.stringify(j)); }
    catch(e){ try{ detail = await r.text(); }catch(_){} }
    throw new Error('Serviço de voz: '+r.status+(detail?' — '+detail:''));
  }
  const blob = await r.blob();
  if(!blob || blob.size < 100) throw new Error('Serviço de voz retornou áudio vazio.');
  return blob;
};
}


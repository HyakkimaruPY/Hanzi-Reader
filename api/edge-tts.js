const crypto = require('crypto');

const SECRET = 'oik6PdDdMnOXemTbwvMn9de/h9lFnfBaCWbGMMZqqoSaQaqUOqjVGm5NqsmjcBI1x+sS9ugjB55HEJWRiFXYFw==';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0';
let cache = { endpoint:null, exp:0 };

function uuid(){ return crypto.randomUUID().replace(/-/g,''); }
function date(){ return new Date().toUTCString().replace(/GMT/,'').trim().toLowerCase()+' gmt'; }
function sign(urlStr){
  const u = urlStr.split('://')[1];
  const encodedUrl = encodeURIComponent(u);
  const id = uuid();
  const d = date();
  const bytesToSign = `MSTranslatorAndroidApp${encodedUrl}${d}${id}`.toLowerCase();
  const sig = crypto.createHmac('sha256', Buffer.from(SECRET,'base64')).update(bytesToSign).digest('base64');
  return `MSTranslatorAndroidApp::${sig}::${d}::${id}`;
}
function xml(s){ return String(s ?? '').replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c])); }
function signed(n,suffix){ n = Number(n)||0; return (n>=0?'+':'')+n+suffix; }
function rate(speed){ return signed(Math.trunc((Number(speed||1)-1)*100),'%'); }
function pitch(v){ return signed(parseInt(v||0,10),'Hz'); }
function volume(v){ return signed(Math.round(Number(v||0)*100),'%'); }
function stripSsml(ssml){ return String(ssml||'').replace(/<break\b[^>]*>/gi,'。').replace(/<[^>]+>/g,'').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim(); }
function buildSsml(text,o={}){
  const voice = o.voice || o.classicVoice || 'zh-CN-XiaoxiaoNeural';
  const lang = voice.split('-').slice(0,2).join('-') || 'zh-CN';
  const style = o.style && o.style !== 'general' ? o.style : '';
  const degree = o.degree || 1.35;
  const role = o.role || '';
  const attrs = [];
  if(style) attrs.push(`style="${xml(style)}"`, `styledegree="${xml(degree)}"`);
  if(role) attrs.push(`role="${xml(role)}"`);
  const prosody = `<prosody rate="${xml(rate(o.speed))}" pitch="${xml(pitch(o.pitch))}" volume="${xml(volume(o.volume))}">${xml(text)}</prosody>`;
  const body = attrs.length ? `<mstts:express-as ${attrs.join(' ')}>${prosody}</mstts:express-as>` : prosody;
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${xml(lang)}"><voice name="${xml(voice)}">${body}</voice></speak>`;
}
async function endpoint(){
  const now = Math.floor(Date.now()/1000);
  if(cache.endpoint && now < cache.exp - 180) return cache.endpoint;
  const url = 'https://dev.microsofttranslator.com/apps/endpoint?api-version=1.0';
  const r = await fetch(url, { method:'POST', headers:{
    'Accept-Language':'zh-Hans',
    'X-ClientVersion':'4.0.530a 5fe1dc6c',
    'X-UserId':'0f04d16a175c411e',
    'X-HomeGeographicRegion':'zh-Hans-CN',
    'X-ClientTraceId':uuid(),
    'X-MT-Signature':sign(url),
    'User-Agent':UA,
    'Content-Type':'application/json; charset=utf-8'
  }, body:'' });
  const raw = await r.text();
  if(!r.ok) throw Object.assign(new Error(`endpoint ${r.status}: ${raw.slice(0,500)}`), { status:r.status });
  const data = JSON.parse(raw);
  let exp = now + 540;
  try { exp = JSON.parse(Buffer.from(data.t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString()).exp || exp; } catch {}
  cache = { endpoint:data, exp };
  return data;
}
async function googleTtsFallback(text){
  text = String(text||'').replace(/\s+/g,'').trim();
  if(!text) throw new Error('texto vazio para fallback');
  if([...text].length > 180) throw Object.assign(new Error('fallback curto indisponível para texto longo'), { status:502 });
  const url = 'https://translate.google.com/translate_tts?ie=UTF-8&tl=zh-CN&client=tw-ob&q=' + encodeURIComponent(text);
  const r = await fetch(url, { headers:{ 'User-Agent': UA, 'Accept':'audio/mpeg,*/*' } });
  const ab = await r.arrayBuffer();
  const buf = Buffer.from(ab);
  if(!r.ok || !buf.length) throw Object.assign(new Error('google tts fallback '+r.status), { status:r.status || 502 });
  return { buf, contentType:'audio/mpeg', fallback:true };
}
async function ttsBuffer(payload){
  const text = String(payload.text || '').trim().slice(0, 4800);
  const ssml = String(payload.ssml || '').trim();
  if(!text && !ssml) throw new Error('texto/ssml vazio');
  const output = payload.format || payload.quality || 'audio-24khz-48kbitrate-mono-mp3';
  const plain = text || stripSsml(ssml);
  try{
    const ep = await endpoint();
    const url = `https://${ep.r}.tts.speech.microsoft.com/cognitiveservices/v1`;
    const body = ssml || buildSsml(text,payload);
    const r = await fetch(url, { method:'POST', headers:{
      'Authorization':ep.t,
      'Content-Type':'application/ssml+xml',
      'User-Agent':UA,
      'X-Microsoft-OutputFormat':output
    }, body });
    const ab = await r.arrayBuffer();
    const buf = Buffer.from(ab);
    if(!r.ok) throw Object.assign(new Error(buf.toString('utf8').slice(0,1000) || `tts ${r.status}`), { status:r.status });
    return { buf, contentType: output.includes('ogg') ? 'audio/ogg' : output.includes('webm') ? 'audio/webm' : 'audio/mpeg' };
  }catch(e){
    // Mantém a experiência utilizável em trechos curtos quando o endpoint Edge bloqueia com 401001.
    try { return await googleTtsFallback(plain); }
    catch(fb){ throw Object.assign(new Error((e.message||String(e)) + ' | fallback: ' + (fb.message||String(fb))), { status:e.status || fb.status || 502 }); }
  }
}
module.exports = async function handler(req,res){
  try{
    if(req.method === 'OPTIONS'){
      res.setHeader('access-control-allow-methods','GET,POST,OPTIONS');
      res.setHeader('access-control-allow-headers','content-type,x-hz-app');
      return res.status(204).end();
    }
    if(req.method === 'GET' && req.query && req.query.health){ return res.status(200).json({ok:true, route:req.url}); }
    if(req.method !== 'POST') return res.status(405).json({error:'method not allowed'});
    const payload = typeof req.body === 'object' && req.body ? req.body : JSON.parse(req.body || '{}');
    const {buf, contentType, fallback} = await ttsBuffer(payload);
    res.setHeader('content-type', contentType);
    res.setHeader('cache-control','no-store');
    if(fallback) res.setHeader('x-hz-tts-fallback','google-translate-tts');
    return res.status(200).send(buf);
  }catch(e){
    const status = e.status || 500;
    return res.status(status).json({error:{code:status, message:e.message || String(e)}});
  }
};

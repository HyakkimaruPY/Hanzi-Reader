const crypto = require('crypto');

// Ponte server-side para testar o mesmo fluxo Edge/Microsoft TTS fora do navegador.
// A ideia é tirar do front-end o endpoint/token/assinatura e deixar o HTML chamar apenas /api/tts-edge.

const TOKEN_REFRESH_BEFORE_EXPIRY = 3 * 60;
const EDGE_SECRET_B64 = 'oik6PdDdMnOXemTbwvMn9de/h9lFnfBaCWbGMMZqqoSaQaqUOqjVGm5NqsmjcBI1x+sS9ugjB55HEJWRiFXYFw==';
let tokenInfo = { endpoint: null, expiredAt: 0 };

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function shortText(value, max = 2000) {
  const text = String(value || '');
  return text.length > max ? text.slice(0, max) + `...[cortado ${text.length - max} chars]` : text;
}

function makeUuidHex() {
  if (crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '');
  return crypto.randomBytes(16).toString('hex');
}

function dateFormat() {
  return new Date().toUTCString().replace(/GMT/, '').trim().toLowerCase() + ' gmt';
}

function signTtsEndpoint(urlStr) {
  const url = urlStr.split('://')[1];
  const encodedUrl = encodeURIComponent(url);
  const uuidStr = makeUuidHex();
  const formattedDate = dateFormat();
  const bytesToSign = `MSTranslatorAndroidApp${encodedUrl}${formattedDate}${uuidStr}`.toLowerCase();
  const signature = crypto
    .createHmac('sha256', Buffer.from(EDGE_SECRET_B64, 'base64'))
    .update(bytesToSign, 'utf8')
    .digest('base64');
  return `MSTranslatorAndroidApp::${signature}::${formattedDate}::${uuidStr}`;
}

function decodeJwtExp(token) {
  try {
    const payload = String(token || '').split('.')[1];
    if (!payload) return Math.floor(Date.now() / 1000) + 540;
    const fixed = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(fixed, 'base64').toString('utf8')).exp || Math.floor(Date.now() / 1000) + 540;
  } catch {
    return Math.floor(Date.now() / 1000) + 540;
  }
}

async function getRawBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString('utf8') || '{}');

  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

async function getTtsEndpoint() {
  const now = Date.now() / 1000;
  if (tokenInfo.endpoint && tokenInfo.expiredAt && now < tokenInfo.expiredAt - TOKEN_REFRESH_BEFORE_EXPIRY) {
    return tokenInfo.endpoint;
  }

  const endpointUrl = 'https://dev.microsofttranslator.com/apps/endpoint?api-version=1.0';
  const clientId = makeUuidHex();
  const signature = signTtsEndpoint(endpointUrl);

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      'Accept-Language': 'zh-Hans',
      'X-ClientVersion': '4.0.530a 5fe1dc6c',
      'X-UserId': '0f04d16a175c411e',
      'X-HomeGeographicRegion': 'zh-Hans-CN',
      'X-ClientTraceId': clientId,
      'X-MT-Signature': signature,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0',
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': '0',
      'Accept-Encoding': 'gzip'
    },
    body: ''
  });

  const raw = await response.text();
  if (!response.ok) {
    const err = new Error('Falha ao obter endpoint: ' + response.status + ' — ' + shortText(raw));
    err.step = 'endpoint';
    err.status = response.status;
    err.body = raw;
    throw err;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    const err = new Error('Endpoint retornou JSON inválido: ' + e.message + ' — ' + shortText(raw));
    err.step = 'endpoint-json';
    err.status = 502;
    throw err;
  }

  tokenInfo = { endpoint: data, expiredAt: decodeJwtExp(data.t) };
  return data;
}

function contentTypeFromFormat(format) {
  const f = String(format || '').toLowerCase();
  if (f.includes('webm')) return 'audio/webm';
  if (f.includes('ogg') || f.includes('opus')) return 'audio/ogg';
  return 'audio/mpeg';
}

async function synthesize(ssml, outputFormat) {
  const endpoint = await getTtsEndpoint();
  const region = endpoint.r;
  const token = endpoint.t;
  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': token,
      'Content-Type': 'application/ssml+xml',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0',
      'X-Microsoft-OutputFormat': outputFormat || 'audio-48khz-192kbitrate-mono-mp3'
    },
    body: ssml
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  if (!response.ok) {
    const err = new Error('Microsoft TTS API: ' + response.status + ' — ' + shortText(buffer.toString('utf8')));
    err.step = 'tts';
    err.status = response.status;
    err.region = region;
    err.body = buffer.toString('utf8');
    throw err;
  }

  return { buffer, region };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'POST') {
    return json(res, 405, { ok: false, error: 'Use POST.' });
  }

  let payload;
  try {
    payload = await getRawBody(req);
  } catch (e) {
    return json(res, 400, { ok: false, step: 'body', error: 'JSON inválido: ' + e.message });
  }

  const ssml = String(payload.ssml || '').trim();
  const outputFormat = String(payload.outputFormat || payload.format || 'audio-48khz-192kbitrate-mono-mp3');

  if (!ssml) return json(res, 400, { ok: false, step: 'input', error: 'SSML vazio.' });
  if (ssml.length > 12000) return json(res, 413, { ok: false, step: 'input', error: 'SSML grande demais.', chars: ssml.length });

  try {
    const { buffer, region } = await synthesize(ssml, outputFormat);
    res.statusCode = 200;
    res.setHeader('Content-Type', contentTypeFromFormat(outputFormat));
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-TTS-Bridge', 'edge-serverless');
    res.setHeader('X-TTS-Region', region || 'unknown');
    res.end(buffer);
  } catch (e) {
    return json(res, e.status || 502, {
      ok: false,
      step: e.step || 'unknown',
      status: e.status || 502,
      region: e.region || null,
      error: e.message || String(e),
      body: shortText(e.body || '')
    });
  }
};

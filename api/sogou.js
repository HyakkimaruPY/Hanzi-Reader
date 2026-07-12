'use strict';

const UPSTREAM = 'https://fanyi.sogou.com/reventondc/suggV3';
const MAX_TEXT = 64;

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function clean(value) {
  return String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, MAX_TEXT);
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 16384) throw new Error('payload muito grande');
  }
  return raw ? JSON.parse(raw) : {};
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Use POST.' });
  try {
    const body = await readBody(req);
    const text = clean(body.text);
    if (!text) return send(res, 400, { ok: false, error: 'Informe text.' });
    const form = typeof body.rawBody === 'string' && body.rawBody.includes('text=')
      ? body.rawBody
      : new URLSearchParams({ from: 'auto', to: 'en', client: 'wap', text, uuid: 'null', pid: 'sogou-dict-vr', addSugg: 'on' }).toString();
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    try {
      const upstream = await fetch(UPSTREAM, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Accept': 'application/json, text/plain, */*',
          'Origin': 'https://fanyi.sogou.com',
          'Referer': 'https://fanyi.sogou.com/'
        },
        body: form,
        signal: ctl.signal
      });
      const raw = await upstream.text();
      if (!upstream.ok) return send(res, upstream.status, { ok: false, error: `Sogou HTTP ${upstream.status}` });
      let data;
      try { data = JSON.parse(raw); } catch { return send(res, 502, { ok: false, error: 'Resposta inválida da Sogou.' }); }
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
      return send(res, 200, data);
    } finally { clearTimeout(timer); }
  } catch (error) {
    return send(res, 502, { ok: false, error: error?.name === 'AbortError' ? 'Timeout da fonte Sogou.' : 'Fonte Sogou indisponível.' });
  }
};

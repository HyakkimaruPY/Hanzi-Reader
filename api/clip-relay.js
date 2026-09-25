'use strict';

const { Readable } = require('stream');

const SERVICE = 'hanzi-reader-clip-relay-v1';
const ALLOWED_HOSTS = new Set(['metaproo.site']);
const ALLOWED_PREFIXES = ['/movie/'];
const EXPOSE_HEADERS = [
  'Accept-Ranges',
  'Content-Length',
  'Content-Range',
  'Content-Type',
  'ETag',
  'Last-Modified',
  'X-Clip-Relay'
].join(', ');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Accept');
  res.setHeader('Access-Control-Expose-Headers', EXPOSE_HEADERS);
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
}

function sendJson(res, status, payload) {
  setCors(res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function parseTarget(raw) {
  let url;
  try {
    url = new URL(String(raw || ''));
  } catch {
    throw Object.assign(new Error('URL de mídia inválida.'), { status: 400, code: 'INVALID_URL' });
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw Object.assign(new Error('Protocolo não permitido.'), { status: 400, code: 'INVALID_PROTOCOL' });
  }

  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!ALLOWED_HOSTS.has(host)) {
    throw Object.assign(new Error('Host não permitido pelo relay.'), { status: 403, code: 'HOST_NOT_ALLOWED' });
  }

  if (!ALLOWED_PREFIXES.some(prefix => url.pathname.startsWith(prefix))) {
    throw Object.assign(new Error('Rota de mídia não permitida.'), { status: 403, code: 'PATH_NOT_ALLOWED' });
  }

  return url;
}

async function fetchUpstream(initialUrl, req, maxRedirects = 2) {
  let current = initialUrl;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const headers = {
      'Accept': req.headers.accept || '*/*',
      'Accept-Encoding': 'identity',
      'User-Agent': 'Mozilla/5.0 ClipEngineRelay/1.0'
    };

    const range = String(req.headers.range || '').trim();
    if (range) headers.Range = range;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    let response;
    try {
      response = await fetch(current, {
        method: req.method === 'HEAD' ? 'HEAD' : 'GET',
        headers,
        redirect: 'manual',
        cache: 'no-store',
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return { response, finalUrl: current };
    }

    const location = response.headers.get('location');
    if (!location || hop === maxRedirects) return { response, finalUrl: current };

    const next = new URL(location, current);
    const nextHost = next.hostname.toLowerCase().replace(/\.$/, '');
    if (!ALLOWED_HOSTS.has(nextHost)) {
      throw Object.assign(new Error('Redirect para host não permitido.'), {
        status: 502,
        code: 'REDIRECT_HOST_NOT_ALLOWED'
      });
    }
    current = next;
  }

  throw Object.assign(new Error('Redirecionamentos excedidos.'), { status: 502, code: 'REDIRECT_LIMIT' });
}

function copyHeader(from, res, name) {
  const value = from.headers.get(name);
  if (value !== null && value !== '') res.setHeader(name, value);
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (!['GET', 'HEAD'].includes(req.method)) {
    return sendJson(res, 405, { ok: false, service: SERVICE, error: 'Use GET ou HEAD.' });
  }

  const rawTarget = Array.isArray(req.query?.url) ? req.query.url[0] : req.query?.url;
  if (!rawTarget) {
    return sendJson(res, 200, {
      ok: true,
      service: SERVICE,
      allowedHosts: [...ALLOWED_HOSTS],
      allowedPrefixes: ALLOWED_PREFIXES,
      range: true,
      cors: true,
      streaming: true
    });
  }

  let target;
  try {
    target = parseTarget(rawTarget);
  } catch (error) {
    return sendJson(res, error.status || 400, {
      ok: false,
      service: SERVICE,
      code: error.code || 'INVALID_TARGET',
      error: error.message
    });
  }

  try {
    const { response } = await fetchUpstream(target, req);

    res.statusCode = response.status;
    res.setHeader('X-Clip-Relay', SERVICE);
    res.setHeader('Cache-Control', 'no-store');

    for (const name of [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'etag',
      'last-modified'
    ]) {
      copyHeader(response, res, name);
    }

    if (req.method === 'HEAD' || !response.body) return res.end();

    const body = Readable.fromWeb(response.body);
    body.on('error', () => {
      try { res.destroy(); } catch {}
    });
    req.on('close', () => {
      try { body.destroy(); } catch {}
    });
    body.pipe(res);
  } catch (error) {
    const aborted = error?.name === 'AbortError';
    return sendJson(res, aborted ? 504 : (error.status || 502), {
      ok: false,
      service: SERVICE,
      code: error.code || (aborted ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_FAILED'),
      error: aborted ? 'Timeout ao abrir a mídia no provedor.' : (error.message || 'Falha no upstream.')
    });
  }
};

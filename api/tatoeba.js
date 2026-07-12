// Ponte same-origin para exemplos de frases. A busca no Tatoeba continua
// usando a rota estável v1, mas o navegador não depende do CORS do provedor.
'use strict';

const UPSTREAM_URL = 'https://api.tatoeba.org/v1/sentences';
const MAX_LIMIT = 24;

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

function readQuery(req, key) {
  if (req.query && Object.prototype.hasOwnProperty.call(req.query, key)) return first(req.query[key]);
  try { return new URL(req.url || '', 'http://localhost').searchParams.get(key); } catch { return null; }
}

function cleanQuery(value) {
  try { return String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, 32); }
  catch { return String(value ?? '').trim().slice(0, 32); }
}

function toLimit(value) {
  const parsed = Number.parseInt(first(value), 10);
  return Math.max(1, Math.min(MAX_LIMIT, Number.isFinite(parsed) ? parsed : 8));
}

function flatten(value) {
  return Array.isArray(value) ? value.flat(Infinity) : [];
}

function translationRank(entry) {
  return entry?.lang === 'por' ? 0 : entry?.lang === 'eng' ? 1 : 2;
}

function normalizeRows(payload) {
  const input = Array.isArray(payload?.data) ? payload.data : [];
  return input.map(row => {
    const translations = flatten(row?.translations)
      .filter(entry => entry && entry.text && !entry.is_unapproved)
      .sort((a, b) => translationRank(a) - translationRank(b));
    const unique = new Set();
    return {
      id: row?.id ?? null,
      text: String(row?.text || '').trim(),
      translations: translations.filter(entry => {
        const key = `${entry.lang || ''}|${entry.text}`;
        if (unique.has(key)) return false;
        unique.add(key);
        return true;
      }).slice(0, 3).map(entry => ({ text: String(entry.text), lang: String(entry.lang || '') }))
    };
  }).filter(row => row.text);
}

async function requestUpstream(query, limit) {
  const params = new URLSearchParams();
  params.set('lang', 'cmn');
  params.set('q', query);
  params.set('showtrans', 'all');
  params.set('is_unapproved', 'no');
  params.set('sort', 'relevance');
  params.set('limit', String(limit));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7500);
  try {
    const response = await fetch(`${UPSTREAM_URL}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
    if (!response.ok) {
      const error = new Error(`Tatoeba HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'Use GET para buscar frases.' });

  const query = cleanQuery(readQuery(req, 'q'));
  if (!query) return json(res, 400, { ok: false, error: 'Informe um termo para a busca.' });
  const limit = toLimit(readQuery(req, 'limit'));
  try {
    const payload = await requestUpstream(query, limit);
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
    return json(res, 200, { ok: true, data: normalizeRows(payload) });
  } catch (error) {
    return json(res, error.status || 502, { ok: false, data: [], error: 'A fonte de frases está indisponível no momento.' });
  }
};

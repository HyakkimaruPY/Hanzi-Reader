#!/usr/bin/env node
const handler = require('../api/tatoeba.js');

function mockRes() {
  return {
    statusCode: 200, headers: {}, body: null,
    setHeader(key, value) { this.headers[String(key).toLowerCase()] = value; },
    end(value = '') { this.body = value; this.ended = true; }
  };
}
async function run(req) {
  const res = mockRes();
  await handler(req, res);
  return res;
}

(async () => {
  const originalFetch = global.fetch;
  let upstreamUrl = '';
  global.fetch = async url => {
    upstreamUrl = String(url);
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: [{
        id: 1,
        text: '你好吗？',
        translations: [[
          { text: 'How are you?', lang: 'eng' },
          { text: 'Como você está?', lang: 'por' },
          { text: 'Como você está?', lang: 'por' }
        ]]
      }] })
    };
  };
  try {
    const response = await run({ method: 'GET', query: { q: '你', limit: '5' } });
    const payload = JSON.parse(String(response.body));
    const url = new URL(upstreamUrl);
    if (response.statusCode !== 200 || payload.data?.[0]?.text !== '你好吗？') throw new Error('resposta de frases inválida');
    if (url.searchParams.get('lang') !== 'cmn' || url.searchParams.get('showtrans') !== 'all') throw new Error('parâmetros estáveis do Tatoeba ausentes');
    if (url.searchParams.has('trans:lang')) throw new Error('busca não pode filtrar tradução antes de encontrar frases');
    if (payload.data[0].translations[0]?.lang !== 'por' || payload.data[0].translations.length !== 2) throw new Error('traduções não foram priorizadas e deduplicadas');

    const empty = await run({ method: 'GET', query: { q: ' ' } });
    if (empty.statusCode !== 400) throw new Error('entrada vazia deveria retornar 400');
    const options = await run({ method: 'OPTIONS' });
    if (options.statusCode !== 204 || !String(options.headers['access-control-allow-methods']).includes('GET')) throw new Error('CORS OPTIONS inválido');
    console.log('✓ API de frases: consulta v1, normalização, CORS e validação aprovados');
  } finally {
    global.fetch = originalFetch;
  }
})().catch(error => { console.error('✗ ' + error.message); process.exit(1); });

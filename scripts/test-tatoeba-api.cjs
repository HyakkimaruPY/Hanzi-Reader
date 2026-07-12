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
          { text: '¿Cómo estás?', lang: 'spa' },
          { text: 'Como você está?', lang: 'por' },
          { text: '元気ですか？', lang: 'jpn' }
        ]]
      }] })
    };
  };
  try {
    const ptResponse = await run({ method: 'GET', query: { q: '你', limit: '5', to: 'por' } });
    const ptPayload = JSON.parse(String(ptResponse.body));
    const url = new URL(upstreamUrl);
    if (ptResponse.statusCode !== 200 || ptPayload.data?.[0]?.text !== '你好吗？') throw new Error('resposta de frases inválida');
    if (url.searchParams.get('lang') !== 'cmn' || url.searchParams.get('showtrans') !== 'all') throw new Error('parâmetros estáveis do Tatoeba ausentes');
    if (ptPayload.target !== 'por' || ptPayload.data[0].translations.length !== 1 || ptPayload.data[0].translations[0]?.lang !== 'por') throw new Error('filtro de português falhou');

    const esResponse = await run({ method: 'GET', query: { q: '你', to: 'spa' } });
    const esPayload = JSON.parse(String(esResponse.body));
    if (esPayload.target !== 'spa' || esPayload.data[0].translations.length !== 1 || esPayload.data[0].translations[0]?.lang !== 'spa') throw new Error('filtro de espanhol falhou');

    const fallbackResponse = await run({ method: 'GET', query: { q: '你', to: 'jpn' } });
    const fallbackPayload = JSON.parse(String(fallbackResponse.body));
    if (fallbackPayload.target !== 'eng' || fallbackPayload.data[0].translations[0]?.lang !== 'eng') throw new Error('fallback para inglês falhou');

    const empty = await run({ method: 'GET', query: { q: ' ' } });
    if (empty.statusCode !== 400) throw new Error('entrada vazia deveria retornar 400');
    const options = await run({ method: 'OPTIONS' });
    if (options.statusCode !== 204 || !String(options.headers['access-control-allow-methods']).includes('GET')) throw new Error('CORS OPTIONS inválido');
    console.log('✓ API de frases: idioma-alvo, normalização, CORS e validação aprovados');
  } finally {
    global.fetch = originalFetch;
  }
})().catch(error => { console.error('✗ ' + error.message); process.exit(1); });

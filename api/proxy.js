/* Gateway de contingência: só entra em ação quando o carregamento direto falha.
 * Allowlist de hosts evita open-proxy; validação de origem reforça o middleware. */
const ALLOW = [
  /(^|\.)yoyochinese\.com$/, /(^|\.)yabla\.com$/, /(^|\.)studycli\.org$/,
  /(^|\.)purpleculture\.net$/, /(^|\.)archchinese\.com$/,
  /(^|\.)news\.cn$/, /(^|\.)people\.com\.cn$/, /(^|\.)wikipedia\.org$/,
  /(^|\.)i\.ibb\.co$/
];
export default async function handler(req, res) {
  try {
    const target = String(req.query.url || '');
    const u = new URL(target);
    if (!/^https?:$/.test(u.protocol) || !ALLOW.some(rx => rx.test(u.hostname))) {
      res.status(403).setHeader('content-type', 'text/html; charset=utf-8');
      return res.end('<meta http-equiv="refresh" content="0;url=/blocked.html">');
    }
    const upstream = await fetch(target, { headers: { 'user-agent': 'Mozilla/5.0 (HanziReader)' } });
    res.status(upstream.status);
    const ct = upstream.headers.get('content-type'); if (ct) res.setHeader('content-type', ct);
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('cache-control', 'public, max-age=3600');
    const buf = Buffer.from(await upstream.arrayBuffer());
    return res.end(buf);
  } catch (e) {
    res.status(502).json({ error: 'upstream failed' });
  }
}

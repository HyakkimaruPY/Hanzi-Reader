/* Middleware Pattern · proteção de endpoints (Vercel Edge).
 * - Só o próprio app pode chamar /api/* (same-origin via Origin/Referer ou header x-hz-app).
 * - Acesso externo indevido -> reescreve para a página de erro personalizada. */
export const config = { matcher: ['/api/:path*'] };
export default function middleware(req) {
  const url = new URL(req.url);
  const origin = req.headers.get('origin') || '';
  const referer = req.headers.get('referer') || '';
  const appHeader = req.headers.get('x-hz-app') === '1';
  const self = url.origin;
  const sameOrigin = origin === self || referer.startsWith(self);
  if (!sameOrigin && !appHeader) {
    return Response.redirect(new URL('/blocked.html', url), 307);
  }
  return; // segue para a rota
}

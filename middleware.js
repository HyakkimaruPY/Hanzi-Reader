/* Middleware Pattern · proteção leve de endpoints (Vercel Edge).
 * - O próprio app pode chamar /api/* por Origin/Referer same-origin ou header x-hz-app.
 * - WebViews/navegadores móveis às vezes removem Origin/Referer; nesses casos deixamos passar.
 * - Bloqueia apenas quando Origin/Referer existem e apontam explicitamente para outro domínio. */
export const config = { matcher: ['/api/:path*'] };
export default function middleware(req) {
  const url = new URL(req.url);
  const origin = req.headers.get('origin') || '';
  const referer = req.headers.get('referer') || '';
  const appHeader = req.headers.get('x-hz-app') === '1';
  const self = url.origin;
  const hasCaller = !!origin || !!referer;
  const sameOrigin = origin === self || referer.startsWith(self);
  const explicitForeign = hasCaller && !sameOrigin;
  if (explicitForeign && !appHeader) {
    return Response.redirect(new URL('/blocked.html', url), 307);
  }
  return; // segue para a rota
}

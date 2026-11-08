// Cloudflare Pages Function: serves /api/* from the admin's own domain by
// forwarding to the API on Render. The session cookie then belongs to the
// admin site instead of onrender.com, so phone browsers that block
// third-party cookies (Safari, every iOS browser) keep the login.
// Override the target with the API_ORIGIN variable in Pages settings.
interface Env { API_ORIGIN?: string }

export const onRequest = async ({ request, env }: { request: Request; env: Env }) => {
  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, env.API_ORIGIN || 'https://vikipat.onrender.com');
  const headers = new Headers(request.headers);
  headers.delete('host');
  const client = request.headers.get('cf-connecting-ip');
  if (client) headers.set('x-forwarded-for', client);
  return fetch(target, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual',
  });
};

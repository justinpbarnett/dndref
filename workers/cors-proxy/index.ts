import { PROXY_UPSTREAMS } from '../../src/proxy-routes';

// The app addresses this Worker as /<route>/<upstream path>; the route table it
// builds those URLs from is the same one routing them here.
const UPSTREAM: Record<string, string> = Object.fromEntries(
  Object.entries(PROXY_UPSTREAMS).map(([route, origin]) => [`/${route}`, origin]),
);

const ALLOWED_ORIGINS = new Set([
  'https://dndref.com',
  'https://www.dndref.com',
]);

const CORS_HEADERS = 'Content-Type, Authorization, x-api-key, anthropic-version, Notion-Version';

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': CORS_HEADERS,
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') ?? '';

    if (!ALLOWED_ORIGINS.has(origin) && !origin.startsWith('http://localhost') && !origin.startsWith('http://127.0.0.1')) {
      return new Response('Forbidden', { status: 403 });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const prefix = Object.keys(UPSTREAM).find(
      (p) => url.pathname === p || url.pathname.startsWith(p + '/'),
    );
    if (!prefix) {
      return new Response('Not Found', { status: 404 });
    }

    const pathname = url.pathname.slice(prefix.length);
    // Security: prevent path traversal and null byte injection
    if (pathname.includes('..') || pathname.includes('\x00')) {
      return new Response('Invalid path', { status: 400 });
    }
    const upstreamUrl = UPSTREAM[prefix] + pathname + url.search;

    const headers = new Headers(request.headers);
    headers.delete('Origin');
    headers.delete('Referer');
    headers.delete('anthropic-dangerous-direct-browser-access');

    let upstreamRes: Response;
    try {
      upstreamRes = await fetch(upstreamUrl, {
        method: request.method,
        headers,
        body: request.body,
      });
    } catch (e) {
      return new Response(`Upstream unreachable: ${e}`, { status: 502 });
    }

    const res = new Response(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: upstreamRes.headers,
    });
    for (const [k, v] of Object.entries(corsHeaders(origin))) {
      res.headers.set(k, v);
    }
    return res;
  },
};

const UPSTREAM: Record<string, string> = {
  '/notion': 'https://api.notion.com',
  '/google-docs': 'https://docs.google.com',
  '/anthropic': 'https://api.anthropic.com',
};

const ALLOWED_ORIGINS = new Set([
  'https://dndref.com',
  'https://www.dndref.com',
]);

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.has(origin)) return true;
  return origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
}

const CORS_HEADERS = [
  'Content-Type',
  'Authorization',
  'x-api-key',
  'anthropic-version',
  'Notion-Version',
].join(', ');

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

    if (!isAllowedOrigin(origin)) {
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

    const upstreamUrl = UPSTREAM[prefix] + url.pathname.slice(prefix.length) + url.search;

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

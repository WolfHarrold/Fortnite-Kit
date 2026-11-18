// API guard for the public workers.dev address.
// Goal: stop other sites and casual scripts from spending Davi's fortnite-api.com key.
//
// Layers (all free, no setup):
//   1. CORS: no Access-Control-Allow-Origin header unless ALLOWED_ORIGIN is set and matches.
//      Other websites can then not read API answers in a browser.
//   2. Fetch metadata: browsers send Sec-Fetch-Site. "cross-site" / "same-site" calls are refused,
//      unless they come from ALLOWED_ORIGIN. The page itself sends "same-origin".
//   3. Name check: junk names are refused before any upstream call.
//   4. Rate limit per IP, for the routes that can call fortnite-api.com.
// Limit of this guard: a determined script can fake headers. For a real lock, turn on
// Cloudflare Access for the Worker (login with email), see README "Security".

const NAME_RE = /^[\p{L}\p{N} _.\-#]{2,32}$/u;

export function validName(name) {
  return typeof name === 'string' && NAME_RE.test(name.trim());
}

export function corsHeaders(request, env) {
  const allowed = env.ALLOWED_ORIGIN;
  const origin = request.headers.get('Origin');
  if (allowed && allowed !== '*' && origin === allowed) {
    return { 'Access-Control-Allow-Origin': allowed, 'Access-Control-Allow-Methods': 'GET, OPTIONS', Vary: 'Origin' };
  }
  if (allowed === '*') return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
  return {};
}

// true = allowed. Requests with no Sec-Fetch-Site header (non-browser clients) pass this layer.
export function fetchSiteAllowed(request, env) {
  const site = request.headers.get('Sec-Fetch-Site');
  if (!site || site === 'same-origin' || site === 'none') return true;
  const origin = request.headers.get('Origin');
  return Boolean(env.ALLOWED_ORIGIN && env.ALLOWED_ORIGIN !== '*' && origin === env.ALLOWED_ORIGIN);
}

// Fixed-window counter per key. In memory, per Worker isolate: cheap, not exact. Good enough
// to stop a loop from burning the key.
export function createRateLimiter({ limit = 30, windowMs = 5 * 6e4, now = () => Date.now() } = {}) {
  const hits = new Map();
  return {
    hit(key) {
      const t = now();
      const e = hits.get(key);
      if (!e || t - e.start >= windowMs) {
        hits.set(key, { start: t, count: 1 });
        if (hits.size > 5000) for (const [k, v] of hits) if (t - v.start >= windowMs) hits.delete(k);
        return { ok: true, remaining: limit - 1 };
      }
      e.count += 1;
      if (e.count > limit) return { ok: false, retryAfter: Math.ceil((e.start + windowMs - t) / 1000) };
      return { ok: true, remaining: limit - e.count };
    },
  };
}

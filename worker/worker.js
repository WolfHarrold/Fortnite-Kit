// Cloudflare Worker: a private, caching proxy in front of the Fortnite APIs,
// plus the Loot Terminal page at "/".
// Why: keeps API keys off the web page and caches stats for 20 minutes per player.
//
// Secrets (dashboard or `wrangler secret put`): FORTNITE_API_COM_KEY, FORTNITE_API_IO_KEY (optional)
// Vars:     ALLOWED_ORIGIN (optional) — a second site allowed to call the API (e.g. a GitHub Pages URL).
//           Leave it unset: the page is served by this Worker, so it needs no CORS.
// Optional: KV namespace binding FN_CACHE (keeps the cache across Worker restarts)
// Guard:    see worker/guard.js (CORS, fetch metadata, name check, rate limit)
//
// Routes (all GET):
//   /                         the Loot Terminal page
//   /overlay?name=&theme=&fields=&refresh=&scale=&bg=   stream overlay for OBS (see ui/overlay.js)
//   /api/health
//   /api/stats/:name?window=season|lifetime&accountType=epic|psn|xbl
//   /api/career/:name?matches=1
//   /api/treasure/:name                       default: alive minutes x 2 chests per minute
//        ?chestsPerMinute=<n>   or   ?chestsPerMatch=funaglet|<n> (per-match method)
//   /api/plan/:name?reward=<id>&matches=5&minutes=0&thMatches=0&thMinutes=0&th=0
//   /api/shop   /api/news[/br|stw|creative]   /api/cosmetics/new   /api/map   /api/status
//   /api/rarest               rarest Item Shop cosmetics (data/rarest.json, rebuilt daily)
//   /api/islands?size=&after=   /api/islands/:code   /api/islands/:code/metrics/:interval?from=&to=

import { createFortniteKit } from '../src/kit.js';
import { FortniteKitError } from '../src/http.js';
import { validName, corsHeaders, fetchSiteAllowed, createRateLimiter } from './guard.js';
import treasureEvent from '../data/treasure-hunters-2026.json' with { type: 'json' };
import page from './page.generated.js'; // Loot Terminal page, made by ui/build.mjs
import overlayPage from './overlay.generated.js'; // stream overlay, made by ui/build.mjs
import pkg from '../package.json' with { type: 'json' };
import rarest from '../data/rarest.json' with { type: 'json' }; // rebuilt daily by .github/workflows/rarest.yml

const memoryStore = new Map(); // lives as long as the Worker isolate
const PLAYER_ROUTES = new Set(['stats', 'career', 'treasure', 'plan']); // these can call fortnite-api.com
const DEFAULT_LIMIT = 30; // player lookups per IP per 5 minutes
let limiter = null;

function kvStore(kv) {
  return { get: (k) => kv.get(k), set: (k, v) => kv.put(k, v, { expirationTtl: 3600 }) };
}

function json(data, status, cors, { maxAge = 0, extra = {} } = {}) {
  return new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': maxAge ? `public, max-age=${maxAge}` : 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...cors,
      ...extra,
    },
  });
}

function errorResponse(err, cors) {
  if (err instanceof FortniteKitError) {
    const friendly = {
      400: 'Bad request. Check the player name and options.',
      403: 'This player has private stats, or the API key is wrong.',
      404: 'Player not found, or no stats for this time window.',
      429: 'Too many requests. Wait and try again.',
    }[err.status];
    return json({ error: friendly ?? err.message, status: err.status, source: err.source }, err.status || 502, cors);
  }
  return json({ error: err.message ?? 'Server error' }, 500, cors);
}

export async function handle(request, env = {}, { fetch: f, rateLimiter } = {}) {
  const cors = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return json({}, 204, cors);
  if (request.method !== 'GET') return json({ error: 'GET only' }, 405, cors);

  const url = new URL(request.url);
  const q = url.searchParams;
  // The Loot Terminal page lives at the Worker's own address, so it talks to /api with no CORS.
  if (url.pathname === '/overlay') {
    return new Response(overlayPage, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  }
  if (url.pathname === '/' || url.pathname === '/index.html') {
    return new Response(page, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
      },
    });
  }
  let parts;
  try { parts = url.pathname.replace(/^\/+|\/+$/g, '').split('/').map(decodeURIComponent); }
  catch { return json({ error: 'Bad path' }, 400, cors); }
  if (parts[0] !== 'api') return json({ error: 'Not found' }, 404, cors);
  const [, route, a, b, c] = parts;

  // ---- guard ----
  if (!fetchSiteAllowed(request, env)) {
    return json({ error: 'This API only serves the Loot Terminal page.' }, 403, cors);
  }
  if (PLAYER_ROUTES.has(route)) {
    if (!validName(a ?? '')) return json({ error: 'Bad player name.', status: 400 }, 400, cors);
    limiter = rateLimiter ?? limiter ?? createRateLimiter({ limit: +env.RATE_LIMIT || DEFAULT_LIMIT, windowMs: 5 * 6e4 });
    const ip = request.headers.get('CF-Connecting-IP') ?? 'local';
    const r = limiter.hit(ip);
    if (!r.ok) {
      return json({ error: `Too many lookups. Wait ${r.retryAfter} s.`, status: 429 }, 429, cors, { extra: { 'Retry-After': String(r.retryAfter) } });
    }
  }

  const kit = createFortniteKit({
    fortniteApiComKey: env.FORTNITE_API_COM_KEY,
    fortniteApiIoKey: env.FORTNITE_API_IO_KEY,
    event: treasureEvent,
    cacheStore: env.FN_CACHE ? kvStore(env.FN_CACHE) : memoryStore,
    fetch: f,
  });
  const cpm = (v) => (v == null ? undefined : Number.isFinite(+v) ? +v : v);
  const num = (v) => (v == null ? undefined : +v);
  // Chest model from the query: chestsPerMatch=50|funaglet (per match) or chestsPerMinute=2 (default model)
  const chestOpts = () => ({ chestsPerMatch: cpm(q.get('chestsPerMatch')), chestsPerMinute: num(q.get('chestsPerMinute')) });
  const acct = ['epic', 'psn', 'xbl'].includes(q.get('accountType')) ? q.get('accountType') : 'epic';

  try {
    switch (route) {
      case 'health':
        return json({ ok: true, version: pkg.version, event: treasureEvent.id, hasStatsKey: Boolean(env.FORTNITE_API_COM_KEY) }, 200, cors);
      case 'stats':
        return json(await kit.stats(a, { timeWindow: q.get('window') === 'lifetime' ? 'lifetime' : 'season', accountType: acct }), 200, cors);
      case 'career':
        return json(await kit.career(a, { accountType: acct, withMatches: q.get('matches') === '1' }), 200, cors);
      case 'treasure':
        return json(await kit.treasure(a, chestOpts()), 200, cors);
      case 'plan': {
        const t = await kit.treasure(a, chestOpts());
        const plan = kit.plan({
          report: t,
          rewardId: q.get('reward') ?? undefined,
          plannedMatches: +(q.get('matches') ?? 0),
          plannedMinutes: +(q.get('minutes') ?? 0),
          treasureHourMatches: +(q.get('thMatches') ?? 0),
          treasureHourMinutes: +(q.get('thMinutes') ?? 0),
          treasureHour: q.has('th') ? +q.get('th') : null,
        });
        return json({ player: t.player, ...plan }, 200, cors);
      }
      case 'shop': return json(await kit.shop(), 200, cors, { maxAge: 600 });
      case 'rarest': return json(rarest, 200, cors, { maxAge: 3600 });
      case 'news': return json(await kit.news(['br', 'stw', 'creative'].includes(a) ? a : 'br'), 200, cors, { maxAge: 600 });
      case 'cosmetics': return json(await kit.newCosmetics(), 200, cors, { maxAge: 600 });
      case 'map': return json(await kit.map(), 200, cors, { maxAge: 3600 });
      case 'status': return json(await kit.serverStatus(), 200, cors, { maxAge: 60 });
      case 'islands':
        if (!a) return json(await kit.islands({ size: Math.min(1000, +(q.get('size') ?? 100) || 100), after: q.get('after') ?? undefined }), 200, cors, { maxAge: 600 });
        if (b === 'metrics') return json(await kit.islandMetrics(a, { interval: ['minute', 'hour', 'day'].includes(c) ? c : 'day', from: q.get('from') ?? undefined, to: q.get('to') ?? undefined }), 200, cors, { maxAge: 600 });
        return json(await kit.island(a), 200, cors, { maxAge: 600 });
      default:
        return json({ error: 'Unknown route' }, 404, cors);
    }
  } catch (err) {
    return errorResponse(err, cors);
  }
}

export default { fetch: (request, env) => handle(request, env) };

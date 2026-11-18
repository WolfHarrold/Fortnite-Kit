// Cloudflare Worker: a private, caching proxy in front of the Fortnite APIs.
// Why: keeps API keys off the web page, adds CORS for GitHub Pages, and caches
// stats for 20 minutes per player (same as FUNAGLET).
//
// Secrets (wrangler secret put ...):  FORTNITE_API_COM_KEY, FORTNITE_API_IO_KEY (optional)
// Vars:     ALLOWED_ORIGIN (default "*")
// Optional: KV namespace binding FN_CACHE (keeps the cache across Worker restarts)
//
// Routes (all GET):
//   /                         the Loot Terminal page
//   /api/health
//   /api/stats/:name?window=season|lifetime&accountType=epic|psn|xbl
//   /api/career/:name?matches=1
//   /api/treasure/:name                       default: alive minutes x 2 chests per minute
//        ?chestsPerMinute=<n>   or   ?chestsPerMatch=funaglet|<n> (per-match method)
//   /api/plan/:name?reward=<id>&matches=5&minutes=0&thMatches=0&thMinutes=0&th=0
//   /api/shop   /api/news[/br|stw|creative]   /api/cosmetics/new   /api/map   /api/status
//   /api/islands?size=&after=   /api/islands/:code   /api/islands/:code/metrics/:interval?from=&to=

import { createFortniteKit } from '../src/kit.js';
import { FortniteKitError } from '../src/http.js';
import treasureEvent from '../data/treasure-hunters-2026.json' with { type: 'json' };
import page from './page.generated.js'; // Loot Terminal page, made by ui/build.mjs

const memoryStore = new Map(); // lives as long as the Worker isolate

function kvStore(kv) {
  return { get: (k) => kv.get(k), set: (k, v) => kv.put(k, v, { expirationTtl: 3600 }) };
}

function json(data, status, origin, maxAge = 0) {
  return new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': maxAge ? `public, max-age=${maxAge}` : 'no-store',
    },
  });
}

function errorResponse(err, origin) {
  if (err instanceof FortniteKitError) {
    const friendly = {
      400: 'Bad request. Check the player name and options.',
      403: 'This player has private stats, or the API key is wrong.',
      404: 'Player not found, or no stats for this time window.',
      429: 'Too many requests. Wait and try again.',
    }[err.status];
    return json({ error: friendly ?? err.message, status: err.status, source: err.source }, err.status || 502, origin);
  }
  return json({ error: err.message ?? 'Server error' }, 500, origin);
}

export async function handle(request, env = {}, { fetch: f } = {}) {
  const origin = env.ALLOWED_ORIGIN || '*';
  if (request.method === 'OPTIONS') return json({}, 204, origin);
  if (request.method !== 'GET') return json({ error: 'GET only' }, 405, origin);

  const url = new URL(request.url);
  const q = url.searchParams;
  // The Loot Terminal page lives at the Worker's own address, so it talks to /api with no CORS.
  if (url.pathname === '/' || url.pathname === '/index.html') {
    return new Response(page, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
  }
  const parts = url.pathname.replace(/^\/+|\/+$/g, '').split('/').map(decodeURIComponent);
  if (parts[0] !== 'api') return json({ error: 'Not found' }, 404, origin);
  const [, route, a, b, c] = parts;

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

  try {
    switch (route) {
      case 'health':
        return json({ ok: true, event: treasureEvent.id, hasStatsKey: Boolean(env.FORTNITE_API_COM_KEY) }, 200, origin);
      case 'stats':
        return json(await kit.stats(a, { timeWindow: q.get('window') ?? 'season', accountType: q.get('accountType') ?? 'epic' }), 200, origin);
      case 'career':
        return json(await kit.career(a, { accountType: q.get('accountType') ?? 'epic', withMatches: q.get('matches') === '1' }), 200, origin);
      case 'treasure':
        return json(await kit.treasure(a, chestOpts()), 200, origin);
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
        return json({ player: t.player, ...plan }, 200, origin);
      }
      case 'shop': return json(await kit.shop(), 200, origin, 600);
      case 'news': return json(await kit.news(a ?? 'br'), 200, origin, 600);
      case 'cosmetics': return json(await kit.newCosmetics(), 200, origin, 600);
      case 'map': return json(await kit.map(), 200, origin, 3600);
      case 'status': return json(await kit.serverStatus(), 200, origin, 60);
      case 'islands':
        if (!a) return json(await kit.islands({ size: +(q.get('size') ?? 100), after: q.get('after') ?? undefined }), 200, origin, 600);
        if (b === 'metrics') return json(await kit.islandMetrics(a, { interval: c ?? 'day', from: q.get('from') ?? undefined, to: q.get('to') ?? undefined }), 200, origin, 600);
        return json(await kit.island(a), 200, origin, 600);
      default:
        return json({ error: 'Unknown route' }, 404, origin);
    }
  } catch (err) {
    return errorResponse(err, origin);
  }
}

export default { fetch: (request, env) => handle(request, env) };

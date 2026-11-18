import test from 'node:test';
import assert from 'node:assert/strict';
import { createFortniteApiCom } from '../src/sources/fortniteApiCom.js';
import { createEpicEcosystem } from '../src/sources/epicEcosystem.js';
import { createEpicStatus } from '../src/sources/epicStatus.js';
import { createFortniteKit } from '../src/kit.js';
import { createCache } from '../src/cache.js';
import { FortniteKitError } from '../src/http.js';
import { handle } from '../worker/worker.js';
import { fixture, event, mockFetch } from './helpers.js';

const statsFx = fixture('fortnite-api-com.season.LilAvlis.json');

test('fortnite-api.com client sends key + correct URL', async () => {
  const f = mockFetch([[/stats\/br\/v2/, 200, statsFx]]);
  const c = createFortniteApiCom({ apiKey: 'KEY-123', fetch: f });
  const data = await c.statsByName('LilAvlis', { timeWindow: 'season' });
  assert.equal(data.account.name, 'LilAvlis');
  const u = new URL(f.calls[0].url);
  assert.equal(u.origin + u.pathname, 'https://fortnite-api.com/v2/stats/br/v2');
  assert.equal(u.searchParams.get('name'), 'LilAvlis');
  assert.equal(u.searchParams.get('timeWindow'), 'season');
  assert.equal(f.calls[0].headers.Authorization, 'KEY-123');
});

test('private stats (403) become a FortniteKitError with status', async () => {
  const f = mockFetch([[/stats/, 403, { status: 403, error: 'the requested account\'s stats are not public' }]]);
  const c = createFortniteApiCom({ apiKey: 'k', fetch: f });
  await assert.rejects(c.statsByName('x'), (e) => e instanceof FortniteKitError && e.status === 403);
});

test('ecosystem metrics URL: interval in path, to rounded down to the hour', async () => {
  const f = mockFetch([[/metrics/, 200, fixture('epic-ecosystem.metrics.json')]]);
  const eco = createEpicEcosystem({ fetch: f });
  await eco.metrics('1234-5678-9012', { interval: 'hour', from: '2026-11-17T00:00:00Z', to: '2026-11-18T01:47:12Z' });
  const u = new URL(f.calls[0].url);
  assert.equal(u.pathname, '/ecosystem/v1/islands/1234-5678-9012/metrics/hour');
  assert.equal(u.searchParams.get('to'), '2026-11-18T01:00:00.000Z');
});

test('ecosystem pager follows nextCursor', async () => {
  let n = 0;
  const f = async (url) => {
    n += 1;
    const after = new URL(url).searchParams.get('after');
    const body = after ? { data: [{ code: 'B' }], meta: { page: {} } } : { data: [{ code: 'A' }], meta: { page: { nextCursor: 'c1' } } };
    return new Response(JSON.stringify(body), { status: 200 });
  };
  const eco = createEpicEcosystem({ fetch: f });
  const codes = [];
  for await (const i of eco.allIslands({ delayMs: 0 })) codes.push(i.code);
  assert.deepEqual(codes, ['A', 'B']);
  assert.equal(n, 2);
});

test('status page: picks Fortnite components', async () => {
  const f = mockFetch([[/summary/, 200, {
    status: { description: 'All Systems Operational' },
    components: [
      { id: 'g1', name: 'Fortnite', group: true },
      { id: 'c1', name: 'Matchmaking', group_id: 'g1', status: 'operational' },
      { id: 'c2', name: 'Epic Games Store', group_id: 'g2', status: 'operational' },
    ],
  }]]);
  const s = await createEpicStatus({ fetch: f }).fortnite();
  assert.deepEqual(s, { overall: 'All Systems Operational', components: { Matchmaking: 'operational' } });
});

test('cache: second call inside 20 min is served from cache (cooldown)', async () => {
  let t = 0; let loads = 0;
  const cache = createCache({ ttlMs: 20 * 6e4, now: () => t });
  const load = async () => { loads += 1; return loads; };
  assert.equal((await cache.getOrLoad('k', load)).cached, false);
  t = 19 * 6e4;
  const hit = await cache.getOrLoad('k', load);
  assert.equal(hit.cached, true);
  assert.equal(hit.refreshAvailableAt, new Date(20 * 6e4).toISOString());
  t = 21 * 6e4;
  assert.equal((await cache.getOrLoad('k', load)).value, 2);
});

test('kit.treasure end-to-end with mocked API', async () => {
  const f = mockFetch([[/stats\/br\/v2/, 200, statsFx]]);
  const kit = createFortniteKit({ fortniteApiComKey: 'k', event, fetch: f, cacheStore: new Map() });
  const r = await kit.treasure('LilAvlis', { chestsPerMatch: 'funaglet', now: new Date('2026-11-18T01:00:00Z') });
  assert.equal(r.player.name, 'LilAvlis');
  assert.equal(r.seasonChests, 17500);
  await kit.treasure('LilAvlis', { chestsPerMatch: 'funaglet' });
  assert.equal(f.calls.length, 1, 'second call must hit the cache');
});

test('worker routes: /api/treasure, /api/career, errors, CORS', async () => {
  const f = mockFetch([
    [/name=Private/, 403, { error: 'private' }],
    [/stats\/br\/v2/, 200, statsFx],
  ]);
  const env = { FORTNITE_API_COM_KEY: 'k', ALLOWED_ORIGIN: 'https://wolfharrold.github.io' };

  let res = await handle(new Request('https://w.dev/api/treasure/LilAvlis?chestsPerMatch=funaglet'), env, { fetch: f });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://wolfharrold.github.io');
  const body = await res.json();
  assert.equal(body.seasonChests, 17500);
  assert.equal(body.rewards[0].id, 'pirate-shop-access');

  res = await handle(new Request('https://w.dev/api/career/LilAvlis'), env, { fetch: f });
  const career = await res.json();
  assert.equal(career.season.overall.matches, 350);
  assert.equal(career.lifetime.overall.matches, 350);

  res = await handle(new Request('https://w.dev/api/plan/LilAvlis?chestsPerMatch=50&matches=5'), env, { fetch: f });
  assert.equal((await res.json()).projectedTotal, 17750);

  // Default model: alive minutes x 2
  res = await handle(new Request('https://w.dev/api/treasure/LilAvlis'), env, { fetch: f });
  const def = await res.json();
  assert.equal(def.method, 'minutes');
  assert.equal(def.seasonChests, 8110);

  res = await handle(new Request('https://w.dev/api/plan/LilAvlis?minutes=60'), env, { fetch: f });
  assert.equal((await res.json()).plannedChests, 120);

  res = await handle(new Request('https://w.dev/api/stats/Private'), env, { fetch: f });
  assert.equal(res.status, 403);
  assert.match((await res.json()).error, /private/i);

  res = await handle(new Request('https://w.dev/api/nope'), env, { fetch: f });
  assert.equal(res.status, 404);

  res = await handle(new Request('https://w.dev/api/stats/x', { method: 'OPTIONS' }), env, { fetch: f });
  assert.equal(res.status, 204);
});

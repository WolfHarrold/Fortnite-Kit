// One entry point for apps. Wraps the source clients, the normaliser, the cache
// and the treasure engine. A UI only needs this file.
//
//   const kit = createFortniteKit({ fortniteApiComKey: '...', event });
//   const career = await kit.career('LilAvlis');      // season + lifetime PlayerStats
//   const odds   = await kit.treasure('LilAvlis');    // FUNAGLET-style report
//
// Run it on a server or in the Worker (worker/worker.js). Do NOT put keys in a public web page.

import { createFortniteApiCom } from './sources/fortniteApiCom.js';
import { createFortniteApiIo } from './sources/fortniteApiIo.js';
import { createEpicEcosystem, metricsToRows } from './sources/epicEcosystem.js';
import { createEpicStatus } from './sources/epicStatus.js';
import { fromFortniteApiCom } from './normalize.js';
import { createCache } from './cache.js';
import { treasureReport, planTreasure } from './treasure.js';
import { FortniteKitError } from './http.js';

export function createFortniteKit({
  fortniteApiComKey = '',
  fortniteApiIoKey = '',
  event = null, // treasure event JSON (data/*.json)
  fetch,
  statsTtlMs = 20 * 6e4,
  contentTtlMs = 60 * 6e4,
  cacheStore,
} = {}) {
  const fapi = createFortniteApiCom({ apiKey: fortniteApiComKey, fetch });
  const fio = fortniteApiIoKey ? createFortniteApiIo({ apiKey: fortniteApiIoKey, fetch }) : null;
  const eco = createEpicEcosystem({ fetch });
  const status = createEpicStatus({ fetch });
  const statsCache = createCache({ ttlMs: statsTtlMs, store: cacheStore });
  const contentCache = createCache({ ttlMs: contentTtlMs, store: cacheStore });
  const key = (...parts) => parts.join(':').toLowerCase();

  // Failed lookups (private stats, not found) are remembered for 10 minutes, so the same bad
  // name cannot spend the API key again and again.
  const negStore = cacheStore ?? new Map();
  const NEG_TTL = 10 * 6e4;
  const negGet = async (k) => {
    const raw = await negStore.get(`neg:${k}`);
    if (raw == null) return null;
    const e = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Date.now() - e.savedAt < NEG_TTL ? e : null;
  };
  const negSet = (k, e) => negStore.set(`neg:${k}`, negStore instanceof Map ? e : JSON.stringify(e));

  async function stats(name, { timeWindow = 'season', accountType = 'epic' } = {}) {
    const k = key('stats', accountType, timeWindow, name);
    const neg = await negGet(k);
    if (neg) throw new FortniteKitError(neg.message, { status: neg.status, source: 'fortnite-api.com (cached error)' });
    try {
      const r = await statsCache.getOrLoad(k, async () =>
        fromFortniteApiCom(await fapi.statsByName(name, { timeWindow, accountType }), { timeWindow }));
      return { ...r.value, cache: { cached: r.cached, savedAt: r.savedAt, refreshAvailableAt: r.refreshAvailableAt } };
    } catch (err) {
      if (err instanceof FortniteKitError && (err.status === 403 || err.status === 404)) {
        await negSet(k, { status: err.status, message: err.message, savedAt: Date.now() });
      }
      throw err;
    }
  }

  return {
    sources: { fortniteApiCom: fapi, fortniteApiIo: fio, epicEcosystem: eco, epicStatus: status },

    stats,

    // Career view: season + lifetime side by side, plus extras when fortniteapi.io is set up.
    async career(name, { accountType = 'epic', withMatches = false } = {}) {
      const [season, lifetime] = await Promise.all([
        stats(name, { timeWindow: 'season', accountType }),
        stats(name, { timeWindow: 'lifetime', accountType }),
      ]);
      let recentMatches = null;
      if (withMatches && fio && season.account.id) {
        recentMatches = await fio.recentMatches(season.account.id).catch(() => null);
      }
      return { account: season.account, battlePass: season.battlePass, season, lifetime, recentMatches };
    },

    // Default chest estimate = alive minutes x event.chestsPerMinute (2). Pass chestsPerMatch for per-match.
    async treasure(name, { chestsPerMatch, chestsPerMinute, now, accountType = 'epic' } = {}) {
      if (!event) throw new Error('No treasure event loaded. Pass event: <data/*.json>');
      const season = await stats(name, { timeWindow: 'season', accountType });
      const report = treasureReport({
        event, matches: season.overall.matches, minutesPlayed: season.overall.minutesPlayed, chestsPerMatch, chestsPerMinute, now,
      });
      return { player: season.account, stats: season.overall, cache: season.cache, ...report };
    },

    plan: (args) => planTreasure({ event, ...args }),

    // Content feeds (cached 1 h by default)
    shop: () => contentCache.getOrLoad('shop', () => fapi.shop()).then((r) => r.value),
    news: (mode = 'br') => contentCache.getOrLoad(key('news', mode), () => fapi.news(mode)).then((r) => r.value),
    newCosmetics: () => contentCache.getOrLoad('cosmetics:new', () => fapi.cosmeticsNew()).then((r) => r.value),
    map: () => contentCache.getOrLoad('map', () => fapi.map()).then((r) => r.value),
    serverStatus: () => status.fortnite(),

    // Official Epic island analytics
    islands: (opts) => eco.listIslands(opts),
    island: (code) => eco.island(code),
    islandMetrics: async (code, opts) => metricsToRows(await eco.metrics(code, opts)),
  };
}

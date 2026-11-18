// Client for Epic's OFFICIAL Fortnite Data API ("Ecosystem API").
// Docs: https://dev.epicgames.com/documentation/en-us/fortnite/using-fortnite-data-api-in-fortnite
// Swagger: https://api.fortnite.com/ecosystem/v1/docs
// Base: https://api.fortnite.com/ecosystem/v1   No key. No auth.
//
// What it has: island (game mode) analytics only. NO player data.
// Metrics: plays, uniquePlayers, peakCCU, minutesPlayed, averageMinutesPerPlayer,
//          favorites, recommendations, retention (d1, d7).
// Intervals: minute (10 min), hour, day. History: last 7 days only.
// Paths and limits confirmed from a live collector (Nov 2026):
//   GET /islands?size=1000&after=<cursor>      -> { data: [...], meta: { page: { nextCursor } } }
//   GET /islands/{code}                         -> island metadata (code, title, creatorCode, category, tags)
//   GET /islands/{code}/metrics/{interval}?from=<ISO>&to=<ISO>
//        -> { plays: [{ value, timestamp }], ..., retention: [{ d1, d7, timestamp }] }
//   size max = 1000. ~6 requests/second is safe; 8/s starts to get 429.
//   The API rejects a `to` in the future: round `to` down to the current hour.

import { buildUrl, getJson } from '../http.js';

const BASE = 'https://api.fortnite.com/ecosystem/v1';
export const ECOSYSTEM_METRICS = [
  'plays', 'uniquePlayers', 'peakCCU', 'minutesPlayed', 'averageMinutesPerPlayer', 'favorites', 'recommendations',
];

const floorHourIso = (d) => { const x = new Date(d); x.setUTCMinutes(0, 0, 0); return x.toISOString(); };

export function createEpicEcosystem({ fetch, timeoutMs } = {}) {
  const get = (path, params = {}) => getJson(buildUrl(BASE, path, params), { fetch, timeoutMs, source: 'epic-ecosystem' });

  const api = {
    source: 'epic-ecosystem',
    listIslands: ({ size = 100, after } = {}) => get('/islands', { size, after }),
    island: (code) => get(`/islands/${encodeURIComponent(code)}`),
    // interval: 'minute' | 'hour' | 'day'. Default window = last 7 days.
    metrics: (code, { interval = 'day', from, to } = {}) => {
      const now = Date.now();
      const toIso = floorHourIso(to ?? now);
      const fromIso = new Date(from ?? now - 7 * 864e5).toISOString();
      return get(`/islands/${encodeURIComponent(code)}/metrics/${interval}`, { from: fromIso, to: toIso });
    },
    // Walk every page. Stops at maxPages. Waits between calls to stay under the rate limit.
    async *allIslands({ size = 1000, maxPages = Infinity, delayMs = 200 } = {}) {
      let after; let pages = 0;
      do {
        const page = await api.listIslands({ size, after });
        for (const island of page?.data ?? []) yield island;
        after = page?.meta?.page?.nextCursor;
        pages += 1;
        if (after && delayMs) await new Promise((r) => setTimeout(r, delayMs));
      } while (after && pages < maxPages);
    },
  };
  return api;
}

// Turn { metric: [{value, timestamp}] } into rows: [{ timestamp, plays, peakCCU, ..., retentionD1, retentionD7 }]
export function metricsToRows(payload) {
  const rows = new Map();
  for (const [key, series] of Object.entries(payload ?? {})) {
    if (!Array.isArray(series)) continue;
    for (const p of series) {
      if (!p?.timestamp) continue;
      const row = rows.get(p.timestamp) ?? { timestamp: p.timestamp };
      if (key === 'retention') { row.retentionD1 = p.d1 ?? null; row.retentionD7 = p.d7 ?? null; }
      else row[key] = p.value ?? null;
      rows.set(p.timestamp, row);
    }
  }
  return [...rows.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

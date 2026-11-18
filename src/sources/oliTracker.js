// Adapter for OliTracker (https://olitracker.com) — the stats source FUNAGLET credits.
//
// STATUS: endpoints NOT confirmed yet.
// OliTracker publishes API docs at https://olitracker.com/api/docs but the page is
// rendered by JavaScript, so it could not be read without a real browser.
// TO FINISH THIS ADAPTER: open the docs page in Chrome, note the stats endpoint,
// the auth header and the response shape, then fill in ENDPOINTS and mapResponse().
//
// Why OliTracker matters: it gives a per-playlist breakdown (Build vs Zero Build,
// Ranked, etc.), which fortnite-api.com does not. FUNAGLET shows "Zero Build 350 / Build —",
// which matches Epic's raw stats keys (see statsProxy.js). OliTracker most likely
// reads Epic's stats proxy with its own bot accounts (it asks players to add the
// "OliTracker" bot as a friend), then serves the result through its API.

import { buildUrl, getJson } from '../http.js';

export function createOliTracker({
  baseUrl = 'https://olitracker.com',
  apiKey = '',
  authHeader = 'Authorization', // change when the docs are read
  // Path template for the stats call. {name} and {window} are replaced. PLACEHOLDER.
  statsPath = '/api/v1/stats/{name}?window={window}',
  fetch,
  timeoutMs,
} = {}) {
  const headers = apiKey ? { [authHeader]: apiKey } : {};
  return {
    source: 'olitracker',
    confirmed: false,
    async statsByName(name, { timeWindow = 'season' } = {}) {
      const path = statsPath.replace('{name}', encodeURIComponent(name)).replace('{window}', timeWindow);
      const [p, q = ''] = path.split('?');
      const params = Object.fromEntries(new URLSearchParams(q));
      return getJson(buildUrl(baseUrl, p, params), { headers, fetch, timeoutMs, source: 'olitracker' });
    },
  };
}

// Client for fortniteapi.io (community API, free tier + paid tiers).
// Key: from the fortniteapi.io dashboard. Header: Authorization: <key>
// Endpoint list taken from the npm client "fortnite-api-io" v1.9.0.
// Some endpoints may have moved to /v2 since. Check the live docs before you rely on one.
//
// Why it matters: it has data fortnite-api.com does not have:
// account lookup, recent matches, tournaments, loot spawn chances, weapons, past maps, seasons, POIs, fish.

import { buildUrl, getJson } from '../http.js';

const BASE = 'https://fortniteapi.io/v1';

export function createFortniteApiIo({ apiKey, lang = 'en', fetch, timeoutMs } = {}) {
  if (!apiKey) throw new Error('fortniteapi.io needs an apiKey');
  const headers = { Authorization: apiKey };
  const get = (path, params = {}) =>
    getJson(buildUrl(BASE, path, params), { headers, fetch, timeoutMs, source: 'fortniteapi.io' });

  return {
    source: 'fortniteapi.io',
    // Accounts and stats
    lookup: (username, platform) => get('/lookup', { username, platform }),
    lookupUsernames: (ids) => get('/lookupUsername', { id: ids.join(',') }),
    stats: (accountId) => get('/stats', { account: accountId }),
    recentMatches: (accountId) => get('/matches', { account: accountId }),
    fishStats: (accountId) => get('/stats/fish', { accountId }),
    // Competitive
    tournaments: () => get('/events/list', { lang }),
    tournamentWindow: (windowId, page = 0) => get('/events/window', { windowId, page }),
    tournamentScores: (eventId) => get('/events/cumulative', { eventId }),
    replayLink: (sessionId) => get('/events/replay', { session: sessionId }),
    // Game data
    challenges: (season = 'current') => get('/challenges', { season, lang }),
    battlePass: (season = 'current') => get('/battlepass', { season, lang }),
    achievements: () => get('/achievements', { lang }),
    items: () => get('/items/list', { lang }),
    upcomingItems: () => get('/items/upcoming', { lang }),
    item: (id) => get('/items/get', { id, lang }),
    sets: () => get('/items/sets', { lang }),
    bundles: () => get('/bundles', { lang }),
    shop: () => get('/shop', { lang }),
    weapons: () => get('/weapons/list'),
    loot: () => get('/loot/list', { lang }),
    lootItem: (id) => get('/loot/get', { id, lang }),
    lootChances: (mode) => get('/loot/chances', { mode }), // chest/floor loot spawn chances
    fish: () => get('/loot/fish', { lang }),
    maps: () => get('/maps/list'), // past map images
    mapItems: () => get('/maps/items/list'),
    seasons: () => get('/seasons/list'),
    pois: () => get('/game/poi', { lang }),
    modes: () => get('/game/modes', { lang }),
    modeData: (playlist) => get('/game/modes/data', { playlist }),
    radios: () => get('/game/radios', { lang }),
    rarities: () => get('/rarities'),
    news: (type = 'br') => get('/news', { type, lang }),
    status: () => get('/status'),
    featuredIslands: () => get('/creative/featured'),
    island: (code) => get('/creative/island', { code }),
  };
}

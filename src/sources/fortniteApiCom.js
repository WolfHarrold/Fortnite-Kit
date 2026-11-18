// Client for fortnite-api.com (community API, free).
// Docs: https://dash.fortnite-api.com/endpoints
// Key: sign in at https://dash.fortnite-api.com/account (Discord login). Format = GUID.
// The stats endpoints need the key. Most other endpoints work without it.
// Header: Authorization: <key>   (no "Bearer")
//
// Stats status codes (verify on first live run):
//   400 bad params, 403 stats are private, 404 account not found / no stats.
// Note from the docs: the `trio` field in stats can come back null.

import { buildUrl, getJson } from '../http.js';

const BASE = 'https://fortnite-api.com';

export function createFortniteApiCom({ apiKey = '', language = 'en', fetch, timeoutMs } = {}) {
  const headers = apiKey ? { Authorization: apiKey } : {};
  const get = (path, params = {}) =>
    getJson(buildUrl(BASE, path, params), { headers, fetch, timeoutMs, source: 'fortnite-api.com' }).then((r) => r?.data ?? r);

  return {
    source: 'fortnite-api.com',

    // ---- Player stats (key required) ----
    // timeWindow: 'season' | 'lifetime'   accountType: 'epic' | 'psn' | 'xbl'
    // image: 'none' | 'all' | 'keyboardMouse' | 'gamepad' | 'touch' (returns a stats card image URL)
    statsByName: (name, { timeWindow = 'season', accountType = 'epic', image = 'none' } = {}) =>
      get('/v2/stats/br/v2', { name, accountType, timeWindow, image }),
    statsById: (accountId, { timeWindow = 'season', image = 'none' } = {}) =>
      get(`/v2/stats/br/v2/${encodeURIComponent(accountId)}`, { timeWindow, image }),

    // ---- Game content (no key) ----
    shop: () => get('/v2/shop', { language }),
    news: (mode) => get(mode ? `/v2/news/${mode}` : '/v2/news', { language }), // mode: br | stw | creative
    cosmeticsAll: () => get('/v2/cosmetics', { language }),
    cosmeticsBr: () => get('/v2/cosmetics/br', { language }),
    cosmeticsNew: () => get('/v2/cosmetics/new', { language }),
    cosmeticById: (id) => get(`/v2/cosmetics/br/${encodeURIComponent(id)}`, { language }),
    cosmeticSearch: (params) => get('/v2/cosmetics/br/search', { language, ...params }),
    cosmeticSearchAll: (params) => get('/v2/cosmetics/br/search/all', { language, ...params }),
    cosmeticsByIds: (ids) => get('/v2/cosmetics/br/search/ids', { language, id: ids.join(',') }),
    cosmeticsCars: () => get('/v2/cosmetics/cars', { language }),
    cosmeticsInstruments: () => get('/v2/cosmetics/instruments', { language }),
    cosmeticsTracks: () => get('/v2/cosmetics/tracks', { language }), // Festival jam tracks
    cosmeticsLego: () => get('/v2/cosmetics/lego', { language }),
    cosmeticsLegoKits: () => get('/v2/cosmetics/lego/kits', { language }),
    cosmeticsBeans: () => get('/v2/cosmetics/beans', { language }), // Fall Guys beans
    map: () => get('/v1/map', { language }), // current map image + POIs
    playlists: () => get('/v1/playlists', { language }),
    playlistById: (id) => get(`/v1/playlists/${encodeURIComponent(id)}`, { language }),
    banners: () => get('/v1/banners', { language }),
    bannerColors: () => get('/v1/banners/colors'),
    creatorCode: (name) => get('/v2/creatorcode', { name }),
    aes: () => get('/v2/aes'), // game file keys + current build/version
  };
}

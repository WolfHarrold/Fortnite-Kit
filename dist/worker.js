// fortnite-kit Worker + Loot Terminal page. Paste this whole file into the Cloudflare editor.
// Add the secret FORTNITE_API_COM_KEY in Settings > Variables and Secrets.

// src/http.js
var FortniteKitError = class extends Error {
  constructor(message, { status = 0, source = "", url = "", body = null } = {}) {
    super(message);
    this.name = "FortniteKitError";
    this.status = status;
    this.source = source;
    this.url = url;
    this.body = body;
  }
};
function buildUrl(base, path, params = {}) {
  const url = new URL(path.replace(/^\//, ""), base.endsWith("/") ? base : base + "/");
  for (const [k, v] of Object.entries(params)) {
    if (v === void 0 || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  return url.toString();
}
async function getJson(url, { headers = {}, timeoutMs = 15e3, fetch: f = globalThis.fetch, source = "" } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await f(url, { headers: { Accept: "application/json", ...headers }, signal: ctrl.signal });
  } catch (err) {
    throw new FortniteKitError(`Network error: ${err.message}`, { source, url });
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg = body && (body.error || body.message) || res.statusText || "Request failed";
    throw new FortniteKitError(`${source} ${res.status}: ${msg}`, { status: res.status, source, url, body });
  }
  return body;
}

// src/sources/fortniteApiCom.js
var BASE = "https://fortnite-api.com";
function createFortniteApiCom({ apiKey = "", language = "en", fetch, timeoutMs } = {}) {
  const headers = apiKey ? { Authorization: apiKey } : {};
  const get = (path, params = {}) => getJson(buildUrl(BASE, path, params), { headers, fetch, timeoutMs, source: "fortnite-api.com" }).then((r) => r?.data ?? r);
  return {
    source: "fortnite-api.com",
    // ---- Player stats (key required) ----
    // timeWindow: 'season' | 'lifetime'   accountType: 'epic' | 'psn' | 'xbl'
    // image: 'none' | 'all' | 'keyboardMouse' | 'gamepad' | 'touch' (returns a stats card image URL)
    statsByName: (name, { timeWindow = "season", accountType = "epic", image = "none" } = {}) => get("/v2/stats/br/v2", { name, accountType, timeWindow, image }),
    statsById: (accountId, { timeWindow = "season", image = "none" } = {}) => get(`/v2/stats/br/v2/${encodeURIComponent(accountId)}`, { timeWindow, image }),
    // ---- Game content (no key) ----
    shop: () => get("/v2/shop", { language }),
    news: (mode) => get(mode ? `/v2/news/${mode}` : "/v2/news", { language }),
    // mode: br | stw | creative
    cosmeticsAll: ({ responseFlags } = {}) => get("/v2/cosmetics", { language, responseFlags }),
    cosmeticsBr: ({ responseFlags } = {}) => get("/v2/cosmetics/br", { language, responseFlags }),
    cosmeticsNew: () => get("/v2/cosmetics/new", { language }),
    cosmeticById: (id, { responseFlags } = {}) => get(`/v2/cosmetics/br/${encodeURIComponent(id)}`, { language, responseFlags }),
    cosmeticSearch: (params) => get("/v2/cosmetics/br/search", { language, ...params }),
    cosmeticSearchAll: (params) => get("/v2/cosmetics/br/search/all", { language, ...params }),
    cosmeticsByIds: (ids) => get("/v2/cosmetics/br/search/ids", { language, id: ids.join(",") }),
    cosmeticsCars: () => get("/v2/cosmetics/cars", { language }),
    cosmeticsInstruments: () => get("/v2/cosmetics/instruments", { language }),
    cosmeticsTracks: () => get("/v2/cosmetics/tracks", { language }),
    // Festival jam tracks
    cosmeticsLego: () => get("/v2/cosmetics/lego", { language }),
    cosmeticsLegoKits: () => get("/v2/cosmetics/lego/kits", { language }),
    cosmeticsBeans: () => get("/v2/cosmetics/beans", { language }),
    // Fall Guys beans
    map: () => get("/v1/map", { language }),
    // current map image + POIs
    playlists: () => get("/v1/playlists", { language }),
    playlistById: (id) => get(`/v1/playlists/${encodeURIComponent(id)}`, { language }),
    banners: () => get("/v1/banners", { language }),
    bannerColors: () => get("/v1/banners/colors"),
    creatorCode: (name) => get("/v2/creatorcode", { name }),
    aes: () => get("/v2/aes")
    // game file keys + current build/version
  };
}

// src/sources/fortniteApiIo.js
var BASE2 = "https://fortniteapi.io/v1";
function createFortniteApiIo({ apiKey, lang = "en", fetch, timeoutMs } = {}) {
  if (!apiKey) throw new Error("fortniteapi.io needs an apiKey");
  const headers = { Authorization: apiKey };
  const get = (path, params = {}) => getJson(buildUrl(BASE2, path, params), { headers, fetch, timeoutMs, source: "fortniteapi.io" });
  return {
    source: "fortniteapi.io",
    // Accounts and stats
    lookup: (username, platform) => get("/lookup", { username, platform }),
    lookupUsernames: (ids) => get("/lookupUsername", { id: ids.join(",") }),
    stats: (accountId) => get("/stats", { account: accountId }),
    recentMatches: (accountId) => get("/matches", { account: accountId }),
    fishStats: (accountId) => get("/stats/fish", { accountId }),
    // Competitive
    tournaments: () => get("/events/list", { lang }),
    tournamentWindow: (windowId, page = 0) => get("/events/window", { windowId, page }),
    tournamentScores: (eventId) => get("/events/cumulative", { eventId }),
    replayLink: (sessionId) => get("/events/replay", { session: sessionId }),
    // Game data
    challenges: (season = "current") => get("/challenges", { season, lang }),
    battlePass: (season = "current") => get("/battlepass", { season, lang }),
    achievements: () => get("/achievements", { lang }),
    items: () => get("/items/list", { lang }),
    upcomingItems: () => get("/items/upcoming", { lang }),
    item: (id) => get("/items/get", { id, lang }),
    sets: () => get("/items/sets", { lang }),
    bundles: () => get("/bundles", { lang }),
    shop: () => get("/shop", { lang }),
    weapons: () => get("/weapons/list"),
    loot: () => get("/loot/list", { lang }),
    lootItem: (id) => get("/loot/get", { id, lang }),
    lootChances: (mode) => get("/loot/chances", { mode }),
    // chest/floor loot spawn chances
    fish: () => get("/loot/fish", { lang }),
    maps: () => get("/maps/list"),
    // past map images
    mapItems: () => get("/maps/items/list"),
    seasons: () => get("/seasons/list"),
    pois: () => get("/game/poi", { lang }),
    modes: () => get("/game/modes", { lang }),
    modeData: (playlist) => get("/game/modes/data", { playlist }),
    radios: () => get("/game/radios", { lang }),
    rarities: () => get("/rarities"),
    news: (type = "br") => get("/news", { type, lang }),
    status: () => get("/status"),
    featuredIslands: () => get("/creative/featured"),
    island: (code) => get("/creative/island", { code })
  };
}

// src/sources/epicEcosystem.js
var BASE3 = "https://api.fortnite.com/ecosystem/v1";
var floorHourIso = (d) => {
  const x = new Date(d);
  x.setUTCMinutes(0, 0, 0);
  return x.toISOString();
};
function createEpicEcosystem({ fetch, timeoutMs } = {}) {
  const get = (path, params = {}) => getJson(buildUrl(BASE3, path, params), { fetch, timeoutMs, source: "epic-ecosystem" });
  const api = {
    source: "epic-ecosystem",
    listIslands: ({ size = 100, after } = {}) => get("/islands", { size, after }),
    island: (code) => get(`/islands/${encodeURIComponent(code)}`),
    // interval: 'minute' | 'hour' | 'day'. Default window = last 7 days.
    metrics: (code, { interval = "day", from, to } = {}) => {
      const now = Date.now();
      const toIso = floorHourIso(to ?? now);
      const fromIso = new Date(from ?? now - 7 * 864e5).toISOString();
      return get(`/islands/${encodeURIComponent(code)}/metrics/${interval}`, { from: fromIso, to: toIso });
    },
    // Walk every page. Stops at maxPages. Waits between calls to stay under the rate limit.
    async *allIslands({ size = 1e3, maxPages = Infinity, delayMs = 200 } = {}) {
      let after;
      let pages = 0;
      do {
        const page = await api.listIslands({ size, after });
        for (const island of page?.data ?? []) yield island;
        after = page?.meta?.page?.nextCursor;
        pages += 1;
        if (after && delayMs) await new Promise((r) => setTimeout(r, delayMs));
      } while (after && pages < maxPages);
    }
  };
  return api;
}
function metricsToRows(payload) {
  const rows = /* @__PURE__ */ new Map();
  for (const [key, series] of Object.entries(payload ?? {})) {
    if (!Array.isArray(series)) continue;
    for (const p of series) {
      if (!p?.timestamp) continue;
      const row = rows.get(p.timestamp) ?? { timestamp: p.timestamp };
      if (key === "retention") {
        row.retentionD1 = p.d1 ?? null;
        row.retentionD7 = p.d7 ?? null;
      } else row[key] = p.value ?? null;
      rows.set(p.timestamp, row);
    }
  }
  return [...rows.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

// src/sources/epicStatus.js
var BASE4 = "https://status.epicgames.com/api/v2";
function createEpicStatus({ fetch, timeoutMs } = {}) {
  const get = (p) => getJson(`${BASE4}/${p}`, { fetch, timeoutMs, source: "epic-status" });
  return {
    source: "epic-status",
    summary: () => get("summary.json"),
    unresolvedIncidents: () => get("incidents/unresolved.json"),
    upcomingMaintenance: () => get("scheduled-maintenances/upcoming.json"),
    // Only the Fortnite components, as { name: status }
    async fortnite() {
      const s = await get("summary.json");
      const out = { overall: s?.status?.description ?? "unknown", components: {} };
      const all = s?.components ?? [];
      const groupIds = new Set(all.filter((c) => c.group && /fortnite/i.test(c.name)).map((c) => c.id));
      for (const c of all) {
        if (c.group) continue;
        if (groupIds.has(c.group_id) || /fortnite/i.test(c.name)) out.components[c.name] = c.status;
      }
      return out;
    }
  };
}

// src/normalize.js
var COUNT_FIELDS = ["matches", "wins", "kills", "deaths", "minutesPlayed", "score", "playersOutlived", "top3", "top5", "top6", "top10", "top12", "top25"];
var round = (n, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;
function emptyBlock() {
  return Object.fromEntries(COUNT_FIELDS.map((f) => [f, 0]));
}
function finishBlock(b) {
  if (!b) return null;
  const out = { ...emptyBlock(), ...b };
  if (!b.deaths) out.deaths = Math.max(out.matches - out.wins, 0);
  out.winRate = out.matches ? round(out.wins / out.matches * 100) : 0;
  out.kd = round(out.kills / Math.max(out.deaths, 1));
  out.killsPerMatch = out.matches ? round(out.kills / out.matches) : 0;
  out.killsPerMin = out.minutesPlayed ? round(out.kills / out.minutesPlayed, 3) : 0;
  out.scorePerMatch = out.matches ? round(out.score / out.matches) : 0;
  out.hoursPlayed = round(out.minutesPlayed / 60, 1);
  return out;
}
function pickBlock(raw) {
  if (!raw) return null;
  const b = {};
  for (const f of COUNT_FIELDS) b[f] = Number(raw[f] ?? 0);
  return finishBlock(b);
}
function fromFortniteApiCom(data, { timeWindow = "season" } = {}) {
  const s = data?.stats ?? {};
  const modes = (group) => ({
    solo: pickBlock(group?.solo),
    duo: pickBlock(group?.duo),
    trio: pickBlock(group?.trio),
    squad: pickBlock(group?.squad),
    ltm: pickBlock(group?.ltm)
  });
  return {
    source: "fortnite-api.com",
    timeWindow,
    fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
    account: { id: data?.account?.id ?? null, name: data?.account?.name ?? null },
    battlePass: data?.battlePass ?? null,
    image: data?.image ?? null,
    overall: pickBlock(s.all?.overall) ?? finishBlock(emptyBlock()),
    byMode: modes(s.all),
    byInput: {
      keyboardMouse: pickBlock(s.keyboardMouse?.overall),
      gamepad: pickBlock(s.gamepad?.overall),
      touch: pickBlock(s.touch?.overall)
    },
    byBuild: null,
    ranked: null,
    lastModified: s.all?.overall?.lastModified ?? null
  };
}

// src/cache.js
function createCache({ ttlMs = 20 * 6e4, store = /* @__PURE__ */ new Map(), now = () => Date.now() } = {}) {
  const read = async (k) => {
    const raw = await store.get(k);
    if (raw == null) return null;
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  };
  const write = async (k, entry) => store.set(k, store instanceof Map ? entry : JSON.stringify(entry));
  return {
    // Get fresh value or run loader. Returns { value, cached, savedAt, refreshAvailableAt }.
    // While the entry is fresh, a refresh is refused (cooldown) — same rule FUNAGLET uses.
    async getOrLoad(key, loader) {
      const hit = await read(key);
      const fresh = hit && now() - hit.savedAt < ttlMs;
      if (fresh) {
        return { value: hit.value, cached: true, savedAt: new Date(hit.savedAt).toISOString(), refreshAvailableAt: new Date(hit.savedAt + ttlMs).toISOString() };
      }
      const value = await loader();
      const savedAt = now();
      await write(key, { value, savedAt });
      return { value, cached: false, savedAt: new Date(savedAt).toISOString(), refreshAvailableAt: new Date(savedAt + ttlMs).toISOString() };
    }
  };
}

// src/odds.js
var clamp01 = (x) => Math.min(1, Math.max(0, x));
var perTry = (odds, multiplier = 1) => clamp01(multiplier / odds);
function chanceAtLeastOne(odds, tries, multiplier = 1) {
  const p = perTry(odds, multiplier);
  if (tries <= 0 || p === 0) return 0;
  if (p === 1) return 1;
  return 1 - Math.exp(tries * Math.log1p(-p));
}
function chanceAtLeastOneMixed(odds, segments) {
  let logNone = 0;
  for (const { tries = 0, multiplier = 1 } of segments) {
    const p = perTry(odds, multiplier);
    if (p === 1 && tries > 0) return 1;
    logNone += tries * Math.log1p(-p);
  }
  return 1 - Math.exp(logNone);
}
function triesForChance(odds, target, multiplier = 1) {
  const p = perTry(odds, multiplier);
  if (target <= 0) return 0;
  if (target >= 1 || p === 0) return Infinity;
  return Math.ceil(Math.log1p(-target) / Math.log1p(-p));
}
var expectedDrops = (odds, tries, multiplier = 1) => tries * perTry(odds, multiplier);

// src/treasure.js
var DAY = 864e5;
function eventWeek(event, now = /* @__PURE__ */ new Date()) {
  const [hh, mm] = (event.weekResetUtc ?? "00:00").split(":").map(Number);
  const start = Date.parse(`${event.start}T00:00:00Z`) + (hh * 60 + mm) * 6e4;
  const end = Date.parse(`${event.end}T23:59:59Z`);
  const len = (event.weekLengthDays ?? 7) * DAY;
  const t = Math.min(Math.max(+now, start), end);
  const weekNumber = Math.floor((t - start) / len) + 1;
  return {
    weekNumber,
    weeksElapsed: weekNumber,
    weekStart: new Date(start + (weekNumber - 1) * len).toISOString(),
    weekEnd: new Date(Math.min(start + weekNumber * len, end)).toISOString(),
    started: +now >= start,
    ended: +now > end
  };
}
function resolveChestModel(event, { chestsPerMatch, chestsPerMinute } = {}) {
  if (chestsPerMatch != null) {
    const rate = typeof chestsPerMatch === "number" ? chestsPerMatch : event.chestsPerMatch?.[chestsPerMatch];
    if (typeof rate !== "number") throw new Error(`Unknown chests-per-match preset: ${chestsPerMatch}`);
    return { method: "matches", rate };
  }
  return { method: "minutes", rate: chestsPerMinute ?? event.chestsPerMinute ?? 2 };
}
function treasureReport({ event, matches = 0, minutesPlayed = 0, chestsPerMatch, chestsPerMinute, now = /* @__PURE__ */ new Date(), splitWeekly = "even" }) {
  const model = resolveChestModel(event, { chestsPerMatch, chestsPerMinute });
  if (model.method === "minutes" && !minutesPlayed && matches) {
    throw new Error("No minutesPlayed in the stats. Pass chestsPerMatch to use the per-match method.");
  }
  const wk = eventWeek(event, now);
  const seasonChests = Math.round(model.method === "minutes" ? minutesPlayed * model.rate : matches * model.rate);
  const weekChests = splitWeekly === "even" ? Math.floor(seasonChests / Math.max(wk.weeksElapsed, 1)) : seasonChests;
  const avgMinutesPerMatch = matches ? minutesPlayed / matches : 0;
  const rewards = event.rewards.map((r) => {
    const chests = r.scope === "week" ? weekChests : seasonChests;
    const chance = chanceAtLeastOne(r.odds, chests);
    return {
      id: r.id,
      name: r.name,
      odds: r.odds,
      scope: r.scope,
      chests,
      chance,
      noChance: 1 - chance,
      expected: r.repeatable ? expectedDrops(r.odds, chests) : void 0,
      chestsFor50: triesForChance(r.odds, 0.5),
      chestsFor90: triesForChance(r.odds, 0.9)
    };
  });
  return {
    event: event.id,
    week: wk,
    matches,
    minutesPlayed,
    method: model.method,
    chestsPerMinute: model.method === "minutes" ? model.rate : null,
    chestsPerMatch: model.method === "matches" ? model.rate : avgMinutesPerMatch * model.rate,
    // effective
    avgMinutesPerMatch,
    seasonChests,
    weekChests,
    rewards
  };
}
function planTreasure({
  event,
  report,
  rewardId = event.rewards[0].id,
  plannedMatches = 0,
  plannedMinutes = 0,
  treasureHourMatches = 0,
  treasureHourMinutes = 0,
  treasureHour = null
}) {
  const reward = event.rewards.find((r) => r.id === rewardId);
  if (!reward) throw new Error(`Unknown reward: ${rewardId}`);
  const perMinute = report.chestsPerMinute ?? (report.avgMinutesPerMatch ? report.chestsPerMatch / report.avgMinutesPerMatch : 0);
  const chestsFor = (m, mins) => Math.round(m * report.chestsPerMatch + mins * perMinute);
  const base = reward.scope === "week" ? report.weekChests : report.seasonChests;
  const planned = chestsFor(plannedMatches, plannedMinutes);
  const thChests = chestsFor(treasureHourMatches, treasureHourMinutes);
  const mult = treasureHour == null ? 1 : reward.treasureHourMultipliers?.[treasureHour] ?? 1;
  const projected = chanceAtLeastOneMixed(reward.odds, [
    { tries: base + planned, multiplier: 1 },
    { tries: thChests, multiplier: mult }
  ]);
  return {
    rewardId,
    method: report.method,
    currentChests: base,
    plannedChests: planned,
    treasureHourChests: thChests,
    treasureHourMultiplier: mult,
    projectedTotal: base + planned + thChests,
    projectedChance: projected,
    gain: projected - chanceAtLeastOne(reward.odds, base)
  };
}

// src/kit.js
function createFortniteKit({
  fortniteApiComKey = "",
  fortniteApiIoKey = "",
  event = null,
  // treasure event JSON (data/*.json)
  fetch,
  statsTtlMs = 20 * 6e4,
  contentTtlMs = 60 * 6e4,
  cacheStore
} = {}) {
  const fapi = createFortniteApiCom({ apiKey: fortniteApiComKey, fetch });
  const fio = fortniteApiIoKey ? createFortniteApiIo({ apiKey: fortniteApiIoKey, fetch }) : null;
  const eco = createEpicEcosystem({ fetch });
  const status = createEpicStatus({ fetch });
  const statsCache = createCache({ ttlMs: statsTtlMs, store: cacheStore });
  const contentCache = createCache({ ttlMs: contentTtlMs, store: cacheStore });
  const key = (...parts) => parts.join(":").toLowerCase();
  const negStore = cacheStore ?? /* @__PURE__ */ new Map();
  const NEG_TTL = 10 * 6e4;
  const negGet = async (k) => {
    const raw = await negStore.get(`neg:${k}`);
    if (raw == null) return null;
    const e = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Date.now() - e.savedAt < NEG_TTL ? e : null;
  };
  const negSet = (k, e) => negStore.set(`neg:${k}`, negStore instanceof Map ? e : JSON.stringify(e));
  async function stats(name, { timeWindow = "season", accountType = "epic" } = {}) {
    const k = key("stats", accountType, timeWindow, name);
    const neg = await negGet(k);
    if (neg) throw new FortniteKitError(neg.message, { status: neg.status, source: "fortnite-api.com (cached error)" });
    try {
      const r = await statsCache.getOrLoad(k, async () => fromFortniteApiCom(await fapi.statsByName(name, { timeWindow, accountType }), { timeWindow }));
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
    async career(name, { accountType = "epic", withMatches = false } = {}) {
      const [season, lifetime] = await Promise.all([
        stats(name, { timeWindow: "season", accountType }),
        stats(name, { timeWindow: "lifetime", accountType })
      ]);
      let recentMatches = null;
      if (withMatches && fio && season.account.id) {
        recentMatches = await fio.recentMatches(season.account.id).catch(() => null);
      }
      return { account: season.account, battlePass: season.battlePass, season, lifetime, recentMatches };
    },
    // Default chest estimate = alive minutes x event.chestsPerMinute (2). Pass chestsPerMatch for per-match.
    async treasure(name, { chestsPerMatch, chestsPerMinute, now, accountType = "epic" } = {}) {
      if (!event) throw new Error("No treasure event loaded. Pass event: <data/*.json>");
      const season = await stats(name, { timeWindow: "season", accountType });
      const report = treasureReport({
        event,
        matches: season.overall.matches,
        minutesPlayed: season.overall.minutesPlayed,
        chestsPerMatch,
        chestsPerMinute,
        now
      });
      return { player: season.account, stats: season.overall, cache: season.cache, ...report };
    },
    plan: (args) => planTreasure({ event, ...args }),
    // Content feeds (cached 1 h by default)
    shop: () => contentCache.getOrLoad("shop", () => fapi.shop()).then((r) => r.value),
    news: (mode = "br") => contentCache.getOrLoad(key("news", mode), () => fapi.news(mode)).then((r) => r.value),
    newCosmetics: () => contentCache.getOrLoad("cosmetics:new", () => fapi.cosmeticsNew()).then((r) => r.value),
    map: () => contentCache.getOrLoad("map", () => fapi.map()).then((r) => r.value),
    serverStatus: () => status.fortnite(),
    // Official Epic island analytics
    islands: (opts) => eco.listIslands(opts),
    island: (code) => eco.island(code),
    islandMetrics: async (code, opts) => metricsToRows(await eco.metrics(code, opts))
  };
}

// worker/guard.js
var NAME_RE = /^[\p{L}\p{N} _.\-#]{2,32}$/u;
function validName(name) {
  return typeof name === "string" && NAME_RE.test(name.trim());
}
function corsHeaders(request, env) {
  const allowed = env.ALLOWED_ORIGIN;
  const origin = request.headers.get("Origin");
  if (allowed && allowed !== "*" && origin === allowed) {
    return { "Access-Control-Allow-Origin": allowed, "Access-Control-Allow-Methods": "GET, OPTIONS", Vary: "Origin" };
  }
  if (allowed === "*") return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" };
  return {};
}
function fetchSiteAllowed(request, env) {
  const site = request.headers.get("Sec-Fetch-Site");
  if (!site || site === "same-origin" || site === "none") return true;
  const origin = request.headers.get("Origin");
  return Boolean(env.ALLOWED_ORIGIN && env.ALLOWED_ORIGIN !== "*" && origin === env.ALLOWED_ORIGIN);
}
function createRateLimiter({ limit = 30, windowMs = 5 * 6e4, now = () => Date.now() } = {}) {
  const hits = /* @__PURE__ */ new Map();
  return {
    hit(key) {
      const t = now();
      const e = hits.get(key);
      if (!e || t - e.start >= windowMs) {
        hits.set(key, { start: t, count: 1 });
        if (hits.size > 5e3) {
          for (const [k, v] of hits) if (t - v.start >= windowMs) hits.delete(k);
        }
        return { ok: true, remaining: limit - 1 };
      }
      e.count += 1;
      if (e.count > limit) return { ok: false, retryAfter: Math.ceil((e.start + windowMs - t) / 1e3) };
      return { ok: true, remaining: limit - e.count };
    }
  };
}

// data/treasure-hunters-2026.json
var treasure_hunters_2026_default = {
  id: "treasure-hunters-2026",
  name: "Fortnite Treasure Hunters",
  notes: "Chapter 7 mini-season. Odds are per eligible chest. Chest estimate = alive minutes played x chestsPerMinute (Davi's observed rate: one chest every 30 s). Week boundary time is an assumption (00:00 UTC on the start date); change weekResetUtc if Epic's weekly rotation uses another hour.",
  start: "2026-11-01",
  end: "2026-12-05",
  weekResetUtc: "00:00",
  weekLengthDays: 7,
  chestsPerMinute: 2,
  chestsPerMatch: {
    funaglet: 50,
    _why: "Per-match presets. 'funaglet' copies FUNAGLET's 50 chests per Solo match. Pass chestsPerMatch to use one; otherwise the kit uses alive minutes x chestsPerMinute."
  },
  rewards: [
    {
      id: "pirate-shop-access",
      name: "Pirate Shop Access",
      odds: 137500,
      scope: "season",
      repeatable: false,
      treasureHourMultipliers: [
        1.5,
        2
      ]
    },
    {
      id: "weekly-gold-outfit",
      name: "Weekly Gold Outfit",
      odds: 1562500,
      scope: "week",
      repeatable: false,
      treasureHourMultipliers: [
        7.5,
        10
      ]
    },
    {
      id: "weekly-vehicle-decal",
      name: "Weekly Vehicle & Decal",
      odds: 7813,
      scope: "week",
      repeatable: false,
      treasureHourMultipliers: [
        10
      ]
    },
    {
      id: "weekly-pickaxe-backbling",
      name: "Weekly Pickaxe or Back Bling",
      odds: 568,
      scope: "week",
      repeatable: false,
      treasureHourMultipliers: []
    },
    {
      id: "weekly-jam-track",
      name: "Weekly Jam Track",
      odds: 391,
      scope: "week",
      repeatable: false,
      treasureHourMultipliers: []
    },
    {
      id: "weekly-loading-screen",
      name: "Weekly Loading Screen",
      odds: 272,
      scope: "week",
      repeatable: false,
      treasureHourMultipliers: []
    },
    {
      id: "gizmo",
      name: "Gizmo (any)",
      odds: 127,
      scope: "season",
      repeatable: true,
      treasureHourMultipliers: []
    }
  ],
  sources: [
    {
      title: "Epic \u2014 Fortnite Status post, 7 Nov 2026 (as reported by Playnews)",
      url: "https://www.playnews.gg/en/news/fortnite-pirate-shop-access-odds-1-in-137-500-per-chest-2x-in-treasure-hours"
    },
    {
      title: "Epic help: Pirate Treasure drop rates",
      url: "https://www.epicgames.com/help/c-34254770/c-33726977/a14361627"
    },
    {
      title: "Prima Games: schedule (1 Nov - 5 Dec)",
      url: "https://primagames.com/gaming/complete-fortnite-treasure-chest-rewards-odds-schedule"
    }
  ],
  treasureHours: [
    {
      start: "2026-11-07T19:00:00Z",
      end: "2026-11-07T21:00:00Z",
      status: "official",
      multipliers: {
        "pirate-shop-access": 1.5,
        "weekly-gold-outfit": 7.5,
        "weekly-vehicle-decal": 10
      }
    },
    {
      start: "2026-11-08T02:00:00Z",
      end: "2026-11-08T04:00:00Z",
      status: "official",
      multipliers: {
        "pirate-shop-access": 2,
        "weekly-gold-outfit": 10,
        "weekly-vehicle-decal": 10
      }
    },
    {
      start: "2026-11-14T19:00:00Z",
      end: "2026-11-14T21:00:00Z",
      status: "official",
      name: "Cursed"
    },
    {
      start: "2026-11-15T02:00:00Z",
      end: "2026-11-15T04:00:00Z",
      status: "official",
      name: "Cursed"
    },
    {
      start: "2026-11-21T19:00:00Z",
      end: "2026-11-21T21:00:00Z",
      status: "expected"
    },
    {
      start: "2026-11-22T02:00:00Z",
      end: "2026-11-22T04:00:00Z",
      status: "expected"
    },
    {
      start: "2026-11-28T19:00:00Z",
      end: "2026-11-28T21:00:00Z",
      status: "expected"
    },
    {
      start: "2026-11-29T02:00:00Z",
      end: "2026-11-29T04:00:00Z",
      status: "expected"
    }
  ],
  treasureHoursNote: "Times in UTC. 'expected' = Saturday pattern (2-4 PM and 9-11 PM US Eastern), not yet confirmed by Epic. Change status to 'official' and add multipliers when Epic posts the notice."
};

// worker/page.generated.js
var page_generated_default = '<!DOCTYPE html>\n<html lang="en-AU" data-ph="green">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>Loot Terminal</title>\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@700&family=Roboto:wght@700&family=Share+Tech+Mono&display=swap" rel="stylesheet">\n<style>\n/* Loot Terminal \u2014 Phosphor design system (one hue, four tiers, fixed zones).\n   Layout idea: header tabs + sub-tab row + scrolling content + fixed footer cells, on black. */\n:root {\n  --bg: #000000;\n  --t1: #00ff00; --t2: #00be00; --t3: #007f00; --t4: #003f00;\n  --alert: #c72d04;\n  --vignette: inset 0 0 2rem #00ff0040;\n  --focus: 0 0 0 1px #000000, 0 0 0 2px #00ff00;\n  --f-tab: "Roboto Condensed", "Arial Narrow", sans-serif;\n  --f-list: Roboto, Arial, sans-serif;\n  --f-mono: "Share Tech Mono", ui-monospace, monospace;\n  --rule: 1px; --gap: 2px; --grid: 0.5rem;\n  color-scheme: dark;\n  font-size: clamp(15px, 2.1vw, 19px);\n}\nhtml[data-ph="amber"] { --t1:#ffbf00; --t2:#be8e00; --t3:#7f5f00; --t4:#3f2f00; --vignette: inset 0 0 2rem #ffbf0040; --focus: 0 0 0 1px #000, 0 0 0 2px #ffbf00; }\nhtml[data-ph="blue"]  { --t1:#007fff; --t2:#007fff; --t3:#003f7f; --t4:#001f3f; --vignette: inset 0 0 2rem #007fff40; --focus: 0 0 0 1px #000, 0 0 0 2px #007fff; }\nhtml[data-ph="white"] { --t1:#ffffff; --t2:#bebebe; --t3:#7f7f7f; --t4:#3f3f3f; --vignette: inset 0 0 2rem #ffffff40; --focus: 0 0 0 1px #000, 0 0 0 2px #ffffff; }\n\n* { box-sizing: border-box; border-radius: 0; }\nhtml, body { height: 100%; margin: 0; background: var(--bg); color: var(--t1); }\nbody { font-family: var(--f-list); font-weight: 700; overflow: hidden; }\nbutton, input, select { font: inherit; color: inherit; background: none; border: 0; }\n:focus-visible { outline: none; box-shadow: var(--focus); }\n.glow { text-shadow: 0 0 0.4rem; }\n\n/* ---------- zones ---------- */\n/* Height comes from window.visualViewport (set in JS as --vvh): the area the browser really shows. */\n.screen { position: fixed; top: var(--vvt, 0px); left: 0; right: 0; height: var(--vvh, 100dvh); display: grid; grid-template-rows: auto auto auto minmax(0, 1fr) auto; max-width: 1100px; margin: 0 auto;\n  padding: env(safe-area-inset-top) max(16px, env(safe-area-inset-right)) env(safe-area-inset-bottom) max(16px, env(safe-area-inset-left)); }\n.brand { display: flex; justify-content: space-between; align-items: baseline; font-family: var(--f-mono); font-size: 0.72rem; color: var(--t2); padding: 0.4rem 0 0.1rem; text-transform: uppercase; letter-spacing: 0.04em; }\n.brand b { color: var(--t1); font-weight: 400; }\n\nnav.tabs { position: relative; display: flex; justify-content: space-between; padding: 0 1.1rem; border-bottom: var(--rule) solid var(--t1); height: 2rem; align-items: flex-end; }\nnav.tabs::before, nav.tabs::after { content: ""; position: absolute; bottom: calc(-1 * var(--gap) - 1px); width: var(--rule); height: var(--gap); background: var(--t1); }\nnav.tabs::before { left: 0; } nav.tabs::after { right: 0; }\n.tab { position: relative; font-family: var(--f-tab); font-size: 1.05rem; line-height: 1.6rem; text-transform: uppercase; cursor: pointer; padding: 0 0.15rem; color: var(--t1); }\n.tab.on::before { content: ""; position: absolute; left: -4px; right: -3px; bottom: -1px; height: 1px; background: var(--bg); }\n.tab.on::after { content: ""; position: absolute; left: -4px; right: -3px; bottom: -1px; height: 0.7rem; border-left: 1px solid var(--t1); border-right: 1px solid var(--t1);\n  background: linear-gradient(var(--t1), var(--t1)) left top / 3px 1px no-repeat, linear-gradient(var(--t1), var(--t1)) right top / 3px 1px no-repeat; }\n\n.subtabs { display: flex; gap: 1rem; justify-content: center; height: 1.9rem; align-items: center; margin-top: var(--gap); overflow-x: auto; scrollbar-width: none; }\n.subtabs:empty { height: 0.4rem; }\n.sub { font-family: var(--f-tab); font-size: 0.95rem; text-transform: uppercase; color: var(--t3); cursor: pointer; white-space: nowrap; transition: color calc(120ms * var(--speed, 1)) linear; }\n.sub.on { color: var(--t1); }\n\nmain { overflow-y: auto; overflow-x: hidden; padding: 0.5rem 0 0.75rem; scrollbar-color: var(--t3) transparent; scrollbar-width: thin; }\n\nfooter.foot { display: grid; gap: var(--gap); grid-auto-flow: column; grid-auto-columns: 1fr; margin: 0.35rem 0 0.5rem; }\n.cell { background: var(--t4); color: var(--t1); font-family: var(--f-tab); font-size: 0.82rem; text-transform: uppercase; padding: 0.2rem 0.5rem; display: flex; gap: 0.5rem; align-items: center; justify-content: space-between; min-height: 1.5rem; white-space: nowrap; overflow: hidden; }\n.cell .xp { flex: 1; height: 0.45rem; border: 1px solid var(--t1); max-width: 6rem; }\n.cell .xp i { display: block; height: 100%; background: var(--t1); }\n\n/* ---------- content parts ---------- */\n.prompt { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; font-family: var(--f-mono); text-transform: uppercase; margin-bottom: 0.75rem; }\n.prompt label { color: var(--t2); }\n.prompt input[type=text] { flex: 1 1 9rem; min-width: 0; border-bottom: 1px solid var(--t1); padding: 0.2rem 0.1rem; font-family: var(--f-mono); text-transform: none; }\n.btn { font-family: var(--f-tab); text-transform: uppercase; border: 1px solid var(--t1); padding: 0.15rem 0.6rem; cursor: pointer; }\n.btn:hover, .btn.on { background: var(--t1); color: var(--t4); text-shadow: none; }\n.btn:disabled { color: var(--t3); border-color: var(--t3); background: none; cursor: default; }\n.seg { display: inline-flex; border: 1px solid var(--t1); }\n.seg button { padding: 0.15rem 0.5rem; font-family: var(--f-tab); text-transform: uppercase; cursor: pointer; }\n.seg button.on { background: var(--t1); color: var(--t4); text-shadow: none; }\n\n.split { display: grid; grid-template-columns: 58% 1fr; gap: 1rem; align-items: start; }\n@media (max-width: 640px) { .split { grid-template-columns: 1fr; } }\n\n.list { list-style: none; margin: 0; padding: 0; }\n.row { position: relative; display: flex; justify-content: space-between; gap: 0.75rem; padding: 0.18rem 0.5rem 0.18rem 1.3rem; cursor: pointer; line-height: 1.35; }\n.row .r { font-variant-numeric: tabular-nums; white-space: nowrap; }\n.row.cur { background: var(--t1); color: var(--t4); text-shadow: none; }\n.row.act::before { content: ""; position: absolute; left: 0.45rem; top: 50%; width: 4px; height: 4px; margin-top: -2px; background: currentColor; }\n.row.dim { color: var(--t3); cursor: default; }\n.row .s { color: var(--t2); font-size: 0.82rem; }\n.row.cur .s { color: var(--t4); }\n\n.cards { display: grid; gap: 1px; }\n.card { background: var(--t4); padding: 0.3rem 0.55rem; display: flex; justify-content: space-between; gap: 0.75rem; font-size: 0.9rem; font-variant-numeric: tabular-nums; }\n.card.hi { outline: 1px solid var(--t1); outline-offset: -1px; }\n.card .k { color: var(--t1); text-transform: uppercase; font-family: var(--f-tab); }\n\n.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr)); gap: 0.5rem; }\n.fig { border: 1px solid var(--t3); padding: 0.45rem 0.6rem; }\n.fig .k { font-family: var(--f-tab); font-size: 0.75rem; color: var(--t2); text-transform: uppercase; }\n.fig .v { font-family: var(--f-tab); font-size: 1.65rem; line-height: 1.1; font-variant-numeric: tabular-nums; }\n.fig .n { font-size: 0.75rem; color: var(--t2); }\n\n.h { font-family: var(--f-tab); text-transform: uppercase; font-size: 0.95rem; margin: 0.9rem 0 0.4rem; display: flex; justify-content: space-between; gap: 1rem; border-bottom: 1px solid var(--t3); padding-bottom: 0.15rem; }\n.h:first-child { margin-top: 0; }\n.h .s { color: var(--t2); }\n.p { font-size: 0.88rem; color: var(--t2); max-width: 65ch; line-height: 1.45; margin: 0.3rem 0; font-weight: 700; }\n.p b { color: var(--t1); }\n.big { font-family: var(--f-tab); font-size: 2.6rem; line-height: 1; font-variant-numeric: tabular-nums; }\n\n.bar { height: 0.55rem; border: 1px solid currentColor; min-width: 3rem; flex: 1; }\n.bar i { display: block; height: 100%; background: currentColor; }\n.barrow { display: flex; align-items: center; gap: 0.6rem; }\n\n.tint { position: relative; background: var(--t1); overflow: hidden; aspect-ratio: 1; display: grid; place-items: center; }\n.tint img { width: 100%; height: 100%; object-fit: cover; mix-blend-mode: multiply; filter: grayscale(1) contrast(1.15); display: block; }\n.tint.wide { aspect-ratio: 16/9; }\n.ph { background: var(--t4); aspect-ratio: 1; display: grid; place-items: center; font-family: var(--f-mono); color: var(--t1); font-size: 1.4rem; border: 1px solid var(--t3); }\n.ph.wide { aspect-ratio: 16/9; font-size: 0.9rem; }\n/* Square item pictures stay small; wide (news/map) pictures may fill the width. */\n.tint:not(.wide):not(.map), .ph:not(.wide) { max-width: 11rem; width: 100%; margin: 0 auto; }\n\n.field { display: grid; gap: 0.25rem; margin: 0.6rem 0; }\n.field label { font-family: var(--f-tab); text-transform: uppercase; font-size: 0.85rem; color: var(--t2); }\n.field input[type=text], .field input[type=password], .field input[type=number], .field input[type=url] { border: 1px solid var(--t3); padding: 0.3rem 0.45rem; font-family: var(--f-mono); width: 100%; max-width: 28rem; }\n.field .hint { font-size: 0.78rem; color: var(--t2); max-width: 60ch; }\n.inline { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }\n\n.msg { font-family: var(--f-mono); text-transform: uppercase; padding: 0.4rem 0; }\n.alert { animation: blink calc(1s * var(--speed, 1)) steps(1) infinite; }\n@keyframes blink { 50% { color: var(--alert); } }\n.cursor::after { content: "\u25AE"; animation: blink2 0.3s steps(1) infinite; }\n@keyframes blink2 { 50% { opacity: 0; } }\n\nsvg.chart { width: 100%; height: auto; display: block; overflow: visible; }\nsvg.chart text { fill: var(--t2); font-family: var(--f-tab); font-size: 10px; }\ncanvas.map { width: 100%; height: auto; display: block; border: 1px solid var(--t3); }\n\n/* ---------- guide ---------- */\n.gsec { list-style: none; margin: 0; padding: 0; display: grid; gap: 1px; }\n.gline { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; padding: 0.4rem 0.5rem; border-bottom: 1px solid var(--t4); font-size: 0.9rem; line-height: 1.4; }\n.gtag { flex: none; font-family: var(--f-tab); font-size: 0.7rem; text-transform: uppercase; color: var(--t2); border: 1px solid var(--t2); padding: 0 0.3rem; margin-top: 0.15rem; }\n.gtag-doubt { border-style: dashed; }\n.glink { color: var(--t1); text-decoration: underline; text-underline-offset: 2px; }\n.sched { display: flex; justify-content: space-between; gap: 0.75rem; padding: 0.4rem 0.5rem; border-bottom: 1px solid var(--t4); font-variant-numeric: tabular-nums; font-size: 0.9rem; }\n.sched .r { font-family: var(--f-tab); font-size: 0.78rem; color: var(--t2); text-align: right; }\n.sched-next { outline: 1px solid var(--t1); outline-offset: -1px; }\n.sched-live { background: var(--t1); color: var(--t4); text-shadow: none; }\n.sched-live .r { color: var(--t4); }\n\n/* ---------- effects (top layers, never hide data) ---------- */\n.fx { position: fixed; inset: 0; pointer-events: none; z-index: 10; }\n.fx.scan { background: repeating-linear-gradient(to bottom, rgba(0,0,0,0.35) 0 1px, transparent 1px 2px); }\n.fx.band { background: linear-gradient(to bottom, transparent 0, color-mix(in srgb, var(--t1) 6%, transparent) 50%, transparent 100%); height: 18vh; animation: roll calc(8s * var(--speed, 1)) linear infinite; }\n@keyframes roll { from { transform: translateY(-20vh); } to { transform: translateY(110vh); } }\n.fx.vig { box-shadow: var(--vignette); }\nbody.nofx .fx { display: none; }\nbody.nofx .glow { text-shadow: none; }\n.jolt { animation: jolt 180ms steps(3) 1; }\n@keyframes jolt { 0% { transform: translateY(3px); filter: brightness(1.5) blur(0.6px); } 50% { transform: translateY(-2px); } 100% { transform: none; filter: none; } }\n\n.boot { position: fixed; inset: 0; z-index: 20; background: var(--bg); padding: 1.2rem; font-family: var(--f-mono); text-transform: uppercase; font-size: 0.8rem; color: var(--t1); overflow: hidden; cursor: pointer; }\n.boot .hex { color: var(--t2); font-size: 0.6rem; line-height: 1.15; white-space: pre; }\n\n@media (prefers-reduced-motion: reduce) {\n  .fx.band { display: none; }\n  .alert, .cursor::after { animation: none; }\n  .jolt { animation: none; }\n  .sub { transition: none; }\n}\n.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }\n</style>\n</head>\n<body class="glow">\n<div class="screen" id="screen">\n  <div class="brand"><b>LOOT TERMINAL</b><span id="modeTag">DEMO</span></div>\n  <nav class="tabs" id="tabs" aria-label="Main tabs"></nav>\n  <div class="subtabs" id="subtabs" role="tablist" aria-label="Sub tabs"></div>\n  <main id="content" tabindex="-1" aria-live="polite"></main>\n  <footer class="foot" id="footer"></footer>\n</div>\n<div id="safeProbe" aria-hidden="true" style="position:fixed;left:0;top:0;width:0;height:0;padding-bottom:env(safe-area-inset-bottom);visibility:hidden"></div>\n<div class="fx band" aria-hidden="true"></div>\n<div class="fx scan" aria-hidden="true"></div>\n<div class="fx vig" aria-hidden="true"></div>\n<script>\n(() => {\n  // src/http.js\n  var FortniteKitError = class extends Error {\n    constructor(message, { status = 0, source = "", url = "", body = null } = {}) {\n      super(message);\n      this.name = "FortniteKitError";\n      this.status = status;\n      this.source = source;\n      this.url = url;\n      this.body = body;\n    }\n  };\n  function buildUrl(base, path, params = {}) {\n    const url = new URL(path.replace(/^\\//, ""), base.endsWith("/") ? base : base + "/");\n    for (const [k, v] of Object.entries(params)) {\n      if (v === void 0 || v === null || v === "") continue;\n      url.searchParams.set(k, String(v));\n    }\n    return url.toString();\n  }\n  async function getJson(url, { headers = {}, timeoutMs = 15e3, fetch: f = globalThis.fetch, source = "" } = {}) {\n    const ctrl = new AbortController();\n    const timer = setTimeout(() => ctrl.abort(), timeoutMs);\n    let res;\n    try {\n      res = await f(url, { headers: { Accept: "application/json", ...headers }, signal: ctrl.signal });\n    } catch (err) {\n      throw new FortniteKitError(`Network error: ${err.message}`, { source, url });\n    } finally {\n      clearTimeout(timer);\n    }\n    if (res.status === 204) return null;\n    const text = await res.text();\n    let body = null;\n    try {\n      body = text ? JSON.parse(text) : null;\n    } catch {\n      body = text;\n    }\n    if (!res.ok) {\n      const msg = body && (body.error || body.message) || res.statusText || "Request failed";\n      throw new FortniteKitError(`${source} ${res.status}: ${msg}`, { status: res.status, source, url, body });\n    }\n    return body;\n  }\n\n  // src/sources/fortniteApiCom.js\n  var BASE = "https://fortnite-api.com";\n  function createFortniteApiCom({ apiKey = "", language = "en", fetch: fetch2, timeoutMs } = {}) {\n    const headers = apiKey ? { Authorization: apiKey } : {};\n    const get = (path, params = {}) => getJson(buildUrl(BASE, path, params), { headers, fetch: fetch2, timeoutMs, source: "fortnite-api.com" }).then((r) => r?.data ?? r);\n    return {\n      source: "fortnite-api.com",\n      // ---- Player stats (key required) ----\n      // timeWindow: \'season\' | \'lifetime\'   accountType: \'epic\' | \'psn\' | \'xbl\'\n      // image: \'none\' | \'all\' | \'keyboardMouse\' | \'gamepad\' | \'touch\' (returns a stats card image URL)\n      statsByName: (name, { timeWindow = "season", accountType = "epic", image = "none" } = {}) => get("/v2/stats/br/v2", { name, accountType, timeWindow, image }),\n      statsById: (accountId, { timeWindow = "season", image = "none" } = {}) => get(`/v2/stats/br/v2/${encodeURIComponent(accountId)}`, { timeWindow, image }),\n      // ---- Game content (no key) ----\n      shop: () => get("/v2/shop", { language }),\n      news: (mode) => get(mode ? `/v2/news/${mode}` : "/v2/news", { language }),\n      // mode: br | stw | creative\n      cosmeticsAll: ({ responseFlags } = {}) => get("/v2/cosmetics", { language, responseFlags }),\n      cosmeticsBr: ({ responseFlags } = {}) => get("/v2/cosmetics/br", { language, responseFlags }),\n      cosmeticsNew: () => get("/v2/cosmetics/new", { language }),\n      cosmeticById: (id, { responseFlags } = {}) => get(`/v2/cosmetics/br/${encodeURIComponent(id)}`, { language, responseFlags }),\n      cosmeticSearch: (params) => get("/v2/cosmetics/br/search", { language, ...params }),\n      cosmeticSearchAll: (params) => get("/v2/cosmetics/br/search/all", { language, ...params }),\n      cosmeticsByIds: (ids) => get("/v2/cosmetics/br/search/ids", { language, id: ids.join(",") }),\n      cosmeticsCars: () => get("/v2/cosmetics/cars", { language }),\n      cosmeticsInstruments: () => get("/v2/cosmetics/instruments", { language }),\n      cosmeticsTracks: () => get("/v2/cosmetics/tracks", { language }),\n      // Festival jam tracks\n      cosmeticsLego: () => get("/v2/cosmetics/lego", { language }),\n      cosmeticsLegoKits: () => get("/v2/cosmetics/lego/kits", { language }),\n      cosmeticsBeans: () => get("/v2/cosmetics/beans", { language }),\n      // Fall Guys beans\n      map: () => get("/v1/map", { language }),\n      // current map image + POIs\n      playlists: () => get("/v1/playlists", { language }),\n      playlistById: (id) => get(`/v1/playlists/${encodeURIComponent(id)}`, { language }),\n      banners: () => get("/v1/banners", { language }),\n      bannerColors: () => get("/v1/banners/colors"),\n      creatorCode: (name) => get("/v2/creatorcode", { name }),\n      aes: () => get("/v2/aes")\n      // game file keys + current build/version\n    };\n  }\n\n  // src/sources/epicStatus.js\n  var BASE2 = "https://status.epicgames.com/api/v2";\n  function createEpicStatus({ fetch: fetch2, timeoutMs } = {}) {\n    const get = (p) => getJson(`${BASE2}/${p}`, { fetch: fetch2, timeoutMs, source: "epic-status" });\n    return {\n      source: "epic-status",\n      summary: () => get("summary.json"),\n      unresolvedIncidents: () => get("incidents/unresolved.json"),\n      upcomingMaintenance: () => get("scheduled-maintenances/upcoming.json"),\n      // Only the Fortnite components, as { name: status }\n      async fortnite() {\n        const s = await get("summary.json");\n        const out = { overall: s?.status?.description ?? "unknown", components: {} };\n        const all = s?.components ?? [];\n        const groupIds = new Set(all.filter((c) => c.group && /fortnite/i.test(c.name)).map((c) => c.id));\n        for (const c of all) {\n          if (c.group) continue;\n          if (groupIds.has(c.group_id) || /fortnite/i.test(c.name)) out.components[c.name] = c.status;\n        }\n        return out;\n      }\n    };\n  }\n\n  // src/normalize.js\n  var COUNT_FIELDS = ["matches", "wins", "kills", "deaths", "minutesPlayed", "score", "playersOutlived", "top3", "top5", "top6", "top10", "top12", "top25"];\n  var round = (n2, dp = 2) => Math.round(n2 * 10 ** dp) / 10 ** dp;\n  function emptyBlock() {\n    return Object.fromEntries(COUNT_FIELDS.map((f) => [f, 0]));\n  }\n  function finishBlock(b) {\n    if (!b) return null;\n    const out = { ...emptyBlock(), ...b };\n    if (!b.deaths) out.deaths = Math.max(out.matches - out.wins, 0);\n    out.winRate = out.matches ? round(out.wins / out.matches * 100) : 0;\n    out.kd = round(out.kills / Math.max(out.deaths, 1));\n    out.killsPerMatch = out.matches ? round(out.kills / out.matches) : 0;\n    out.killsPerMin = out.minutesPlayed ? round(out.kills / out.minutesPlayed, 3) : 0;\n    out.scorePerMatch = out.matches ? round(out.score / out.matches) : 0;\n    out.hoursPlayed = round(out.minutesPlayed / 60, 1);\n    return out;\n  }\n  function pickBlock(raw) {\n    if (!raw) return null;\n    const b = {};\n    for (const f of COUNT_FIELDS) b[f] = Number(raw[f] ?? 0);\n    return finishBlock(b);\n  }\n  function fromFortniteApiCom(data, { timeWindow = "season" } = {}) {\n    const s = data?.stats ?? {};\n    const modes = (group) => ({\n      solo: pickBlock(group?.solo),\n      duo: pickBlock(group?.duo),\n      trio: pickBlock(group?.trio),\n      squad: pickBlock(group?.squad),\n      ltm: pickBlock(group?.ltm)\n    });\n    return {\n      source: "fortnite-api.com",\n      timeWindow,\n      fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),\n      account: { id: data?.account?.id ?? null, name: data?.account?.name ?? null },\n      battlePass: data?.battlePass ?? null,\n      image: data?.image ?? null,\n      overall: pickBlock(s.all?.overall) ?? finishBlock(emptyBlock()),\n      byMode: modes(s.all),\n      byInput: {\n        keyboardMouse: pickBlock(s.keyboardMouse?.overall),\n        gamepad: pickBlock(s.gamepad?.overall),\n        touch: pickBlock(s.touch?.overall)\n      },\n      byBuild: null,\n      ranked: null,\n      lastModified: s.all?.overall?.lastModified ?? null\n    };\n  }\n\n  // src/odds.js\n  var clamp01 = (x) => Math.min(1, Math.max(0, x));\n  var perTry = (odds, multiplier = 1) => clamp01(multiplier / odds);\n  function chanceAtLeastOne(odds, tries, multiplier = 1) {\n    const p = perTry(odds, multiplier);\n    if (tries <= 0 || p === 0) return 0;\n    if (p === 1) return 1;\n    return 1 - Math.exp(tries * Math.log1p(-p));\n  }\n  function chanceAtLeastOneMixed(odds, segments) {\n    let logNone = 0;\n    for (const { tries = 0, multiplier = 1 } of segments) {\n      const p = perTry(odds, multiplier);\n      if (p === 1 && tries > 0) return 1;\n      logNone += tries * Math.log1p(-p);\n    }\n    return 1 - Math.exp(logNone);\n  }\n  function triesForChance(odds, target, multiplier = 1) {\n    const p = perTry(odds, multiplier);\n    if (target <= 0) return 0;\n    if (target >= 1 || p === 0) return Infinity;\n    return Math.ceil(Math.log1p(-target) / Math.log1p(-p));\n  }\n  var expectedDrops = (odds, tries, multiplier = 1) => tries * perTry(odds, multiplier);\n  var pct = (x, dp = 2) => `${(x * 100).toFixed(dp)}%`;\n\n  // src/treasure.js\n  var DAY = 864e5;\n  function eventWeek(event, now = /* @__PURE__ */ new Date()) {\n    const [hh, mm] = (event.weekResetUtc ?? "00:00").split(":").map(Number);\n    const start2 = Date.parse(`${event.start}T00:00:00Z`) + (hh * 60 + mm) * 6e4;\n    const end = Date.parse(`${event.end}T23:59:59Z`);\n    const len = (event.weekLengthDays ?? 7) * DAY;\n    const t = Math.min(Math.max(+now, start2), end);\n    const weekNumber = Math.floor((t - start2) / len) + 1;\n    return {\n      weekNumber,\n      weeksElapsed: weekNumber,\n      weekStart: new Date(start2 + (weekNumber - 1) * len).toISOString(),\n      weekEnd: new Date(Math.min(start2 + weekNumber * len, end)).toISOString(),\n      started: +now >= start2,\n      ended: +now > end\n    };\n  }\n  function resolveChestModel(event, { chestsPerMatch, chestsPerMinute } = {}) {\n    if (chestsPerMatch != null) {\n      const rate = typeof chestsPerMatch === "number" ? chestsPerMatch : event.chestsPerMatch?.[chestsPerMatch];\n      if (typeof rate !== "number") throw new Error(`Unknown chests-per-match preset: ${chestsPerMatch}`);\n      return { method: "matches", rate };\n    }\n    return { method: "minutes", rate: chestsPerMinute ?? event.chestsPerMinute ?? 2 };\n  }\n  function treasureReport({ event, matches = 0, minutesPlayed = 0, chestsPerMatch, chestsPerMinute, now = /* @__PURE__ */ new Date(), splitWeekly = "even" }) {\n    const model = resolveChestModel(event, { chestsPerMatch, chestsPerMinute });\n    if (model.method === "minutes" && !minutesPlayed && matches) {\n      throw new Error("No minutesPlayed in the stats. Pass chestsPerMatch to use the per-match method.");\n    }\n    const wk = eventWeek(event, now);\n    const seasonChests = Math.round(model.method === "minutes" ? minutesPlayed * model.rate : matches * model.rate);\n    const weekChests = splitWeekly === "even" ? Math.floor(seasonChests / Math.max(wk.weeksElapsed, 1)) : seasonChests;\n    const avgMinutesPerMatch = matches ? minutesPlayed / matches : 0;\n    const rewards = event.rewards.map((r) => {\n      const chests = r.scope === "week" ? weekChests : seasonChests;\n      const chance = chanceAtLeastOne(r.odds, chests);\n      return {\n        id: r.id,\n        name: r.name,\n        odds: r.odds,\n        scope: r.scope,\n        chests,\n        chance,\n        noChance: 1 - chance,\n        expected: r.repeatable ? expectedDrops(r.odds, chests) : void 0,\n        chestsFor50: triesForChance(r.odds, 0.5),\n        chestsFor90: triesForChance(r.odds, 0.9)\n      };\n    });\n    return {\n      event: event.id,\n      week: wk,\n      matches,\n      minutesPlayed,\n      method: model.method,\n      chestsPerMinute: model.method === "minutes" ? model.rate : null,\n      chestsPerMatch: model.method === "matches" ? model.rate : avgMinutesPerMatch * model.rate,\n      // effective\n      avgMinutesPerMatch,\n      seasonChests,\n      weekChests,\n      rewards\n    };\n  }\n  function planTreasure({\n    event,\n    report: report2,\n    rewardId = event.rewards[0].id,\n    plannedMatches = 0,\n    plannedMinutes = 0,\n    treasureHourMatches = 0,\n    treasureHourMinutes = 0,\n    treasureHour = null\n  }) {\n    const reward = event.rewards.find((r) => r.id === rewardId);\n    if (!reward) throw new Error(`Unknown reward: ${rewardId}`);\n    const perMinute = report2.chestsPerMinute ?? (report2.avgMinutesPerMatch ? report2.chestsPerMatch / report2.avgMinutesPerMatch : 0);\n    const chestsFor = (m, mins) => Math.round(m * report2.chestsPerMatch + mins * perMinute);\n    const base = reward.scope === "week" ? report2.weekChests : report2.seasonChests;\n    const planned = chestsFor(plannedMatches, plannedMinutes);\n    const thChests = chestsFor(treasureHourMatches, treasureHourMinutes);\n    const mult = treasureHour == null ? 1 : reward.treasureHourMultipliers?.[treasureHour] ?? 1;\n    const projected = chanceAtLeastOneMixed(reward.odds, [\n      { tries: base + planned, multiplier: 1 },\n      { tries: thChests, multiplier: mult }\n    ]);\n    return {\n      rewardId,\n      method: report2.method,\n      currentChests: base,\n      plannedChests: planned,\n      treasureHourChests: thChests,\n      treasureHourMultiplier: mult,\n      projectedTotal: base + planned + thChests,\n      projectedChance: projected,\n      gain: projected - chanceAtLeastOne(reward.odds, base)\n    };\n  }\n  function treasureHourSessions(event, now = /* @__PURE__ */ new Date()) {\n    const t = +now;\n    let nextMarked = false;\n    return [...event.treasureHours ?? []].sort((a, b) => Date.parse(a.start) - Date.parse(b.start)).map((s) => {\n      const start2 = Date.parse(s.start);\n      const end = Date.parse(s.end);\n      let state = "upcoming";\n      if (t >= end) state = "past";\n      else if (t >= start2) state = "live";\n      else if (!nextMarked) {\n        state = "next";\n        nextMarked = true;\n      }\n      return { ...s, state, startsInMs: Math.max(0, start2 - t), endsInMs: Math.max(0, end - t) };\n    });\n  }\n\n  // src/content.js\n  function normalizeShop(data) {\n    const entries = data?.entries ?? [];\n    return entries.map((e) => {\n      const br = e.brItems ?? [];\n      const first = br[0] ?? e.tracks?.[0] ?? e.cars?.[0] ?? e.instruments?.[0] ?? e.legoKits?.[0] ?? {};\n      const kind = e.bundle ? "Bundle" : br.length ? br[0]?.type?.displayValue ?? "Item" : e.tracks?.length ? "Jam Track" : e.cars?.length ? "Car" : e.instruments?.length ? "Instrument" : e.legoKits?.length ? "LEGO Kit" : "Item";\n      const image = e.newDisplayAsset?.renderImages?.[0]?.image ?? e.bundle?.image ?? br[0]?.images?.featured ?? br[0]?.images?.icon ?? e.tracks?.[0]?.albumArt ?? e.cars?.[0]?.images?.large ?? e.instruments?.[0]?.images?.large ?? e.legoKits?.[0]?.images?.large ?? null;\n      return {\n        id: e.offerId ?? e.devName ?? first.id ?? first.name,\n        name: e.bundle?.name ?? first.name ?? first.title ?? "Unknown",\n        kind,\n        rarity: br[0]?.rarity?.displayValue ?? null,\n        price: e.finalPrice ?? null,\n        regularPrice: e.regularPrice ?? null,\n        onSale: e.finalPrice != null && e.regularPrice != null && e.finalPrice < e.regularPrice,\n        image,\n        section: e.layout?.name ?? null,\n        inDate: e.inDate ?? null,\n        outDate: e.outDate ?? null,\n        items: br.length + (e.tracks?.length ?? 0) + (e.cars?.length ?? 0) + (e.instruments?.length ?? 0) + (e.legoKits?.length ?? 0)\n      };\n    });\n  }\n  function normalizeNews(data) {\n    const list = data?.motds ?? data?.messages ?? [];\n    return list.filter((m) => !m.hidden).sort((a, b) => (b.sortingPriority ?? 0) - (a.sortingPriority ?? 0)).map((m) => ({ id: m.id ?? m.title, title: m.title ?? m.tabTitle ?? "", body: m.body ?? "", image: m.image ?? null, tileImage: m.tileImage ?? null }));\n  }\n  function normalizeMap(data) {\n    return {\n      image: data?.images?.pois ?? null,\n      imageBlank: data?.images?.blank ?? null,\n      pois: (data?.pois ?? []).map((p) => ({\n        id: p.id,\n        name: p.name,\n        x: p.location?.x ?? 0,\n        y: p.location?.y ?? 0,\n        named: /\\.POI\\./i.test(p.id ?? "")\n        // named POI vs landmark\n      }))\n    };\n  }\n\n  // src/cache.js\n  function createCache({ ttlMs = 20 * 6e4, store = /* @__PURE__ */ new Map(), now = () => Date.now() } = {}) {\n    const read = async (k) => {\n      const raw = await store.get(k);\n      if (raw == null) return null;\n      return typeof raw === "string" ? JSON.parse(raw) : raw;\n    };\n    const write = async (k, entry) => store.set(k, store instanceof Map ? entry : JSON.stringify(entry));\n    return {\n      // Get fresh value or run loader. Returns { value, cached, savedAt, refreshAvailableAt }.\n      // While the entry is fresh, a refresh is refused (cooldown) \u2014 same rule FUNAGLET uses.\n      async getOrLoad(key, loader) {\n        const hit = await read(key);\n        const fresh = hit && now() - hit.savedAt < ttlMs;\n        if (fresh) {\n          return { value: hit.value, cached: true, savedAt: new Date(hit.savedAt).toISOString(), refreshAvailableAt: new Date(hit.savedAt + ttlMs).toISOString() };\n        }\n        const value = await loader();\n        const savedAt = now();\n        await write(key, { value, savedAt });\n        return { value, cached: false, savedAt: new Date(savedAt).toISOString(), refreshAvailableAt: new Date(savedAt + ttlMs).toISOString() };\n      }\n    };\n  }\n\n  // data/treasure-hunters-2026.json\n  var treasure_hunters_2026_default = {\n    id: "treasure-hunters-2026",\n    name: "Fortnite Treasure Hunters",\n    notes: "Chapter 7 mini-season. Odds are per eligible chest. Chest estimate = alive minutes played x chestsPerMinute (Davi\'s observed rate: one chest every 30 s). Week boundary time is an assumption (00:00 UTC on the start date); change weekResetUtc if Epic\'s weekly rotation uses another hour.",\n    start: "2026-11-01",\n    end: "2026-12-05",\n    weekResetUtc: "00:00",\n    weekLengthDays: 7,\n    chestsPerMinute: 2,\n    chestsPerMatch: {\n      funaglet: 50,\n      _why: "Per-match presets. \'funaglet\' copies FUNAGLET\'s 50 chests per Solo match. Pass chestsPerMatch to use one; otherwise the kit uses alive minutes x chestsPerMinute."\n    },\n    rewards: [\n      {\n        id: "pirate-shop-access",\n        name: "Pirate Shop Access",\n        odds: 137500,\n        scope: "season",\n        repeatable: false,\n        treasureHourMultipliers: [\n          1.5,\n          2\n        ]\n      },\n      {\n        id: "weekly-gold-outfit",\n        name: "Weekly Gold Outfit",\n        odds: 1562500,\n        scope: "week",\n        repeatable: false,\n        treasureHourMultipliers: [\n          7.5,\n          10\n        ]\n      },\n      {\n        id: "weekly-vehicle-decal",\n        name: "Weekly Vehicle & Decal",\n        odds: 7813,\n        scope: "week",\n        repeatable: false,\n        treasureHourMultipliers: [\n          10\n        ]\n      },\n      {\n        id: "weekly-pickaxe-backbling",\n        name: "Weekly Pickaxe or Back Bling",\n        odds: 568,\n        scope: "week",\n        repeatable: false,\n        treasureHourMultipliers: []\n      },\n      {\n        id: "weekly-jam-track",\n        name: "Weekly Jam Track",\n        odds: 391,\n        scope: "week",\n        repeatable: false,\n        treasureHourMultipliers: []\n      },\n      {\n        id: "weekly-loading-screen",\n        name: "Weekly Loading Screen",\n        odds: 272,\n        scope: "week",\n        repeatable: false,\n        treasureHourMultipliers: []\n      },\n      {\n        id: "gizmo",\n        name: "Gizmo (any)",\n        odds: 127,\n        scope: "season",\n        repeatable: true,\n        treasureHourMultipliers: []\n      }\n    ],\n    sources: [\n      {\n        title: "Epic \\u2014 Fortnite Status post, 7 Nov 2026 (as reported by Playnews)",\n        url: "https://www.playnews.gg/en/news/fortnite-pirate-shop-access-odds-1-in-137-500-per-chest-2x-in-treasure-hours"\n      },\n      {\n        title: "Epic help: Pirate Treasure drop rates",\n        url: "https://www.epicgames.com/help/c-34254770/c-33726977/a14361627"\n      },\n      {\n        title: "Prima Games: schedule (1 Nov - 5 Dec)",\n        url: "https://primagames.com/gaming/complete-fortnite-treasure-chest-rewards-odds-schedule"\n      }\n    ],\n    treasureHours: [\n      {\n        start: "2026-11-07T19:00:00Z",\n        end: "2026-11-07T21:00:00Z",\n        status: "official",\n        multipliers: {\n          "pirate-shop-access": 1.5,\n          "weekly-gold-outfit": 7.5,\n          "weekly-vehicle-decal": 10\n        }\n      },\n      {\n        start: "2026-11-08T02:00:00Z",\n        end: "2026-11-08T04:00:00Z",\n        status: "official",\n        multipliers: {\n          "pirate-shop-access": 2,\n          "weekly-gold-outfit": 10,\n          "weekly-vehicle-decal": 10\n        }\n      },\n      {\n        start: "2026-11-14T19:00:00Z",\n        end: "2026-11-14T21:00:00Z",\n        status: "official",\n        name: "Cursed"\n      },\n      {\n        start: "2026-11-15T02:00:00Z",\n        end: "2026-11-15T04:00:00Z",\n        status: "official",\n        name: "Cursed"\n      },\n      {\n        start: "2026-11-21T19:00:00Z",\n        end: "2026-11-21T21:00:00Z",\n        status: "expected"\n      },\n      {\n        start: "2026-11-22T02:00:00Z",\n        end: "2026-11-22T04:00:00Z",\n        status: "expected"\n      },\n      {\n        start: "2026-11-28T19:00:00Z",\n        end: "2026-11-28T21:00:00Z",\n        status: "expected"\n      },\n      {\n        start: "2026-11-29T02:00:00Z",\n        end: "2026-11-29T04:00:00Z",\n        status: "expected"\n      }\n    ],\n    treasureHoursNote: "Times in UTC. \'expected\' = Saturday pattern (2-4 PM and 9-11 PM US Eastern), not yet confirmed by Epic. Change status to \'official\' and add multipliers when Epic posts the notice."\n  };\n\n  // data/guide-treasure-hunters-2026.json\n  var guide_treasure_hunters_2026_default = {\n    event: "treasure-hunters-2026",\n    checked: "2026-11-18",\n    tags: {\n      EPIC: "Said by Epic",\n      REPORTED: "Reported by trusted Fortnite sites",\n      TIP: "Our advice from the data",\n      MYTH: "Claim with no support",\n      RUMOUR: "Not confirmed"\n    },\n    sections: [\n      {\n        id: "plan",\n        label: "Game Plan",\n        lines: [\n          {\n            t: "Play squads together. Rewards go to the whole squad, so each chest any of you opens is a roll for all of you.",\n            tag: "REPORTED"\n          },\n          {\n            t: "Play Battle Royale or Zero Build. Ranked also counts.",\n            tag: "REPORTED"\n          },\n          {\n            t: "Land at Lantern Landing for chests, or Skull Lagoon for fewer players.",\n            tag: "TIP"\n          },\n          {\n            t: "Equip a Fortune Sprite. It shows nearby chests.",\n            tag: "REPORTED"\n          },\n          {\n            t: "Open every chest on your route. Go back when chests refill.",\n            tag: "REPORTED"\n          },\n          {\n            t: "Save long sessions for the second Treasure Hour session.",\n            tag: "EPIC"\n          }\n        ]\n      },\n      {\n        id: "routes",\n        label: "Chest Routes",\n        lines: [\n          {\n            t: "Most chests: Rubber Resort 47, Lantern Landing 45, Loguetown 41.",\n            tag: "REPORTED"\n          },\n          {\n            t: "Route: Lantern Landing, then Arlong Park, Loguetown, Cursed Cavern.",\n            tag: "REPORTED"\n          },\n          {\n            t: "South of Lantern Landing: the Frog Statue puzzle has 2 Rare Chests.",\n            tag: "REPORTED"\n          },\n          {\n            t: "Fortune\'s Fort: the secret waterfall room has Sprite Chests and Rare Chests.",\n            tag: "REPORTED"\n          },\n          {\n            t: "Crossbones Isle has 901 chest spawn spots. 243 always spawn a chest.",\n            tag: "REPORTED"\n          },\n          {\n            t: "Count chests per minute. Do not skip normal chests to chase vaults.",\n            tag: "TIP"\n          }\n        ]\n      },\n      {\n        id: "quiet",\n        label: "Quiet Routes",\n        lines: [\n          {\n            t: "Skull Lagoon: 32 chests and fewer players.",\n            tag: "REPORTED"\n          },\n          {\n            t: "Buried chests sit on shorelines and sandbars: Smuggler\'s Sandbar and the Anchor Cove beaches.",\n            tag: "REPORTED"\n          },\n          {\n            t: "The Chest POI holds 34 of the 62 mapped buried chests.",\n            tag: "REPORTED"\n          },\n          {\n            t: "Arlong Park is busy. Rubber Resort is busy since the captains took it over on 15 Nov.",\n            tag: "REPORTED"\n          },\n          {\n            t: "Jump late, away from the bus path. Loot toward the centre as the storm moves.",\n            tag: "TIP"\n          },\n          {\n            t: "Do not farm bot lobbies. Nobody reports a token from them.",\n            tag: "REPORTED"\n          }\n        ]\n      },\n      {\n        id: "sprites",\n        label: "Sprites",\n        lines: [\n          {\n            t: "Chest farming: a Fortune finish. It keeps the base ability and shows nearby chests.",\n            tag: "REPORTED"\n          },\n          {\n            t: "Chester (Epic): chance of extra chest loot, no fall damage.",\n            tag: "REPORTED"\n          },\n          {\n            t: "Plundarrgh (Mythic): speed boost each time you open a chest.",\n            tag: "REPORTED"\n          },\n          {\n            t: "Wayfinder (Rare): shows nearby Sprites, more Buried Chest loot.",\n            tag: "REPORTED"\n          },\n          {\n            t: "Squads: Lil\' Uzi Vert Jr. (team heal) or Transponder Snail (shared materials).",\n            tag: "REPORTED"\n          },\n          {\n            t: "Fights: Re-Pete (best overall) or Lil\' Flacko (shockwave when you land).",\n            tag: "REPORTED"\n          },\n          {\n            t: "Cursed finish: water damages you. Do not use it near water.",\n            tag: "REPORTED"\n          },\n          {\n            t: "No Sprite changes treasure odds. Sprites only get you to more chests.",\n            tag: "TIP"\n          }\n        ]\n      },\n      {\n        id: "hours",\n        label: "Treasure Hours",\n        schedule: true,\n        lines: [\n          {\n            t: "Saturdays in the US: 2 to 4 PM and 9 to 11 PM Eastern. In Australia that is Sunday morning and Sunday afternoon.",\n            tag: "EPIC"\n          },\n          {\n            t: "Treasure Hours follow the Power Hours pattern Epic has used since Chapter 6 Season 3: two Saturday sessions with special modifiers. Most were 2 to 4 PM and 9 to 11 PM Eastern.",\n            tag: "REPORTED"\n          },\n          {\n            t: "7 Nov boosts: token 1.5x in session 1 and 2x in session 2.",\n            tag: "EPIC"\n          },\n          {\n            t: "Boosts change each week. Read Epic\'s notice before you play.",\n            tag: "EPIC"\n          },\n          {\n            t: "A map fragment came during the 14 Nov Treasure Hours.",\n            tag: "REPORTED"\n          }\n        ]\n      },\n      {\n        id: "modes",\n        label: "Modes",\n        lines: [\n          {\n            t: "Token: Battle Royale and Zero Build, any team size, ranked or not.",\n            tag: "REPORTED"\n          },\n          {\n            t: "Reload, OG and bot lobbies: not confirmed for the token.",\n            tag: "REPORTED"\n          },\n          {\n            t: "Respawn Rumble: small prizes reported, no token yet.",\n            tag: "REPORTED"\n          },\n          {\n            t: "Fast XP: Creative XP islands give up to 4,000,000 XP a week (50 levels). No treasure there.",\n            tag: "REPORTED"\n          },\n          {\n            t: "Weekly quests: 20,000 XP each. New quests every Thursday 9 AM Eastern (Friday 1 AM in Sydney).",\n            tag: "REPORTED"\n          },\n          {\n            t: "One Battle Pass level = 80,000 XP.",\n            tag: "REPORTED"\n          },\n          {\n            t: "The season ends on 5 Dec 2026.",\n            tag: "EPIC"\n          }\n        ]\n      },\n      {\n        id: "myths",\n        label: "Myths",\n        lines: [\n          {\n            t: \'"Looting in the storm lowers token odds." No evidence. Epic says rates do not change during the day, except in Treasure Hours.\',\n            tag: "MYTH"\n          },\n          {\n            t: `"The token only drops on Captain\'s Days." Leakers debunked it.`,\n            tag: "MYTH"\n          },\n          {\n            t: \'"New or low-skill accounts get better odds." False. Epic says every player has an equal chance.\',\n            tag: "MYTH"\n          },\n          {\n            t: \'"Datamined odds." Nothing in the game files shows the odds. Epic published 1 in 137,500.\',\n            tag: "MYTH"\n          },\n          {\n            t: "Token compasses, finder tools and bought accounts are scams.",\n            tag: "MYTH"\n          },\n          {\n            t: \'"Only some chest types count." Reports name Treasure, Buried, Sprite and Rare chests. Epic has not confirmed.\',\n            tag: "RUMOUR"\n          }\n        ]\n      },\n      {\n        id: "sources",\n        label: "Sources",\n        links: [\n          {\n            title: "Dexerto: best landing spots",\n            url: "https://www.dexerto.com/fortnite/fortnite-best-landing-spots-loot-locations-1474008/"\n          },\n          {\n            title: "ChestTracker: chest locations",\n            url: "https://chesttracker.cc/chest-locations"\n          },\n          {\n            title: "Fortnite Wiki: Treasure Hunters",\n            url: "https://fortnite.weirdgloop.org/w/Treasure_Hunters"\n          },\n          {\n            title: "AccountShark: Treasure Hunters sprites",\n            url: "https://accountshark.net/blog/fortnite-chapter-7-season-5-sprites"\n          },\n          {\n            title: "The Spike: token odds and Treasure Hours",\n            url: "https://www.thespike.gg/fortnite/beginner-guides/fortnite-pirate-token-odds"\n          },\n          {\n            title: "Yahoo: Treasure Hours times",\n            url: "https://tech.yahoo.com/gaming/articles/fortnite-treasure-hours-november-7-094849027.html"\n          },\n          {\n            title: "PirateToken.net: myths checked",\n            url: "https://piratetoken.net/pirate-token-myths"\n          },\n          {\n            title: "Forbes: odds clarified",\n            url: "https://www.forbes.com/sites/paultassi/2026/11/04/fortnite-clarifies-the-odds-of-opening-a-pirate-shop-token-chest/"\n          },\n          {\n            title: "LFCarry: level up fast",\n            url: "https://lfcarry.com/guides/fortnite-level-up-fast"\n          },\n          {\n            title: "Fortnite Wiki: Power Hours",\n            url: "https://fortnite.fandom.com/wiki/Power_Hours"\n          },\n          {\n            title: "Fortnite Wiki: Rarest Item Shop Cosmetics",\n            url: "https://fortnite.fandom.com/wiki/Rarest_Item_Shop_Cosmetics"\n          }\n        ]\n      }\n    ]\n  };\n\n  // src/rarity.js\n  var DAY2 = 864e5;\n  var BR_LABELS = {\n    outfit: "Outfits",\n    backpack: "Back Blings",\n    petcarrier: "Back Blings",\n    pickaxe: "Pickaxes",\n    glider: "Gliders",\n    emote: "Emotes",\n    emoji: "Emoticons",\n    spray: "Sprays",\n    toy: "Toys",\n    banner: "Banners",\n    shoe: "Kicks",\n    wrap: "Wraps",\n    music: "Lobby Music",\n    contrail: "Contrails",\n    loadingscreen: "Loading Screens",\n    sidekick: "Sidekicks",\n    aura: "Auras"\n  };\n  var GROUP_LABELS = {\n    body: "Cars",\n    skin: "Decals",\n    wheel: "Wheels",\n    booster: "Boosts",\n    drifttrail: "Drift Trails",\n    guitar: "Guitars",\n    bass: "Basses",\n    drum: "Drums",\n    keyboard: "Keytars",\n    mic: "Microphones"\n  };\n  var ORDER = [\n    "Outfits",\n    "Back Blings",\n    "Pickaxes",\n    "Gliders",\n    "Emotes",\n    "Contrails",\n    "Emoticons",\n    "Sprays",\n    "Toys",\n    "Banners",\n    "Kicks",\n    "Wraps",\n    "Lobby Music",\n    "Loading Screens",\n    "Sidekicks",\n    "Auras",\n    "Cars",\n    "Decals",\n    "Wheels",\n    "Boosts",\n    "Drift Trails",\n    "Jam Tracks",\n    "Guitars",\n    "Basses",\n    "Drums",\n    "Keytars",\n    "Microphones",\n    "Builds",\n    "Decor Bundles"\n  ];\n  var plural = (s) => s ? /s$/i.test(s) ? s : `${s}s` : "Other";\n  var dayKey = (iso) => String(iso).slice(0, 10);\n  var dayMs = (key) => Date.parse(`${key}T00:00:00Z`);\n  function labelFor(group, item) {\n    const v = item?.type?.value?.toLowerCase?.();\n    if (group === "tracks") return "Jam Tracks";\n    if (group === "legoKits") return /decor/i.test(item?.type?.displayValue ?? item?.type?.value ?? "") ? "Decor Bundles" : "Builds";\n    if (group === "br") return BR_LABELS[v] ?? plural(item?.type?.displayValue);\n    return GROUP_LABELS[v] ?? plural(item?.type?.displayValue);\n  }\n  function imageFor(group, item) {\n    if (group === "br") return item.images?.smallIcon ?? item.images?.icon ?? null;\n    if (group === "tracks") return item.albumArt ?? null;\n    return item.images?.small ?? item.images?.large ?? null;\n  }\n  function shopStats(history) {\n    const days = [...new Set((history ?? []).map(dayKey))].sort();\n    let stints = 0;\n    let prev = null;\n    for (const d of days) {\n      if (prev == null || dayMs(d) - dayMs(prev) > 1.5 * DAY2) stints += 1;\n      prev = d;\n    }\n    return { days, stints, firstSeen: days[0] ?? null, lastSeen: days[days.length - 1] ?? null };\n  }\n  function computeRarity(all, shop, { now = /* @__PURE__ */ new Date(), perCategory = 25, top = 12, minDaysAway = 500 } = {}) {\n    const today = dayKey(shop?.date ?? now.toISOString());\n    const todayMs = dayMs(today);\n    const groups = ["br", "tracks", "instruments", "cars", "legoKits"];\n    const byId = /* @__PURE__ */ new Map();\n    for (const g of groups) {\n      for (const item of all?.[g] ?? []) {\n        const st = shopStats(item.shopHistory);\n        if (!st.days.length) continue;\n        byId.set(item.id, {\n          id: item.id,\n          name: item.name ?? item.title ?? item.id,\n          type: g === "tracks" ? "Jam Track" : item.type?.displayValue ?? null,\n          category: labelFor(g, item),\n          rarity: item.rarity?.displayValue ?? null,\n          series: item.series?.value ?? null,\n          set: item.set?.value ?? null,\n          group: g,\n          image: imageFor(g, item),\n          firstSeen: st.firstSeen,\n          lastSeen: st.lastSeen,\n          daysInShop: st.days.length,\n          stints: st.stints,\n          daysAway: Math.max(0, Math.floor((todayMs - dayMs(st.lastSeen)) / DAY2)),\n          _days: st.days\n        });\n      }\n    }\n    const shopIds = /* @__PURE__ */ new Set();\n    for (const e of shop?.entries ?? []) {\n      for (const list of [e.brItems, e.tracks, e.instruments, e.cars, e.legoKits]) for (const it of list ?? []) shopIds.add(it.id);\n    }\n    const todayItems = [];\n    for (const id of shopIds) {\n      const it = byId.get(id);\n      if (!it) continue;\n      const before = it._days.filter((d) => d < today);\n      const prev = before[before.length - 1] ?? null;\n      todayItems.push({\n        id,\n        name: it.name,\n        type: it.type,\n        category: it.category,\n        rarity: it.rarity,\n        series: it.series,\n        image: it.image,\n        isNew: !prev,\n        lastSeenBefore: prev,\n        daysAway: prev ? Math.floor((todayMs - dayMs(prev)) / DAY2) : null,\n        stints: it.stints\n      });\n    }\n    todayItems.sort((a, b) => (b.daysAway ?? -1) - (a.daysAway ?? -1));\n    const clean = ({ _days, group, ...rest }) => rest;\n    const away = [...byId.values()].filter((it) => !shopIds.has(it.id) && it.daysAway >= minDaysAway).sort((a, b) => b.daysAway - a.daysAway || a.name.localeCompare(b.name));\n    const cats = /* @__PURE__ */ new Map();\n    for (const it of away) {\n      const list = cats.get(it.category) ?? [];\n      list.push(it);\n      cats.set(it.category, list);\n    }\n    const rank = (l) => {\n      const i = ORDER.indexOf(l);\n      return i < 0 ? ORDER.length : i;\n    };\n    const categories = [...cats.entries()].sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0])).map(([label, list]) => ({ label, total: list.length, items: list.slice(0, perCategory).map(clean) }));\n    return {\n      generatedAt: now.toISOString(),\n      shopDate: today,\n      source: "fortnite-api.com /v2/cosmetics shopHistory",\n      minDaysAway,\n      top12: pickTop(away, top).map(clean),\n      categories,\n      today: todayItems.filter((t) => t.isNew || t.daysAway > 1).map((t) => ({ ...t, rare: !t.isNew && t.daysAway >= minDaysAway }))\n    };\n  }\n  function pickTop(sorted, n2) {\n    const out = [];\n    for (const it of sorted) {\n      if (out.length >= n2) break;\n      const isBackBling = it.category === "Back Blings";\n      const bundled = isBackBling && it.set && out.some((o) => o.category === "Outfits" && o.set === it.set && o.lastSeen === it.lastSeen);\n      if (!bundled) out.push(it);\n    }\n    return out;\n  }\n\n  // ui/demo-data.js\n  var blk = (matches, wins, kills, minutesPlayed, extra = {}) => ({\n    score: 0,\n    scorePerMin: 0,\n    scorePerMatch: 0,\n    wins,\n    kills,\n    killsPerMin: minutesPlayed ? kills / minutesPlayed : 0,\n    killsPerMatch: matches ? kills / matches : 0,\n    deaths: matches - wins,\n    kd: kills / Math.max(matches - wins, 1),\n    matches,\n    winRate: matches ? wins / matches * 100 : 0,\n    minutesPlayed,\n    playersOutlived: 0,\n    lastModified: "2026-11-18T00:40:00Z",\n    ...extra\n  });\n  var statsPayload = ({ all, solo, duo, squad, ltm, kbm, pad: pad2, touch, bp }) => ({\n    account: { id: "0123456789abcdef0123456789abcdef", name: "LilAvlis" },\n    battlePass: bp,\n    image: null,\n    stats: {\n      all: { overall: all, solo, duo, trio: null, squad, ltm },\n      keyboardMouse: kbm ? { overall: kbm } : null,\n      gamepad: pad2 ? { overall: pad2 } : null,\n      touch: touch ? { overall: touch } : null\n    }\n  });\n  var DEMO = {\n    season: statsPayload({\n      all: blk(350, 73, 940, 4055, { top10: 180, top25: 290 }),\n      solo: blk(180, 30, 520, 2050, { top10: 92, top25: 150 }),\n      duo: blk(110, 28, 280, 1300, { top5: 55, top12: 80 }),\n      squad: blk(60, 15, 140, 705, { top3: 24, top6: 38 }),\n      ltm: null,\n      kbm: blk(300, 66, 830, 3480),\n      pad: blk(50, 7, 110, 575),\n      touch: null,\n      bp: { level: 87, progress: 42 }\n    }),\n    lifetime: statsPayload({\n      all: blk(2140, 301, 5120, 24800, { top10: 910, top25: 1530 }),\n      solo: blk(1020, 120, 2700, 11900),\n      duo: blk(640, 98, 1500, 7400),\n      squad: blk(410, 70, 820, 4800),\n      ltm: blk(70, 13, 100, 700),\n      kbm: blk(1700, 250, 4300, 19800),\n      pad: blk(400, 45, 760, 4600),\n      touch: blk(40, 6, 60, 400),\n      bp: { level: 87, progress: 42 }\n    }),\n    shop: {\n      date: "2026-11-18T00:00:00Z",\n      entries: [\n        { offerId: "demo-1", finalPrice: 1500, regularPrice: 1500, layout: { name: "Treasure Hunt" }, outDate: "2026-11-20T23:59:59Z", brItems: [{ name: "Tidewalker Captain", type: { displayValue: "Outfit" }, rarity: { displayValue: "Epic" } }] },\n        { offerId: "demo-2", finalPrice: 800, regularPrice: 1e3, layout: { name: "Treasure Hunt" }, outDate: "2026-11-20T23:59:59Z", brItems: [{ name: "Brass Compass", type: { displayValue: "Back Bling" }, rarity: { displayValue: "Rare" } }] },\n        { offerId: "demo-3", finalPrice: 2200, regularPrice: 2800, layout: { name: "Featured" }, bundle: { name: "Deep Salvage Set" }, outDate: "2026-11-19T23:59:59Z", brItems: [{ name: "Salvage Diver", type: { displayValue: "Outfit" } }, { name: "Anchor Hook", type: { displayValue: "Pickaxe" } }, { name: "Kelp Wrap", type: { displayValue: "Wrap" } }] },\n        { offerId: "demo-4", finalPrice: 500, regularPrice: 500, layout: { name: "Featured" }, brItems: [{ name: "Sextant Swing", type: { displayValue: "Pickaxe" }, rarity: { displayValue: "Uncommon" } }] },\n        { offerId: "demo-5", finalPrice: 300, regularPrice: 300, layout: { name: "Emotes" }, brItems: [{ name: "Shanty Stomp", type: { displayValue: "Emote" }, rarity: { displayValue: "Rare" } }] },\n        { offerId: "demo-6", finalPrice: 500, regularPrice: 500, layout: { name: "Jam Tracks" }, tracks: [{ title: "Low Tide Signal", artist: "Sample Artist" }] },\n        { offerId: "demo-7", finalPrice: 1200, regularPrice: 1200, layout: { name: "Rides" }, cars: [{ name: "Harbour Runner" }] },\n        { offerId: "demo-8", finalPrice: 800, regularPrice: 800, layout: { name: "Featured" }, brItems: [{ name: "Gull Glider", type: { displayValue: "Glider" }, rarity: { displayValue: "Rare" } }] }\n      ]\n    },\n    news: {\n      motds: [\n        { id: "n1", title: "Treasure Hour Tonight", body: "Boosted odds for one hour. Open as many chests as you can.", sortingPriority: 100 },\n        { id: "n2", title: "Weekly Rewards Rotated", body: "A new set of weekly treasure is in chests now.", sortingPriority: 90 },\n        { id: "n3", title: "New Jam Tracks", body: "Three new tracks are in the shop this week.", sortingPriority: 80 }\n      ]\n    },\n    map: {\n      images: { pois: null, blank: null },\n      pois: [\n        { id: "Athena.Location.POI.Demo.01", name: "Signal Ridge", location: { x: 52e3, y: -38e3 } },\n        { id: "Athena.Location.POI.Demo.02", name: "Salt Flats", location: { x: 18e3, y: 41e3 } },\n        { id: "Athena.Location.POI.Demo.03", name: "Old Pier", location: { x: -61e3, y: 22e3 } },\n        { id: "Athena.Location.POI.Demo.04", name: "Cinder Mill", location: { x: -15e3, y: -52e3 } },\n        { id: "Athena.Location.POI.Demo.05", name: "Sunken Market", location: { x: 4e3, y: 3e3 } },\n        { id: "Athena.Location.POI.Demo.06", name: "Pine Hollow", location: { x: 4e4, y: 8e3 } },\n        { id: "Athena.Location.POI.Demo.07", name: "Dockside", location: { x: -42e3, y: -12e3 } },\n        { id: "Athena.Location.UnNamedPOI.Demo.08", name: "Lighthouse Rock", location: { x: 7e4, y: 5e4 } }\n      ]\n    },\n    status: {\n      overall: "Minor Service Outage",\n      components: { "Game Services": "operational", Login: "operational", Matchmaking: "operational", Parties: "operational", "Item Shop": "degraded_performance" }\n    }\n  };\n  var run = (start2, n2) => Array.from({ length: n2 }, (_, i) => new Date(Date.parse(`${start2}T00:00:00Z`) + i * 864e5).toISOString());\n  var demoCosmetics = {\n    br: [\n      { id: "d-o1", name: "Brine Admiral", type: { value: "outfit", displayValue: "Outfit" }, rarity: { displayValue: "Legendary" }, set: { value: "Brine" }, shopHistory: [...run("2019-03-02", 2)] },\n      { id: "d-b0", name: "Brine Cape", type: { value: "backpack", displayValue: "Back Bling" }, rarity: { displayValue: "Legendary" }, set: { value: "Brine" }, shopHistory: [...run("2019-03-02", 2)] },\n      { id: "d-o2", name: "Lantern Keeper", type: { value: "outfit", displayValue: "Outfit" }, rarity: { displayValue: "Epic" }, shopHistory: [...run("2020-06-10", 3), ...run("2021-01-05", 2)] },\n      { id: "d-o3", name: "Reef Runner", type: { value: "outfit", displayValue: "Outfit" }, rarity: { displayValue: "Rare" }, shopHistory: [...run("2023-08-01", 2), ...run("2026-11-18", 1)] },\n      { id: "d-o4", name: "Tidewalker Captain", type: { value: "outfit", displayValue: "Outfit" }, rarity: { displayValue: "Epic" }, shopHistory: run("2026-11-18", 1) },\n      { id: "d-b1", name: "Barnacle Pack", type: { value: "backpack", displayValue: "Back Bling" }, rarity: { displayValue: "Rare" }, shopHistory: run("2019-11-20", 2) },\n      { id: "d-p1", name: "Anchor Axe", type: { value: "pickaxe", displayValue: "Harvesting Tool" }, rarity: { displayValue: "Uncommon" }, shopHistory: [...run("2018-12-01", 1), ...run("2022-02-02", 1)] },\n      { id: "d-g1", name: "Gull Glider", type: { value: "glider", displayValue: "Glider" }, rarity: { displayValue: "Rare" }, shopHistory: [...run("2021-05-05", 2), ...run("2026-11-18", 1)] },\n      { id: "d-e1", name: "Shanty Stomp", type: { value: "emote", displayValue: "Emote" }, rarity: { displayValue: "Rare" }, shopHistory: run("2020-02-14", 1) },\n      { id: "d-e2", name: "Plank Walk", type: { value: "emote", displayValue: "Emote" }, rarity: { displayValue: "Uncommon" }, shopHistory: run("2024-09-09", 2) },\n      { id: "d-w1", name: "Kelp Wrap", type: { value: "wrap", displayValue: "Wrap" }, rarity: { displayValue: "Rare" }, shopHistory: run("2022-07-07", 3) }\n    ],\n    tracks: [\n      { id: "d-t1", title: "Low Tide Signal", shopHistory: run("2024-01-10", 2) },\n      { id: "d-t2", title: "Harbour Lights", shopHistory: [...run("2024-03-03", 1), ...run("2026-11-18", 1)] }\n    ],\n    cars: [{ id: "d-c1", name: "Harbour Runner", type: { value: "body", displayValue: "Car Body" }, rarity: { displayValue: "Epic" }, shopHistory: run("2024-02-20", 2) }],\n    instruments: [{ id: "d-i1", name: "Driftwood Bass", type: { value: "bass", displayValue: "Bass" }, rarity: { displayValue: "Rare" }, shopHistory: run("2024-05-05", 1) }],\n    legoKits: []\n  };\n  var demoShop = { date: "2026-11-18T00:00:00Z", entries: [{ brItems: [{ id: "d-o3" }, { id: "d-o4" }, { id: "d-g1" }] }, { tracks: [{ id: "d-t2" }] }] };\n  DEMO.rarest = computeRarity(demoCosmetics, demoShop, { now: /* @__PURE__ */ new Date("2026-11-18T01:00:00Z") });\n\n  // ui/app.js\n  var LS = "lt.";\n  var RAREST_URL = "https://raw.githubusercontent.com/WolfHarrold/Fortnite-Kit/main/data/rarest.json";\n  var ls = (k, d = null) => {\n    try {\n      const v = localStorage.getItem(LS + k);\n      return v == null ? d : v;\n    } catch {\n      return d;\n    }\n  };\n  var lsSet = (k, v) => {\n    try {\n      v == null ? localStorage.removeItem(LS + k) : localStorage.setItem(LS + k, String(v));\n    } catch {\n    }\n  };\n  var lsStore = { get: (k) => ls("c." + k), set: (k, v) => lsSet("c." + k, v) };\n  var TABS = [\n    { id: "stat", label: "STAT", subs: ["SEASON", "CAREER", "MODES", "INPUT"] },\n    { id: "loot", label: "LOOT", subs: ["ODDS", "PLANNER", "METHOD", "GUIDE"] },\n    { id: "shop", label: "SHOP", subs: ["ITEMS", "RARE", "NEWS"] },\n    { id: "map", label: "MAP", subs: [] },\n    { id: "sys", label: "SYS", subs: ["STATUS", "SETTINGS"] }\n  ];\n  var S = {\n    tab: 0,\n    sub: { stat: 0, loot: 0, shop: 0, map: 0, sys: 0 },\n    cur: {},\n    mode: ls("mode", "auto"),\n    resolved: "demo",\n    key: ls("key", ""),\n    worker: ls("worker", ""),\n    theme: ls("theme", "green"),\n    fx: ls("fx", "on") === "on",\n    sound: ls("sound", "on") === "on",\n    boot: ls("boot", "on") === "on",\n    player: ls("player", ""),\n    acct: ls("acct", "epic"),\n    window: "season",\n    chest: { method: ls("chestMethod", "minutes"), rate: +ls("chestRate", treasure_hunters_2026_default.chestsPerMinute ?? 2) },\n    plan: { minutes: 60, matches: 0, thMinutes: 0, session: -1 },\n    rare: { view: "today", cat: 0 },\n    // cat 0 = TOP 12, then the categories\n    data: { career: null, shop: null, news: null, map: null, status: null, rarest: null },\n    busy: {},\n    err: {},\n    list: null\n    // { key, len } for the view on screen\n  };\n  var $ = (id) => document.getElementById(id);\n  var esc = (s) => String(s ?? "").replace(/[&<>"\']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", \'"\': "&quot;", "\'": "&#39;" })[c]);\n  var n = (x, dp = 0) => x == null || Number.isNaN(+x) ? "\\u2014" : (+x).toLocaleString("en-AU", { maximumFractionDigits: dp, minimumFractionDigits: dp });\n  var hm = (min) => {\n    const m = Math.round(min || 0);\n    return `${Math.floor(m / 60)}H ${String(m % 60).padStart(2, "0")}M`;\n  };\n  var pad = (x) => String(x).padStart(2, "0");\n  var dmy = (d) => {\n    const x = new Date(d);\n    return Number.isNaN(+x) ? "\\u2014" : `${pad(x.getDate())}.${pad(x.getMonth() + 1)}.${x.getFullYear()}`;\n  };\n  var t12 = (d) => {\n    const x = new Date(d);\n    let h = x.getHours();\n    const ap = h >= 12 ? "PM" : "AM";\n    h = h % 12 || 12;\n    return `${pad(h)}:${pad(x.getMinutes())}${ap}`;\n  };\n  var bar = (f) => `<span class="bar"><i style="width:${Math.max(0, Math.min(1, f || 0)) * 100}%"></i></span>`;\n  var reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;\n  var tabId = () => TABS[S.tab].id;\n  var subName = () => TABS[S.tab].subs[S.sub[tabId()]] ?? "";\n  var curOf = (key, len) => {\n    const i = S.cur[key] ?? 0;\n    return Math.max(0, Math.min(i, Math.max(len - 1, 0)));\n  };\n  function friendly(err) {\n    const st = err?.status ?? 0;\n    if (st === 400) return "BAD REQUEST. CHECK THE NAME AND PLATFORM.";\n    if (st === 401) return "API KEY REFUSED. CHECK THE KEY IN SYS > SETTINGS.";\n    if (st === 403) return "PRIVATE STATS OR WRONG KEY. IN FORTNITE, TURN ON SHOW ON CAREER LEADERBOARD (ACCOUNT AND PRIVACY).";\n    if (st === 404) return "PLAYER NOT FOUND OR NO STATS. CHECK THE NAME AND PLATFORM.";\n    if (st === 429) return "TOO MANY REQUESTS. WAIT ONE MINUTE.";\n    if (st === 0) return "NETWORK BLOCKED OR OFFLINE. IN THE CLAUDE APP ONLY DEMO WORKS. OPEN THE PAGE FROM YOUR WORKER.";\n    return String(err?.message ?? "ERROR").toUpperCase();\n  }\n  var demoApi = {\n    label: "DEMO DATA",\n    async career() {\n      return { season: fromFortniteApiCom(DEMO.season, { timeWindow: "season" }), lifetime: fromFortniteApiCom(DEMO.lifetime, { timeWindow: "lifetime" }), demo: true };\n    },\n    shop: async () => normalizeShop(DEMO.shop),\n    news: async () => normalizeNews(DEMO.news),\n    map: async () => normalizeMap(DEMO.map),\n    status: async () => DEMO.status,\n    rarest: async () => DEMO.rarest\n  };\n  function directApi() {\n    if (!S.key) throw Object.assign(new Error("No API key"), { status: 401 });\n    const fapi = createFortniteApiCom({ apiKey: S.key });\n    const cache = createCache({ ttlMs: 20 * 6e4, store: lsStore });\n    const stats = async (name, timeWindow) => {\n      const r = await cache.getOrLoad(`${S.acct}:${timeWindow}:${name.toLowerCase()}`, async () => fromFortniteApiCom(await fapi.statsByName(name, { timeWindow, accountType: S.acct }), { timeWindow }));\n      return { ...r.value, cache: { cached: r.cached, savedAt: r.savedAt, refreshAvailableAt: r.refreshAvailableAt } };\n    };\n    return {\n      label: "FORTNITE-API.COM",\n      career: async (name) => {\n        const [season, lifetime] = await Promise.all([stats(name, "season"), stats(name, "lifetime")]);\n        return { season, lifetime };\n      },\n      shop: async () => normalizeShop(await fapi.shop()),\n      news: async () => normalizeNews(await fapi.news("br")),\n      map: async () => normalizeMap(await fapi.map()),\n      status: () => createEpicStatus().fortnite(),\n      // Rarest list is built daily on GitHub; raw.githubusercontent.com allows browser reads.\n      rarest: () => getJson(RAREST_URL, { source: "github" })\n    };\n  }\n  function workerApi() {\n    const base = (S.worker || "").replace(/\\/+$/, "");\n    const j = (p) => getJson(`${base}${p}`, { source: "worker" });\n    return {\n      label: "WORKER",\n      career: (name) => j(`/api/career/${encodeURIComponent(name)}?accountType=${S.acct}`),\n      shop: async () => normalizeShop(await j("/api/shop")),\n      news: async () => normalizeNews(await j("/api/news/br")),\n      map: async () => normalizeMap(await j("/api/map")),\n      status: () => j("/api/status"),\n      rarest: () => j("/api/rarest")\n    };\n  }\n  var api = () => S.resolved === "demo" ? demoApi : S.resolved === "direct" ? directApi() : workerApi();\n  async function resolveMode() {\n    if (S.mode !== "auto") {\n      S.resolved = S.mode;\n      return;\n    }\n    S.resolved = "demo";\n    if (!/^https?:$/.test(location.protocol)) return;\n    try {\n      const ctrl = new AbortController();\n      setTimeout(() => ctrl.abort(), 2500);\n      const r = await fetch("/api/health", { signal: ctrl.signal });\n      const body = r.ok ? await r.json() : null;\n      if (body?.ok) {\n        S.resolved = "worker";\n        S.worker = "";\n      }\n    } catch {\n    }\n  }\n  async function load(what, ...args) {\n    S.busy[what] = true;\n    S.err[what] = null;\n    render();\n    try {\n      S.data[what] = await api()[what](...args);\n    } catch (e) {\n      S.err[what] = friendly(e);\n      S.data[what] = null;\n    } finally {\n      S.busy[what] = false;\n      render();\n    }\n  }\n  function scan(name) {\n    const nm = (name ?? "").trim() || (S.resolved === "demo" ? "LilAvlis" : "");\n    if (!nm) {\n      S.err.career = "TYPE AN EPIC NAME FIRST.";\n      render();\n      return;\n    }\n    S.player = nm;\n    lsSet("player", nm);\n    return load("career", nm);\n  }\n  function resetData() {\n    S.data = { career: null, shop: null, news: null, map: null, status: null, rarest: null };\n    S.err = {};\n  }\n  function report() {\n    const s = S.data.career?.season?.overall;\n    if (!s) return null;\n    try {\n      return treasureReport({\n        event: treasure_hunters_2026_default,\n        matches: s.matches,\n        minutesPlayed: s.minutesPlayed,\n        chestsPerMatch: S.chest.method === "funaglet" ? "funaglet" : void 0,\n        chestsPerMinute: S.chest.rate\n      });\n    } catch (e) {\n      return { error: String(e.message).toUpperCase() };\n    }\n  }\n  var methodLabel = () => S.chest.method === "funaglet" ? `FUNAGLET ${treasure_hunters_2026_default.chestsPerMatch.funaglet}/MATCH` : `${n(S.chest.rate, 1)} PER ALIVE MIN`;\n  var actx = null;\n  function click() {\n    if (!S.sound) return;\n    try {\n      actx = actx || new (window.AudioContext || window.webkitAudioContext)();\n      const t = actx.currentTime;\n      const len = Math.floor(actx.sampleRate * 0.03);\n      const buf = actx.createBuffer(1, len, actx.sampleRate);\n      const d = buf.getChannelData(0);\n      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;\n      const src = actx.createBufferSource();\n      src.buffer = buf;\n      const g = actx.createGain();\n      g.gain.value = 0.2;\n      const f = actx.createBiquadFilter();\n      f.type = "bandpass";\n      f.frequency.value = 1800;\n      src.connect(f).connect(g).connect(actx.destination);\n      src.start(t);\n      if (Math.random() < 0.7) {\n        const b2 = actx.createBufferSource();\n        b2.buffer = buf;\n        const g2 = actx.createGain();\n        g2.gain.value = 0.06;\n        b2.playbackRate.value = 0.4;\n        b2.connect(g2).connect(actx.destination);\n        b2.start(t + 0.01);\n      }\n    } catch {\n    }\n  }\n  function jolt() {\n    if (!S.fx || reducedMotion()) return;\n    const el = $("content");\n    el.classList.remove("jolt");\n    void el.offsetWidth;\n    el.classList.add("jolt");\n  }\n  function renderTabs() {\n    $("tabs").innerHTML = TABS.map((t, i) => `<button class="tab${i === S.tab ? " on" : ""}" data-tab="${i}" aria-current="${i === S.tab ? "page" : "false"}">${t.label}</button>`).join("");\n    const subs = TABS[S.tab].subs;\n    $("subtabs").innerHTML = subs.map((s, i) => `<button class="sub${i === S.sub[tabId()] ? " on" : ""}" role="tab" aria-selected="${i === S.sub[tabId()]}" data-sub="${i}">${s}</button>`).join("");\n    $("subtabs").querySelector(".sub.on")?.scrollIntoView?.({ block: "nearest", inline: "center" });\n    const src = S.resolved === "demo" ? "DEMO DATA" : S.resolved === "direct" ? "DIRECT \\xB7 YOUR KEY" : "WORKER";\n    $("modeTag").textContent = `${src}${S.mode === "auto" ? " \\xB7 AUTO" : ""}`;\n  }\n  function cell(label, value, extra = "") {\n    return `<div class="cell"><span>${label}</span>${extra}<span>${value}</span></div>`;\n  }\n  function renderFooter() {\n    const c = S.data.career;\n    const s = c?.season?.overall;\n    const now = /* @__PURE__ */ new Date();\n    let html = "";\n    switch (tabId()) {\n      case "stat": {\n        const bp = c?.season?.battlePass;\n        html = cell("WINS", s ? `${n(s.wins)}/${n(s.matches)}` : "\\u2014") + cell("BP", bp ? `LVL ${bp.level}` : "\\u2014", bp ? `<span class="xp"><i style="width:${bp.progress}%"></i></span>` : "") + cell("K/D", s ? n(s.kd, 2) : "\\u2014");\n        break;\n      }\n      case "loot": {\n        const r = report();\n        const wk = eventWeek(treasure_hunters_2026_default, now);\n        const weeks = Math.ceil((Date.parse(treasure_hunters_2026_default.end) - Date.parse(treasure_hunters_2026_default.start)) / 6048e5);\n        html = cell("CHESTS", r && !r.error ? n(r.seasonChests) : "\\u2014") + cell("WEEK", `${wk.weekNumber}/${weeks}`) + cell("TOKEN", r && !r.error ? pct(r.rewards[0].chance) : "\\u2014");\n        break;\n      }\n      case "shop": {\n        const items = S.data.shop;\n        const sale = items ? items.filter((i) => i.onSale).length : 0;\n        html = cell("ITEMS", items ? n(items.length) : "\\u2014") + cell("ON SALE", items ? n(sale) : "\\u2014");\n        break;\n      }\n      case "map":\n        html = cell("", dmy(now)) + cell("", t12(now)) + cell("POI", S.data.map ? n(S.data.map.pois.length) : "\\u2014");\n        break;\n      case "sys":\n        html = cell("MODE", S.resolved.toUpperCase()) + cell("SERVERS", S.data.status ? Object.values(S.data.status.components ?? {}).every((v) => v === "operational") ? "OK" : "CHECK" : "\\u2014");\n        break;\n    }\n    $("footer").innerHTML = html;\n  }\n  function stateLine(what, emptyText) {\n    if (S.busy[what]) return `<div class="msg">SCANNING<span class="cursor"></span></div>`;\n    if (S.err[what]) return `<div class="msg alert" role="alert">ERROR: ${esc(S.err[what])}</div>`;\n    if (!S.data[what] && emptyText) return `<div class="msg">${emptyText}</div>`;\n    return "";\n  }\n  function playerPrompt() {\n    const acct = ["epic", "psn", "xbl"].map((a) => `<button class="${a === S.acct ? "on" : ""}" data-acct="${a}">${a.toUpperCase()}</button>`).join("");\n    return `<form class="prompt" id="scanForm" autocomplete="off">\n    <label for="playerName">\\u276F PLAYER</label>\n    <input type="text" id="playerName" value="${esc(S.player || (S.resolved === "demo" ? "LilAvlis" : ""))}" placeholder="Epic name" spellcheck="false" autocapitalize="off">\n    <span class="seg" role="group" aria-label="Platform">${acct}</span>\n    <button class="btn" type="submit">SCAN</button>\n  </form>`;\n  }\n  function cacheNote(season) {\n    const ch = season?.cache;\n    if (!ch) return S.data.career?.demo ? "SAMPLE DATA" : "";\n    const mins = Math.max(0, Math.ceil((Date.parse(ch.refreshAvailableAt) - Date.now()) / 6e4));\n    return `UPDATED ${t12(ch.savedAt)}${mins ? ` \\xB7 REFRESH IN ${mins} MIN` : " \\xB7 REFRESH READY"}`;\n  }\n  var MODE_ROWS = [["solo", "Solo"], ["duo", "Duos"], ["trio", "Trios"], ["squad", "Squads"], ["ltm", "Limited Modes"]];\n  var INPUT_ROWS = [["keyboardMouse", "Keyboard and Mouse"], ["gamepad", "Controller"], ["touch", "Touch"]];\n  function blockCards(b) {\n    if (!b) return \'<div class="cards"><div class="card"><span>NO DATA</span></div></div>\';\n    const tops = ["top3", "top5", "top6", "top10", "top12", "top25"].filter((k) => b[k]).map((k) => [k.replace("top", "TOP "), n(b[k])]);\n    const rows = [\n      ["MATCHES", n(b.matches)],\n      ["WINS", n(b.wins)],\n      ["WIN RATE", `${n(b.winRate, 2)}%`],\n      ["KILLS", n(b.kills)],\n      ["K/D", n(b.kd, 2)],\n      ["KILLS/MATCH", n(b.killsPerMatch, 2)],\n      ["TIME ALIVE", hm(b.minutesPlayed)],\n      ...tops\n    ];\n    return `<div class="cards">${rows.map(([k, v], i) => `<div class="card${i === 2 ? " hi" : ""}"><span class="k">${k}</span><span>${v}</span></div>`).join("")}</div>`;\n  }\n  function listView(key, rows, detail) {\n    const i = curOf(key, rows.length);\n    S.list = { key, len: rows.length };\n    const lis = rows.map((row, k) => `<li class="row${k === i ? " cur" : ""}${row.dim ? " dim" : ""}${row.act ? " act" : ""}" data-list="${key}" data-i="${k}" aria-selected="${k === i}">\n      <span>${esc(row.l)}${row.s ? ` <span class="s">${esc(row.s)}</span>` : ""}</span><span class="r">${row.r ?? ""}</span></li>`).join("");\n    return `<div class="split"><ul class="list" role="listbox" aria-label="${key}">${lis}</ul><div>${detail(i)}</div></div>`;\n  }\n  function windowToggle() {\n    return `<div class="inline" style="margin-bottom:0.6rem"><span class="seg" role="group" aria-label="Time window">\n    <button data-window="season" class="${S.window === "season" ? "on" : ""}">SEASON</button>\n    <button data-window="lifetime" class="${S.window === "lifetime" ? "on" : ""}">LIFETIME</button></span></div>`;\n  }\n  var views = {\n    "stat/SEASON"() {\n      const c = S.data.career;\n      const s = c?.season;\n      let out = playerPrompt() + stateLine("career", "TYPE AN EPIC NAME AND PRESS SCAN.");\n      if (!s || S.busy.career) return out;\n      const o = s.overall;\n      const bp = s.battlePass;\n      out += `<div class="h"><span>${esc(s.account.name)}</span><span class="s">${esc(cacheNote(s))}</span></div>`;\n      out += `<div class="grid">\n      ${fig("MATCHES", n(o.matches))}\n      ${fig("WINS", n(o.wins), `${n(o.winRate, 2)}% WIN RATE`)}\n      ${fig("KILLS", n(o.kills), `${n(o.killsPerMatch, 2)} PER MATCH`)}\n      ${fig("K/D", n(o.kd, 2))}\n      ${fig("TIME ALIVE", hm(o.minutesPlayed), `${n(o.minutesPlayed ? o.minutesPlayed / Math.max(o.matches, 1) : 0, 1)} MIN PER MATCH`)}\n      ${placementFigs(o)}\n      ${fig("BATTLE PASS", bp ? `LVL ${bp.level}` : "\\u2014", bp ? `${bp.progress}% TO NEXT` : "")}\n    </div>`;\n      out += `<div class="h"><span>WIN RATE</span><span class="s">${n(o.wins)}/${n(o.matches)}</span></div><div class="barrow">${bar(o.winRate / 100)}<span>${n(o.winRate, 2)}%</span></div>`;\n      const r = report();\n      if (r && !r.error) {\n        out += `<div class="h"><span>TREASURE</span><span class="s">${methodLabel()}</span></div>\n        <div class="barrow"><span>PIRATE SHOP ACCESS</span>${bar(r.rewards[0].chance)}<span>${pct(r.rewards[0].chance)}</span></div>\n        <p class="p">Estimated from ${n(r.seasonChests)} chests. Open LOOT for every reward.</p>`;\n      }\n      return out;\n    },\n    "stat/CAREER"() {\n      const c = S.data.career;\n      let out = stateLine("career", "SCAN A PLAYER ON STAT > SEASON FIRST.");\n      if (!c || S.busy.career) return out;\n      const s = c.season.overall;\n      const l = c.lifetime.overall;\n      const rows = [\n        ["MATCHES", s.matches, l.matches, 0],\n        ["WINS", s.wins, l.wins, 0],\n        ["KILLS", s.kills, l.kills, 0],\n        ["TIME ALIVE (H)", s.minutesPlayed / 60, l.minutesPlayed / 60, 1],\n        ["WIN RATE %", s.winRate, l.winRate, 2],\n        ["K/D", s.kd, l.kd, 2],\n        ["KILLS/MATCH", s.killsPerMatch, l.killsPerMatch, 2]\n      ];\n      out += `<div class="h"><span>${esc(c.season.account.name)} \\xB7 CAREER</span><span class="s">SEASON / LIFETIME</span></div>`;\n      out += `<div class="cards">${rows.map(([k, a, b, dp], i) => {\n        const share = i < 4 && b ? a / b : null;\n        const trend = i >= 4 ? a > b ? "ABOVE CAREER" : a < b ? "BELOW CAREER" : "SAME" : `${n((share ?? 0) * 100, 1)}% THIS SEASON`;\n        return `<div class="card"><span class="k">${k}</span><span>${n(a, dp)} / ${n(b, dp)} <span class="s" style="color:var(--t2)">${trend}</span></span></div>`;\n      }).join("")}</div>`;\n      out += `<div class="h"><span>SEASON SHARE OF CAREER MATCHES</span><span class="s">${n(s.matches)}/${n(l.matches)}</span></div><div class="barrow">${bar(l.matches ? s.matches / l.matches : 0)}<span>${n(l.matches ? s.matches / l.matches * 100 : 0, 1)}%</span></div>`;\n      return out;\n    },\n    "stat/MODES"() {\n      return splitStats("modes", MODE_ROWS, "byMode");\n    },\n    "stat/INPUT"() {\n      return splitStats("input", INPUT_ROWS, "byInput");\n    },\n    "loot/ODDS"() {\n      let out = stateLine("career", "SCAN A PLAYER ON STAT > SEASON FIRST.");\n      const r = report();\n      if (!r || S.busy.career) return out;\n      if (r.error) return out + `<div class="msg alert">ERROR: ${esc(r.error)}</div>`;\n      const wk = r.week;\n      out += `<div class="h"><span>${esc(treasure_hunters_2026_default.name)} \\xB7 WEEK ${wk.weekNumber}${wk.ended ? " \\xB7 ENDED" : ""}</span><span class="s">ENDS ${dmy(treasure_hunters_2026_default.end)}</span></div>`;\n      out += `<p class="p">Chests: <b>${n(r.seasonChests)}</b> this season, <b>${n(r.weekChests)}</b> this week. Method: ${methodLabel()}.</p>`;\n      const rows = r.rewards.map((w) => ({ l: w.name, r: pct(w.chance), s: w.scope === "week" ? "WEEK" : "" }));\n      out += listView("odds", rows, (i) => {\n        const w = r.rewards[i];\n        const perMin = S.chest.method === "funaglet" ? r.avgMinutesPerMatch ? r.chestsPerMatch / r.avgMinutesPerMatch : 0 : S.chest.rate;\n        const t50 = perMin ? w.chestsFor50 / perMin : null;\n        return `<div class="big">${pct(w.chance)}</div><p class="p">Chance you got at least one so far.</p>\n        <div class="barrow" style="margin:0.4rem 0 0.7rem">${bar(w.chance)}</div>\n        <div class="cards">\n          <div class="card"><span class="k">ODDS</span><span>1 IN ${n(w.odds)}</span></div>\n          <div class="card"><span class="k">COUNTS</span><span>${w.scope === "week" ? "THIS WEEK" : "WHOLE SEASON"}</span></div>\n          <div class="card"><span class="k">CHESTS</span><span>${n(w.chests)}</span></div>\n          <div class="card hi"><span class="k">NO DROP</span><span>${pct(w.noChance)}</span></div>\n          <div class="card"><span class="k">50% NEEDS</span><span>${n(w.chestsFor50)} CHESTS</span></div>\n          <div class="card"><span class="k">90% NEEDS</span><span>${n(w.chestsFor90)} CHESTS</span></div>\n          ${t50 != null ? `<div class="card"><span class="k">50% TIME ALIVE</span><span>${hm(t50)}</span></div>` : ""}\n          ${w.expected != null ? `<div class="card"><span class="k">EXPECTED</span><span>${n(w.expected, 1)} DROPS</span></div>` : ""}\n        </div>`;\n      });\n      return out;\n    },\n    "loot/PLANNER"() {\n      let out = stateLine("career", "SCAN A PLAYER ON STAT > SEASON FIRST.");\n      const r = report();\n      if (!r || S.busy.career) return out;\n      if (r.error) return out + `<div class="msg alert">ERROR: ${esc(r.error)}</div>`;\n      const rows = r.rewards.map((w) => ({ l: w.name, r: pct(w.chance) }));\n      out += `<p class="p">Pick a reward. Enter how much more you will play. The result updates as you type.</p>`;\n      out += listView("plan", rows, () => `\n      <div class="field"><label for="pMin">EXTRA TIME ALIVE (MIN)</label><input type="number" id="pMin" min="0" step="10" value="${S.plan.minutes}"></div>\n      <div class="field"><label for="pMatch">EXTRA MATCHES</label><input type="number" id="pMatch" min="0" step="1" value="${S.plan.matches}">\n        <span class="hint">One match = ${n(r.chestsPerMatch, 1)} chests at your average.</span></div>\n      <div class="field"><label for="pTh">TREASURE HOUR TIME ALIVE (MIN)</label><input type="number" id="pTh" min="0" step="10" value="${S.plan.thMinutes}"></div>\n      <div class="field"><label>TREASURE HOUR SESSION</label><span class="seg" role="group" aria-label="Treasure Hour session">\n        ${[-1, 0, 1].map((v) => `<button data-session="${v}" class="${S.plan.session === v ? "on" : ""}">${v < 0 ? "OFF" : `S${v + 1}`}</button>`).join("")}</span></div>\n      <div id="planOut">${planOut(r)}</div>`);\n      return out;\n    },\n    "loot/METHOD"() {\n      const r = report();\n      const s = S.data.career?.season?.overall;\n      const minutesOn = S.chest.method === "minutes";\n      let out = `<div class="h"><span>CHEST ESTIMATE</span><span class="s">${methodLabel()}</span></div>\n      <span class="seg" role="group" aria-label="Chest method">\n        <button data-method="minutes" class="${minutesOn ? "on" : ""}">ALIVE MINUTES</button>\n        <button data-method="funaglet" class="${!minutesOn ? "on" : ""}">FUNAGLET 50/MATCH</button></span>\n      <div class="field"><label for="rate">CHESTS PER ALIVE MINUTE</label>\n        <input type="number" id="rate" min="0.1" max="10" step="0.1" value="${S.chest.rate}" ${minutesOn ? "" : "disabled"}>\n        <span class="hint">2 = one chest every 30 seconds. Epic counts alive minutes only, so an early death adds few chests.</span></div>`;\n      if (s) {\n        const calc = (opts) => {\n          try {\n            return treasureReport({ event: treasure_hunters_2026_default, matches: s.matches, minutesPlayed: s.minutesPlayed, ...opts });\n          } catch {\n            return null;\n          }\n        };\n        const a = calc({ chestsPerMinute: S.chest.rate });\n        const b = calc({ chestsPerMatch: "funaglet" });\n        out += `<div class="h"><span>COMPARE FOR ${esc(S.data.career.season.account.name)}</span><span class="s">${n(s.matches)} MATCHES \\xB7 ${hm(s.minutesPlayed)}</span></div>\n        <div class="cards">\n          <div class="card${minutesOn ? " hi" : ""}"><span class="k">ALIVE \\xD7 ${n(S.chest.rate, 1)}</span><span>${a ? `${n(a.seasonChests)} CHESTS \\xB7 ${pct(a.rewards[0].chance)}` : "\\u2014"}</span></div>\n          <div class="card${!minutesOn ? " hi" : ""}"><span class="k">FUNAGLET</span><span>${b ? `${n(b.seasonChests)} CHESTS \\xB7 ${pct(b.rewards[0].chance)}` : "\\u2014"}</span></div>\n        </div><p class="p">Percent = Pirate Shop Access, 1 in ${n(treasure_hunters_2026_default.rewards[0].odds)} per chest.</p>`;\n      }\n      out += `<div class="h"><span>THE MATHS</span></div>\n      <p class="p">Chance of at least one drop = 1 \\u2212 (1 \\u2212 1/odds)<sup>chests</sup>. Weekly rewards use this season\'s chests divided by the weeks so far. Treasure Hour chests use boosted odds.</p>`;\n      if (r?.error) out += `<div class="msg alert">ERROR: ${esc(r.error)}</div>`;\n      return out;\n    },\n    "loot/GUIDE"() {\n      const secs = guide_treasure_hunters_2026_default.sections;\n      let out = `<div class="h"><span>${esc(treasure_hunters_2026_default.name)} \\xB7 FIELD GUIDE</span><span class="s">CHECKED ${dmy(guide_treasure_hunters_2026_default.checked)}</span></div>`;\n      out += listView("guide", secs.map((s) => ({ l: s.label, r: s.schedule ? nextHourBadge() : "" })), (i) => {\n        const s = secs[i];\n        let d = `<div class="h"><span>${esc(s.label.toUpperCase())}</span>${s.schedule ? \'<span class="s">YOUR LOCAL TIME</span>\' : ""}</div>`;\n        if (s.schedule) d += scheduleHtml();\n        if (s.lines) {\n          d += `<ul class="gsec">${s.lines.map((ln) => `<li class="gline"><span>${esc(ln.t)}</span><span class="gtag${ln.tag === "MYTH" || ln.tag === "RUMOUR" ? " gtag-doubt" : ""}" title="${esc(guide_treasure_hunters_2026_default.tags[ln.tag] ?? "")}">${esc(ln.tag)}</span></li>`).join("")}</ul>`;\n        }\n        if (s.links) {\n          d += `<ul class="gsec">${s.links.map((l) => `<li class="gline"><a class="glink" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.title)}</a></li>`).join("")}</ul>`;\n        }\n        return d;\n      });\n      out += `<p class="p">${Object.entries(guide_treasure_hunters_2026_default.tags).map(([k, v]) => `<b>${k}</b>: ${esc(v)}`).join(" \\xB7 ")}.</p>`;\n      return out;\n    },\n    "shop/ITEMS"() {\n      let out = stateLine("shop", "NO SHOP DATA.");\n      const items = S.data.shop;\n      if (!items || S.busy.shop) return out;\n      const rows = items.map((it) => ({ l: it.name, s: it.kind, r: `${n(it.price)}${it.onSale ? " \\u25BC" : ""}` }));\n      out += `<div class="h"><span>ITEM SHOP</span><span class="s">${n(items.length)} OFFERS \\xB7 V-BUCKS</span></div>`;\n      out += listView("shop", rows, (i) => {\n        const it = items[i];\n        return `${img(it.image, it.kind)}\n        <div class="h" style="margin-top:0.6rem"><span>${esc(it.name)}</span></div>\n        <div class="cards">\n          <div class="card"><span class="k">TYPE</span><span>${esc(it.kind)}${it.items > 1 ? ` (${it.items})` : ""}</span></div>\n          ${it.rarity ? `<div class="card"><span class="k">RARITY</span><span>${esc(it.rarity)}</span></div>` : ""}\n          <div class="card hi"><span class="k">PRICE</span><span>${n(it.price)} V-BUCKS${it.onSale ? ` (WAS ${n(it.regularPrice)})` : ""}</span></div>\n          ${it.section ? `<div class="card"><span class="k">SECTION</span><span>${esc(it.section)}</span></div>` : ""}\n          ${it.outDate ? `<div class="card"><span class="k">LEAVES</span><span>${dmy(it.outDate)}</span></div>` : ""}\n        </div>`;\n      });\n      return out;\n    },\n    "shop/RARE"() {\n      let out = stateLine("rarest", "NO RARITY DATA.");\n      const r = S.data.rarest;\n      if (!r || S.busy.rarest) return out;\n      if (!r.generatedAt) return out + \'<div class="msg">NO DATA YET. THE LIST IS BUILT ONCE A DAY, AFTER THE SHOP RESETS.</div>\';\n      const seg = `<div class="inline" style="margin-bottom:0.6rem"><span class="seg" role="group" aria-label="Rare view">\n      <button data-rareview="today" class="${S.rare.view === "today" ? "on" : ""}">BACK TODAY</button>\n      <button data-rareview="rarest" class="${S.rare.view === "rarest" ? "on" : ""}">RAREST</button></span></div>`;\n      out += `<div class="h"><span>RARE SHOP ITEMS</span><span class="s">UPDATED ${dmy(r.generatedAt)}${S.resolved === "demo" ? " \\xB7 SAMPLE" : ""}</span></div>` + seg;\n      if (S.rare.view === "today") {\n        const list = r.today ?? [];\n        if (!list.length) return out + `<div class="msg">NO RARE RETURNS IN TODAY\'S SHOP.</div>`;\n        out += `<p class="p">Items in the shop on ${dmy(r.shopDate)}, longest away first. A square marks a rare return (away ${n(r.minDaysAway ?? 500)}+ days).</p>`;\n        out += listView("rareToday", list.map((it) => ({ l: it.name, s: it.type ?? "", r: it.isNew ? "NEW" : `${n(it.daysAway)} D`, act: it.rare })), (i) => {\n          const it = list[i];\n          return `${img(it.image, it.type ?? "ITEM")}<div class="h" style="margin-top:0.6rem"><span>${esc(it.name)}</span></div>\n          <div class="cards">\n            <div class="card hi"><span class="k">AWAY FOR</span><span>${it.isNew ? "FIRST TIME IN SHOP" : `${n(it.daysAway)} DAYS${it.rare ? " \\xB7 RARE RETURN" : ""}`}</span></div>\n            ${it.lastSeenBefore ? `<div class="card"><span class="k">LAST SEEN BEFORE</span><span>${dmy(it.lastSeenBefore)}</span></div>` : ""}\n            <div class="card"><span class="k">TYPE</span><span>${esc(it.type ?? it.category)}</span></div>\n            ${it.rarity ? `<div class="card"><span class="k">RARITY</span><span>${esc(it.rarity)}</span></div>` : ""}\n            ${it.series ? `<div class="card"><span class="k">SERIES</span><span>${esc(seriesName(it.series))}</span></div>` : ""}\n            <div class="card"><span class="k">TIMES IN SHOP</span><span>${n(it.stints)}</span></div>\n          </div>`;\n        });\n        return out;\n      }\n      const cats = [{ label: "Top 12", items: r.top12, total: r.top12.length, top: true }, ...r.categories];\n      const ci = Math.max(0, Math.min(S.rare.cat, cats.length - 1));\n      const cat = cats[ci];\n      out += `<div class="inline" style="margin-bottom:0.5rem"><button class="btn" data-rarecat="-1" aria-label="Previous category" ${ci === 0 ? "disabled" : ""}>\\u25C0</button>\n      <span class="h" style="margin:0;border:0;flex:1;justify-content:center">${esc(cat.label.toUpperCase())} <span class="s">${cat.top ? "" : `${n(cat.total)} RARE \\xB7 `}${ci + 1}/${cats.length}</span></span>\n      <button class="btn" data-rarecat="1" aria-label="Next category" ${ci === cats.length - 1 ? "disabled" : ""}>\\u25B6</button></div>`;\n      out += listView(`rare-${ci}`, cat.items.map((it) => ({ l: it.name, s: ci === 0 ? it.category : "", r: `${n(it.daysAway)} D` })), (i) => {\n        const it = cat.items[i];\n        if (!it) return "";\n        return `${img(it.image, it.type ?? "ITEM")}<div class="h" style="margin-top:0.6rem"><span>${esc(it.name)}</span></div>\n        <div class="cards">\n          <div class="card hi"><span class="k">AWAY FOR</span><span>${n(it.daysAway)} DAYS</span></div>\n          <div class="card"><span class="k">LAST SEEN</span><span>${dmy(it.lastSeen)}</span></div>\n          <div class="card"><span class="k">FIRST SEEN</span><span>${dmy(it.firstSeen)}</span></div>\n          <div class="card"><span class="k">TIMES IN SHOP</span><span>${n(it.stints)}</span></div>\n          <div class="card"><span class="k">DAYS IN SHOP</span><span>${n(it.daysInShop)}</span></div>\n          <div class="card"><span class="k">TYPE</span><span>${esc(it.type ?? it.category)}</span></div>\n          ${it.rarity ? `<div class="card"><span class="k">RARITY</span><span>${esc(it.rarity)}</span></div>` : ""}\n          ${it.series ? `<div class="card"><span class="k">SERIES</span><span>${esc(seriesName(it.series))}</span></div>` : ""}\n        </div>`;\n      });\n      out += `<p class="p">Rare = not in the Item Shop for ${n(r.minDaysAway ?? 500)}+ days (Fortnite Wiki rule). Top 12 leaves out Back Blings that came with an Outfit in the list. ${cat.total > cat.items.length ? `Showing ${cat.items.length} of ${n(cat.total)}.` : ""}</p>`;\n      return out;\n    },\n    "shop/NEWS"() {\n      let out = stateLine("news", "NO NEWS.");\n      const list = S.data.news;\n      if (!list || S.busy.news) return out;\n      out += listView("news", list.map((m) => ({ l: m.title })), (i) => {\n        const m = list[i];\n        return `${img(m.image, "NEWS", true)}<div class="h" style="margin-top:0.6rem"><span>${esc(m.title)}</span></div><p class="p">${esc(m.body)}</p>`;\n      });\n      return out;\n    },\n    "map/"() {\n      let out = stateLine("map", "NO MAP DATA.");\n      const m = S.data.map;\n      if (!m || S.busy.map) return out;\n      const pois = [...m.pois].sort((a, b) => b.named - a.named || a.name.localeCompare(b.name));\n      const visual = m.image ? img(m.image, "MAP", false, "map") : `<canvas class="map" id="mapCanvas" width="640" height="640" aria-label="Schematic map with ${pois.length} places"></canvas>`;\n      out += listView("map", pois.map((p) => ({ l: p.name, s: p.named ? "" : "LANDMARK", act: true })), () => visual);\n      out += m.image ? \'<p class="p">Live map image. Place names are on the image.</p>\' : \'<p class="p">Schematic of sample places. The cursor place is marked.</p>\';\n      return out;\n    },\n    "sys/STATUS"() {\n      let out = stateLine("status", "NO STATUS DATA.");\n      const st = S.data.status;\n      if (!st || S.busy.status) return out;\n      const comps = Object.entries(st.components ?? {});\n      out += `<div class="h"><span>EPIC SERVER STATUS</span><span class="s">${t12(/* @__PURE__ */ new Date())}</span></div><div class="big" style="font-size:1.6rem">${esc(String(st.overall).toUpperCase())}</div>`;\n      out += `<ul class="list" style="margin-top:0.6rem">${comps.map(([k, v]) => {\n        const ok = v === "operational";\n        return `<li class="row"><span>${esc(k)}</span><span class="r${ok ? "" : " alert"}">${ok ? "ONLINE" : `WARNING: ${esc(v.replace(/_/g, " ").toUpperCase())}`}</span></li>`;\n      }).join("") || \'<li class="row dim"><span>NO FORTNITE COMPONENTS LISTED</span></li>\'}</ul>`;\n      out += `<div class="h"><span>DATA LINK</span></div><div class="cards">\n      <div class="card"><span class="k">MODE</span><span>${S.resolved.toUpperCase()}${S.mode === "auto" ? " (AUTO)" : ""}</span></div>\n      <div class="card"><span class="k">STATS</span><span>${S.resolved === "demo" ? "SAMPLE DATA" : "FORTNITE-API.COM"}</span></div>\n      <div class="card"><span class="k">CACHE</span><span>20 MIN PER PLAYER</span></div></div>`;\n      return out;\n    },\n    "sys/SETTINGS"() {\n      const seg = (name, opts, cur) => `<span class="seg" role="group" aria-label="${name}">${opts.map(([v, l]) => `<button data-set="${name}" data-val="${v}" class="${String(cur) === String(v) ? "on" : ""}">${l}</button>`).join("")}</span>`;\n      return `\n      <div class="field"><label>DATA MODE</label>${seg("mode", [["auto", "AUTO"], ["demo", "DEMO"], ["direct", "DIRECT"], ["worker", "WORKER"]], S.mode)}\n        <span class="hint">Now: ${S.resolved.toUpperCase()}. AUTO uses the Worker when this page comes from your Worker, else DEMO.</span></div>\n      <div class="field"><label for="apiKey">FORTNITE-API.COM KEY (DIRECT MODE)</label>\n        <div class="inline"><input type="password" id="apiKey" value="${esc(S.key)}" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" autocomplete="off" spellcheck="false">\n        <button class="btn" data-action="saveKey">SAVE</button><button class="btn" data-action="clearKey">CLEAR</button></div>\n        <span class="hint">Stays in this browser only. Never put the key in the page code. With the Worker you do not need it here.</span></div>\n      <div class="field"><label for="workerUrl">WORKER URL (WORKER MODE)</label>\n        <div class="inline"><input type="url" id="workerUrl" value="${esc(S.worker)}" placeholder="https://fortnite-kit.you.workers.dev">\n        <button class="btn" data-action="saveWorker">SAVE</button></div>\n        <span class="hint">Leave empty when this page is served by the Worker.</span></div>\n      <div class="field"><label>THEME</label>${seg("theme", [["green", "GREEN"], ["amber", "AMBER"], ["blue", "BLUE"], ["white", "WHITE"]], S.theme)}</div>\n      <div class="field"><label>EFFECTS</label>${seg("fx", [["on", "ON"], ["off", "OFF"]], S.fx ? "on" : "off")}</div>\n      <div class="field"><label>SOUND</label>${seg("sound", [["on", "ON"], ["off", "OFF"]], S.sound ? "on" : "off")}</div>\n      <div class="field"><label>BOOT SEQUENCE</label>${seg("boot", [["on", "ON"], ["off", "OFF"]], S.boot ? "on" : "off")}</div>\n      <div class="field"><label>LOCAL DATA</label><div class="inline"><button class="btn" data-action="wipe">CLEAR SAVED SETTINGS AND CACHE</button></div></div>\n      <div class="field"><label>SCREEN</label><span class="hint" id="screenInfo">${screenInfo()}</span>\n        <span class="hint">Send this line if the footer is cut off. FOOTER must be no more than VISUAL.</span></div>`;\n    }\n  };\n  var dhm = (ms) => {\n    const m = Math.round(ms / 6e4);\n    const d = Math.floor(m / 1440);\n    const h = Math.floor(m % 1440 / 60);\n    return `${d ? `${d}D ` : ""}${h}H ${String(m % 60).padStart(2, "0")}M`;\n  };\n  function nextHourBadge() {\n    const s = treasureHourSessions(treasure_hunters_2026_default, /* @__PURE__ */ new Date()).find((x) => x.state === "live" || x.state === "next");\n    if (!s) return "";\n    return s.state === "live" ? "LIVE" : `IN ${dhm(s.startsInMs)}`;\n  }\n  function scheduleHtml() {\n    const all = treasureHourSessions(treasure_hunters_2026_default, /* @__PURE__ */ new Date());\n    const open = all.filter((x) => x.state !== "past");\n    const pastCount = all.length - open.length;\n    if (!open.length) return \'<div class="msg">NO MORE SESSIONS LISTED.</div>\';\n    const rows = open.map((s) => {\n      const mult = s.multipliers?.["pirate-shop-access"];\n      const when = `${dmy(s.start)} ${t12(s.start)}\\u2013${t12(s.end)}`;\n      const state = s.state === "live" ? `LIVE \\xB7 ENDS IN ${dhm(s.endsInMs)}` : s.state === "next" ? `NEXT \\xB7 IN ${dhm(s.startsInMs)}` : "";\n      return `<li class="sched${s.state === "live" ? " sched-live" : ""}${s.state === "next" ? " sched-next" : ""}">\n      <span>${when}${s.name ? ` \\xB7 ${esc(s.name.toUpperCase())}` : ""}${state ? `<br><b>${state}</b>` : ""}</span>\n      <span class="r">${s.status === "official" ? "OFFICIAL" : "EXPECTED"}${mult ? ` \\xB7 TOKEN \\xD7${mult}` : ""}</span></li>`;\n    }).join("");\n    return `<ul class="gsec">${rows}</ul><p class="p">EXPECTED = Saturday pattern, not yet confirmed by Epic.${pastCount ? ` ${pastCount} past sessions hidden.` : ""}</p>`;\n  }\n  var seriesName = (s) => String(s).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\\bSeries\\b/i, "Series").trim();\n  function placementFigs(o) {\n    const order = ["top10", "top25", "top5", "top3", "top6", "top12"];\n    const picks = order.filter((k) => (o[k] ?? 0) > 0).slice(0, 2);\n    const tiles = picks.map((k) => fig(k.replace("top", "TOP "), n(o[k]), `${n(o[k] / Math.max(o.matches, 1) * 100, 1)}% OF MATCHES`));\n    if (tiles.length < 2) tiles.push(fig("DEATHS", n(o.deaths)));\n    if (tiles.length < 2) tiles.push(fig("SCORE", n(o.score)));\n    return tiles.join("");\n  }\n  function fig(k, v, note = "") {\n    return `<div class="fig"><div class="k">${k}</div><div class="v">${v}</div>${note ? `<div class="n">${note}</div>` : ""}</div>`;\n  }\n  function img(url, label, wide = false, extra = "") {\n    const initials = esc(String(label).split(/\\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase());\n    if (!url || S.resolved === "demo") return `<div class="ph${wide ? " wide" : ""}" aria-hidden="true">${initials}</div>`;\n    return `<div class="tint${wide ? " wide" : ""} ${extra}" data-ph="${initials}"><img src="${esc(url)}" alt="" loading="lazy" referrerpolicy="no-referrer"></div>`;\n  }\n  function splitStats(key, defs, field) {\n    let out = stateLine("career", "SCAN A PLAYER ON STAT > SEASON FIRST.");\n    const c = S.data.career;\n    if (!c || S.busy.career) return out;\n    const ps = S.window === "season" ? c.season : c.lifetime;\n    const blocks = defs.map(([id]) => ps[field]?.[id] ?? null);\n    const max = Math.max(1, ...blocks.map((b) => b?.matches ?? 0));\n    out += windowToggle();\n    const rows = defs.map(([, label], k) => ({ l: label, r: blocks[k] ? n(blocks[k].matches) : "\\u2014", dim: !blocks[k]?.matches }));\n    out += listView(key, rows, (i) => `<div class="h"><span>${defs[i][1]}</span><span class="s">${S.window.toUpperCase()}</span></div>\n    <div class="barrow" style="margin-bottom:0.5rem"><span class="s" style="color:var(--t2)">SHARE</span>${bar((blocks[i]?.matches ?? 0) / max)}</div>${blockCards(blocks[i])}`);\n    return out;\n  }\n  function planOut(r) {\n    const rows = r.rewards;\n    const i = curOf("plan", rows.length);\n    const reward = treasure_hunters_2026_default.rewards[i];\n    const p = planTreasure({\n      event: treasure_hunters_2026_default,\n      report: r,\n      rewardId: reward.id,\n      plannedMinutes: S.plan.minutes,\n      plannedMatches: S.plan.matches,\n      treasureHourMinutes: S.plan.thMinutes,\n      treasureHour: S.plan.session < 0 ? null : S.plan.session\n    });\n    const before = rows[i].chance;\n    return `<div class="h"><span>${esc(reward.name)}</span><span class="s">${p.treasureHourMultiplier > 1 ? `TREASURE HOUR \\xD7${p.treasureHourMultiplier}` : "NORMAL ODDS"}</span></div>\n    <div class="big">${pct(p.projectedChance)}</div>\n    <p class="p">Now ${pct(before)}. Gain <b>+${pct(p.gain)}</b> from ${n(p.plannedChests + p.treasureHourChests)} more chests (${n(p.projectedTotal)} total).</p>\n    ${chanceChart(r, reward, p.currentChests, p.plannedChests + p.treasureHourChests)}`;\n  }\n  function chanceChart(r, reward, base, planned) {\n    const perMin = S.chest.method === "funaglet" ? r.avgMinutesPerMatch ? r.chestsPerMatch / r.avgMinutesPerMatch : 0 : S.chest.rate;\n    if (!perMin) return "";\n    const perHour = perMin * 60;\n    const need50 = Math.max(0, Math.log1p(-0.5) / Math.log1p(-1 / reward.odds) - base) / perHour;\n    const H = Math.min(500, Math.max(10, Math.ceil(need50 * 2 / 10) * 10));\n    const W = 320;\n    const Ht = 120;\n    const L = 34;\n    const B = 18;\n    const T = 8;\n    const f = (h) => chanceAtLeastOneMixed(reward.odds, [{ tries: base + h * perHour, multiplier: 1 }]);\n    const pts = Array.from({ length: 41 }, (_, k) => {\n      const h = H * k / 40;\n      return [h, f(h)];\n    });\n    const yMax = Math.min(1, Math.max(0.05, Math.ceil(pts[pts.length - 1][1] * 10) / 10));\n    const X = (h) => L + h / H * (W - L - 6);\n    const Y = (v) => T + (1 - v / yMax) * (Ht - T - B);\n    const line = pts.map(([h, v]) => `${X(h).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");\n    const area = `${X(0)},${Y(0)} ${line} ${X(H)},${Y(0)}`;\n    const planH = Math.min(H, planned / perHour);\n    const ticks = Array.from({ length: 21 }, (_, k) => {\n      const x = L + k / 20 * (W - L - 6);\n      const len = k % 4 === 0 ? 5 : 3;\n      return `<line x1="${x}" y1="${Ht - B}" x2="${x}" y2="${Ht - B + len}" stroke="var(--t1)" stroke-width="1"/>`;\n    }).join("");\n    return `<svg class="chart" viewBox="0 0 ${W} ${Ht + 8}" role="img" aria-label="Chance rises from ${pct(f(0))} now to ${pct(f(H))} after ${H} more hours alive">\n    <line x1="${L}" y1="${T}" x2="${L}" y2="${Ht - B}" stroke="var(--t1)"/><line x1="${L}" y1="${Ht - B}" x2="${W - 6}" y2="${Ht - B}" stroke="var(--t1)"/>\n    <line x1="${L}" y1="${Y(yMax / 2)}" x2="${W - 6}" y2="${Y(yMax / 2)}" stroke="var(--t4)"/>\n    ${ticks}\n    <polygon points="${area}" fill="var(--t4)"/>\n    <polyline points="${line}" fill="none" stroke="var(--t1)" stroke-width="1.5"/>\n    ${planned ? `<line x1="${X(planH)}" y1="${T}" x2="${X(planH)}" y2="${Ht - B}" stroke="var(--t2)" stroke-dasharray="2 2"/><rect x="${X(planH) - 2}" y="${Y(f(planH)) - 2}" width="4" height="4" fill="var(--t1)"/>` : ""}\n    <rect x="${X(H) - 2}" y="${Y(f(H)) - 2}" width="4" height="4" fill="var(--t1)"/>\n    <text x="${L - 4}" y="${T + 4}" text-anchor="end">${Math.round(yMax * 100)}%</text>\n    <text x="${L - 4}" y="${Ht - B}" text-anchor="end">0%</text>\n    <text x="${L}" y="${Ht + 5}" text-anchor="start">+0H</text>\n    <text x="${X(H / 2)}" y="${Ht + 5}" text-anchor="middle">+${H / 2}H</text>\n    <text x="${X(H)}" y="${Ht + 5}" text-anchor="end">+${H}H</text>\n  </svg><p class="p">Chance after more hours alive at ${n(perMin, 1)} chests per minute.</p>`;\n  }\n  function drawMap() {\n    const cv = $("mapCanvas");\n    const m = S.data.map;\n    if (!cv || !m) return;\n    const ctx = cv.getContext("2d");\n    const W = cv.width;\n    const H = cv.height;\n    const css = getComputedStyle(document.documentElement);\n    const t1 = css.getPropertyValue("--t1").trim();\n    const t3 = css.getPropertyValue("--t3").trim();\n    const t4 = css.getPropertyValue("--t4").trim();\n    ctx.fillStyle = "#000";\n    ctx.fillRect(0, 0, W, H);\n    ctx.strokeStyle = t4;\n    ctx.lineWidth = 1;\n    for (let k = 0; k <= 8; k++) {\n      const p = k / 8 * W;\n      ctx.beginPath();\n      ctx.moveTo(p, 0);\n      ctx.lineTo(p, H);\n      ctx.moveTo(0, p);\n      ctx.lineTo(W, p);\n      ctx.stroke();\n    }\n    ctx.beginPath();\n    for (let a = 0; a <= 64; a++) {\n      const th = a / 64 * Math.PI * 2;\n      const r = W * (0.36 + 0.05 * Math.sin(th * 3) + 0.03 * Math.cos(th * 7));\n      const x = W / 2 + Math.cos(th) * r;\n      const y = H / 2 + Math.sin(th) * r;\n      a ? ctx.lineTo(x, y) : ctx.moveTo(x, y);\n    }\n    ctx.closePath();\n    ctx.fillStyle = t4;\n    ctx.fill();\n    ctx.strokeStyle = t1;\n    ctx.stroke();\n    const pois = [...m.pois].sort((a, b) => b.named - a.named || a.name.localeCompare(b.name));\n    const ext = Math.max(...pois.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y))), 1) * 1.25;\n    const cur = curOf("map", pois.length);\n    ctx.font = \'700 15px "Roboto Condensed", sans-serif\';\n    ctx.textAlign = "center";\n    pois.forEach((p, k) => {\n      const x = W / 2 + p.y / ext * (W / 2);\n      const y = H / 2 - p.x / ext * (H / 2);\n      const on = k === cur;\n      const s = on ? 10 : p.named ? 6 : 4;\n      ctx.fillStyle = on ? t1 : t3;\n      ctx.fillRect(x - s / 2, y - s / 2, s, s);\n      if (on) {\n        ctx.strokeStyle = t1;\n        ctx.strokeRect(x - 9, y - 9, 18, 18);\n      }\n      ctx.fillStyle = on ? t1 : t3;\n      ctx.fillText(p.name.toUpperCase(), x, y - 12);\n    });\n  }\n  function render() {\n    document.documentElement.dataset.ph = S.theme;\n    document.body.classList.toggle("nofx", !S.fx);\n    S.list = null;\n    renderTabs();\n    const key = `${tabId()}/${subName()}`;\n    $("content").innerHTML = (views[key] ?? (() => ""))();\n    renderFooter();\n    if (key === "map/") drawMap();\n  }\n  function ensureData() {\n    const t = tabId();\n    if (t === "shop" && subName() === "ITEMS" && !S.data.shop && !S.busy.shop && !S.err.shop) load("shop");\n    if (t === "shop" && subName() === "NEWS" && !S.data.news && !S.busy.news && !S.err.news) load("news");\n    if (t === "shop" && subName() === "RARE" && !S.data.rarest && !S.busy.rarest && !S.err.rarest) load("rarest");\n    if (t === "map" && !S.data.map && !S.busy.map && !S.err.map) load("map");\n    if (t === "sys" && subName() === "STATUS" && !S.data.status && !S.busy.status && !S.err.status) load("status");\n  }\n  function goTab(i) {\n    S.tab = (i + TABS.length) % TABS.length;\n    click();\n    jolt();\n    render();\n    ensureData();\n    $("content").scrollTop = 0;\n  }\n  function goSub(i) {\n    const subs = TABS[S.tab].subs;\n    if (!subs.length) return;\n    const v = Math.max(0, Math.min(subs.length - 1, i));\n    if (v === S.sub[tabId()]) return;\n    S.sub[tabId()] = v;\n    click();\n    render();\n    ensureData();\n    $("content").scrollTop = 0;\n  }\n  function moveCursor(d) {\n    if (!S.list) return;\n    const { key, len } = S.list;\n    const v = Math.max(0, Math.min(len - 1, curOf(key, len) + d));\n    S.cur[key] = v;\n    render();\n    document.querySelector(".row.cur")?.scrollIntoView({ block: "nearest" });\n  }\n  document.addEventListener("click", (e) => {\n    const el = e.target.closest("button, .row");\n    if (!el) return;\n    const d = el.dataset;\n    if (d.tab != null) return goTab(+d.tab);\n    if (d.sub != null) return goSub(+d.sub);\n    if (d.list != null) {\n      S.cur[d.list] = +d.i;\n      click();\n      return render();\n    }\n    if (d.acct) {\n      e.preventDefault();\n      S.acct = d.acct;\n      lsSet("acct", d.acct);\n      return render();\n    }\n    if (d.window) {\n      S.window = d.window;\n      return render();\n    }\n    if (d.session != null) {\n      S.plan.session = +d.session;\n      return render();\n    }\n    if (d.method) {\n      S.chest.method = d.method;\n      lsSet("chestMethod", d.method);\n      return render();\n    }\n    if (d.rareview) {\n      S.rare.view = d.rareview;\n      click();\n      return render();\n    }\n    if (d.rarecat) {\n      S.rare.cat = Math.max(0, S.rare.cat + +d.rarecat);\n      click();\n      return render();\n    }\n    if (d.set) {\n      const v = d.val;\n      if (d.set === "mode") {\n        S.mode = v;\n        lsSet("mode", v);\n        resetData();\n        resolveMode().then(() => {\n          render();\n          if (S.player || S.resolved === "demo") scan(S.player);\n        });\n        return;\n      }\n      if (d.set === "theme") {\n        S.theme = v;\n        lsSet("theme", v);\n      }\n      if (d.set === "fx") {\n        S.fx = v === "on";\n        lsSet("fx", v);\n      }\n      if (d.set === "sound") {\n        S.sound = v === "on";\n        lsSet("sound", v);\n      }\n      if (d.set === "boot") {\n        S.boot = v === "on";\n        lsSet("boot", v);\n      }\n      click();\n      return render();\n    }\n    if (d.action === "saveKey") {\n      S.key = $("apiKey").value.trim();\n      lsSet("key", S.key || null);\n      resetData();\n      return render();\n    }\n    if (d.action === "clearKey") {\n      S.key = "";\n      lsSet("key", null);\n      resetData();\n      return render();\n    }\n    if (d.action === "saveWorker") {\n      S.worker = $("workerUrl").value.trim();\n      lsSet("worker", S.worker || null);\n      resetData();\n      return render();\n    }\n    if (d.action === "wipe") {\n      try {\n        Object.keys(localStorage).filter((k) => k.startsWith(LS)).forEach((k) => localStorage.removeItem(k));\n      } catch {\n      }\n      location.reload();\n    }\n  });\n  document.addEventListener("submit", (e) => {\n    if (e.target.id === "scanForm") {\n      e.preventDefault();\n      click();\n      scan($("playerName").value);\n    }\n  });\n  document.addEventListener("input", (e) => {\n    const id = e.target.id;\n    if (id === "rate") {\n      const v = +e.target.value;\n      if (v > 0) {\n        S.chest.rate = v;\n        lsSet("chestRate", v);\n        renderFooter();\n      }\n      return;\n    }\n    if (["pMin", "pMatch", "pTh"].includes(id)) {\n      const v = Math.max(0, +e.target.value || 0);\n      if (id === "pMin") S.plan.minutes = v;\n      if (id === "pMatch") S.plan.matches = v;\n      if (id === "pTh") S.plan.thMinutes = v;\n      const r = report();\n      if (r && !r.error) $("planOut").innerHTML = planOut(r);\n    }\n  });\n  document.addEventListener("change", (e) => {\n    if (e.target.id === "rate") render();\n  });\n  document.addEventListener("error", (e) => {\n    if (e.target.tagName === "IMG") {\n      const box = e.target.closest(".tint");\n      if (box) box.outerHTML = `<div class="ph${box.classList.contains("wide") ? " wide" : ""}">${box.dataset.ph ?? ""}</div>`;\n    }\n  }, true);\n  document.addEventListener("keydown", (e) => {\n    const tag = e.target.tagName;\n    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") {\n      if (e.key === "Escape") e.target.blur();\n      return;\n    }\n    if (e.altKey || e.ctrlKey || e.metaKey) return;\n    const k = e.key.toLowerCase();\n    if (k === "arrowleft") {\n      e.preventDefault();\n      goTab(S.tab - 1);\n    } else if (k === "arrowright") {\n      e.preventDefault();\n      goTab(S.tab + 1);\n    } else if (k === "a" || k === "q") goSub(S.sub[tabId()] - 1);\n    else if (k === "d" || k === "e") goSub(S.sub[tabId()] + 1);\n    else if (k === "arrowup") {\n      e.preventDefault();\n      moveCursor(-1);\n    } else if (k === "arrowdown") {\n      e.preventDefault();\n      moveCursor(1);\n    }\n  });\n  function bootSequence() {\n    return new Promise((done) => {\n      let seen = false;\n      try {\n        seen = sessionStorage.getItem("lt.booted") === "1";\n        sessionStorage.setItem("lt.booted", "1");\n      } catch {\n      }\n      if (!S.boot || seen || reducedMotion()) return done();\n      const el = document.createElement("div");\n      el.className = "boot";\n      el.setAttribute("aria-hidden", "true");\n      el.innerHTML = \'<div class="hex"></div><div class="typed"></div>\';\n      document.body.appendChild(el);\n      const hex = el.querySelector(".hex");\n      const typed = el.querySelector(".typed");\n      let finished = false;\n      const finish = () => {\n        if (finished) return;\n        finished = true;\n        el.remove();\n        done();\n      };\n      el.addEventListener("click", finish);\n      let line = 0;\n      const hexTimer = setInterval(() => {\n        const addr = (164 + line * 16).toString(16).toUpperCase().padStart(6, "0");\n        hex.textContent += `0X${addr} ${Array.from({ length: 4 }, () => Math.floor(Math.random() * 65535).toString(16).toUpperCase().padStart(4, "0")).join(" ")}\n`;\n        if (++line >= 14) {\n          clearInterval(hexTimer);\n          const text = `\nLOOT TERMINAL\n\\u276F DATA LINK ........ ${S.resolved.toUpperCase()}\n\\u276F EVENT ............ ${treasure_hunters_2026_default.name.toUpperCase()}\n\\u276F READY`;\n          let c = 0;\n          const typeTimer = setInterval(() => {\n            typed.textContent = text.slice(0, ++c);\n            if (c >= text.length) {\n              clearInterval(typeTimer);\n              setTimeout(finish, 350);\n            }\n          }, 17);\n        }\n      }, 30);\n    });\n  }\n  function fitViewport() {\n    const vv = window.visualViewport;\n    const h = vv ? vv.height : window.innerHeight;\n    const top = vv ? vv.offsetTop : 0;\n    document.documentElement.style.setProperty("--vvh", `${Math.round(h)}px`);\n    document.documentElement.style.setProperty("--vvt", `${Math.round(top)}px`);\n  }\n  function screenInfo() {\n    const vv = window.visualViewport;\n    const f = $("footer")?.getBoundingClientRect();\n    const safe = parseFloat(getComputedStyle($("safeProbe")).paddingBottom) || 0;\n    return `INNER ${window.innerHeight} \\xB7 VISUAL ${vv ? Math.round(vv.height) : "\\u2014"} \\xB7 SAFE ${Math.round(safe)} \\xB7 FOOTER ${f ? Math.round(f.bottom) : "\\u2014"} \\xB7 DPR ${window.devicePixelRatio}`;\n  }\n  fitViewport();\n  window.visualViewport?.addEventListener("resize", fitViewport);\n  window.visualViewport?.addEventListener("scroll", fitViewport);\n  window.addEventListener("resize", fitViewport);\n  window.addEventListener("orientationchange", () => setTimeout(fitViewport, 300));\n  (async function start() {\n    render();\n    await resolveMode();\n    await bootSequence();\n    render();\n    if (S.resolved === "demo") {\n      await scan("LilAvlis");\n    } else if (S.player) {\n      scan(S.player);\n    }\n  })();\n})();\n\n<\/script>\n</body>\n</html>\n';

// package.json
var package_default = {
  name: "fortnite-kit",
  version: "0.5.1",
  description: "Reusable Fortnite data toolkit: API clients, stats normaliser, treasure odds engine and a caching proxy. Zero dependencies. Runs in the browser, Node 18+ and Cloudflare Workers.",
  type: "module",
  main: "src/index.js",
  exports: {
    ".": "./src/index.js",
    "./worker": "./worker/worker.js"
  },
  scripts: {
    build: "node ui/build.mjs",
    test: "node --test test/*.test.js",
    pretest: "node ui/build.mjs",
    demo: "node cli/demo.js"
  },
  engines: {
    node: ">=18"
  },
  license: "MIT",
  devDependencies: {
    esbuild: "^0.24.2"
  }
};

// data/rarest.json
var rarest_default = {
  generatedAt: "2026-11-18T07:57:36.052Z",
  shopDate: "2026-11-18",
  source: "fortnite-api.com /v2/cosmetics shopHistory",
  minDaysAway: 500,
  top12: [
    {
      id: "Glider_Warthog",
      name: "Mako",
      type: "Glider",
      category: "Gliders",
      rarity: "Uncommon",
      series: null,
      set: null,
      image: "https://fortnite-api.com/images/cosmetics/br/glider_warthog/smallicon.png",
      firstSeen: "2018-01-02",
      lastSeen: "2018-01-02",
      daysInShop: 1,
      stints: 1,
      daysAway: 3242
    },
    {
      id: "CID_051_Athena_Commando_M_HolidayElf",
      name: "Codename E.L.F.",
      type: "Outfit",
      category: "Outfits",
      rarity: "Rare",
      series: null,
      set: "Polar Legends",
      image: "https://fortnite-api.com/images/cosmetics/br/cid_051_athena_commando_m_holidayelf/smallicon.png",
      firstSeen: "2017-12-17",
      lastSeen: "2018-01-31",
      daysInShop: 11,
      stints: 2,
      daysAway: 3213
    },
    {
      id: "BID_027_Scavenger",
      name: "Rust Bucket",
      type: "Back Bling",
      category: "Back Blings",
      rarity: "Epic",
      series: null,
      set: "Storm Scavenger",
      image: "https://fortnite-api.com/images/cosmetics/br/bid_027_scavenger/smallicon.png",
      firstSeen: "2018-04-13",
      lastSeen: "2018-04-19",
      daysInShop: 7,
      stints: 1,
      daysAway: 3135
    },
    {
      id: "CID_090_Athena_Commando_M_Tactical",
      name: "Rogue Agent",
      type: "Outfit",
      category: "Outfits",
      rarity: "Epic",
      series: null,
      set: "Black Vector",
      image: "https://fortnite-api.com/images/cosmetics/br/cid_090_athena_commando_m_tactical/smallicon.png",
      firstSeen: "2018-09-15",
      lastSeen: "2018-09-15",
      daysInShop: 1,
      stints: 1,
      daysAway: 2986
    },
    {
      id: "EID_Fresh",
      name: "Fresh",
      type: "Emote",
      category: "Emotes",
      rarity: "Epic",
      series: null,
      set: null,
      image: "https://fortnite-api.com/images/cosmetics/br/eid_fresh/smallicon.png",
      firstSeen: "2017-12-16",
      lastSeen: "2018-11-21",
      daysInShop: 30,
      stints: 28,
      daysAway: 2919
    },
    {
      id: "EID_WIR",
      name: "Hot Marat",
      type: "Emote",
      category: "Emotes",
      rarity: "Rare",
      series: null,
      set: null,
      image: "https://fortnite-api.com/images/cosmetics/br/eid_wir/smallicon.png",
      firstSeen: "2018-11-24",
      lastSeen: "2018-11-25",
      daysInShop: 2,
      stints: 1,
      daysAway: 2915
    },
    {
      id: "TOY_012_AmericanFootball",
      name: "Pigskin",
      type: "Toy",
      category: "Toys",
      rarity: "Rare",
      series: null,
      set: "Fourth Down",
      image: "https://fortnite-api.com/images/cosmetics/br/toy_012_americanfootball/smallicon.png",
      firstSeen: "2019-02-03",
      lastSeen: "2019-02-03",
      daysInShop: 1,
      stints: 1,
      daysAway: 2845
    },
    {
      id: "Glider_ID_122_Valentines",
      name: "Heartspan",
      type: "Glider",
      category: "Gliders",
      rarity: "Rare",
      series: null,
      set: "Royale Hearts",
      image: "https://fortnite-api.com/images/cosmetics/br/glider_id_122_valentines/smallicon.png",
      firstSeen: "2019-02-14",
      lastSeen: "2019-02-16",
      daysInShop: 3,
      stints: 1,
      daysAway: 2832
    },
    {
      id: "CID_259_Athena_Commando_M_StreetOps",
      name: "Reflex",
      type: "Outfit",
      category: "Outfits",
      rarity: "Rare",
      series: null,
      set: "Counterattack",
      image: "https://fortnite-api.com/images/cosmetics/br/cid_259_athena_commando_m_streetops/smallicon.png",
      firstSeen: "2019-03-03",
      lastSeen: "2019-03-04",
      daysInShop: 2,
      stints: 1,
      daysAway: 2816
    },
    {
      id: "BannerToken_002_Doggus",
      name: "Mecha Team Banner",
      type: "Banner",
      category: "Banners",
      rarity: "Uncommon",
      series: null,
      set: "Final Showdown",
      image: "https://fortnite-api.com/images/cosmetics/br/bannertoken_002_doggus/smallicon.png",
      firstSeen: "2019-07-18",
      lastSeen: "2019-07-20",
      daysInShop: 3,
      stints: 1,
      daysAway: 2678
    },
    {
      id: "BannerToken_001_Cattus",
      name: "Monster Team Banner",
      type: "Banner",
      category: "Banners",
      rarity: "Uncommon",
      series: null,
      set: "Final Showdown",
      image: "https://fortnite-api.com/images/cosmetics/br/bannertoken_001_cattus/smallicon.png",
      firstSeen: "2019-07-18",
      lastSeen: "2019-07-20",
      daysInShop: 3,
      stints: 1,
      daysAway: 2678
    },
    {
      id: "EID_TrophyCelebration",
      name: "Kiss The Cup",
      type: "Emote",
      category: "Emotes",
      rarity: "Uncommon",
      series: null,
      set: null,
      image: "https://fortnite-api.com/images/cosmetics/br/eid_trophycelebration/smallicon.png",
      firstSeen: "2019-07-27",
      lastSeen: "2019-07-28",
      daysInShop: 2,
      stints: 1,
      daysAway: 2670
    }
  ],
  categories: [
    {
      label: "Outfits",
      total: 261,
      items: [
        {
          id: "CID_051_Athena_Commando_M_HolidayElf",
          name: "Codename E.L.F.",
          type: "Outfit",
          category: "Outfits",
          rarity: "Rare",
          series: null,
          set: "Polar Legends",
          image: "https://fortnite-api.com/images/cosmetics/br/cid_051_athena_commando_m_holidayelf/smallicon.png",
          firstSeen: "2017-12-17",
          lastSeen: "2018-01-31",
          daysInShop: 11,
          stints: 2,
          daysAway: 3213
        },
        {
          id: "CID_090_Athena_Commando_M_Tactical",
          name: "Rogue Agent",
          type: "Outfit",
          category: "Outfits",
          rarity: "Epic",
          series: null,
          set: "Black Vector",
          image: "https://fortnite-api.com/images/cosmetics/br/cid_090_athena_commando_m_tactical/smallicon.png",
          firstSeen: "2018-09-15",
          lastSeen: "2018-09-15",
          daysInShop: 1,
          stints: 1,
          daysAway: 2986
        },
        {
          id: "CID_259_Athena_Commando_M_StreetOps",
          name: "Reflex",
          type: "Outfit",
          category: "Outfits",
          rarity: "Rare",
          series: null,
          set: "Counterattack",
          image: "https://fortnite-api.com/images/cosmetics/br/cid_259_athena_commando_m_streetops/smallicon.png",
          firstSeen: "2019-03-03",
          lastSeen: "2019-03-04",
          daysInShop: 2,
          stints: 1,
          daysAway: 2816
        },
        {
          id: "CID_478_Athena_Commando_F_WorldCup",
          name: "World Warrior",
          type: "Outfit",
          category: "Outfits",
          rarity: "Uncommon",
          series: null,
          set: "World Cup 2019",
          image: "https://fortnite-api.com/images/cosmetics/br/cid_478_athena_commando_f_worldcup/smallicon.png",
          firstSeen: "2019-07-26",
          lastSeen: "2019-07-28",
          daysInShop: 3,
          stints: 1,
          daysAway: 2670
        },
        {
          id: "CID_376_Athena_Commando_M_DarkShaman",
          name: "Shaman",
          type: "Outfit",
          category: "Outfits",
          rarity: "Epic",
          series: null,
          set: "Moonbone",
          image: "https://fortnite-api.com/images/cosmetics/br/cid_376_athena_commando_m_darkshaman/smallicon.png",
          firstSeen: "2019-03-31",
          lastSeen: "2019-12-02",
          daysInShop: 4,
          stints: 3,
          daysAway: 2543
        },
        {
          id: "CID_210_Athena_Commando_F_FootballGirlA",
          name: "Blitz",
          type: "Outfit",
          category: "Outfits",
          rarity: "Epic",
          series: null,
          set: "Fourth Down",
          image: "https://fortnite-api.com/images/cosmetics/br/cid_210_athena_commando_f_footballgirla/smallicon.png",
          firstSeen: "2018-11-10",
          lastSeen: "2020-02-03",
          daysInShop: 13,
          stints: 4,
          daysAway: 2480
        },
        {
          id: "CID_207_Athena_Commando_M_FootballDudeA",
          name: "End Zone",
          type: "Outfit",
          category: "Outfits",
          rarity: "Epic",
          series: null,
          set: "Fourth Down",
          image: "https://fortnite-api.com/images/cosmetics/br/cid_207_athena_commando_m_footballdudea/smallicon.png",
          firstSeen: "2018-11-10",
          lastSeen: "2020-02-03",
          daysInShop: 13,
          stints: 4,
          daysAway: 2480
        },
        {
          id: "CID_208_Athena_Commando_M_FootballDudeB",
          name: "Gridiron",
          type: "Outfit",
          category: "Outfits",
          rarity: "Epic",
          series: null,
          set: "Fourth Down",
          image: "https://fortnite-api.com/images/cosmetics/br/cid_208_athena_commando_m_footballdudeb/smallicon.png",
          firstSeen: "2018-11-10",
          lastSeen: "2020-02-03",
          daysInShop: 13,
          stints: 4,
          daysAway: 2480
        },
        {
          id: "CID_212_Athena_Commando_F_FootballGirlC",
          name: "Interceptor",
          type: "Outfit",
          category: "Outfits",
          rarity: "Epic",
          series: null,
          set: "Fourth Down",
          image: "https://fortnite-api.com/images/cosmetics/br/cid_212_athena_commando_f_footballgirlc/smallicon.png",
          firstSeen: "2018-11-10",
          lastSeen: "2020-02-03",
          daysInShop: 13,
          stints: 4,
          daysAway: 2480
        },
        {
          id: "CID_238_Athena_Commando_F_FootballGirlD",
          name: "Juke",
          type: "Outfit",
          category: "Outfits",
          rarity: "Epic",
          series: null,
          set: "Fourth Down",
          image: "https://fortnite-api.com/images/cosmetics/br/cid_238_athena_commando_f_footballgirld/smallicon.png",
          firstSeen: "2018-11-10",
          lastSeen: "2020-02-03",
          daysInShop: 13,
          stints: 4,
          daysAway: 2480
        },
        {
          id: "CID_211_Athena_Commando_F_FootballGirlB",
          name: "Rush",
          type: "Outfit",
          category: "Outfits",
          rarity: "Epic",
          series: null,
          set: "Fourth Down",
          image: "https://fortnite-api.com/images/cosmetics/br/cid_211_athena_commando_f_footballgirlb/smallicon.png",
          firstSeen: "2018-11-10",
          lastSeen: "2020-02-03",
          daysInShop: 13,
          stints: 4,
          daysAway: 2480
        },
        {
          id: "CID_209_Athena_Commando_M_FootballDudeC",
          name: "Spike",
          type: "Outfit",
          category: "Outfits",
          rarity: "Epic",
          series: null,
          set: "Fourth Down",
          image: "https://fortnite-api.com/images/cosmetics/br/cid_209_athena_commando_m_footballdudec/smallicon.png",
          firstSeen: "2018-11-10",
          lastSeen: "2020-02-03",
          daysInShop: 13,
          stints: 4,
          daysAway: 2480
        },
        {
          id: "CID_239_Athena_Commando_M_FootballDudeD",
          name: "Strong Guard",
          type: "Outfit",
          category: "Outfits",
          rarity: "Epic",
          series: null,
          set: "Fourth Down",
          image: "https://fortnite-api.com/images/cosmetics/br/cid_239_athena_commando_m_footballduded/smallicon.png",
          firstSeen: "2018-11-10",
          lastSeen: "2020-02-03",
          daysInShop: 13,
          stints: 4,
          daysAway: 2480
        },
        {
          id: "CID_709_Athena_Commando_F_BandolierSlurp",
          name: "Slurp Bandolette",
          type: "Outfit",
          category: "Outfits",
          rarity: "Slurp Series",
          series: "Slurp Series",
          set: "Slurp Legends",
          image: "https://fortnite-api.com/images/cosmetics/br/cid_709_athena_commando_f_bandolierslurp/smallicon.png",
          firstSeen: "2020-03-20",
          lastSeen: "2020-03-29",
          daysInShop: 10,
          stints: 1,
          daysAway: 2425
        },
        {
          id: "CID_708_Athena_Commando_M_SoldierSlurp",
          name: "Slurp Jonesy",
          type: "Outfit",
          category: "Outfits",
          rarity: "Slurp Series",
          series: "Slurp Series",
          set: "Slurp Legends",
          image: "https://fortnite-api.com/images/cosmetics/br/cid_708_athena_commando_m_soldierslurp/smallicon.png",
          firstSeen: "2020-03-20",
          lastSeen: "2020-03-29",
          daysInShop: 10,
          stints: 1,
          daysAway: 2425
        },
        {
          id: "CID_710_Athena_Commando_M_FishheadSlurp",
          name: "Slurp Leviathan ",
          type: "Outfit",
          category: "Outfits",
          rarity: "Slurp Series",
          series: "Slurp Series",
          set: "Slurp Legends",
          image: "https://fortnite-api.com/images/cosmetics/br/cid_710_athena_commando_m_fishheadslurp/smallicon.png",
          firstSeen: "2020-03-20",
          lastSeen: "2020-03-29",
          daysInShop: 10,
          stints: 1,
          daysAway: 2425
        },
        {
          id: "CID_722_Athena_Commando_M_TeriyakiFishAssassin",
          name: "Contract Giller",
          type: "Outfit",
          category: "Outfits",
          rarity: "Rare",
          series: null,
          set: "Bassassin",
          image: "https://fortnite-api.com/images/cosmetics/br/cid_722_athena_commando_m_teriyakifishassassin/smallicon.png",
          firstSeen: "2020-03-17",
          lastSeen: "2020-04-03",
          daysInShop: 18,
          stints: 1,
          daysAway: 2420
        },
        {
          id: "CID_761_Athena_Commando_M_CycloneSpace",
          name: "Astro Jack",
          type: "Outfit",
          category: "Outfits",
          rarity: "Icon Series",
          series: "Icon Series",
          set: "Travis Scott",
          image: "https://fortnite-api.com/images/cosmetics/br/cid_761_athena_commando_m_cyclonespace/smallicon.png",
          firstSeen: "2020-04-22",
          lastSeen: "2020-04-27",
          daysInShop: 6,
          stints: 1,
          daysAway: 2396
        },
        {
          id: "CID_703_Athena_Commando_M_Cyclone",
          name: "Travis Scott",
          type: "Outfit",
          category: "Outfits",
          rarity: "Icon Series",
          series: "Icon Series",
          set: "Travis Scott",
          image: "https://fortnite-api.com/images/cosmetics/br/cid_703_athena_commando_m_cyclone/smallicon.png",
          firstSeen: "2020-04-22",
          lastSeen: "2020-04-27",
          daysInShop: 6,
          stints: 1,
          daysAway: 2396
        },
        {
          id: "CID_753_Athena_Commando_F_Hostile",
          name: "Rue",
          type: "Outfit",
          category: "Outfits",
          rarity: "Rare",
          series: null,
          set: "Lil' Red",
          image: "https://fortnite-api.com/images/cosmetics/br/cid_753_athena_commando_f_hostile/smallicon.png",
          firstSeen: "2020-04-25",
          lastSeen: "2020-05-27",
          daysInShop: 2,
          stints: 2,
          daysAway: 2366
        },
        {
          id: "CID_964_Athena_Commando_M_Historian_869BC",
          name: "Kratos",
          type: "Outfit",
          category: "Outfits",
          rarity: "Gaming Legends Series",
          series: "Gaming Legends Series",
          set: "Oathbreaker",
          image: "https://fortnite-api.com/images/cosmetics/br/cid_964_athena_commando_m_historian_869bc/smallicon.png",
          firstSeen: "2020-12-04",
          lastSeen: "2021-03-19",
          daysInShop: 33,
          stints: 3,
          daysAway: 2070
        },
        {
          id: "CID_415_Athena_Commando_F_AssassinSuit",
          name: "Sofia",
          type: "Outfit",
          category: "Outfits",
          rarity: "Epic",
          series: null,
          set: "John Wick",
          image: "https://fortnite-api.com/images/cosmetics/br/cid_415_athena_commando_f_assassinsuit/smallicon.png",
          firstSeen: "2019-06-28",
          lastSeen: "2021-03-25",
          daysInShop: 13,
          stints: 4,
          daysAway: 2064
        },
        {
          id: "CID_A_106_Athena_Commando_F_FuturePinkGoal",
          name: "The Champion",
          type: "Outfit",
          category: "Outfits",
          rarity: "Uncommon",
          series: null,
          set: "FNCS",
          image: "https://fortnite-api.com/images/cosmetics/br/cid_a_106_athena_commando_f_futurepinkgoal/smallicon.png",
          firstSeen: "2021-05-27",
          lastSeen: "2021-05-31",
          daysInShop: 5,
          stints: 1,
          daysAway: 1997
        },
        {
          id: "CID_A_006_Athena_Commando_M_ConvoyTarantula_641PZ",
          name: "Snake Eyes",
          type: "Outfit",
          category: "Outfits",
          rarity: "Epic",
          series: null,
          set: "Arashikage Clan",
          image: "https://fortnite-api.com/images/cosmetics/br/cid_a_006_athena_commando_m_convoytarantula_641pz/smallicon.png",
          firstSeen: "2021-01-31",
          lastSeen: "2021-08-11",
          daysInShop: 50,
          stints: 3,
          daysAway: 1925
        },
        {
          id: "CID_A_196_Athena_Commando_F_FNCSGreen",
          name: "Major Glory",
          type: "Outfit",
          category: "Outfits",
          rarity: "Uncommon",
          series: null,
          set: "FNCS",
          image: "https://fortnite-api.com/images/cosmetics/br/cid_a_196_athena_commando_f_fncsgreen/smallicon.png",
          firstSeen: "2021-09-02",
          lastSeen: "2021-09-06",
          daysInShop: 5,
          stints: 1,
          daysAway: 1899
        }
      ]
    },
    {
      label: "Back Blings",
      total: 192,
      items: [
        {
          id: "BID_027_Scavenger",
          name: "Rust Bucket",
          type: "Back Bling",
          category: "Back Blings",
          rarity: "Epic",
          series: null,
          set: "Storm Scavenger",
          image: "https://fortnite-api.com/images/cosmetics/br/bid_027_scavenger/smallicon.png",
          firstSeen: "2018-04-13",
          lastSeen: "2018-04-19",
          daysInShop: 7,
          stints: 1,
          daysAway: 3135
        },
        {
          id: "PetCarrier_011_Dog_Raptor",
          name: "Gunner",
          type: "Pet",
          category: "Back Blings",
          rarity: "Epic",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/petcarrier_011_dog_raptor/smallicon.png",
          firstSeen: "2019-08-14",
          lastSeen: "2019-08-14",
          daysInShop: 1,
          stints: 1,
          daysAway: 2653
        },
        {
          id: "BID_496_TeriyakiFishAssassin",
          name: "Dorsal Destroyer",
          type: "Back Bling",
          category: "Back Blings",
          rarity: "Rare",
          series: null,
          set: "Bassassin",
          image: "https://fortnite-api.com/images/cosmetics/br/bid_496_teriyakifishassassin/smallicon.png",
          firstSeen: "2020-03-17",
          lastSeen: "2020-04-03",
          daysInShop: 18,
          stints: 1,
          daysAway: 2420
        },
        {
          id: "BID_515_Hostile",
          name: "Scarlet Satchel",
          type: "Back Bling",
          category: "Back Blings",
          rarity: "Rare",
          series: null,
          set: "Lil' Red",
          image: "https://fortnite-api.com/images/cosmetics/br/bid_515_hostile/smallicon.png",
          firstSeen: "2020-05-27",
          lastSeen: "2020-05-27",
          daysInShop: 1,
          stints: 1,
          daysAway: 2366
        },
        {
          id: "BID_713_FNCS21",
          name: "Champion's Crest",
          type: "Back Bling",
          category: "Back Blings",
          rarity: "Uncommon",
          series: null,
          set: "FNCS",
          image: "https://fortnite-api.com/images/cosmetics/br/bid_713_fncs21/smallicon.png",
          firstSeen: "2021-03-12",
          lastSeen: "2021-03-15",
          daysInShop: 4,
          stints: 1,
          daysAway: 2074
        },
        {
          id: "BID_658_Historian_4RCG3",
          name: "Mimir",
          type: "Back Bling",
          category: "Back Blings",
          rarity: "Gaming Legends Series",
          series: "Gaming Legends Series",
          set: "Oathbreaker",
          image: "https://fortnite-api.com/images/cosmetics/br/bid_658_historian_4rcg3/smallicon.png",
          firstSeen: "2020-12-04",
          lastSeen: "2021-03-19",
          daysInShop: 33,
          stints: 3,
          daysAway: 2070
        },
        {
          id: "BID_272_AssassinSuitFemale",
          name: "Gun Bag",
          type: "Back Bling",
          category: "Back Blings",
          rarity: "Epic",
          series: null,
          set: "John Wick",
          image: "https://fortnite-api.com/images/cosmetics/br/bid_272_assassinsuitfemale/smallicon.png",
          firstSeen: "2020-10-11",
          lastSeen: "2021-03-25",
          daysInShop: 9,
          stints: 2,
          daysAway: 2064
        },
        {
          id: "BID_692_ConvoyTarantula_34ZM0",
          name: "Snake Eyes Katana",
          type: "Back Bling",
          category: "Back Blings",
          rarity: "Epic",
          series: null,
          set: "Arashikage Clan",
          image: "https://fortnite-api.com/images/cosmetics/br/bid_692_convoytarantula_34zm0/smallicon.png",
          firstSeen: "2021-01-31",
          lastSeen: "2021-08-11",
          daysInShop: 50,
          stints: 3,
          daysAway: 1925
        },
        {
          id: "BID_840_FNCSGreen",
          name: "FNCS Holoflair",
          type: "Back Bling",
          category: "Back Blings",
          rarity: "Uncommon",
          series: null,
          set: "FNCS",
          image: "https://fortnite-api.com/images/cosmetics/br/bid_840_fncsgreen/smallicon.png",
          firstSeen: "2021-09-02",
          lastSeen: "2021-09-06",
          daysInShop: 5,
          stints: 1,
          daysAway: 1899
        },
        {
          id: "BID_832_Lavish_TV630",
          name: "Detective's Duffle",
          type: "Back Bling",
          category: "Back Blings",
          rarity: "Epic",
          series: null,
          set: "Loose Cannon",
          image: "https://fortnite-api.com/images/cosmetics/br/bid_832_lavish_tv630/smallicon.png",
          firstSeen: "2021-08-29",
          lastSeen: "2021-09-29",
          daysInShop: 10,
          stints: 2,
          daysAway: 1876
        },
        {
          id: "BID_765_DownpourMale_YLV93",
          name: "Hemalurgic Spikes",
          type: "Back Bling",
          category: "Back Blings",
          rarity: "Epic",
          series: null,
          set: "Cosmere Castaway",
          image: "https://fortnite-api.com/images/cosmetics/br/bid_765_downpourmale_ylv93/smallicon.png",
          firstSeen: "2021-05-28",
          lastSeen: "2021-11-07",
          daysInShop: 11,
          stints: 6,
          daysAway: 1837
        },
        {
          id: "BID_910_FNCS_Purple",
          name: "Victory Crest",
          type: "Back Bling",
          category: "Back Blings",
          rarity: "Uncommon",
          series: null,
          set: "FNCS",
          image: "https://fortnite-api.com/images/cosmetics/br/bid_910_fncs_purple/smallicon.png",
          firstSeen: "2021-11-18",
          lastSeen: "2021-11-22",
          daysInShop: 5,
          stints: 1,
          daysAway: 1822
        },
        {
          id: "BID_634_York_Female",
          name: "Ghost Trap",
          type: "Back Bling",
          category: "Back Blings",
          rarity: "Rare",
          series: null,
          set: "Ghostbusters",
          image: "https://fortnite-api.com/images/cosmetics/br/bid_634_york_female/smallicon.png",
          firstSeen: "2020-10-25",
          lastSeen: "2021-12-01",
          daysInShop: 21,
          stints: 2,
          daysAway: 1813
        },
        {
          id: "BID_635_York_Male",
          name: "Proton Pack",
          type: "Back Bling",
          category: "Back Blings",
          rarity: "Rare",
          series: null,
          set: "Ghostbusters",
          image: "https://fortnite-api.com/images/cosmetics/br/bid_635_york_male/smallicon.png",
          firstSeen: "2020-10-25",
          lastSeen: "2021-12-01",
          daysInShop: 21,
          stints: 2,
          daysAway: 1813
        },
        {
          id: "BID_929_TwentyTwo",
          name: "Happy 2022",
          type: "Back Bling",
          category: "Back Blings",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/bid_929_twentytwo/smallicon.png",
          firstSeen: "2021-12-31",
          lastSeen: "2022-01-01",
          daysInShop: 2,
          stints: 1,
          daysAway: 1782
        },
        {
          id: "BID_955_Trey_18FU6",
          name: "NBA Beacon",
          type: "Back Bling",
          category: "Back Blings",
          rarity: "Rare",
          series: null,
          set: "NBA 75",
          image: "https://fortnite-api.com/images/cosmetics/br/bid_955_trey_18fu6/smallicon.png",
          firstSeen: "2022-02-16",
          lastSeen: "2022-02-23",
          daysInShop: 8,
          stints: 1,
          daysAway: 1729
        },
        {
          id: "BID_967_FNCSBlue",
          name: "Winner's Mark",
          type: "Back Bling",
          category: "Back Blings",
          rarity: "Uncommon",
          series: null,
          set: "FNCS",
          image: "https://fortnite-api.com/images/cosmetics/br/bid_967_fncsblue/smallicon.png",
          firstSeen: "2022-03-03",
          lastSeen: "2022-03-07",
          daysInShop: 5,
          stints: 1,
          daysAway: 1717
        },
        {
          id: "BID_909_HasteMale_EPX5A",
          name: "Cool Grey",
          type: "Back Bling",
          category: "Back Blings",
          rarity: "Epic",
          series: null,
          set: "Air Jordan XI Cool Grey",
          image: "https://fortnite-api.com/images/cosmetics/br/bid_909_hastemale_epx5a/smallicon.png",
          firstSeen: "2021-12-02",
          lastSeen: "2022-03-26",
          daysInShop: 13,
          stints: 2,
          daysAway: 1698
        },
        {
          id: "BID_982_Scrawl_VFI6L",
          name: "Basquiat's Tuxedo",
          type: "Back Bling",
          category: "Back Blings",
          rarity: "Rare",
          series: null,
          set: "Basquiat",
          image: "https://fortnite-api.com/images/cosmetics/br/bid_982_scrawl_vfi6l/smallicon.png",
          firstSeen: "2022-04-11",
          lastSeen: "2022-04-14",
          daysInShop: 4,
          stints: 1,
          daysAway: 1679
        },
        {
          id: "BID_983_ScrawlDino_AD541",
          name: "Crowned Rex",
          type: "Back Bling",
          category: "Back Blings",
          rarity: "Rare",
          series: null,
          set: "Basquiat",
          image: "https://fortnite-api.com/images/cosmetics/br/bid_983_scrawldino_ad541/smallicon.png",
          firstSeen: "2022-04-11",
          lastSeen: "2022-04-14",
          daysInShop: 4,
          stints: 1,
          daysAway: 1679
        },
        {
          id: "BID_997_FNCS20Female",
          name: "Champion's Shield",
          type: "Back Bling",
          category: "Back Blings",
          rarity: "Uncommon",
          series: null,
          set: "FNCS",
          image: "https://fortnite-api.com/images/cosmetics/br/bid_997_fncs20female/smallicon.png",
          firstSeen: "2022-05-26",
          lastSeen: "2022-05-30",
          daysInShop: 5,
          stints: 1,
          daysAway: 1633
        },
        {
          id: "BID_A_010_JumbotronS20Male",
          name: "Targeter's Tally",
          type: "Back Bling",
          category: "Back Blings",
          rarity: "Uncommon",
          series: null,
          set: "FNCS",
          image: "https://fortnite-api.com/images/cosmetics/br/bid_a_010_jumbotrons20male/smallicon.png",
          firstSeen: "2022-05-26",
          lastSeen: "2022-05-30",
          daysInShop: 5,
          stints: 1,
          daysAway: 1633
        },
        {
          id: "BID_A_041_FNCS21Female",
          name: "Champion's Honor",
          type: "Back Bling",
          category: "Back Blings",
          rarity: "Uncommon",
          series: null,
          set: "FNCS",
          image: "https://fortnite-api.com/images/cosmetics/br/bid_a_041_fncs21female/smallicon.png",
          firstSeen: "2022-08-11",
          lastSeen: "2022-08-12",
          daysInShop: 2,
          stints: 1,
          daysAway: 1559
        },
        {
          id: "BID_A_053_JumbotronS21Male",
          name: "Ultrabrite Elim Counter",
          type: "Back Bling",
          category: "Back Blings",
          rarity: "Uncommon",
          series: null,
          set: "FNCS",
          image: "https://fortnite-api.com/images/cosmetics/br/bid_a_053_jumbotrons21male/smallicon.png",
          firstSeen: "2022-08-11",
          lastSeen: "2022-08-17",
          daysInShop: 7,
          stints: 1,
          daysAway: 1554
        },
        {
          id: "BID_862_BigBucksBattleship_1JA5G",
          name: "Battleship",
          type: "Back Bling",
          category: "Back Blings",
          rarity: "Rare",
          series: null,
          set: "Monopoly Tokens",
          image: "https://fortnite-api.com/images/cosmetics/br/bid_862_bigbucksbattleship_1ja5g/smallicon.png",
          firstSeen: "2021-11-06",
          lastSeen: "2022-08-22",
          daysInShop: 5,
          stints: 4,
          daysAway: 1549
        }
      ]
    },
    {
      label: "Pickaxes",
      total: 243,
      items: [
        {
          id: "Pickaxe_ID_359_CycloneMale",
          name: "Diamond Jack",
          type: "Pickaxe",
          category: "Pickaxes",
          rarity: "Icon Series",
          series: "Icon Series",
          set: "Travis Scott",
          image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_359_cyclonemale/smallicon.png",
          firstSeen: "2020-04-22",
          lastSeen: "2020-04-27",
          daysInShop: 6,
          stints: 1,
          daysAway: 2396
        },
        {
          id: "Pickaxe_ID_508_HistorianMale_6BQSW",
          name: "Leviathan Axe",
          type: "Pickaxe",
          category: "Pickaxes",
          rarity: "Gaming Legends Series",
          series: "Gaming Legends Series",
          set: "Oathbreaker",
          image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_508_historianmale_6bqsw/smallicon.png",
          firstSeen: "2020-12-04",
          lastSeen: "2021-03-19",
          daysInShop: 33,
          stints: 3,
          daysAway: 2070
        },
        {
          id: "Pickaxe_ID_535_ConvoyTarantulaMale_GQ82N",
          name: "Snake Eyes Katana",
          type: "Pickaxe",
          category: "Pickaxes",
          rarity: "Epic",
          series: null,
          set: "Arashikage Clan",
          image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_535_convoytarantulamale_gq82n/smallicon.png",
          firstSeen: "2021-01-31",
          lastSeen: "2021-08-11",
          daysInShop: 50,
          stints: 3,
          daysAway: 1925
        },
        {
          id: "Pickaxe_ID_653_LavishMale1H_SWKJB",
          name: "Loose Cannon Cutters",
          type: "Pickaxe",
          category: "Pickaxes",
          rarity: "Uncommon",
          series: null,
          set: "Loose Cannon",
          image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_653_lavishmale1h_swkjb/smallicon.png",
          firstSeen: "2021-08-29",
          lastSeen: "2021-09-29",
          daysInShop: 10,
          stints: 2,
          daysAway: 1876
        },
        {
          id: "Pickaxe_ID_478_FlowerSkeletonMale1H",
          name: "Blooming Doom",
          type: "Pickaxe",
          category: "Pickaxes",
          rarity: "Rare",
          series: null,
          set: "Ultimate Reckoning",
          image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_478_flowerskeletonmale1h/smallicon.png",
          firstSeen: "2020-10-15",
          lastSeen: "2021-11-01",
          daysInShop: 13,
          stints: 4,
          daysAway: 1843
        },
        {
          id: "Pickaxe_ID_481_SpookyNeonFemale1H",
          name: "Grim Axes",
          type: "Pickaxe",
          category: "Pickaxes",
          rarity: "Uncommon",
          series: null,
          set: "Ultimate Reckoning",
          image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_481_spookyneonfemale1h/smallicon.png",
          firstSeen: "2020-10-15",
          lastSeen: "2021-11-01",
          daysInShop: 13,
          stints: 4,
          daysAway: 1843
        },
        {
          id: "Pickaxe_ID_604_DownpourMale_Z48CM",
          name: "Volcanic Glass Daggers",
          type: "Pickaxe",
          category: "Pickaxes",
          rarity: "Epic",
          series: null,
          set: "Cosmere Castaway",
          image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_604_downpourmale_z48cm/smallicon.png",
          firstSeen: "2021-05-28",
          lastSeen: "2021-11-07",
          daysInShop: 11,
          stints: 6,
          daysAway: 1837
        },
        {
          id: "Pickaxe_ID_491_YorkMale",
          name: "Proton Pickaxe",
          type: "Pickaxe",
          category: "Pickaxes",
          rarity: "Rare",
          series: null,
          set: "Ghostbusters",
          image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_491_yorkmale/smallicon.png",
          firstSeen: "2020-10-25",
          lastSeen: "2021-12-01",
          daysInShop: 21,
          stints: 2,
          daysAway: 1813
        },
        {
          id: "Pickaxe_ID_107_HalloweenTomato",
          name: "Night Slicer",
          type: "Pickaxe",
          category: "Pickaxes",
          rarity: "Rare",
          series: null,
          set: "Pizza Pit",
          image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_107_halloweentomato/smallicon.png",
          firstSeen: "2018-11-15",
          lastSeen: "2022-06-05",
          daysInShop: 22,
          stints: 22,
          daysAway: 1627
        },
        {
          id: "Pickaxe_ID_734_SlitherMale_762K0",
          name: "Cobra's Curse",
          type: "Pickaxe",
          category: "Pickaxes",
          rarity: "Rare",
          series: null,
          set: "Cobra Kai",
          image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_734_slithermale_762k0/smallicon.png",
          firstSeen: "2021-12-31",
          lastSeen: "2022-09-10",
          daysInShop: 19,
          stints: 4,
          daysAway: 1530
        },
        {
          id: "Pickaxe_ID_733_SlitherFemale_M1YCL",
          name: "Dojo Logo",
          type: "Pickaxe",
          category: "Pickaxes",
          rarity: "Rare",
          series: null,
          set: "Cobra Kai",
          image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_733_slitherfemale_m1ycl/smallicon.png",
          firstSeen: "2021-12-31",
          lastSeen: "2022-09-10",
          daysInShop: 19,
          stints: 4,
          daysAway: 1530
        },
        {
          id: "Pickaxe_SaharaMale",
          name: "Hawkman's Mace",
          type: "Pickaxe",
          category: "Pickaxes",
          rarity: "DC SERIES",
          series: "DC SERIES",
          set: "Black Adam",
          image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_saharamale/smallicon.png",
          firstSeen: "2022-10-21",
          lastSeen: "2022-11-03",
          daysInShop: 14,
          stints: 1,
          daysAway: 1476
        },
        {
          id: "Pickaxe_SpyMale_FNCS_22",
          name: "Champion Balisong",
          type: "Pickaxe",
          category: "Pickaxes",
          rarity: "Uncommon",
          series: null,
          set: "FNCS",
          image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_spymale_fncs_22/smallicon.png",
          firstSeen: "2022-11-10",
          lastSeen: "2022-11-16",
          daysInShop: 7,
          stints: 1,
          daysAway: 1463
        },
        {
          id: "Pickaxe_ID_636_DojoMale1H",
          name: "Stellapen Smashpack",
          type: "Pickaxe",
          category: "Pickaxes",
          rarity: "Rare",
          series: null,
          set: "Gildedguy",
          image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_636_dojomale1h/smallicon.png",
          firstSeen: "2021-07-23",
          lastSeen: "2022-11-17",
          daysInShop: 20,
          stints: 15,
          daysAway: 1462
        },
        {
          id: "Pickaxe_ID_719_RustyBoltFemale_0VJ7J",
          name: "Breaker Mace",
          type: "Pickaxe",
          category: "Pickaxes",
          rarity: "Gaming Legends Series",
          series: "Gaming Legends Series",
          set: "Delta-One",
          image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_719_rustyboltfemale_0vj7j/smallicon.png",
          firstSeen: "2021-12-10",
          lastSeen: "2022-12-12",
          daysInShop: 49,
          stints: 3,
          daysAway: 1437
        },
        {
          id: "Pickaxe_ID_721_RustyBoltSliceMale_V3A4N",
          name: "Butcher Cleaver",
          type: "Pickaxe",
          category: "Pickaxes",
          rarity: "Gaming Legends Series",
          series: "Gaming Legends Series",
          set: "Delta-One",
          image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_721_rustyboltslicemale_v3a4n/smallicon.png",
          firstSeen: "2021-12-10",
          lastSeen: "2022-12-12",
          daysInShop: 49,
          stints: 3,
          daysAway: 1437
        },
        {
          id: "Pickaxe_ID_720_RustyBoltMale_UZ5E5",
          name: "Thumper",
          type: "Pickaxe",
          category: "Pickaxes",
          rarity: "Gaming Legends Series",
          series: "Gaming Legends Series",
          set: "Delta-One",
          image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_720_rustyboltmale_uz5e5/smallicon.png",
          firstSeen: "2021-12-10",
          lastSeen: "2022-12-12",
          daysInShop: 49,
          stints: 3,
          daysAway: 1437
        },
        {
          id: "Pickaxe_ID_702_GrandeurMale_6UV6L",
          name: "Umbra-Axe",
          type: "Pickaxe",
          category: "Pickaxes",
          rarity: "Rare",
          series: null,
          set: "Moncler Classic",
          image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_702_grandeurmale_6uv6l/smallicon.png",
          firstSeen: "2021-11-21",
          lastSeen: "2023-01-07",
          daysInShop: 20,
          stints: 4,
          daysAway: 1411
        },
        {
          id: "Pickaxe_ID_304_NoshHunter1H",
          name: "Stickers",
          type: "Pickaxe",
          category: "Pickaxes",
          rarity: "Rare",
          series: null,
          set: "Final Reckoning",
          image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_304_noshhunter1h/smallicon.png",
          firstSeen: "2019-10-24",
          lastSeen: "2023-01-12",
          daysInShop: 13,
          stints: 11,
          daysAway: 1406
        },
        {
          id: "Pickaxe_ID_769_JourneyMentorFemale",
          name: "Handaxes of the Raven Clan",
          type: "Pickaxe",
          category: "Pickaxes",
          rarity: "Gaming Legends Series",
          series: "Gaming Legends Series",
          set: "Tales from the Animus",
          image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_769_journeymentorfemale/smallicon.png",
          firstSeen: "2022-04-08",
          lastSeen: "2023-02-12",
          daysInShop: 10,
          stints: 3,
          daysAway: 1375
        },
        {
          id: "Pickaxe_ID_096_FootballReferee",
          name: "First Downer",
          type: "Pickaxe",
          category: "Pickaxes",
          rarity: "Uncommon",
          series: null,
          set: "Fourth Down",
          image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_096_footballreferee/smallicon.png",
          firstSeen: "2018-11-10",
          lastSeen: "2023-02-13",
          daysInShop: 40,
          stints: 11,
          daysAway: 1374
        },
        {
          id: "Pickaxe_ID_095_FootballTrophy",
          name: "Golden Pigskin",
          type: "Pickaxe",
          category: "Pickaxes",
          rarity: "Uncommon",
          series: null,
          set: "Fourth Down",
          image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_095_footballtrophy/smallicon.png",
          firstSeen: "2018-11-10",
          lastSeen: "2023-02-13",
          daysInShop: 40,
          stints: 11,
          daysAway: 1374
        },
        {
          id: "Pickaxe_ID_147_TechOps",
          name: "Armature",
          type: "Pickaxe",
          category: "Pickaxes",
          rarity: "Uncommon",
          series: null,
          set: "Tech Ops",
          image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_147_techops/smallicon.png",
          firstSeen: "2019-01-25",
          lastSeen: "2023-02-16",
          daysInShop: 5,
          stints: 4,
          daysAway: 1371
        },
        {
          id: "Pickaxe_ID_751_RoverFemale_44TG1",
          name: "Parashurama Axe",
          type: "Pickaxe",
          category: "Pickaxes",
          rarity: "Rare",
          series: null,
          set: "Uncharted",
          image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_751_roverfemale_44tg1/smallicon.png",
          firstSeen: "2022-02-18",
          lastSeen: "2023-02-17",
          daysInShop: 35,
          stints: 5,
          daysAway: 1370
        },
        {
          id: "Pickaxe_ID_752_RoverMale_I98VZ",
          name: "Second Hand Saber",
          type: "Pickaxe",
          category: "Pickaxes",
          rarity: "Rare",
          series: null,
          set: "Uncharted",
          image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_752_rovermale_i98vz/smallicon.png",
          firstSeen: "2022-02-18",
          lastSeen: "2023-02-17",
          daysInShop: 35,
          stints: 5,
          daysAway: 1370
        }
      ]
    },
    {
      label: "Gliders",
      total: 40,
      items: [
        {
          id: "Glider_Warthog",
          name: "Mako",
          type: "Glider",
          category: "Gliders",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/glider_warthog/smallicon.png",
          firstSeen: "2018-01-02",
          lastSeen: "2018-01-02",
          daysInShop: 1,
          stints: 1,
          daysAway: 3242
        },
        {
          id: "Glider_ID_122_Valentines",
          name: "Heartspan",
          type: "Glider",
          category: "Gliders",
          rarity: "Rare",
          series: null,
          set: "Royale Hearts",
          image: "https://fortnite-api.com/images/cosmetics/br/glider_id_122_valentines/smallicon.png",
          firstSeen: "2019-02-14",
          lastSeen: "2019-02-16",
          daysInShop: 3,
          stints: 1,
          daysAway: 2832
        },
        {
          id: "Glider_ID_257_Historian_VS0BJ",
          name: "Guardian Shield",
          type: "Glider",
          category: "Gliders",
          rarity: "Gaming Legends Series",
          series: "Gaming Legends Series",
          set: "Oathbreaker",
          image: "https://fortnite-api.com/images/cosmetics/br/glider_id_257_historian_vs0bj/smallicon.png",
          firstSeen: "2020-12-04",
          lastSeen: "2021-03-19",
          daysInShop: 33,
          stints: 3,
          daysAway: 2070
        },
        {
          id: "Glider_ID_248_York",
          name: "Ecto-Glider",
          type: "Glider",
          category: "Gliders",
          rarity: "Epic",
          series: null,
          set: "Ghostbusters",
          image: "https://fortnite-api.com/images/cosmetics/br/glider_id_248_york/smallicon.png",
          firstSeen: "2020-10-25",
          lastSeen: "2021-12-01",
          daysInShop: 21,
          stints: 2,
          daysAway: 1813
        },
        {
          id: "Glider_ID_340_TwentyTwoMale",
          name: "Midnight Glidemast",
          type: "Glider",
          category: "Gliders",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/glider_id_340_twentytwomale/smallicon.png",
          firstSeen: "2021-12-31",
          lastSeen: "2022-01-01",
          daysInShop: 2,
          stints: 1,
          daysAway: 1782
        },
        {
          id: "Glider_ID_347_PeachMale",
          name: "Diamond Pony",
          type: "Glider",
          category: "Gliders",
          rarity: "Gaming Legends Series",
          series: "Gaming Legends Series",
          set: "Mayhem",
          image: "https://fortnite-api.com/images/cosmetics/br/glider_id_347_peachmale/smallicon.png",
          firstSeen: "2022-04-02",
          lastSeen: "2022-04-09",
          daysInShop: 8,
          stints: 1,
          daysAway: 1684
        },
        {
          id: "Glider_Shark_FNCS",
          name: "Champion Sail Shark",
          type: "Glider",
          category: "Gliders",
          rarity: "Rare",
          series: null,
          set: "FNCS",
          image: "https://fortnite-api.com/images/cosmetics/br/glider_shark_fncs/smallicon.png",
          firstSeen: "2022-11-10",
          lastSeen: "2022-11-16",
          daysInShop: 7,
          stints: 1,
          daysAway: 1463
        },
        {
          id: "Glider_ID_333_RustyBolt_13IXR",
          name: "Skiff",
          type: "Glider",
          category: "Gliders",
          rarity: "Gaming Legends Series",
          series: "Gaming Legends Series",
          set: "Delta-One",
          image: "https://fortnite-api.com/images/cosmetics/br/glider_id_333_rustybolt_13ixr/smallicon.png",
          firstSeen: "2021-12-10",
          lastSeen: "2022-12-12",
          daysInShop: 49,
          stints: 3,
          daysAway: 1437
        },
        {
          id: "Glider_ID_192_Present",
          name: "Winter Wrapper",
          type: "Glider",
          category: "Gliders",
          rarity: "Uncommon",
          series: null,
          set: "Winter Wonderland",
          image: "https://fortnite-api.com/images/cosmetics/br/glider_id_192_present/smallicon.png",
          firstSeen: "2019-12-24",
          lastSeen: "2022-12-14",
          daysInShop: 4,
          stints: 4,
          daysAway: 1435
        },
        {
          id: "Glider_ID_092_StreetOps",
          name: "Pivot",
          type: "Glider",
          category: "Gliders",
          rarity: "Rare",
          series: null,
          set: "Counterattack",
          image: "https://fortnite-api.com/images/cosmetics/br/glider_id_092_streetops/smallicon.png",
          firstSeen: "2019-03-03",
          lastSeen: "2022-12-26",
          daysInShop: 3,
          stints: 2,
          daysAway: 1423
        },
        {
          id: "Glider_ID_325_GrandeurMale_ES8I4",
          name: "Para-Pluie",
          type: "Glider",
          category: "Gliders",
          rarity: "Rare",
          series: null,
          set: "Moncler Classic",
          image: "https://fortnite-api.com/images/cosmetics/br/glider_id_325_grandeurmale_es8i4/smallicon.png",
          firstSeen: "2021-11-21",
          lastSeen: "2023-01-07",
          daysInShop: 20,
          stints: 4,
          daysAway: 1411
        },
        {
          id: "Glider_ID_357_JourneyFemale",
          name: "Wolf-Kissed Longboat",
          type: "Glider",
          category: "Gliders",
          rarity: "Gaming Legends Series",
          series: "Gaming Legends Series",
          set: "Tales from the Animus",
          image: "https://fortnite-api.com/images/cosmetics/br/glider_id_357_journeyfemale/smallicon.png",
          firstSeen: "2022-04-08",
          lastSeen: "2023-02-12",
          daysInShop: 10,
          stints: 3,
          daysAway: 1375
        },
        {
          id: "Glider_ID_350_RoverMale_41XKF",
          name: `Sully's "New" Seaplane`,
          type: "Glider",
          category: "Gliders",
          rarity: "Rare",
          series: null,
          set: "Uncharted",
          image: "https://fortnite-api.com/images/cosmetics/br/glider_id_350_rovermale_41xkf/smallicon.png",
          firstSeen: "2022-11-17",
          lastSeen: "2023-02-17",
          daysInShop: 16,
          stints: 3,
          daysAway: 1370
        },
        {
          id: "Glider_ID_287_Alchemy_W87KL",
          name: "Glinthawk",
          type: "Glider",
          category: "Gliders",
          rarity: "Gaming Legends Series",
          series: "Gaming Legends Series",
          set: "Horizon Zero Dawn",
          image: "https://fortnite-api.com/images/cosmetics/br/glider_id_287_alchemy_w87kl/smallicon.png",
          firstSeen: "2021-04-16",
          lastSeen: "2023-03-20",
          daysInShop: 41,
          stints: 4,
          daysAway: 1339
        },
        {
          id: "Glider_ID_302_MajestyMale_T1ICF",
          name: "Wingspan",
          type: "Glider",
          category: "Gliders",
          rarity: "Icon Series",
          series: "Icon Series",
          set: "King James",
          image: "https://fortnite-api.com/images/cosmetics/br/glider_id_302_majestymale_t1icf/smallicon.png",
          firstSeen: "2021-07-15",
          lastSeen: "2023-04-13",
          daysInShop: 42,
          stints: 4,
          daysAway: 1315
        },
        {
          id: "Glider_CoyoteTrail",
          name: "Victory in Flight",
          type: "Glider",
          category: "Gliders",
          rarity: "Icon Series",
          series: "Icon Series",
          set: "Giannis Antetokounmpo",
          image: "https://fortnite-api.com/images/cosmetics/br/glider_coyotetrail/smallicon.png",
          firstSeen: "2022-12-25",
          lastSeen: "2023-04-18",
          daysInShop: 20,
          stints: 3,
          daysAway: 1310
        },
        {
          id: "Glider_NightHawk",
          name: "Thunder Spear Flier",
          type: "Glider",
          category: "Gliders",
          rarity: "Epic",
          series: null,
          set: "Special Operations Squad",
          image: "https://fortnite-api.com/images/cosmetics/br/glider_nighthawk/smallicon.png",
          firstSeen: "2023-04-11",
          lastSeen: "2023-04-24",
          daysInShop: 14,
          stints: 1,
          daysAway: 1304
        },
        {
          id: "Glider_ID_353_ThriveSpiritFemale",
          name: "Cursed Hazeboard",
          type: "Glider",
          category: "Gliders",
          rarity: "Icon Series",
          series: "Icon Series",
          set: "Naomi Osaka",
          image: "https://fortnite-api.com/images/cosmetics/br/glider_id_353_thrivespiritfemale/smallicon.png",
          firstSeen: "2022-03-04",
          lastSeen: "2023-08-03",
          daysInShop: 30,
          stints: 5,
          daysAway: 1203
        },
        {
          id: "Glider_ID_352_ThriveFemale",
          name: "The Queen's Cloudcarriage",
          type: "Glider",
          category: "Gliders",
          rarity: "Icon Series",
          series: "Icon Series",
          set: "Naomi Osaka",
          image: "https://fortnite-api.com/images/cosmetics/br/glider_id_352_thrivefemale/smallicon.png",
          firstSeen: "2022-03-04",
          lastSeen: "2023-08-03",
          daysInShop: 30,
          stints: 5,
          daysAway: 1203
        },
        {
          id: "Glider_StallionSmoke",
          name: "Stadium Drifter",
          type: "Glider",
          category: "Gliders",
          rarity: "Rare",
          series: null,
          set: "Polo Stadium Collection",
          image: "https://fortnite-api.com/images/cosmetics/br/glider_stallionsmoke/smallicon.png",
          firstSeen: "2022-11-06",
          lastSeen: "2023-08-09",
          daysInShop: 14,
          stints: 2,
          daysAway: 1197
        },
        {
          id: "Glider_ID_376_ChiselMale",
          name: "FAR FROM HOME",
          type: "Glider",
          category: "Gliders",
          rarity: "Rare",
          series: null,
          set: "KAWS",
          image: "https://fortnite-api.com/images/cosmetics/br/glider_id_376_chiselmale/smallicon.png",
          firstSeen: "2022-07-03",
          lastSeen: "2023-10-16",
          daysInShop: 20,
          stints: 6,
          daysAway: 1129
        },
        {
          id: "Glider_ID_246_BabaYaga",
          name: "Hex Hut",
          type: "Glider",
          category: "Gliders",
          rarity: "Epic",
          series: null,
          set: "Coven Fresh",
          image: "https://fortnite-api.com/images/cosmetics/br/glider_id_246_babayaga/smallicon.png",
          firstSeen: "2020-10-26",
          lastSeen: "2023-11-02",
          daysInShop: 28,
          stints: 8,
          daysAway: 1112
        },
        {
          id: "Glider_ID_268_SnowGlobeMint",
          name: "Tree Topper",
          type: "Glider",
          category: "Gliders",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/glider_id_268_snowglobemint/smallicon.png",
          firstSeen: "2020-12-16",
          lastSeen: "2023-12-31",
          daysInShop: 39,
          stints: 10,
          daysAway: 1053
        },
        {
          id: "Glider_ID_263_FancyCandyMale",
          name: "Candy Plane",
          type: "Glider",
          category: "Gliders",
          rarity: "Uncommon",
          series: null,
          set: "Dandy Cane",
          image: "https://fortnite-api.com/images/cosmetics/br/glider_id_263_fancycandymale/smallicon.png",
          firstSeen: "2020-12-19",
          lastSeen: "2024-01-10",
          daysInShop: 35,
          stints: 10,
          daysAway: 1043
        },
        {
          id: "Glider_Lettuce",
          name: "Wrapped and Revved",
          type: "Glider",
          category: "Gliders",
          rarity: "Icon Series",
          series: "Icon Series",
          set: "MrBeast",
          image: "https://fortnite-api.com/images/cosmetics/br/glider_lettuce/smallicon.png",
          firstSeen: "2022-12-15",
          lastSeen: "2024-06-12",
          daysInShop: 39,
          stints: 5,
          daysAway: 889
        }
      ]
    },
    {
      label: "Emotes",
      total: 115,
      items: [
        {
          id: "EID_Fresh",
          name: "Fresh",
          type: "Emote",
          category: "Emotes",
          rarity: "Epic",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/eid_fresh/smallicon.png",
          firstSeen: "2017-12-16",
          lastSeen: "2018-11-21",
          daysInShop: 30,
          stints: 28,
          daysAway: 2919
        },
        {
          id: "EID_WIR",
          name: "Hot Marat",
          type: "Emote",
          category: "Emotes",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/eid_wir/smallicon.png",
          firstSeen: "2018-11-24",
          lastSeen: "2018-11-25",
          daysInShop: 2,
          stints: 1,
          daysAway: 2915
        },
        {
          id: "EID_TrophyCelebration",
          name: "Kiss The Cup",
          type: "Emote",
          category: "Emotes",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/eid_trophycelebration/smallicon.png",
          firstSeen: "2019-07-27",
          lastSeen: "2019-07-28",
          daysInShop: 2,
          stints: 1,
          daysAway: 2670
        },
        {
          id: "EID_ProVisitorProtest",
          name: "Welcome!",
          type: "Emote",
          category: "Emotes",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/eid_provisitorprotest/smallicon.png",
          firstSeen: "2019-10-11",
          lastSeen: "2019-10-13",
          daysInShop: 3,
          stints: 1,
          daysAway: 2593
        },
        {
          id: "EID_CycloneHeadBang",
          name: "Head Banger",
          type: "Emote",
          category: "Emotes",
          rarity: "Icon Series",
          series: "Icon Series",
          set: "Travis Scott",
          image: "https://fortnite-api.com/images/cosmetics/br/eid_cycloneheadbang/smallicon.png",
          firstSeen: "2020-04-22",
          lastSeen: "2020-04-27",
          daysInShop: 6,
          stints: 1,
          daysAway: 2396
        },
        {
          id: "EID_LetsPlay",
          name: "Raise The Cup",
          type: "Emote",
          category: "Emotes",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/eid_letsplay/smallicon.png",
          firstSeen: "2020-08-20",
          lastSeen: "2020-08-21",
          daysInShop: 2,
          stints: 1,
          daysAway: 2280
        },
        {
          id: "EID_RigorMortis",
          name: "Zombie Shambles",
          type: "Emote",
          category: "Emotes",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/eid_rigormortis/smallicon.png",
          firstSeen: "2020-11-06",
          lastSeen: "2020-11-06",
          daysInShop: 1,
          stints: 1,
          daysAway: 2203
        },
        {
          id: "EID_HNYGoodRiddance",
          name: "Out With The Old",
          type: "Emote",
          category: "Emotes",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/eid_hnygoodriddance/smallicon.png",
          firstSeen: "2020-12-29",
          lastSeen: "2021-01-01",
          daysInShop: 4,
          stints: 1,
          daysAway: 2147
        },
        {
          id: "EID_SingAlong",
          name: "Sing Along",
          type: "Emote",
          category: "Emotes",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/eid_singalong/smallicon.png",
          firstSeen: "2020-12-10",
          lastSeen: "2021-01-05",
          daysInShop: 23,
          stints: 2,
          daysAway: 2143
        },
        {
          id: "EID_RichFam",
          name: "It's Complicated",
          type: "Emote",
          category: "Emotes",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/eid_richfam/smallicon.png",
          firstSeen: "2020-08-25",
          lastSeen: "2021-08-21",
          daysInShop: 12,
          stints: 12,
          daysAway: 1915
        },
        {
          id: "EID_Downward_8GZUA",
          name: "Stuck",
          type: "Emote",
          category: "Emotes",
          rarity: "Icon Series",
          series: "Icon Series",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/eid_downward_8gzua/smallicon.png",
          firstSeen: "2021-09-06",
          lastSeen: "2021-09-07",
          daysInShop: 2,
          stints: 1,
          daysAway: 1898
        },
        {
          id: "EID_Kilo_VD0PK",
          name: "Pel\xE9\u2019s Air Punch",
          type: "Emote",
          category: "Emotes",
          rarity: "Icon Series",
          series: "Icon Series",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/eid_kilo_vd0pk/smallicon.png",
          firstSeen: "2021-01-24",
          lastSeen: "2021-09-27",
          daysInShop: 12,
          stints: 3,
          daysAway: 1878
        },
        {
          id: "EID_Eerie_8WGYK",
          name: "I Ain't Afraid",
          type: "Emote",
          category: "Emotes",
          rarity: "Uncommon",
          series: null,
          set: "Ghostbusters",
          image: "https://fortnite-api.com/images/cosmetics/br/eid_eerie_8wgyk/smallicon.png",
          firstSeen: "2021-11-19",
          lastSeen: "2021-12-01",
          daysInShop: 13,
          stints: 1,
          daysAway: 1813
        },
        {
          id: "EID_Dunk",
          name: "Buckets",
          type: "Emote",
          category: "Emotes",
          rarity: "Uncommon",
          series: null,
          set: "Hang Time",
          image: "https://fortnite-api.com/images/cosmetics/br/eid_dunk/smallicon.png",
          firstSeen: "2019-05-23",
          lastSeen: "2022-03-26",
          daysInShop: 10,
          stints: 7,
          daysAway: 1698
        },
        {
          id: "EID_Flex02",
          name: "Flex On 'Em",
          type: "Emote",
          category: "Emotes",
          rarity: "Uncommon",
          series: null,
          set: "Hang Time",
          image: "https://fortnite-api.com/images/cosmetics/br/eid_flex02/smallicon.png",
          firstSeen: "2019-05-24",
          lastSeen: "2022-03-26",
          daysInShop: 9,
          stints: 6,
          daysAway: 1698
        },
        {
          id: "EID_Laugh",
          name: "Laugh It Up",
          type: "Emote",
          category: "Emotes",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/eid_laugh/smallicon.png",
          firstSeen: "2018-06-04",
          lastSeen: "2022-05-19",
          daysInShop: 40,
          stints: 39,
          daysAway: 1644
        },
        {
          id: "EID_Slither_DAXD6",
          name: "The Crane Kick",
          type: "Emote",
          category: "Emotes",
          rarity: "Uncommon",
          series: null,
          set: "Cobra Kai",
          image: "https://fortnite-api.com/images/cosmetics/br/eid_slither_daxd6/smallicon.png",
          firstSeen: "2021-12-31",
          lastSeen: "2022-09-10",
          daysInShop: 19,
          stints: 4,
          daysAway: 1530
        },
        {
          id: "EID_Textile_3O8QG",
          name: "The Look",
          type: "Emote",
          category: "Emotes",
          rarity: "Rare",
          series: null,
          set: "Balenciaga Fit",
          image: "https://fortnite-api.com/images/cosmetics/br/eid_textile_3o8qg/smallicon.png",
          firstSeen: "2021-09-21",
          lastSeen: "2022-09-28",
          daysInShop: 27,
          stints: 4,
          daysAway: 1512
        },
        {
          id: "EID_ScorecardTomato",
          name: "Team Tomato",
          type: "Emote",
          category: "Emotes",
          rarity: "Uncommon",
          series: null,
          set: "The Leftovers",
          image: "https://fortnite-api.com/images/cosmetics/br/eid_scorecardtomato/smallicon.png",
          firstSeen: "2019-08-16",
          lastSeen: "2022-10-08",
          daysInShop: 12,
          stints: 11,
          daysAway: 1502
        },
        {
          id: "EID_Martian_SK4J6",
          name: "Leave The Door Open",
          type: "Emote",
          category: "Emotes",
          rarity: "Icon Series",
          series: "Icon Series",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/eid_martian_sk4j6/smallicon.png",
          firstSeen: "2021-04-03",
          lastSeen: "2022-10-12",
          daysInShop: 41,
          stints: 12,
          daysAway: 1498
        },
        {
          id: "EID_LogarithmWhoa_T3PF9",
          name: "Neo's Bullet Time",
          type: "Emote",
          category: "Emotes",
          rarity: "Uncommon",
          series: null,
          set: "Follow the White Rabbit",
          image: "https://fortnite-api.com/images/cosmetics/br/eid_logarithmwhoa_t3pf9/smallicon.png",
          firstSeen: "2021-12-21",
          lastSeen: "2022-10-14",
          daysInShop: 18,
          stints: 9,
          daysAway: 1496
        },
        {
          id: "EID_LogarithmKick_NJVD8",
          name: "Trinity's Kick",
          type: "Emote",
          category: "Emotes",
          rarity: "Uncommon",
          series: null,
          set: "Follow the White Rabbit",
          image: "https://fortnite-api.com/images/cosmetics/br/eid_logarithmkick_njvd8/smallicon.png",
          firstSeen: "2021-12-21",
          lastSeen: "2022-10-14",
          daysInShop: 18,
          stints: 9,
          daysAway: 1496
        },
        {
          id: "EID_Sahara",
          name: "Teth's Throne",
          type: "Emote",
          category: "Emotes",
          rarity: "DC SERIES",
          series: "DC SERIES",
          set: "Black Adam",
          image: "https://fortnite-api.com/images/cosmetics/br/eid_sahara/smallicon.png",
          firstSeen: "2022-10-21",
          lastSeen: "2022-11-03",
          daysInShop: 14,
          stints: 1,
          daysAway: 1476
        },
        {
          id: "EID_Tidy",
          name: "Tidy",
          type: "Emote",
          category: "Emotes",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/eid_tidy/smallicon.png",
          firstSeen: "2018-04-30",
          lastSeen: "2022-12-06",
          daysInShop: 12,
          stints: 12,
          daysAway: 1443
        },
        {
          id: "EID_Zippy",
          name: "Rambunctious",
          type: "Emote",
          category: "Emotes",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/eid_zippy/smallicon.png",
          firstSeen: "2018-06-09",
          lastSeen: "2022-12-07",
          daysInShop: 8,
          stints: 8,
          daysAway: 1442
        }
      ]
    },
    {
      label: "Contrails",
      total: 2,
      items: [
        {
          id: "Trails_ID_102_HightowerVertigo_G63FW",
          name: "Symbiote Trail",
          type: "Contrail",
          category: "Contrails",
          rarity: "MARVEL SERIES",
          series: "MARVEL SERIES",
          set: "Symbiotes",
          image: "https://fortnite-api.com/images/cosmetics/br/trails_id_102_hightowervertigo_g63fw/smallicon.png",
          firstSeen: "2021-09-24",
          lastSeen: "2025-03-30",
          daysInShop: 20,
          stints: 4,
          daysAway: 598
        },
        {
          id: "Trails_ID_088_Informer",
          name: "Synth Streak",
          type: "Contrail",
          category: "Contrails",
          rarity: "Rare",
          series: null,
          set: "Parallel Future",
          image: "https://fortnite-api.com/images/cosmetics/br/trails_id_088_informer/smallicon.png",
          firstSeen: "2020-05-27",
          lastSeen: "2025-05-29",
          daysInShop: 5,
          stints: 3,
          daysAway: 538
        }
      ]
    },
    {
      label: "Emoticons",
      total: 9,
      items: [
        {
          id: "Emoji_S20_FNCSDrops",
          name: "K.O!",
          type: "Emoticon",
          category: "Emoticons",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/emoji_s20_fncsdrops/smallicon.png",
          firstSeen: "2022-05-26",
          lastSeen: "2022-05-30",
          daysInShop: 5,
          stints: 1,
          daysAway: 1633
        },
        {
          id: "Emoji_S20_JourneyMentor",
          name: "Raven Clan",
          type: "Emoticon",
          category: "Emoticons",
          rarity: "Gaming Legends Series",
          series: "Gaming Legends Series",
          set: "Tales from the Animus",
          image: "https://fortnite-api.com/images/cosmetics/br/emoji_s20_journeymentor/smallicon.png",
          firstSeen: "2022-04-08",
          lastSeen: "2023-02-12",
          daysInShop: 10,
          stints: 3,
          daysAway: 1375
        },
        {
          id: "Emoji_S25_RainbowRoyale",
          name: "Beautiful 'Bow",
          type: "Emoticon",
          category: "Emoticons",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/emoji_s25_rainbowroyale/smallicon.png",
          firstSeen: "2023-08-18",
          lastSeen: "2023-08-24",
          daysInShop: 7,
          stints: 1,
          daysAway: 1182
        },
        {
          id: "Emoji_S26_IWD",
          name: "Hearts Up",
          type: "Emoticon",
          category: "Emoticons",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/emoji_s26_iwd/smallicon.png",
          firstSeen: "2023-09-29",
          lastSeen: "2023-10-09",
          daysInShop: 11,
          stints: 1,
          daysAway: 1136
        },
        {
          id: "Emoji_S16_FlapjackWrangler",
          name: "Giddy Syrup",
          type: "Emoticon",
          category: "Emoticons",
          rarity: "Uncommon",
          series: null,
          set: "The Breakfast Bandit",
          image: "https://fortnite-api.com/images/cosmetics/br/emoji_s16_flapjackwrangler/smallicon.png",
          firstSeen: "2024-09-06",
          lastSeen: "2024-09-08",
          daysInShop: 3,
          stints: 1,
          daysAway: 801
        },
        {
          id: "Emoji_S25_LastVoice",
          name: "Air Wave",
          type: "Emoticon",
          category: "Emoticons",
          rarity: "Uncommon",
          series: null,
          set: "Nike Airphoria",
          image: "https://fortnite-api.com/images/cosmetics/br/emoji_s25_lastvoice/smallicon.png",
          firstSeen: "2023-06-20",
          lastSeen: "2024-09-27",
          daysInShop: 17,
          stints: 3,
          daysAway: 782
        },
        {
          id: "Emoji_S18_ClashV_I1DF9",
          name: "Different Tasty Snack",
          type: "Emoticon",
          category: "Emoticons",
          rarity: "MARVEL SERIES",
          series: "MARVEL SERIES",
          set: "Symbiotes",
          image: "https://fortnite-api.com/images/cosmetics/br/emoji_s18_clashv_i1df9/smallicon.png",
          firstSeen: "2021-09-24",
          lastSeen: "2025-03-30",
          daysInShop: 26,
          stints: 5,
          daysAway: 598
        },
        {
          id: "Emoji_S20_Lyrical",
          name: "Wu-Tang Hands",
          type: "Emoticon",
          category: "Emoticons",
          rarity: "Uncommon",
          series: null,
          set: "Wu Wear",
          image: "https://fortnite-api.com/images/cosmetics/br/emoji_s20_lyrical/smallicon.png",
          firstSeen: "2022-04-24",
          lastSeen: "2025-04-23",
          daysInShop: 68,
          stints: 9,
          daysAway: 574
        },
        {
          id: "Emoji_S14_Elastic_Water",
          name: "Blue Cyclo",
          type: "Emoticon",
          category: "Emoticons",
          rarity: "Uncommon",
          series: null,
          set: "Boundless",
          image: "https://fortnite-api.com/images/cosmetics/br/emoji_s14_elastic_water/smallicon.png",
          firstSeen: "2020-09-11",
          lastSeen: "2025-05-12",
          daysInShop: 91,
          stints: 49,
          daysAway: 555
        }
      ]
    },
    {
      label: "Sprays",
      total: 20,
      items: [
        {
          id: "SPID_360_IWD2021",
          name: "Hop and a Wink",
          type: "Spray",
          category: "Sprays",
          rarity: "Uncommon",
          series: null,
          set: "IWD 2022",
          image: "https://fortnite-api.com/images/cosmetics/br/spid_360_iwd2021/smallicon.png",
          firstSeen: "2022-03-08",
          lastSeen: "2022-03-14",
          daysInShop: 7,
          stints: 1,
          daysAway: 1710
        },
        {
          id: "SPID_333_RustyBoltCreature_ZGF9S",
          name: "Emergence Hole",
          type: "Spray",
          category: "Sprays",
          rarity: "Gaming Legends Series",
          series: "Gaming Legends Series",
          set: "Delta-One",
          image: "https://fortnite-api.com/images/cosmetics/br/spid_333_rustyboltcreature_zgf9s/smallicon.png",
          firstSeen: "2021-12-10",
          lastSeen: "2022-12-12",
          daysInShop: 49,
          stints: 3,
          daysAway: 1437
        },
        {
          id: "SPID_366_JourneyMentor",
          name: "Wolf-Kissed",
          type: "Spray",
          category: "Sprays",
          rarity: "Gaming Legends Series",
          series: "Gaming Legends Series",
          set: "Tales from the Animus",
          image: "https://fortnite-api.com/images/cosmetics/br/spid_366_journeymentor/smallicon.png",
          firstSeen: "2022-04-08",
          lastSeen: "2023-02-12",
          daysInShop: 10,
          stints: 3,
          daysAway: 1375
        },
        {
          id: "Spray_CoyoteTrail",
          name: "Mask of Yoruba",
          type: "Spray",
          category: "Sprays",
          rarity: "Icon Series",
          series: "Icon Series",
          set: "Giannis Antetokounmpo",
          image: "https://fortnite-api.com/images/cosmetics/br/spray_coyotetrail/smallicon.png",
          firstSeen: "2022-12-25",
          lastSeen: "2023-04-18",
          daysInShop: 20,
          stints: 3,
          daysAway: 1310
        },
        {
          id: "Spray_IWD",
          name: "Winner's Heart",
          type: "Spray",
          category: "Sprays",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/spray_iwd/smallicon.png",
          firstSeen: "2023-09-29",
          lastSeen: "2023-10-09",
          daysInShop: 11,
          stints: 1,
          daysAway: 1136
        },
        {
          id: "SPID_421_ALT_Barium",
          name: "Speed Demon",
          type: "Spray",
          category: "Sprays",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/spid_421_alt_barium/smallicon.png",
          firstSeen: "2023-01-13",
          lastSeen: "2024-07-21",
          daysInShop: 7,
          stints: 5,
          daysAway: 850
        },
        {
          id: "Spray_LastVoice",
          name: "Maxx Volume",
          type: "Spray",
          category: "Sprays",
          rarity: "Epic",
          series: null,
          set: "Nike Airphoria",
          image: "https://fortnite-api.com/images/cosmetics/br/spray_lastvoice/smallicon.png",
          firstSeen: "2023-06-20",
          lastSeen: "2024-09-27",
          daysInShop: 17,
          stints: 3,
          daysAway: 782
        },
        {
          id: "Spray_VaultBreakers_Snake",
          name: "Cold Blooded",
          type: "Spray",
          category: "Sprays",
          rarity: "Uncommon",
          series: null,
          set: "Most Wanted",
          image: "https://fortnite-api.com/images/cosmetics/br/spray_vaultbreakers_snake/smallicon.png",
          firstSeen: "2023-08-21",
          lastSeen: "2024-11-02",
          daysInShop: 18,
          stints: 4,
          daysAway: 746
        },
        {
          id: "Spray_Elevate",
          name: "Cap Attack",
          type: "Spray",
          category: "Sprays",
          rarity: "MARVEL SERIES",
          series: "MARVEL SERIES",
          set: "Captain America",
          image: "https://fortnite-api.com/images/cosmetics/br/spray_elevate/smallicon.png",
          firstSeen: "2025-02-14",
          lastSeen: "2025-02-18",
          daysInShop: 5,
          stints: 1,
          daysAway: 638
        },
        {
          id: "Spray_Elevate2",
          name: "Come Get Me!",
          type: "Spray",
          category: "Sprays",
          rarity: "MARVEL SERIES",
          series: "MARVEL SERIES",
          set: "Captain America",
          image: "https://fortnite-api.com/images/cosmetics/br/spray_elevate2/smallicon.png",
          firstSeen: "2025-02-14",
          lastSeen: "2025-02-18",
          daysInShop: 5,
          stints: 1,
          daysAway: 638
        },
        {
          id: "SPID_403_Lyrical_BoomBox",
          name: "Wu Boom Box",
          type: "Spray",
          category: "Sprays",
          rarity: "Uncommon",
          series: null,
          set: "Wu Wear",
          image: "https://fortnite-api.com/images/cosmetics/br/spid_403_lyrical_boombox/smallicon.png",
          firstSeen: "2022-04-24",
          lastSeen: "2025-04-23",
          daysInShop: 68,
          stints: 9,
          daysAway: 574
        },
        {
          id: "Spray_FirstClass_BattleBus",
          name: "Battle Bus Ballers Logo",
          type: "Spray",
          category: "Sprays",
          rarity: "Uncommon",
          series: null,
          set: "Blacktop Ballers",
          image: "https://fortnite-api.com/images/cosmetics/br/spray_firstclass_battlebus/smallicon.png",
          firstSeen: "2024-06-06",
          lastSeen: "2025-05-20",
          daysInShop: 18,
          stints: 4,
          daysAway: 547
        },
        {
          id: "Spray_FirstClass_CourtniteMares",
          name: "Courtnite Mares Logo",
          type: "Spray",
          category: "Sprays",
          rarity: "Uncommon",
          series: null,
          set: "Blacktop Ballers",
          image: "https://fortnite-api.com/images/cosmetics/br/spray_firstclass_courtnitemares/smallicon.png",
          firstSeen: "2024-06-06",
          lastSeen: "2025-05-20",
          daysInShop: 18,
          stints: 4,
          daysAway: 547
        },
        {
          id: "Spray_FirstClass_Cuddle",
          name: "Cuddle Bears Logo",
          type: "Spray",
          category: "Sprays",
          rarity: "Uncommon",
          series: null,
          set: "Blacktop Ballers",
          image: "https://fortnite-api.com/images/cosmetics/br/spray_firstclass_cuddle/smallicon.png",
          firstSeen: "2024-06-06",
          lastSeen: "2025-05-20",
          daysInShop: 18,
          stints: 4,
          daysAway: 547
        },
        {
          id: "Spray_FirstClass_DriftRifts",
          name: "Drift Rifts Logo",
          type: "Spray",
          category: "Sprays",
          rarity: "Uncommon",
          series: null,
          set: "Blacktop Ballers",
          image: "https://fortnite-api.com/images/cosmetics/br/spray_firstclass_driftrifts/smallicon.png",
          firstSeen: "2024-06-06",
          lastSeen: "2025-05-20",
          daysInShop: 18,
          stints: 4,
          daysAway: 547
        },
        {
          id: "Spray_FirstClass_Goat",
          name: "GOAT Sticks Logo",
          type: "Spray",
          category: "Sprays",
          rarity: "Uncommon",
          series: null,
          set: "Blacktop Ballers",
          image: "https://fortnite-api.com/images/cosmetics/br/spray_firstclass_goat/smallicon.png",
          firstSeen: "2024-06-06",
          lastSeen: "2025-05-20",
          daysInShop: 18,
          stints: 4,
          daysAway: 547
        },
        {
          id: "Spray_FirstClass_Knights",
          name: "Knights Logo",
          type: "Spray",
          category: "Sprays",
          rarity: "Uncommon",
          series: null,
          set: "Blacktop Ballers",
          image: "https://fortnite-api.com/images/cosmetics/br/spray_firstclass_knights/smallicon.png",
          firstSeen: "2024-06-06",
          lastSeen: "2025-05-20",
          daysInShop: 18,
          stints: 4,
          daysAway: 547
        },
        {
          id: "Spray_FirstClass_LayupLlamas",
          name: "Layup Llamas Logo",
          type: "Spray",
          category: "Sprays",
          rarity: "Uncommon",
          series: null,
          set: "Blacktop Ballers",
          image: "https://fortnite-api.com/images/cosmetics/br/spray_firstclass_layupllamas/smallicon.png",
          firstSeen: "2024-06-06",
          lastSeen: "2025-05-20",
          daysInShop: 18,
          stints: 4,
          daysAway: 547
        },
        {
          id: "Spray_FirstClass_Peelers",
          name: "Peelers Logo",
          type: "Spray",
          category: "Sprays",
          rarity: "Uncommon",
          series: null,
          set: "Blacktop Ballers",
          image: "https://fortnite-api.com/images/cosmetics/br/spray_firstclass_peelers/smallicon.png",
          firstSeen: "2024-06-06",
          lastSeen: "2025-05-20",
          daysInShop: 18,
          stints: 4,
          daysAway: 547
        },
        {
          id: "Spray_FirstClass_Raven",
          name: "Ravens Logo",
          type: "Spray",
          category: "Sprays",
          rarity: "Uncommon",
          series: null,
          set: "Blacktop Ballers",
          image: "https://fortnite-api.com/images/cosmetics/br/spray_firstclass_raven/smallicon.png",
          firstSeen: "2024-06-06",
          lastSeen: "2025-05-20",
          daysInShop: 18,
          stints: 4,
          daysAway: 547
        }
      ]
    },
    {
      label: "Toys",
      total: 2,
      items: [
        {
          id: "TOY_012_AmericanFootball",
          name: "Pigskin",
          type: "Toy",
          category: "Toys",
          rarity: "Rare",
          series: null,
          set: "Fourth Down",
          image: "https://fortnite-api.com/images/cosmetics/br/toy_012_americanfootball/smallicon.png",
          firstSeen: "2019-02-03",
          lastSeen: "2019-02-03",
          daysInShop: 1,
          stints: 1,
          daysAway: 2845
        },
        {
          id: "TOY_Basketball_Hookshot_LUWQ6",
          name: "Hookshot",
          type: "Toy",
          category: "Toys",
          rarity: "Rare",
          series: null,
          set: "In The Paint",
          image: "https://fortnite-api.com/images/cosmetics/br/toy_basketball_hookshot_luwq6/smallicon.png",
          firstSeen: "2021-05-22",
          lastSeen: "2022-12-27",
          daysInShop: 29,
          stints: 5,
          daysAway: 1422
        }
      ]
    },
    {
      label: "Banners",
      total: 12,
      items: [
        {
          id: "BannerToken_002_Doggus",
          name: "Mecha Team Banner",
          type: "Banner",
          category: "Banners",
          rarity: "Uncommon",
          series: null,
          set: "Final Showdown",
          image: "https://fortnite-api.com/images/cosmetics/br/bannertoken_002_doggus/smallicon.png",
          firstSeen: "2019-07-18",
          lastSeen: "2019-07-20",
          daysInShop: 3,
          stints: 1,
          daysAway: 2678
        },
        {
          id: "BannerToken_001_Cattus",
          name: "Monster Team Banner",
          type: "Banner",
          category: "Banners",
          rarity: "Uncommon",
          series: null,
          set: "Final Showdown",
          image: "https://fortnite-api.com/images/cosmetics/br/bannertoken_001_cattus/smallicon.png",
          firstSeen: "2019-07-18",
          lastSeen: "2019-07-20",
          daysInShop: 3,
          stints: 1,
          daysAway: 2678
        },
        {
          id: "BannerToken_003_2019WorldCup",
          name: "World Cup 2019 Banner",
          type: "Banner",
          category: "Banners",
          rarity: "Uncommon",
          series: null,
          set: "World Cup 2019",
          image: "https://fortnite-api.com/images/cosmetics/br/bannertoken_003_2019worldcup/smallicon.png",
          firstSeen: "2019-07-26",
          lastSeen: "2019-07-28",
          daysInShop: 3,
          stints: 1,
          daysAway: 2670
        },
        {
          id: "BannerToken_015_GalileoA_0W6VH",
          name: "First Order Banner",
          type: "Banner",
          category: "Banners",
          rarity: "Star Wars Series",
          series: "Star Wars Series",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/bannertoken_015_galileoa_0w6vh/smallicon.png",
          firstSeen: "2019-12-13",
          lastSeen: "2020-01-02",
          daysInShop: 8,
          stints: 4,
          daysAway: 2512
        },
        {
          id: "BannerToken_018_GalileoD_5XXFQ",
          name: "Resistance Banner",
          type: "Banner",
          category: "Banners",
          rarity: "Star Wars Series",
          series: "Star Wars Series",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/bannertoken_018_galileod_5xxfq/smallicon.png",
          firstSeen: "2019-12-13",
          lastSeen: "2020-01-02",
          daysInShop: 8,
          stints: 4,
          daysAway: 2512
        },
        {
          id: "BannerToken_045_S12_BrazilToucan",
          name: "Toucan Banner",
          type: "Banner",
          category: "Banners",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/bannertoken_045_s12_braziltoucan/smallicon.png",
          firstSeen: "2020-02-24",
          lastSeen: "2020-02-24",
          daysInShop: 1,
          stints: 1,
          daysAway: 2459
        },
        {
          id: "BannerToken_075_S20_JourneyMentor",
          name: "Banner",
          type: "Banner",
          category: "Banners",
          rarity: "Gaming Legends Series",
          series: "Gaming Legends Series",
          set: "Tales from the Animus",
          image: "https://fortnite-api.com/images/cosmetics/br/bannertoken_075_s20_journeymentor/smallicon.png",
          firstSeen: "2022-11-20",
          lastSeen: "2023-02-12",
          daysInShop: 4,
          stints: 2,
          daysAway: 1375
        },
        {
          id: "BannerToken_S26_IWD",
          name: "Banner",
          type: "Banner",
          category: "Banners",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/bannertoken_s26_iwd/smallicon.png",
          firstSeen: "2023-09-29",
          lastSeen: "2023-10-09",
          daysInShop: 11,
          stints: 1,
          daysAway: 1136
        },
        {
          id: "BannerToken_077_S20_NeonCatSpeed",
          name: "Banner",
          type: "Banner",
          category: "Banners",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/bannertoken_077_s20_neoncatspeed/smallicon.png",
          firstSeen: "2022-06-07",
          lastSeen: "2025-04-05",
          daysInShop: 15,
          stints: 15,
          daysAway: 592
        },
        {
          id: "BannerToken_076_S20_Lyrical",
          name: "Banner",
          type: "Banner",
          category: "Banners",
          rarity: "Uncommon",
          series: null,
          set: "Wu Wear",
          image: "https://fortnite-api.com/images/cosmetics/br/bannertoken_076_s20_lyrical/smallicon.png",
          firstSeen: "2022-04-24",
          lastSeen: "2025-04-23",
          daysInShop: 68,
          stints: 9,
          daysAway: 574
        },
        {
          id: "BannerToken_S28_Tactic_Tank",
          name: "Banner",
          type: "Banner",
          category: "Banners",
          rarity: "Uncommon",
          series: null,
          set: "Skratch Company",
          image: "https://fortnite-api.com/images/cosmetics/br/bannertoken_s28_tactic_tank/smallicon.png",
          firstSeen: "2024-02-18",
          lastSeen: "2025-05-14",
          daysInShop: 4,
          stints: 2,
          daysAway: 553
        },
        {
          id: "BannerToken_S28_Tactic_Banana",
          name: "Banner",
          type: "Banner",
          category: "Banners",
          rarity: "Uncommon",
          series: null,
          set: "Skratch Company",
          image: "https://fortnite-api.com/images/cosmetics/br/bannertoken_s28_tactic_banana/smallicon.png",
          firstSeen: "2024-02-18",
          lastSeen: "2025-05-18",
          daysInShop: 4,
          stints: 2,
          daysAway: 549
        }
      ]
    },
    {
      label: "Kicks",
      total: 3,
      items: [
        {
          id: "Shoes_StreetPaint",
          name: "Night Tags",
          type: "Shoes",
          category: "Kicks",
          rarity: "Uncommon",
          series: null,
          set: "Midnight Masterpiece",
          image: "https://fortnite-api.com/images/cosmetics/br/shoes_streetpaint/smallicon.png",
          firstSeen: "2025-05-18",
          lastSeen: "2025-05-20",
          daysInShop: 3,
          stints: 1,
          daysAway: 547
        },
        {
          id: "Shoes_SprawlBringJay",
          name: "Nike Air Max SNDR x Kids of Immigrants",
          type: "Shoes",
          category: "Kicks",
          rarity: "Uncommon",
          series: null,
          set: "NIKE Shoes",
          image: "https://fortnite-api.com/images/cosmetics/br/shoes_sprawlbringjay/smallicon.png",
          firstSeen: "2025-05-23",
          lastSeen: "2025-05-30",
          daysInShop: 8,
          stints: 1,
          daysAway: 537
        },
        {
          id: "Shoes_TunaCabinCanola",
          name: "Air Jordan 12 'Black/Varsity Red'",
          type: "Shoes",
          category: "Kicks",
          rarity: "Uncommon",
          series: null,
          set: "Jordan Shoes",
          image: "https://fortnite-api.com/images/cosmetics/br/shoes_tunacabincanola/smallicon.png",
          firstSeen: "2025-02-02",
          lastSeen: "2025-06-28",
          daysInShop: 19,
          stints: 3,
          daysAway: 508
        }
      ]
    },
    {
      label: "Wraps",
      total: 189,
      items: [
        {
          id: "Wrap_102_WorldCup2019",
          name: "World Cup 2019",
          type: "Wrap",
          category: "Wraps",
          rarity: "Rare",
          series: null,
          set: "World Cup 2019",
          image: "https://fortnite-api.com/images/cosmetics/br/wrap_102_worldcup2019/smallicon.png",
          firstSeen: "2019-07-26",
          lastSeen: "2019-07-28",
          daysInShop: 3,
          stints: 1,
          daysAway: 2670
        },
        {
          id: "Wrap_210_Thermal",
          name: "Goosebumps",
          type: "Wrap",
          category: "Wraps",
          rarity: "Icon Series",
          series: "Icon Series",
          set: "Travis Scott",
          image: "https://fortnite-api.com/images/cosmetics/br/wrap_210_thermal/smallicon.png",
          firstSeen: "2020-04-22",
          lastSeen: "2020-04-27",
          daysInShop: 6,
          stints: 1,
          daysAway: 2396
        },
        {
          id: "Wrap_448_WomensDay1",
          name: "Per Aspera ad Astra",
          type: "Wrap",
          category: "Wraps",
          rarity: "Rare",
          series: null,
          set: "IWD 2022",
          image: "https://fortnite-api.com/images/cosmetics/br/wrap_448_womensday1/smallicon.png",
          firstSeen: "2022-03-08",
          lastSeen: "2022-03-14",
          daysInShop: 7,
          stints: 1,
          daysAway: 1710
        },
        {
          id: "Wrap_162_PumpkinPattern",
          name: "Jack-O-Pattern",
          type: "Wrap",
          category: "Wraps",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/wrap_162_pumpkinpattern/smallicon.png",
          firstSeen: "2019-10-27",
          lastSeen: "2022-11-01",
          daysInShop: 15,
          stints: 7,
          daysAway: 1478
        },
        {
          id: "Wrap_315_NeonXmasSign",
          name: "Frosty Visions",
          type: "Wrap",
          category: "Wraps",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/wrap_315_neonxmassign/smallicon.png",
          firstSeen: "2020-12-22",
          lastSeen: "2022-12-25",
          daysInShop: 27,
          stints: 6,
          daysAway: 1424
        },
        {
          id: "Wrap_297_Chip",
          name: "Chipset",
          type: "Wrap",
          category: "Wraps",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/wrap_297_chip/smallicon.png",
          firstSeen: "2020-11-11",
          lastSeen: "2022-12-29",
          daysInShop: 4,
          stints: 2,
          daysAway: 1420
        },
        {
          id: "Wrap_469_Trainer",
          name: "Sneaks",
          type: "Wrap",
          category: "Wraps",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/wrap_469_trainer/smallicon.png",
          firstSeen: "2022-04-30",
          lastSeen: "2023-02-22",
          daysInShop: 10,
          stints: 7,
          daysAway: 1365
        },
        {
          id: "Wrap_437_SneakerPrint",
          name: "Sneaky Sole",
          type: "Wrap",
          category: "Wraps",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/wrap_437_sneakerprint/smallicon.png",
          firstSeen: "2022-02-10",
          lastSeen: "2023-02-22",
          daysInShop: 13,
          stints: 10,
          daysAway: 1365
        },
        {
          id: "Wrap_280_Gel",
          name: "Plasma Bubble",
          type: "Wrap",
          category: "Wraps",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/wrap_280_gel/smallicon.png",
          firstSeen: "2020-09-15",
          lastSeen: "2023-03-09",
          daysInShop: 3,
          stints: 3,
          daysAway: 1350
        },
        {
          id: "Wrap_342_Mustang",
          name: "Dive Bomber",
          type: "Wrap",
          category: "Wraps",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/wrap_342_mustang/smallicon.png",
          firstSeen: "2021-04-11",
          lastSeen: "2023-03-12",
          daysInShop: 3,
          stints: 3,
          daysAway: 1347
        },
        {
          id: "Wrap_348_Alchemy_FYA4I",
          name: "Shield-Weaver",
          type: "Wrap",
          category: "Wraps",
          rarity: "Gaming Legends Series",
          series: "Gaming Legends Series",
          set: "Horizon Zero Dawn",
          image: "https://fortnite-api.com/images/cosmetics/br/wrap_348_alchemy_fya4i/smallicon.png",
          firstSeen: "2021-04-16",
          lastSeen: "2023-03-20",
          daysInShop: 41,
          stints: 4,
          daysAway: 1339
        },
        {
          id: "Wrap_290_Newspaper",
          name: "Extra! Extra!",
          type: "Wrap",
          category: "Wraps",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/wrap_290_newspaper/smallicon.png",
          firstSeen: "2020-10-20",
          lastSeen: "2023-03-29",
          daysInShop: 4,
          stints: 4,
          daysAway: 1330
        },
        {
          id: "Wrap_169_JetSki",
          name: "Wetsuit",
          type: "Wrap",
          category: "Wraps",
          rarity: "Uncommon",
          series: null,
          set: "Aqua Marine",
          image: "https://fortnite-api.com/images/cosmetics/br/wrap_169_jetski/smallicon.png",
          firstSeen: "2019-11-17",
          lastSeen: "2023-04-01",
          daysInShop: 4,
          stints: 4,
          daysAway: 1327
        },
        {
          id: "Wrap_341_Koi",
          name: "Zen'd Out",
          type: "Wrap",
          category: "Wraps",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/wrap_341_koi/smallicon.png",
          firstSeen: "2021-04-12",
          lastSeen: "2023-04-03",
          daysInShop: 5,
          stints: 5,
          daysAway: 1325
        },
        {
          id: "Wrap_048_Bunny2",
          name: "Pastel Print",
          type: "Wrap",
          category: "Wraps",
          rarity: "Uncommon",
          series: null,
          set: "Pastel Patrol",
          image: "https://fortnite-api.com/images/cosmetics/br/wrap_048_bunny2/smallicon.png",
          firstSeen: "2019-04-19",
          lastSeen: "2023-04-10",
          daysInShop: 11,
          stints: 4,
          daysAway: 1318
        },
        {
          id: "Wrap_283_Plasticine",
          name: "Claymation",
          type: "Wrap",
          category: "Wraps",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/wrap_283_plasticine/smallicon.png",
          firstSeen: "2020-09-14",
          lastSeen: "2023-04-11",
          daysInShop: 4,
          stints: 4,
          daysAway: 1317
        },
        {
          id: "Wrap_353_Nautical",
          name: "Lost Riches",
          type: "Wrap",
          category: "Wraps",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/wrap_353_nautical/smallicon.png",
          firstSeen: "2021-05-20",
          lastSeen: "2023-04-17",
          daysInShop: 7,
          stints: 7,
          daysAway: 1311
        },
        {
          id: "Wrap_CoyoteTrail",
          name: "Ankara Print",
          type: "Wrap",
          category: "Wraps",
          rarity: "Icon Series",
          series: "Icon Series",
          set: "Giannis Antetokounmpo",
          image: "https://fortnite-api.com/images/cosmetics/br/wrap_coyotetrail/smallicon.png",
          firstSeen: "2022-12-25",
          lastSeen: "2023-04-18",
          daysInShop: 20,
          stints: 3,
          daysAway: 1310
        },
        {
          id: "Wrap_331_Hazard",
          name: "Rad Emissions",
          type: "Wrap",
          category: "Wraps",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/wrap_331_hazard/smallicon.png",
          firstSeen: "2021-03-04",
          lastSeen: "2023-04-22",
          daysInShop: 3,
          stints: 3,
          daysAway: 1306
        },
        {
          id: "Wrap_064_Raptor",
          name: "Royale Air Force",
          type: "Wrap",
          category: "Wraps",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/wrap_064_raptor/smallicon.png",
          firstSeen: "2019-05-12",
          lastSeen: "2023-04-23",
          daysInShop: 4,
          stints: 3,
          daysAway: 1305
        },
        {
          id: "Wrap_117_Asteroid",
          name: "Meteor",
          type: "Wrap",
          category: "Wraps",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/wrap_117_asteroid/smallicon.png",
          firstSeen: "2019-08-03",
          lastSeen: "2023-04-28",
          daysInShop: 5,
          stints: 5,
          daysAway: 1300
        },
        {
          id: "Wrap_231_TargetPractice",
          name: "Shooting Gallery",
          type: "Wrap",
          category: "Wraps",
          rarity: "Rare",
          series: null,
          set: "Ready, aim, fire!",
          image: "https://fortnite-api.com/images/cosmetics/br/wrap_231_targetpractice/smallicon.png",
          firstSeen: "2020-05-15",
          lastSeen: "2023-05-01",
          daysInShop: 4,
          stints: 4,
          daysAway: 1297
        },
        {
          id: "Wrap_028_DevilLace",
          name: "Heat",
          type: "Wrap",
          category: "Wraps",
          rarity: "Rare",
          series: null,
          set: "Diabolical",
          image: "https://fortnite-api.com/images/cosmetics/br/wrap_028_devillace/smallicon.png",
          firstSeen: "2019-04-22",
          lastSeen: "2023-05-04",
          daysInShop: 18,
          stints: 16,
          daysAway: 1294
        },
        {
          id: "Wrap_126_CircleFade",
          name: "Square Stream",
          type: "Wrap",
          category: "Wraps",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/wrap_126_circlefade/smallicon.png",
          firstSeen: "2019-08-28",
          lastSeen: "2023-05-12",
          daysInShop: 4,
          stints: 2,
          daysAway: 1286
        },
        {
          id: "Wrap_Comp24",
          name: "FNCS Green",
          type: "Wrap",
          category: "Wraps",
          rarity: "Uncommon",
          series: null,
          set: "FNCS",
          image: "https://fortnite-api.com/images/cosmetics/br/wrap_comp24/smallicon.png",
          firstSeen: "2023-05-11",
          lastSeen: "2023-05-15",
          daysInShop: 5,
          stints: 1,
          daysAway: 1283
        }
      ]
    },
    {
      label: "Lobby Music",
      total: 76,
      items: [
        {
          id: "MusicPack_011_GetFunky",
          name: "Get funky",
          type: "Lobby Music",
          category: "Lobby Music",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/musicpack_011_getfunky/smallicon.png",
          firstSeen: "2019-05-05",
          lastSeen: "2019-08-07",
          daysInShop: 3,
          stints: 3,
          daysAway: 2660
        },
        {
          id: "MusicPack_045_Carnaval",
          name: "Sunny Samba",
          type: "Lobby Music",
          category: "Lobby Music",
          rarity: "Rare",
          series: null,
          set: "Carnaval 2020",
          image: "https://fortnite-api.com/images/cosmetics/br/musicpack_045_carnaval/smallicon.png",
          firstSeen: "2020-02-25",
          lastSeen: "2020-02-25",
          daysInShop: 1,
          stints: 1,
          daysAway: 2458
        },
        {
          id: "MusicPack_064_FortniteFright",
          name: "Fortnitemares 2020",
          type: "Lobby Music",
          category: "Lobby Music",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/musicpack_064_fortnitefright/smallicon.png",
          firstSeen: "2020-10-31",
          lastSeen: "2020-10-31",
          daysInShop: 1,
          stints: 1,
          daysAway: 2209
        },
        {
          id: "MusicPack_066_ComicBookTrack",
          name: "Herald's Warning",
          type: "Lobby Music",
          category: "Lobby Music",
          rarity: "MARVEL SERIES",
          series: "MARVEL SERIES",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/musicpack_066_comicbooktrack/smallicon.png",
          firstSeen: "2020-11-30",
          lastSeen: "2020-12-01",
          daysInShop: 2,
          stints: 1,
          daysAway: 2178
        },
        {
          id: "MusicPack_010_RunningMan",
          name: "Marathon",
          type: "Lobby Music",
          category: "Lobby Music",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/musicpack_010_runningman/smallicon.png",
          firstSeen: "2019-04-15",
          lastSeen: "2021-02-15",
          daysInShop: 4,
          stints: 4,
          daysAway: 2102
        },
        {
          id: "MusicPack_049_BalletSpinRemix",
          name: "Prima Remix",
          type: "Lobby Music",
          category: "Lobby Music",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/musicpack_049_balletspinremix/smallicon.png",
          firstSeen: "2020-05-21",
          lastSeen: "2021-03-11",
          daysInShop: 2,
          stints: 2,
          daysAway: 2078
        },
        {
          id: "MusicPack_079_S16_Cine",
          name: "Wild",
          type: "Lobby Music",
          category: "Lobby Music",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/musicpack_079_s16_cine/smallicon.png",
          firstSeen: "2021-03-23",
          lastSeen: "2021-03-23",
          daysInShop: 1,
          stints: 1,
          daysAway: 2066
        },
        {
          id: "MusicPack_060_TakeTheW",
          name: "Sweet Victory ",
          type: "Lobby Music",
          category: "Lobby Music",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/musicpack_060_takethew/smallicon.png",
          firstSeen: "2020-10-08",
          lastSeen: "2021-04-28",
          daysInShop: 3,
          stints: 3,
          daysAway: 2030
        },
        {
          id: "MusicPack_017_PhoneItIn",
          name: "Saxy Groove",
          type: "Lobby Music",
          category: "Lobby Music",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/musicpack_017_phoneitin/smallicon.png",
          firstSeen: "2019-06-24",
          lastSeen: "2021-06-01",
          daysInShop: 14,
          stints: 14,
          daysAway: 1996
        },
        {
          id: "MusicPack_027_LasagnaDope",
          name: "Default Fire",
          type: "Lobby Music",
          category: "Lobby Music",
          rarity: "Icon Series",
          series: "Icon Series",
          set: "Lazerism",
          image: "https://fortnite-api.com/images/cosmetics/br/musicpack_027_lasagnadope/smallicon.png",
          firstSeen: "2019-08-23",
          lastSeen: "2021-06-13",
          daysInShop: 13,
          stints: 4,
          daysAway: 1984
        },
        {
          id: "MusicPack_026_LasagnaChill",
          name: "Default Vibe",
          type: "Lobby Music",
          category: "Lobby Music",
          rarity: "Icon Series",
          series: "Icon Series",
          set: "Lazerism",
          image: "https://fortnite-api.com/images/cosmetics/br/musicpack_026_lasagnachill/smallicon.png",
          firstSeen: "2019-08-23",
          lastSeen: "2021-06-13",
          daysInShop: 13,
          stints: 4,
          daysAway: 1984
        },
        {
          id: "MusicPack_092_Cine",
          name: "The Invasion",
          type: "Lobby Music",
          category: "Lobby Music",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/musicpack_092_cine/smallicon.png",
          firstSeen: "2021-06-27",
          lastSeen: "2021-06-27",
          daysInShop: 1,
          stints: 1,
          daysAway: 1970
        },
        {
          id: "MusicPack_099_FNCS",
          name: "Dream Runner",
          type: "Lobby Music",
          category: "Lobby Music",
          rarity: "Rare",
          series: null,
          set: "FNCS",
          image: "https://fortnite-api.com/images/cosmetics/br/musicpack_099_fncs/smallicon.png",
          firstSeen: "2021-09-02",
          lastSeen: "2021-09-06",
          daysInShop: 5,
          stints: 1,
          daysAway: 1899
        },
        {
          id: "MusicPack_041_Slick",
          name: "Mellow Days",
          type: "Lobby Music",
          category: "Lobby Music",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/musicpack_041_slick/smallicon.png",
          firstSeen: "2020-01-28",
          lastSeen: "2021-11-21",
          daysInShop: 4,
          stints: 4,
          daysAway: 1823
        },
        {
          id: "MusicPack_113_S18_FNCS",
          name: "In Btwn",
          type: "Lobby Music",
          category: "Lobby Music",
          rarity: "Rare",
          series: null,
          set: "FNCS",
          image: "https://fortnite-api.com/images/cosmetics/br/musicpack_113_s18_fncs/smallicon.png",
          firstSeen: "2021-11-18",
          lastSeen: "2021-11-22",
          daysInShop: 5,
          stints: 1,
          daysAway: 1822
        },
        {
          id: "MusicPack_106_Bistro_DQZH0",
          name: "Rift Tour Countdown",
          type: "Lobby Music",
          category: "Lobby Music",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/musicpack_106_bistro_dqzh0/smallicon.png",
          firstSeen: "2021-10-22",
          lastSeen: "2021-11-28",
          daysInShop: 2,
          stints: 2,
          daysAway: 1816
        },
        {
          id: "MusicPack_071_FortniteCarollingRemix",
          name: "Frosty Serenade",
          type: "Lobby Music",
          category: "Lobby Music",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/musicpack_071_fortnitecarollingremix/smallicon.png",
          firstSeen: "2020-12-22",
          lastSeen: "2021-12-20",
          daysInShop: 6,
          stints: 4,
          daysAway: 1794
        },
        {
          id: "MusicPack_119_CH1_DefaultMusic",
          name: "Lobby Classic",
          type: "Lobby Music",
          category: "Lobby Music",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/musicpack_119_ch1_defaultmusic/smallicon.png",
          firstSeen: "2022-01-31",
          lastSeen: "2022-01-31",
          daysInShop: 1,
          stints: 1,
          daysAway: 1752
        },
        {
          id: "MusicPack_112_Uproar_59WME",
          name: "Playground (Instrumental)",
          type: "Lobby Music",
          category: "Lobby Music",
          rarity: "Gaming Legends Series",
          series: "Gaming Legends Series",
          set: "Arcane: League of Legends",
          image: "https://fortnite-api.com/images/cosmetics/br/musicpack_112_uproar_59wme/smallicon.png",
          firstSeen: "2021-11-05",
          lastSeen: "2022-02-05",
          daysInShop: 21,
          stints: 2,
          daysAway: 1747
        },
        {
          id: "MusicPack_125_S19_FNCS",
          name: "Infinite Hype",
          type: "Lobby Music",
          category: "Lobby Music",
          rarity: "Rare",
          series: null,
          set: "FNCS",
          image: "https://fortnite-api.com/images/cosmetics/br/musicpack_125_s19_fncs/smallicon.png",
          firstSeen: "2022-03-03",
          lastSeen: "2022-03-07",
          daysInShop: 5,
          stints: 1,
          daysAway: 1717
        },
        {
          id: "MusicPack_126_Woman",
          name: "I Am Fearless",
          type: "Lobby Music",
          category: "Lobby Music",
          rarity: "Icon Series",
          series: "Icon Series",
          set: "IWD 2022",
          image: "https://fortnite-api.com/images/cosmetics/br/musicpack_126_woman/smallicon.png",
          firstSeen: "2022-03-08",
          lastSeen: "2022-03-14",
          daysInShop: 7,
          stints: 1,
          daysAway: 1710
        },
        {
          id: "MusicPack_131_MC",
          name: "Keep Going",
          type: "Lobby Music",
          category: "Lobby Music",
          rarity: "Icon Series",
          series: "Icon Series",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/musicpack_131_mc/smallicon.png",
          firstSeen: "2022-04-29",
          lastSeen: "2022-05-01",
          daysInShop: 3,
          stints: 1,
          daysAway: 1662
        },
        {
          id: "MusicPack_134_FNCS20",
          name: "Take Me Higher",
          type: "Lobby Music",
          category: "Lobby Music",
          rarity: "Uncommon",
          series: null,
          set: "FNCS",
          image: "https://fortnite-api.com/images/cosmetics/br/musicpack_134_fncs20/smallicon.png",
          firstSeen: "2022-05-26",
          lastSeen: "2022-05-30",
          daysInShop: 5,
          stints: 1,
          daysAway: 1633
        },
        {
          id: "MusicPack_086_Hype",
          name: "Hype-notic",
          type: "Lobby Music",
          category: "Lobby Music",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/musicpack_086_hype/smallicon.png",
          firstSeen: "2021-06-02",
          lastSeen: "2022-06-07",
          daysInShop: 5,
          stints: 5,
          daysAway: 1625
        },
        {
          id: "MusicPack_143_S21_FNCS",
          name: "Show Them Who We Are",
          type: "Lobby Music",
          category: "Lobby Music",
          rarity: "Rare",
          series: null,
          set: "FNCS",
          image: "https://fortnite-api.com/images/cosmetics/br/musicpack_143_s21_fncs/smallicon.png",
          firstSeen: "2022-08-11",
          lastSeen: "2022-08-17",
          daysInShop: 7,
          stints: 1,
          daysAway: 1554
        }
      ]
    },
    {
      label: "Loading Screens",
      total: 38,
      items: [
        {
          id: "LSID_233_StormTheAgency",
          name: "Storm The Agency",
          type: "Loading Screen",
          category: "Loading Screens",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/lsid_233_stormtheagency/smallicon.png",
          firstSeen: "2020-05-26",
          lastSeen: "2020-05-28",
          daysInShop: 3,
          stints: 1,
          daysAway: 2365
        },
        {
          id: "LSID_305_Downpour_CHB8O",
          name: "A New Shardworld?",
          type: "Loading Screen",
          category: "Loading Screens",
          rarity: "Uncommon",
          series: null,
          set: "Cosmere Castaway",
          image: "https://fortnite-api.com/images/cosmetics/br/lsid_305_downpour_chb8o/smallicon.png",
          firstSeen: "2021-05-28",
          lastSeen: "2021-11-07",
          daysInShop: 11,
          stints: 6,
          daysAway: 1837
        },
        {
          id: "LSID_367_Paperbag_3WGO8",
          name: "land of freedom",
          type: "Loading Screen",
          category: "Loading Screens",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/lsid_367_paperbag_3wgo8/smallicon.png",
          firstSeen: "2021-11-19",
          lastSeen: "2021-11-22",
          daysInShop: 4,
          stints: 1,
          daysAway: 1822
        },
        {
          id: "LSID_350_CerealBoxParade",
          name: "Unicorns on Parade",
          type: "Loading Screen",
          category: "Loading Screens",
          rarity: "Uncommon",
          series: null,
          set: "Unicorn Flakes!!!",
          image: "https://fortnite-api.com/images/cosmetics/br/lsid_350_cerealboxparade/smallicon.png",
          firstSeen: "2021-11-24",
          lastSeen: "2021-11-25",
          daysInShop: 2,
          stints: 1,
          daysAway: 1819
        },
        {
          id: "LSID_374_GuavaKey_IY0H9",
          name: "The Queen's Arrival",
          type: "Loading Screen",
          category: "Loading Screens",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/br/lsid_374_guavakey_iy0h9/smallicon.png",
          firstSeen: "2021-12-05",
          lastSeen: "2021-12-07",
          daysInShop: 3,
          stints: 1,
          daysAway: 1807
        },
        {
          id: "LSID_405_FNCS_Iris",
          name: "Victory Strikes",
          type: "Loading Screen",
          category: "Loading Screens",
          rarity: "Uncommon",
          series: null,
          set: "FNCS",
          image: "https://fortnite-api.com/images/cosmetics/br/lsid_405_fncs_iris/smallicon.png",
          firstSeen: "2022-03-03",
          lastSeen: "2022-03-07",
          daysInShop: 5,
          stints: 1,
          daysAway: 1717
        },
        {
          id: "LoadingScreen_Sahara",
          name: "Teth Ascended",
          type: "Loading Screen",
          category: "Loading Screens",
          rarity: "DC SERIES",
          series: "DC SERIES",
          set: "Black Adam",
          image: "https://fortnite-api.com/images/cosmetics/br/loadingscreen_sahara/smallicon.png",
          firstSeen: "2022-10-21",
          lastSeen: "2022-11-03",
          daysInShop: 14,
          stints: 1,
          daysAway: 1476
        },
        {
          id: "LSID_372_Grandeur_UOK4E",
          name: "The Summit",
          type: "Loading Screen",
          category: "Loading Screens",
          rarity: "Uncommon",
          series: null,
          set: "Moncler Classic",
          image: "https://fortnite-api.com/images/cosmetics/br/lsid_372_grandeur_uok4e/smallicon.png",
          firstSeen: "2021-11-21",
          lastSeen: "2023-01-07",
          daysInShop: 20,
          stints: 4,
          daysAway: 1411
        },
        {
          id: "LSID_421_SCRN_JourneyMentor",
          name: "Eivor's Fury",
          type: "Loading Screen",
          category: "Loading Screens",
          rarity: "Gaming Legends Series",
          series: "Gaming Legends Series",
          set: "Tales from the Animus",
          image: "https://fortnite-api.com/images/cosmetics/br/lsid_421_scrn_journeymentor/smallicon.png",
          firstSeen: "2022-04-08",
          lastSeen: "2023-02-12",
          daysInShop: 10,
          stints: 3,
          daysAway: 1375
        },
        {
          id: "LSID_294_Alchemy_09U3R",
          name: "Aloy the Skywatcher",
          type: "Loading Screen",
          category: "Loading Screens",
          rarity: "Gaming Legends Series",
          series: "Gaming Legends Series",
          set: "Horizon Zero Dawn",
          image: "https://fortnite-api.com/images/cosmetics/br/lsid_294_alchemy_09u3r/smallicon.png",
          firstSeen: "2021-04-16",
          lastSeen: "2023-03-20",
          daysInShop: 41,
          stints: 4,
          daysAway: 1339
        },
        {
          id: "LSID_323_Majesty_0P2RG",
          name: "Court's in Session",
          type: "Loading Screen",
          category: "Loading Screens",
          rarity: "Icon Series",
          series: "Icon Series",
          set: "King James",
          image: "https://fortnite-api.com/images/cosmetics/br/lsid_323_majesty_0p2rg/smallicon.png",
          firstSeen: "2021-07-15",
          lastSeen: "2023-04-13",
          daysInShop: 42,
          stints: 4,
          daysAway: 1315
        },
        {
          id: "LoadingScreen_NightHawk",
          name: "Citadel Scouts",
          type: "Loading Screen",
          category: "Loading Screens",
          rarity: "Uncommon",
          series: null,
          set: "Special Operations Squad",
          image: "https://fortnite-api.com/images/cosmetics/br/loadingscreen_nighthawk/smallicon.png",
          firstSeen: "2023-04-11",
          lastSeen: "2023-04-24",
          daysInShop: 14,
          stints: 1,
          daysAway: 1304
        },
        {
          id: "LoadingScreen_Stallion",
          name: "Back Into the Arena",
          type: "Loading Screen",
          category: "Loading Screens",
          rarity: "Uncommon",
          series: null,
          set: "Polo Stadium Collection",
          image: "https://fortnite-api.com/images/cosmetics/br/loadingscreen_stallion/smallicon.png",
          firstSeen: "2022-11-06",
          lastSeen: "2023-08-09",
          daysInShop: 14,
          stints: 2,
          daysAway: 1197
        },
        {
          id: "LoadingScreen_Possession",
          name: "Warden's Watch",
          type: "Loading Screen",
          category: "Loading Screens",
          rarity: "Uncommon",
          series: null,
          set: "Rift's Warden",
          image: "https://fortnite-api.com/images/cosmetics/br/loadingscreen_possession/smallicon.png",
          firstSeen: "2023-01-19",
          lastSeen: "2023-09-14",
          daysInShop: 8,
          stints: 7,
          daysAway: 1161
        },
        {
          id: "LoadingScreen_Veiled",
          name: "Ava, Adrift",
          type: "Loading Screen",
          category: "Loading Screens",
          rarity: "Uncommon",
          series: null,
          set: "Underland Nexus",
          image: "https://fortnite-api.com/images/cosmetics/br/loadingscreen_veiled/smallicon.png",
          firstSeen: "2022-10-28",
          lastSeen: "2023-10-02",
          daysInShop: 13,
          stints: 11,
          daysAway: 1143
        },
        {
          id: "LoadingScreen_SCRN_Veiled",
          name: "Double Life",
          type: "Loading Screen",
          category: "Loading Screens",
          rarity: "Uncommon",
          series: null,
          set: "Underland Nexus",
          image: "https://fortnite-api.com/images/cosmetics/br/loadingscreen_scrn_veiled/smallicon.png",
          firstSeen: "2022-10-28",
          lastSeen: "2023-10-02",
          daysInShop: 13,
          stints: 11,
          daysAway: 1143
        },
        {
          id: "LoadingScreen_Mirage",
          name: "Hypnotic Gaze",
          type: "Loading Screen",
          category: "Loading Screens",
          rarity: "Uncommon",
          series: null,
          set: "Ethereal Song",
          image: "https://fortnite-api.com/images/cosmetics/br/loadingscreen_mirage/smallicon.png",
          firstSeen: "2023-04-21",
          lastSeen: "2023-11-23",
          daysInShop: 8,
          stints: 6,
          daysAway: 1091
        },
        {
          id: "LSID_287_BuffCatComic_JBE9O",
          name: "Fantastic Cat",
          type: "Loading Screen",
          category: "Loading Screens",
          rarity: "Uncommon",
          series: null,
          set: "Inkville Gang",
          image: "https://fortnite-api.com/images/cosmetics/br/lsid_287_buffcatcomic_jbe9o/smallicon.png",
          firstSeen: "2021-05-07",
          lastSeen: "2023-11-24",
          daysInShop: 30,
          stints: 28,
          daysAway: 1090
        },
        {
          id: "LoadingScreen_Sunburst_KeyArt",
          name: "Wild Dreams",
          type: "Loading Screen",
          category: "Loading Screens",
          rarity: "Icon Series",
          series: "Icon Series",
          set: "The Kid LAROI",
          image: "https://fortnite-api.com/images/cosmetics/br/loadingscreen_sunburst_keyart/smallicon.png",
          firstSeen: "2023-01-27",
          lastSeen: "2023-11-29",
          daysInShop: 53,
          stints: 6,
          daysAway: 1085
        },
        {
          id: "LoadingScreen_HeadHunter",
          name: "Renegade Reunion",
          type: "Loading Screen",
          category: "Loading Screens",
          rarity: "Uncommon",
          series: null,
          set: "Renegade Robotics",
          image: "https://fortnite-api.com/images/cosmetics/br/loadingscreen_headhunter/smallicon.png",
          firstSeen: "2023-04-16",
          lastSeen: "2024-04-02",
          daysInShop: 12,
          stints: 8,
          daysAway: 960
        },
        {
          id: "LoadingScreen_Mochi",
          name: "Mochimallow Roast",
          type: "Loading Screen",
          category: "Loading Screens",
          rarity: "Uncommon",
          series: null,
          set: "Glutinous Guardian",
          image: "https://fortnite-api.com/images/cosmetics/br/loadingscreen_mochi/smallicon.png",
          firstSeen: "2022-10-05",
          lastSeen: "2024-05-09",
          daysInShop: 12,
          stints: 11,
          daysAway: 923
        },
        {
          id: "LSID_477_RainbowRoyale",
          name: "Mazy and the Echoes",
          type: "Loading Screen",
          category: "Loading Screens",
          rarity: "Uncommon",
          series: null,
          set: "Prismatic Pride",
          image: "https://fortnite-api.com/images/cosmetics/br/lsid_477_rainbowroyale/smallicon.png",
          firstSeen: "2022-09-01",
          lastSeen: "2024-07-02",
          daysInShop: 29,
          stints: 4,
          daysAway: 869
        },
        {
          id: "LSID_473_Barium",
          name: "All Downhill From Here",
          type: "Loading Screen",
          category: "Loading Screens",
          rarity: "Uncommon",
          series: null,
          set: "Downhill Demon",
          image: "https://fortnite-api.com/images/cosmetics/br/lsid_473_barium/smallicon.png",
          firstSeen: "2023-01-13",
          lastSeen: "2024-07-21",
          daysInShop: 7,
          stints: 5,
          daysAway: 850
        },
        {
          id: "LoadingScreen_BoneMarrow",
          name: "Crossheart's Arrival",
          type: "Loading Screen",
          category: "Loading Screens",
          rarity: "Uncommon",
          series: null,
          set: "Amano's Heart",
          image: "https://fortnite-api.com/images/cosmetics/br/loadingscreen_bonemarrow/smallicon.png",
          firstSeen: "2023-05-21",
          lastSeen: "2024-08-02",
          daysInShop: 14,
          stints: 7,
          daysAway: 838
        },
        {
          id: "LoadingScreen_ArcticIce",
          name: "Gohan & Piccolo",
          type: "Loading Screen",
          category: "Loading Screens",
          rarity: "Uncommon",
          series: null,
          set: "Dragon Ball",
          image: "https://fortnite-api.com/images/cosmetics/br/loadingscreen_arcticice/smallicon.png",
          firstSeen: "2023-01-31",
          lastSeen: "2024-08-16",
          daysInShop: 40,
          stints: 6,
          daysAway: 824
        }
      ]
    },
    {
      label: "Cars",
      total: 2,
      items: [
        {
          id: "ID_Body_Squash",
          name: "Cyclone",
          type: "Body",
          category: "Cars",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/cars/id_body_squash/small.png",
          firstSeen: "2025-01-30",
          lastSeen: "2025-01-30",
          daysInShop: 1,
          stints: 1,
          daysAway: 657
        },
        {
          id: "CarBody_Sassy",
          name: "Nissan Z Performance",
          type: "Body",
          category: "Cars",
          rarity: "Uncommon",
          series: "NISSAN SERIES",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/cars/carbody_sassy/small.png",
          firstSeen: "2024-06-25",
          lastSeen: "2025-03-25",
          daysInShop: 28,
          stints: 3,
          daysAway: 603
        }
      ]
    },
    {
      label: "Decals",
      total: 8,
      items: [
        {
          id: "ID_Skin_Octane_Flames",
          name: "Flames",
          type: "Skin",
          category: "Decals",
          rarity: "Common",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/cars/id_skin_octane_flames/small.png",
          firstSeen: "2024-08-16",
          lastSeen: "2024-08-17",
          daysInShop: 2,
          stints: 1,
          daysAway: 823
        },
        {
          id: "ID_Skin_Octane_Lightning",
          name: "Lightning",
          type: "Skin",
          category: "Decals",
          rarity: "Common",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/cars/id_skin_octane_lightning/small.png",
          firstSeen: "2024-08-16",
          lastSeen: "2024-08-17",
          daysInShop: 2,
          stints: 1,
          daysAway: 823
        },
        {
          id: "ID_Skin_Octane_Stripes",
          name: "Stripes",
          type: "Skin",
          category: "Decals",
          rarity: "Common",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/cars/id_skin_octane_stripes/small.png",
          firstSeen: "2024-08-16",
          lastSeen: "2024-08-17",
          daysInShop: 2,
          stints: 1,
          daysAway: 823
        },
        {
          id: "ID_Skin_Octane_Wings",
          name: "Wings",
          type: "Skin",
          category: "Decals",
          rarity: "Common",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/cars/id_skin_octane_wings/small.png",
          firstSeen: "2024-08-16",
          lastSeen: "2024-08-17",
          daysInShop: 2,
          stints: 1,
          daysAway: 823
        },
        {
          id: "CarSkin_SassyFlames",
          name: "Flames",
          type: "Skin",
          category: "Decals",
          rarity: "Uncommon",
          series: "NISSAN SERIES",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/cars/carskin_sassyflames/small.png",
          firstSeen: "2024-06-25",
          lastSeen: "2025-03-25",
          daysInShop: 28,
          stints: 3,
          daysAway: 603
        },
        {
          id: "CarSkin_SassyLightning",
          name: "Lightning",
          type: "Skin",
          category: "Decals",
          rarity: "Uncommon",
          series: "NISSAN SERIES",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/cars/carskin_sassylightning/small.png",
          firstSeen: "2024-06-25",
          lastSeen: "2025-03-25",
          daysInShop: 28,
          stints: 3,
          daysAway: 603
        },
        {
          id: "CarSkin_SassyStripes",
          name: "Stripes",
          type: "Skin",
          category: "Decals",
          rarity: "Uncommon",
          series: "NISSAN SERIES",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/cars/carskin_sassystripes/small.png",
          firstSeen: "2024-06-25",
          lastSeen: "2025-03-25",
          daysInShop: 28,
          stints: 3,
          daysAway: 603
        },
        {
          id: "CarSkin_SassyWings",
          name: "Wings",
          type: "Skin",
          category: "Decals",
          rarity: "Uncommon",
          series: "NISSAN SERIES",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/cars/carskin_sassywings/small.png",
          firstSeen: "2024-06-25",
          lastSeen: "2025-03-25",
          daysInShop: 28,
          stints: 3,
          daysAway: 603
        }
      ]
    },
    {
      label: "Wheels",
      total: 4,
      items: [
        {
          id: "Wheel_BasicAW",
          name: "Darkerside",
          type: "Wheel",
          category: "Wheels",
          rarity: "Uncommon",
          series: "ALAN WALKER SERIES",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/cars/wheel_basicaw/small.png",
          firstSeen: "2024-08-08",
          lastSeen: "2024-08-22",
          daysInShop: 15,
          stints: 1,
          daysAway: 818
        },
        {
          id: "Wheel_Law",
          name: "Diamond Hearted",
          type: "Wheel",
          category: "Wheels",
          rarity: "Uncommon",
          series: "ALAN WALKER SERIES",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/cars/wheel_law/small.png",
          firstSeen: "2024-08-08",
          lastSeen: "2024-08-22",
          daysInShop: 15,
          stints: 1,
          daysAway: 818
        },
        {
          id: "Wheel_SassyA",
          name: "Nissan Z Performance",
          type: "Wheel",
          category: "Wheels",
          rarity: "Uncommon",
          series: "NISSAN SERIES",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/cars/wheel_sassya/small.png",
          firstSeen: "2024-06-25",
          lastSeen: "2025-03-25",
          daysInShop: 28,
          stints: 3,
          daysAway: 603
        },
        {
          id: "Wheel_Gray",
          name: "AC Milan (PUMA x Off-White)",
          type: "Wheel",
          category: "Wheels",
          rarity: "Common",
          series: "PUMA Series",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/cars/wheel_gray/small.png",
          firstSeen: "2025-02-22",
          lastSeen: "2025-06-06",
          daysInShop: 20,
          stints: 2,
          daysAway: 530
        }
      ]
    },
    {
      label: "Boosts",
      total: 7,
      items: [
        {
          id: "ID_Booster_Aurora",
          name: "Ethereal",
          type: "Turbo",
          category: "Boosts",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/cars/id_booster_aurora/small.png",
          firstSeen: "2024-02-07",
          lastSeen: "2024-02-13",
          daysInShop: 7,
          stints: 1,
          daysAway: 1009
        },
        {
          id: "ID_Booster_Starbeam",
          name: "Startrack",
          type: "Turbo",
          category: "Boosts",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/cars/id_booster_starbeam/small.png",
          firstSeen: "2024-02-07",
          lastSeen: "2024-02-13",
          daysInShop: 7,
          stints: 1,
          daysAway: 1009
        },
        {
          id: "ID_Booster_AW",
          name: "Front Row",
          type: "Turbo",
          category: "Boosts",
          rarity: "Rare",
          series: "ALAN WALKER SERIES",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/cars/id_booster_aw/small.png",
          firstSeen: "2024-08-08",
          lastSeen: "2024-08-22",
          daysInShop: 15,
          stints: 1,
          daysAway: 818
        },
        {
          id: "ID_Booster_Pumpkin",
          name: "Scary Pumpkin",
          type: "Turbo",
          category: "Boosts",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/cars/id_booster_pumpkin/small.png",
          firstSeen: "2024-10-16",
          lastSeen: "2024-11-01",
          daysInShop: 17,
          stints: 1,
          daysAway: 747
        },
        {
          id: "ID_Booster_Meteors",
          name: "GeoSoul",
          type: "Turbo",
          category: "Boosts",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/cars/id_booster_meteors/small.png",
          firstSeen: "2024-12-02",
          lastSeen: "2024-12-10",
          daysInShop: 9,
          stints: 1,
          daysAway: 708
        },
        {
          id: "ID_Booster_EvilOrnament02",
          name: "Unstable Red Lightsaber",
          type: "Turbo",
          category: "Boosts",
          rarity: "Star Wars Series",
          series: "Star Wars Series",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/cars/id_booster_evilornament02/small.png",
          firstSeen: "2025-05-03",
          lastSeen: "2025-05-16",
          daysInShop: 14,
          stints: 1,
          daysAway: 551
        },
        {
          id: "ID_Booster_Gray",
          name: "AC Milan (PUMA x Off-White)",
          type: "Turbo",
          category: "Boosts",
          rarity: "Uncommon",
          series: "PUMA Series",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/cars/id_booster_gray/small.png",
          firstSeen: "2025-02-22",
          lastSeen: "2025-06-06",
          daysInShop: 20,
          stints: 2,
          daysAway: 530
        }
      ]
    },
    {
      label: "Jam Tracks",
      total: 6,
      items: [
        {
          id: "sid_placeholder_152",
          name: "Swim Free",
          type: "Jam Track",
          category: "Jam Tracks",
          rarity: null,
          series: null,
          set: null,
          image: "https://cdn.fortnite-api.com/tracks/8836ef376c8c6ce1.jpg",
          firstSeen: "2024-08-02",
          lastSeen: "2024-08-02",
          daysInShop: 1,
          stints: 1,
          daysAway: 838
        },
        {
          id: "sid_placeholder_475",
          name: "All I Want For Christmas Is You",
          type: "Jam Track",
          category: "Jam Tracks",
          rarity: null,
          series: null,
          set: null,
          image: "https://cdn.fortnite-api.com/tracks/8e3cbad8c42e53e3.jpg",
          firstSeen: "2024-12-21",
          lastSeen: "2025-01-07",
          daysInShop: 18,
          stints: 1,
          daysAway: 680
        },
        {
          id: "sid_placeholder_138",
          name: "Streets Ignite",
          type: "Jam Track",
          category: "Jam Tracks",
          rarity: null,
          series: null,
          set: null,
          image: "https://cdn.fortnite-api.com/tracks/5aea5b6c1431ac48.jpg",
          firstSeen: "2024-02-15",
          lastSeen: "2025-01-23",
          daysInShop: 50,
          stints: 7,
          daysAway: 664
        },
        {
          id: "sid_placeholder_527",
          name: "Runamok",
          type: "Jam Track",
          category: "Jam Tracks",
          rarity: null,
          series: null,
          set: null,
          image: "https://cdn.fortnite-api.com/tracks/47ba157eb434f237.jpg",
          firstSeen: "2025-02-28",
          lastSeen: "2025-02-28",
          daysInShop: 1,
          stints: 1,
          daysAway: 628
        },
        {
          id: "sid_placeholder_525",
          name: "Sour 'n Sweet",
          type: "Jam Track",
          category: "Jam Tracks",
          rarity: null,
          series: null,
          set: null,
          image: "https://cdn.fortnite-api.com/tracks/39a21bb462a98e43.jpg",
          firstSeen: "2025-03-26",
          lastSeen: "2025-04-01",
          daysInShop: 7,
          stints: 1,
          daysAway: 596
        },
        {
          id: "sid_placeholder_583",
          name: "Infinite Hype (DJ Skee Remix)",
          type: "Jam Track",
          category: "Jam Tracks",
          rarity: null,
          series: null,
          set: null,
          image: "https://cdn.fortnite-api.com/tracks/a607ad7c776bfcf6.jpg",
          firstSeen: "2025-05-13",
          lastSeen: "2025-05-15",
          daysInShop: 3,
          stints: 1,
          daysAway: 552
        }
      ]
    },
    {
      label: "Guitars",
      total: 7,
      items: [
        {
          id: "Sparks_Guitar_BottlePhone",
          name: "Fender Stratocaster",
          type: "Guitar",
          category: "Guitars",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_guitar_bottlephone/small.png",
          firstSeen: "2024-03-14",
          lastSeen: "2024-03-24",
          daysInShop: 11,
          stints: 1,
          daysAway: 969
        },
        {
          id: "Sparks_Guitar_ShakeCrunch",
          name: "Hobie's Wicked Electric Guitar",
          type: "Guitar",
          category: "Guitars",
          rarity: "MARVEL SERIES",
          series: "MARVEL SERIES",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_guitar_shakecrunch/small.png",
          firstSeen: "2024-12-07",
          lastSeen: "2025-02-28",
          daysInShop: 20,
          stints: 3,
          daysAway: 628
        },
        {
          id: "Sparks_Guitar_BandageTime",
          name: "Strummy Mummy",
          type: "Guitar",
          category: "Guitars",
          rarity: "Common",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_guitar_bandagetime/small.png",
          firstSeen: "2024-10-11",
          lastSeen: "2025-03-31",
          daysInShop: 10,
          stints: 2,
          daysAway: 597
        },
        {
          id: "Sparks_Guitar_PastaSauce",
          name: "Chromatica Guitar",
          type: "Guitar",
          category: "Guitars",
          rarity: "Icon Series",
          series: "Icon Series",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_guitar_pastasauce/small.png",
          firstSeen: "2024-11-17",
          lastSeen: "2025-04-21",
          daysInShop: 7,
          stints: 2,
          daysAway: 576
        },
        {
          id: "Sparks_Guitar_WidePlane",
          name: "Seven-string Hallikset",
          type: "Guitar",
          category: "Guitars",
          rarity: "Star Wars Series",
          series: "Star Wars Series",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_guitar_wideplane/small.png",
          firstSeen: "2024-12-12",
          lastSeen: "2025-05-10",
          daysInShop: 8,
          stints: 2,
          daysAway: 557
        },
        {
          id: "Sparks_Guitar_PCB",
          name: "PCB Six-String",
          type: "Guitar",
          category: "Guitars",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_guitar_pcb/small.png",
          firstSeen: "2024-08-06",
          lastSeen: "2025-05-17",
          daysInShop: 22,
          stints: 6,
          daysAway: 550
        },
        {
          id: "Sparks_Guitar_Insectoid",
          name: "Pincer",
          type: "Guitar",
          category: "Guitars",
          rarity: "Epic",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_guitar_insectoid/small.png",
          firstSeen: "2024-03-26",
          lastSeen: "2025-07-05",
          daysInShop: 35,
          stints: 8,
          daysAway: 501
        }
      ]
    },
    {
      label: "Basses",
      total: 5,
      items: [
        {
          id: "Sparks_Bass_HeadphoneJack",
          name: "Fender Precision Bass",
          type: "Bass",
          category: "Basses",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_bass_headphonejack/small.png",
          firstSeen: "2024-03-14",
          lastSeen: "2024-03-24",
          daysInShop: 11,
          stints: 1,
          daysAway: 969
        },
        {
          id: "Sparks_Bass_SpeedDial",
          name: "XO Bass",
          type: "Bass",
          category: "Basses",
          rarity: "Icon Series",
          series: "Icon Series",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_bass_speeddial/small.png",
          firstSeen: "2024-11-05",
          lastSeen: "2025-02-10",
          daysInShop: 7,
          stints: 2,
          daysAway: 646
        },
        {
          id: "Sparks_Bass_PastaSauce",
          name: "Chromatica Bass",
          type: "Bass",
          category: "Basses",
          rarity: "Icon Series",
          series: "Icon Series",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_bass_pastasauce/small.png",
          firstSeen: "2024-02-22",
          lastSeen: "2025-04-16",
          daysInShop: 83,
          stints: 6,
          daysAway: 581
        },
        {
          id: "Sparks_Bass_Jungle",
          name: "Ancient Artifact Bass",
          type: "Bass",
          category: "Basses",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_bass_jungle/small.png",
          firstSeen: "2024-02-22",
          lastSeen: "2025-06-30",
          daysInShop: 67,
          stints: 14,
          daysAway: 506
        },
        {
          id: "Sparks_Bass_MarkOne",
          name: "Techna-Classic",
          type: "Bass",
          category: "Basses",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_bass_markone/small.png",
          firstSeen: "2024-04-15",
          lastSeen: "2025-07-01",
          daysInShop: 21,
          stints: 7,
          daysAway: 505
        }
      ]
    },
    {
      label: "Drums",
      total: 9,
      items: [
        {
          id: "Sparks_Drum_HuskinGlee",
          name: "Punkin' Basher",
          type: "Drums",
          category: "Drums",
          rarity: "Common",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_drum_huskinglee/small.png",
          firstSeen: "2024-10-11",
          lastSeen: "2024-10-15",
          daysInShop: 5,
          stints: 1,
          daysAway: 764
        },
        {
          id: "Sparks_Drum_Orb",
          name: "Eerie Orbs",
          type: "Drums",
          category: "Drums",
          rarity: "Common",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_drum_orb/small.png",
          firstSeen: "2024-08-08",
          lastSeen: "2025-03-14",
          daysInShop: 9,
          stints: 2,
          daysAway: 614
        },
        {
          id: "Sparks_Drum_FanFavorite",
          name: "Relika Copper",
          type: "Drums",
          category: "Drums",
          rarity: "Common",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_drum_fanfavorite/small.png",
          firstSeen: "2025-03-23",
          lastSeen: "2025-03-26",
          daysInShop: 4,
          stints: 1,
          daysAway: 602
        },
        {
          id: "Sparks_Drum_WidePlane",
          name: "Endorian Drum Kit",
          type: "Drums",
          category: "Drums",
          rarity: "Star Wars Series",
          series: "Star Wars Series",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_drum_wideplane/small.png",
          firstSeen: "2024-05-03",
          lastSeen: "2025-05-10",
          daysInShop: 28,
          stints: 3,
          daysAway: 557
        },
        {
          id: "Sparks_Drum_HoneyBear",
          name: "Britemare Kit",
          type: "Drums",
          category: "Drums",
          rarity: "Epic",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_drum_honeybear/small.png",
          firstSeen: "2024-09-21",
          lastSeen: "2025-05-19",
          daysInShop: 5,
          stints: 2,
          daysAway: 548
        },
        {
          id: "Sparks_Drum_CheckMate",
          name: "Checkmate",
          type: "Drums",
          category: "Drums",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_drum_checkmate/small.png",
          firstSeen: "2024-05-07",
          lastSeen: "2025-06-04",
          daysInShop: 32,
          stints: 9,
          daysAway: 532
        },
        {
          id: "Sparks_Drum_CeremonialGuard",
          name: "High Society Clasher",
          type: "Drums",
          category: "Drums",
          rarity: "Uncommon",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_drum_ceremonialguard/small.png",
          firstSeen: "2024-02-08",
          lastSeen: "2025-06-29",
          daysInShop: 37,
          stints: 9,
          daysAway: 507
        },
        {
          id: "Sparks_Drum_Insectoid",
          name: "Playing Mantis",
          type: "Drums",
          category: "Drums",
          rarity: "Epic",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_drum_insectoid/small.png",
          firstSeen: "2024-03-26",
          lastSeen: "2025-07-03",
          daysInShop: 41,
          stints: 9,
          daysAway: 503
        },
        {
          id: "Sparks_Drum_Jungle",
          name: "Rhythmic Eclipse",
          type: "Drums",
          category: "Drums",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_drum_jungle/small.png",
          firstSeen: "2024-03-07",
          lastSeen: "2025-07-04",
          daysInShop: 14,
          stints: 6,
          daysAway: 502
        }
      ]
    },
    {
      label: "Keytars",
      total: 5,
      items: [
        {
          id: "Sparks_Keytar_PastaSauce",
          name: "Chromatica Keytar",
          type: "Keytar",
          category: "Keytars",
          rarity: "Icon Series",
          series: "Icon Series",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_keytar_pastasauce/small.png",
          firstSeen: "2024-11-17",
          lastSeen: "2025-04-21",
          daysInShop: 7,
          stints: 2,
          daysAway: 576
        },
        {
          id: "Sparks_Keytar_Insectoid",
          name: "Bugoid Symphonic ",
          type: "Keytar",
          category: "Keytars",
          rarity: "Epic",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_keytar_insectoid/small.png",
          firstSeen: "2024-04-01",
          lastSeen: "2025-05-09",
          daysInShop: 18,
          stints: 5,
          daysAway: 558
        },
        {
          id: "Sparks_Keytar_WidePlane",
          name: "Nalargon Keytar",
          type: "Keytar",
          category: "Keytars",
          rarity: "Star Wars Series",
          series: "Star Wars Series",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_keytar_wideplane/small.png",
          firstSeen: "2024-05-03",
          lastSeen: "2025-05-10",
          daysInShop: 32,
          stints: 4,
          daysAway: 557
        },
        {
          id: "Sparks_Keytar_PhoneCharger",
          name: "Sleeper Keys",
          type: "Keytar",
          category: "Keytars",
          rarity: "Icon Series",
          series: "Icon Series",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_keytar_phonecharger/small.png",
          firstSeen: "2025-02-06",
          lastSeen: "2025-05-20",
          daysInShop: 7,
          stints: 2,
          daysAway: 547
        },
        {
          id: "Sparks_Keytar_Wafer",
          name: "Mochamint Melodic",
          type: "Keytar",
          category: "Keytars",
          rarity: "Rare",
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_keytar_wafer/small.png",
          firstSeen: "2024-01-25",
          lastSeen: "2025-06-25",
          daysInShop: 36,
          stints: 8,
          daysAway: 511
        }
      ]
    },
    {
      label: "Microphones",
      total: 4,
      items: [
        {
          id: "Sparks_Mic_SpeedDial",
          name: "Weeknd Mic",
          type: "Microphone",
          category: "Microphones",
          rarity: "Icon Series",
          series: "Icon Series",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_mic_speeddial/small.png",
          firstSeen: "2024-11-05",
          lastSeen: "2025-02-10",
          daysInShop: 7,
          stints: 2,
          daysAway: 646
        },
        {
          id: "Sparks_Mic_ElegantLily_Plush",
          name: "MSB Mic",
          type: "Microphone",
          category: "Microphones",
          rarity: "Icon Series",
          series: "Icon Series",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_mic_elegantlily_plush/small.png",
          firstSeen: "2024-08-23",
          lastSeen: "2025-03-26",
          daysInShop: 74,
          stints: 2,
          daysAway: 602
        },
        {
          id: "Sparks_Mic_PastaSauce",
          name: "Chromatica Mic",
          type: "Microphone",
          category: "Microphones",
          rarity: "Icon Series",
          series: "Icon Series",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_mic_pastasauce/small.png",
          firstSeen: "2024-02-22",
          lastSeen: "2025-04-16",
          daysInShop: 83,
          stints: 6,
          daysAway: 581
        },
        {
          id: "Sparks_Mic_PhoneCharger",
          name: "Burial Mic",
          type: "Microphone",
          category: "Microphones",
          rarity: "Icon Series",
          series: "Icon Series",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_mic_phonecharger/small.png",
          firstSeen: "2025-02-06",
          lastSeen: "2025-05-20",
          daysInShop: 7,
          stints: 2,
          daysAway: 547
        }
      ]
    },
    {
      label: "Builds",
      total: 15,
      items: [
        {
          id: "JBSID_LK_Def_Gate_Small_01",
          name: "Knightly Gate House",
          type: "Build",
          category: "Builds",
          rarity: null,
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbsid_lk_def_gate_small_01/small.png",
          firstSeen: "2024-03-17",
          lastSeen: "2024-08-13",
          daysInShop: 55,
          stints: 8,
          daysAway: 827
        },
        {
          id: "JBSID_LK_Castle_Large_01",
          name: "Knightly Large Keep",
          type: "Build",
          category: "Builds",
          rarity: null,
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbsid_lk_castle_large_01/small.png",
          firstSeen: "2024-03-17",
          lastSeen: "2024-08-13",
          daysInShop: 55,
          stints: 8,
          daysAway: 827
        },
        {
          id: "JBSID_LK_Keep_Medium_01",
          name: "Knightly Small Keep",
          type: "Build",
          category: "Builds",
          rarity: null,
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbsid_lk_keep_medium_01/small.png",
          firstSeen: "2024-03-17",
          lastSeen: "2024-08-13",
          daysInShop: 55,
          stints: 8,
          daysAway: 827
        },
        {
          id: "JBSID_LK_Def_Tower_Small_01",
          name: "Knightly Tower",
          type: "Build",
          category: "Builds",
          rarity: null,
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbsid_lk_def_tower_small_01/small.png",
          firstSeen: "2024-03-17",
          lastSeen: "2024-08-13",
          daysInShop: 55,
          stints: 8,
          daysAway: 827
        },
        {
          id: "JBSID_LK_Def_TowerCrnStair_Small_01",
          name: "Knightly Tower Stairs",
          type: "Build",
          category: "Builds",
          rarity: null,
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbsid_lk_def_towercrnstair_small_01/small.png",
          firstSeen: "2024-03-17",
          lastSeen: "2024-08-13",
          daysInShop: 55,
          stints: 8,
          daysAway: 827
        },
        {
          id: "JBSID_LK_Def_Wall_Small_01",
          name: "Knightly Wall",
          type: "Build",
          category: "Builds",
          rarity: null,
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbsid_lk_def_wall_small_01/small.png",
          firstSeen: "2024-03-17",
          lastSeen: "2024-08-13",
          daysInShop: 55,
          stints: 8,
          daysAway: 827
        },
        {
          id: "JBSID_LK_Def_Corner_Small_01",
          name: "Knightly Wall Corner",
          type: "Build",
          category: "Builds",
          rarity: null,
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbsid_lk_def_corner_small_01/small.png",
          firstSeen: "2024-03-17",
          lastSeen: "2024-08-13",
          daysInShop: 55,
          stints: 8,
          daysAway: 827
        },
        {
          id: "JBSID_LK_Def_WallStair_Small_01",
          name: "Knightly Wall Stairs",
          type: "Build",
          category: "Builds",
          rarity: null,
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbsid_lk_def_wallstair_small_01/small.png",
          firstSeen: "2024-03-17",
          lastSeen: "2024-08-13",
          daysInShop: 55,
          stints: 8,
          daysAway: 827
        },
        {
          id: "JBSID_DB_ShopMed_01",
          name: "Durrr Burger Flagship Restaurant",
          type: "Build",
          category: "Builds",
          rarity: null,
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbsid_db_shopmed_01/small.png",
          firstSeen: "2024-03-10",
          lastSeen: "2024-08-24",
          daysInShop: 69,
          stints: 10,
          daysAway: 816
        },
        {
          id: "JBSID_LK_WizardTower_Medium_01",
          name: "Knightly Royal Mage's Tower",
          type: "Build",
          category: "Builds",
          rarity: null,
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbsid_lk_wizardtower_medium_01/small.png",
          firstSeen: "2024-03-17",
          lastSeen: "2025-03-19",
          daysInShop: 69,
          stints: 10,
          daysAway: 609
        },
        {
          id: "JBSID_LK_Workshop_Medium_01",
          name: "Knightly Workshop",
          type: "Build",
          category: "Builds",
          rarity: null,
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbsid_lk_workshop_medium_01/small.png",
          firstSeen: "2024-03-17",
          lastSeen: "2025-03-19",
          daysInShop: 69,
          stints: 10,
          daysAway: 609
        },
        {
          id: "JBSID_NYA_Apartment_01",
          name: "Friendly Neighborhood Apartment",
          type: "Build",
          category: "Builds",
          rarity: null,
          series: "MARVEL SERIES",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbsid_nya_apartment_01/small.png",
          firstSeen: "2024-09-21",
          lastSeen: "2025-03-26",
          daysInShop: 28,
          stints: 3,
          daysAway: 602
        },
        {
          id: "JBSID_NPB_TheDailyBugle",
          name: "The Daily Bugle",
          type: "Build",
          category: "Builds",
          rarity: null,
          series: "MARVEL SERIES",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbsid_npb_thedailybugle/small.png",
          firstSeen: "2024-09-21",
          lastSeen: "2025-03-26",
          daysInShop: 28,
          stints: 3,
          daysAway: 602
        },
        {
          id: "JBSID_DB_ShopMed_02",
          name: "Durrr Burger Franchise",
          type: "Build",
          category: "Builds",
          rarity: null,
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbsid_db_shopmed_02/small.png",
          firstSeen: "2024-03-10",
          lastSeen: "2025-06-05",
          daysInShop: 88,
          stints: 13,
          daysAway: 531
        },
        {
          id: "JBSID_DB_ShopSm_01",
          name: "Durrr Burger Takeout Counter",
          type: "Build",
          category: "Builds",
          rarity: null,
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbsid_db_shopsm_01/small.png",
          firstSeen: "2024-03-10",
          lastSeen: "2025-06-05",
          daysInShop: 88,
          stints: 13,
          daysAway: 531
        }
      ]
    },
    {
      label: "Decor Bundles",
      total: 26,
      items: [
        {
          id: "JBPID_LK_Keep",
          name: "Crucial Keep Accessories Decor",
          type: "Decor Bundle",
          category: "Decor Bundles",
          rarity: null,
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbpid_lk_keep/small.png",
          firstSeen: "2024-03-17",
          lastSeen: "2024-08-13",
          daysInShop: 55,
          stints: 8,
          daysAway: 827
        },
        {
          id: "JBPID_LK_DefWell",
          name: "Defender's Design Decor",
          type: "Decor Bundle",
          category: "Decor Bundles",
          rarity: null,
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbpid_lk_defwell/small.png",
          firstSeen: "2024-03-17",
          lastSeen: "2024-08-13",
          daysInShop: 55,
          stints: 8,
          daysAway: 827
        },
        {
          id: "JBPID_LK_DefFlags",
          name: "Knightly Banners Decor",
          type: "Decor Bundle",
          category: "Decor Bundles",
          rarity: null,
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbpid_lk_defflags/small.png",
          firstSeen: "2024-03-17",
          lastSeen: "2024-08-13",
          daysInShop: 55,
          stints: 8,
          daysAway: 827
        },
        {
          id: "JBPID_LK_Def",
          name: "Protector's Decor",
          type: "Decor Bundle",
          category: "Decor Bundles",
          rarity: null,
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbpid_lk_def/small.png",
          firstSeen: "2024-03-17",
          lastSeen: "2024-08-13",
          daysInShop: 55,
          stints: 8,
          daysAway: 827
        },
        {
          id: "JBPID_PT_CaptainsCabin",
          name: "Captain's Cabin Bundle",
          type: "Decor Bundle",
          category: "Decor Bundles",
          rarity: null,
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbpid_pt_captainscabin/small.png",
          firstSeen: "2024-08-06",
          lastSeen: "2024-09-03",
          daysInShop: 15,
          stints: 2,
          daysAway: 806
        },
        {
          id: "JBPID_PT_SeaportStyle",
          name: "Seaport Style Bundle",
          type: "Decor Bundle",
          category: "Decor Bundles",
          rarity: null,
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbpid_pt_seaportstyle/small.png",
          firstSeen: "2024-08-06",
          lastSeen: "2024-09-03",
          daysInShop: 15,
          stints: 2,
          daysAway: 806
        },
        {
          id: "JBPID_COL_WeaponXBedroom",
          name: "Weapon X Bedroom",
          type: "Decor Bundle",
          category: "Decor Bundles",
          rarity: null,
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbpid_col_weaponxbedroom/small.png",
          firstSeen: "2024-09-21",
          lastSeen: "2024-10-04",
          daysInShop: 14,
          stints: 1,
          daysAway: 775
        },
        {
          id: "JBPID_COL_WeaponXLaboratory",
          name: "Weapon X Laboratory",
          type: "Decor Bundle",
          category: "Decor Bundles",
          rarity: null,
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbpid_col_weaponxlaboratory/small.png",
          firstSeen: "2024-09-21",
          lastSeen: "2024-10-04",
          daysInShop: 14,
          stints: 1,
          daysAway: 775
        },
        {
          id: "JBPID_COL_WeaponXLaboratoryBroken",
          name: "Weapon X Laboratory - Broken",
          type: "Decor Bundle",
          category: "Decor Bundles",
          rarity: null,
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbpid_col_weaponxlaboratorybroken/small.png",
          firstSeen: "2024-09-21",
          lastSeen: "2024-10-04",
          daysInShop: 14,
          stints: 1,
          daysAway: 775
        },
        {
          id: "JBPID_BBS_BattleBusBedroom",
          name: "Battle Bus Bedroom",
          type: "Decor Bundle",
          category: "Decor Bundles",
          rarity: null,
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbpid_bbs_battlebusbedroom/small.png",
          firstSeen: "2024-10-02",
          lastSeen: "2024-10-11",
          daysInShop: 10,
          stints: 1,
          daysAway: 768
        },
        {
          id: "JBPID_BBS_BattleBusBreakroom",
          name: "Battle Bus Breakroom",
          type: "Decor Bundle",
          category: "Decor Bundles",
          rarity: null,
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbpid_bbs_battlebusbreakroom/small.png",
          firstSeen: "2024-10-02",
          lastSeen: "2024-10-11",
          daysInShop: 10,
          stints: 1,
          daysAway: 768
        },
        {
          id: "JBPID_LK_Workshop",
          name: "Knight's Workshop Decor",
          type: "Decor Bundle",
          category: "Decor Bundles",
          rarity: null,
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbpid_lk_workshop/small.png",
          firstSeen: "2024-03-17",
          lastSeen: "2025-03-19",
          daysInShop: 69,
          stints: 10,
          daysAway: 609
        },
        {
          id: "JBPID_LK_WizardTower",
          name: "Mage's Choice Decor",
          type: "Decor Bundle",
          category: "Decor Bundles",
          rarity: null,
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbpid_lk_wizardtower/small.png",
          firstSeen: "2024-03-17",
          lastSeen: "2025-03-19",
          daysInShop: 69,
          stints: 10,
          daysAway: 609
        },
        {
          id: "JBPID_NPB_Essentials",
          name: "Daily Bugle Essentials",
          type: "Decor Bundle",
          category: "Decor Bundles",
          rarity: null,
          series: "MARVEL SERIES",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbpid_npb_essentials/small.png",
          firstSeen: "2024-09-21",
          lastSeen: "2025-03-26",
          daysInShop: 28,
          stints: 3,
          daysAway: 602
        },
        {
          id: "JBPID_NPB_AssistantsOffice",
          name: "Editorial Assistant",
          type: "Decor Bundle",
          category: "Decor Bundles",
          rarity: null,
          series: "MARVEL SERIES",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbpid_npb_assistantsoffice/small.png",
          firstSeen: "2024-09-21",
          lastSeen: "2025-03-26",
          daysInShop: 28,
          stints: 3,
          daysAway: 602
        },
        {
          id: "JBPID_NYA_FriendlyNeighborhoodBodega",
          name: "Friendly Neighborhood Bodega",
          type: "Decor Bundle",
          category: "Decor Bundles",
          rarity: null,
          series: "MARVEL SERIES",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbpid_nya_friendlyneighborhoodbodega/small.png",
          firstSeen: "2024-09-21",
          lastSeen: "2025-03-26",
          daysInShop: 28,
          stints: 3,
          daysAway: 602
        },
        {
          id: "JBPID_NYA_FriendlyNeighborhoodEssentials",
          name: "Friendly Neighborhood Essentials",
          type: "Decor Bundle",
          category: "Decor Bundles",
          rarity: null,
          series: "MARVEL SERIES",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbpid_nya_friendlyneighborhoodessentials/small.png",
          firstSeen: "2024-09-21",
          lastSeen: "2025-03-26",
          daysInShop: 28,
          stints: 3,
          daysAway: 602
        },
        {
          id: "JBPID_NPB_JamesonsOffice",
          name: "J. Jonah Jameson",
          type: "Decor Bundle",
          category: "Decor Bundles",
          rarity: null,
          series: "MARVEL SERIES",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbpid_npb_jamesonsoffice/small.png",
          firstSeen: "2024-09-21",
          lastSeen: "2025-03-26",
          daysInShop: 28,
          stints: 3,
          daysAway: 602
        },
        {
          id: "JBPID_NPB_Mailroom",
          name: "Mail Call",
          type: "Decor Bundle",
          category: "Decor Bundles",
          rarity: null,
          series: "MARVEL SERIES",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbpid_npb_mailroom/small.png",
          firstSeen: "2024-09-21",
          lastSeen: "2025-03-26",
          daysInShop: 28,
          stints: 3,
          daysAway: 602
        },
        {
          id: "JBPID_NYA_SpiderDen",
          name: "Spider-Den",
          type: "Decor Bundle",
          category: "Decor Bundles",
          rarity: null,
          series: "MARVEL SERIES",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbpid_nya_spiderden/small.png",
          firstSeen: "2024-09-21",
          lastSeen: "2025-03-26",
          daysInShop: 28,
          stints: 3,
          daysAway: 602
        },
        {
          id: "JBPID_NYA_SpideyInTheCity",
          name: "Spidey in the City",
          type: "Decor Bundle",
          category: "Decor Bundles",
          rarity: null,
          series: "MARVEL SERIES",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbpid_nya_spideyinthecity/small.png",
          firstSeen: "2024-09-21",
          lastSeen: "2025-03-26",
          daysInShop: 28,
          stints: 3,
          daysAway: 602
        },
        {
          id: "JBPID_NPB_Lobby",
          name: "Where News Is Made",
          type: "Decor Bundle",
          category: "Decor Bundles",
          rarity: null,
          series: "MARVEL SERIES",
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbpid_npb_lobby/small.png",
          firstSeen: "2024-09-21",
          lastSeen: "2025-03-26",
          daysInShop: 28,
          stints: 3,
          daysAway: 602
        },
        {
          id: "JBPID_DB_Restaurant",
          name: "Durrr Dining Decor",
          type: "Decor Bundle",
          category: "Decor Bundles",
          rarity: null,
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbpid_db_restaurant/small.png",
          firstSeen: "2024-03-10",
          lastSeen: "2025-06-05",
          daysInShop: 88,
          stints: 13,
          daysAway: 531
        },
        {
          id: "JBPID_DB_Kitchen",
          name: "Durrr Kitchen Decor",
          type: "Decor Bundle",
          category: "Decor Bundles",
          rarity: null,
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbpid_db_kitchen/small.png",
          firstSeen: "2024-03-10",
          lastSeen: "2025-06-05",
          daysInShop: 88,
          stints: 13,
          daysAway: 531
        },
        {
          id: "JBPID_DB_Outdoor",
          name: "Durrr Patio Decor",
          type: "Decor Bundle",
          category: "Decor Bundles",
          rarity: null,
          series: null,
          set: null,
          image: "https://fortnite-api.com/images/cosmetics/legokits/jbpid_db_outdoor/small.png",
          firstSeen: "2024-03-10",
          lastSeen: "2025-06-05",
          daysInShop: 88,
          stints: 13,
          daysAway: 531
        }
      ]
    }
  ],
  today: [
    {
      id: "Pickaxe_ID_375_AgentXFemale1H",
      name: "Volt Batons",
      type: "Pickaxe",
      category: "Pickaxes",
      rarity: "Rare",
      image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_375_agentxfemale1h/smallicon.png",
      isNew: false,
      lastSeenBefore: "2024-09-22",
      daysAway: 787,
      stints: 16,
      rare: true
    },
    {
      id: "Character_PreppyBeret",
      name: "Siena Nyte",
      type: "Outfit",
      category: "Outfits",
      rarity: "Epic",
      image: "https://fortnite-api.com/images/cosmetics/br/character_preppyberet/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-01-02",
      daysAway: 320,
      stints: 4,
      rare: false
    },
    {
      id: "CarBody_Arrow",
      name: "McLaren P1",
      type: "Body",
      category: "Cars",
      rarity: "Uncommon",
      image: "https://fortnite-api.com/images/cosmetics/cars/carbody_arrow/small.png",
      isNew: false,
      lastSeenBefore: "2026-02-15",
      daysAway: 276,
      stints: 2,
      rare: false
    },
    {
      id: "CarSkin_ArrowLivery01",
      name: "Fearless",
      type: "Skin",
      category: "Decals",
      rarity: "Uncommon",
      image: "https://fortnite-api.com/images/cosmetics/cars/carskin_arrowlivery01/small.png",
      isNew: false,
      lastSeenBefore: "2026-02-15",
      daysAway: 276,
      stints: 2,
      rare: false
    },
    {
      id: "CarSkin_ArrowFlames",
      name: "Flames",
      type: "Skin",
      category: "Decals",
      rarity: "Uncommon",
      image: "https://fortnite-api.com/images/cosmetics/cars/carskin_arrowflames/small.png",
      isNew: false,
      lastSeenBefore: "2026-02-15",
      daysAway: 276,
      stints: 2,
      rare: false
    },
    {
      id: "CarSkin_ArrowStripes",
      name: "Stripes",
      type: "Skin",
      category: "Decals",
      rarity: "Uncommon",
      image: "https://fortnite-api.com/images/cosmetics/cars/carskin_arrowstripes/small.png",
      isNew: false,
      lastSeenBefore: "2026-02-15",
      daysAway: 276,
      stints: 2,
      rare: false
    },
    {
      id: "Wheel_Arrow",
      name: "McLaren P1",
      type: "Wheel",
      category: "Wheels",
      rarity: "Uncommon",
      image: "https://fortnite-api.com/images/cosmetics/cars/wheel_arrow/small.png",
      isNew: false,
      lastSeenBefore: "2026-02-15",
      daysAway: 276,
      stints: 2,
      rare: false
    },
    {
      id: "CID_727_Athena_Commando_M_Tailor",
      name: "Tailor",
      type: "Outfit",
      category: "Outfits",
      rarity: "Epic",
      image: "https://fortnite-api.com/images/cosmetics/br/cid_727_athena_commando_m_tailor/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-03-20",
      daysAway: 243,
      stints: 9,
      rare: false
    },
    {
      id: "BID_502_Tailor",
      name: "Back Stitch",
      type: "Back Bling",
      category: "Back Blings",
      rarity: "Epic",
      image: "https://fortnite-api.com/images/cosmetics/br/bid_502_tailor/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-03-20",
      daysAway: 243,
      stints: 8,
      rare: false
    },
    {
      id: "Pickaxe_ID_172_BandageNinja",
      name: "Quickstrike",
      type: "Pickaxe",
      category: "Pickaxes",
      rarity: "Uncommon",
      image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_172_bandageninja/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-05-01",
      daysAway: 201,
      stints: 52,
      rare: false
    },
    {
      id: "Pickaxe_ID_219_BandageNinja1H",
      name: "Talons",
      type: "Pickaxe",
      category: "Pickaxes",
      rarity: "Rare",
      image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_219_bandageninja1h/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-05-01",
      daysAway: 201,
      stints: 56,
      rare: false
    },
    {
      id: "CarBody_Pickle",
      name: "Void Burn",
      type: "Body",
      category: "Cars",
      rarity: "Uncommon",
      image: "https://fortnite-api.com/images/cosmetics/cars/carbody_pickle/small.png",
      isNew: false,
      lastSeenBefore: "2026-05-05",
      daysAway: 197,
      stints: 6,
      rare: false
    },
    {
      id: "CarSkin_PickleFlames",
      name: "Flames",
      type: "Skin",
      category: "Decals",
      rarity: "Common",
      image: "https://fortnite-api.com/images/cosmetics/cars/carskin_pickleflames/small.png",
      isNew: false,
      lastSeenBefore: "2026-05-05",
      daysAway: 197,
      stints: 6,
      rare: false
    },
    {
      id: "CarSkin_PickleLightning",
      name: "Lightning",
      type: "Skin",
      category: "Decals",
      rarity: "Common",
      image: "https://fortnite-api.com/images/cosmetics/cars/carskin_picklelightning/small.png",
      isNew: false,
      lastSeenBefore: "2026-05-05",
      daysAway: 197,
      stints: 6,
      rare: false
    },
    {
      id: "CarSkin_PickleLivery1",
      name: "Cadet's Kanji",
      type: "Skin",
      category: "Decals",
      rarity: "Common",
      image: "https://fortnite-api.com/images/cosmetics/cars/carskin_picklelivery1/small.png",
      isNew: false,
      lastSeenBefore: "2026-05-05",
      daysAway: 197,
      stints: 6,
      rare: false
    },
    {
      id: "CarSkin_PickleLivery2",
      name: "Void Mask",
      type: "Skin",
      category: "Decals",
      rarity: "Common",
      image: "https://fortnite-api.com/images/cosmetics/cars/carskin_picklelivery2/small.png",
      isNew: false,
      lastSeenBefore: "2026-05-05",
      daysAway: 197,
      stints: 6,
      rare: false
    },
    {
      id: "CarSkin_PickleStripes",
      name: "Stripes",
      type: "Skin",
      category: "Decals",
      rarity: "Common",
      image: "https://fortnite-api.com/images/cosmetics/cars/carskin_picklestripes/small.png",
      isNew: false,
      lastSeenBefore: "2026-05-05",
      daysAway: 197,
      stints: 6,
      rare: false
    },
    {
      id: "CarSkin_PickleWings",
      name: "Wings",
      type: "Skin",
      category: "Decals",
      rarity: "Common",
      image: "https://fortnite-api.com/images/cosmetics/cars/carskin_picklewings/small.png",
      isNew: false,
      lastSeenBefore: "2026-05-05",
      daysAway: 197,
      stints: 6,
      rare: false
    },
    {
      id: "Wheel_Pickle",
      name: "Void Gold",
      type: "Wheel",
      category: "Wheels",
      rarity: "Uncommon",
      image: "https://fortnite-api.com/images/cosmetics/cars/wheel_pickle/small.png",
      isNew: false,
      lastSeenBefore: "2026-05-05",
      daysAway: 197,
      stints: 6,
      rare: false
    },
    {
      id: "Wheel_Pickle2",
      name: "ROY G BUFFY",
      type: "Wheel",
      category: "Wheels",
      rarity: "Uncommon",
      image: "https://fortnite-api.com/images/cosmetics/cars/wheel_pickle2/small.png",
      isNew: false,
      lastSeenBefore: "2026-05-05",
      daysAway: 197,
      stints: 6,
      rare: false
    },
    {
      id: "Wheel_Pickle3",
      name: "Void BUFFY",
      type: "Wheel",
      category: "Wheels",
      rarity: "Uncommon",
      image: "https://fortnite-api.com/images/cosmetics/cars/wheel_pickle3/small.png",
      isNew: false,
      lastSeenBefore: "2026-05-05",
      daysAway: 197,
      stints: 6,
      rare: false
    },
    {
      id: "Glider_ID_133_BandageNinja",
      name: "Falcon",
      type: "Glider",
      category: "Gliders",
      rarity: "Legendary",
      image: "https://fortnite-api.com/images/cosmetics/br/glider_id_133_bandageninja/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-06-04",
      daysAway: 167,
      stints: 63,
      rare: false
    },
    {
      id: "CID_361_Athena_Commando_M_BandageNinja",
      name: "Kenji",
      type: "Outfit",
      category: "Outfits",
      rarity: "Epic",
      image: "https://fortnite-api.com/images/cosmetics/br/cid_361_athena_commando_m_bandageninja/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-06-15",
      daysAway: 156,
      stints: 61,
      rare: false
    },
    {
      id: "BID_225_BandageNinjaMale",
      name: "Katana & Kunai",
      type: "Back Bling",
      category: "Back Blings",
      rarity: "Epic",
      image: "https://fortnite-api.com/images/cosmetics/br/bid_225_bandageninjamale/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-06-15",
      daysAway: 156,
      stints: 49,
      rare: false
    },
    {
      id: "CID_362_Athena_Commando_F_BandageNinja",
      name: "Kuno",
      type: "Outfit",
      category: "Outfits",
      rarity: "Epic",
      image: "https://fortnite-api.com/images/cosmetics/br/cid_362_athena_commando_f_bandageninja/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-07",
      daysAway: 72,
      stints: 68,
      rare: false
    },
    {
      id: "BID_226_BandageNinjaFemale",
      name: "Dual Kama",
      type: "Back Bling",
      category: "Back Blings",
      rarity: "Epic",
      image: "https://fortnite-api.com/images/cosmetics/br/bid_226_bandageninjafemale/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-07",
      daysAway: 72,
      stints: 56,
      rare: false
    },
    {
      id: "Pickaxe_ID_705_HeadbandSMale1H",
      name: "Snake Sword",
      type: "Pickaxe",
      category: "Pickaxes",
      rarity: "Epic",
      image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_705_headbandsmale1h/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 10,
      rare: false
    },
    {
      id: "BID_904_HeadbandSMale",
      name: "Demon Wind Shuriken",
      type: "Back Bling",
      category: "Back Blings",
      rarity: "Epic",
      image: "https://fortnite-api.com/images/cosmetics/br/bid_904_headbandsmale/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 10,
      rare: false
    },
    {
      id: "Pickaxe_ID_704_HeadbandKMale1H",
      name: "Black Ops Sword",
      type: "Pickaxe",
      category: "Pickaxes",
      rarity: "Uncommon",
      image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_704_headbandkmale1h/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 10,
      rare: false
    },
    {
      id: "Wrap_495_Ensemble",
      name: "Akatsuki",
      type: "Wrap",
      category: "Wraps",
      rarity: "Uncommon",
      image: "https://fortnite-api.com/images/cosmetics/br/wrap_495_ensemble/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 7,
      rare: false
    },
    {
      id: "CID_A_263_Athena_Commando_M_HeadbandS",
      name: "Sasuke Uchiha",
      type: "Outfit",
      category: "Outfits",
      rarity: "Epic",
      image: "https://fortnite-api.com/images/cosmetics/br/cid_a_263_athena_commando_m_headbands/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 10,
      rare: false
    },
    {
      id: "BID_A_031_EnsembleFemale",
      name: "Hinata's Backpack",
      type: "Back Bling",
      category: "Back Blings",
      rarity: "Epic",
      image: "https://fortnite-api.com/images/cosmetics/br/bid_a_031_ensemblefemale/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 8,
      rare: false
    },
    {
      id: "EID_Headband",
      name: "Summoning Jutsu",
      type: "Emote",
      category: "Emotes",
      rarity: "Uncommon",
      image: "https://fortnite-api.com/images/cosmetics/br/eid_headband/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 10,
      rare: false
    },
    {
      id: "EID_Chashu",
      name: "Ramen Break",
      type: "Emote",
      category: "Emotes",
      rarity: "Uncommon",
      image: "https://fortnite-api.com/images/cosmetics/br/eid_chashu/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 10,
      rare: false
    },
    {
      id: "Pickaxe_ID_703_HeadbandMale1H",
      name: "Kunai",
      type: "Pickaxe",
      category: "Pickaxes",
      rarity: "Uncommon",
      image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_703_headbandmale1h/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 10,
      rare: false
    },
    {
      id: "Pickaxe_ID_706_HeadbandStandAloneMale",
      name: "Hidan's Scythe",
      type: "Pickaxe",
      category: "Pickaxes",
      rarity: "Rare",
      image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_706_headbandstandalonemale/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 10,
      rare: false
    },
    {
      id: "CID_A_264_Athena_Commando_F_HeadbandS",
      name: "Sakura Haruno",
      type: "Outfit",
      category: "Outfits",
      rarity: "Epic",
      image: "https://fortnite-api.com/images/cosmetics/br/cid_a_264_athena_commando_f_headbands/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 10,
      rare: false
    },
    {
      id: "BID_905_HeadbandSFemale",
      name: "Hidden Leaf Cloak",
      type: "Back Bling",
      category: "Back Blings",
      rarity: "Epic",
      image: "https://fortnite-api.com/images/cosmetics/br/bid_905_headbandsfemale/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 10,
      rare: false
    },
    {
      id: "Glider_ID_326_HeadbandMale",
      name: "Kurama",
      type: "Glider",
      category: "Gliders",
      rarity: "Epic",
      image: "https://fortnite-api.com/images/cosmetics/br/glider_id_326_headbandmale/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 10,
      rare: false
    },
    {
      id: "LSID_371_Headband_BB",
      name: "Shinobi Teamwork",
      type: "Loading Screen",
      category: "Loading Screens",
      rarity: "Uncommon",
      image: "https://fortnite-api.com/images/cosmetics/br/lsid_371_headband_bb/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 10,
      rare: false
    },
    {
      id: "LSID_369_Headband",
      name: "Team 7",
      type: "Loading Screen",
      category: "Loading Screens",
      rarity: "Uncommon",
      image: "https://fortnite-api.com/images/cosmetics/br/lsid_369_headband/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 10,
      rare: false
    },
    {
      id: "Glider_ID_378_EnsembleSnakeMale",
      name: "Manda",
      type: "Glider",
      category: "Gliders",
      rarity: "Epic",
      image: "https://fortnite-api.com/images/cosmetics/br/glider_id_378_ensemblesnakemale/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 8,
      rare: false
    },
    {
      id: "CID_A_262_Athena_Commando_M_HeadbandK",
      name: "Kakashi Hatake",
      type: "Outfit",
      category: "Outfits",
      rarity: "Epic",
      image: "https://fortnite-api.com/images/cosmetics/br/cid_a_262_athena_commando_m_headbandk/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 10,
      rare: false
    },
    {
      id: "BID_903_HeadbandKMale",
      name: "Pakkun",
      type: "Back Bling",
      category: "Back Blings",
      rarity: "Epic",
      image: "https://fortnite-api.com/images/cosmetics/br/bid_903_headbandkmale/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 10,
      rare: false
    },
    {
      id: "Glider_ID_377_EnsembleMaroonMale",
      name: "Gaara's Sand Cloud",
      type: "Glider",
      category: "Gliders",
      rarity: "Epic",
      image: "https://fortnite-api.com/images/cosmetics/br/glider_id_377_ensemblemaroonmale/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 8,
      rare: false
    },
    {
      id: "CID_A_261_Athena_Commando_M_Headband",
      name: "Naruto Uzumaki",
      type: "Outfit",
      category: "Outfits",
      rarity: "Epic",
      image: "https://fortnite-api.com/images/cosmetics/br/cid_a_261_athena_commando_m_headband/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 10,
      rare: false
    },
    {
      id: "BID_902_HeadbandMale",
      name: "Scroll",
      type: "Back Bling",
      category: "Back Blings",
      rarity: "Epic",
      image: "https://fortnite-api.com/images/cosmetics/br/bid_902_headbandmale/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 10,
      rare: false
    },
    {
      id: "Pickaxe_ID_822_EnsembleSnakeMale",
      name: "Sword of Kusanagi",
      type: "Pickaxe",
      category: "Pickaxes",
      rarity: "Rare",
      image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_822_ensemblesnakemale/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 8,
      rare: false
    },
    {
      id: "CID_A_432_Athena_Commando_M_Ensemble",
      name: "Itachi Uchiha",
      type: "Outfit",
      category: "Outfits",
      rarity: "Epic",
      image: "https://fortnite-api.com/images/cosmetics/br/cid_a_432_athena_commando_m_ensemble/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 8,
      rare: false
    },
    {
      id: "BID_A_030_EnsembleMaskMale",
      name: "Black Ops Mask",
      type: "Back Bling",
      category: "Back Blings",
      rarity: "Epic",
      image: "https://fortnite-api.com/images/cosmetics/br/bid_a_030_ensemblemaskmale/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 8,
      rare: false
    },
    {
      id: "BID_A_032_EnsembleMaroonMale",
      name: "Sand Gourd",
      type: "Back Bling",
      category: "Back Blings",
      rarity: "Epic",
      image: "https://fortnite-api.com/images/cosmetics/br/bid_a_032_ensemblemaroonmale/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 8,
      rare: false
    },
    {
      id: "EID_Spiral",
      name: "Rasenshuriken",
      type: "Emote",
      category: "Emotes",
      rarity: "Rare",
      image: "https://fortnite-api.com/images/cosmetics/br/eid_spiral/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 8,
      rare: false
    },
    {
      id: "LSID_370_HeadbandPizza",
      name: "Pizza Eating Jutsu",
      type: "Loading Screen",
      category: "Loading Screens",
      rarity: "Uncommon",
      image: "https://fortnite-api.com/images/cosmetics/br/lsid_370_headbandpizza/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 10,
      rare: false
    },
    {
      id: "CID_A_433_Athena_Commando_M_EnsembleSnake",
      name: "Orochimaru",
      type: "Outfit",
      category: "Outfits",
      rarity: "Epic",
      image: "https://fortnite-api.com/images/cosmetics/br/cid_a_433_athena_commando_m_ensemblesnake/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 8,
      rare: false
    },
    {
      id: "CID_A_434_Athena_Commando_M_EnsembleMaroon",
      name: "Gaara",
      type: "Outfit",
      category: "Outfits",
      rarity: "Epic",
      image: "https://fortnite-api.com/images/cosmetics/br/cid_a_434_athena_commando_m_ensemblemaroon/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 8,
      rare: false
    },
    {
      id: "Pickaxe_ID_821_EnsembleFemale",
      name: "Minato's Kunai",
      type: "Pickaxe",
      category: "Pickaxes",
      rarity: "Uncommon",
      image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_821_ensemblefemale/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 8,
      rare: false
    },
    {
      id: "CID_A_435_Athena_Commando_F_Ensemble",
      name: "Hinata Hyuga",
      type: "Outfit",
      category: "Outfits",
      rarity: "Epic",
      image: "https://fortnite-api.com/images/cosmetics/br/cid_a_435_athena_commando_f_ensemble/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 8,
      rare: false
    },
    {
      id: "LSID_457_Ensemble_Characters",
      name: "Shinobi Lineup",
      type: "Loading Screen",
      category: "Loading Screens",
      rarity: "Uncommon",
      image: "https://fortnite-api.com/images/cosmetics/br/lsid_457_ensemble_characters/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 8,
      rare: false
    },
    {
      id: "LSID_456_Ensemble_BusGroup",
      name: "Islandbound Ninja",
      type: "Loading Screen",
      category: "Loading Screens",
      rarity: "Uncommon",
      image: "https://fortnite-api.com/images/cosmetics/br/lsid_456_ensemble_busgroup/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-10",
      daysAway: 69,
      stints: 8,
      rare: false
    },
    {
      id: "BID_944_Sleek_7PFGZ",
      name: "Sound Scepter",
      type: "Back Bling",
      category: "Back Blings",
      rarity: "Icon Series",
      image: "https://fortnite-api.com/images/cosmetics/br/bid_944_sleek_7pfgz/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-30",
      daysAway: 49,
      stints: 7,
      rare: false
    },
    {
      id: "Pickaxe_ID_745_SleekMale_ECRL0",
      name: "Sound Scepter",
      type: "Pickaxe",
      category: "Pickaxes",
      rarity: "Icon Series",
      image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_745_sleekmale_ecrl0/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-30",
      daysAway: 49,
      stints: 7,
      rare: false
    },
    {
      id: "Sparks_Mic_Sleek",
      name: "Sound Scepter",
      type: "Microphone",
      category: "Microphones",
      rarity: "Icon Series",
      image: "https://fortnite-api.com/images/cosmetics/instruments/sparks_mic_sleek/small.png",
      isNew: false,
      lastSeenBefore: "2026-09-30",
      daysAway: 49,
      stints: 3,
      rare: false
    },
    {
      id: "sid_placeholder_70",
      name: "24K Magic",
      type: "Jam Track",
      category: "Jam Tracks",
      rarity: null,
      image: "https://cdn.fortnite-api.com/tracks/e84a64be9c6fe04d.jpg",
      isNew: false,
      lastSeenBefore: "2026-09-30",
      daysAway: 49,
      stints: 13,
      rare: false
    },
    {
      id: "CID_A_334_Athena_Commando_M_Sleek_U06KF",
      name: "Bruno Mars",
      type: "Outfit",
      category: "Outfits",
      rarity: "Icon Series",
      image: "https://fortnite-api.com/images/cosmetics/br/cid_a_334_athena_commando_m_sleek_u06kf/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-09-30",
      daysAway: 49,
      stints: 7,
      rare: false
    },
    {
      id: "sid_placeholder_172",
      name: "That's What I Like",
      type: "Jam Track",
      category: "Jam Tracks",
      rarity: null,
      image: "https://cdn.fortnite-api.com/tracks/6454bece3ef3cabb.jpg",
      isNew: false,
      lastSeenBefore: "2026-10-08",
      daysAway: 41,
      stints: 5,
      rare: false
    },
    {
      id: "Pickaxe_ID_083_Exercise",
      name: "Axercise",
      type: "Pickaxe",
      category: "Pickaxes",
      rarity: "Uncommon",
      image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_083_exercise/smallicon.png",
      isNew: false,
      lastSeenBefore: "2026-10-24",
      daysAway: 25,
      stints: 15,
      rare: false
    }
  ]
};

// worker/worker.js
var memoryStore = /* @__PURE__ */ new Map();
var PLAYER_ROUTES = /* @__PURE__ */ new Set(["stats", "career", "treasure", "plan"]);
var DEFAULT_LIMIT = 30;
var limiter = null;
function kvStore(kv) {
  return { get: (k) => kv.get(k), set: (k, v) => kv.put(k, v, { expirationTtl: 3600 }) };
}
function json(data, status, cors, { maxAge = 0, extra = {} } = {}) {
  return new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": maxAge ? `public, max-age=${maxAge}` : "no-store",
      "X-Content-Type-Options": "nosniff",
      ...cors,
      ...extra
    }
  });
}
function errorResponse(err, cors) {
  if (err instanceof FortniteKitError) {
    const friendly = {
      400: "Bad request. Check the player name and options.",
      403: "This player has private stats, or the API key is wrong.",
      404: "Player not found, or no stats for this time window.",
      429: "Too many requests. Wait and try again."
    }[err.status];
    return json({ error: friendly ?? err.message, status: err.status, source: err.source }, err.status || 502, cors);
  }
  return json({ error: err.message ?? "Server error" }, 500, cors);
}
async function handle(request, env = {}, { fetch: f, rateLimiter } = {}) {
  const cors = corsHeaders(request, env);
  if (request.method === "OPTIONS") return json({}, 204, cors);
  if (request.method !== "GET") return json({ error: "GET only" }, 405, cors);
  const url = new URL(request.url);
  const q = url.searchParams;
  if (url.pathname === "/" || url.pathname === "/index.html") {
    return new Response(page_generated_default, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer"
      }
    });
  }
  let parts;
  try {
    parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/").map(decodeURIComponent);
  } catch {
    return json({ error: "Bad path" }, 400, cors);
  }
  if (parts[0] !== "api") return json({ error: "Not found" }, 404, cors);
  const [, route, a, b, c] = parts;
  if (!fetchSiteAllowed(request, env)) {
    return json({ error: "This API only serves the Loot Terminal page." }, 403, cors);
  }
  if (PLAYER_ROUTES.has(route)) {
    if (!validName(a ?? "")) return json({ error: "Bad player name.", status: 400 }, 400, cors);
    limiter = rateLimiter ?? limiter ?? createRateLimiter({ limit: +env.RATE_LIMIT || DEFAULT_LIMIT, windowMs: 5 * 6e4 });
    const ip = request.headers.get("CF-Connecting-IP") ?? "local";
    const r = limiter.hit(ip);
    if (!r.ok) {
      return json({ error: `Too many lookups. Wait ${r.retryAfter} s.`, status: 429 }, 429, cors, { extra: { "Retry-After": String(r.retryAfter) } });
    }
  }
  const kit = createFortniteKit({
    fortniteApiComKey: env.FORTNITE_API_COM_KEY,
    fortniteApiIoKey: env.FORTNITE_API_IO_KEY,
    event: treasure_hunters_2026_default,
    cacheStore: env.FN_CACHE ? kvStore(env.FN_CACHE) : memoryStore,
    fetch: f
  });
  const cpm = (v) => v == null ? void 0 : Number.isFinite(+v) ? +v : v;
  const num = (v) => v == null ? void 0 : +v;
  const chestOpts = () => ({ chestsPerMatch: cpm(q.get("chestsPerMatch")), chestsPerMinute: num(q.get("chestsPerMinute")) });
  const acct = ["epic", "psn", "xbl"].includes(q.get("accountType")) ? q.get("accountType") : "epic";
  try {
    switch (route) {
      case "health":
        return json({ ok: true, version: package_default.version, event: treasure_hunters_2026_default.id, hasStatsKey: Boolean(env.FORTNITE_API_COM_KEY) }, 200, cors);
      case "stats":
        return json(await kit.stats(a, { timeWindow: q.get("window") === "lifetime" ? "lifetime" : "season", accountType: acct }), 200, cors);
      case "career":
        return json(await kit.career(a, { accountType: acct, withMatches: q.get("matches") === "1" }), 200, cors);
      case "treasure":
        return json(await kit.treasure(a, chestOpts()), 200, cors);
      case "plan": {
        const t = await kit.treasure(a, chestOpts());
        const plan = kit.plan({
          report: t,
          rewardId: q.get("reward") ?? void 0,
          plannedMatches: +(q.get("matches") ?? 0),
          plannedMinutes: +(q.get("minutes") ?? 0),
          treasureHourMatches: +(q.get("thMatches") ?? 0),
          treasureHourMinutes: +(q.get("thMinutes") ?? 0),
          treasureHour: q.has("th") ? +q.get("th") : null
        });
        return json({ player: t.player, ...plan }, 200, cors);
      }
      case "shop":
        return json(await kit.shop(), 200, cors, { maxAge: 600 });
      case "rarest":
        return json(rarest_default, 200, cors, { maxAge: 3600 });
      case "news":
        return json(await kit.news(["br", "stw", "creative"].includes(a) ? a : "br"), 200, cors, { maxAge: 600 });
      case "cosmetics":
        return json(await kit.newCosmetics(), 200, cors, { maxAge: 600 });
      case "map":
        return json(await kit.map(), 200, cors, { maxAge: 3600 });
      case "status":
        return json(await kit.serverStatus(), 200, cors, { maxAge: 60 });
      case "islands":
        if (!a) return json(await kit.islands({ size: Math.min(1e3, +(q.get("size") ?? 100) || 100), after: q.get("after") ?? void 0 }), 200, cors, { maxAge: 600 });
        if (b === "metrics") return json(await kit.islandMetrics(a, { interval: ["minute", "hour", "day"].includes(c) ? c : "day", from: q.get("from") ?? void 0, to: q.get("to") ?? void 0 }), 200, cors, { maxAge: 600 });
        return json(await kit.island(a), 200, cors, { maxAge: 600 });
      default:
        return json({ error: "Unknown route" }, 404, cors);
    }
  } catch (err) {
    return errorResponse(err, cors);
  }
}
var worker_default = { fetch: (request, env) => handle(request, env) };
export {
  worker_default as default,
  handle
};

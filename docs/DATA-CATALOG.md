# Fortnite data catalog

What data we can get, from where, and how. Checked November 2026.
Rule: put every key in the Worker. Never put a key in a public page.

## Quick map

| Need | Best source | Key? | Kit function |
|---|---|---|---|
| Player stats (season, lifetime) | fortnite-api.com | Yes (free) | `kit.stats()`, `kit.career()` |
| Stats by input (KBM, controller, touch) | fortnite-api.com | Yes (free) | `PlayerStats.byInput` |
| Battle Pass level | fortnite-api.com | Yes (free) | `PlayerStats.battlePass` |
| Build vs Zero Build, ranked matches | Epic raw keys via OliTracker | Unknown | `parseStatsProxy()` + `fromRawRows()` |
| Recent matches | fortniteapi.io | Yes | `fio.recentMatches()` |
| Account ID lookup | fortniteapi.io | Yes | `fio.lookup()` |
| Tournaments, event scores | fortniteapi.io | Yes | `fio.tournaments()` … |
| Item shop | fortnite-api.com | No | `kit.shop()` |
| News (BR, STW, Creative) | fortnite-api.com | No | `kit.news()` |
| Cosmetics (all, new, jam tracks, cars, LEGO) | fortnite-api.com | No | `fapi.cosmetics*()` |
| Current map + POIs | fortnite-api.com | No | `kit.map()` |
| Past maps, seasons, weapons, loot chances | fortniteapi.io | Yes | `fio.maps()`, `fio.lootChances()` |
| Island / game mode analytics | Epic Ecosystem API (official) | No | `kit.islands()`, `kit.islandMetrics()` |
| Server status, maintenance | status.epicgames.com | No | `kit.serverStatus()` |
| Drop odds for events | Epic posts (typed into `data/*.json`) | — | `treasureReport()` |

## 1. fortnite-api.com (community, free)

- Base: `https://fortnite-api.com`. Docs: https://dash.fortnite-api.com/endpoints
- Key: sign in at https://dash.fortnite-api.com/account (Discord). Header `Authorization: <GUID key>`.
- Stats: `GET /v2/stats/br/v2?name=&accountType=epic|psn|xbl&timeWindow=season|lifetime&image=none|all|keyboardMouse|gamepad|touch`
  and `GET /v2/stats/br/v2/{accountId}`.
- Stats response: `account {id,name}`, `battlePass {level,progress}`, `image`,
  `stats.{all|keyboardMouse|gamepad|touch}.{overall|solo|duo|trio|squad|ltm}` with
  `score, scorePerMin, scorePerMatch, wins, top3, top5, top6, top10, top12, top25, kills,
  killsPerMin, killsPerMatch, deaths, kd, matches, winRate, minutesPlayed, playersOutlived, lastModified`.
- Status codes: 200, 400, 403, 404. Expect 403 = private stats, 404 = not found (check on first live run).
- `trio` can come back `null`. Input groups can be `null` if the player never used that input.
- No Build / Zero Build split.
- Other endpoints (no key): `/v2/shop`, `/v2/news[/br|/stw|/creative]`, `/v2/cosmetics`,
  `/v2/cosmetics/br`, `/v2/cosmetics/new`, `/v2/cosmetics/br/{id}`, `/v2/cosmetics/br/search[/all|/ids]`,
  `/v2/cosmetics/cars|instruments|tracks|lego|lego/kits|beans`, `/v1/map`, `/v1/playlists[/{id}]`,
  `/v1/banners`, `/v1/banners/colors`, `/v2/creatorcode?name=`, `/v2/aes`.
- Endpoint list taken from the official JS wrapper `fnapicom` v2.2.0.

## 2. fortniteapi.io (community, free tier + paid)

- Base: `https://fortniteapi.io/v1`. Header `Authorization: <key>`.
- Accounts: `/lookup?username=`, `/lookupUsername?id=a,b`, `/stats?account=`, `/matches?account=`, `/stats/fish?accountId=`.
- Competitive: `/events/list`, `/events/window?windowId=&page=`, `/events/cumulative?eventId=`, `/events/replay?session=`.
- Game data: `/challenges`, `/battlepass`, `/achievements`, `/items/list|upcoming|get|sets`, `/bundles`,
  `/shop`, `/weapons/list`, `/loot/list|get|chances|fish`, `/maps/list`, `/maps/items/list`,
  `/seasons/list`, `/game/poi`, `/game/modes`, `/game/modes/data`, `/game/radios`, `/rarities`,
  `/news`, `/status`, `/creative/featured`, `/creative/island?code=`.
- List taken from npm `fortnite-api-io` v1.9.0. Some paths may be `/v2` now. Check the live docs.

## 3. Epic Fortnite Data API — "Ecosystem API" (official, no key)

- Base: `https://api.fortnite.com/ecosystem/v1`. Docs: Epic dev portal + Swagger at `/docs`.
- Island analytics only. **No player data.**
- `GET /islands?size=1..1000&after=<cursor>` → `{ data, meta.page.nextCursor }`
- `GET /islands/{code}` → `code, title, creatorCode, category, tags`
- `GET /islands/{code}/metrics/{minute|hour|day}?from=<ISO>&to=<ISO>`
  → `{ plays, uniquePlayers, peakCCU, minutesPlayed, averageMinutesPerPlayer, favorites, recommendations: [{value,timestamp}], retention: [{d1,d7,timestamp}] }`
- Only the last 7 days. `to` must not be in the future (round down to the hour).
- About 6 requests/second is safe. 8/s gives some 429 errors.
- Good for: "top islands" boards, a creator's island dashboard, trend charts.

## 4. status.epicgames.com (official, no key)

- Standard Statuspage JSON: `/api/v2/summary.json`, `/api/v2/incidents/unresolved.json`,
  `/api/v2/scheduled-maintenances/upcoming.json`.
- Good for: "Is Fortnite down?" and "new season downtime" banners.

## 5. Epic private APIs (reference only — how trackers work)

These need an Epic access token. Trackers use bot accounts with "device auth" credentials.
This uses Epic's game-client login outside the game, which Epic does not support for
third parties. The kit does not log in to Epic. Use OliTracker or fortnite-api.com instead.

- Stats: `GET https://statsproxy-public-service-live.ol.epicgames.com/statsproxy/api/statsv2/account/{accountId}?startTime=&endTime=`
  → raw keys like `br_placetop1_keyboardmouse_m0_playlist_nobuildbr_solo`. 204 = private stats.
  Parse with `parseStatsProxy()`.
- Ranked: `POST https://fn-service-habanero-live-public.ogs.live.on.epicgames.com/api/v1/games/fortnite/trackprogress/bulkByRankingType?rankingType=ranked-br`
  → `currentDivision, highestDivision, promotionProgress, currentPlayerRanking`.
- Tournaments: Epic Events Service (leaderboards, history).
- Full community docs: github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation and github.com/MixV2/EpicResearch.

## 6. OliTracker (FUNAGLET's source)

- Site: https://olitracker.com. API docs: https://olitracker.com/api/docs (JavaScript page).
- Has: current/past season stats, lifetime, wins/kills/ranked/streak leaderboards, replay
  parser, stream overlay, item shop, downtime checker.
- Endpoints, auth and reuse terms: **not read yet.** Open the docs page in Chrome to finish
  `src/sources/oliTracker.js`.

## Ideas for the stats interface

| Panel | Data |
|---|---|
| Player card | name, Battle Pass level, season matches/wins/K/D, stats card `image` |
| Career timeline | lifetime vs season `PlayerStats` |
| Mode breakdown | `byMode` solo/duo/trio/squad/ltm |
| Input breakdown | `byInput` KBM/controller/touch |
| Build vs Zero Build, ranked | `byBuild`, `ranked` (needs raw keys) |
| Recent matches | fortniteapi.io `/matches` |
| Treasure / drop odds | `treasureReport()`, `planTreasure()` |
| Shop, news, new cosmetics | fortnite-api.com feeds |
| Map | `/v1/map` image + POIs |
| Server status | status page summary |
| Island charts | Ecosystem metrics |

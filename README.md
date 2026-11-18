# fortnite-kit

A reusable Fortnite data engine. No interface. Build any Fortnite page on top of it.

- Gets player stats, career data, shop, news, cosmetics, map, server status and island analytics.
- Turns every source into one `PlayerStats` shape.
- Rebuilds the FUNAGLET treasure-odds engine (all numbers match their page), with a better default:
  chests = alive minutes played × 2 (one chest every 30 seconds).
- Has a Cloudflare Worker that hides your API keys and caches stats for 20 minutes.
- Zero dependencies. Runs in the browser, Node 18+ and Cloudflare Workers.

Read first: `docs/HOW-FUNAGLET-WORKS.md` (the reverse engineering) and `docs/DATA-CATALOG.md` (every data source).

## Files

| Path | What it does |
|---|---|
| `src/kit.js` | One entry point: `createFortniteKit()` → `stats`, `career`, `treasure`, `plan`, `shop`, `news`, `map`, `serverStatus`, `islands` |
| `src/sources/fortniteApiCom.js` | fortnite-api.com client (stats + content) |
| `src/sources/fortniteApiIo.js` | fortniteapi.io client (matches, tournaments, loot, maps) |
| `src/sources/epicEcosystem.js` | Epic official island analytics |
| `src/sources/epicStatus.js` | Epic server status |
| `src/sources/statsProxy.js` | Parser for Epic raw stats keys (Build/Zero Build/Ranked split) |
| `src/sources/oliTracker.js` | OliTracker adapter — **endpoints still to confirm** |
| `src/normalize.js` | Converts any source to `PlayerStats` |
| `src/odds.js` | Generic "1 in X" drop maths |
| `src/treasure.js` | Treasure report, weeks, planner, Treasure Hours |
| `src/cache.js` | TTL cache with refresh cooldown |
| `data/guide-treasure-hunters-2026.json` | LOOT > GUIDE text (edit to update the guide) |
| `data/treasure-hunters-2026.json` | Event odds, dates, multipliers, chest rate (2 per alive minute), presets |
| `worker/` | Cloudflare Worker proxy |
| `wrangler.toml` | Worker config (repo root, used by Workers Builds and `npx wrangler deploy`) |
| `ui/` | Loot Terminal page source (Phosphor design): `app.js`, `template.html`, `demo-data.js`, `build.mjs` |
| `dist/loot-terminal.html` | The built page (one file) |
| `dist/worker.js` | ONE paste-ready Worker file: API proxy + the page at `/` |
| `cli/demo.js` | Terminal demo |
| `test/` | 21 tests (run `npm test`; it builds first) |

## Quick start

1. Run the offline demo. No key needed.
   ```
   node cli/demo.js --cpm=funaglet
   ```
2. Get a free fortnite-api.com key: https://dash.fortnite-api.com/account
3. Run a live demo.
   ```
   FORTNITE_API_COM_KEY=<key> node cli/demo.js <EpicName> --live
   ```
4. Deploy the Worker (from the repo root).
   ```
   npx wrangler secret put FORTNITE_API_COM_KEY
   npx wrangler deploy
   ```
5. Call the Worker from any page (for example GitHub Pages).
   ```js
   const r = await fetch('https://fortnite-kit.<you>.workers.dev/api/career/LilAvlis');
   const career = await r.json();   // { account, battlePass, season, lifetime }
   ```

## Deploy with no command line (Cloudflare dashboard)

Do this on a computer. The page and the API then live at one address.

1. Open dash.cloudflare.com. Go to **Workers & Pages**.
2. Select **Create**, then create a Worker from the **Hello World** start. Name it `fortnite-kit`. Select **Deploy**.
3. Select **Edit code**. Delete all the code in the editor.
4. Open `dist/worker.js`. Copy all of it. Paste it into the editor. Select **Deploy**.
5. Go to the Worker's **Settings**, then **Variables and Secrets**. Select **Add variable**, set the type to **Secret** (not Text):
   name `FORTNITE_API_COM_KEY`, value = your fortnite-api.com key. Save and deploy.
6. Open `https://fortnite-kit.<your-subdomain>.workers.dev/`. The page shows **WORKER · AUTO**.
7. Type your Epic name. Select **SCAN**.

To update later: run `npm run build`, then paste the new `dist/worker.js` again.

### Auto-deploy from GitHub (Cloudflare Workers Builds)

Worker > Settings > Builds > Connect. Repo `WolfHarrold/Fortnite-Kit`, branch `main`.
Root directory: empty (repo root). Build command: `npm ci && npm run build`. Deploy command: `npx wrangler deploy`.
Every push to `main` then builds and deploys. The secret key stays in Cloudflare.

## Security

The `workers.dev` address is public. The Worker guards the API so others cannot easily spend your key:

1. No CORS. Other websites cannot read the API in a browser.
2. Browser calls from other sites (`Sec-Fetch-Site: cross-site`) are refused.
3. Bad player names are refused before any call to fortnite-api.com.
4. Each IP gets 30 player lookups per 5 minutes (`RATE_LIMIT` var to change it).
5. Private and not-found players are remembered for 10 minutes.
6. Stats are cached 20 minutes per player.

A script can fake browser headers, so this guard slows abuse but does not stop it. For a full lock, turn on
**Cloudflare Access** for the Worker (Worker > Settings > Domains & Routes > workers.dev, enable Access).
Then only emails you allow can open the page and the API. Access is free for up to 50 users.

To let a second site (for example GitHub Pages) use the API, set the var `ALLOWED_ORIGIN` to that site's address.

## Worker routes

| Route | Returns |
|---|---|
| `/api/stats/:name?window=season\|lifetime` | `PlayerStats` + cache info |
| `/api/career/:name` | season + lifetime |
| `/api/treasure/:name` | treasure report (alive minutes × 2). Options: `?chestsPerMinute=N` or `?chestsPerMatch=funaglet\|N` |
| `/api/plan/:name?reward=&matches=&minutes=&thMatches=&thMinutes=&th=` | planner result |
| `/api/shop`, `/api/news/:mode`, `/api/cosmetics/new`, `/api/map`, `/api/status` | content feeds |
| `/api/islands`, `/api/islands/:code`, `/api/islands/:code/metrics/:interval` | island analytics |

## Use it in code

```js
import { createFortniteKit } from './src/index.js';
import event from './data/treasure-hunters-2026.json' with { type: 'json' };

const kit = createFortniteKit({ fortniteApiComKey: process.env.FORTNITE_API_COM_KEY, event });
const career = await kit.career('LilAvlis');
const odds = await kit.treasure('LilAvlis');          // alive minutes x 2 chests per minute
const plan = kit.plan({ report: odds, plannedMinutes: 120, treasureHourMinutes: 60, treasureHour: 1 });
```

Pure maths, no network:

```js
import { chanceAtLeastOne, triesForChance } from './src/odds.js';
chanceAtLeastOne(137500, 17500);   // 0.1195
triesForChance(137500, 0.5);       // chests for a 50% chance
```

## New event or new reward

1. Copy `data/treasure-hunters-2026.json`.
2. Change `start`, `end`, `chestsPerMinute`, `rewards[].odds`, `scope` (`season` or `week`) and multipliers.
3. Pass the new file as `event`. No code change.

## Open items

1. **OliTracker:** read https://olitracker.com/api/docs in Chrome. Fill in `src/sources/oliTracker.js`.
   This gives the Build / Zero Build / Ranked split that FUNAGLET shows.
2. **First live run:** confirm fortnite-api.com status codes (403 private, 404 not found).
3. **fortniteapi.io:** confirm which endpoints moved to `/v2`.
4. **Week reset hour:** confirm the hour Epic rotates weekly rewards. Set `weekResetUtc`.

## Rules

- Never put an API key in a public page or in any file in this repo. Use a Cloudflare **Secret**.
- Cloudflare can show a box that says "Update your Wrangler configuration" with your key in it. Do not copy that into `wrangler.toml`. The repo can be public.
- Respect rate limits. Cache stats (20 min) and content (1 h).
- This is a fan project. It is not affiliated with Epic Games.

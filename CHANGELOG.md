# Changelog

## 0.6.0 — 18 Nov 2026
- STAT > SQUAD: squad leaderboard (up to 8 names, saved on the device). Rank by wins, K/D, win %, kills, time alive or matches. `src/squad.js` (`rankSquad`, `cleanSquadNames`).
- Stream overlay at `/overlay` (OBS Browser source): transparent Phosphor panel, options name, acct, theme, fields, refresh, scale, bg. Link builder with COPY in SYS > SETTINGS.
- Sub-tab row: safe centring and tighter spacing on narrow phones (first label no longer cut off).
- `docs/ROADMAP.md` with the agreed next steps and ideas.

## 0.5.1 — 18 Nov 2026
- Rarest job fixed: shop history needs `responseFlags=4`. First live run: 16,850 cosmetics, 26 categories.
- RARE details show the cosmetic SERIES (collab series such as Marvel or Icon).
- GUIDE: Power Hours pattern line and wiki sources.
- Checked against the Fortnite Wiki (18 Nov 2026 copy): days-away match (Fresh 2,919, Reflex 2,816). Most category counts match within a few items. Our Top 12 and Outfits include items the wiki puts in Limited Time Cosmetics or bundles (for example Mako, Codename E.L.F., Rogue Agent).

## 0.5.0 — 18 Nov 2026
- SHOP > RARE: rarest Item Shop cosmetics, Fortnite Wiki rules (500+ days away; Top 12 skips Back Blings bundled with listed Outfits). Views: BACK TODAY (today's rare returns) and RAREST (Top 12 + one list per category).
- `src/rarity.js` engine; `scripts/build-rarest.mjs` + daily GitHub Action (`.github/workflows/rarest.yml`, 00:20 UTC) writes `data/rarest.json`; Worker serves `/api/rarest`.
- Square item pictures capped at 11rem on phones.

## 0.4.0 — 18 Nov 2026
- LOOT > GUIDE: field guide from research (game plan, chest routes, quiet routes, Sprites, Treasure Hours, modes, myths, sources). Each line is tagged EPIC, REPORTED, TIP, MYTH or RUMOUR.
- Treasure Hours schedule in the viewer's local time, with LIVE / NEXT countdown (`treasureHourSessions()` in `src/treasure.js`).
- Guide text in `data/guide-treasure-hunters-2026.json`; schedule in `data/treasure-hunters-2026.json` (`treasureHours`).

## 0.3.0 — 18 Nov 2026
- API guard (`worker/guard.js`): no CORS by default; cross-site browser calls refused; bad player names refused before any upstream call; 30 player lookups per IP per 5 minutes.
- Private / not-found lookups cached for 10 minutes (no repeat calls on the key).
- Query values checked (account type, window, news mode, island interval, page size).

## 0.2.4 — 18 Nov 2026
- Real footer fix: the footer used the class `bar`, which is also the progress-bar style (height 0.55rem). Renamed to `foot`.

## 0.2.3 — 18 Nov 2026
- Screen height from window.visualViewport (the area Chrome really shows).
- SYS > SETTINGS shows a SCREEN line (viewport, safe area, footer position) for layout checks.

## 0.2.2 — 18 Nov 2026
- viewport-fit=cover + safe-area padding: footer sits above the phone's button bar (Android edge-to-edge).

## 0.2.1 — 18 Nov 2026
- Screen pinned to the visible area (position: fixed), so the footer shows on phones.
- Placement tiles show the two placements that have data. TOP 25 = 0 no longer shows for squad players.
- First live scan from a phone worked (yagerstrike67).

## 0.2.0 — 18 Nov 2026
- Loot Terminal page (Phosphor design): STAT, LOOT, SHOP, MAP, SYS. Served by the Worker at `/`.
- Chest estimate = alive minutes × 2 (default). FUNAGLET 50-per-match kept as a preset.
- Shop, news and map normalisers (`src/content.js`).
- Page fits the visible phone screen (footer no longer cut off).
- `wrangler.toml` at the repo root. Cloudflare Workers Builds deploys every push to `main`.
- `/api/health` reports the version.
- First live test passed: stats, career, treasure, shop and server status.

## 0.1.0 — 18 Nov 2026
- fortnite-kit: API clients, PlayerStats normaliser, Epic raw key parser, treasure odds engine, Worker proxy, tests, docs.

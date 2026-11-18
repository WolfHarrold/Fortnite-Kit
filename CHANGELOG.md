# Changelog

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

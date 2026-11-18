# Changelog

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

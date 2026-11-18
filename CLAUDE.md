# fortnite-kit — notes for Claude

Davi's Fortnite data engine and the Loot Terminal page. Read `README.md`, `docs/DATA-CATALOG.md` and `docs/HOW-FUNAGLET-WORKS.md` first.

## Rules

1. Never write an API key into any file. This repo can be public. Keys go in Cloudflare as a **Secret** (`FORTNITE_API_COM_KEY`) only.
2. Run `npm install` then `npm test` before and after every change. `npm test` builds first (`ui/build.mjs`). All tests must pass.
3. After a change to `src/`, `ui/`, `data/` or `worker/`, run `npm run build` and commit the new `dist/` and `worker/page.generated.js`. Cloudflare Workers Builds deploys every push to `main` (config: `wrangler.toml` at the repo root). Pasting `dist/worker.js` into the Cloudflare editor is the manual fallback.
4. Chest estimate = alive minutes played × 2 (Davi's rule). Keep the FUNAGLET preset (50 per match) for comparison only.
5. Event odds and dates live in `data/<event>.json`, never in code.
6. The sandbox cannot reach the Fortnite APIs. Test with fixtures and mock fetch. Davi does the live check on the Worker.
7. The page uses Davi's Phosphor design system (one hue, four tiers, fixed zones). Keep new views in that style.
8. Write replies to Davi in short, plain ASD-STE100 style.

# Roadmap

Davi's chosen order (18 Nov 2026). Tick items when they ship. Keep `CHANGELOG.md` for the details.

## Done
- [x] Data engine, Worker proxy, Loot Terminal page (0.1–0.2)
- [x] API guard (0.3)
- [x] LOOT > GUIDE with Treasure Hours schedule (0.4)
- [x] SHOP > RARE, daily GitHub Action (0.5)
- [x] STAT > SQUAD leaderboard (0.6)
- [x] Stream overlay `/overlay` for OBS (0.6)

## Next (needs a small setup from Davi)
1. **Session tracker** — snapshot stats before and after play; real session and weekly numbers.
   - Needs: a Cloudflare KV namespace (Workers & Pages > KV > Create). Send the namespace ID; add `[[kv_namespaces]] binding = "FN_CACHE"` to `wrangler.toml`.
   - Plan: daily cron snapshot of saved players into KV; page shows deltas.
2. **Shop wishlist alerts** — daily check of the shop against a wishlist.
   - Needs: alert channel choice. ntfy (recommended, free phone push), Discord webhook (Secret), or email (needs domain on Cloudflare).
   - Uses the same KV namespace for the wishlist.
3. **Own address** `loot.wolfharrold.com`.
   - Needs: domain DNS moved to Cloudflare (nameserver change at Tailor Brands). One CNAME is not enough for Workers.
   - First check: does Tailor Brands allow custom nameservers?

## Ideas (not scheduled)
- **Weapon comparator** — damage, DPS, fire rate, magazine, reload. Source: fortniteapi.io `/weapons/list` and `/loot/list` (needs a free fortniteapi.io key as a Secret). The Fandom Weapon Comparator cannot be read from the sandbox.
- **Squad chests in the planner** — Treasure Hunt rewards go to the whole squad (reported), so a squad's chests all count for each member. Add a SQUAD setting to LOOT > PLANNER.
- **Rarest list: match the wiki's exclusions** — the wiki moves some items to Limited Time Cosmetics and bundles. Try gameplay tags (`responseFlags=2`) to spot starter packs and promos.
- **Wrist mode** for the Galaxy S10 (compact layout, Add to Home screen).
- **Island analytics** tab (Epic Ecosystem API).
- **OliTracker** Build / Zero Build / ranked split (read its API docs in Chrome first).

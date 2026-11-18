# How FUNAGLET "Treasure Chances" works

Reverse-engineered on 18 November 2026 from https://funaglet.com/treasure-chances/Lilavlis.
Every number below was checked. The kit reproduces all of them (see `test/treasure.test.js`).

## 1. The data chain

```
Epic stats proxy (private API, needs a logged-in Epic account)
        │   bot accounts with "device auth" credentials
        ▼
OliTracker (olitracker.com)  ── has its own API: olitracker.com/api/docs
        │   server-side call, cached 20 min per player
        ▼
FUNAGLET server  ── builds the page on the server (no data calls in the browser)
        │   + hand-typed drop rates from Epic's Fortnite Status post (7 Nov 2026)
        ▼
/treasure-chances/{name}
```

Evidence:

- The page says its stats source is **"Current Season (OliTracker)"**.
- The page shows a **Zero Build / Build** match split. Only Epic's raw stats keys have this
  split (`..._playlist_nobuildbr_solo`). fortnite-api.com does not give it. So the data comes
  from a source that reads raw Epic keys — OliTracker.
- OliTracker asks players to **add the "OliTracker" bot as a friend**. That is how trackers
  run Epic accounts that can call Epic's stats proxy.
- The page shows **"Last fetched …"** and **"Refresh available in 20 minutes"**. That is a
  server cache with a 20-minute cooldown per player.
- The About page says data comes from "configured Fortnite data providers". It names none.
- The page HTML has no visible data or API calls. The page is rendered on the server.

## 2. The maths

| Step | Rule | LilAvlis |
|---|---|---|
| Matches | current-season BR matches from OliTracker | 350 |
| Chests | matches × chests per match (default 50, editable) | 350 × 50 = **17,500** |
| Season reward | use all chests | Pirate Shop Access |
| Weekly reward | chests ÷ weeks elapsed (even split), whole number | 17,500 ÷ 3 = **5,833** |
| Chance | 1 − (1 − 1/odds)^chests, 2 decimals | see below |
| Planner | add planned matches × chests per match | +5 × 50 = 250 → 17,750 |

| Reward | Odds (1 in) | Chests | FUNAGLET | Kit |
|---|---|---|---|---|
| Pirate Shop Access | 137,500 | 17,500 | 11.95% | 11.95% |
| Weekly Gold Outfit | 1,562,500 | 5,833 | 0.37% | 0.37% |
| Weekly Vehicle & Decal | 7,813 | 5,833 | 52.60% | 52.60% |
| Weekly Pickaxe or Back Bling | 568 | 5,833 | 100.00% | 100.00% |
| Weekly Jam Track | 391 | 5,833 | 100.00% | 100.00% |
| Weekly Loading Screen | 272 | 5,833 | 100.00% | 100.00% |
| Planner (+5 matches) | 137,500 | 17,750 | 12.11% | 12.11% |

## 3. Weak points (do better in our version)

1. **A flat number per match ignores match length.** An early death counts as 50 chests.
   The kit counts chests from **alive minutes played × 2** (one chest every 30 seconds,
   Davi's observed rate; Epic counts alive minutes only). LilAvlis: 4,055 min → 8,110 chests
   → 5.73% (FUNAGLET: 11.95%). `chestsPerMatch: 'funaglet'` still copies their 50.
2. **The weekly split is a guess.** Stats do not say which week a match was in. A better
   way: save a stats snapshot each week and use the difference (matches this week).
3. **Treasure Hours are ignored** in the report. The kit planner supports boosted chests.
4. **It counts all BR matches.** If treasure chests only spawn in some playlists, the
   estimate is too high. Filter by playlist when raw keys are available.
5. **The event ends on 5 December 2026.** Keep event data in JSON so a new event is a new
   file, not new code.

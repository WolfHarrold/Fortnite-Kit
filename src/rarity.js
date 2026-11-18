// Rarest Item Shop cosmetics, from fortnite-api.com shop history.
// Same rules as the Fortnite Wiki page "Rarest Item Shop Cosmetics" (checked against its 12 Oct 2026 copy):
//   - rarity = days since the item was last in the Item Shop
//   - an item is "rare" when it has not been in the shop for 500+ days (minDaysAway)
//   - Top 12 leaves out Bundles and Back Blings that came with an Outfit already in the Top 12
// Wiki counts on 12 Oct 2026 (use them to sanity-check a live run): Outfits 187, Back Blings 176,
// Pickaxes 245, Gliders 41, Emotes 112, Emoticons 9, Sprays 19, Toys 1, Banners 5, Kicks 2, Wraps 199,
// Lobby Music 60, Contrails 2, Loading Screens 35, Cars 1, Decals 4, Wheels 17, Boosts 7, Jam Tracks 4,
// Guitars 7, Basses 3, Drums 6, Keytars 4, Microphones 5, Builds 15, Decor Bundles 26.
// Wiki Top 12 then: Fresh (last 15 Oct 2018), Reflex, Get Funky, Shaman, Sunny Samba, Travis Scott,
// Astro Jack, Diamond Jack, Head Banger, Goosebumps, Rue, Zombie Shambles. Computed once a day by scripts/build-rarest.mjs (GitHub Action),
// because the full cosmetics list is too big for the free Worker to process per request.
//
// Input:  all = data of GET /v2/cosmetics  ({ br, tracks, instruments, cars, legoKits, ... })
//         shop = data of GET /v2/shop      ({ date, entries: [...] })
// Output: { generatedAt, shopDate, top12, categories: [{ label, total, items }], today }

const DAY = 864e5;

// fortnite-api type.value -> wiki-style category label. Unknown types fall back to displayValue + "s".
const BR_LABELS = {
  outfit: 'Outfits', backpack: 'Back Blings', petcarrier: 'Back Blings', pickaxe: 'Pickaxes', glider: 'Gliders',
  emote: 'Emotes', emoji: 'Emoticons', spray: 'Sprays', toy: 'Toys', banner: 'Banners', shoe: 'Kicks',
  wrap: 'Wraps', music: 'Lobby Music', contrail: 'Contrails', loadingscreen: 'Loading Screens',
  sidekick: 'Sidekicks', aura: 'Auras',
};
const GROUP_LABELS = {
  body: 'Cars', skin: 'Decals', wheel: 'Wheels', booster: 'Boosts', drifttrail: 'Drift Trails',
  guitar: 'Guitars', bass: 'Basses', drum: 'Drums', keyboard: 'Keytars', mic: 'Microphones',
};
const ORDER = ['Outfits', 'Back Blings', 'Pickaxes', 'Gliders', 'Emotes', 'Contrails', 'Emoticons', 'Sprays', 'Toys',
  'Banners', 'Kicks', 'Wraps', 'Lobby Music', 'Loading Screens', 'Sidekicks', 'Auras', 'Cars', 'Decals', 'Wheels',
  'Boosts', 'Drift Trails', 'Jam Tracks', 'Guitars', 'Basses', 'Drums', 'Keytars', 'Microphones', 'Builds', 'Decor Bundles'];

const plural = (s) => (s ? (/s$/i.test(s) ? s : `${s}s`) : 'Other');
const dayKey = (iso) => String(iso).slice(0, 10);
const dayMs = (key) => Date.parse(`${key}T00:00:00Z`);

function labelFor(group, item) {
  const v = item?.type?.value?.toLowerCase?.();
  if (group === 'tracks') return 'Jam Tracks';
  if (group === 'legoKits') return /decor/i.test(item?.type?.displayValue ?? item?.type?.value ?? '') ? 'Decor Bundles' : 'Builds';
  if (group === 'br') return BR_LABELS[v] ?? plural(item?.type?.displayValue);
  return GROUP_LABELS[v] ?? plural(item?.type?.displayValue);
}

function imageFor(group, item) {
  if (group === 'br') return item.images?.smallIcon ?? item.images?.icon ?? null;
  if (group === 'tracks') return item.albumArt ?? null;
  return item.images?.small ?? item.images?.large ?? null;
}

// Unique shop days, sorted. Runs of back-to-back days = one stint (one "time in the shop").
export function shopStats(history) {
  const days = [...new Set((history ?? []).map(dayKey))].sort();
  let stints = 0; let prev = null;
  for (const d of days) {
    if (prev == null || dayMs(d) - dayMs(prev) > 1.5 * DAY) stints += 1;
    prev = d;
  }
  return { days, stints, firstSeen: days[0] ?? null, lastSeen: days[days.length - 1] ?? null };
}

export function computeRarity(all, shop, { now = new Date(), perCategory = 25, top = 12, minDaysAway = 500 } = {}) {
  const today = dayKey((shop?.date ?? now.toISOString()));
  const todayMs = dayMs(today);
  const groups = ['br', 'tracks', 'instruments', 'cars', 'legoKits'];

  // 1. Every cosmetic that has been in the shop at least once.
  const byId = new Map();
  for (const g of groups) {
    for (const item of all?.[g] ?? []) {
      const st = shopStats(item.shopHistory);
      if (!st.days.length) continue;
      byId.set(item.id, {
        id: item.id,
        name: item.name ?? item.title ?? item.id,
        type: g === 'tracks' ? 'Jam Track' : (item.type?.displayValue ?? null),
        category: labelFor(g, item),
        rarity: item.rarity?.displayValue ?? null,
        series: item.series?.value ?? null,
        set: item.set?.value ?? null,
        group: g,
        image: imageFor(g, item),
        firstSeen: st.firstSeen,
        lastSeen: st.lastSeen,
        daysInShop: st.days.length,
        stints: st.stints,
        daysAway: Math.max(0, Math.floor((todayMs - dayMs(st.lastSeen)) / DAY)),
        _days: st.days,
      });
    }
  }

  // 2. Items in today's shop, and how long each was away before today.
  const shopIds = new Set();
  for (const e of shop?.entries ?? []) {
    for (const list of [e.brItems, e.tracks, e.instruments, e.cars, e.legoKits]) for (const it of list ?? []) shopIds.add(it.id);
  }
  const todayItems = [];
  for (const id of shopIds) {
    const it = byId.get(id);
    if (!it) continue;
    const before = it._days.filter((d) => d < today);
    const prev = before[before.length - 1] ?? null;
    todayItems.push({
      id, name: it.name, type: it.type, category: it.category, rarity: it.rarity, image: it.image,
      isNew: !prev, lastSeenBefore: prev, daysAway: prev ? Math.floor((todayMs - dayMs(prev)) / DAY) : null,
      stints: it.stints,
    });
  }
  todayItems.sort((a, b) => (b.daysAway ?? -1) - (a.daysAway ?? -1));

  // 3. Rare per category: not in today's shop, away for minDaysAway+ days, longest away first.
  const clean = ({ _days, group, ...rest }) => rest;
  const away = [...byId.values()].filter((it) => !shopIds.has(it.id) && it.daysAway >= minDaysAway)
    .sort((a, b) => b.daysAway - a.daysAway || a.name.localeCompare(b.name));
  const cats = new Map();
  for (const it of away) {
    const list = cats.get(it.category) ?? [];
    list.push(it);
    cats.set(it.category, list);
  }
  const rank = (l) => { const i = ORDER.indexOf(l); return i < 0 ? ORDER.length : i; };
  const categories = [...cats.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]))
    .map(([label, list]) => ({ label, total: list.length, items: list.slice(0, perCategory).map(clean) }));

  return {
    generatedAt: now.toISOString(),
    shopDate: today,
    source: 'fortnite-api.com /v2/cosmetics shopHistory',
    minDaysAway,
    top12: pickTop(away, top).map(clean),
    categories,
    today: todayItems.filter((t) => t.isNew || t.daysAway > 1).map((t) => ({ ...t, rare: !t.isNew && t.daysAway >= minDaysAway })),
  };
}

// Top N, wiki style: skip Back Blings that came with an Outfit already picked (same set, same last day).
function pickTop(sorted, n) {
  const out = [];
  for (const it of sorted) {
    if (out.length >= n) break;
    const isBackBling = it.category === 'Back Blings';
    const bundled = isBackBling && it.set && out.some((o) => o.category === 'Outfits' && o.set === it.set && o.lastSeen === it.lastSeen);
    if (!bundled) out.push(it);
  }
  return out;
}

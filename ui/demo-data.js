// DEMO data for the terminal. Shaped exactly like the live API responses, so DEMO mode
// runs the same normalisers as DIRECT and WORKER mode. Item, news and place names are
// invented samples. Season numbers match FUNAGLET's LilAvlis snapshot (350 / 73 / 940 / 67h 35m).

import { computeRarity } from '../src/rarity.js';

const blk = (matches, wins, kills, minutesPlayed, extra = {}) => ({
  score: 0, scorePerMin: 0, scorePerMatch: 0, wins, kills,
  killsPerMin: minutesPlayed ? kills / minutesPlayed : 0, killsPerMatch: matches ? kills / matches : 0,
  deaths: matches - wins, kd: kills / Math.max(matches - wins, 1), matches,
  winRate: matches ? (wins / matches) * 100 : 0, minutesPlayed, playersOutlived: 0,
  lastModified: '2026-11-18T00:40:00Z', ...extra,
});

const statsPayload = ({ all, solo, duo, squad, ltm, kbm, pad, touch, bp }) => ({
  account: { id: '0123456789abcdef0123456789abcdef', name: 'LilAvlis' },
  battlePass: bp,
  image: null,
  stats: {
    all: { overall: all, solo, duo, trio: null, squad, ltm },
    keyboardMouse: kbm ? { overall: kbm } : null,
    gamepad: pad ? { overall: pad } : null,
    touch: touch ? { overall: touch } : null,
  },
});

export const DEMO = {
  season: statsPayload({
    all: blk(350, 73, 940, 4055, { top10: 180, top25: 290 }),
    solo: blk(180, 30, 520, 2050, { top10: 92, top25: 150 }),
    duo: blk(110, 28, 280, 1300, { top5: 55, top12: 80 }),
    squad: blk(60, 15, 140, 705, { top3: 24, top6: 38 }),
    ltm: null,
    kbm: blk(300, 66, 830, 3480),
    pad: blk(50, 7, 110, 575),
    touch: null,
    bp: { level: 87, progress: 42 },
  }),
  lifetime: statsPayload({
    all: blk(2140, 301, 5120, 24800, { top10: 910, top25: 1530 }),
    solo: blk(1020, 120, 2700, 11900),
    duo: blk(640, 98, 1500, 7400),
    squad: blk(410, 70, 820, 4800),
    ltm: blk(70, 13, 100, 700),
    kbm: blk(1700, 250, 4300, 19800),
    pad: blk(400, 45, 760, 4600),
    touch: blk(40, 6, 60, 400),
    bp: { level: 87, progress: 42 },
  }),
  shop: {
    date: '2026-11-18T00:00:00Z',
    entries: [
      { offerId: 'demo-1', finalPrice: 1500, regularPrice: 1500, layout: { name: 'Treasure Hunt' }, outDate: '2026-11-20T23:59:59Z', brItems: [{ name: 'Tidewalker Captain', type: { displayValue: 'Outfit' }, rarity: { displayValue: 'Epic' } }] },
      { offerId: 'demo-2', finalPrice: 800, regularPrice: 1000, layout: { name: 'Treasure Hunt' }, outDate: '2026-11-20T23:59:59Z', brItems: [{ name: 'Brass Compass', type: { displayValue: 'Back Bling' }, rarity: { displayValue: 'Rare' } }] },
      { offerId: 'demo-3', finalPrice: 2200, regularPrice: 2800, layout: { name: 'Featured' }, bundle: { name: 'Deep Salvage Set' }, outDate: '2026-11-19T23:59:59Z', brItems: [{ name: 'Salvage Diver', type: { displayValue: 'Outfit' } }, { name: 'Anchor Hook', type: { displayValue: 'Pickaxe' } }, { name: 'Kelp Wrap', type: { displayValue: 'Wrap' } }] },
      { offerId: 'demo-4', finalPrice: 500, regularPrice: 500, layout: { name: 'Featured' }, brItems: [{ name: 'Sextant Swing', type: { displayValue: 'Pickaxe' }, rarity: { displayValue: 'Uncommon' } }] },
      { offerId: 'demo-5', finalPrice: 300, regularPrice: 300, layout: { name: 'Emotes' }, brItems: [{ name: 'Shanty Stomp', type: { displayValue: 'Emote' }, rarity: { displayValue: 'Rare' } }] },
      { offerId: 'demo-6', finalPrice: 500, regularPrice: 500, layout: { name: 'Jam Tracks' }, tracks: [{ title: 'Low Tide Signal', artist: 'Sample Artist' }] },
      { offerId: 'demo-7', finalPrice: 1200, regularPrice: 1200, layout: { name: 'Rides' }, cars: [{ name: 'Harbour Runner' }] },
      { offerId: 'demo-8', finalPrice: 800, regularPrice: 800, layout: { name: 'Featured' }, brItems: [{ name: 'Gull Glider', type: { displayValue: 'Glider' }, rarity: { displayValue: 'Rare' } }] },
    ],
  },
  news: {
    motds: [
      { id: 'n1', title: 'Treasure Hour Tonight', body: 'Boosted odds for one hour. Open as many chests as you can.', sortingPriority: 100 },
      { id: 'n2', title: 'Weekly Rewards Rotated', body: 'A new set of weekly treasure is in chests now.', sortingPriority: 90 },
      { id: 'n3', title: 'New Jam Tracks', body: 'Three new tracks are in the shop this week.', sortingPriority: 80 },
    ],
  },
  map: {
    images: { pois: null, blank: null },
    pois: [
      { id: 'Athena.Location.POI.Demo.01', name: 'Signal Ridge', location: { x: 52000, y: -38000 } },
      { id: 'Athena.Location.POI.Demo.02', name: 'Salt Flats', location: { x: 18000, y: 41000 } },
      { id: 'Athena.Location.POI.Demo.03', name: 'Old Pier', location: { x: -61000, y: 22000 } },
      { id: 'Athena.Location.POI.Demo.04', name: 'Cinder Mill', location: { x: -15000, y: -52000 } },
      { id: 'Athena.Location.POI.Demo.05', name: 'Sunken Market', location: { x: 4000, y: 3000 } },
      { id: 'Athena.Location.POI.Demo.06', name: 'Pine Hollow', location: { x: 40000, y: 8000 } },
      { id: 'Athena.Location.POI.Demo.07', name: 'Dockside', location: { x: -42000, y: -12000 } },
      { id: 'Athena.Location.UnNamedPOI.Demo.08', name: 'Lighthouse Rock', location: { x: 70000, y: 50000 } },
    ],
  },
  status: {
    overall: 'Minor Service Outage',
    components: { 'Game Services': 'operational', Login: 'operational', Matchmaking: 'operational', Parties: 'operational', 'Item Shop': 'degraded_performance' },
  },
};

// ---- DEMO rarest list: invented items with shop histories, run through the real engine ----
const run = (start, n) => Array.from({ length: n }, (_, i) => new Date(Date.parse(`${start}T00:00:00Z`) + i * 864e5).toISOString());
const demoCosmetics = {
  br: [
    { id: 'd-o1', name: 'Brine Admiral', type: { value: 'outfit', displayValue: 'Outfit' }, rarity: { displayValue: 'Legendary' }, set: { value: 'Brine' }, shopHistory: [...run('2019-03-02', 2)] },
    { id: 'd-b0', name: 'Brine Cape', type: { value: 'backpack', displayValue: 'Back Bling' }, rarity: { displayValue: 'Legendary' }, set: { value: 'Brine' }, shopHistory: [...run('2019-03-02', 2)] },
    { id: 'd-o2', name: 'Lantern Keeper', type: { value: 'outfit', displayValue: 'Outfit' }, rarity: { displayValue: 'Epic' }, shopHistory: [...run('2020-06-10', 3), ...run('2021-01-05', 2)] },
    { id: 'd-o3', name: 'Reef Runner', type: { value: 'outfit', displayValue: 'Outfit' }, rarity: { displayValue: 'Rare' }, shopHistory: [...run('2023-08-01', 2), ...run('2026-11-18', 1)] },
    { id: 'd-o4', name: 'Tidewalker Captain', type: { value: 'outfit', displayValue: 'Outfit' }, rarity: { displayValue: 'Epic' }, shopHistory: run('2026-11-18', 1) },
    { id: 'd-b1', name: 'Barnacle Pack', type: { value: 'backpack', displayValue: 'Back Bling' }, rarity: { displayValue: 'Rare' }, shopHistory: run('2019-11-20', 2) },
    { id: 'd-p1', name: 'Anchor Axe', type: { value: 'pickaxe', displayValue: 'Harvesting Tool' }, rarity: { displayValue: 'Uncommon' }, shopHistory: [...run('2018-12-01', 1), ...run('2022-02-02', 1)] },
    { id: 'd-g1', name: 'Gull Glider', type: { value: 'glider', displayValue: 'Glider' }, rarity: { displayValue: 'Rare' }, shopHistory: [...run('2021-05-05', 2), ...run('2026-11-18', 1)] },
    { id: 'd-e1', name: 'Shanty Stomp', type: { value: 'emote', displayValue: 'Emote' }, rarity: { displayValue: 'Rare' }, shopHistory: run('2020-02-14', 1) },
    { id: 'd-e2', name: 'Plank Walk', type: { value: 'emote', displayValue: 'Emote' }, rarity: { displayValue: 'Uncommon' }, shopHistory: run('2024-09-09', 2) },
    { id: 'd-w1', name: 'Kelp Wrap', type: { value: 'wrap', displayValue: 'Wrap' }, rarity: { displayValue: 'Rare' }, shopHistory: run('2022-07-07', 3) },
  ],
  tracks: [
    { id: 'd-t1', title: 'Low Tide Signal', shopHistory: run('2024-01-10', 2) },
    { id: 'd-t2', title: 'Harbour Lights', shopHistory: [...run('2024-03-03', 1), ...run('2026-11-18', 1)] },
  ],
  cars: [{ id: 'd-c1', name: 'Harbour Runner', type: { value: 'body', displayValue: 'Car Body' }, rarity: { displayValue: 'Epic' }, shopHistory: run('2024-02-20', 2) }],
  instruments: [{ id: 'd-i1', name: 'Driftwood Bass', type: { value: 'bass', displayValue: 'Bass' }, rarity: { displayValue: 'Rare' }, shopHistory: run('2024-05-05', 1) }],
  legoKits: [],
};
const demoShop = { date: '2026-11-18T00:00:00Z', entries: [{ brItems: [{ id: 'd-o3' }, { id: 'd-o4' }, { id: 'd-g1' }] }, { tracks: [{ id: 'd-t2' }] }] };
DEMO.rarest = computeRarity(demoCosmetics, demoShop, { now: new Date('2026-11-18T01:00:00Z') }); // 500-day rule, like the wiki

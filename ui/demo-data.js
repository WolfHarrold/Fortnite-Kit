// DEMO data for the terminal. Shaped exactly like the live API responses, so DEMO mode
// runs the same normalisers as DIRECT and WORKER mode. Item, news and place names are
// invented samples. Season numbers match FUNAGLET's LilAvlis snapshot (350 / 73 / 940 / 67h 35m).

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

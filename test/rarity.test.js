import test from 'node:test';
import assert from 'node:assert/strict';
import { shopStats, computeRarity } from '../src/rarity.js';
import { DEMO } from '../ui/demo-data.js';

const day = (s) => `${s}T00:00:00Z`;

test('shopStats: back-to-back days are one stint', () => {
  const s = shopStats([day('2024-01-01'), day('2024-01-02'), day('2024-01-02'), day('2024-03-10'), day('2024-03-11'), day('2024-06-01')]);
  assert.equal(s.days.length, 5); // duplicate day removed
  assert.equal(s.stints, 3);
  assert.equal(s.firstSeen, '2024-01-01');
  assert.equal(s.lastSeen, '2024-06-01');
  assert.equal(shopStats([]).stints, 0);
});

test('computeRarity: today, top 12, categories (demo data through the real engine)', () => {
  const r = DEMO.rarest;
  assert.equal(r.shopDate, '2026-11-18');
  // Today: Reef Runner back after 3 years, Tidewalker Captain new
  const reef = r.today.find((x) => x.name === 'Reef Runner');
  assert.equal(reef.lastSeenBefore, '2023-08-02');
  assert.equal(reef.daysAway, Math.floor((Date.parse('2026-11-18') - Date.parse('2023-08-02')) / 864e5));
  assert.equal(r.today.find((x) => x.name === 'Tidewalker Captain').isNew, true);
  assert.equal(r.today[0].name, 'Gull Glider', 'longest away first (since 2021)');
  // Rarest: items in today's shop are left out; oldest last-seen first
  assert.equal(r.top12[0].name, 'Brine Admiral');
  assert.ok(!r.top12.some((x) => ['Reef Runner', 'Tidewalker Captain', 'Gull Glider'].includes(x.name)));
  for (let i = 1; i < r.top12.length; i++) assert.ok(r.top12[i - 1].daysAway >= r.top12[i].daysAway);
  // Categories: wiki order and labels
  const labels = r.categories.map((c) => c.label);
  assert.equal(labels[0], 'Outfits');
  assert.ok(labels.includes('Back Blings') && labels.includes('Jam Tracks') && labels.includes('Cars') && labels.includes('Basses'));
  assert.ok(labels.indexOf('Pickaxes') < labels.indexOf('Emotes'));
  const outfits = r.categories.find((c) => c.label === 'Outfits');
  assert.deepEqual(outfits.items.map((x) => x.name), ['Brine Admiral', 'Lantern Keeper']);
  assert.equal(r.minDaysAway, 500);
  // Back Bling sold with Brine Admiral (same set, same day) is in Back Blings but not in the Top 12
  assert.ok(r.categories.find((c) => c.label === 'Back Blings').items.some((x) => x.name === 'Brine Cape'));
  assert.ok(!r.top12.some((x) => x.name === 'Brine Cape'));
  // 500-day rule: Plank Walk (last seen Sep 2024, ~800 days) is rare; nothing under 500 days is listed
  for (const c of r.categories) for (const it of c.items) assert.ok(it.daysAway >= 500, it.name);
  // Today: Gull Glider and Reef Runner are rare returns; Harbour Lights (990 days) too
  assert.equal(r.today.find((x) => x.name === 'Gull Glider').rare, true);
  assert.equal(outfits.items[1].stints, 2);
  assert.equal(outfits.items[0]._days, undefined, 'internal fields removed');
});

test('computeRarity: per-category limit and unknown types', () => {
  const br = Array.from({ length: 30 }, (_, i) => ({
    id: `x${i}`, name: `Item ${i}`, type: { value: 'mystery', displayValue: 'Mystery Thing' },
    shopHistory: [day(`2024-01-${String((i % 28) + 1).padStart(2, '0')}`)],
  }));
  const r = computeRarity({ br }, { date: day('2026-11-18'), entries: [] }, { perCategory: 10 });
  assert.equal(r.categories[0].label, 'Mystery Things');
  assert.equal(r.categories[0].items.length, 10);
  assert.equal(r.categories[0].total, 30);
});

test('computeRarity: 500-day line', () => {
  const mk = (id, last) => ({ id, name: id, type: { value: 'outfit', displayValue: 'Outfit' }, shopHistory: [day(last)] });
  const r = computeRarity({ br: [mk('a', '2025-07-06'), mk('b', '2025-07-05'), mk('c', '2026-01-01')] }, { date: day('2026-11-18'), entries: [] });
  // 2026-11-18 minus 2025-07-06 = 500 days -> rare; c is only 321 days -> not rare
  assert.deepEqual(r.categories[0].items.map((x) => x.id), ['b', 'a']);
  assert.equal(r.categories[0].total, 2);
});

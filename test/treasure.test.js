// These tests lock the engine to FUNAGLET's published numbers for LilAvlis
// (page fetched 18 Nov 2026: 350 matches, 50 chests/match, week 3).
import test from 'node:test';
import assert from 'node:assert/strict';
import { chanceAtLeastOne, chanceAtLeastOneMixed, triesForChance, expectedDrops, pct } from '../src/odds.js';
import { treasureReport, planTreasure, eventWeek } from '../src/treasure.js';
import { event } from './helpers.js';

const NOW = new Date('2026-11-18T01:04:45Z');

test('odds maths matches FUNAGLET headline number', () => {
  assert.equal(pct(chanceAtLeastOne(137500, 17500)), '11.95%');
  assert.equal(pct(1 - chanceAtLeastOne(137500, 17500)), '88.05%');
});

test('event week: 18 Nov 2026 is week 3', () => {
  const w = eventWeek(event, NOW);
  assert.equal(w.weekNumber, 3);
  assert.equal(w.weekStart, '2026-11-15T00:00:00.000Z');
});

test('full report reproduces every FUNAGLET row (funaglet preset)', () => {
  const r = treasureReport({ event, matches: 350, chestsPerMatch: 'funaglet', now: NOW });
  assert.equal(r.seasonChests, 17500);
  assert.equal(r.weekChests, 5833);
  const by = Object.fromEntries(r.rewards.map((x) => [x.id, pct(x.chance)]));
  assert.equal(by['pirate-shop-access'], '11.95%');
  assert.equal(by['weekly-gold-outfit'], '0.37%');
  assert.equal(by['weekly-vehicle-decal'], '52.60%');
  assert.equal(by['weekly-pickaxe-backbling'], '100.00%');
  assert.equal(by['weekly-jam-track'], '100.00%');
  assert.equal(by['weekly-loading-screen'], '100.00%');
});

test('planner reproduces FUNAGLET: +5 solo matches -> 17,750 chests, 12.11%', () => {
  const report = treasureReport({ event, matches: 350, chestsPerMatch: 'funaglet', now: NOW });
  const p = planTreasure({ event, report, plannedMatches: 5 });
  assert.equal(p.plannedChests, 250);
  assert.equal(p.projectedTotal, 17750);
  assert.equal(pct(p.projectedChance), '12.11%');
});

test('default model: alive minutes x 2 chests per minute', () => {
  // LilAvlis: 67h 35m alive = 4,055 min -> 8,110 chests; week 3 -> 2,703
  const r = treasureReport({ event, matches: 350, minutesPlayed: 4055, now: NOW });
  assert.equal(r.method, 'minutes');
  assert.equal(r.chestsPerMinute, 2);
  assert.equal(r.seasonChests, 8110);
  assert.equal(r.weekChests, 2703);
  assert.equal(r.chestsPerMatch.toFixed(1), '23.2'); // effective, ~11.6 alive min per match
  const by = Object.fromEntries(r.rewards.map((x) => [x.id, pct(x.chance)]));
  assert.equal(by['pirate-shop-access'], '5.73%');
  assert.equal(by['weekly-vehicle-decal'], '29.25%');
  assert.equal(by['weekly-gold-outfit'], '0.17%');
  assert.equal(by['weekly-pickaxe-backbling'], '99.15%');
});

test('default model planner: matches use the player average, minutes use the rate', () => {
  const report = treasureReport({ event, matches: 350, minutesPlayed: 4055, now: NOW });
  const byMatches = planTreasure({ event, report, plannedMatches: 5 }); // 5 x 23.17 = 116
  assert.equal(byMatches.plannedChests, 116);
  assert.equal(byMatches.projectedTotal, 8226);
  assert.equal(pct(byMatches.projectedChance), '5.81%');
  const byMinutes = planTreasure({ event, report, plannedMinutes: 60 }); // 1 hour alive = 120 chests
  assert.equal(byMinutes.plannedChests, 120);
});

test('custom rate and missing minutes', () => {
  const r = treasureReport({ event, matches: 350, minutesPlayed: 4055, chestsPerMinute: 3, now: NOW });
  assert.equal(r.seasonChests, 12165);
  assert.throws(() => treasureReport({ event, matches: 350, minutesPlayed: 0, now: NOW }), /chestsPerMatch/);
  assert.throws(() => treasureReport({ event, matches: 1, chestsPerMatch: 'nope' }), /preset/);
});

test('treasure hour boost: mixed segments beat plain', () => {
  const plain = chanceAtLeastOne(137500, 1000);
  const boosted = chanceAtLeastOneMixed(137500, [{ tries: 500, multiplier: 1 }, { tries: 500, multiplier: 2 }]);
  assert.ok(boosted > plain);
  assert.ok(Math.abs(boosted - chanceAtLeastOne(137500, 1500)) < 1e-6); // 500x2 == 1000 extra tries (approx)
});

test('inverse and expected value', () => {
  // 50% needs ~ odds * ln 2 tries
  assert.equal(triesForChance(137500, 0.5), Math.ceil(Math.log(0.5) / Math.log1p(-1 / 137500)));
  assert.ok(Math.abs(triesForChance(137500, 0.5) - 137500 * Math.LN2) < 2);
  assert.equal(expectedDrops(127, 1270), 10);
  assert.equal(chanceAtLeastOne(100, 0), 0);
});

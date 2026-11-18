import test from 'node:test';
import assert from 'node:assert/strict';
import { rankSquad, cleanSquadNames, SQUAD_MAX } from '../src/squad.js';
import { finishBlock } from '../src/normalize.js';

const p = (name, o) => ({ name, stats: o ? { overall: finishBlock(o) } : null, error: null });

test('rankSquad: sorts by metric, ties share a rank, errors and empties last', () => {
  const entries = [
    p('Ann', { matches: 100, wins: 20, kills: 300, minutesPlayed: 1000 }),
    p('Ben', { matches: 50, wins: 20, kills: 100, minutesPlayed: 500 }),
    p('Cat', { matches: 200, wins: 30, kills: 200, minutesPlayed: 2500 }),
    { name: 'Dee', stats: null, error: 'PRIVATE STATS' },
    p('Eve', null),
    p('Fin', { matches: 0, wins: 0, kills: 0, minutesPlayed: 0 }),
  ];
  const byWins = rankSquad(entries, 'wins');
  assert.deepEqual(byWins.map((e) => [e.name, e.rank]), [['Cat', 1], ['Ann', 2], ['Ben', 2], ['Dee', null], ['Eve', null], ['Fin', null]]);
  const byKd = rankSquad(entries, 'kd');
  assert.equal(byKd[0].name, 'Ann'); // 300 / 80 = 3.75
  const byWinRate = rankSquad(entries, 'winRate');
  assert.equal(byWinRate[0].name, 'Ben'); // 40%
  const byTime = rankSquad(entries, 'minutesPlayed');
  assert.equal(byTime[0].value, 2500);
  assert.equal(rankSquad(entries, 'nope')[0].name, 'Cat', 'unknown metric falls back to wins');
});

test('cleanSquadNames: trims, removes bad names and duplicates, caps the size', () => {
  assert.deepEqual(cleanSquadNames([' LilAvlis ', 'lilavlis', 'x', '<b>', 'Reef Runner']), ['LilAvlis', 'Reef Runner']);
  const many = Array.from({ length: 12 }, (_, i) => `Player${i}`);
  assert.equal(cleanSquadNames(many).length, SQUAD_MAX);
  assert.deepEqual(cleanSquadNames(null), []);
});

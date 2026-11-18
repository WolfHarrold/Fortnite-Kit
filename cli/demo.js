#!/usr/bin/env node
// Demo: print a FUNAGLET-style treasure report and a career summary.
//
//   node cli/demo.js                       offline, uses fixtures (no key, no network)
//   node cli/demo.js LilAvlis --live       live, needs FORTNITE_API_COM_KEY in the environment
//   node cli/demo.js --cpm=funaglet        copy FUNAGLET's 50 chests per match
//   node cli/demo.js --cpmin=2             chests per alive minute (default 2)

import { readFileSync } from 'node:fs';
import { createFortniteKit } from '../src/kit.js';
import { fromFortniteApiCom } from '../src/normalize.js';
import { treasureReport, planTreasure } from '../src/treasure.js';
import { pct } from '../src/odds.js';

const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith('--')) ?? 'LilAvlis';
const live = args.includes('--live');
const cpmArg = args.find((a) => a.startsWith('--cpm='))?.split('=')[1];
const chestsPerMatch = cpmArg == null ? undefined : Number.isFinite(+cpmArg) ? +cpmArg : cpmArg;
const cpminArg = args.find((a) => a.startsWith('--cpmin='))?.split('=')[1];
const chestsPerMinute = cpminArg == null ? undefined : +cpminArg;
const event = JSON.parse(readFileSync(new URL('../data/treasure-hunters-2026.json', import.meta.url)));

let season; let report;
if (live) {
  const kit = createFortniteKit({ fortniteApiComKey: process.env.FORTNITE_API_COM_KEY, event });
  const career = await kit.career(name);
  season = career.season;
  report = treasureReport({ event, matches: season.overall.matches, minutesPlayed: season.overall.minutesPlayed, chestsPerMatch, chestsPerMinute });
  console.log(`Lifetime: ${career.lifetime.overall.matches} matches, ${career.lifetime.overall.wins} wins`);
} else {
  const fx = JSON.parse(readFileSync(new URL('../fixtures/fortnite-api-com.season.LilAvlis.json', import.meta.url)));
  season = fromFortniteApiCom(fx.data);
  report = treasureReport({ event, matches: season.overall.matches, minutesPlayed: season.overall.minutesPlayed, chestsPerMatch, chestsPerMinute, now: new Date('2026-11-18T01:04:45Z') });
  console.log('(offline demo — fixture data)');
}

const o = season.overall;
console.log(`\n${season.account.name} — current season`);
console.log(`Matches ${o.matches} | Wins ${o.wins} (${o.winRate}%) | Kills ${o.kills} | K/D ${o.kd} | ${o.hoursPlayed} h`);
const model = report.method === 'minutes'
  ? `${report.chestsPerMinute} chests per alive minute (~${report.chestsPerMatch.toFixed(1)} per match)`
  : `${report.chestsPerMatch} chests per match`;
console.log(`\nTreasure Hunters — week ${report.week.weekNumber} | ${model}`);
console.log(`Estimated chests: season ${report.seasonChests.toLocaleString()} | this week ${report.weekChests.toLocaleString()}\n`);
for (const r of report.rewards) {
  const extra = r.expected != null ? `  (~${r.expected.toFixed(1)} expected)` : '';
  console.log(`${r.name.padEnd(30)} 1 in ${r.odds.toLocaleString().padEnd(10)} ${pct(r.chance).padStart(8)}${extra}`);
}
const plan = planTreasure({ event, report, plannedMatches: 5 });
console.log(`\nPlanner: +5 matches -> ${plan.projectedTotal.toLocaleString()} chests -> ${pct(plan.projectedChance)} Pirate Shop Access`);

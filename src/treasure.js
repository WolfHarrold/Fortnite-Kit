// Treasure odds report + planner. This is the FUNAGLET "treasure-chances" engine, rebuilt and improved.
//
// How FUNAGLET does it (reverse-engineered, numbers verified against their page):
//   1. Get the player's CURRENT-SEASON Battle Royale matches (they use OliTracker).
//   2. estimated chests = matches x chests-per-match (they assume 50 per Solo match).
//   3. Season rewards (Pirate Shop Access) use ALL estimated chests.
//      Weekly rewards use estimated chests / weeks elapsed (an even split per week).
//   4. chance = 1 - (1 - 1/odds)^chests, shown with 2 decimals.
//   5. Planner: add planned matches x chests-per-match, run the same formula.
//   6. Cache the stats for 20 minutes per player.
//
// Our default is better: count chests from TIME ALIVE, not from matches.
//   estimated chests = minutesPlayed x chestsPerMinute (default 2 = one chest every 30 s).
//   Epic's minutesPlayed counts alive minutes only, so an early death counts for few chests.
// Pass chestsPerMatch (number or preset name like 'funaglet') to use the per-match method instead.
// Event data (odds, dates, multipliers, rates) lives in data/<event>.json, not in code.

import { chanceAtLeastOne, chanceAtLeastOneMixed, expectedDrops, triesForChance } from './odds.js';

const DAY = 864e5;

// Which week of the event is it? Week 1 starts on event.start at event.weekResetUtc.
export function eventWeek(event, now = new Date()) {
  const [hh, mm] = (event.weekResetUtc ?? '00:00').split(':').map(Number);
  const start = Date.parse(`${event.start}T00:00:00Z`) + (hh * 60 + mm) * 6e4;
  const end = Date.parse(`${event.end}T23:59:59Z`);
  const len = (event.weekLengthDays ?? 7) * DAY;
  const t = Math.min(Math.max(+now, start), end);
  const weekNumber = Math.floor((t - start) / len) + 1;
  return {
    weekNumber,
    weeksElapsed: weekNumber,
    weekStart: new Date(start + (weekNumber - 1) * len).toISOString(),
    weekEnd: new Date(Math.min(start + weekNumber * len, end)).toISOString(),
    started: +now >= start,
    ended: +now > end,
  };
}

// Pick the chest model.
//   chestsPerMatch given (number or preset name) -> { method: 'matches', rate }
//   otherwise                                     -> { method: 'minutes', rate: chestsPerMinute }
export function resolveChestModel(event, { chestsPerMatch, chestsPerMinute } = {}) {
  if (chestsPerMatch != null) {
    const rate = typeof chestsPerMatch === 'number' ? chestsPerMatch : event.chestsPerMatch?.[chestsPerMatch];
    if (typeof rate !== 'number') throw new Error(`Unknown chests-per-match preset: ${chestsPerMatch}`);
    return { method: 'matches', rate };
  }
  return { method: 'minutes', rate: chestsPerMinute ?? event.chestsPerMinute ?? 2 };
}

// Kept for older callers.
export const resolveChestsPerMatch = (event, chestsPerMatch) => resolveChestModel(event, { chestsPerMatch }).rate;

// Full report for one player.
//   matches       = current-season BR matches   (PlayerStats.overall.matches)
//   minutesPlayed = current-season alive minutes (PlayerStats.overall.minutesPlayed)
export function treasureReport({ event, matches = 0, minutesPlayed = 0, chestsPerMatch, chestsPerMinute, now = new Date(), splitWeekly = 'even' }) {
  const model = resolveChestModel(event, { chestsPerMatch, chestsPerMinute });
  if (model.method === 'minutes' && !minutesPlayed && matches) {
    throw new Error('No minutesPlayed in the stats. Pass chestsPerMatch to use the per-match method.');
  }
  const wk = eventWeek(event, now);
  const seasonChests = Math.round(model.method === 'minutes' ? minutesPlayed * model.rate : matches * model.rate);
  // Even split per week, whole number (FUNAGLET: 17,500 / 3 -> 5,833).
  const weekChests = splitWeekly === 'even' ? Math.floor(seasonChests / Math.max(wk.weeksElapsed, 1)) : seasonChests;
  const avgMinutesPerMatch = matches ? minutesPlayed / matches : 0;

  const rewards = event.rewards.map((r) => {
    const chests = r.scope === 'week' ? weekChests : seasonChests;
    const chance = chanceAtLeastOne(r.odds, chests);
    return {
      id: r.id,
      name: r.name,
      odds: r.odds,
      scope: r.scope,
      chests,
      chance,
      noChance: 1 - chance,
      expected: r.repeatable ? expectedDrops(r.odds, chests) : undefined,
      chestsFor50: triesForChance(r.odds, 0.5),
      chestsFor90: triesForChance(r.odds, 0.9),
    };
  });
  return {
    event: event.id,
    week: wk,
    matches,
    minutesPlayed,
    method: model.method,
    chestsPerMinute: model.method === 'minutes' ? model.rate : null,
    chestsPerMatch: model.method === 'matches' ? model.rate : avgMinutesPerMatch * model.rate, // effective
    avgMinutesPerMatch,
    seasonChests,
    weekChests,
    rewards,
  };
}

// Planner: "what if I play more (some of it in a Treasure Hour)?"
// Give minutes (plannedMinutes) or matches (plannedMatches). Matches are turned into chests
// with the report's model: per-match rate, or the player's average alive minutes per match.
// treasureHour = index into the reward's treasureHourMultipliers (0 = first session), or null.
export function planTreasure({
  event, report, rewardId = event.rewards[0].id,
  plannedMatches = 0, plannedMinutes = 0,
  treasureHourMatches = 0, treasureHourMinutes = 0, treasureHour = null,
}) {
  const reward = event.rewards.find((r) => r.id === rewardId);
  if (!reward) throw new Error(`Unknown reward: ${rewardId}`);
  const perMinute = report.chestsPerMinute ?? (report.avgMinutesPerMatch ? report.chestsPerMatch / report.avgMinutesPerMatch : 0);
  const chestsFor = (m, mins) => Math.round(m * report.chestsPerMatch + mins * perMinute);
  const base = reward.scope === 'week' ? report.weekChests : report.seasonChests;
  const planned = chestsFor(plannedMatches, plannedMinutes);
  const thChests = chestsFor(treasureHourMatches, treasureHourMinutes);
  const mult = treasureHour == null ? 1 : reward.treasureHourMultipliers?.[treasureHour] ?? 1;
  const projected = chanceAtLeastOneMixed(reward.odds, [
    { tries: base + planned, multiplier: 1 },
    { tries: thChests, multiplier: mult },
  ]);
  return {
    rewardId, method: report.method,
    currentChests: base, plannedChests: planned, treasureHourChests: thChests, treasureHourMultiplier: mult,
    projectedTotal: base + planned + thChests,
    projectedChance: projected,
    gain: projected - chanceAtLeastOne(reward.odds, base),
  };
}

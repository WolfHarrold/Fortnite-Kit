// Drop-chance maths. Generic: works for ANY "1 in X per attempt" reward
// (treasure chests, sprites, fishing, gizmos, future events).
//
// Core idea (same as FUNAGLET):
//   chance of at least one drop in n tries = 1 - (1 - 1/odds)^n
// We compute it as 1 - exp(n * log1p(-p)) so very rare odds (1 in 1,562,500) stay exact.

const clamp01 = (x) => Math.min(1, Math.max(0, x));

// p for one try. multiplier = Treasure Hour style boost (2 = twice as likely).
export const perTry = (odds, multiplier = 1) => clamp01(multiplier / odds);

// Chance of at least one drop.
export function chanceAtLeastOne(odds, tries, multiplier = 1) {
  const p = perTry(odds, multiplier);
  if (tries <= 0 || p === 0) return 0;
  if (p === 1) return 1;
  return 1 - Math.exp(tries * Math.log1p(-p));
}

// Mixed tries: some at normal odds, some boosted.
// segments = [{ tries, multiplier }]
export function chanceAtLeastOneMixed(odds, segments) {
  let logNone = 0;
  for (const { tries = 0, multiplier = 1 } of segments) {
    const p = perTry(odds, multiplier);
    if (p === 1 && tries > 0) return 1;
    logNone += tries * Math.log1p(-p);
  }
  return 1 - Math.exp(logNone);
}

// How many tries until the chance reaches `target` (0..1)?
export function triesForChance(odds, target, multiplier = 1) {
  const p = perTry(odds, multiplier);
  if (target <= 0) return 0;
  if (target >= 1 || p === 0) return Infinity;
  return Math.ceil(Math.log1p(-target) / Math.log1p(-p));
}

// Average number of drops (use for repeatable rewards like Gizmos).
export const expectedDrops = (odds, tries, multiplier = 1) => tries * perTry(odds, multiplier);

// FUNAGLET-style percentage text: 2 decimals.
export const pct = (x, dp = 2) => `${(x * 100).toFixed(dp)}%`;

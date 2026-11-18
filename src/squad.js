// Squad leaderboard: rank several players' PlayerStats on one metric.
// Players with an error (private stats, not found) or no matches go to the bottom.

export const SQUAD_METRICS = {
  wins: { label: 'WINS', get: (o) => o.wins, fmt: 0 },
  kd: { label: 'K/D', get: (o) => o.kd, fmt: 2 },
  winRate: { label: 'WIN %', get: (o) => o.winRate, fmt: 2, suffix: '%' },
  kills: { label: 'KILLS', get: (o) => o.kills, fmt: 0 },
  minutesPlayed: { label: 'TIME', get: (o) => o.minutesPlayed, time: true },
  matches: { label: 'MATCHES', get: (o) => o.matches, fmt: 0 },
};

export const SQUAD_MAX = 8;

// entries: [{ name, stats: PlayerStats | null, error: string | null }]
// returns the same entries, sorted, each with rank (1-based; null when it has no data) and value.
export function rankSquad(entries, metric = 'wins') {
  const m = SQUAD_METRICS[metric] ?? SQUAD_METRICS.wins;
  const scored = entries.map((e) => {
    const o = e.stats?.overall;
    const ok = !e.error && o && o.matches > 0;
    return { ...e, value: ok ? m.get(o) : null };
  });
  const good = scored.filter((e) => e.value != null).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  const bad = scored.filter((e) => e.value == null);
  let rank = 0; let prev = null;
  const ranked = good.map((e, i) => {
    if (e.value !== prev) { rank = i + 1; prev = e.value; } // ties share a rank
    return { ...e, rank };
  });
  return [...ranked, ...bad.map((e) => ({ ...e, rank: null }))];
}

// Normalise and validate a list of names: trimmed, no duplicates (case-insensitive), max SQUAD_MAX.
export function cleanSquadNames(names) {
  const seen = new Set(); const out = [];
  for (const raw of names ?? []) {
    const n = String(raw ?? '').trim();
    if (!/^[\p{L}\p{N} _.\-#]{2,32}$/u.test(n)) continue;
    const k = n.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k); out.push(n);
    if (out.length >= SQUAD_MAX) break;
  }
  return out;
}

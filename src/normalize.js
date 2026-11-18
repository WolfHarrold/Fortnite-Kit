// One common PlayerStats shape, no matter which source the data came from.
// UI code should only ever read this shape. Then you can swap sources freely.
//
// PlayerStats = {
//   source, timeWindow, fetchedAt,
//   account:   { id, name },
//   battlePass:{ level, progress } | null,
//   image:     stats card URL | null,
//   overall:   StatBlock,
//   byMode:    { solo, duo, trio, squad, ltm }      (StatBlock | null each)
//   byInput:   { keyboardMouse, gamepad, touch }    (StatBlock | null each)
//   byBuild:   { build, zeroBuild } | null          (only from raw Epic keys)
//   ranked:    StatBlock | null                     (only from raw Epic keys)
//   lastModified: ISO string | null
// }
// StatBlock = { matches, wins, kills, deaths, minutesPlayed, score, playersOutlived,
//               top3, top5, top6, top10, top12, top25,
//               winRate (%), kd, killsPerMatch, killsPerMin, scorePerMatch, hoursPlayed }

const COUNT_FIELDS = ['matches', 'wins', 'kills', 'deaths', 'minutesPlayed', 'score', 'playersOutlived', 'top3', 'top5', 'top6', 'top10', 'top12', 'top25'];

const round = (n, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;

export function emptyBlock() {
  return Object.fromEntries(COUNT_FIELDS.map((f) => [f, 0]));
}

// Fill in the derived numbers from the raw counts.
export function finishBlock(b) {
  if (!b) return null;
  const out = { ...emptyBlock(), ...b };
  if (!b.deaths) out.deaths = Math.max(out.matches - out.wins, 0); // trackers define deaths this way
  out.winRate = out.matches ? round((out.wins / out.matches) * 100) : 0;
  out.kd = round(out.kills / Math.max(out.deaths, 1));
  out.killsPerMatch = out.matches ? round(out.kills / out.matches) : 0;
  out.killsPerMin = out.minutesPlayed ? round(out.kills / out.minutesPlayed, 3) : 0;
  out.scorePerMatch = out.matches ? round(out.score / out.matches) : 0;
  out.hoursPlayed = round(out.minutesPlayed / 60, 1);
  return out;
}

function addInto(target, src) {
  for (const f of COUNT_FIELDS) target[f] = (target[f] ?? 0) + (src[f] ?? 0);
  return target;
}

function pickBlock(raw) {
  if (!raw) return null;
  const b = {};
  for (const f of COUNT_FIELDS) b[f] = Number(raw[f] ?? 0);
  return finishBlock(b);
}

// ---------- fortnite-api.com /v2/stats/br/v2 -> PlayerStats ----------
export function fromFortniteApiCom(data, { timeWindow = 'season' } = {}) {
  const s = data?.stats ?? {};
  const modes = (group) => ({
    solo: pickBlock(group?.solo), duo: pickBlock(group?.duo), trio: pickBlock(group?.trio),
    squad: pickBlock(group?.squad), ltm: pickBlock(group?.ltm),
  });
  return {
    source: 'fortnite-api.com',
    timeWindow,
    fetchedAt: new Date().toISOString(),
    account: { id: data?.account?.id ?? null, name: data?.account?.name ?? null },
    battlePass: data?.battlePass ?? null,
    image: data?.image ?? null,
    overall: pickBlock(s.all?.overall) ?? finishBlock(emptyBlock()),
    byMode: modes(s.all),
    byInput: {
      keyboardMouse: pickBlock(s.keyboardMouse?.overall),
      gamepad: pickBlock(s.gamepad?.overall),
      touch: pickBlock(s.touch?.overall),
    },
    byBuild: null,
    ranked: null,
    lastModified: s.all?.overall?.lastModified ?? null,
  };
}

// ---------- Epic raw stats rows (from statsProxy.parseStatsProxy) -> PlayerStats ----------
export function fromRawRows(rows, { account = {}, timeWindow = 'season', source = 'epic-statsproxy' } = {}) {
  // First rebuild one counts object per (input, playlist).
  const cells = new Map();
  let lastModified = 0;
  for (const r of rows) {
    if (r.stat === 'lastModified') { lastModified = Math.max(lastModified, r.value); continue; }
    const id = `${r.input}|${r.playlist}`;
    const cell = cells.get(id) ?? { input: r.input, playlist: r.playlist, build: r.build, team: r.team, ranked: r.ranked, counts: {} };
    cell.counts[r.stat] = (cell.counts[r.stat] ?? 0) + r.value;
    cells.set(id, cell);
  }
  const overall = emptyBlock();
  const byMode = {}; const byInput = {}; const byBuild = { build: emptyBlock(), zeroBuild: emptyBlock() };
  let ranked = null;
  for (const c of cells.values()) {
    addInto(overall, c.counts);
    byMode[c.team] = addInto(byMode[c.team] ?? emptyBlock(), c.counts);
    byInput[c.input] = addInto(byInput[c.input] ?? emptyBlock(), c.counts);
    addInto(byBuild[c.build], c.counts);
    if (c.ranked) ranked = addInto(ranked ?? emptyBlock(), c.counts);
  }
  const fin = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, finishBlock(v)]));
  return {
    source,
    timeWindow,
    fetchedAt: new Date().toISOString(),
    account: { id: account.id ?? null, name: account.name ?? null },
    battlePass: null,
    image: null,
    overall: finishBlock(overall),
    byMode: { solo: null, duo: null, trio: null, squad: null, ltm: null, ...fin(byMode) },
    byInput: { keyboardMouse: null, gamepad: null, touch: null, ...fin(byInput) },
    byBuild: { build: byBuild.build.matches ? finishBlock(byBuild.build) : null, zeroBuild: byBuild.zeroBuild.matches ? finishBlock(byBuild.zeroBuild) : null },
    ranked: finishBlock(ranked),
    lastModified: lastModified ? new Date(lastModified * 1000).toISOString() : null,
  };
}

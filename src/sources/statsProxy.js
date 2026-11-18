// Parser for Epic's RAW stats keys (the source of truth behind every tracker).
//
// Epic endpoint (needs an Epic access token with fortnite:stats READ — a logged-in account):
//   GET https://statsproxy-public-service-live.ol.epicgames.com/statsproxy/api/statsv2/account/{accountId}
//       ?startTime=<unix>&endTime=<unix>      (omit for lifetime; season = season start/end)
//   200 -> { accountId, startTime, endTime, stats: { "<key>": number, ... } }
//   204 -> stats are private
// Trackers (OliTracker, Fortnite Tracker) call this with bot accounts that use
// Epic "device auth" credentials. This kit does NOT log in to Epic. It only parses
// raw keys when a source hands them over (or when you paste a saved payload).
//
// Key format:  br_<stat>_<input>_m0_playlist_<playlist>
//   stat:     placetop1 (= wins), kills, matchesplayed, minutesplayed, score,
//             playersoutlived, placetop3/5/6/10/12/25, lastmodified
//   input:    keyboardmouse | gamepad | touch
//   playlist: defaultsolo, defaultduo, trios, defaultsquad, nobuildbr_solo,
//             nobuildbr_duo, nobuildbr_trio, nobuildbr_squad, habanerosolo (ranked), ...

const KEY_RE = /^br_([a-z0-9]+)_([a-z]+)_m0_playlist_(.+)$/;
const STAT_MAP = {
  placetop1: 'wins', kills: 'kills', matchesplayed: 'matches', minutesplayed: 'minutesPlayed',
  score: 'score', playersoutlived: 'playersOutlived', lastmodified: 'lastModified',
  placetop3: 'top3', placetop5: 'top5', placetop6: 'top6', placetop10: 'top10',
  placetop12: 'top12', placetop25: 'top25',
};
const INPUT_MAP = { keyboardmouse: 'keyboardMouse', gamepad: 'gamepad', touch: 'touch' };

// Best-effort classification of a playlist name. Playlist names change every season,
// so unknown names fall back to 'other' instead of breaking.
export function classifyPlaylist(playlist) {
  const p = playlist.toLowerCase();
  const build = /nobuild|zerobuild|_nb_|_nb$/.test(p) ? 'zeroBuild' : 'build';
  const ranked = /habanero|ranked/.test(p);
  const team =
    /solo/.test(p) ? 'solo' :
    /duo/.test(p) ? 'duo' :
    /trio/.test(p) ? 'trio' :
    /squad/.test(p) ? 'squad' : 'ltm';
  const standard = /^(default(solo|duo|squad)|trios|nobuildbr_(solo|duo|trio|squad)|habanero(solo|duo|trio|squad))$/.test(p);
  return { build, ranked, team, standard };
}

export function parseRawKey(key) {
  const m = KEY_RE.exec(key);
  if (!m) return null;
  const [, stat, input, playlist] = m;
  return { stat: STAT_MAP[stat] ?? stat, input: INPUT_MAP[input] ?? input, playlist, ...classifyPlaylist(playlist) };
}

// Sum raw keys into buckets. Returns rows you can group any way you like.
export function parseStatsProxy(payload) {
  const rows = [];
  for (const [key, value] of Object.entries(payload?.stats ?? {})) {
    const k = parseRawKey(key);
    if (k) rows.push({ ...k, value });
  }
  return rows;
}

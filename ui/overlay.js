// Loot Terminal stream overlay. Served by the Worker at /overlay. Add it to OBS as a Browser source.
//
// URL options (all optional except name):
//   name=<Epic name>               player to show
//   acct=epic|psn|xbl              platform (default epic)
//   theme=green|amber|blue|white   Phosphor preset (default green)
//   fields=wins,kd,winrate,token   cells to show, in order. Choices: wins, kd, winrate, kills,
//                                  matches, time, kpm, token
//   refresh=10                     minutes between updates (5 to 60; stats are cached 20 min anyway)
//   scale=1                        size multiplier (0.5 to 3)
//   bg=solid                       black background instead of transparent

import { getJson } from '../src/http.js';
import { treasureReport } from '../src/treasure.js';
import { pct } from '../src/odds.js';
import event from '../data/treasure-hunters-2026.json';

const q = new URLSearchParams(location.search);
const pick = (v, list, d) => (list.includes(v) ? v : d);
const name = (q.get('name') ?? '').trim();
const acct = pick(q.get('acct'), ['epic', 'psn', 'xbl'], 'epic');
const theme = pick(q.get('theme'), ['green', 'amber', 'blue', 'white'], 'green');
const refreshMin = Math.min(60, Math.max(5, +q.get('refresh') || 10));
const scale = Math.min(3, Math.max(0.5, +q.get('scale') || 1));
const FIELDS = {
  wins: { k: 'WINS', v: (o) => fmt(o.wins) },
  kd: { k: 'K/D', v: (o) => fmt(o.kd, 2) },
  winrate: { k: 'WIN %', v: (o) => `${fmt(o.winRate, 1)}%` },
  kills: { k: 'KILLS', v: (o) => fmt(o.kills) },
  matches: { k: 'MATCHES', v: (o) => fmt(o.matches) },
  time: { k: 'TIME ALIVE', v: (o) => `${Math.floor(o.minutesPlayed / 60)}H` },
  kpm: { k: 'KILLS/MATCH', v: (o) => fmt(o.killsPerMatch, 2) },
  token: { k: 'TOKEN', v: (o) => tokenChance(o) },
};
const fields = (q.get('fields') ?? 'wins,kd,winrate,token').split(',').map((s) => s.trim().toLowerCase()).filter((f) => FIELDS[f]).slice(0, 6);

document.documentElement.dataset.ph = theme;
document.documentElement.style.setProperty('--scale', String(scale));
if (q.get('bg') === 'solid') document.body.classList.add('ovl-solid');

const el = document.getElementById('ovl');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function fmt(x, dp = 0) { return x == null || Number.isNaN(+x) ? '—' : (+x).toLocaleString('en-AU', { maximumFractionDigits: dp, minimumFractionDigits: dp }); }
function tokenChance(o) {
  try { return pct(treasureReport({ event, matches: o.matches, minutesPlayed: o.minutesPlayed }).rewards[0].chance); }
  catch { return '—'; }
}

function show(html) { el.innerHTML = html; }

async function update() {
  if (!name) {
    show('<div class="ovl-msg">ADD ?name=YOUR_EPIC_NAME TO THE URL</div>');
    return;
  }
  try {
    const s = await getJson(`/api/stats/${encodeURIComponent(name)}?window=season&accountType=${acct}`, { source: 'worker' });
    const o = s.overall;
    show(`<div class="ovl-head"><span class="ovl-name">${esc(s.account?.name ?? name)}</span><span class="ovl-tag">SEASON</span></div>
      <div class="ovl-cells">${fields.map((f) => `<div class="ovl-cell"><span class="ovl-k">${FIELDS[f].k}</span><span class="ovl-v">${FIELDS[f].v(o)}</span></div>`).join('')}</div>`);
  } catch (err) {
    const st = err?.status;
    const msg = st === 403 ? 'PRIVATE STATS' : st === 404 ? 'PLAYER NOT FOUND' : st === 429 ? 'TOO MANY LOOKUPS' : 'NO DATA';
    // keep the last good numbers on screen if we have them
    if (!el.querySelector('.ovl-cells')) show(`<div class="ovl-msg ovl-alert">ERROR: ${msg}</div>`);
  }
}

update();
setInterval(update, refreshMin * 6e4);

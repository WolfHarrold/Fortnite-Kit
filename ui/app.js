// Loot Terminal — Fortnite stats terminal in the Phosphor design system.
// Built from fortnite-kit (same engine as the Worker). Bundled into one HTML file by ui/build.mjs.
//
// Data modes:
//   AUTO   -> WORKER if this page is served by the fortnite-kit Worker, else DEMO
//   DEMO   -> built-in sample data (works anywhere, including the Claude app)
//   DIRECT -> calls fortnite-api.com from the browser with YOUR key (kept in this browser only)
//   WORKER -> calls a fortnite-kit Worker (key stays in Cloudflare)

import { createFortniteApiCom } from '../src/sources/fortniteApiCom.js';
import { createEpicStatus } from '../src/sources/epicStatus.js';
import { fromFortniteApiCom } from '../src/normalize.js';
import { treasureReport, planTreasure, eventWeek } from '../src/treasure.js';
import { chanceAtLeastOneMixed, pct } from '../src/odds.js';
import { normalizeShop, normalizeNews, normalizeMap } from '../src/content.js';
import { createCache } from '../src/cache.js';
import { getJson } from '../src/http.js';
import event from '../data/treasure-hunters-2026.json';
import { DEMO } from './demo-data.js';

// ---------------------------------------------------------------- storage
const LS = 'lt.';
const ls = (k, d = null) => { try { const v = localStorage.getItem(LS + k); return v == null ? d : v; } catch { return d; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(LS + k) : localStorage.setItem(LS + k, String(v)); } catch { /* storage off */ } };
const lsStore = { get: (k) => ls('c.' + k), set: (k, v) => lsSet('c.' + k, v) };

// ---------------------------------------------------------------- state
const TABS = [
  { id: 'stat', label: 'STAT', subs: ['SEASON', 'CAREER', 'MODES', 'INPUT'] },
  { id: 'loot', label: 'LOOT', subs: ['ODDS', 'PLANNER', 'METHOD'] },
  { id: 'shop', label: 'SHOP', subs: ['ITEMS', 'NEWS'] },
  { id: 'map', label: 'MAP', subs: [] },
  { id: 'sys', label: 'SYS', subs: ['STATUS', 'SETTINGS'] },
];
const S = {
  tab: 0,
  sub: { stat: 0, loot: 0, shop: 0, map: 0, sys: 0 },
  cur: {},
  mode: ls('mode', 'auto'),
  resolved: 'demo',
  key: ls('key', ''),
  worker: ls('worker', ''),
  theme: ls('theme', 'green'),
  fx: ls('fx', 'on') === 'on',
  sound: ls('sound', 'on') === 'on',
  boot: ls('boot', 'on') === 'on',
  player: ls('player', ''),
  acct: ls('acct', 'epic'),
  window: 'season',
  chest: { method: ls('chestMethod', 'minutes'), rate: +ls('chestRate', event.chestsPerMinute ?? 2) },
  plan: { minutes: 60, matches: 0, thMinutes: 0, session: -1 },
  data: { career: null, shop: null, news: null, map: null, status: null },
  busy: {},
  err: {},
  list: null, // { key, len } for the view on screen
};

// ---------------------------------------------------------------- helpers
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n = (x, dp = 0) => (x == null || Number.isNaN(+x) ? '—' : (+x).toLocaleString('en-AU', { maximumFractionDigits: dp, minimumFractionDigits: dp }));
const hm = (min) => { const m = Math.round(min || 0); return `${Math.floor(m / 60)}H ${String(m % 60).padStart(2, '0')}M`; };
const pad = (x) => String(x).padStart(2, '0');
const dmy = (d) => { const x = new Date(d); return Number.isNaN(+x) ? '—' : `${pad(x.getDate())}.${pad(x.getMonth() + 1)}.${x.getFullYear()}`; };
const t12 = (d) => { const x = new Date(d); let h = x.getHours(); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${pad(h)}:${pad(x.getMinutes())}${ap}`; };
const bar = (f) => `<span class="bar"><i style="width:${Math.max(0, Math.min(1, f || 0)) * 100}%"></i></span>`;
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const tabId = () => TABS[S.tab].id;
const subName = () => TABS[S.tab].subs[S.sub[tabId()]] ?? '';
const curOf = (key, len) => { const i = S.cur[key] ?? 0; return Math.max(0, Math.min(i, Math.max(len - 1, 0))); };

function friendly(err) {
  const st = err?.status ?? 0;
  if (st === 400) return 'BAD REQUEST. CHECK THE NAME AND PLATFORM.';
  if (st === 401) return 'API KEY REFUSED. CHECK THE KEY IN SYS > SETTINGS.';
  if (st === 403) return 'PRIVATE STATS OR WRONG KEY. IN FORTNITE, TURN ON SHOW ON CAREER LEADERBOARD (ACCOUNT AND PRIVACY).';
  if (st === 404) return 'PLAYER NOT FOUND OR NO STATS. CHECK THE NAME AND PLATFORM.';
  if (st === 429) return 'TOO MANY REQUESTS. WAIT ONE MINUTE.';
  if (st === 0) return 'NETWORK BLOCKED OR OFFLINE. IN THE CLAUDE APP ONLY DEMO WORKS. OPEN THE PAGE FROM YOUR WORKER.';
  return String(err?.message ?? 'ERROR').toUpperCase();
}

// ---------------------------------------------------------------- data sources
const demoApi = {
  label: 'DEMO DATA',
  async career() {
    return { season: fromFortniteApiCom(DEMO.season, { timeWindow: 'season' }), lifetime: fromFortniteApiCom(DEMO.lifetime, { timeWindow: 'lifetime' }), demo: true };
  },
  shop: async () => normalizeShop(DEMO.shop),
  news: async () => normalizeNews(DEMO.news),
  map: async () => normalizeMap(DEMO.map),
  status: async () => DEMO.status,
};

function directApi() {
  if (!S.key) throw Object.assign(new Error('No API key'), { status: 401 });
  const fapi = createFortniteApiCom({ apiKey: S.key });
  const cache = createCache({ ttlMs: 20 * 6e4, store: lsStore });
  const stats = async (name, timeWindow) => {
    const r = await cache.getOrLoad(`${S.acct}:${timeWindow}:${name.toLowerCase()}`, async () =>
      fromFortniteApiCom(await fapi.statsByName(name, { timeWindow, accountType: S.acct }), { timeWindow }));
    return { ...r.value, cache: { cached: r.cached, savedAt: r.savedAt, refreshAvailableAt: r.refreshAvailableAt } };
  };
  return {
    label: 'FORTNITE-API.COM',
    career: async (name) => { const [season, lifetime] = await Promise.all([stats(name, 'season'), stats(name, 'lifetime')]); return { season, lifetime }; },
    shop: async () => normalizeShop(await fapi.shop()),
    news: async () => normalizeNews(await fapi.news('br')),
    map: async () => normalizeMap(await fapi.map()),
    status: () => createEpicStatus().fortnite(),
  };
}

function workerApi() {
  const base = (S.worker || '').replace(/\/+$/, '');
  const j = (p) => getJson(`${base}${p}`, { source: 'worker' });
  return {
    label: 'WORKER',
    career: (name) => j(`/api/career/${encodeURIComponent(name)}?accountType=${S.acct}`),
    shop: async () => normalizeShop(await j('/api/shop')),
    news: async () => normalizeNews(await j('/api/news/br')),
    map: async () => normalizeMap(await j('/api/map')),
    status: () => j('/api/status'),
  };
}

const api = () => (S.resolved === 'demo' ? demoApi : S.resolved === 'direct' ? directApi() : workerApi());

async function resolveMode() {
  if (S.mode !== 'auto') { S.resolved = S.mode; return; }
  S.resolved = 'demo';
  if (!/^https?:$/.test(location.protocol)) return;
  try {
    const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 2500);
    const r = await fetch('/api/health', { signal: ctrl.signal });
    const body = r.ok ? await r.json() : null;
    if (body?.ok) { S.resolved = 'worker'; S.worker = ''; }
  } catch { /* not served by the Worker */ }
}

async function load(what, ...args) {
  S.busy[what] = true; S.err[what] = null; render();
  try {
    S.data[what] = await api()[what](...args);
  } catch (e) {
    S.err[what] = friendly(e);
    S.data[what] = null; // never show the last player's data under a new error
  } finally {
    S.busy[what] = false; render();
  }
}

function scan(name) {
  const nm = (name ?? '').trim() || (S.resolved === 'demo' ? 'LilAvlis' : '');
  if (!nm) { S.err.career = 'TYPE AN EPIC NAME FIRST.'; render(); return; }
  S.player = nm; lsSet('player', nm);
  return load('career', nm);
}

function resetData() { S.data = { career: null, shop: null, news: null, map: null, status: null }; S.err = {}; }

// ---------------------------------------------------------------- treasure
function report() {
  const s = S.data.career?.season?.overall;
  if (!s) return null;
  try {
    return treasureReport({
      event, matches: s.matches, minutesPlayed: s.minutesPlayed,
      chestsPerMatch: S.chest.method === 'funaglet' ? 'funaglet' : undefined,
      chestsPerMinute: S.chest.rate,
    });
  } catch (e) { return { error: String(e.message).toUpperCase() }; }
}
const methodLabel = () => (S.chest.method === 'funaglet' ? `FUNAGLET ${event.chestsPerMatch.funaglet}/MATCH` : `${n(S.chest.rate, 1)} PER ALIVE MIN`);

// ---------------------------------------------------------------- sound
let actx = null;
function click() {
  if (!S.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime;
    const len = Math.floor(actx.sampleRate * 0.03);
    const buf = actx.createBuffer(1, len, actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    const src = actx.createBufferSource(); src.buffer = buf;
    const g = actx.createGain(); g.gain.value = 0.2;
    const f = actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800;
    src.connect(f).connect(g).connect(actx.destination); src.start(t);
    if (Math.random() < 0.7) {
      const b2 = actx.createBufferSource(); b2.buffer = buf; const g2 = actx.createGain(); g2.gain.value = 0.06;
      b2.playbackRate.value = 0.4; b2.connect(g2).connect(actx.destination); b2.start(t + 0.01);
    }
  } catch { /* audio not available */ }
}
function jolt() {
  if (!S.fx || reducedMotion()) return;
  const el = $('content'); el.classList.remove('jolt'); void el.offsetWidth; el.classList.add('jolt');
}

// ---------------------------------------------------------------- render: chrome
function renderTabs() {
  $('tabs').innerHTML = TABS.map((t, i) =>
    `<button class="tab${i === S.tab ? ' on' : ''}" data-tab="${i}" aria-current="${i === S.tab ? 'page' : 'false'}">${t.label}</button>`).join('');
  const subs = TABS[S.tab].subs;
  $('subtabs').innerHTML = subs.map((s, i) =>
    `<button class="sub${i === S.sub[tabId()] ? ' on' : ''}" role="tab" aria-selected="${i === S.sub[tabId()]}" data-sub="${i}">${s}</button>`).join('');
  $('subtabs').querySelector('.sub.on')?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  const src = S.resolved === 'demo' ? 'DEMO DATA' : S.resolved === 'direct' ? 'DIRECT · YOUR KEY' : 'WORKER';
  $('modeTag').textContent = `${src}${S.mode === 'auto' ? ' · AUTO' : ''}`;
}

function cell(label, value, extra = '') { return `<div class="cell"><span>${label}</span>${extra}<span>${value}</span></div>`; }

function renderFooter() {
  const c = S.data.career; const s = c?.season?.overall; const now = new Date();
  let html = '';
  switch (tabId()) {
    case 'stat': {
      const bp = c?.season?.battlePass;
      html = cell('WINS', s ? `${n(s.wins)}/${n(s.matches)}` : '—') +
        cell('BP', bp ? `LVL ${bp.level}` : '—', bp ? `<span class="xp"><i style="width:${bp.progress}%"></i></span>` : '') +
        cell('K/D', s ? n(s.kd, 2) : '—');
      break;
    }
    case 'loot': {
      const r = report(); const wk = eventWeek(event, now); const weeks = Math.ceil((Date.parse(event.end) - Date.parse(event.start)) / 6048e5);
      html = cell('CHESTS', r && !r.error ? n(r.seasonChests) : '—') + cell('WEEK', `${wk.weekNumber}/${weeks}`) +
        cell('TOKEN', r && !r.error ? pct(r.rewards[0].chance) : '—');
      break;
    }
    case 'shop': {
      const items = S.data.shop; const sale = items ? items.filter((i) => i.onSale).length : 0;
      html = cell('ITEMS', items ? n(items.length) : '—') + cell('ON SALE', items ? n(sale) : '—');
      break;
    }
    case 'map': html = cell('', dmy(now)) + cell('', t12(now)) + cell('POI', S.data.map ? n(S.data.map.pois.length) : '—'); break;
    case 'sys': html = cell('MODE', S.resolved.toUpperCase()) + cell('SERVERS', S.data.status ? (Object.values(S.data.status.components ?? {}).every((v) => v === 'operational') ? 'OK' : 'CHECK') : '—'); break;
  }
  $('footer').innerHTML = html;
}

// ---------------------------------------------------------------- render: shared parts
function stateLine(what, emptyText) {
  if (S.busy[what]) return `<div class="msg">SCANNING<span class="cursor"></span></div>`;
  if (S.err[what]) return `<div class="msg alert" role="alert">ERROR: ${esc(S.err[what])}</div>`;
  if (!S.data[what] && emptyText) return `<div class="msg">${emptyText}</div>`;
  return '';
}

function playerPrompt() {
  const acct = ['epic', 'psn', 'xbl'].map((a) => `<button class="${a === S.acct ? 'on' : ''}" data-acct="${a}">${a.toUpperCase()}</button>`).join('');
  return `<form class="prompt" id="scanForm" autocomplete="off">
    <label for="playerName">❯ PLAYER</label>
    <input type="text" id="playerName" value="${esc(S.player || (S.resolved === 'demo' ? 'LilAvlis' : ''))}" placeholder="Epic name" spellcheck="false" autocapitalize="off">
    <span class="seg" role="group" aria-label="Platform">${acct}</span>
    <button class="btn" type="submit">SCAN</button>
  </form>`;
}

function cacheNote(season) {
  const ch = season?.cache;
  if (!ch) return S.data.career?.demo ? 'SAMPLE DATA' : '';
  const mins = Math.max(0, Math.ceil((Date.parse(ch.refreshAvailableAt) - Date.now()) / 6e4));
  return `UPDATED ${t12(ch.savedAt)}${mins ? ` · REFRESH IN ${mins} MIN` : ' · REFRESH READY'}`;
}

const MODE_ROWS = [['solo', 'Solo'], ['duo', 'Duos'], ['trio', 'Trios'], ['squad', 'Squads'], ['ltm', 'Limited Modes']];
const INPUT_ROWS = [['keyboardMouse', 'Keyboard and Mouse'], ['gamepad', 'Controller'], ['touch', 'Touch']];

function blockCards(b) {
  if (!b) return '<div class="cards"><div class="card"><span>NO DATA</span></div></div>';
  const tops = ['top3', 'top5', 'top6', 'top10', 'top12', 'top25'].filter((k) => b[k]).map((k) => [k.replace('top', 'TOP '), n(b[k])]);
  const rows = [
    ['MATCHES', n(b.matches)], ['WINS', n(b.wins)], ['WIN RATE', `${n(b.winRate, 2)}%`], ['KILLS', n(b.kills)],
    ['K/D', n(b.kd, 2)], ['KILLS/MATCH', n(b.killsPerMatch, 2)], ['TIME ALIVE', hm(b.minutesPlayed)], ...tops,
  ];
  return `<div class="cards">${rows.map(([k, v], i) => `<div class="card${i === 2 ? ' hi' : ''}"><span class="k">${k}</span><span>${v}</span></div>`).join('')}</div>`;
}

function listView(key, rows, detail) {
  // rows: [{ l, r, s, dim }]
  const i = curOf(key, rows.length);
  S.list = { key, len: rows.length };
  const lis = rows.map((row, k) => `<li class="row${k === i ? ' cur' : ''}${row.dim ? ' dim' : ''}${row.act ? ' act' : ''}" data-list="${key}" data-i="${k}" aria-selected="${k === i}">
      <span>${esc(row.l)}${row.s ? ` <span class="s">${esc(row.s)}</span>` : ''}</span><span class="r">${row.r ?? ''}</span></li>`).join('');
  return `<div class="split"><ul class="list" role="listbox" aria-label="${key}">${lis}</ul><div>${detail(i)}</div></div>`;
}

function windowToggle() {
  return `<div class="inline" style="margin-bottom:0.6rem"><span class="seg" role="group" aria-label="Time window">
    <button data-window="season" class="${S.window === 'season' ? 'on' : ''}">SEASON</button>
    <button data-window="lifetime" class="${S.window === 'lifetime' ? 'on' : ''}">LIFETIME</button></span></div>`;
}

// ---------------------------------------------------------------- render: views
const views = {
  'stat/SEASON'() {
    const c = S.data.career; const s = c?.season;
    let out = playerPrompt() + stateLine('career', 'TYPE AN EPIC NAME AND PRESS SCAN.');
    if (!s || S.busy.career) return out;
    const o = s.overall; const bp = s.battlePass;
    out += `<div class="h"><span>${esc(s.account.name)}</span><span class="s">${esc(cacheNote(s))}</span></div>`;
    out += `<div class="grid">
      ${fig('MATCHES', n(o.matches))}
      ${fig('WINS', n(o.wins), `${n(o.winRate, 2)}% WIN RATE`)}
      ${fig('KILLS', n(o.kills), `${n(o.killsPerMatch, 2)} PER MATCH`)}
      ${fig('K/D', n(o.kd, 2))}
      ${fig('TIME ALIVE', hm(o.minutesPlayed), `${n(o.minutesPlayed ? o.minutesPlayed / Math.max(o.matches, 1) : 0, 1)} MIN PER MATCH`)}
      ${placementFigs(o)}
      ${fig('BATTLE PASS', bp ? `LVL ${bp.level}` : '—', bp ? `${bp.progress}% TO NEXT` : '')}
    </div>`;
    out += `<div class="h"><span>WIN RATE</span><span class="s">${n(o.wins)}/${n(o.matches)}</span></div><div class="barrow">${bar(o.winRate / 100)}<span>${n(o.winRate, 2)}%</span></div>`;
    const r = report();
    if (r && !r.error) {
      out += `<div class="h"><span>TREASURE</span><span class="s">${methodLabel()}</span></div>
        <div class="barrow"><span>PIRATE SHOP ACCESS</span>${bar(r.rewards[0].chance)}<span>${pct(r.rewards[0].chance)}</span></div>
        <p class="p">Estimated from ${n(r.seasonChests)} chests. Open LOOT for every reward.</p>`;
    }
    return out;
  },

  'stat/CAREER'() {
    const c = S.data.career;
    let out = stateLine('career', 'SCAN A PLAYER ON STAT > SEASON FIRST.');
    if (!c || S.busy.career) return out;
    const s = c.season.overall; const l = c.lifetime.overall;
    const rows = [
      ['MATCHES', s.matches, l.matches, 0], ['WINS', s.wins, l.wins, 0], ['KILLS', s.kills, l.kills, 0],
      ['TIME ALIVE (H)', s.minutesPlayed / 60, l.minutesPlayed / 60, 1], ['WIN RATE %', s.winRate, l.winRate, 2], ['K/D', s.kd, l.kd, 2], ['KILLS/MATCH', s.killsPerMatch, l.killsPerMatch, 2],
    ];
    out += `<div class="h"><span>${esc(c.season.account.name)} · CAREER</span><span class="s">SEASON / LIFETIME</span></div>`;
    out += `<div class="cards">${rows.map(([k, a, b, dp], i) => {
      const share = i < 4 && b ? a / b : null;
      const trend = i >= 4 ? (a > b ? 'ABOVE CAREER' : a < b ? 'BELOW CAREER' : 'SAME') : `${n((share ?? 0) * 100, 1)}% THIS SEASON`;
      return `<div class="card"><span class="k">${k}</span><span>${n(a, dp)} / ${n(b, dp)} <span class="s" style="color:var(--t2)">${trend}</span></span></div>`;
    }).join('')}</div>`;
    out += `<div class="h"><span>SEASON SHARE OF CAREER MATCHES</span><span class="s">${n(s.matches)}/${n(l.matches)}</span></div><div class="barrow">${bar(l.matches ? s.matches / l.matches : 0)}<span>${n(l.matches ? (s.matches / l.matches) * 100 : 0, 1)}%</span></div>`;
    return out;
  },

  'stat/MODES'() { return splitStats('modes', MODE_ROWS, 'byMode'); },
  'stat/INPUT'() { return splitStats('input', INPUT_ROWS, 'byInput'); },

  'loot/ODDS'() {
    let out = stateLine('career', 'SCAN A PLAYER ON STAT > SEASON FIRST.');
    const r = report();
    if (!r || S.busy.career) return out;
    if (r.error) return out + `<div class="msg alert">ERROR: ${esc(r.error)}</div>`;
    const wk = r.week;
    out += `<div class="h"><span>${esc(event.name)} · WEEK ${wk.weekNumber}${wk.ended ? ' · ENDED' : ''}</span><span class="s">ENDS ${dmy(event.end)}</span></div>`;
    out += `<p class="p">Chests: <b>${n(r.seasonChests)}</b> this season, <b>${n(r.weekChests)}</b> this week. Method: ${methodLabel()}.</p>`;
    const rows = r.rewards.map((w) => ({ l: w.name, r: pct(w.chance), s: w.scope === 'week' ? 'WEEK' : '' }));
    out += listView('odds', rows, (i) => {
      const w = r.rewards[i];
      const perMin = S.chest.method === 'funaglet' ? (r.avgMinutesPerMatch ? r.chestsPerMatch / r.avgMinutesPerMatch : 0) : S.chest.rate;
      const t50 = perMin ? w.chestsFor50 / perMin : null;
      return `<div class="big">${pct(w.chance)}</div><p class="p">Chance you got at least one so far.</p>
        <div class="barrow" style="margin:0.4rem 0 0.7rem">${bar(w.chance)}</div>
        <div class="cards">
          <div class="card"><span class="k">ODDS</span><span>1 IN ${n(w.odds)}</span></div>
          <div class="card"><span class="k">COUNTS</span><span>${w.scope === 'week' ? 'THIS WEEK' : 'WHOLE SEASON'}</span></div>
          <div class="card"><span class="k">CHESTS</span><span>${n(w.chests)}</span></div>
          <div class="card hi"><span class="k">NO DROP</span><span>${pct(w.noChance)}</span></div>
          <div class="card"><span class="k">50% NEEDS</span><span>${n(w.chestsFor50)} CHESTS</span></div>
          <div class="card"><span class="k">90% NEEDS</span><span>${n(w.chestsFor90)} CHESTS</span></div>
          ${t50 != null ? `<div class="card"><span class="k">50% TIME ALIVE</span><span>${hm(t50)}</span></div>` : ''}
          ${w.expected != null ? `<div class="card"><span class="k">EXPECTED</span><span>${n(w.expected, 1)} DROPS</span></div>` : ''}
        </div>`;
    });
    return out;
  },

  'loot/PLANNER'() {
    let out = stateLine('career', 'SCAN A PLAYER ON STAT > SEASON FIRST.');
    const r = report();
    if (!r || S.busy.career) return out;
    if (r.error) return out + `<div class="msg alert">ERROR: ${esc(r.error)}</div>`;
    const rows = r.rewards.map((w) => ({ l: w.name, r: pct(w.chance) }));
    out += `<p class="p">Pick a reward. Enter how much more you will play. The result updates as you type.</p>`;
    out += listView('plan', rows, () => `
      <div class="field"><label for="pMin">EXTRA TIME ALIVE (MIN)</label><input type="number" id="pMin" min="0" step="10" value="${S.plan.minutes}"></div>
      <div class="field"><label for="pMatch">EXTRA MATCHES</label><input type="number" id="pMatch" min="0" step="1" value="${S.plan.matches}">
        <span class="hint">One match = ${n(r.chestsPerMatch, 1)} chests at your average.</span></div>
      <div class="field"><label for="pTh">TREASURE HOUR TIME ALIVE (MIN)</label><input type="number" id="pTh" min="0" step="10" value="${S.plan.thMinutes}"></div>
      <div class="field"><label>TREASURE HOUR SESSION</label><span class="seg" role="group" aria-label="Treasure Hour session">
        ${[-1, 0, 1].map((v) => `<button data-session="${v}" class="${S.plan.session === v ? 'on' : ''}">${v < 0 ? 'OFF' : `S${v + 1}`}</button>`).join('')}</span></div>
      <div id="planOut">${planOut(r)}</div>`);
    return out;
  },

  'loot/METHOD'() {
    const r = report(); const s = S.data.career?.season?.overall;
    const minutesOn = S.chest.method === 'minutes';
    let out = `<div class="h"><span>CHEST ESTIMATE</span><span class="s">${methodLabel()}</span></div>
      <span class="seg" role="group" aria-label="Chest method">
        <button data-method="minutes" class="${minutesOn ? 'on' : ''}">ALIVE MINUTES</button>
        <button data-method="funaglet" class="${!minutesOn ? 'on' : ''}">FUNAGLET 50/MATCH</button></span>
      <div class="field"><label for="rate">CHESTS PER ALIVE MINUTE</label>
        <input type="number" id="rate" min="0.1" max="10" step="0.1" value="${S.chest.rate}" ${minutesOn ? '' : 'disabled'}>
        <span class="hint">2 = one chest every 30 seconds. Epic counts alive minutes only, so an early death adds few chests.</span></div>`;
    if (s) {
      const calc = (opts) => { try { return treasureReport({ event, matches: s.matches, minutesPlayed: s.minutesPlayed, ...opts }); } catch { return null; } };
      const a = calc({ chestsPerMinute: S.chest.rate }); const b = calc({ chestsPerMatch: 'funaglet' });
      out += `<div class="h"><span>COMPARE FOR ${esc(S.data.career.season.account.name)}</span><span class="s">${n(s.matches)} MATCHES · ${hm(s.minutesPlayed)}</span></div>
        <div class="cards">
          <div class="card${minutesOn ? ' hi' : ''}"><span class="k">ALIVE × ${n(S.chest.rate, 1)}</span><span>${a ? `${n(a.seasonChests)} CHESTS · ${pct(a.rewards[0].chance)}` : '—'}</span></div>
          <div class="card${!minutesOn ? ' hi' : ''}"><span class="k">FUNAGLET</span><span>${b ? `${n(b.seasonChests)} CHESTS · ${pct(b.rewards[0].chance)}` : '—'}</span></div>
        </div><p class="p">Percent = Pirate Shop Access, 1 in ${n(event.rewards[0].odds)} per chest.</p>`;
    }
    out += `<div class="h"><span>THE MATHS</span></div>
      <p class="p">Chance of at least one drop = 1 − (1 − 1/odds)<sup>chests</sup>. Weekly rewards use this season's chests divided by the weeks so far. Treasure Hour chests use boosted odds.</p>`;
    if (r?.error) out += `<div class="msg alert">ERROR: ${esc(r.error)}</div>`;
    return out;
  },

  'shop/ITEMS'() {
    let out = stateLine('shop', 'NO SHOP DATA.');
    const items = S.data.shop; if (!items || S.busy.shop) return out;
    const rows = items.map((it) => ({ l: it.name, s: it.kind, r: `${n(it.price)}${it.onSale ? ' ▼' : ''}` }));
    out += `<div class="h"><span>ITEM SHOP</span><span class="s">${n(items.length)} OFFERS · V-BUCKS</span></div>`;
    out += listView('shop', rows, (i) => {
      const it = items[i];
      return `${img(it.image, it.kind)}
        <div class="h" style="margin-top:0.6rem"><span>${esc(it.name)}</span></div>
        <div class="cards">
          <div class="card"><span class="k">TYPE</span><span>${esc(it.kind)}${it.items > 1 ? ` (${it.items})` : ''}</span></div>
          ${it.rarity ? `<div class="card"><span class="k">RARITY</span><span>${esc(it.rarity)}</span></div>` : ''}
          <div class="card hi"><span class="k">PRICE</span><span>${n(it.price)} V-BUCKS${it.onSale ? ` (WAS ${n(it.regularPrice)})` : ''}</span></div>
          ${it.section ? `<div class="card"><span class="k">SECTION</span><span>${esc(it.section)}</span></div>` : ''}
          ${it.outDate ? `<div class="card"><span class="k">LEAVES</span><span>${dmy(it.outDate)}</span></div>` : ''}
        </div>`;
    });
    return out;
  },

  'shop/NEWS'() {
    let out = stateLine('news', 'NO NEWS.');
    const list = S.data.news; if (!list || S.busy.news) return out;
    out += listView('news', list.map((m) => ({ l: m.title })), (i) => {
      const m = list[i];
      return `${img(m.image, 'NEWS', true)}<div class="h" style="margin-top:0.6rem"><span>${esc(m.title)}</span></div><p class="p">${esc(m.body)}</p>`;
    });
    return out;
  },

  'map/'() {
    let out = stateLine('map', 'NO MAP DATA.');
    const m = S.data.map; if (!m || S.busy.map) return out;
    const pois = [...m.pois].sort((a, b) => (b.named - a.named) || a.name.localeCompare(b.name));
    const visual = m.image ? img(m.image, 'MAP', false, 'map') : `<canvas class="map" id="mapCanvas" width="640" height="640" aria-label="Schematic map with ${pois.length} places"></canvas>`;
    out += listView('map', pois.map((p) => ({ l: p.name, s: p.named ? '' : 'LANDMARK', act: true })), () => visual);
    out += m.image ? '<p class="p">Live map image. Place names are on the image.</p>' : '<p class="p">Schematic of sample places. The cursor place is marked.</p>';
    return out;
  },

  'sys/STATUS'() {
    let out = stateLine('status', 'NO STATUS DATA.');
    const st = S.data.status; if (!st || S.busy.status) return out;
    const comps = Object.entries(st.components ?? {});
    out += `<div class="h"><span>EPIC SERVER STATUS</span><span class="s">${t12(new Date())}</span></div><div class="big" style="font-size:1.6rem">${esc(String(st.overall).toUpperCase())}</div>`;
    out += `<ul class="list" style="margin-top:0.6rem">${comps.map(([k, v]) => {
      const ok = v === 'operational';
      return `<li class="row"><span>${esc(k)}</span><span class="r${ok ? '' : ' alert'}">${ok ? 'ONLINE' : `WARNING: ${esc(v.replace(/_/g, ' ').toUpperCase())}`}</span></li>`;
    }).join('') || '<li class="row dim"><span>NO FORTNITE COMPONENTS LISTED</span></li>'}</ul>`;
    out += `<div class="h"><span>DATA LINK</span></div><div class="cards">
      <div class="card"><span class="k">MODE</span><span>${S.resolved.toUpperCase()}${S.mode === 'auto' ? ' (AUTO)' : ''}</span></div>
      <div class="card"><span class="k">STATS</span><span>${S.resolved === 'demo' ? 'SAMPLE DATA' : 'FORTNITE-API.COM'}</span></div>
      <div class="card"><span class="k">CACHE</span><span>20 MIN PER PLAYER</span></div></div>`;
    return out;
  },

  'sys/SETTINGS'() {
    const seg = (name, opts, cur) => `<span class="seg" role="group" aria-label="${name}">${opts.map(([v, l]) => `<button data-set="${name}" data-val="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</span>`;
    return `
      <div class="field"><label>DATA MODE</label>${seg('mode', [['auto', 'AUTO'], ['demo', 'DEMO'], ['direct', 'DIRECT'], ['worker', 'WORKER']], S.mode)}
        <span class="hint">Now: ${S.resolved.toUpperCase()}. AUTO uses the Worker when this page comes from your Worker, else DEMO.</span></div>
      <div class="field"><label for="apiKey">FORTNITE-API.COM KEY (DIRECT MODE)</label>
        <div class="inline"><input type="password" id="apiKey" value="${esc(S.key)}" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" autocomplete="off" spellcheck="false">
        <button class="btn" data-action="saveKey">SAVE</button><button class="btn" data-action="clearKey">CLEAR</button></div>
        <span class="hint">Stays in this browser only. Never put the key in the page code. With the Worker you do not need it here.</span></div>
      <div class="field"><label for="workerUrl">WORKER URL (WORKER MODE)</label>
        <div class="inline"><input type="url" id="workerUrl" value="${esc(S.worker)}" placeholder="https://fortnite-kit.you.workers.dev">
        <button class="btn" data-action="saveWorker">SAVE</button></div>
        <span class="hint">Leave empty when this page is served by the Worker.</span></div>
      <div class="field"><label>THEME</label>${seg('theme', [['green', 'GREEN'], ['amber', 'AMBER'], ['blue', 'BLUE'], ['white', 'WHITE']], S.theme)}</div>
      <div class="field"><label>EFFECTS</label>${seg('fx', [['on', 'ON'], ['off', 'OFF']], S.fx ? 'on' : 'off')}</div>
      <div class="field"><label>SOUND</label>${seg('sound', [['on', 'ON'], ['off', 'OFF']], S.sound ? 'on' : 'off')}</div>
      <div class="field"><label>BOOT SEQUENCE</label>${seg('boot', [['on', 'ON'], ['off', 'OFF']], S.boot ? 'on' : 'off')}</div>
      <div class="field"><label>LOCAL DATA</label><div class="inline"><button class="btn" data-action="wipe">CLEAR SAVED SETTINGS AND CACHE</button></div></div>`;
  },
};

// Placement tiles: show the two most useful placements that have data.
// Epic only counts some placements in some modes (top25 = Solo only, top6 = Trios/Squads), so 0 often means "not tracked".
function placementFigs(o) {
  const order = ['top10', 'top25', 'top5', 'top3', 'top6', 'top12'];
  const picks = order.filter((k) => (o[k] ?? 0) > 0).slice(0, 2);
  const tiles = picks.map((k) => fig(k.replace('top', 'TOP '), n(o[k]), `${n((o[k] / Math.max(o.matches, 1)) * 100, 1)}% OF MATCHES`));
  if (tiles.length < 2) tiles.push(fig('DEATHS', n(o.deaths)));
  if (tiles.length < 2) tiles.push(fig('SCORE', n(o.score)));
  return tiles.join('');
}

function fig(k, v, note = '') { return `<div class="fig"><div class="k">${k}</div><div class="v">${v}</div>${note ? `<div class="n">${note}</div>` : ''}</div>`; }

function img(url, label, wide = false, extra = '') {
  const initials = esc(String(label).split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase());
  if (!url || S.resolved === 'demo') return `<div class="ph${wide ? ' wide' : ''}" aria-hidden="true">${initials}</div>`;
  return `<div class="tint${wide ? ' wide' : ''} ${extra}" data-ph="${initials}"><img src="${esc(url)}" alt="" loading="lazy" referrerpolicy="no-referrer"></div>`;
}

function splitStats(key, defs, field) {
  let out = stateLine('career', 'SCAN A PLAYER ON STAT > SEASON FIRST.');
  const c = S.data.career; if (!c || S.busy.career) return out;
  const ps = S.window === 'season' ? c.season : c.lifetime;
  const blocks = defs.map(([id]) => ps[field]?.[id] ?? null);
  const max = Math.max(1, ...blocks.map((b) => b?.matches ?? 0));
  out += windowToggle();
  const rows = defs.map(([, label], k) => ({ l: label, r: blocks[k] ? n(blocks[k].matches) : '—', dim: !blocks[k]?.matches }));
  out += listView(key, rows, (i) => `<div class="h"><span>${defs[i][1]}</span><span class="s">${S.window.toUpperCase()}</span></div>
    <div class="barrow" style="margin-bottom:0.5rem"><span class="s" style="color:var(--t2)">SHARE</span>${bar((blocks[i]?.matches ?? 0) / max)}</div>${blockCards(blocks[i])}`);
  return out;
}

function planOut(r) {
  const rows = r.rewards; const i = curOf('plan', rows.length); const reward = event.rewards[i];
  const p = planTreasure({
    event, report: r, rewardId: reward.id,
    plannedMinutes: S.plan.minutes, plannedMatches: S.plan.matches,
    treasureHourMinutes: S.plan.thMinutes, treasureHour: S.plan.session < 0 ? null : S.plan.session,
  });
  const before = rows[i].chance;
  return `<div class="h"><span>${esc(reward.name)}</span><span class="s">${p.treasureHourMultiplier > 1 ? `TREASURE HOUR ×${p.treasureHourMultiplier}` : 'NORMAL ODDS'}</span></div>
    <div class="big">${pct(p.projectedChance)}</div>
    <p class="p">Now ${pct(before)}. Gain <b>+${pct(p.gain)}</b> from ${n(p.plannedChests + p.treasureHourChests)} more chests (${n(p.projectedTotal)} total).</p>
    ${chanceChart(r, reward, p.currentChests, p.plannedChests + p.treasureHourChests)}`;
}

// Chance vs extra hours alive. Area fill t4, line t1, endpoint marked.
function chanceChart(r, reward, base, planned) {
  const perMin = S.chest.method === 'funaglet' ? (r.avgMinutesPerMatch ? r.chestsPerMatch / r.avgMinutesPerMatch : 0) : S.chest.rate;
  if (!perMin) return '';
  const perHour = perMin * 60;
  const need50 = Math.max(0, Math.log1p(-0.5) / Math.log1p(-1 / reward.odds) - base) / perHour;
  const H = Math.min(500, Math.max(10, Math.ceil(need50 * 2 / 10) * 10));
  const W = 320; const Ht = 120; const L = 34; const B = 18; const T = 8;
  const f = (h) => chanceAtLeastOneMixed(reward.odds, [{ tries: base + h * perHour, multiplier: 1 }]);
  const pts = Array.from({ length: 41 }, (_, k) => { const h = (H * k) / 40; return [h, f(h)]; });
  const yMax = Math.min(1, Math.max(0.05, Math.ceil(pts[pts.length - 1][1] * 10) / 10));
  const X = (h) => L + (h / H) * (W - L - 6); const Y = (v) => T + (1 - v / yMax) * (Ht - T - B);
  const line = pts.map(([h, v]) => `${X(h).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const area = `${X(0)},${Y(0)} ${line} ${X(H)},${Y(0)}`;
  const planH = Math.min(H, planned / perHour);
  const ticks = Array.from({ length: 21 }, (_, k) => { const x = L + (k / 20) * (W - L - 6); const len = k % 4 === 0 ? 5 : 3; return `<line x1="${x}" y1="${Ht - B}" x2="${x}" y2="${Ht - B + len}" stroke="var(--t1)" stroke-width="1"/>`; }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${Ht + 8}" role="img" aria-label="Chance rises from ${pct(f(0))} now to ${pct(f(H))} after ${H} more hours alive">
    <line x1="${L}" y1="${T}" x2="${L}" y2="${Ht - B}" stroke="var(--t1)"/><line x1="${L}" y1="${Ht - B}" x2="${W - 6}" y2="${Ht - B}" stroke="var(--t1)"/>
    <line x1="${L}" y1="${Y(yMax / 2)}" x2="${W - 6}" y2="${Y(yMax / 2)}" stroke="var(--t4)"/>
    ${ticks}
    <polygon points="${area}" fill="var(--t4)"/>
    <polyline points="${line}" fill="none" stroke="var(--t1)" stroke-width="1.5"/>
    ${planned ? `<line x1="${X(planH)}" y1="${T}" x2="${X(planH)}" y2="${Ht - B}" stroke="var(--t2)" stroke-dasharray="2 2"/><rect x="${X(planH) - 2}" y="${Y(f(planH)) - 2}" width="4" height="4" fill="var(--t1)"/>` : ''}
    <rect x="${X(H) - 2}" y="${Y(f(H)) - 2}" width="4" height="4" fill="var(--t1)"/>
    <text x="${L - 4}" y="${T + 4}" text-anchor="end">${Math.round(yMax * 100)}%</text>
    <text x="${L - 4}" y="${Ht - B}" text-anchor="end">0%</text>
    <text x="${L}" y="${Ht + 5}" text-anchor="start">+0H</text>
    <text x="${X(H / 2)}" y="${Ht + 5}" text-anchor="middle">+${H / 2}H</text>
    <text x="${X(H)}" y="${Ht + 5}" text-anchor="end">+${H}H</text>
  </svg><p class="p">Chance after more hours alive at ${n(perMin, 1)} chests per minute.</p>`;
}

function drawMap() {
  const cv = $('mapCanvas'); const m = S.data.map; if (!cv || !m) return;
  const ctx = cv.getContext('2d'); const W = cv.width; const H = cv.height;
  const css = getComputedStyle(document.documentElement);
  const t1 = css.getPropertyValue('--t1').trim(); const t3 = css.getPropertyValue('--t3').trim(); const t4 = css.getPropertyValue('--t4').trim();
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = t4; ctx.lineWidth = 1;
  for (let k = 0; k <= 8; k++) { const p = (k / 8) * W; ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, H); ctx.moveTo(0, p); ctx.lineTo(W, p); ctx.stroke(); }
  // island outline: a seeded blob
  ctx.beginPath();
  for (let a = 0; a <= 64; a++) {
    const th = (a / 64) * Math.PI * 2; const r = W * (0.36 + 0.05 * Math.sin(th * 3) + 0.03 * Math.cos(th * 7));
    const x = W / 2 + Math.cos(th) * r; const y = H / 2 + Math.sin(th) * r; a ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath(); ctx.fillStyle = t4; ctx.fill(); ctx.strokeStyle = t1; ctx.stroke();
  const pois = [...m.pois].sort((a, b) => (b.named - a.named) || a.name.localeCompare(b.name));
  const ext = Math.max(...pois.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y))), 1) * 1.25;
  const cur = curOf('map', pois.length);
  ctx.font = '700 15px "Roboto Condensed", sans-serif'; ctx.textAlign = 'center';
  pois.forEach((p, k) => {
    const x = W / 2 + (p.y / ext) * (W / 2); const y = H / 2 - (p.x / ext) * (H / 2);
    const on = k === cur; const s = on ? 10 : p.named ? 6 : 4;
    ctx.fillStyle = on ? t1 : t3; ctx.fillRect(x - s / 2, y - s / 2, s, s);
    if (on) { ctx.strokeStyle = t1; ctx.strokeRect(x - 9, y - 9, 18, 18); }
    ctx.fillStyle = on ? t1 : t3; ctx.fillText(p.name.toUpperCase(), x, y - 12);
  });
}

// ---------------------------------------------------------------- main render
function render() {
  document.documentElement.dataset.ph = S.theme;
  document.body.classList.toggle('nofx', !S.fx);
  S.list = null;
  renderTabs();
  const key = `${tabId()}/${subName()}`;
  $('content').innerHTML = (views[key] ?? (() => ''))();
  renderFooter();
  if (key === 'map/') drawMap();
}

function ensureData() {
  const t = tabId();
  if (t === 'shop' && subName() === 'ITEMS' && !S.data.shop && !S.busy.shop && !S.err.shop) load('shop');
  if (t === 'shop' && subName() === 'NEWS' && !S.data.news && !S.busy.news && !S.err.news) load('news');
  if (t === 'map' && !S.data.map && !S.busy.map && !S.err.map) load('map');
  if (t === 'sys' && subName() === 'STATUS' && !S.data.status && !S.busy.status && !S.err.status) load('status');
}

function goTab(i) { S.tab = (i + TABS.length) % TABS.length; click(); jolt(); render(); ensureData(); $('content').scrollTop = 0; }
function goSub(i) { const subs = TABS[S.tab].subs; if (!subs.length) return; const v = Math.max(0, Math.min(subs.length - 1, i)); if (v === S.sub[tabId()]) return; S.sub[tabId()] = v; click(); render(); ensureData(); $('content').scrollTop = 0; }
function moveCursor(d) {
  if (!S.list) return; const { key, len } = S.list; const v = Math.max(0, Math.min(len - 1, curOf(key, len) + d));
  S.cur[key] = v; render(); document.querySelector('.row.cur')?.scrollIntoView({ block: 'nearest' });
}

// ---------------------------------------------------------------- events
document.addEventListener('click', (e) => {
  const el = e.target.closest('button, .row'); if (!el) return;
  const d = el.dataset;
  if (d.tab != null) return goTab(+d.tab);
  if (d.sub != null) return goSub(+d.sub);
  if (d.list != null) { S.cur[d.list] = +d.i; click(); return render(); }
  if (d.acct) { e.preventDefault(); S.acct = d.acct; lsSet('acct', d.acct); return render(); }
  if (d.window) { S.window = d.window; return render(); }
  if (d.session != null) { S.plan.session = +d.session; return render(); }
  if (d.method) { S.chest.method = d.method; lsSet('chestMethod', d.method); return render(); }
  if (d.set) {
    const v = d.val;
    if (d.set === 'mode') { S.mode = v; lsSet('mode', v); resetData(); resolveMode().then(() => { render(); if (S.player || S.resolved === 'demo') scan(S.player); }); return; }
    if (d.set === 'theme') { S.theme = v; lsSet('theme', v); }
    if (d.set === 'fx') { S.fx = v === 'on'; lsSet('fx', v); }
    if (d.set === 'sound') { S.sound = v === 'on'; lsSet('sound', v); }
    if (d.set === 'boot') { S.boot = v === 'on'; lsSet('boot', v); }
    click(); return render();
  }
  if (d.action === 'saveKey') { S.key = $('apiKey').value.trim(); lsSet('key', S.key || null); resetData(); return render(); }
  if (d.action === 'clearKey') { S.key = ''; lsSet('key', null); resetData(); return render(); }
  if (d.action === 'saveWorker') { S.worker = $('workerUrl').value.trim(); lsSet('worker', S.worker || null); resetData(); return render(); }
  if (d.action === 'wipe') {
    try { Object.keys(localStorage).filter((k) => k.startsWith(LS)).forEach((k) => localStorage.removeItem(k)); } catch { /* */ }
    location.reload();
  }
});

document.addEventListener('submit', (e) => {
  if (e.target.id === 'scanForm') { e.preventDefault(); click(); scan($('playerName').value); }
});

document.addEventListener('input', (e) => {
  const id = e.target.id;
  if (id === 'rate') { const v = +e.target.value; if (v > 0) { S.chest.rate = v; lsSet('chestRate', v); renderFooter(); } return; }
  if (['pMin', 'pMatch', 'pTh'].includes(id)) {
    const v = Math.max(0, +e.target.value || 0);
    if (id === 'pMin') S.plan.minutes = v; if (id === 'pMatch') S.plan.matches = v; if (id === 'pTh') S.plan.thMinutes = v;
    const r = report(); if (r && !r.error) $('planOut').innerHTML = planOut(r);
  }
});
document.addEventListener('change', (e) => { if (e.target.id === 'rate') render(); });

document.addEventListener('error', (e) => {
  if (e.target.tagName === 'IMG') { const box = e.target.closest('.tint'); if (box) box.outerHTML = `<div class="ph${box.classList.contains('wide') ? ' wide' : ''}">${box.dataset.ph ?? ''}</div>`; }
}, true);

document.addEventListener('keydown', (e) => {
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') { if (e.key === 'Escape') e.target.blur(); return; }
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const k = e.key.toLowerCase();
  if (k === 'arrowleft') { e.preventDefault(); goTab(S.tab - 1); }
  else if (k === 'arrowright') { e.preventDefault(); goTab(S.tab + 1); }
  else if (k === 'a' || k === 'q') goSub(S.sub[tabId()] - 1);
  else if (k === 'd' || k === 'e') goSub(S.sub[tabId()] + 1);
  else if (k === 'arrowup') { e.preventDefault(); moveCursor(-1); }
  else if (k === 'arrowdown') { e.preventDefault(); moveCursor(1); }
});

// ---------------------------------------------------------------- boot
function bootSequence() {
  return new Promise((done) => {
    let seen = false; try { seen = sessionStorage.getItem('lt.booted') === '1'; sessionStorage.setItem('lt.booted', '1'); } catch { /* */ }
    if (!S.boot || seen || reducedMotion()) return done();
    const el = document.createElement('div'); el.className = 'boot'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<div class="hex"></div><div class="typed"></div>'; document.body.appendChild(el);
    const hex = el.querySelector('.hex'); const typed = el.querySelector('.typed');
    let finished = false; const finish = () => { if (finished) return; finished = true; el.remove(); done(); };
    el.addEventListener('click', finish);
    let line = 0;
    const hexTimer = setInterval(() => {
      const addr = (0xa4 + line * 16).toString(16).toUpperCase().padStart(6, '0');
      hex.textContent += `0X${addr} ${Array.from({ length: 4 }, () => Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0')).join(' ')}\n`;
      if (++line >= 14) {
        clearInterval(hexTimer);
        const text = `\nLOOT TERMINAL\n❯ DATA LINK ........ ${S.resolved.toUpperCase()}\n❯ EVENT ............ ${event.name.toUpperCase()}\n❯ READY`;
        let c = 0; const typeTimer = setInterval(() => { typed.textContent = text.slice(0, ++c); if (c >= text.length) { clearInterval(typeTimer); setTimeout(finish, 350); } }, 17);
      }
    }, 30);
  });
}

// ---------------------------------------------------------------- start
(async function start() {
  render();
  await resolveMode();
  await bootSequence();
  render();
  if (S.resolved === 'demo') { await scan('LilAvlis'); }
  else if (S.player) { scan(S.player); }
})();

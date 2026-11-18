import test from 'node:test';
import assert from 'node:assert/strict';
import { fromFortniteApiCom, fromRawRows } from '../src/normalize.js';
import { parseStatsProxy, parseRawKey, classifyPlaylist } from '../src/sources/statsProxy.js';
import { metricsToRows } from '../src/sources/epicEcosystem.js';
import { fixture } from './helpers.js';

test('fortnite-api.com payload -> PlayerStats', () => {
  const s = fromFortniteApiCom(fixture('fortnite-api-com.season.LilAvlis.json').data);
  assert.equal(s.account.name, 'LilAvlis');
  assert.equal(s.overall.matches, 350);
  assert.equal(s.overall.wins, 73);
  assert.equal(s.overall.kills, 940);
  assert.equal(s.overall.hoursPlayed, 67.6); // 67h 35m
  assert.equal(s.overall.winRate, 20.86);
  assert.equal(s.overall.kd, 3.39); // 940 / (350 - 73)
  assert.equal(s.byMode.solo.matches, 350);
  assert.equal(s.byMode.duo, null);
  assert.equal(s.byInput.gamepad, null);
  assert.equal(s.battlePass.level, 87);
});

test('raw Epic key parser', () => {
  assert.deepEqual(parseRawKey('br_placetop1_keyboardmouse_m0_playlist_nobuildbr_solo'), {
    stat: 'wins', input: 'keyboardMouse', playlist: 'nobuildbr_solo', build: 'zeroBuild', ranked: false, team: 'solo', standard: true,
  });
  assert.equal(parseRawKey('not_a_br_key'), null);
  assert.equal(classifyPlaylist('habanerosolo').ranked, true);
  assert.equal(classifyPlaylist('melt_duos').team, 'duo');
  assert.equal(classifyPlaylist('melt_duos').standard, false);
});

test('raw Epic payload -> PlayerStats with Build / Zero Build / Ranked split', () => {
  const rows = parseStatsProxy(fixture('epic-statsproxy.LilAvlis.json'));
  const s = fromRawRows(rows, { account: { name: 'LilAvlis' } });
  assert.equal(s.overall.matches, 365); // 350 ZB + 12 ranked + 3 LTM
  assert.equal(s.byBuild.zeroBuild.matches, 350);
  assert.equal(s.byBuild.build.matches, 15);
  assert.equal(s.ranked.matches, 12);
  assert.equal(s.byInput.gamepad.matches, 12);
  assert.equal(s.byMode.solo.matches, 362);
  assert.equal(s.byMode.duo.matches, 3);
  assert.equal(s.lastModified, '2026-11-18T00:40:00.000Z');
});

test('Epic Ecosystem metrics -> rows', () => {
  const rows = metricsToRows(fixture('epic-ecosystem.metrics.json'));
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { timestamp: '2026-11-16T00:00:00.000Z', plays: 1200, peakCCU: 90, retentionD1: 0.21, retentionD7: 0.05 });
  assert.equal(rows[1].plays, 1500);
});

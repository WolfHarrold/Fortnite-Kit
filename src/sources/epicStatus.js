// Epic server status. status.epicgames.com is a standard Atlassian Statuspage,
// so it has the standard public JSON API. No key.
//   /api/v2/summary.json    overall status + every component (Fortnite, login, matchmaking...)
//   /api/v2/incidents/unresolved.json
//   /api/v2/scheduled-maintenances/upcoming.json
// Use this for a "Is Fortnite down?" widget and for scheduled downtime before a new season.

import { getJson } from '../http.js';

const BASE = 'https://status.epicgames.com/api/v2';

export function createEpicStatus({ fetch, timeoutMs } = {}) {
  const get = (p) => getJson(`${BASE}/${p}`, { fetch, timeoutMs, source: 'epic-status' });
  return {
    source: 'epic-status',
    summary: () => get('summary.json'),
    unresolvedIncidents: () => get('incidents/unresolved.json'),
    upcomingMaintenance: () => get('scheduled-maintenances/upcoming.json'),
    // Only the Fortnite components, as { name: status }
    async fortnite() {
      const s = await get('summary.json');
      const out = { overall: s?.status?.description ?? 'unknown', components: {} };
      const all = s?.components ?? [];
      // Statuspage groups: a group is a component with group: true; children point to it by group_id.
      const groupIds = new Set(all.filter((c) => c.group && /fortnite/i.test(c.name)).map((c) => c.id));
      for (const c of all) {
        if (c.group) continue;
        if (groupIds.has(c.group_id) || /fortnite/i.test(c.name)) out.components[c.name] = c.status;
      }
      return out;
    },
  };
}

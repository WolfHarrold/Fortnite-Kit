import { readFileSync } from 'node:fs';

export const fixture = (name) => JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8'));
export const event = JSON.parse(readFileSync(new URL('../data/treasure-hunters-2026.json', import.meta.url), 'utf8'));

// Fake fetch: routes = [[regex, status, body]]. Records every call.
export function mockFetch(routes) {
  const calls = [];
  const f = async (url, init = {}) => {
    calls.push({ url: String(url), headers: init.headers ?? {} });
    for (const [re, status, body] of routes) {
      if (re.test(String(url))) {
        return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
      }
    }
    return new Response(JSON.stringify({ error: 'no mock' }), { status: 404 });
  };
  f.calls = calls;
  return f;
}

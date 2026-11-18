// Small fetch helper shared by every source client.
// It adds the key header, a timeout, JSON parsing and one clear error type.

export class FortniteKitError extends Error {
  constructor(message, { status = 0, source = '', url = '', body = null } = {}) {
    super(message);
    this.name = 'FortniteKitError';
    this.status = status; // HTTP status (0 = network or timeout)
    this.source = source; // which source client threw it
    this.url = url;
    this.body = body;
  }
}

// Build a URL with query params. Skips params that are null, undefined or ''.
export function buildUrl(base, path, params = {}) {
  const url = new URL(path.replace(/^\//, ''), base.endsWith('/') ? base : base + '/');
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    url.searchParams.set(k, String(v));
  }
  return url.toString();
}

// GET a JSON resource.
// opts.fetch lets tests (or a Worker) inject their own fetch.
export async function getJson(url, { headers = {}, timeoutMs = 15000, fetch: f = globalThis.fetch, source = '' } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await f(url, { headers: { Accept: 'application/json', ...headers }, signal: ctrl.signal });
  } catch (err) {
    throw new FortniteKitError(`Network error: ${err.message}`, { source, url });
  } finally {
    clearTimeout(timer);
  }
  // 204 = no body. Epic's stats proxy uses 204 for private stats.
  if (res.status === 204) return null;
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const msg = (body && (body.error || body.message)) || res.statusText || 'Request failed';
    throw new FortniteKitError(`${source} ${res.status}: ${msg}`, { status: res.status, source, url, body });
  }
  return body;
}

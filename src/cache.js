// TTL cache with a refresh cooldown, like FUNAGLET's "Refresh available in 20 minutes".
// Store is pluggable: a Map (default, memory), localStorage, or a Worker KV wrapper
// with async get/set. Values are stored as { value, savedAt }.

export function createCache({ ttlMs = 20 * 6e4, store = new Map(), now = () => Date.now() } = {}) {
  const read = async (k) => {
    const raw = await store.get(k);
    if (raw == null) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  };
  const write = async (k, entry) => store.set(k, store instanceof Map ? entry : JSON.stringify(entry));

  return {
    // Get fresh value or run loader. Returns { value, cached, savedAt, refreshAvailableAt }.
    // While the entry is fresh, a refresh is refused (cooldown) — same rule FUNAGLET uses.
    async getOrLoad(key, loader) {
      const hit = await read(key);
      const fresh = hit && now() - hit.savedAt < ttlMs;
      if (fresh) {
        return { value: hit.value, cached: true, savedAt: new Date(hit.savedAt).toISOString(), refreshAvailableAt: new Date(hit.savedAt + ttlMs).toISOString() };
      }
      const value = await loader();
      const savedAt = now();
      await write(key, { value, savedAt });
      return { value, cached: false, savedAt: new Date(savedAt).toISOString(), refreshAvailableAt: new Date(savedAt + ttlMs).toISOString() };
    },
  };
}

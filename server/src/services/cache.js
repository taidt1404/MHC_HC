function createCache(defaultTtlMs = 1500) {
  const store = new Map();

  function get(key) {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return entry.value;
  }

  function set(key, value, ttlMs = defaultTtlMs) {
    store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  function del(key) {
    store.delete(key);
  }

  function clear() {
    store.clear();
  }

  return { get, set, del, delete: del, clear };
}

module.exports = { createCache };

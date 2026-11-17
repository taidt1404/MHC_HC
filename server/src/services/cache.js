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

  function clear() {
    store.clear();
  }

  return { get, set, clear };
}

module.exports = { createCache };

class LruCache {
  constructor(limit = 1000) {
    this._limit = 0;
    this._items = new Map();
    this.setLimit(limit);
  }

  setLimit(limit) {
    const parsed = Number(limit);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error('LruCache limit must be a positive integer');
    };
    this._limit = parsed;
    this._enforceLimit_();
    return this._limit;
  }

  limit() {
    return this._limit;
  }

  size() {
    return this._items.size;
  }

  has(key) {
    return this._items.has(key);
  }

  get(key) {
    if (!this._items.has(key)) {
      return null;
    };
    const value = this._items.get(key);
    this._items.delete(key);
    this._items.set(key, value);
    return value;
  }

  peek(key) {
    if (!this._items.has(key)) {
      return null;
    };
    return this._items.get(key);
  }

  set(key, value) {
    if (this._items.has(key)) {
      this._items.delete(key);
    };
    this._items.set(key, value);
    this._enforceLimit_();
    return value;
  }

  delete(key) {
    return this._items.delete(key);
  }

  clear() {
    this._items.clear();
  }

  keys() {
    return Array.from(this._items.keys());
  }

  values() {
    return Array.from(this._items.values());
  }

  entries() {
    return Array.from(this._items.entries());
  }

  _enforceLimit_() {
    while (this._items.size > this._limit) {
      const oldestKey = this._items.keys().next().value;
      this._items.delete(oldestKey);
    };
  }

  *[Symbol.iterator]() {
    yield* this._items.entries();
  }
}

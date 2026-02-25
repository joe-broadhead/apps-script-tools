class Queue {
  constructor() {
    this._items = [];
    this._headIndex = 0;

    Object.defineProperty(this, 'items', {
      get: () => this.toArray(),
      set: (value) => {
        const next = Array.isArray(value) ? value.slice() : [];
        this._items = next;
        this._headIndex = 0;
      },
      enumerable: true
    });
  }

  enqueue(item) {
    this._items.push(item);
  }

  dequeue() {
    if (this.isEmpty()) {
      throw new Error("Queue is empty");
    };

    const item = this._items[this._headIndex];
    this._items[this._headIndex] = undefined;
    this._headIndex += 1;

    this._compact_();
    return item;
  }

  peek() {
    if (this.isEmpty()) {
      throw new Error("Queue is empty");
    };
    return this._items[this._headIndex];
  }

  isEmpty() {
    return this.size() === 0;
  }

  size() {
    return this._items.length - this._headIndex;
  }

  clear() {
    this._items = [];
    this._headIndex = 0;
  }

  toArray() {
    if (this.isEmpty()) {
      return [];
    };
    return this._items.slice(this._headIndex);
  }

  _compact_() {
    if (this._headIndex === 0) {
      return;
    };
    if (this._headIndex < 64 && this._headIndex * 2 < this._items.length) {
      return;
    };

    this._items = this.toArray();
    this._headIndex = 0;
  }

  *[Symbol.iterator]() {
    for (let i = this._headIndex; i < this._items.length; i += 1) {
      yield this._items[i];
    };
  }
};

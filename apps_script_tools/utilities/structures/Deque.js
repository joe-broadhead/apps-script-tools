class Deque {
  constructor() {
    this._items = Object.create(null);
    this._frontIndex = 0;
    this._backIndex = -1;

    Object.defineProperty(this, 'items', {
      get: () => this.toArray(),
      set: (value) => {
        this.clear();
        if (!Array.isArray(value)) {
          return;
        };
        for (let i = 0; i < value.length; i += 1) {
          this.addBack(value[i]);
        };
      },
      enumerable: true
    });
  }

  addFront(item) {
    this._frontIndex -= 1;
    this._items[this._frontIndex] = item;
  }

  addBack(item) {
    this._backIndex += 1;
    this._items[this._backIndex] = item;
  }

  removeFront() {
    if (this.isEmpty()) {
      throw new Error("Deque is empty");
    };

    const item = this._items[this._frontIndex];
    delete this._items[this._frontIndex];
    this._frontIndex += 1;
    this._normalizeWhenEmpty_();
    return item;
  }

  removeBack() {
    if (this.isEmpty()) {
      throw new Error("Deque is empty");
    };

    const item = this._items[this._backIndex];
    delete this._items[this._backIndex];
    this._backIndex -= 1;
    this._normalizeWhenEmpty_();
    return item;
  }

  peekFront() {
    if (this.isEmpty()) {
      throw new Error("Deque is empty");
    };
    return this._items[this._frontIndex];
  }

  peekBack() {
    if (this.isEmpty()) {
      throw new Error("Deque is empty");
    };
    return this._items[this._backIndex];
  }

  isEmpty() {
    return this._backIndex < this._frontIndex;
  }

  size() {
    if (this.isEmpty()) {
      return 0;
    };
    return this._backIndex - this._frontIndex + 1;
  }

  clear() {
    this._items = Object.create(null);
    this._frontIndex = 0;
    this._backIndex = -1;
  }

  toArray() {
    if (this.isEmpty()) {
      return [];
    };
    const output = [];
    for (let i = this._frontIndex; i <= this._backIndex; i += 1) {
      output.push(this._items[i]);
    };
    return output;
  }

  _normalizeWhenEmpty_() {
    if (this.isEmpty()) {
      this._frontIndex = 0;
      this._backIndex = -1;
    };
  }

  print() {
    console.log(this.toArray());
  }

  *[Symbol.iterator]() {
    for (let i = this._frontIndex; i <= this._backIndex; i += 1) {
      yield this._items[i];
    };
  }
};
  

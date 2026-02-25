class PriorityQueue {
  constructor() {
    this._heap = [];
    this._sequence = 0;

    Object.defineProperty(this, 'items', {
      get: () => this.toArray(),
      set: (value) => {
        this.clear();
        if (!Array.isArray(value)) {
          return;
        };
        for (let i = 0; i < value.length; i += 1) {
          const item = value[i];
          if (item && Object.prototype.hasOwnProperty.call(item, 'priority')) {
            this.enqueue(item.value, item.priority);
          };
        };
      },
      enumerable: true
    });
  }

  enqueue(value, priority) {
    const element = {
      value,
      priority,
      _seq: this._sequence
    };
    this._sequence += 1;

    this._heap.push(element);
    this._bubbleUp_(this._heap.length - 1);
  }

  dequeue() {
    if (this.isEmpty()) {
      throw new Error("PriorityQueue is empty");
    };

    const top = this._heap[0];
    const last = this._heap.pop();
    if (this._heap.length > 0) {
      this._heap[0] = last;
      this._bubbleDown_(0);
    };
    return { value: top.value, priority: top.priority };
  }

  peek() {
    if (this.isEmpty()) {
      throw new Error("PriorityQueue is empty");
    }
    const top = this._heap[0];
    return { value: top.value, priority: top.priority };
  }

  isEmpty() {
    return this._heap.length === 0;
  }

  size() {
    return this._heap.length;
  }

  clear() {
    this._heap = [];
    this._sequence = 0;
  }

  toArray() {
    return (
      this._heap
      .slice()
      .sort((a, b) => this._compare_(a, b))
      .map(item => ({ value: item.value, priority: item.priority }))
    );
  }

  _compare_(a, b) {
    if (a.priority !== b.priority) {
      if (typeof a.priority === 'number' && typeof b.priority === 'number') {
        return a.priority - b.priority;
      };
      if (typeof a.priority === 'string' && typeof b.priority === 'string') {
        return a.priority.localeCompare(b.priority);
      };
      return a.priority > b.priority ? 1 : -1;
    };
    return a._seq - b._seq;
  }

  _swap_(leftIndex, rightIndex) {
    const tmp = this._heap[leftIndex];
    this._heap[leftIndex] = this._heap[rightIndex];
    this._heap[rightIndex] = tmp;
  }

  _bubbleUp_(index) {
    let current = index;
    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);
      if (this._compare_(this._heap[current], this._heap[parent]) >= 0) {
        break;
      };
      this._swap_(current, parent);
      current = parent;
    };
  }

  _bubbleDown_(index) {
    let current = index;
    const size = this._heap.length;
    while (true) {
      const left = current * 2 + 1;
      const right = left + 1;
      let smallest = current;

      if (left < size && this._compare_(this._heap[left], this._heap[smallest]) < 0) {
        smallest = left;
      };
      if (right < size && this._compare_(this._heap[right], this._heap[smallest]) < 0) {
        smallest = right;
      };
      if (smallest === current) {
        break;
      };

      this._swap_(current, smallest);
      current = smallest;
    };
  }

  print() {
    console.log(this.toArray().map(({ value, priority }) => `[${value}, priority: ${priority}]`).join(" -> "));
  }

  *[Symbol.iterator]() {
    for (const item of this.toArray()) {
      yield item;
    };
  }
}

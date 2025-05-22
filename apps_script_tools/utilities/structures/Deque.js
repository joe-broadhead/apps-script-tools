class Deque {
  constructor() {
    this.items = [];
  }

  addFront(item) {
    this.items.unshift(item);
  }

  addBack(item) {
    this.items.push(item);
  }

  removeFront() {
    if (this.isEmpty()) {
      throw new Error("Deque is empty");
    };
    return this.items.shift();
  }

  removeBack() {
    if (this.isEmpty()) {
      throw new Error("Deque is empty");
    };
    return this.items.pop();
  }

  peekFront() {
    if (this.isEmpty()) {
      throw new Error("Deque is empty");
    };
    return this.items[0];
  }

  peekBack() {
    if (this.isEmpty()) {
      throw new Error("Deque is empty");
    };
    return this.items[this.items.length - 1];
  }

  isEmpty() {
    return this.items.length === 0;
  }

  size() {
    return this.items.length;
  }

  clear() {
    this.items = [];
  }

  print() {
    console.log(this.items);
  }

  *[Symbol.iterator]() {
    for (const item of this.items) {
      yield item;
    };
  }
};
  
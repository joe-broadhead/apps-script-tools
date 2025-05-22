class PriorityQueue {
  constructor() {
    this.items = [];
  }

  enqueue(value, priority) {
    const element = { value, priority };

    const index = this.items.findIndex(item => item.priority > priority);

    if (index === -1) {
      this.items.push(element);
    } else {
      this.items.splice(index, 0, element);
    };
  }

  dequeue() {
    if (this.isEmpty()) {
      throw new Error("PriorityQueue is empty");
    };
    return this.items.shift();
  }

  peek() {
    if (this.isEmpty()) {
      throw new Error("PriorityQueue is empty");
    }
    return this.items[0];
  }

  isEmpty() {
    return this.items.length === 0;
  }

  size() {
    return this.items.length;
  }

  print() {
    console.log(this.items.map(({ value, priority }) => `[${value}, priority: ${priority}]`).join(" -> "));
  }

  *[Symbol.iterator]() {
    for (const item of this.items) {
      yield item;
    };
  }
}

class Node {
  constructor(data) {
    this.data = data;
    this.next = null;
  }
};

class LinkedList {
  constructor() {
    this.head = null;
    this.size = 0;
  }

  append(data) {
    const newNode = new Node(data);
    if (this.head === null) {
      this.head = newNode;
    } else {
      let current = this.head;
      while (current.next !== null) {
        current = current.next;
      };
      current.next = newNode;
    };
    this.size++;
  }

  prepend(data) {
    const newNode = new Node(data);
    newNode.next = this.head;
    this.head = newNode;
    this.size++;
  }

  remove(data) {
    if (this.head === null) return;

    if (this.head.data === data) {
      this.head = this.head.next;
      this.size--;
      return;
    };

    let current = this.head;
    while (current.next !== null && current.next.data !== data) {
      current = current.next;
    };

    if (current.next !== null) {
      current.next = current.next.next;
      this.size--;
    };
  }

  find(data) {
    let current = this.head;
    while (current !== null) {
      if (current.data === data) {
        return current;
      }
      current = current.next;
    };
    return null; // Not found
  }

  print() {
    const result = [];
    let current = this.head;
    while (current !== null) {
      result.push(current.data);
      current = current.next;
    };
    console.log(result);
  }

  getSize() {
    return this.size;
  }

  *[Symbol.iterator]() {
    let current = this.head;
    while (current !== null) {
      yield current.data;
      current = current.next;
    };
  }
};

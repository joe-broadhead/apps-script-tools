class DisjointSet {
  constructor(values = []) {
    this.parent = new Map();
    this.rank = new Map();
    this.sizeByRoot = new Map();
    this.setCount = 0;

    if (Array.isArray(values)) {
      for (let i = 0; i < values.length; i += 1) {
        this.makeSet(values[i]);
      };
    };
  }

  makeSet(value) {
    if (this.parent.has(value)) {
      return false;
    };
    this.parent.set(value, value);
    this.rank.set(value, 0);
    this.sizeByRoot.set(value, 1);
    this.setCount += 1;
    return true;
  }

  has(value) {
    return this.parent.has(value);
  }

  find(value) {
    if (!this.parent.has(value)) {
      this.makeSet(value);
    };
    const parent = this.parent.get(value);
    if (parent !== value) {
      const root = this.find(parent);
      this.parent.set(value, root);
      return root;
    };
    return parent;
  }

  union(left, right) {
    const leftRoot = this.find(left);
    const rightRoot = this.find(right);

    if (leftRoot === rightRoot) {
      return leftRoot;
    };

    const leftRank = this.rank.get(leftRoot);
    const rightRank = this.rank.get(rightRoot);

    if (leftRank < rightRank) {
      this.parent.set(leftRoot, rightRoot);
      this.sizeByRoot.set(rightRoot, this.sizeByRoot.get(rightRoot) + this.sizeByRoot.get(leftRoot));
      this.sizeByRoot.delete(leftRoot);
      this.setCount -= 1;
      return rightRoot;
    };

    if (leftRank > rightRank) {
      this.parent.set(rightRoot, leftRoot);
      this.sizeByRoot.set(leftRoot, this.sizeByRoot.get(leftRoot) + this.sizeByRoot.get(rightRoot));
      this.sizeByRoot.delete(rightRoot);
      this.setCount -= 1;
      return leftRoot;
    };

    this.parent.set(rightRoot, leftRoot);
    this.rank.set(leftRoot, leftRank + 1);
    this.sizeByRoot.set(leftRoot, this.sizeByRoot.get(leftRoot) + this.sizeByRoot.get(rightRoot));
    this.sizeByRoot.delete(rightRoot);
    this.setCount -= 1;
    return leftRoot;
  }

  connected(left, right) {
    if (!this.has(left) || !this.has(right)) {
      return false;
    };
    return this.find(left) === this.find(right);
  }

  size(value) {
    if (!this.has(value)) {
      return 0;
    };
    return this.sizeByRoot.get(this.find(value));
  }

  count() {
    return this.setCount;
  }

  groups() {
    const groupsByRoot = new Map();
    for (const value of this.parent.keys()) {
      const root = this.find(value);
      if (!groupsByRoot.has(root)) {
        groupsByRoot.set(root, []);
      };
      groupsByRoot.get(root).push(value);
    };
    return Array.from(groupsByRoot.values());
  }
}

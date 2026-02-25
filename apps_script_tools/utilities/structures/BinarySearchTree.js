class BinarySearchTree {
  constructor() {
    this.root = null;
  }

  insert(value) {
    const newNode = new Node(value);
    if (this.root === null) {
      this.root = newNode;
    } else {
      this._insertNode(this.root, newNode);
    };
  }

  _insertNode(node, newNode) {
    if (newNode.value < node.value) {
      if (node.left === null) {
        node.left = newNode;
      } else {
        this._insertNode(node.left, newNode);
      };
    } else {
      if (node.right === null) {
        node.right = newNode;
      } else {
        this._insertNode(node.right, newNode);
      };
    };
  }

  search(value) {
    return this._searchNode(this.root, value);
  }

  _searchNode(node, value) {
    if (node === null) return false;
    if (value === node.value) return true;
    return value < node.value
      ? this._searchNode(node.left, value)
      : this._searchNode(node.right, value);
  }

  inOrderTraversal(callback) {
    this._inOrderTraversal(this.root, callback);
  }

  _inOrderTraversal(node, callback) {
    if (node !== null) {
      this._inOrderTraversal(node.left, callback);
      callback(node.value);
      this._inOrderTraversal(node.right, callback);
    };
  }

  print() {
    const result = [];
    this.inOrderTraversal(value => result.push(value));
    console.log(result);
  }

  bfs() {
    if (this.root === null) return [];
    const queue = [this.root];
    const result = [];

    while (queue.length > 0) {
      const node = queue.shift();
      result.push(node.value);

      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    };
    return result;
  }

  *[Symbol.iterator]() {
    function* inOrderTraversal(node) {
      if (node !== null) {
        yield* inOrderTraversal(node.left);
        yield node.value;
        yield* inOrderTraversal(node.right);
      };
    };
    yield* inOrderTraversal(this.root);
  ;}
}

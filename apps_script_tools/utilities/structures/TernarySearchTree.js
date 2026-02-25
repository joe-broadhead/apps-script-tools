class TSTNode {
  constructor(character) {
    this.character = character;
    this.left = null;
    this.middle = null;
    this.right = null;
    this.isEndOfWord = false;
  }
}

class TernarySearchTree {
  constructor() {
    this.root = null;
  }

  insert(word) {
    const insertNode = (node, word, index) => {
      const char = word[index];

      if (node === null) {
        node = new TSTNode(char);
      };

      if (char < node.character) {
        node.left = insertNode(node.left, word, index);
      } else if (char > node.character) {
        node.right = insertNode(node.right, word, index);
      } else {
        if (index + 1 === word.length) {
          node.isEndOfWord = true;
        } else {
          node.middle = insertNode(node.middle, word, index + 1);
        };
      };

      return node;
    };

    this.root = insertNode(this.root, word, 0);
  }

  search(word) {
    const searchNode = (node, word, index) => {
      if (node === null) return false;
      const char = word[index];

      if (char < node.character) {
        return searchNode(node.left, word, index);
      } else if (char > node.character) {
        return searchNode(node.right, word, index);
      } else {
        if (index + 1 === word.length) {
          return node.isEndOfWord;
        };
        return searchNode(node.middle, word, index + 1);
      };
    };

    return searchNode(this.root, word, 0);
  };
}

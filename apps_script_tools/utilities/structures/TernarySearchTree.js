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
    if (typeof word !== 'string' || word.trim().length === 0) {
      return;
    };

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
    if (typeof word !== 'string' || word.length === 0) {
      return false;
    };

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
  }

  startsWith(prefix) {
    if (typeof prefix !== 'string' || prefix.length === 0) {
      return false;
    };

    const traverseNode = (node, prefix, index) => {
      if (node === null) return null;
      const char = prefix[index];

      if (char < node.character) {
        return traverseNode(node.left, prefix, index);
      };
      if (char > node.character) {
        return traverseNode(node.right, prefix, index);
      };
      if (index + 1 === prefix.length) {
        return node;
      };
      return traverseNode(node.middle, prefix, index + 1);
    };

    return traverseNode(this.root, prefix, 0) !== null;
  }

  autocomplete(prefix, limit = Infinity) {
    if (typeof prefix !== 'string' || prefix.length === 0) {
      return [];
    };

    const traverseNode = (node, prefix, index) => {
      if (node === null) return null;
      const char = prefix[index];

      if (char < node.character) {
        return traverseNode(node.left, prefix, index);
      };
      if (char > node.character) {
        return traverseNode(node.right, prefix, index);
      };
      if (index + 1 === prefix.length) {
        return node;
      };
      return traverseNode(node.middle, prefix, index + 1);
    };

    const start = traverseNode(this.root, prefix, 0);
    if (start === null) {
      return [];
    };

    const results = [];
    if (start.isEndOfWord) {
      results.push(prefix);
    };

    const collect = (node, current) => {
      if (node === null || results.length >= limit) {
        return;
      };

      collect(node.left, current);
      const next = current + node.character;
      if (node.isEndOfWord) {
        results.push(next);
      };
      collect(node.middle, next);
      collect(node.right, current);
    };

    collect(start.middle, prefix);
    return results.slice(0, limit);
  }
}

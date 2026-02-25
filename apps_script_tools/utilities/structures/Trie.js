class TrieNode {
  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
  };
}

class Trie {
  constructor() {
    this.root = new TrieNode();
    this.wordCount = 0;
  }

  *[Symbol.iterator]() {
    const collectWords = function* (node, prefix = "") {
      if (node.isEndOfWord) yield prefix;
      for (const [char, child] of node.children.entries()) {
        yield* collectWords(child, prefix + char);
      };
    };
    yield* collectWords(this.root);
  };

  insert(word) {
    if(typeof word === "string" && word.trim().length > 0) {
      let current = this.root;
      for (const char of word) {
        if (!current.children.has(char)) {
          current.children.set(char, new TrieNode());
        };
        current = current.children.get(char);
      };
      if (!current.isEndOfWord) {
        current.isEndOfWord = true;
        this.wordCount += 1;
      };
    };
  }

  search(word) {
    if (typeof word !== 'string' || word.length === 0) {
      return false;
    };
    let current = this.root;
    for (const char of word) {
      if (!current.children.has(char)) {
        return false;
      };
      current = current.children.get(char);
    };
    return current.isEndOfWord;
  }

  startsWith(prefix) {
    if (typeof prefix !== 'string' || prefix.length === 0) {
      return false;
    };
    let current = this.root;
    for (const char of prefix) {
      if (!current.children.has(char)) {
        return false;
      };
      current = current.children.get(char);
    };
    return true;
  }

  endsWith(suffix) {
    if (typeof suffix !== 'string' || suffix.length === 0) {
      return false;
    };
    for (const word of this) {
      if (word.endsWith(suffix)) {
        return true;
      };
    };
    return false;
  }

  collectWords(node = this.root, prefix = "", result = []) {
    if (node.isEndOfWord) {
      result.push(prefix);
    };
    for (const [char, child] of node.children.entries()) {
      this.collectWords(child, prefix + char, result);
    };
    return result;
  }

  autocomplete(prefix) {
    if (typeof prefix !== 'string' || prefix.length === 0) {
      return [];
    };
    let current = this.root;
    for (const char of prefix) {
      if (!current.children.has(char)) {
        return []; // No words with this prefix
      }
      current = current.children.get(char);
    }
    return this.collectWords(current, prefix);
  }

  delete(word, node = this.root, depth = 0) {
    if (typeof word !== 'string' || word.length === 0) {
      return false;
    };

    if (depth === word.length) {
      if (!node.isEndOfWord) return false; // Word doesn't exist
      node.isEndOfWord = false;
      this.wordCount = Math.max(0, this.wordCount - 1);
      return node.children.size === 0; // Return true if no children (can delete this node)
    }
  
    const char = word[depth];
    if (!node.children.has(char)) return false; // Word doesn't exist
  
    const shouldDeleteChild = this.delete(word, node.children.get(char), depth + 1);
    if (shouldDeleteChild) {
      node.children.delete(char);
      return node.children.size === 0 && !node.isEndOfWord;
    }
    return false;
  }

  isEmpty() {
    return this.wordCount === 0;
  }

  fuzzySearch(query, maxDistance = 1, node = this.root, depth = 0, currentWord = "", result = []) {
    if (node.isEndOfWord && FuzzyMatcher.levenshtein(query, currentWord) <= maxDistance) {
      result.push(currentWord);
    }
  
    for (const [char, child] of node.children.entries()) {
      this.fuzzySearch(query, maxDistance, child, depth + 1, currentWord + char, result);
    }
    return result;
  }
  
}

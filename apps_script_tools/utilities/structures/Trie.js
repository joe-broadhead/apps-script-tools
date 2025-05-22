class TrieNode {
  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
  };
}

class Trie {
  constructor() {
    this.root = new TrieNode();
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
      current.isEndOfWord = true;
    };
  }

  search(word) {
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
    const reversedSuffix = suffix.split('').reverse().join('');
    return this.startsWith(reversedSuffix, true);
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
    if (depth === word.length) {
      if (!node.isEndOfWord) return false; // Word doesn't exist
      node.isEndOfWord = false;
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

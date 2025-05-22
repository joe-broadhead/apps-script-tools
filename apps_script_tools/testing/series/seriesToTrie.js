SERIES_TO_TRIE_TESTS = [
  {
    description: 'Series.toTrie() should insert all string elements into the Trie',
    test: () => {
      const series = new Series(["apple", "banana", "cherry"], 'Fruits');
      const trie = series.toTrie();

      const expectedWords = ["apple", "banana", "cherry"];
      const actualWords = trie.collectWords();

      if (JSON.stringify(actualWords.sort()) !== JSON.stringify(expectedWords.sort())) {
        throw new Error(`Expected ${JSON.stringify(expectedWords)}, but got ${JSON.stringify(actualWords)}`);
      }
    },
  },
  {
    description: 'Series.toTrie() should only insert string elements into the Trie from a mixed-type Series',
    test: () => {
      const series = new Series(["apple", 42, null, undefined, "banana"], 'Mixed');
      const trie = series.toTrie();

      const expectedWords = ["42", "apple", "banana"];
      const actualWords = trie.collectWords();

      if (JSON.stringify(actualWords.sort()) !== JSON.stringify(expectedWords.sort())) {
        throw new Error(`Expected ${JSON.stringify(expectedWords)}, but got ${JSON.stringify(actualWords)}`);
      }
    },
  },
  {
    description: 'Series.toTrie() should return an empty Trie for an empty Series',
    test: () => {
      const series = new Series([], 'Empty');
      const trie = series.toTrie();

      const expectedWords = []; // No words in the Trie
      const actualWords = trie.collectWords();

      if (JSON.stringify(actualWords) !== JSON.stringify(expectedWords)) {
        throw new Error(`Expected an empty Trie, but got ${JSON.stringify(actualWords)}`);
      }
    },
  },
  {
    description: 'Series.toTrie() should allow searching for words in the Trie',
    test: () => {
      const series = new Series(["apple", "banana", "cherry"], 'Fruits');
      const trie = series.toTrie();

      if (!trie.search("apple") || !trie.search("banana") || !trie.search("cherry")) {
        throw new Error('Failed to find expected words in the Trie');
      }

      if (trie.search("grape")) {
        throw new Error('Unexpected word "grape" found in the Trie');
      }
    },
  },
  {
    description: 'Series.toTrie() should allow matching prefixes in the Trie',
    test: () => {
      const series = new Series(["apple", "apricot", "banana"], 'Fruits');
      const trie = series.toTrie();

      if (!trie.startsWith("ap") || !trie.startsWith("ban")) {
        throw new Error('Failed to find expected prefixes in the Trie');
      }

      if (trie.startsWith("gr")) {
        throw new Error('Unexpected prefix "gr" found in the Trie');
      }
    },
  },
  {
    description: 'Series.toTrie() should handle a large Series efficiently',
    test: () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => `word${i}`);
      const series = new Series(largeArray, 'Large');
      const trie = series.toTrie();

      const allWordsInserted = largeArray.every(word => trie.search(word));

      if (!allWordsInserted) {
        throw new Error('Failed Test: Not all words were correctly inserted into the Trie');
      }
    },
  },
];

class FuzzyMatcher {
  static levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // Deletion
          dp[i][j - 1] + 1, // Insertion
          dp[i - 1][j - 1] + cost // Substitution
        );
      };
    };
    return dp[m][n];
  }

  static damerauLevenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
  
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
  
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // Deletion
          dp[i][j - 1] + 1, // Insertion
          dp[i - 1][j - 1] + cost // Substitution
        );
  
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + cost); // Transposition
        }
      }
    }
  
    return dp[m][n];
  }

  static soundex(word) {
    if (!word) return '0000';
  
    word = word.toUpperCase();
    const firstLetter = word[0];
  
    const codes = {
      B: '1', F: '1', P: '1', V: '1',
      C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
      D: '3', T: '3',
      L: '4',
      M: '5', N: '5',
      R: '6'
    };
  
    let result = firstLetter;
    let previousCode = codes[firstLetter];
  
    for (let i = 1; i < word.length; i++) {
      const char = word[i];
      const code = codes[char];
  
      if (code) {
        if (code !== previousCode) {
          result += code;
          previousCode = code;
        }
      } else {
        previousCode = null;
      }
    }
  
    return (result + '000').slice(0, 4);
  }

  static nGrams(word, n = 2) {
    const result = [];
    for (let i = 0; i <= word.length - n; i++) {
      result.push(word.slice(i, i + n));
    };
    return result;
  }

  static jaccard(a, b, n = 2) {
    const nGramsA = new Set(this.nGrams(a, n));
    const nGramsB = new Set(this.nGrams(b, n));
    const intersectionSize = [...nGramsA].filter(x => nGramsB.has(x)).length;
    const unionSize = nGramsA.size + nGramsB.size - intersectionSize;
  
    return unionSize === 0 ? 0 : intersectionSize / unionSize;
  }

  static tokenJaccard(a, b, options = { normalize: false }) {
    const tokenize = str => {
      if (options.normalize) {
        str = (
          str
          .toLowerCase()
          .replace(/-/g, ' ')
          .replace(/[^\w\s]|_/g, '')
          .trim()
        );
      }
      return str.trim() === '' ? [] : str.trim().split(/\s+/);
    };
  
    const tokensA = new Set(tokenize(a));
    const tokensB = new Set(tokenize(b));
    const intersectionSize = [...tokensA].filter(token => tokensB.has(token)).length;
    const unionSize = tokensA.size + tokensB.size - intersectionSize;
    return unionSize === 0 ? 0 : intersectionSize / unionSize;
  }  

  static weightedSimilarity(a, b, weights = { levenshtein: 0.5, jaccard: 0.5 }) {
    if (a === "" && b === "") return 1.0;
    if (a === "" || b === "") return 0.0;
    
    const levenScore = 1 - this.levenshtein(a, b) / Math.max(a.length, b.length);
    const jaccardScore = this.jaccard(a, b);
    return weights.levenshtein * levenScore + weights.jaccard * jaccardScore;
  }

  static tokenSimilarity(a, b) {
    if (!a && !b) return 0.0;
    if (!a || !b) return 0.0;
  
    const tokensA = new Set(a.split(/\s+/));
    const tokensB = new Set(b.split(/\s+/));
    const intersection = [...tokensA].filter(token => tokensB.has(token)).length;
    const union = tokensA.size + tokensB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  static hammingDistance(a, b) {
    if (a.length !== b.length) return Infinity;
    let distance = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) distance++;
    }
    return distance;
  }

  static fuzzySearch(query, collection, method = 'levenshtein', threshold = 0.7) {
    return (
      collection
      .map(item => {
        let score = 0;
  
        switch (method) {
          case 'levenshtein':
            score = 1 - this.levenshtein(query, item) / Math.max(query.length, item.length);
            break;
  
          case 'damerauLevenshtein':
            const minLen = Math.min(query.length, item.length);
            const distance = this.damerauLevenshtein(query, item);
            score = 1 - distance / minLen;
            break;
  
          case 'jaccard':
            score = this.tokenJaccard(query, item);
            break;
  
          case 'soundex':
            const soundexQuery = this.soundex(query);
            const soundexItem = this.soundex(item);
            const dist = this.hammingDistance(soundexQuery, soundexItem);
            const maxDistance = 1; // Allow up to one character difference
            score = dist <= maxDistance ? 1 : 0;
            break;
  
          default:
            throw new Error(`Unknown method: ${method}`);
        }
  
        return { item, score: Math.round(score * 1000) / 1000 };
      })
      .filter(result => result.score >= threshold)
      .sort((a, b) => b.score - a.score)
    );
  }

}
  
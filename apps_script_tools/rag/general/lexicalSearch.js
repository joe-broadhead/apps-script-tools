function astRagTokenizeLexicalText(text) {
  const normalized = astRagNormalizeString(text, '');
  if (!normalized) {
    return [];
  }

  return normalized
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map(token => token.trim())
    .filter(Boolean);
}

function astRagBuildTermFrequency(tokens) {
  const frequency = {};

  tokens.forEach(token => {
    frequency[token] = (frequency[token] || 0) + 1;
  });

  return frequency;
}

function astRagBuildLexicalCorpus(chunks = []) {
  const docFrequency = {};
  let totalLength = 0;

  const documents = chunks.map(chunk => {
    const tokens = astRagTokenizeLexicalText(chunk && chunk.text);
    const termFrequency = astRagBuildTermFrequency(tokens);
    const uniqueTerms = Object.keys(termFrequency);

    uniqueTerms.forEach(term => {
      docFrequency[term] = (docFrequency[term] || 0) + 1;
    });

    totalLength += tokens.length;

    return {
      chunkId: chunk.chunkId,
      tokens,
      termFrequency,
      length: tokens.length
    };
  });

  return {
    totalDocs: documents.length,
    avgDocLength: documents.length > 0
      ? (totalLength / documents.length)
      : 1,
    docFrequency,
    documents
  };
}

function astRagBm25Score(queryTokens, document, corpus, options = {}) {
  const docLength = document.length;
  if (docLength === 0 || queryTokens.length === 0) {
    return 0;
  }

  const k1 = typeof options.k1 === 'number' && isFinite(options.k1) ? options.k1 : 1.2;
  const b = typeof options.b === 'number' && isFinite(options.b) ? options.b : 0.75;

  const uniqueQueryTerms = Array.from(new Set(queryTokens));
  let score = 0;

  uniqueQueryTerms.forEach(term => {
    const tf = document.termFrequency[term] || 0;
    if (tf === 0) {
      return;
    }

    const df = corpus.docFrequency[term] || 0;
    if (df === 0) {
      return;
    }

    const idf = Math.log(1 + ((corpus.totalDocs - df + 0.5) / (df + 0.5)));
    const denominator = tf + k1 * (1 - b + b * (docLength / Math.max(corpus.avgDocLength, 1)));

    if (denominator === 0) {
      return;
    }

    score += idf * ((tf * (k1 + 1)) / denominator);
  });

  return score;
}

function astRagComputeLexicalScores(query, chunks = []) {
  const queryTokens = astRagTokenizeLexicalText(query);
  const corpus = astRagBuildLexicalCorpus(chunks);
  const scores = {};

  if (queryTokens.length === 0 || corpus.totalDocs === 0) {
    return {
      queryTokens,
      scores
    };
  }

  corpus.documents.forEach(document => {
    scores[document.chunkId] = astRagBm25Score(queryTokens, document, corpus);
  });

  return {
    queryTokens,
    scores
  };
}

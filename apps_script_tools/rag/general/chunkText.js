function astRagSplitSegmentIntoChunks(segment, chunking) {
  const text = astRagNormalizeString(segment && segment.text, '');
  if (!text) {
    return [];
  }

  const size = chunking.chunkSizeChars;
  const overlap = chunking.chunkOverlapChars;
  const minChars = chunking.minChunkChars;

  const chunks = [];
  let cursor = 0;

  while (cursor < text.length) {
    const end = Math.min(text.length, cursor + size);
    const chunkText = text.slice(cursor, end).trim();

    if (chunkText.length >= minChars || end >= text.length) {
      chunks.push({
        section: segment.section || 'body',
        page: segment.page == null ? null : segment.page,
        slide: segment.slide == null ? null : segment.slide,
        text: chunkText
      });
    }

    if (end >= text.length) {
      break;
    }

    cursor = Math.max(cursor + 1, end - overlap);
  }

  return chunks;
}

function astRagSplitTextIntoSentences(text) {
  const source = astRagNormalizeString(text, '');
  if (!source) {
    return [];
  }

  const matches = source.match(/[^.!?\n]+(?:[.!?]+|$)/g);
  const parts = Array.isArray(matches)
    ? matches
        .map(value => astRagNormalizeString(value, '').trim())
        .filter(Boolean)
    : [];

  if (parts.length > 0) {
    return parts;
  }

  return [source];
}

function astRagComputeSentenceOverlapCount(sentences = [], overlapChars = 0) {
  if (!Array.isArray(sentences) || sentences.length === 0 || overlapChars <= 0) {
    return 0;
  }

  let chars = 0;
  let count = 0;
  for (let idx = sentences.length - 1; idx >= 0; idx -= 1) {
    const sentence = astRagNormalizeString(sentences[idx], '');
    if (!sentence) {
      continue;
    }
    const sentenceChars = sentence.length + (count > 0 ? 1 : 0);
    chars += sentenceChars;
    count += 1;
    if (chars >= overlapChars) {
      break;
    }
  }
  return count;
}

function astRagSplitSegmentIntoSentenceChunks(segment, chunking) {
  const text = astRagNormalizeString(segment && segment.text, '');
  if (!text) {
    return [];
  }

  const size = chunking.chunkSizeChars;
  const overlap = chunking.chunkOverlapChars;
  const minChars = chunking.minChunkChars;
  const sentences = astRagSplitTextIntoSentences(text);
  if (sentences.length === 0) {
    return [];
  }

  const output = [];
  let cursor = 0;
  while (cursor < sentences.length) {
    const startCursor = cursor;
    const chunkSentences = [];
    let chunkChars = 0;

    while (cursor < sentences.length) {
      const sentence = astRagNormalizeString(sentences[cursor], '');
      if (!sentence) {
        cursor += 1;
        continue;
      }

      if (chunkSentences.length === 0 && sentence.length > size) {
        const fallbackChunkSegment = Object.assign({}, segment, {
          text: sentence
        });
        const fallbackChunks = astRagSplitSegmentIntoChunks(fallbackChunkSegment, chunking);
        fallbackChunks.forEach(chunk => output.push(chunk));
        cursor += 1;
        chunkChars = 0;
        break;
      }

      const nextChars = sentence.length + (chunkSentences.length > 0 ? 1 : 0);
      if (chunkSentences.length > 0 && chunkChars + nextChars > size) {
        break;
      }

      chunkSentences.push(sentence);
      chunkChars += nextChars;
      cursor += 1;
    }

    if (chunkSentences.length > 0) {
      const chunkText = chunkSentences.join(' ').trim();
      if (chunkText.length >= minChars || cursor >= sentences.length) {
        output.push({
          section: segment.section || 'body',
          page: segment.page == null ? null : segment.page,
          slide: segment.slide == null ? null : segment.slide,
          text: chunkText
        });
      }
    }

    if (cursor >= sentences.length) {
      break;
    }

    const overlapCount = astRagComputeSentenceOverlapCount(chunkSentences, overlap);
    if (overlapCount <= 0) {
      continue;
    }

    cursor = Math.max(startCursor + 1, cursor - overlapCount);
  }

  return output;
}

function astRagSplitSegmentByStrategy(segment, chunking) {
  const strategy = astRagNormalizeString(chunking && chunking.chunkStrategy, 'char').toLowerCase();
  if (strategy === 'sentence') {
    return astRagSplitSegmentIntoSentenceChunks(segment, chunking);
  }

  return astRagSplitSegmentIntoChunks(segment, chunking);
}

function astRagChunkSegments(segments, chunking) {
  if (!Array.isArray(segments)) {
    return [];
  }

  const output = [];
  for (let idx = 0; idx < segments.length; idx += 1) {
    const split = astRagSplitSegmentByStrategy(segments[idx], chunking);
    for (let splitIndex = 0; splitIndex < split.length; splitIndex += 1) {
      output.push(split[splitIndex]);
    }
  }

  return output;
}

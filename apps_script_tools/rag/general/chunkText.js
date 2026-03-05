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

  const normalized = source.replace(/\r\n?/g, '\n');
  const parts = [];
  let buffer = '';

  for (let idx = 0; idx < normalized.length; idx += 1) {
    const char = normalized[idx];
    if (char === '\n') {
      const sentence = astRagNormalizeString(buffer, '').trim();
      if (sentence) {
        parts.push(sentence);
      }
      buffer = '';
      continue;
    }

    buffer += char;
    if (/[.!?]/.test(char)) {
      const nextChar = normalized[idx + 1] || '';
      if (!/[.!?]/.test(nextChar)) {
        const sentence = astRagNormalizeString(buffer, '').trim();
        if (sentence) {
          parts.push(sentence);
        }
        buffer = '';
      }
    }
  }

  const trailing = astRagNormalizeString(buffer, '').trim();
  if (trailing) {
    parts.push(trailing);
  }

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
  let pendingPrefix = '';
  const appendFallbackChunks = function(fallbackChunks, hasMoreSentences) {
    if (!Array.isArray(fallbackChunks) || fallbackChunks.length === 0) {
      return;
    }

    let emitCount = fallbackChunks.length;
    if (hasMoreSentences) {
      const tail = fallbackChunks[fallbackChunks.length - 1];
      const tailText = astRagNormalizeString(tail && tail.text, '').trim();
      if (tailText && tailText.length < minChars) {
        emitCount = fallbackChunks.length - 1;
        pendingPrefix = pendingPrefix
          ? `${pendingPrefix} ${tailText}`.trim()
          : tailText;
      }
    }

    for (let idx = 0; idx < emitCount; idx += 1) {
      output.push(fallbackChunks[idx]);
    }
  };

  while (cursor < sentences.length || pendingPrefix) {
    const startCursor = cursor;
    const chunkSentences = [];
    let chunkChars = 0;

    if (pendingPrefix) {
      chunkSentences.push(pendingPrefix);
      chunkChars = pendingPrefix.length;
      pendingPrefix = '';
    }

    while (cursor < sentences.length) {
      const sentence = astRagNormalizeString(sentences[cursor], '');
      if (!sentence) {
        cursor += 1;
        continue;
      }

      if (sentence.length > size) {
        if (chunkSentences.length === 0) {
          const fallbackChunkSegment = Object.assign({}, segment, {
            text: sentence
          });
          const fallbackChunks = astRagSplitSegmentIntoChunks(fallbackChunkSegment, chunking);
          appendFallbackChunks(fallbackChunks, cursor + 1 < sentences.length);
          cursor += 1;
          chunkChars = 0;
          break;
        }

        // Preserve text and min-chunk guarantees when a short lead-in sentence
        // is followed by an oversized sentence.
        const prefixText = chunkSentences.join(' ').trim();
        if (prefixText.length < minChars) {
          const fallbackChunkSegment = Object.assign({}, segment, {
            text: `${prefixText} ${sentence}`.trim()
          });
          const fallbackChunks = astRagSplitSegmentIntoChunks(fallbackChunkSegment, chunking);
          appendFallbackChunks(fallbackChunks, cursor + 1 < sentences.length);
          cursor += 1;
          chunkSentences.length = 0;
          chunkChars = 0;
        }
        break;
      }

      const nextChars = sentence.length + (chunkSentences.length > 0 ? 1 : 0);
      if (chunkSentences.length > 0 && chunkChars + nextChars > size) {
        const prefixText = chunkSentences.join(' ').trim();
        if (prefixText.length < minChars) {
          const fallbackChunkSegment = Object.assign({}, segment, {
            text: `${prefixText} ${sentence}`.trim()
          });
          const fallbackChunks = astRagSplitSegmentIntoChunks(fallbackChunkSegment, chunking);
          appendFallbackChunks(fallbackChunks, cursor + 1 < sentences.length);
          cursor += 1;
          chunkSentences.length = 0;
          chunkChars = 0;
        }
        break;
      }

      chunkSentences.push(sentence);
      chunkChars += nextChars;
      cursor += 1;
    }

    let emittedChunk = false;
    if (chunkSentences.length > 0) {
      const chunkText = chunkSentences.join(' ').trim();
      const isFinalChunk = cursor >= sentences.length;
      if (chunkText.length >= minChars || isFinalChunk) {
        output.push({
          section: segment.section || 'body',
          page: segment.page == null ? null : segment.page,
          slide: segment.slide == null ? null : segment.slide,
          text: chunkText
        });
        emittedChunk = true;
      } else {
        pendingPrefix = chunkText;
      }
    }

    if (cursor >= sentences.length) {
      if (pendingPrefix) {
        const fallbackChunkSegment = Object.assign({}, segment, {
          text: pendingPrefix
        });
        const finalChunks = astRagSplitSegmentIntoChunks(fallbackChunkSegment, chunking);
        finalChunks.forEach(chunk => output.push(chunk));
        pendingPrefix = '';
      }
      break;
    }

    if (!emittedChunk || pendingPrefix) {
      continue;
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

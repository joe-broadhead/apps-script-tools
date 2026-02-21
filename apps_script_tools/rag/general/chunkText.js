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

function astRagChunkSegments(segments, chunking) {
  if (!Array.isArray(segments)) {
    return [];
  }

  const output = [];
  for (let idx = 0; idx < segments.length; idx += 1) {
    const split = astRagSplitSegmentIntoChunks(segments[idx], chunking);
    for (let splitIndex = 0; splitIndex < split.length; splitIndex += 1) {
      output.push(split[splitIndex]);
    }
  }

  return output;
}

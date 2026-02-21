function astRagNormalizeVector(vector) {
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new AstRagRetrievalError('Embedding vector must be a non-empty array');
  }

  const values = vector.map((value, index) => {
    const number = Number(value);
    if (!isFinite(number)) {
      throw new AstRagRetrievalError('Embedding vector contains a non-numeric value', { index });
    }
    return number;
  });

  let norm = 0;
  for (let idx = 0; idx < values.length; idx += 1) {
    norm += values[idx] * values[idx];
  }

  const magnitude = Math.sqrt(norm);
  if (magnitude === 0) {
    return values;
  }

  return values.map(value => value / magnitude);
}

function astRagCosineSimilarity(leftVector, rightVector) {
  if (!Array.isArray(leftVector) || !Array.isArray(rightVector) || leftVector.length === 0 || rightVector.length === 0) {
    throw new AstRagRetrievalError('Cosine similarity requires non-empty vectors');
  }

  if (leftVector.length !== rightVector.length) {
    throw new AstRagRetrievalError('Cosine similarity vectors must have the same dimensions', {
      leftDimensions: leftVector.length,
      rightDimensions: rightVector.length
    });
  }

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let idx = 0; idx < leftVector.length; idx += 1) {
    const left = Number(leftVector[idx]);
    const right = Number(rightVector[idx]);

    if (!isFinite(left) || !isFinite(right)) {
      throw new AstRagRetrievalError('Cosine similarity vectors contain non-numeric values', { index: idx });
    }

    dot += left * right;
    leftNorm += left * left;
    rightNorm += right * right;
  }

  if (leftNorm === 0 || rightNorm === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

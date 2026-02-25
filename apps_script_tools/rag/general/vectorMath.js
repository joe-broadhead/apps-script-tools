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

function astRagVectorNorm(vector) {
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new AstRagRetrievalError('Embedding vector must be a non-empty array');
  }

  let sumSquares = 0;
  for (let idx = 0; idx < vector.length; idx += 1) {
    const value = Number(vector[idx]);
    if (!isFinite(value)) {
      throw new AstRagRetrievalError('Embedding vector contains a non-numeric value', { index: idx });
    }
    sumSquares += value * value;
  }

  return Math.sqrt(sumSquares);
}

function astRagCosineSimilarityWithNorm(leftVector, leftNorm, rightVector, rightNorm) {
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
  for (let idx = 0; idx < leftVector.length; idx += 1) {
    const left = Number(leftVector[idx]);
    const right = Number(rightVector[idx]);

    if (!isFinite(left) || !isFinite(right)) {
      throw new AstRagRetrievalError('Cosine similarity vectors contain non-numeric values', { index: idx });
    }

    dot += left * right;
  }

  const normalizedLeftNorm = typeof leftNorm === 'number' && isFinite(leftNorm)
    ? leftNorm
    : astRagVectorNorm(leftVector);
  const normalizedRightNorm = typeof rightNorm === 'number' && isFinite(rightNorm)
    ? rightNorm
    : astRagVectorNorm(rightVector);

  if (normalizedLeftNorm === 0 || normalizedRightNorm === 0) {
    return 0;
  }

  return dot / (normalizedLeftNorm * normalizedRightNorm);
}

function astRagCosineSimilarity(leftVector, rightVector) {
  return astRagCosineSimilarityWithNorm(
    leftVector,
    astRagVectorNorm(leftVector),
    rightVector,
    astRagVectorNorm(rightVector)
  );
}

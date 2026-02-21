function astRagEmbedTexts(request = {}) {
  if (!astRagIsPlainObject(request)) {
    throw new AstRagValidationError('Embedding request must be an object');
  }

  const provider = astRagNormalizeString(request.provider, null);
  if (!provider) {
    throw new AstRagValidationError('Embedding provider is required');
  }

  if (!Array.isArray(request.texts) || request.texts.length === 0) {
    throw new AstRagValidationError('Embedding request requires a non-empty texts array');
  }

  const texts = request.texts.map((text, index) => {
    const normalized = astRagNormalizeString(text, null);
    if (!normalized) {
      throw new AstRagValidationError('Embedding text items must be non-empty strings', { index });
    }
    return normalized;
  });

  const registryEntry = astRagGetEmbeddingProvider(provider);
  const adapter = registryEntry.adapter;
  const config = astRagResolveProviderConfig({
    provider,
    mode: 'embedding',
    model: request.model,
    auth: request.auth || {}
  });

  adapter.validateConfig(config);
  const capabilities = adapter.capabilities() || {};
  const maxBatchSize = astRagNormalizePositiveInt(capabilities.maxBatchSize, texts.length, 1);

  const options = astRagIsPlainObject(request.options) ? astRagCloneObject(request.options) : {};
  const providerOptions = astRagIsPlainObject(request.providerOptions)
    ? astRagCloneObject(request.providerOptions)
    : {};

  const vectors = [];
  const usage = {
    inputTokens: 0,
    totalTokens: 0
  };
  const raw = [];

  for (let offset = 0; offset < texts.length; offset += maxBatchSize) {
    const batchTexts = texts.slice(offset, offset + maxBatchSize);

    let result = null;
    try {
      result = adapter.embed({
        texts: batchTexts,
        config,
        model: config.model,
        auth: request.auth || {},
        providerOptions,
        options
      });
    } catch (error) {
      if (error instanceof AstRagEmbeddingCapabilityError) {
        throw error;
      }

      if (typeof adapter.classifyError === 'function') {
        const classified = adapter.classifyError(error, {
          provider,
          model: config.model
        });
        if (classified) {
          throw classified;
        }
      }

      const statusCode = error && error.details && typeof error.details.statusCode !== 'undefined'
        ? error.details.statusCode
        : (error && error.cause && error.cause.details ? error.cause.details.statusCode : null);
      if (statusCode === 400 || statusCode === 404) {
        throw new AstRagEmbeddingCapabilityError(
          'Embedding provider/model combination is not supported',
          {
            provider,
            model: config.model,
            statusCode
          },
          error
        );
      }

      throw error;
    }

    if (!result || !Array.isArray(result.vectors)) {
      throw new AstRagEmbeddingCapabilityError('Embedding adapter did not return vectors array', {
        provider
      });
    }

    if (result.vectors.length !== batchTexts.length) {
      throw new AstRagEmbeddingCapabilityError('Embedding adapter returned unexpected vector count', {
        provider,
        expected: batchTexts.length,
        received: result.vectors.length
      });
    }

    for (let idx = 0; idx < result.vectors.length; idx += 1) {
      vectors.push(astRagNormalizeVector(result.vectors[idx]));
    }

    const batchUsage = astRagNormalizeEmbeddingUsage(result.usage || {});
    usage.inputTokens += batchUsage.inputTokens;
    usage.totalTokens += batchUsage.totalTokens;

    raw.push(typeof result.raw === 'undefined' ? null : result.raw);
  }

  return {
    provider,
    model: config.model,
    vectors,
    usage,
    raw
  };
}

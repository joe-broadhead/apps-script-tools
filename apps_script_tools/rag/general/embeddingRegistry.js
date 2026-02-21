const AST_RAG_EMBEDDING_PROVIDER_REGISTRY = {};

function astRagNormalizeProviderName(name) {
  const normalized = astRagNormalizeString(name, null);
  if (!normalized) {
    throw new AstRagValidationError('Embedding provider name is required');
  }

  return normalized.toLowerCase();
}

function astRagValidateEmbeddingAdapter(adapter = {}, providerName) {
  if (!astRagIsPlainObject(adapter)) {
    throw new AstRagValidationError('Embedding provider adapter must be an object', {
      provider: providerName
    });
  }

  if (typeof adapter.embed !== 'function') {
    throw new AstRagValidationError('Embedding provider adapter requires embed(texts, ...)', {
      provider: providerName
    });
  }

  if (typeof adapter.capabilities !== 'function') {
    throw new AstRagValidationError('Embedding provider adapter requires capabilities() function', {
      provider: providerName
    });
  }

  if (typeof adapter.validateConfig !== 'function') {
    throw new AstRagValidationError('Embedding provider adapter requires validateConfig(config) function', {
      provider: providerName
    });
  }
}

function astRagRegisterEmbeddingProvider(name, adapter, options = {}) {
  const providerName = astRagNormalizeProviderName(name);
  astRagValidateEmbeddingAdapter(adapter, providerName);

  const allowOverwrite = astRagIsPlainObject(options) && options.overwrite === true;
  if (AST_RAG_EMBEDDING_PROVIDER_REGISTRY[providerName] && !allowOverwrite) {
    throw new AstRagValidationError('Embedding provider is already registered', {
      provider: providerName
    });
  }

  AST_RAG_EMBEDDING_PROVIDER_REGISTRY[providerName] = {
    name: providerName,
    adapter,
    isBuiltIn: astRagIsPlainObject(options) ? options.builtIn === true : false
  };

  return astRagListEmbeddingProviders();
}

function astRagUnregisterEmbeddingProvider(name) {
  const providerName = astRagNormalizeProviderName(name);
  const registryEntry = AST_RAG_EMBEDDING_PROVIDER_REGISTRY[providerName];

  if (!registryEntry) {
    return false;
  }

  if (registryEntry.isBuiltIn) {
    throw new AstRagValidationError('Cannot unregister built-in embedding provider', {
      provider: providerName
    });
  }

  delete AST_RAG_EMBEDDING_PROVIDER_REGISTRY[providerName];
  return true;
}

function astRagGetEmbeddingProvider(name) {
  const providerName = astRagNormalizeProviderName(name);
  const registryEntry = AST_RAG_EMBEDDING_PROVIDER_REGISTRY[providerName];

  if (!registryEntry) {
    throw new AstRagEmbeddingCapabilityError('Embedding provider is not registered', {
      provider: providerName
    });
  }

  return registryEntry;
}

function astRagHasEmbeddingProvider(name) {
  const providerName = astRagNormalizeString(name, null);
  if (!providerName) {
    return false;
  }
  return Boolean(AST_RAG_EMBEDDING_PROVIDER_REGISTRY[providerName.toLowerCase()]);
}

function astRagListEmbeddingProviders() {
  return Object.keys(AST_RAG_EMBEDDING_PROVIDER_REGISTRY).sort();
}

function astRagGetEmbeddingCapabilities(name) {
  const registryEntry = astRagGetEmbeddingProvider(name);
  const capabilities = registryEntry.adapter.capabilities();

  return astRagIsPlainObject(capabilities)
    ? astRagCloneObject(capabilities)
    : {};
}

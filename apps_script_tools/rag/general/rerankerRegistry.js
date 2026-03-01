const AST_RAG_RERANKER_REGISTRY = {};

function astRagNormalizeRerankerName(name) {
  const normalized = astRagNormalizeString(name, null);
  if (!normalized) {
    throw new AstRagValidationError('Reranker name is required');
  }
  return normalized.toLowerCase();
}

function astRagValidateRerankerAdapter(adapter = {}, rerankerName) {
  if (!astRagIsPlainObject(adapter)) {
    throw new AstRagValidationError('Reranker adapter must be an object', {
      reranker: rerankerName
    });
  }

  if (typeof adapter.rerank !== 'function') {
    throw new AstRagValidationError('Reranker adapter requires rerank(request) function', {
      reranker: rerankerName
    });
  }
}

function astRagRegisterReranker(name, adapter, options = {}) {
  const rerankerName = astRagNormalizeRerankerName(name);
  astRagValidateRerankerAdapter(adapter, rerankerName);

  const allowOverwrite = astRagIsPlainObject(options) && options.overwrite === true;
  if (AST_RAG_RERANKER_REGISTRY[rerankerName] && !allowOverwrite) {
    throw new AstRagValidationError('Reranker is already registered', {
      reranker: rerankerName
    });
  }

  AST_RAG_RERANKER_REGISTRY[rerankerName] = {
    name: rerankerName,
    adapter,
    isBuiltIn: astRagIsPlainObject(options) ? options.builtIn === true : false
  };

  return astRagListRerankers();
}

function astRagUnregisterReranker(name) {
  const rerankerName = astRagNormalizeRerankerName(name);
  const entry = AST_RAG_RERANKER_REGISTRY[rerankerName];
  if (!entry) {
    return false;
  }

  if (entry.isBuiltIn) {
    throw new AstRagValidationError('Cannot unregister built-in reranker', {
      reranker: rerankerName
    });
  }

  delete AST_RAG_RERANKER_REGISTRY[rerankerName];
  return true;
}

function astRagGetReranker(name) {
  const rerankerName = astRagNormalizeRerankerName(name);
  const entry = AST_RAG_RERANKER_REGISTRY[rerankerName];
  if (!entry) {
    throw new AstRagValidationError('Reranker is not registered', {
      reranker: rerankerName
    });
  }
  return entry;
}

function astRagHasReranker(name) {
  const normalized = astRagNormalizeString(name, null);
  if (!normalized) {
    return false;
  }
  return Boolean(AST_RAG_RERANKER_REGISTRY[normalized.toLowerCase()]);
}

function astRagListRerankers() {
  return Object.keys(AST_RAG_RERANKER_REGISTRY).sort();
}

function astRagRegisterBuiltInRerankers() {
  if (!astRagHasReranker(AST_RAG_DEFAULT_RETRIEVAL.rerank.provider)) {
    astRagRegisterReranker(AST_RAG_DEFAULT_RETRIEVAL.rerank.provider, {
      rerank: request => astRagHeuristicRerank(request)
    }, {
      builtIn: true
    });
  }
}

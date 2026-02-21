function astRagNormalizeEmbeddingUsage(usage = {}) {
  const inputTokens = Number(
    usage.inputTokens || usage.prompt_tokens || usage.promptTokenCount || usage.total_tokens || 0
  );
  const totalTokens = Number(
    usage.totalTokens || usage.total_tokens || usage.prompt_tokens || usage.promptTokenCount || 0
  );

  return {
    inputTokens: isFinite(inputTokens) ? inputTokens : 0,
    totalTokens: isFinite(totalTokens) ? totalTokens : 0
  };
}

function astRagParseEmbeddingVectors(vectors, provider) {
  if (!Array.isArray(vectors) || vectors.length === 0) {
    throw new AstRagEmbeddingCapabilityError('Embedding response did not include vectors', {
      provider
    });
  }

  return vectors.map(vector => astRagNormalizeVector(vector));
}

function astRagOpenAiCompatibleEmbed({ endpoint, apiKey, model, texts, headers = {}, retries = 2 }) {
  const response = astRagHttpRequest({
    url: endpoint,
    method: 'post',
    headers: Object.assign({
      Authorization: `Bearer ${apiKey}`
    }, headers),
    payload: {
      model,
      input: texts
    },
    retries
  });

  const json = response.json || {};
  const data = Array.isArray(json.data) ? json.data : [];
  const vectors = data.map(item => item.embedding).filter(Boolean);

  return {
    vectors: astRagParseEmbeddingVectors(vectors, 'openai-compatible'),
    usage: astRagNormalizeEmbeddingUsage(json.usage || {}),
    raw: json
  };
}

function astCreateOpenAiEmbeddingAdapter() {
  return {
    capabilities: () => ({
      batch: true,
      maxBatchSize: 128,
      dimensions: 'model-dependent'
    }),
    validateConfig: config => {
      if (!config || typeof config !== 'object') {
        throw new AstRagAuthError('Missing OpenAI embedding config');
      }
      if (!astRagNormalizeString(config.apiKey, null)) {
        throw new AstRagAuthError('Missing OpenAI embedding apiKey');
      }
      if (!astRagNormalizeString(config.model, null)) {
        throw new AstRagAuthError('Missing OpenAI embedding model');
      }
    },
    embed: request => {
      return astRagOpenAiCompatibleEmbed({
        endpoint: 'https://api.openai.com/v1/embeddings',
        apiKey: request.config.apiKey,
        model: request.config.model,
        texts: request.texts,
        retries: request.options.retries
      });
    }
  };
}

function astCreateGeminiEmbeddingAdapter() {
  return {
    capabilities: () => ({
      batch: true,
      maxBatchSize: 100,
      dimensions: 'model-dependent'
    }),
    validateConfig: config => {
      if (!config || typeof config !== 'object') {
        throw new AstRagAuthError('Missing Gemini embedding config');
      }
      if (!astRagNormalizeString(config.apiKey, null)) {
        throw new AstRagAuthError('Missing Gemini embedding apiKey');
      }
      if (!astRagNormalizeString(config.model, null)) {
        throw new AstRagAuthError('Missing Gemini embedding model');
      }
    },
    embed: request => {
      const rawModel = request.config.model;
      const model = rawModel.startsWith('models/') ? rawModel : `models/${rawModel}`;
      const response = astRagHttpRequest({
        url: `https://generativelanguage.googleapis.com/v1beta/${encodeURIComponent(model)}:batchEmbedContents?key=${encodeURIComponent(request.config.apiKey)}`,
        method: 'post',
        payload: {
          requests: request.texts.map(text => ({
            model,
            content: {
              parts: [{ text }]
            }
          }))
        },
        retries: request.options.retries
      });

      const json = response.json || {};
      const embeddings = Array.isArray(json.embeddings) ? json.embeddings : [];
      const vectors = embeddings.map(item => item && (item.values || item.embedding)).filter(Boolean);

      return {
        vectors: astRagParseEmbeddingVectors(vectors, 'gemini'),
        usage: astRagNormalizeEmbeddingUsage(json.usageMetadata || json.usage || {}),
        raw: json
      };
    }
  };
}

function astCreateVertexEmbeddingAdapter() {
  return {
    capabilities: () => ({
      batch: true,
      maxBatchSize: 32,
      dimensions: 'model-dependent'
    }),
    validateConfig: config => {
      if (!config || typeof config !== 'object') {
        throw new AstRagAuthError('Missing Vertex embedding config');
      }
      if (!astRagNormalizeString(config.projectId, null)) {
        throw new AstRagAuthError('Missing Vertex embedding projectId');
      }
      if (!astRagNormalizeString(config.location, null)) {
        throw new AstRagAuthError('Missing Vertex embedding location');
      }
      if (!astRagNormalizeString(config.model, null)) {
        throw new AstRagAuthError('Missing Vertex embedding model');
      }
      if (!astRagNormalizeString(config.oauthToken, null)) {
        throw new AstRagAuthError('Missing Vertex embedding OAuth token');
      }
    },
    embed: request => {
      const endpoint = `https://${encodeURIComponent(request.config.location)}-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(request.config.projectId)}/locations/${encodeURIComponent(request.config.location)}/publishers/google/models/${encodeURIComponent(request.config.model)}:predict`;
      const response = astRagHttpRequest({
        url: endpoint,
        method: 'post',
        headers: {
          Authorization: `Bearer ${request.config.oauthToken}`
        },
        payload: {
          instances: request.texts.map(text => ({ content: text }))
        },
        retries: request.options.retries
      });

      const json = response.json || {};
      const predictions = Array.isArray(json.predictions) ? json.predictions : [];
      const vectors = predictions.map(item => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        if (item.embeddings && Array.isArray(item.embeddings.values)) {
          return item.embeddings.values;
        }

        if (Array.isArray(item.embedding)) {
          return item.embedding;
        }

        return null;
      }).filter(Boolean);

      return {
        vectors: astRagParseEmbeddingVectors(vectors, 'vertex_gemini'),
        usage: astRagNormalizeEmbeddingUsage(json.metadata || {}),
        raw: json
      };
    }
  };
}

function astCreateOpenRouterEmbeddingAdapter() {
  return {
    capabilities: () => ({
      batch: true,
      maxBatchSize: 128,
      dimensions: 'model-dependent'
    }),
    validateConfig: config => {
      if (!config || typeof config !== 'object') {
        throw new AstRagAuthError('Missing OpenRouter embedding config');
      }
      if (!astRagNormalizeString(config.apiKey, null)) {
        throw new AstRagAuthError('Missing OpenRouter embedding apiKey');
      }
      if (!astRagNormalizeString(config.model, null)) {
        throw new AstRagAuthError('Missing OpenRouter embedding model');
      }
    },
    embed: request => {
      const headers = {};
      if (request.config.httpReferer) {
        headers['HTTP-Referer'] = request.config.httpReferer;
      }
      if (request.config.xTitle) {
        headers['X-Title'] = request.config.xTitle;
      }

      return astRagOpenAiCompatibleEmbed({
        endpoint: 'https://openrouter.ai/api/v1/embeddings',
        apiKey: request.config.apiKey,
        model: request.config.model,
        texts: request.texts,
        headers,
        retries: request.options.retries
      });
    }
  };
}

function astCreatePerplexityEmbeddingAdapter() {
  return {
    capabilities: () => ({
      batch: true,
      maxBatchSize: 128,
      dimensions: 'model-dependent'
    }),
    validateConfig: config => {
      if (!config || typeof config !== 'object') {
        throw new AstRagAuthError('Missing Perplexity embedding config');
      }
      if (!astRagNormalizeString(config.apiKey, null)) {
        throw new AstRagAuthError('Missing Perplexity embedding apiKey');
      }
      if (!astRagNormalizeString(config.model, null)) {
        throw new AstRagAuthError('Missing Perplexity embedding model');
      }
    },
    embed: request => {
      return astRagOpenAiCompatibleEmbed({
        endpoint: 'https://api.perplexity.ai/embeddings',
        apiKey: request.config.apiKey,
        model: request.config.model,
        texts: request.texts,
        retries: request.options.retries
      });
    }
  };
}

function astRagRegisterBuiltInEmbeddingProviders() {
  const providers = {
    openai: astCreateOpenAiEmbeddingAdapter(),
    gemini: astCreateGeminiEmbeddingAdapter(),
    vertex_gemini: astCreateVertexEmbeddingAdapter(),
    openrouter: astCreateOpenRouterEmbeddingAdapter(),
    perplexity: astCreatePerplexityEmbeddingAdapter()
  };

  Object.keys(providers).forEach(name => {
    astRagRegisterEmbeddingProvider(name, providers[name], {
      overwrite: true,
      builtIn: true
    });
  });
}

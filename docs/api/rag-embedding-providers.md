# RAG Embedding Providers

## Built-ins

`ASTX.RAG.embeddingProviders()` returns built-in providers:

- `openai`
- `gemini`
- `vertex_gemini`
- `openrouter`
- `perplexity`

## Built-in config keys

- `OPENAI_API_KEY`, `OPENAI_EMBED_MODEL`
- `GEMINI_API_KEY`, `GEMINI_EMBED_MODEL`
- `VERTEX_PROJECT_ID`, `VERTEX_LOCATION`, `VERTEX_EMBED_MODEL`
- `OPENROUTER_API_KEY`, `OPENROUTER_EMBED_MODEL`, `OPENROUTER_HTTP_REFERER` (optional), `OPENROUTER_X_TITLE` (optional)
- `PERPLEXITY_API_KEY`, `PERPLEXITY_EMBED_MODEL`

Optional RAG defaults:

- `RAG_DEFAULT_INDEX_FOLDER_ID`
- `RAG_DEFAULT_TOP_K`
- `RAG_DEFAULT_MIN_SCORE`

## Precedence

For embedding config values:

1. per-call request (`request.auth.*`, `request.embedding.model`)
2. runtime config (`ASTX.RAG.configure(...)`)
3. script properties
4. typed auth/capability error

## Custom embedding providers

Register a custom provider at runtime:

```javascript
function registerCustomEmbeddingProvider() {
  const ASTX = ASTLib.AST || ASTLib;

  ASTX.RAG.registerEmbeddingProvider('custom_embed', {
    capabilities: () => ({
      batch: true,
      maxBatchSize: 32,
      dimensions: 'model-dependent'
    }),
    validateConfig: config => {
      if (!config || !config.apiKey) {
        throw new Error('custom_embed requires apiKey');
      }
    },
    embed: request => {
      return {
        vectors: request.texts.map(() => [0.1, 0.2, 0.3]),
        usage: {
          inputTokens: request.texts.length,
          totalTokens: request.texts.length
        },
        raw: { provider: 'custom_embed' }
      };
    },
    classifyError: error => error
  });
}
```

Unregister custom providers with:

```javascript
ASTX.RAG.unregisterEmbeddingProvider('custom_embed');
```

Built-ins cannot be unregistered.

## Capabilities API

Inspect provider capabilities:

```javascript
const caps = ASTX.RAG.embeddingCapabilities('openai');
Logger.log(caps);
```

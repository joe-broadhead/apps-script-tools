# RAG Indexing Operations

## Source support

Drive-only ingestion in `v0.0.4` supports:

- plain text (`text/plain`)
- PDF (`application/pdf`)
- Google Docs (`application/vnd.google-apps.document`)
- Google Slides (`application/vnd.google-apps.presentation`)

Slides include both:

- slide body text
- speaker notes

## Index lifecycle

1. `buildIndex` for first-time creation.
2. `syncIndex` to update changed/new/removed files.
3. `inspectIndex` for metadata checks.
4. `search` and `answer` for retrieval and grounded responses.

## Recommended operational defaults

- `chunkSizeChars=1200`
- `chunkOverlapChars=200`
- `minChunkChars=200`
- `maxChunks <= 2000`
- `skipParseFailures=true` for robust batch indexing
- enable request/runtime cache for repeated hot queries:
  - `cache.enabled=true`
  - `cache.backend='storage_json'` for shared multi-user workloads
  - `cache.embeddingTtlSec` and `cache.searchTtlSec` tuned to your update cadence

## Failure handling

- Source extraction failures throw typed errors.
- With `skipParseFailures=true`, build/sync continue and return warnings.
- Unsupported embedding providers throw `AstRagEmbeddingCapabilityError`.
- Missing grounding in `answer` returns `status=insufficient_context`.

## Index storage model

Indexes are Drive JSON files with:

- schema and timestamps
- embedding provider/model metadata
- source fingerprints/checksums
- chunk text + vectors

Use `RAG_DEFAULT_INDEX_FOLDER_ID` to control default destination.

## Query cache controls

`search(...)` and `answer(...)` support optional cache overrides:

- `cache.enabled`
- `cache.backend`
- `cache.namespace`
- `cache.ttlSec`, `cache.searchTtlSec`, `cache.answerTtlSec`, `cache.embeddingTtlSec`
- `cache.storageUri` (required for `storage_json`)
- `cache.lockTimeoutMs`
- `cache.lockScope` (`script` | `user` | `none`)
- `cache.updateStatsOnGet`

Script property defaults are also supported:

- `RAG_CACHE_ENABLED`
- `RAG_CACHE_BACKEND`
- `RAG_CACHE_NAMESPACE`
- `RAG_CACHE_TTL_SEC`
- `RAG_CACHE_SEARCH_TTL_SEC`
- `RAG_CACHE_ANSWER_TTL_SEC`
- `RAG_CACHE_EMBEDDING_TTL_SEC`
- `RAG_CACHE_STORAGE_URI`
- `RAG_CACHE_LOCK_TIMEOUT_MS`
- `RAG_CACHE_LOCK_SCOPE`
- `RAG_CACHE_UPDATE_STATS_ON_GET`

## Retrieval latency budgets

Use retrieval budgets to bound search/answer latency under load:

- `search.options.maxRetrievalMs`
- `answer.options.maxRetrievalMs`

Timeout behavior for `answer(...)` is controlled by:

- `answer.options.onRetrievalTimeout='error'` (default): throw typed retrieval timeout error.
- `answer.options.onRetrievalTimeout='insufficient_context'`: return deterministic abstain response.
- `answer.options.onRetrievalTimeout='fallback'`: run fallback answer behavior when configured.

## Integrity checklist

- Keep one index bound to one embedding provider+model.
- Rebuild or sync after source updates.
- Avoid mixing unrelated corpora in the same index file.
- Validate output citations in consumer UI before rendering as authoritative.

## CI/runtime checks

Before release candidate validation:

```bash
npm run lint
npm run test:local
npm run test:perf:check
mkdocs build --strict
clasp push
clasp run runAllTests
clasp run runPerformanceBenchmarks
```

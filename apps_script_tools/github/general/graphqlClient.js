function astGitHubGraphqlNormalizeDocument(query) {
  const source = astGitHubNormalizeString(query, '');
  if (!source) {
    return '';
  }
  return source.replace(/^\s*(#.*\n)*/g, '').trim();
}

function astGitHubGraphqlCollectOperations(query) {
  const source = astGitHubGraphqlNormalizeDocument(query);
  if (!source) {
    return [];
  }

  const operations = [];
  const length = source.length;
  let depth = 0;
  let idx = 0;

  function isIdentifierStart(char) {
    return /[A-Za-z_]/.test(char);
  }

  function isIdentifierPart(char) {
    return /[0-9A-Za-z_]/.test(char);
  }

  while (idx < length) {
    const char = source[idx];

    if (char === '#') {
      while (idx < length && source[idx] !== '\n') {
        idx += 1;
      }
      continue;
    }

    if (char === '{') {
      depth += 1;
      idx += 1;
      continue;
    }

    if (char === '}') {
      depth = Math.max(0, depth - 1);
      idx += 1;
      continue;
    }

    if (char === '"') {
      const isBlockString = source.slice(idx, idx + 3) === '"""';
      idx += isBlockString ? 3 : 1;

      while (idx < length) {
        if (isBlockString && source.slice(idx, idx + 3) === '"""') {
          idx += 3;
          break;
        }

        const inner = source[idx];
        if (!isBlockString && inner === '\\') {
          idx += 2;
          continue;
        }
        if (!isBlockString && inner === '"') {
          idx += 1;
          break;
        }
        idx += 1;
      }
      continue;
    }

    if (depth === 0 && isIdentifierStart(char)) {
      const tokenStart = idx;
      idx += 1;
      while (idx < length && isIdentifierPart(source[idx])) {
        idx += 1;
      }
      const token = source.slice(tokenStart, idx).toLowerCase();
      if (token === 'query' || token === 'mutation' || token === 'subscription') {
        while (idx < length && /\s/.test(source[idx])) {
          idx += 1;
        }

        let name = null;
        if (idx < length && isIdentifierStart(source[idx])) {
          const nameStart = idx;
          idx += 1;
          while (idx < length && isIdentifierPart(source[idx])) {
            idx += 1;
          }
          name = source.slice(nameStart, idx);
        }

        operations.push({
          type: token,
          name
        });
      }
      continue;
    }

    idx += 1;
  }

  return operations;
}

function astGitHubGraphqlDetectOperationType(query, operationName = null) {
  const cleaned = astGitHubGraphqlNormalizeDocument(query);
  if (!cleaned) {
    return null;
  }

  const operations = astGitHubGraphqlCollectOperations(cleaned);
  const normalizedOperationName = astGitHubNormalizeString(operationName, '');
  if (normalizedOperationName) {
    for (let idx = 0; idx < operations.length; idx += 1) {
      const operation = operations[idx];
      if (astGitHubNormalizeString(operation.name, '') === normalizedOperationName) {
        return operation.type || null;
      }
    }
  }

  if (operations.length > 0) {
    return operations[0].type || null;
  }

  if (cleaned.startsWith('{')) {
    return 'query';
  }

  return null;
}

function astGitHubGraphqlIsMutation(query, operationName = null) {
  return astGitHubGraphqlDetectOperationType(query, operationName) === 'mutation';
}

function astGitHubBuildRequestHeaders(config, operationSpec, extraHeaders = {}) {
  const headers = {
    Authorization: `Bearer ${config.token}`,
    Accept: operationSpec && operationSpec.accept ? operationSpec.accept : 'application/vnd.github+json',
    'X-GitHub-Api-Version': config.apiVersion,
    'User-Agent': config.userAgent
  };

  const mergedExtra = astGitHubCacheIsPlainObject(extraHeaders) ? extraHeaders : {};
  Object.keys(mergedExtra).forEach(key => {
    if (mergedExtra[key] == null || mergedExtra[key] === '') {
      return;
    }
    headers[key] = String(mergedExtra[key]);
  });

  return headers;
}

function astGitHubBuildCachedEnvelope(bodyData, responseHeaders, cacheConfig, etag, nowMs) {
  const ttlSec = Math.max(0, Number(cacheConfig.ttlSec || 0));
  const staleTtlSec = Math.max(ttlSec, Number(cacheConfig.staleTtlSec || 0));
  const etagTtlSec = Math.max(0, Number(cacheConfig.etagTtlSec || 0));

  return {
    data: bodyData,
    headers: responseHeaders,
    etag: etag || null,
    cachedAtMs: nowMs,
    freshUntilMs: nowMs + (ttlSec * 1000),
    staleUntilMs: nowMs + (staleTtlSec * 1000),
    etagUntilMs: nowMs + (etagTtlSec * 1000)
  };
}

function astGitHubRunGraphqlRequest(request, config) {
  const isMutation = astGitHubGraphqlIsMutation(request.query, request.operationName);

  const dryRunPlan = request.options.dryRun && isMutation
    ? astGitHubBuildDryRunPlan({
      request,
      config,
      operationSpec: { mutation: true },
      method: 'post',
      path: '/graphql',
      queryParams: {},
      graphqlPayload: {
        query: request.query,
        variables: request.variables || {},
        operationName: request.operationName || null
      }
    })
    : null;

  if (dryRunPlan) {
    return astGitHubNormalizeResponse({
      operation: 'graphql',
      operationSpec: { read: false, mutation: true, paginated: false },
      method: 'post',
      path: '/graphql',
      request,
      config,
      dryRunPlan,
      warnings: []
    });
  }

  const useCache = astGitHubIsCacheEnabled({ read: !isMutation }, config, request.options) && !isMutation;
  const cacheConfig = config.cache || {};
  const requestHeaders = astGitHubBuildRequestHeaders(config, null);
  const cacheVary = {
    accept: requestHeaders.Accept || null,
    apiVersion: requestHeaders['X-GitHub-Api-Version'] || null
  };
  const payload = {
    query: request.query,
    variables: request.variables || {},
    operationName: request.operationName || null
  };

  const cacheKey = useCache
    ? astGitHubBuildCacheKey(request, config, 'post', '/graphql', {}, payload, true, cacheVary)
    : null;

  const nowMs = Date.now();
  const cached = cacheKey ? astGitHubReadCacheEntry(cacheKey, cacheConfig) : null;
  const cachedState = astGitHubClassifyCachedPayload(cached, nowMs);

  if (cachedState.fresh) {
    return astGitHubNormalizeResponse({
      operation: 'graphql',
      operationSpec: { read: true, mutation: false, paginated: false },
      method: 'post',
      path: '/graphql',
      request,
      config,
      cached,
      cacheMeta: {
        enabled: true,
        hit: true,
        etagUsed: false,
        revalidated304: false,
        key: cacheKey
      }
    });
  }

  const requestHeadersWithConditional = Object.assign({}, requestHeaders);
  if (cachedState.etagValid) {
    requestHeadersWithConditional['If-None-Match'] = cached.etag;
  }

  let httpResult;
  try {
    httpResult = astGitHubHttpRequest({
      operation: 'graphql',
      url: config.graphqlUrl,
      method: 'post',
      payload: JSON.stringify(payload),
      headers: requestHeadersWithConditional,
      retries: config.retries,
      timeoutMs: config.timeoutMs
    });
  } catch (error) {
    if (useCache && cachedState.stale && cacheConfig.serveStaleOnError === true) {
      return astGitHubNormalizeResponse({
        operation: 'graphql',
        operationSpec: { read: true, mutation: false, paginated: false },
        method: 'post',
        path: '/graphql',
        request,
        config,
        cached,
        cacheMeta: {
          enabled: true,
          hit: true,
          etagUsed: false,
          revalidated304: false,
          key: cacheKey
        },
        warnings: ['Served stale GitHub GraphQL cache entry due to upstream error']
      });
    }
    throw error;
  }

  if (httpResult.statusCode === 304 && cachedState.hasValue) {
    const refreshedEnvelope = astGitHubBuildCachedEnvelope(cached.data, httpResult.headers, cacheConfig, cached.etag, Date.now());
    astGitHubWriteCacheEntry(cacheKey, refreshedEnvelope, cacheConfig, astGitHubBuildGraphqlCacheTags(request));

    return astGitHubNormalizeResponse({
      operation: 'graphql',
      operationSpec: { read: true, mutation: false, paginated: false },
      method: 'post',
      path: '/graphql',
      request,
      config,
      cached: refreshedEnvelope,
      cacheMeta: {
        enabled: true,
        hit: true,
        etagUsed: true,
        revalidated304: true,
        key: cacheKey
      }
    });
  }

  if (astGitHubCacheIsPlainObject(httpResult.bodyJson) && Array.isArray(httpResult.bodyJson.errors) && httpResult.bodyJson.errors.length > 0) {
    throw new AstGitHubProviderError('GitHub GraphQL returned errors', {
      operation: 'graphql',
      errors: httpResult.bodyJson.errors,
      data: httpResult.bodyJson.data || null
    });
  }

  const etag = astGitHubNormalizeString(httpResult.headers.etag, null);
  if (useCache) {
    const envelope = astGitHubBuildCachedEnvelope(
      httpResult.bodyJson || { data: null },
      httpResult.headers,
      cacheConfig,
      etag,
      Date.now()
    );
    astGitHubWriteCacheEntry(cacheKey, envelope, cacheConfig, astGitHubBuildGraphqlCacheTags(request));
  }

  if (isMutation) {
    astGitHubInvalidateCacheTags(astGitHubBuildGraphqlCacheTags(request), cacheConfig);
  }

  return astGitHubNormalizeResponse({
    operation: 'graphql',
    operationSpec: { read: !isMutation, mutation: isMutation, paginated: false },
    method: 'post',
    path: '/graphql',
    request,
    config,
    httpResult,
    cacheMeta: {
      enabled: useCache,
      hit: false,
      etagUsed: cachedState.etagValid,
      revalidated304: false,
      key: cacheKey
    }
  });
}

function astGitHubBuildGraphqlCacheTags(request) {
  const tags = ['github:all', 'github:graphql'];
  const variables = astGitHubCacheIsPlainObject(request && request.variables)
    ? request.variables
    : {};

  const owner = astGitHubNormalizeString(
    request && request.owner ? request.owner : (variables.owner || variables.repoOwner),
    ''
  );
  const repo = astGitHubNormalizeString(
    request && request.repo ? request.repo : variables.repo,
    ''
  );

  if (owner && repo) {
    tags.push(`github:repo:${owner}/${repo}`);
  }

  return tags;
}

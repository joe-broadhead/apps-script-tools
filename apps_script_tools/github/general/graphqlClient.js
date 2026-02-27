function astGitHubGraphqlNormalizeDocument(query) {
  const source = astGitHubNormalizeString(query, '');
  if (!source) {
    return '';
  }
  return source.replace(/^\s*(#.*\n)*/g, '').trim();
}

function astGitHubGraphqlDetectOperationType(query, operationName = null) {
  const cleaned = astGitHubGraphqlNormalizeDocument(query);
  if (!cleaned) {
    return null;
  }

  const normalizedOperationName = astGitHubNormalizeString(operationName, '');
  if (normalizedOperationName) {
    const pattern = /\b(query|mutation|subscription)\b\s+([_A-Za-z][_0-9A-Za-z]*)/gi;
    let match = pattern.exec(cleaned);
    while (match) {
      const type = astGitHubNormalizeString(match[1], '').toLowerCase();
      const name = astGitHubNormalizeString(match[2], '');
      if (name === normalizedOperationName) {
        return type || null;
      }
      match = pattern.exec(cleaned);
    }
  }

  const normalized = cleaned.toLowerCase();
  if (normalized.startsWith('mutation')) {
    return 'mutation';
  }
  if (normalized.startsWith('query')) {
    return 'query';
  }
  if (normalized.startsWith('subscription')) {
    return 'subscription';
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

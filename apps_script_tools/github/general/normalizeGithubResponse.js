function astGitHubNormalizeIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astGitHubNormalizeStringValue(value, fallback = null) {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function astGitHubExtractDataBody(operationSpec, httpResult) {
  if (!httpResult) {
    return null;
  }

  const preferText = operationSpec && operationSpec.accept === 'application/vnd.github.v3.diff';
  if (preferText) {
    return astGitHubNormalizeStringValue(httpResult.bodyText, '');
  }

  if (typeof httpResult.bodyJson !== 'undefined' && httpResult.bodyJson !== null) {
    return httpResult.bodyJson;
  }

  const text = astGitHubNormalizeStringValue(httpResult.bodyText, null);
  return text != null ? text : null;
}

function astGitHubExtractRateLimitFromHeaders(headers = {}, bodyJson = null) {
  const normalizedHeaders = astGitHubNormalizeIsPlainObject(headers) ? headers : {};

  const limitRaw = normalizedHeaders['x-ratelimit-limit'];
  const remainingRaw = normalizedHeaders['x-ratelimit-remaining'];
  const resetRaw = normalizedHeaders['x-ratelimit-reset'];

  const limit = Number(limitRaw);
  const remaining = Number(remainingRaw);
  const resetSeconds = Number(resetRaw);

  const output = {
    limit: isFinite(limit) && limit > 0 ? limit : null,
    remaining: isFinite(remaining) ? remaining : null,
    resetAt: isFinite(resetSeconds) && resetSeconds > 0
      ? new Date(resetSeconds * 1000).toISOString()
      : null
  };

  if (astGitHubNormalizeIsRateLimitBody(bodyJson)) {
    output.resources = bodyJson.resources;
  }

  return output;
}

function astGitHubNormalizeIsRateLimitBody(bodyJson) {
  return astGitHubNormalizeIsPlainObject(bodyJson) && astGitHubNormalizeIsPlainObject(bodyJson.resources);
}

function astGitHubNormalizeResponse(args = {}) {
  const operation = astGitHubNormalizeStringValue(args.operation, null);
  const operationSpec = args.operationSpec || {};
  const path = astGitHubNormalizeStringValue(args.path, null);
  const method = astGitHubNormalizeStringValue(args.method, 'GET').toUpperCase();
  const config = astGitHubNormalizeIsPlainObject(args.config) ? args.config : {};
  const request = astGitHubNormalizeIsPlainObject(args.request) ? args.request : {};
  const httpResult = astGitHubNormalizeIsPlainObject(args.httpResult) ? args.httpResult : null;
  const cached = astGitHubNormalizeIsPlainObject(args.cached) ? args.cached : null;
  const cacheMeta = astGitHubNormalizeIsPlainObject(args.cacheMeta) ? args.cacheMeta : {};
  const dryRunPlan = astGitHubNormalizeIsPlainObject(args.dryRunPlan) ? args.dryRunPlan : null;

  const headers = httpResult && astGitHubNormalizeIsPlainObject(httpResult.headers)
    ? httpResult.headers
    : (cached && astGitHubNormalizeIsPlainObject(cached.headers) ? cached.headers : {});

  const data = httpResult
    ? astGitHubExtractDataBody(operationSpec, httpResult)
    : (cached && typeof cached.data !== 'undefined' ? cached.data : null);

  const paginationInput = {
    page: request.options && request.options.page ? request.options.page : 1,
    perPage: request.options && request.options.perPage ? request.options.perPage : 30
  };

  const page = operationSpec.paginated === true
    ? astGitHubNormalizePaginationResponse(headers, paginationInput)
    : {
        page: paginationInput.page,
        perPage: paginationInput.perPage,
        nextPage: null,
        hasMore: false
      };

  const response = {
    status: 'ok',
    operation,
    source: {
      baseUrl: config.baseUrl || 'https://api.github.com',
      method,
      path
    },
    data,
    page,
    rateLimit: astGitHubExtractRateLimitFromHeaders(headers, httpResult ? httpResult.bodyJson : null),
    cache: {
      enabled: cacheMeta.enabled === true,
      hit: cacheMeta.hit === true,
      etagUsed: cacheMeta.etagUsed === true,
      revalidated304: cacheMeta.revalidated304 === true,
      key: cacheMeta.key || null
    },
    dryRun: {
      enabled: dryRunPlan != null,
      plannedRequest: dryRunPlan
    },
    warnings: Array.isArray(args.warnings) ? args.warnings.slice() : []
  };

  if (request.options && request.options.includeRaw === true) {
    response.raw = {
      statusCode: httpResult ? httpResult.statusCode : null,
      headers,
      bodyText: httpResult ? httpResult.bodyText : null,
      bodyJson: httpResult ? httpResult.bodyJson : null
    };
  }

  return response;
}

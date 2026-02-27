function astGitHubValidateIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astGitHubCloneObject(value) {
  return astGitHubValidateIsPlainObject(value)
    ? Object.assign({}, value)
    : {};
}

function astGitHubNormalizeString(value, fallback = null) {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function astGitHubNormalizeInteger(value, field, fallback = null, min = 1) {
  if (typeof value === 'undefined' || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) {
    throw new AstGitHubValidationError(`GitHub request field '${field}' must be an integer >= ${min}`, {
      field,
      value
    });
  }

  return parsed;
}

function astGitHubNormalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }
  return fallback;
}

function astGitHubNormalizeOptionalBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  return null;
}

function astGitHubNormalizeOptionalInteger(value, field, min = 0) {
  if (typeof value === 'undefined' || value === null || value === '') {
    return null;
  }
  return astGitHubNormalizeInteger(value, field, null, min);
}

function astGitHubNormalizeOptions(options = {}) {
  if (!astGitHubValidateIsPlainObject(options)) {
    throw new AstGitHubValidationError('GitHub request options must be an object');
  }

  const timeoutMs = astGitHubNormalizeOptionalInteger(options.timeoutMs, 'options.timeoutMs', 1);
  const retries = astGitHubNormalizeOptionalInteger(options.retries, 'options.retries', 0);
  const page = astGitHubNormalizeInteger(options.page, 'options.page', 1, 1);
  const perPage = astGitHubNormalizeInteger(options.perPage, 'options.perPage', 30, 1);

  const cacheInput = astGitHubValidateIsPlainObject(options.cache) ? options.cache : {};
  const cache = {
    enabled: astGitHubNormalizeOptionalBoolean(cacheInput.enabled),
    backend: astGitHubNormalizeString(cacheInput.backend, null),
    namespace: astGitHubNormalizeString(cacheInput.namespace, null),
    ttlSec: astGitHubNormalizeOptionalInteger(cacheInput.ttlSec, 'options.cache.ttlSec', 0),
    staleTtlSec: astGitHubNormalizeOptionalInteger(cacheInput.staleTtlSec, 'options.cache.staleTtlSec', 0),
    etagTtlSec: astGitHubNormalizeOptionalInteger(cacheInput.etagTtlSec, 'options.cache.etagTtlSec', 0),
    storageUri: astGitHubNormalizeString(cacheInput.storageUri, null),
    coalesce: astGitHubNormalizeOptionalBoolean(cacheInput.coalesce),
    coalesceLeaseMs: astGitHubNormalizeOptionalInteger(cacheInput.coalesceLeaseMs, 'options.cache.coalesceLeaseMs', 1),
    coalesceWaitMs: astGitHubNormalizeOptionalInteger(cacheInput.coalesceWaitMs, 'options.cache.coalesceWaitMs', 1),
    pollMs: astGitHubNormalizeOptionalInteger(cacheInput.pollMs, 'options.cache.pollMs', 1),
    serveStaleOnError: astGitHubNormalizeOptionalBoolean(cacheInput.serveStaleOnError)
  };

  return {
    dryRun: astGitHubNormalizeBoolean(options.dryRun, false),
    includeRaw: astGitHubNormalizeBoolean(options.includeRaw, false),
    timeoutMs,
    retries,
    page,
    perPage,
    cache
  };
}

function astGitHubValidateRequest(request = {}, forcedOperation = null) {
  if (!astGitHubValidateIsPlainObject(request)) {
    throw new AstGitHubValidationError('GitHub request must be an object');
  }

  const operation = astGitHubNormalizeString(forcedOperation || request.operation, null);
  if (!operation) {
    throw new AstGitHubValidationError("Missing required GitHub request field 'operation'", {
      field: 'operation'
    });
  }

  const loweredOperation = operation.toLowerCase();
  const isGraphql = loweredOperation === 'graphql';
  if (!isGraphql && !astGitHubGetOperationSpec(loweredOperation)) {
    throw new AstGitHubValidationError('Unsupported GitHub operation', {
      operation: loweredOperation
    });
  }

  const owner = astGitHubNormalizeString(request.owner, null);
  const repo = astGitHubNormalizeString(request.repo, null);
  const path = astGitHubNormalizeString(request.path, null);
  const branch = astGitHubNormalizeString(request.branch, null);
  const ref = astGitHubNormalizeString(request.ref || request.sha, null);
  const tag = astGitHubNormalizeString(request.tag, null);
  const query = astGitHubNormalizeString(request.query, null);
  const operationName = astGitHubNormalizeString(request.operationName, null);

  const issueNumber = astGitHubNormalizeInteger(request.issueNumber, 'issueNumber', null, 1);
  const pullNumber = astGitHubNormalizeInteger(request.pullNumber, 'pullNumber', null, 1);
  const reviewId = astGitHubNormalizeInteger(request.reviewId, 'reviewId', null, 1);
  const commentId = astGitHubNormalizeInteger(request.commentId, 'commentId', null, 1);

  const body = typeof request.body === 'undefined'
    ? {}
    : request.body;
  if (!astGitHubValidateIsPlainObject(body)) {
    throw new AstGitHubValidationError('GitHub request body must be an object when provided');
  }

  const auth = typeof request.auth === 'undefined'
    ? {}
    : request.auth;
  if (!astGitHubValidateIsPlainObject(auth)) {
    throw new AstGitHubValidationError('GitHub request auth must be an object when provided');
  }

  const providerOptions = typeof request.providerOptions === 'undefined'
    ? {}
    : request.providerOptions;
  if (!astGitHubValidateIsPlainObject(providerOptions)) {
    throw new AstGitHubValidationError('GitHub providerOptions must be an object when provided');
  }

  const options = astGitHubNormalizeOptions(request.options || {});

  const normalized = {
    operation: loweredOperation,
    owner,
    repo,
    issueNumber,
    pullNumber,
    reviewId,
    commentId,
    path,
    branch,
    ref,
    tag,
    query,
    operationName,
    body: astGitHubCloneObject(body),
    auth: astGitHubCloneObject(auth),
    options,
    providerOptions: astGitHubCloneObject(providerOptions)
  };

  if (isGraphql) {
    const graphqlQuery = astGitHubNormalizeString(request.query || request.graphql, null);
    if (!graphqlQuery) {
      throw new AstGitHubValidationError("Missing required GitHub request field 'query' for graphql operation", {
        field: 'query'
      });
    }

    const variables = typeof request.variables === 'undefined'
      ? {}
      : request.variables;

    if (!astGitHubValidateIsPlainObject(variables)) {
      throw new AstGitHubValidationError('GitHub graphql variables must be an object when provided');
    }

    normalized.query = graphqlQuery;
    normalized.variables = astGitHubCloneObject(variables);
  }

  return normalized;
}

function astGitHubValidateGraphqlRequest(request = {}) {
  return astGitHubValidateRequest(Object.assign({}, request, { operation: 'graphql' }), 'graphql');
}

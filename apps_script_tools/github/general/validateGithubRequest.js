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

function astGitHubValidateSlugField(value, fieldName) {
  if (!value) {
    return;
  }

  if (/[\u0000-\u001F]/.test(value) || value.includes('/') || value.includes('\\') || value.includes('..')) {
    throw new AstGitHubValidationError(`GitHub request field '${fieldName}' contains disallowed path characters`, {
      field: fieldName,
      value
    });
  }

  if (!/^[A-Za-z0-9_.-]+$/.test(value)) {
    throw new AstGitHubValidationError(`GitHub request field '${fieldName}' contains unsupported characters`, {
      field: fieldName,
      value
    });
  }
}

function astGitHubValidatePathField(pathValue, fieldName = 'path') {
  if (!pathValue) {
    return;
  }

  if (/[\u0000-\u001F]/.test(pathValue) || pathValue.includes('\\')) {
    throw new AstGitHubValidationError(`GitHub request field '${fieldName}' contains disallowed path characters`, {
      field: fieldName,
      value: pathValue
    });
  }

  const segments = String(pathValue)
    .split('/')
    .filter(Boolean);

  if (segments.length === 0) {
    throw new AstGitHubValidationError(`GitHub request field '${fieldName}' must include at least one path segment`, {
      field: fieldName,
      value: pathValue
    });
  }

  if (segments.some(segment => segment === '.' || segment === '..')) {
    throw new AstGitHubValidationError(`GitHub request field '${fieldName}' must not include '.' or '..' segments`, {
      field: fieldName,
      value: pathValue
    });
  }
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

function astGitHubNormalizeWorkflowId(value, fallback = null) {
  if (typeof value === 'undefined' || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 1) {
      throw new AstGitHubValidationError("GitHub request field 'workflowId' must be a positive integer or a workflow file identifier", {
        field: 'workflowId',
        value
      });
    }
    return String(value);
  }

  if (typeof value !== 'string') {
    throw new AstGitHubValidationError("GitHub request field 'workflowId' must be a string or integer", {
      field: 'workflowId',
      value
    });
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  if (/[\u0000-\u001F]/.test(trimmed) || trimmed.includes('\\') || trimmed.includes('..')) {
    throw new AstGitHubValidationError("GitHub request field 'workflowId' contains disallowed path characters", {
      field: 'workflowId',
      value: trimmed
    });
  }

  if (trimmed.startsWith('/') || trimmed.endsWith('/') || trimmed.includes('//')) {
    throw new AstGitHubValidationError("GitHub request field 'workflowId' contains invalid slash placement", {
      field: 'workflowId',
      value: trimmed
    });
  }

  return trimmed;
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

function astGitHubReadHeaderIgnoreCase(headers, key) {
  if (!astGitHubValidateIsPlainObject(headers)) {
    return null;
  }

  const normalizedKey = astGitHubNormalizeString(key, '').toLowerCase();
  if (!normalizedKey) {
    return null;
  }

  const keys = Object.keys(headers);
  for (let idx = 0; idx < keys.length; idx += 1) {
    const current = keys[idx];
    if (String(current).toLowerCase() === normalizedKey) {
      return headers[current];
    }
  }

  return null;
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
    verifySignature: astGitHubNormalizeOptionalBoolean(options.verifySignature),
    forceRefreshToken: astGitHubNormalizeOptionalBoolean(options.forceRefreshToken),
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
  const organization = astGitHubNormalizeString(request.organization, null);
  const operationName = astGitHubNormalizeString(request.operationName, null);

  const issueNumber = astGitHubNormalizeInteger(request.issueNumber, 'issueNumber', null, 1);
  const pullNumber = astGitHubNormalizeInteger(request.pullNumber, 'pullNumber', null, 1);
  const reviewId = astGitHubNormalizeInteger(request.reviewId, 'reviewId', null, 1);
  const commentId = astGitHubNormalizeInteger(request.commentId, 'commentId', null, 1);
  const checkRunId = astGitHubNormalizeInteger(
    typeof request.checkRunId !== 'undefined' ? request.checkRunId : request.check_run_id,
    'checkRunId',
    null,
    1
  );
  const workflowId = astGitHubNormalizeWorkflowId(
    typeof request.workflowId !== 'undefined' ? request.workflowId : request.workflow_id,
    null
  );
  const runId = astGitHubNormalizeInteger(
    typeof request.runId !== 'undefined' ? request.runId : request.run_id,
    'runId',
    null,
    1
  );
  const artifactId = astGitHubNormalizeInteger(
    typeof request.artifactId !== 'undefined' ? request.artifactId : request.artifact_id,
    'artifactId',
    null,
    1
  );

  const body = typeof request.body === 'undefined'
    ? {}
    : request.body;
  if (!astGitHubValidateIsPlainObject(body)) {
    throw new AstGitHubValidationError('GitHub request body must be an object when provided');
  }

  if (Array.isArray(body.files)) {
    body.files.forEach((entry, index) => {
      if (!astGitHubValidateIsPlainObject(entry)) {
        throw new AstGitHubValidationError('GitHub request body.files entries must be objects', {
          field: `body.files[${index}]`
        });
      }
      const filePath = astGitHubNormalizeString(entry.path, null);
      if (!filePath) {
        throw new AstGitHubValidationError('GitHub request body.files entries require path', {
          field: `body.files[${index}].path`
        });
      }
      astGitHubValidatePathField(filePath, `body.files[${index}].path`);
    });
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

  const headersInput = typeof request.headers === 'undefined'
    ? (astGitHubValidateIsPlainObject(body.headers) ? body.headers : {})
    : request.headers;
  if (!astGitHubValidateIsPlainObject(headersInput)) {
    throw new AstGitHubValidationError('GitHub request headers must be an object when provided');
  }

  let payload = typeof request.payload !== 'undefined'
    ? request.payload
    : (Object.prototype.hasOwnProperty.call(body, 'payload') ? body.payload : undefined);

  if (typeof payload !== 'undefined' && typeof payload !== 'string' && !astGitHubValidateIsPlainObject(payload)) {
    throw new AstGitHubValidationError('GitHub request payload must be a string or object when provided', {
      field: 'payload'
    });
  }

  if (astGitHubValidateIsPlainObject(payload)) {
    payload = astGitHubCloneObject(payload);
  }

  const options = astGitHubNormalizeOptions(request.options || {});

  astGitHubValidateSlugField(owner, 'owner');
  astGitHubValidateSlugField(repo, 'repo');
  astGitHubValidateSlugField(organization, 'organization');
  astGitHubValidatePathField(path, 'path');

  const normalized = {
    operation: loweredOperation,
    owner,
    repo,
    issueNumber,
    pullNumber,
    reviewId,
    commentId,
    checkRunId,
    workflowId,
    runId,
    artifactId,
    path,
    branch,
    ref,
    tag,
    organization,
    query,
    operationName,
    body: astGitHubCloneObject(body),
    headers: astGitHubCloneObject(headersInput),
    payload,
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

  if (loweredOperation === 'verify_webhook') {
    if (typeof normalized.payload === 'undefined') {
      throw new AstGitHubValidationError("Missing required GitHub request field 'payload' for verify_webhook operation", {
        field: 'payload'
      });
    }

    const signatureHeader = astGitHubNormalizeString(
      astGitHubReadHeaderIgnoreCase(normalized.headers, 'x-hub-signature-256'),
      null
    );
    if (!signatureHeader) {
      throw new AstGitHubValidationError("Missing required GitHub request header 'x-hub-signature-256' for verify_webhook operation", {
        field: 'headers.x-hub-signature-256'
      });
    }
  }

  if (loweredOperation === 'parse_webhook') {
    if (typeof normalized.payload === 'undefined') {
      throw new AstGitHubValidationError("Missing required GitHub request field 'payload' for parse_webhook operation", {
        field: 'payload'
      });
    }

    if (normalized.options.verifySignature === true) {
      const signatureHeader = astGitHubNormalizeString(
        astGitHubReadHeaderIgnoreCase(normalized.headers, 'x-hub-signature-256'),
        null
      );
      if (!signatureHeader) {
        throw new AstGitHubValidationError("Missing required GitHub request header 'x-hub-signature-256' when options.verifySignature=true", {
          field: 'headers.x-hub-signature-256'
        });
      }
    }
  }

  return normalized;
}

function astGitHubValidateGraphqlRequest(request = {}) {
  return astGitHubValidateRequest(Object.assign({}, request, { operation: 'graphql' }), 'graphql');
}

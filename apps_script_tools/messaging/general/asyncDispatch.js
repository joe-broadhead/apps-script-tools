function astMessagingAsyncNormalizeString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function astMessagingAsyncJobsAvailable() {
  if (typeof AST_JOBS !== 'undefined' && AST_JOBS && typeof AST_JOBS.enqueue === 'function') {
    return true;
  }
  if (typeof AST !== 'undefined' && AST && AST.Jobs && typeof AST.Jobs.enqueue === 'function') {
    return true;
  }
  return false;
}

function astMessagingAsyncGetJobsApi() {
  if (typeof AST_JOBS !== 'undefined' && AST_JOBS && typeof AST_JOBS.enqueue === 'function') {
    return AST_JOBS;
  }
  if (typeof AST !== 'undefined' && AST && AST.Jobs && typeof AST.Jobs.enqueue === 'function') {
    return AST.Jobs;
  }
  return null;
}

function astMessagingShouldEnqueueAsync(normalizedRequest = {}, resolvedConfig = {}) {
  if (!astMessagingIsMutationOperation(normalizedRequest.operation)) {
    return false;
  }

  if (normalizedRequest.options && normalizedRequest.options.__fromJob === true) {
    return false;
  }

  const requestEnabled = Boolean(
    normalizedRequest.options && normalizedRequest.options.async && normalizedRequest.options.async.enabled
  );
  const configEnabled = Boolean(resolvedConfig.async && resolvedConfig.async.enabled);
  return requestEnabled || configEnabled;
}

function astMessagingEnqueueAsync(normalizedRequest = {}, resolvedConfig = {}) {
  if (!astMessagingAsyncJobsAvailable()) {
    throw new AstMessagingCapabilityError('Async messaging requires AST.Jobs namespace', {
      required: 'AST.Jobs.enqueue'
    });
  }

  const jobsApi = astMessagingAsyncGetJobsApi();
  const queueName = astMessagingAsyncNormalizeString(
    normalizedRequest.options && normalizedRequest.options.async && normalizedRequest.options.async.queue,
    astMessagingAsyncNormalizeString(resolvedConfig.async && resolvedConfig.async.queue, 'jobs')
  );

  if (queueName !== 'jobs') {
    throw new AstMessagingValidationError('Unsupported async queue for messaging request', {
      queue: queueName
    });
  }

  const payloadRequest = JSON.parse(JSON.stringify(normalizedRequest));
  payloadRequest.options = payloadRequest.options || {};
  payloadRequest.options.async = Object.assign({}, payloadRequest.options.async, { enabled: false });
  payloadRequest.options.__fromJob = true;

  const queued = jobsApi.enqueue({
    name: `messaging:${normalizedRequest.operation}`,
    steps: [
      {
        id: 'dispatch',
        handler: 'astMessagingExecuteAsyncOperation_',
        payload: {
          request: payloadRequest
        }
      }
    ],
    options: {
      checkpointStore: 'properties'
    }
  });

  return {
    queued: true,
    queue: queueName,
    jobId: queued.id,
    status: queued.status
  };
}

function astMessagingExecuteAsyncOperation_(context = {}) {
  const payload = context && context.payload && typeof context.payload === 'object'
    ? context.payload
    : {};
  const request = payload.request && typeof payload.request === 'object'
    ? payload.request
    : null;

  if (!request) {
    throw new AstMessagingValidationError('Async messaging step payload is missing request');
  }

  return astRunMessagingRequest(request);
}

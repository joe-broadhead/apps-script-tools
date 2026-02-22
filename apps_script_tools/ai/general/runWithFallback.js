function astAiNowMs() {
  return new Date().getTime();
}

function astAiBuildCandidateRequest(baseRequest, candidate, routingPolicy) {
  const mergedOptions = Object.assign({}, baseRequest.options || {}, candidate.options || {});

  if (
    routingPolicy &&
    Number.isInteger(routingPolicy.perAttemptTimeoutMs) &&
    routingPolicy.perAttemptTimeoutMs > 0
  ) {
    mergedOptions.timeoutMs = routingPolicy.perAttemptTimeoutMs;
  }

  return Object.assign({}, baseRequest, {
    provider: candidate.provider,
    model: candidate.model || baseRequest.model || null,
    auth: Object.assign({}, baseRequest.auth || {}, candidate.auth || {}),
    providerOptions: Object.assign({}, baseRequest.providerOptions || {}, candidate.providerOptions || {}),
    options: mergedOptions
  });
}

function astAiNormalizeRoutingError(error, retryable) {
  const details = error && error.details && typeof error.details === 'object'
    ? error.details
    : {};

  let statusCode = null;
  if (typeof details.statusCode === 'number' && isFinite(details.statusCode)) {
    statusCode = details.statusCode;
  }

  return {
    name: error && error.name ? error.name : 'Error',
    message: error && error.message ? error.message : 'Unknown AI routing error',
    statusCode,
    retryable: Boolean(retryable)
  };
}

function astAiAttachRoutingToError(error, route) {
  const details = error && error.details && typeof error.details === 'object'
    ? error.details
    : {};

  if (error && typeof error === 'object') {
    error.details = Object.assign({}, details, { route });
  }

  return error;
}

function astAiAttachRouteToResponse(response, route) {
  if (response && typeof response === 'object') {
    response.route = route;
    return response;
  }

  return {
    route
  };
}

function astRunAiWithFallback(normalizedRequest, executeRequest) {
  const routingPolicy = astAiBuildRoutingPolicy(normalizedRequest);
  if (!routingPolicy || !Array.isArray(routingPolicy.candidates) || routingPolicy.candidates.length === 0) {
    return executeRequest(normalizedRequest);
  }

  const attempts = [];
  let lastError = null;

  for (let idx = 0; idx < routingPolicy.candidates.length; idx++) {
    const candidate = routingPolicy.candidates[idx];
    const requestForCandidate = astAiBuildCandidateRequest(normalizedRequest, candidate, routingPolicy);
    const startedAt = astAiNowMs();

    try {
      const response = executeRequest(requestForCandidate);
      const durationMs = Math.max(0, astAiNowMs() - startedAt);

      attempts.push({
        attempt: idx + 1,
        candidateId: candidate.id,
        provider: candidate.provider,
        model: requestForCandidate.model || null,
        status: 'ok',
        durationMs
      });

      const route = {
        strategy: routingPolicy.strategy,
        maxProviderAttempts: routingPolicy.maxProviderAttempts,
        selectedProvider: candidate.provider,
        selectedModel: requestForCandidate.model || null,
        attempts
      };

      return astAiAttachRouteToResponse(response, route);
    } catch (error) {
      const retryable = astAiShouldRetryCandidateError(error, routingPolicy.retryOn);
      const durationMs = Math.max(0, astAiNowMs() - startedAt);

      attempts.push({
        attempt: idx + 1,
        candidateId: candidate.id,
        provider: candidate.provider,
        model: requestForCandidate.model || null,
        status: 'error',
        durationMs,
        error: astAiNormalizeRoutingError(error, retryable)
      });

      lastError = error;

      if (!retryable || idx === routingPolicy.candidates.length - 1) {
        const route = {
          strategy: routingPolicy.strategy,
          maxProviderAttempts: routingPolicy.maxProviderAttempts,
          selectedProvider: null,
          selectedModel: null,
          attempts
        };

        throw astAiAttachRoutingToError(lastError, route);
      }
    }
  }

  throw new AstAiProviderError('AI routing failed with no provider attempts', {
    route: {
      strategy: routingPolicy.strategy,
      maxProviderAttempts: routingPolicy.maxProviderAttempts,
      selectedProvider: null,
      selectedModel: null,
      attempts
    }
  });
}

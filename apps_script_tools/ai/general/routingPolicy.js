const AST_AI_ROUTING_STRATEGIES = Object.freeze([
  'priority',
  'fastest',
  'cost_first'
]);

function astAiIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astAiNormalizeRoutingRetryPolicy(retryOn = {}) {
  if (!astAiIsPlainObject(retryOn)) {
    throw new AstAiValidationError('routing.retryOn must be an object when provided');
  }

  return {
    transientHttp: retryOn.transientHttp !== false,
    providerErrors: Boolean(retryOn.providerErrors),
    authErrors: retryOn.authErrors !== false,
    capabilityErrors: retryOn.capabilityErrors !== false,
    responseParseErrors: retryOn.responseParseErrors !== false
  };
}

function astAiNormalizeRoutingCandidate(candidate, index) {
  if (!astAiIsPlainObject(candidate)) {
    throw new AstAiValidationError('routing.candidates entries must be objects', { index });
  }

  const provider = String(candidate.provider || '').trim();
  if (!AST_AI_PROVIDERS.includes(provider)) {
    throw new AstAiValidationError('routing candidate provider must be supported', {
      index,
      provider
    });
  }

  const model = typeof candidate.model === 'string' && candidate.model.trim().length > 0
    ? candidate.model.trim()
    : null;
  const auth = typeof candidate.auth === 'undefined' ? {} : candidate.auth;
  const providerOptions = typeof candidate.providerOptions === 'undefined' ? {} : candidate.providerOptions;

  if (!astAiIsPlainObject(auth)) {
    throw new AstAiValidationError('routing candidate auth must be an object when provided', { index });
  }

  if (!astAiIsPlainObject(providerOptions)) {
    throw new AstAiValidationError('routing candidate providerOptions must be an object when provided', { index });
  }

  let options = {};
  if (typeof candidate.options !== 'undefined') {
    if (!astAiIsPlainObject(candidate.options)) {
      throw new AstAiValidationError('routing candidate options must be an object when provided', { index });
    }

    const normalizedCandidateOptions = astNormalizeAiOptions(candidate.options);
    options = {};
    Object.keys(candidate.options).forEach(key => {
      if (Object.prototype.hasOwnProperty.call(normalizedCandidateOptions, key)) {
        options[key] = normalizedCandidateOptions[key];
      }
    });
  }

  let priority = null;
  if (typeof candidate.priority !== 'undefined' && candidate.priority !== null) {
    if (typeof candidate.priority !== 'number' || !isFinite(candidate.priority) || candidate.priority < 0) {
      throw new AstAiValidationError('routing candidate priority must be a non-negative number when provided', {
        index,
        priority: candidate.priority
      });
    }

    priority = candidate.priority;
  }

  let latencyMs = null;
  if (typeof candidate.latencyMs !== 'undefined' && candidate.latencyMs !== null) {
    if (typeof candidate.latencyMs !== 'number' || !isFinite(candidate.latencyMs) || candidate.latencyMs <= 0) {
      throw new AstAiValidationError('routing candidate latencyMs must be a positive number when provided', {
        index,
        latencyMs: candidate.latencyMs
      });
    }

    latencyMs = candidate.latencyMs;
  }

  let unitCost = null;
  if (typeof candidate.unitCost !== 'undefined' && candidate.unitCost !== null) {
    if (typeof candidate.unitCost !== 'number' || !isFinite(candidate.unitCost) || candidate.unitCost < 0) {
      throw new AstAiValidationError('routing candidate unitCost must be a non-negative number when provided', {
        index,
        unitCost: candidate.unitCost
      });
    }

    unitCost = candidate.unitCost;
  }

  const candidateId = typeof candidate.id === 'string' && candidate.id.trim().length > 0
    ? candidate.id.trim()
    : `candidate_${index + 1}`;

  return {
    id: candidateId,
    index,
    provider,
    model,
    auth: Object.assign({}, auth),
    providerOptions: Object.assign({}, providerOptions),
    options,
    priority,
    latencyMs,
    unitCost
  };
}

function astAiNormalizeRoutingConfig(routing, fallbackProvider, fallbackModel) {
  if (typeof routing === 'undefined' || routing === null) {
    return null;
  }

  if (!astAiIsPlainObject(routing)) {
    throw new AstAiValidationError('routing must be an object when provided');
  }

  const strategy = typeof routing.strategy === 'string' && routing.strategy.trim().length > 0
    ? routing.strategy.trim()
    : 'priority';

  if (!AST_AI_ROUTING_STRATEGIES.includes(strategy)) {
    throw new AstAiValidationError('routing.strategy must be one of: priority, fastest, cost_first', {
      strategy
    });
  }

  if (typeof routing.candidates !== 'undefined' && !Array.isArray(routing.candidates)) {
    throw new AstAiValidationError('routing.candidates must be an array when provided');
  }

  const candidateInputs = Array.isArray(routing.candidates) ? routing.candidates : [];
  const candidates = candidateInputs.map((candidate, index) => astAiNormalizeRoutingCandidate(candidate, index));

  if (candidates.length === 0) {
    if (!AST_AI_PROVIDERS.includes(fallbackProvider)) {
      throw new AstAiValidationError('Provider is required when routing.candidates is empty');
    }

    candidates.push(astAiNormalizeRoutingCandidate({
      provider: fallbackProvider,
      model: fallbackModel
    }, 0));
  }

  let maxProviderAttempts = candidates.length;
  if (typeof routing.maxProviderAttempts !== 'undefined' && routing.maxProviderAttempts !== null) {
    if (!Number.isInteger(routing.maxProviderAttempts) || routing.maxProviderAttempts < 1) {
      throw new AstAiValidationError('routing.maxProviderAttempts must be a positive integer when provided');
    }

    maxProviderAttempts = Math.min(candidates.length, routing.maxProviderAttempts);
  }

  let perAttemptTimeoutMs = null;
  if (typeof routing.perAttemptTimeoutMs !== 'undefined' && routing.perAttemptTimeoutMs !== null) {
    if (!Number.isInteger(routing.perAttemptTimeoutMs) || routing.perAttemptTimeoutMs < 1) {
      throw new AstAiValidationError('routing.perAttemptTimeoutMs must be a positive integer when provided');
    }

    perAttemptTimeoutMs = routing.perAttemptTimeoutMs;
  }

  const retryOn = astAiNormalizeRoutingRetryPolicy(routing.retryOn || {});

  return {
    strategy,
    candidates,
    maxProviderAttempts,
    perAttemptTimeoutMs,
    retryOn
  };
}

function astAiBuildRoutingPolicy(normalizedRequest = {}) {
  const routing = normalizedRequest.routing;
  if (!routing) {
    return null;
  }

  const sortedCandidates = astAiSortRoutingCandidates(routing.candidates, routing.strategy);
  const cappedCandidates = sortedCandidates.slice(0, routing.maxProviderAttempts);

  return {
    strategy: routing.strategy,
    maxProviderAttempts: routing.maxProviderAttempts,
    perAttemptTimeoutMs: routing.perAttemptTimeoutMs,
    retryOn: Object.assign({}, routing.retryOn),
    candidates: cappedCandidates
  };
}

function astAiShouldRetryCandidateError(error, retryOn = {}) {
  const name = error && error.name ? error.name : '';

  if (name === 'AstAiProviderError') {
    const details = error.details || {};
    const statusCode = Number(details.statusCode);
    const hasStatusCode = !isNaN(statusCode);

    if (hasStatusCode && astAiIsTransientHttpError(statusCode)) {
      return retryOn.transientHttp !== false;
    }

    return Boolean(retryOn.providerErrors);
  }

  if (name === 'AstAiAuthError') {
    return retryOn.authErrors !== false;
  }

  if (name === 'AstAiCapabilityError') {
    return retryOn.capabilityErrors !== false;
  }

  if (name === 'AstAiResponseParseError') {
    return retryOn.responseParseErrors !== false;
  }

  return false;
}

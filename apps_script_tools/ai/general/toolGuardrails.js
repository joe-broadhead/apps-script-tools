function astIsToolGuardrailsObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astNormalizePositiveIntegerGuardrail(value, defaultValue, fieldName, toolName, maxValue) {
  if (typeof value === 'undefined' || value === null) {
    return defaultValue;
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new AstAiValidationError(`Tool guardrail '${fieldName}' must be a positive integer`, {
      toolName,
      fieldName,
      value
    });
  }

  if (typeof maxValue === 'number' && value > maxValue) {
    return maxValue;
  }

  return value;
}

function astNormalizeToolGuardrails(guardrails, toolName) {
  if (typeof guardrails === 'undefined' || guardrails === null) {
    guardrails = {};
  }

  if (!astIsToolGuardrailsObject(guardrails)) {
    throw new AstAiValidationError('Tool guardrails must be an object when provided', {
      toolName
    });
  }

  let idempotencyKey = null;
  if (typeof guardrails.idempotencyKey !== 'undefined' && guardrails.idempotencyKey !== null) {
    if (typeof guardrails.idempotencyKey !== 'string' || guardrails.idempotencyKey.trim().length === 0) {
      throw new AstAiValidationError('Tool guardrail idempotencyKey must be a non-empty string when provided', {
        toolName
      });
    }

    idempotencyKey = guardrails.idempotencyKey.trim();
  }

  return {
    timeoutMs: astNormalizePositiveIntegerGuardrail(
      guardrails.timeoutMs,
      5000,
      'timeoutMs',
      toolName,
      120000
    ),
    maxArgsBytes: astNormalizePositiveIntegerGuardrail(
      guardrails.maxArgsBytes,
      50000,
      'maxArgsBytes',
      toolName,
      5000000
    ),
    maxResultBytes: astNormalizePositiveIntegerGuardrail(
      guardrails.maxResultBytes,
      200000,
      'maxResultBytes',
      toolName,
      10000000
    ),
    retries: typeof guardrails.retries === 'undefined' || guardrails.retries === null
      ? 0
      : astNormalizePositiveIntegerGuardrail(guardrails.retries + 1, 1, 'retries', toolName, 4) - 1,
    idempotencyKeyFromArgs: Boolean(guardrails.idempotencyKeyFromArgs),
    idempotencyKey
  };
}

function astComputeUtf8ByteLength(value) {
  const source = value == null ? '' : String(value);

  if (typeof Utilities !== 'undefined' && Utilities && typeof Utilities.newBlob === 'function') {
    return Utilities.newBlob(source).getBytes().length;
  }

  if (typeof Buffer !== 'undefined' && Buffer && typeof Buffer.byteLength === 'function') {
    return Buffer.byteLength(source, 'utf8');
  }

  try {
    return unescape(encodeURIComponent(source)).length;
  } catch (_error) {
    return source.length;
  }
}

function astAssertToolPayloadLimit(serializedPayload, maxBytes, details) {
  const bytes = astComputeUtf8ByteLength(serializedPayload);
  if (bytes > maxBytes) {
    throw new AstAiToolPayloadLimitError(
      `Tool ${details.payloadType} exceeded ${details.limitField}`,
      Object.assign({}, details, {
        bytes,
        limitBytes: maxBytes
      })
    );
  }
}

function astShouldRetryToolError(error) {
  if (!error || typeof error !== 'object') {
    return true;
  }

  const nonRetriable = {
    AstAiValidationError: true,
    AstAiToolPayloadLimitError: true,
    AstAiToolIdempotencyError: true
  };

  return !nonRetriable[error.name];
}

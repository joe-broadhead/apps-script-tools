function astSecretsMaskKey(value) {
  const key = astSecretsNormalizeString(value, '');
  if (!key) {
    return 'unknown';
  }

  if (key.length <= 4) {
    return `${key.slice(0, 1)}***`;
  }

  return `${key.slice(0, 2)}***${key.slice(-2)}`;
}

function astSecretsRecordTelemetry(eventType, payload = {}) {
  try {
    if (
      typeof AST_TELEMETRY !== 'undefined' &&
      AST_TELEMETRY &&
      typeof AST_TELEMETRY.recordEvent === 'function'
    ) {
      AST_TELEMETRY.recordEvent({
        name: `secrets.${eventType}`,
        payload
      });
    }
  } catch (_error) {
    // Telemetry must never break secrets resolution.
  }
}

function astSecretsParseJsonValue(value, key) {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    throw new AstSecretsParseError(
      'Failed to parse secret value as JSON',
      { key: astSecretsMaskKey(key) },
      error
    );
  }
}

function astRunSecretsRequest(request = {}, overrides = {}) {
  const normalized = astSecretsValidateRequest(request, overrides);
  const resolvedConfig = astSecretsResolveConfig(normalized);
  const provider = astSecretsNormalizeProvider(
    normalized.provider || resolvedConfig.defaultProvider,
    'script_properties'
  );
  const startedAtMs = Date.now();

  astSecretsEnsureOperationSupported(provider, normalized.operation);

  try {
    if (normalized.operation === 'get') {
      let providerResult;
      try {
        providerResult = astSecretsProviderGet(provider, normalized, resolvedConfig);
      } catch (error) {
        const hasDefaultValue = Object.prototype.hasOwnProperty.call(normalized.options, 'defaultValue')
          && typeof normalized.options.defaultValue !== 'undefined';

        if (error && error.name === 'AstSecretsNotFoundError') {
          if (hasDefaultValue) {
            providerResult = {
              value: normalized.options.defaultValue,
              metadata: {
                provider,
                fallback: 'defaultValue'
              }
            };
          } else if (normalized.options.required === false || resolvedConfig.required === false) {
            providerResult = {
              value: null,
              metadata: {
                provider,
                fallback: 'null'
              }
            };
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }

      const rawValue = providerResult.value;
      const value = normalized.options.parseJson
        ? astSecretsParseJsonValue(rawValue, normalized.key)
        : rawValue;

      astSecretsRecordTelemetry('get', {
        provider,
        key: astSecretsMaskKey(normalized.key),
        status: 'ok',
        elapsedMs: Date.now() - startedAtMs
      });

      const output = {
        status: 'ok',
        operation: 'get',
        provider,
        key: normalized.key,
        value,
        found: value != null,
        metadata: providerResult.metadata || {}
      };

      if (normalized.options.includeRaw && providerResult.raw) {
        output.raw = providerResult.raw;
      }

      return output;
    }

    if (normalized.operation === 'set') {
      const providerResult = astSecretsProviderSet(provider, normalized, resolvedConfig);
      astSecretsRecordTelemetry('set', {
        provider,
        key: astSecretsMaskKey(normalized.key),
        status: 'ok',
        elapsedMs: Date.now() - startedAtMs
      });

      return {
        status: 'ok',
        operation: 'set',
        provider,
        key: normalized.key,
        written: true,
        metadata: providerResult.metadata || {}
      };
    }

    if (normalized.operation === 'delete') {
      const providerResult = astSecretsProviderDelete(provider, normalized, resolvedConfig);
      astSecretsRecordTelemetry('delete', {
        provider,
        key: astSecretsMaskKey(normalized.key),
        status: 'ok',
        elapsedMs: Date.now() - startedAtMs
      });

      return {
        status: 'ok',
        operation: 'delete',
        provider,
        key: normalized.key,
        deleted: true,
        metadata: providerResult.metadata || {}
      };
    }

    throw new AstSecretsValidationError(
      `Unsupported secrets operation '${normalized.operation}'`,
      { operation: normalized.operation }
    );
  } catch (error) {
    astSecretsRecordTelemetry('error', {
      provider,
      key: astSecretsMaskKey(normalized.key),
      status: 'error',
      errorName: error && error.name ? error.name : 'Error',
      elapsedMs: Date.now() - startedAtMs
    });
    throw error;
  }
}

function astSecretsParseReferenceUri(reference) {
  if (typeof reference !== 'string') {
    return null;
  }

  const trimmed = reference.trim();
  if (!trimmed.startsWith('secret://')) {
    return null;
  }

  const payload = trimmed.slice('secret://'.length);
  const queryIndex = payload.indexOf('?');
  const basePart = queryIndex === -1 ? payload : payload.slice(0, queryIndex);
  const queryPart = queryIndex === -1 ? '' : payload.slice(queryIndex + 1);
  const slashIndex = basePart.indexOf('/');
  const host = decodeURIComponent(slashIndex === -1 ? basePart : basePart.slice(0, slashIndex));
  const path = decodeURIComponent(slashIndex === -1 ? '' : basePart.slice(slashIndex + 1));

  const query = {};
  if (queryPart) {
    queryPart.split('&').forEach(entry => {
      if (!entry) {
        return;
      }
      const pairIndex = entry.indexOf('=');
      if (pairIndex === -1) {
        query[decodeURIComponent(entry)] = '';
        return;
      }
      const key = decodeURIComponent(entry.slice(0, pairIndex));
      const value = decodeURIComponent(entry.slice(pairIndex + 1));
      query[key] = value;
    });
  }

  const providerFromHost = astSecretsNormalizeProvider(host, null);
  const providerFromQuery = astSecretsNormalizeProvider(query.provider, null);
  const provider = providerFromHost || providerFromQuery || null;
  const key = providerFromHost
    ? path
    : [host, path].filter(Boolean).join('/');

  if (!key) {
    throw new AstSecretsValidationError('Secret reference URI is missing key', {
      reference: astSecretsMaskKey(trimmed)
    });
  }

  const version = astSecretsNormalizeString(query.version, null);
  const secretId = astSecretsNormalizeString(query.secretId, null);
  const projectId = astSecretsNormalizeString(query.projectId, null);
  const required = Object.prototype.hasOwnProperty.call(query, 'required')
    ? astSecretsNormalizeBoolean(query.required, true)
    : null;

  return {
    provider,
    key,
    version,
    secretId,
    projectId,
    required
  };
}

function astSecretsBuildReferenceFingerprint(reference, fallbackProvider) {
  const provider = reference.provider || fallbackProvider || 'script_properties';
  return [
    provider,
    reference.key,
    reference.projectId || '',
    reference.secretId || '',
    reference.version || ''
  ].join('|');
}

function astSecretsResolveValue(value, options = {}) {
  if (typeof value !== 'string') {
    return value;
  }

  const initialReference = astSecretsParseReferenceUri(value);
  if (!initialReference) {
    return value;
  }

  const resolvedConfig = astSecretsResolveConfig({
    auth: astSecretsIsPlainObject(options.auth) ? options.auth : {},
    options: {
      required: Object.prototype.hasOwnProperty.call(options, 'required')
        ? options.required
        : true,
      maxReferenceDepth: options.maxDepth
    }
  });

  const maxDepth = astSecretsNormalizeInteger(
    options.maxDepth,
    resolvedConfig.maxReferenceDepth,
    1,
    20
  );

  const visited = {};
  let currentValue = value;

  for (let idx = 0; idx < maxDepth; idx += 1) {
    const reference = astSecretsParseReferenceUri(currentValue);
    if (!reference) {
      return currentValue;
    }

    const fingerprint = astSecretsBuildReferenceFingerprint(reference, resolvedConfig.defaultProvider);
    if (visited[fingerprint]) {
      throw new AstSecretsValidationError(
        'Detected cyclic secret reference',
        { reference: astSecretsMaskKey(fingerprint) }
      );
    }
    visited[fingerprint] = true;

    const response = astRunSecretsRequest({
      operation: 'get',
      provider: reference.provider || resolvedConfig.defaultProvider,
      key: reference.key,
      secretId: reference.secretId || null,
      projectId: reference.projectId || resolvedConfig.projectId,
      version: reference.version || null,
      auth: astSecretsIsPlainObject(options.auth) ? options.auth : {},
      options: {
        required: reference.required == null
          ? astSecretsNormalizeBoolean(options.required, true)
          : reference.required,
        parseJson: false
      }
    });

    if (response.value == null) {
      return response.value;
    }

    currentValue = typeof response.value === 'string'
      ? response.value
      : String(response.value);
  }

  if (astSecretsParseReferenceUri(currentValue)) {
    throw new AstSecretsValidationError(
      'Secret reference exceeded max resolution depth',
      { maxDepth }
    );
  }

  return currentValue;
}

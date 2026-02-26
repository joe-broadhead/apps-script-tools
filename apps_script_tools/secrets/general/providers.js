function astSecretsGetScriptPropertiesHandle() {
  try {
    if (
      typeof PropertiesService !== 'undefined' &&
      PropertiesService &&
      typeof PropertiesService.getScriptProperties === 'function'
    ) {
      return PropertiesService.getScriptProperties();
    }
  } catch (error) {
    throw new AstSecretsProviderError(
      'Unable to access script properties for secrets provider',
      { provider: 'script_properties' },
      error
    );
  }

  throw new AstSecretsCapabilityError(
    'Script properties provider is not available in this runtime',
    { provider: 'script_properties' }
  );
}

function astSecretsReadScriptPropertyValue(key) {
  const scriptProperties = astSecretsGetScriptPropertiesHandle();

  if (typeof scriptProperties.getProperty !== 'function') {
    throw new AstSecretsCapabilityError(
      'Script properties provider does not support getProperty()',
      { provider: 'script_properties' }
    );
  }

  return scriptProperties.getProperty(key);
}

function astSecretsWriteScriptPropertyValue(key, value) {
  const scriptProperties = astSecretsGetScriptPropertiesHandle();

  if (typeof scriptProperties.setProperty === 'function') {
    scriptProperties.setProperty(key, value);
    return;
  }

  if (typeof scriptProperties.setProperties === 'function') {
    const map = {};
    map[key] = value;
    scriptProperties.setProperties(map, false);
    return;
  }

  throw new AstSecretsCapabilityError(
    'Script properties provider does not support setProperty()/setProperties()',
    { provider: 'script_properties' }
  );
}

function astSecretsDeleteScriptPropertyValue(key) {
  const scriptProperties = astSecretsGetScriptPropertiesHandle();

  if (typeof scriptProperties.deleteProperty === 'function') {
    scriptProperties.deleteProperty(key);
    return;
  }

  if (typeof scriptProperties.setProperty === 'function') {
    scriptProperties.setProperty(key, '');
    return;
  }

  throw new AstSecretsCapabilityError(
    'Script properties provider does not support deleteProperty()',
    { provider: 'script_properties' }
  );
}

function astSecretsResolveSecretManagerToken(auth = {}) {
  const explicitToken = astSecretsResolveFirstString([
    auth.oauthToken,
    auth.accessToken,
    auth.token
  ], null);

  if (explicitToken) {
    return explicitToken;
  }

  try {
    if (
      typeof ScriptApp !== 'undefined' &&
      ScriptApp &&
      typeof ScriptApp.getOAuthToken === 'function'
    ) {
      const token = astSecretsResolveFirstString([ScriptApp.getOAuthToken()], null);
      if (token) {
        return token;
      }
    }
  } catch (error) {
    throw new AstSecretsAuthError(
      'Unable to resolve OAuth token for Secret Manager provider',
      { provider: 'secret_manager' },
      error
    );
  }

  throw new AstSecretsAuthError(
    'Missing OAuth token for Secret Manager provider',
    { provider: 'secret_manager' }
  );
}

function astSecretsResolveSecretManagerResource(request = {}, resolvedConfig = {}) {
  const rawKey = astSecretsNormalizeString(request.key, '');
  if (!rawKey) {
    throw new AstSecretsValidationError('Secret Manager request is missing key');
  }

  const version = astSecretsResolveFirstString([
    request.version,
    request.options && request.options.version
  ], 'latest');

  if (rawKey.startsWith('projects/')) {
    const trimmed = rawKey.replace(/^\/+|\/+$/g, '');
    const hasVersion = /\/versions\/[^/]+$/.test(trimmed);
    const resource = hasVersion
      ? trimmed
      : `${trimmed}/versions/${version}`;

    return {
      resource,
      projectId: null
    };
  }

  const secretId = astSecretsResolveFirstString([
    request.secretId,
    request.options && request.options.secretId,
    rawKey
  ], null);

  const projectId = astSecretsResolveFirstString([
    request.projectId,
    request.auth && request.auth.projectId,
    request.auth && request.auth.SECRET_MANAGER_PROJECT_ID,
    resolvedConfig.projectId
  ], null);

  if (!projectId) {
    throw new AstSecretsAuthError(
      'Missing projectId for Secret Manager provider',
      {
        provider: 'secret_manager',
        field: 'projectId'
      }
    );
  }

  if (!secretId) {
    throw new AstSecretsValidationError(
      'Missing secretId for Secret Manager provider',
      {
        provider: 'secret_manager',
        field: 'secretId'
      }
    );
  }

  return {
    resource: `projects/${projectId}/secrets/${secretId}/versions/${version}`,
    projectId
  };
}

function astSecretsDecodeBase64ToText(base64Value) {
  if (typeof base64Value !== 'string' || base64Value.length === 0) {
    return '';
  }

  if (
    typeof Utilities !== 'undefined' &&
    Utilities &&
    typeof Utilities.base64Decode === 'function'
  ) {
    const decoded = Utilities.base64Decode(base64Value);

    if (Utilities.newBlob && typeof Utilities.newBlob === 'function') {
      return Utilities.newBlob(decoded).getDataAsString();
    }
  }

  if (typeof atob === 'function') {
    return atob(base64Value);
  }

  throw new AstSecretsCapabilityError(
    'No base64 decoding implementation is available',
    { provider: 'secret_manager' }
  );
}

function astSecretsFetchSecretManagerAccessResponse(resource, token) {
  if (
    typeof UrlFetchApp === 'undefined' ||
    !UrlFetchApp ||
    typeof UrlFetchApp.fetch !== 'function'
  ) {
    throw new AstSecretsCapabilityError(
      'Secret Manager provider requires UrlFetchApp.fetch()',
      { provider: 'secret_manager' }
    );
  }

  const url = `https://secretmanager.googleapis.com/v1/${resource}:access`;
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true,
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const status = Number(response.getResponseCode());
  const responseText = response.getContentText() || '';
  let payload = {};
  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch (_error) {
      payload = {};
    }
  }

  if (status === 404) {
    throw new AstSecretsNotFoundError(
      'Secret Manager secret not found',
      { provider: 'secret_manager', resource, status }
    );
  }

  if (status === 401 || status === 403) {
    throw new AstSecretsAuthError(
      'Secret Manager authorization failed',
      { provider: 'secret_manager', resource, status }
    );
  }

  if (status < 200 || status >= 300) {
    throw new AstSecretsProviderError(
      `Secret Manager request failed with status ${status}`,
      {
        provider: 'secret_manager',
        resource,
        status,
        error: payload && payload.error ? payload.error : null
      }
    );
  }

  return {
    payload,
    status,
    rawText: responseText
  };
}

function astSecretsProviderGetScriptProperties(request) {
  const rawValue = astSecretsReadScriptPropertyValue(request.key);

  if (rawValue == null || (typeof rawValue === 'string' && rawValue.length === 0)) {
    throw new AstSecretsNotFoundError(
      'Secret key was not found in script properties',
      { provider: 'script_properties', key: request.key }
    );
  }

  return {
    value: String(rawValue),
    metadata: {
      provider: 'script_properties'
    }
  };
}

function astSecretsProviderSetScriptProperties(request) {
  astSecretsWriteScriptPropertyValue(request.key, request.value);
  astSecretsInvalidateScriptPropertiesSnapshotCache();
  return {
    metadata: {
      provider: 'script_properties'
    }
  };
}

function astSecretsProviderDeleteScriptProperties(request) {
  const existing = astSecretsReadScriptPropertyValue(request.key);
  astSecretsDeleteScriptPropertyValue(request.key);
  astSecretsInvalidateScriptPropertiesSnapshotCache();
  return {
    metadata: {
      provider: 'script_properties',
      existed: existing != null && String(existing).length > 0
    }
  };
}

function astSecretsProviderGetSecretManager(request, resolvedConfig) {
  const token = astSecretsResolveSecretManagerToken(request.auth || {});
  const resource = astSecretsResolveSecretManagerResource(request, resolvedConfig);
  const response = astSecretsFetchSecretManagerAccessResponse(resource.resource, token);
  const payload = response.payload || {};

  if (
    !payload.payload ||
    typeof payload.payload.data !== 'string'
  ) {
    throw new AstSecretsProviderError(
      'Secret Manager response payload is missing expected data field',
      { provider: 'secret_manager', resource: resource.resource }
    );
  }

  return {
    value: astSecretsDecodeBase64ToText(payload.payload.data),
    metadata: {
      provider: 'secret_manager',
      resource: resource.resource,
      versionName: astSecretsNormalizeString(payload.name, null),
      createTime: astSecretsNormalizeString(payload.createTime, null)
    },
    raw: response.payload
  };
}

function astSecretsProviderGet(provider, request, resolvedConfig) {
  if (provider === 'script_properties') {
    return astSecretsProviderGetScriptProperties(request);
  }

  if (provider === 'secret_manager') {
    return astSecretsProviderGetSecretManager(request, resolvedConfig);
  }

  throw new AstSecretsValidationError(
    `Unsupported secrets provider '${provider}'`,
    { provider }
  );
}

function astSecretsProviderSet(provider, request) {
  if (provider === 'script_properties') {
    return astSecretsProviderSetScriptProperties(request);
  }

  throw new AstSecretsCapabilityError(
    `Secrets provider '${provider}' does not support set()`,
    { provider }
  );
}

function astSecretsProviderDelete(provider, request) {
  if (provider === 'script_properties') {
    return astSecretsProviderDeleteScriptProperties(request);
  }

  throw new AstSecretsCapabilityError(
    `Secrets provider '${provider}' does not support delete()`,
    { provider }
  );
}

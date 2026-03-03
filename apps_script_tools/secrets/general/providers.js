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

function astSecretsResolveSecretManagerSecretResource(request = {}, resolvedConfig = {}) {
  const rawKey = astSecretsNormalizeString(request.key, '');
  if (!rawKey) {
    throw new AstSecretsValidationError('Secret Manager request is missing key');
  }

  if (rawKey.startsWith('projects/')) {
    const trimmed = rawKey.replace(/^\/+|\/+$/g, '');
    const secretMatch = trimmed.match(/^projects\/[^/]+\/secrets\/[^/]+/);
    if (!secretMatch) {
      throw new AstSecretsValidationError(
        'Secret Manager key must include projects/{project}/secrets/{secret}',
        { key: rawKey }
      );
    }

    return {
      resource: secretMatch[0],
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
    resource: `projects/${projectId}/secrets/${secretId}`,
    projectId
  };
}

function astSecretsResolveSecretManagerVersionResource(request = {}, resolvedConfig = {}) {
  const rawKey = astSecretsNormalizeString(request.key, '');
  const explicitVersion = astSecretsResolveFirstString([
    request.version,
    request.options && request.options.version
  ], null);

  if (rawKey.startsWith('projects/')) {
    const trimmed = rawKey.replace(/^\/+|\/+$/g, '');
    if (/\/versions\/[^/]+$/.test(trimmed)) {
      return {
        resource: trimmed,
        version: trimmed.slice(trimmed.lastIndexOf('/') + 1)
      };
    }
    const version = explicitVersion || 'latest';
    return {
      resource: `${trimmed}/versions/${version}`,
      version
    };
  }

  const secretResource = astSecretsResolveSecretManagerSecretResource(request, resolvedConfig);
  const version = explicitVersion || 'latest';
  return {
    resource: `${secretResource.resource}/versions/${version}`,
    version
  };
}

function astSecretsDecodeBase64ToText(base64Value) {
  if (typeof base64Value !== 'string' || base64Value.length === 0) {
    return '';
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64Value, 'base64').toString('utf8');
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
    const binary = atob(base64Value);
    if (typeof TextDecoder !== 'undefined') {
      const bytes = new Uint8Array(binary.length);
      for (let idx = 0; idx < binary.length; idx += 1) {
        bytes[idx] = binary.charCodeAt(idx);
      }
      return new TextDecoder('utf-8').decode(bytes);
    }
    return binary;
  }

  throw new AstSecretsCapabilityError(
    'No base64 decoding implementation is available',
    { provider: 'secret_manager' }
  );
}

function astSecretsEncodeTextToBase64(value) {
  const text = String(value == null ? '' : value);

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(text, 'utf8').toString('base64');
  }

  if (
    typeof Utilities !== 'undefined' &&
    Utilities &&
    typeof Utilities.base64Encode === 'function' &&
    typeof Utilities.newBlob === 'function'
  ) {
    return Utilities.base64Encode(Utilities.newBlob(text).getBytes());
  }

  if (typeof btoa === 'function' && typeof TextEncoder !== 'undefined') {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let idx = 0; idx < bytes.length; idx += 1) {
      binary += String.fromCharCode(bytes[idx]);
    }
    return btoa(binary);
  }

  if (typeof btoa === 'function') {
    const utf8Binary = encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_match, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
    return btoa(utf8Binary);
  }

  throw new AstSecretsCapabilityError(
    'No base64 encoding implementation is available',
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

function astSecretsFetchSecretManagerJson(path, token, requestOptions = {}) {
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

  const method = astSecretsNormalizeString(requestOptions.method, 'get').toLowerCase();
  const requestBody = Object.prototype.hasOwnProperty.call(requestOptions, 'body')
    ? requestOptions.body
    : null;
  const headers = Object.assign({}, requestOptions.headers || {}, {
    Authorization: `Bearer ${token}`
  });

  const fetchOptions = {
    method,
    muteHttpExceptions: true,
    headers
  };

  if (requestBody != null) {
    fetchOptions.payload = typeof requestBody === 'string'
      ? requestBody
      : JSON.stringify(requestBody);
    if (!fetchOptions.headers['Content-Type']) {
      fetchOptions.headers['Content-Type'] = 'application/json; charset=UTF-8';
    }
  }

  const url = `https://secretmanager.googleapis.com/v1/${path.replace(/^\/+/, '')}`;
  const response = UrlFetchApp.fetch(url, fetchOptions);
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
      'Secret Manager resource not found',
      { provider: 'secret_manager', path, status }
    );
  }
  if (status === 401 || status === 403) {
    throw new AstSecretsAuthError(
      'Secret Manager authorization failed',
      { provider: 'secret_manager', path, status }
    );
  }
  if (status < 200 || status >= 300) {
    throw new AstSecretsProviderError(
      `Secret Manager request failed with status ${status}`,
      {
        provider: 'secret_manager',
        path,
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

function astSecretsProviderRotateScriptProperties(request) {
  const existing = astSecretsReadScriptPropertyValue(request.key);
  astSecretsWriteScriptPropertyValue(request.key, request.value);
  astSecretsInvalidateScriptPropertiesSnapshotCache();

  return {
    metadata: {
      provider: 'script_properties',
      previousExists: existing != null && String(existing).length > 0,
      rotatedAt: new Date().toISOString(),
      versionId: null
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

function astSecretsProviderRotateSecretManager(request, resolvedConfig) {
  const token = astSecretsResolveSecretManagerToken(request.auth || {});
  const secretResource = astSecretsResolveSecretManagerSecretResource(request, resolvedConfig);
  const payloadBase64 = astSecretsEncodeTextToBase64(request.value);
  const response = astSecretsFetchSecretManagerJson(
    `${secretResource.resource}:addVersion`,
    token,
    {
      method: 'post',
      body: {
        payload: {
          data: payloadBase64
        }
      }
    }
  );
  const body = response.payload || {};

  return {
    metadata: {
      provider: 'secret_manager',
      resource: secretResource.resource,
      versionName: astSecretsNormalizeString(body.name, null),
      createTime: astSecretsNormalizeString(body.createTime, null),
      etag: astSecretsNormalizeString(body.etag, null),
      state: astSecretsNormalizeString(body.state, null)
    },
    raw: body
  };
}

function astSecretsProviderListVersionsSecretManager(request, resolvedConfig) {
  const token = astSecretsResolveSecretManagerToken(request.auth || {});
  const secretResource = astSecretsResolveSecretManagerSecretResource(request, resolvedConfig);
  const pageSize = astSecretsNormalizeInteger(request.options && request.options.pageSize, 50, 1, 1000);
  const pageToken = astSecretsNormalizeString(request.options && request.options.pageToken, null);
  const includeStates = Array.isArray(request.options && request.options.includeStates)
    ? request.options.includeStates
    : [];

  const query = [
    `pageSize=${encodeURIComponent(String(pageSize))}`
  ];
  if (pageToken) {
    query.push(`pageToken=${encodeURIComponent(pageToken)}`);
  }

  const response = astSecretsFetchSecretManagerJson(
    `${secretResource.resource}/versions?${query.join('&')}`,
    token,
    { method: 'get' }
  );
  const payload = response.payload || {};
  const versions = Array.isArray(payload.versions) ? payload.versions : [];
  const filtered = versions.filter(version => {
    if (!includeStates.length) {
      return true;
    }
    const state = astSecretsNormalizeString(version && version.state, '').toUpperCase();
    return includeStates.indexOf(state) !== -1;
  });

  return {
    items: filtered.map(version => ({
      name: astSecretsNormalizeString(version && version.name, null),
      state: astSecretsNormalizeString(version && version.state, null),
      createTime: astSecretsNormalizeString(version && version.createTime, null),
      destroyTime: astSecretsNormalizeString(version && version.destroyTime, null),
      etag: astSecretsNormalizeString(version && version.etag, null),
      replicationStatus: version && version.replicationStatus ? version.replicationStatus : null,
      clientSpecifiedPayloadChecksum: Boolean(version && version.clientSpecifiedPayloadChecksum)
    })),
    nextPageToken: astSecretsNormalizeString(payload.nextPageToken, null),
    metadata: {
      provider: 'secret_manager',
      resource: secretResource.resource
    },
    raw: payload
  };
}

function astSecretsProviderGetVersionMetadataSecretManager(request, resolvedConfig) {
  const token = astSecretsResolveSecretManagerToken(request.auth || {});
  const versionResource = astSecretsResolveSecretManagerVersionResource(request, resolvedConfig);
  const response = astSecretsFetchSecretManagerJson(versionResource.resource, token, { method: 'get' });
  const payload = response.payload || {};

  return {
    metadata: {
      provider: 'secret_manager',
      versionName: astSecretsNormalizeString(payload.name, null),
      state: astSecretsNormalizeString(payload.state, null),
      createTime: astSecretsNormalizeString(payload.createTime, null),
      destroyTime: astSecretsNormalizeString(payload.destroyTime, null),
      etag: astSecretsNormalizeString(payload.etag, null),
      replicationStatus: payload && payload.replicationStatus ? payload.replicationStatus : null,
      clientSpecifiedPayloadChecksum: Boolean(payload && payload.clientSpecifiedPayloadChecksum)
    },
    raw: payload
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

function astSecretsProviderRotate(provider, request, resolvedConfig) {
  if (provider === 'script_properties') {
    return astSecretsProviderRotateScriptProperties(request);
  }

  if (provider === 'secret_manager') {
    return astSecretsProviderRotateSecretManager(request, resolvedConfig);
  }

  throw new AstSecretsCapabilityError(
    `Secrets provider '${provider}' does not support rotate()`,
    { provider }
  );
}

function astSecretsProviderListVersions(provider, request, resolvedConfig) {
  if (provider === 'secret_manager') {
    return astSecretsProviderListVersionsSecretManager(request, resolvedConfig);
  }

  throw new AstSecretsCapabilityError(
    `Secrets provider '${provider}' does not support list_versions()`,
    { provider }
  );
}

function astSecretsProviderGetVersionMetadata(provider, request, resolvedConfig) {
  if (provider === 'secret_manager') {
    return astSecretsProviderGetVersionMetadataSecretManager(request, resolvedConfig);
  }

  throw new AstSecretsCapabilityError(
    `Secrets provider '${provider}' does not support get_version_metadata()`,
    { provider }
  );
}

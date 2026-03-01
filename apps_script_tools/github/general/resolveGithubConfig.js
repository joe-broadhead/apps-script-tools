const AST_GITHUB_CONFIG_KEYS = Object.freeze([
  'GITHUB_TOKEN',
  'GITHUB_TOKEN_TYPE',
  'GITHUB_API_BASE_URL',
  'GITHUB_GRAPHQL_URL',
  'GITHUB_OWNER',
  'GITHUB_REPO',
  'GITHUB_APP_ID',
  'GITHUB_APP_INSTALLATION_ID',
  'GITHUB_APP_PRIVATE_KEY',
  'GITHUB_WEBHOOK_SECRET',
  'GITHUB_TIMEOUT_MS',
  'GITHUB_RETRIES',
  'GITHUB_CACHE_ENABLED',
  'GITHUB_CACHE_BACKEND',
  'GITHUB_CACHE_NAMESPACE',
  'GITHUB_CACHE_TTL_SEC',
  'GITHUB_CACHE_STALE_TTL_SEC',
  'GITHUB_CACHE_ETAG_TTL_SEC',
  'GITHUB_CACHE_STORAGE_URI',
  'GITHUB_CACHE_COALESCE',
  'GITHUB_CACHE_COALESCE_LEASE_MS',
  'GITHUB_CACHE_COALESCE_WAIT_MS',
  'GITHUB_CACHE_POLL_MS',
  'GITHUB_CACHE_SERVE_STALE_ON_ERROR',
  'GITHUB_USER_AGENT'
]);

const AST_GITHUB_DEFAULTS = Object.freeze({
  apiBaseUrl: 'https://api.github.com',
  timeoutMs: 45000,
  retries: 2,
  userAgent: 'apps-script-tools/0.0.5',
  apiVersion: '2022-11-28',
  cache: Object.freeze({
    enabled: false,
    backend: 'memory',
    namespace: 'ast_github',
    ttlSec: 120,
    staleTtlSec: 600,
    etagTtlSec: 3600,
    storageUri: null,
    coalesce: true,
    coalesceLeaseMs: 15000,
    coalesceWaitMs: 12000,
    pollMs: 250,
    serveStaleOnError: true
  })
});

let AST_GITHUB_RUNTIME_CONFIG = {};

function astGitHubResolveIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astGitHubResolveCloneObject(value) {
  if (!astGitHubResolveIsPlainObject(value)) {
    return {};
  }
  return Object.assign({}, value);
}

function astGitHubResolveNormalizeString(value, fallback = null) {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function astGitHubNormalizeConfigValue(value) {
  if (value == null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return null;
}

function astGitHubResolveSecretValue(value, fieldName) {
  const normalized = astGitHubResolveNormalizeString(value, null);
  if (!normalized) {
    return null;
  }

  if (!normalized.startsWith('secret://')) {
    return normalized;
  }

  if (
    typeof AST_SECRETS !== 'undefined' &&
    AST_SECRETS &&
    typeof AST_SECRETS.resolveValue === 'function'
  ) {
    const resolved = AST_SECRETS.resolveValue(normalized);
    if (typeof resolved === 'string' || typeof resolved === 'number' || typeof resolved === 'boolean') {
      return String(resolved);
    }
    throw new AstGitHubAuthError(`GitHub secret reference for '${fieldName}' resolved to non-string value`, {
      field: fieldName
    });
  }

  throw new AstGitHubAuthError(
    `GitHub secret reference for '${fieldName}' requires AST.Secrets to be available`,
    { field: fieldName }
  );
}

function astGitHubResolvePrivateKeyValue(value) {
  const resolved = astGitHubResolveSecretValue(value, 'appPrivateKey');
  if (!resolved) {
    return null;
  }
  return resolved.replace(/\\n/g, '\n');
}

function astGitHubGetRuntimeConfig() {
  return astGitHubResolveCloneObject(AST_GITHUB_RUNTIME_CONFIG);
}

function astGitHubSetRuntimeConfig(config = {}, options = {}) {
  if (!astGitHubResolveIsPlainObject(config)) {
    throw new AstGitHubValidationError('GitHub runtime config must be an object');
  }

  if (!astGitHubResolveIsPlainObject(options)) {
    throw new AstGitHubValidationError('GitHub runtime config options must be an object');
  }

  const merge = options.merge !== false;
  const next = merge ? astGitHubGetRuntimeConfig() : {};

  Object.keys(config).forEach(key => {
    const normalizedKey = astGitHubResolveNormalizeString(key, '');
    if (!normalizedKey) {
      return;
    }

    const normalizedValue = astGitHubNormalizeConfigValue(config[key]);
    if (normalizedValue == null) {
      delete next[normalizedKey];
      return;
    }

    next[normalizedKey] = normalizedValue;
  });

  AST_GITHUB_RUNTIME_CONFIG = next;
  return astGitHubGetRuntimeConfig();
}

function astGitHubClearRuntimeConfig() {
  AST_GITHUB_RUNTIME_CONFIG = {};
  return {};
}

function astGitHubGetScriptPropertiesSnapshot() {
  const output = {};

  try {
    if (
      typeof PropertiesService !== 'undefined' &&
      PropertiesService &&
      typeof PropertiesService.getScriptProperties === 'function'
    ) {
      const scriptProperties = PropertiesService.getScriptProperties();

      if (scriptProperties && typeof scriptProperties.getProperties === 'function') {
        const entries = scriptProperties.getProperties();
        if (astGitHubResolveIsPlainObject(entries)) {
          Object.keys(entries).forEach(key => {
            const normalized = astGitHubNormalizeConfigValue(entries[key]);
            if (normalized != null) {
              output[key] = normalized;
            }
          });
        }
      }

      if (scriptProperties && typeof scriptProperties.getProperty === 'function') {
        AST_GITHUB_CONFIG_KEYS.forEach(key => {
          if (output[key]) {
            return;
          }

          const normalized = astGitHubNormalizeConfigValue(scriptProperties.getProperty(key));
          if (normalized != null) {
            output[key] = normalized;
          }
        });
      }
    }
  } catch (error) {
    // Ignore script property access failures.
  }

  return output;
}

function astGitHubResolveBoolean(value, fallback) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') {
      return true;
    }
    if (normalized === 'false' || normalized === '0') {
      return false;
    }
  }

  if (typeof value === 'number' && isFinite(value)) {
    return value !== 0;
  }

  return fallback;
}

function astGitHubResolvePositiveInt(value, fallback, min = 0) {
  if (typeof value === 'number' && isFinite(value)) {
    return Math.max(min, Math.floor(value));
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (isFinite(parsed)) {
      return Math.max(min, Math.floor(parsed));
    }
  }

  return fallback;
}

function astGitHubResolveStringCandidates(candidates, fallback = null) {
  for (let idx = 0; idx < candidates.length; idx += 1) {
    const normalized = astGitHubResolveNormalizeString(candidates[idx], null);
    if (normalized) {
      return normalized;
    }
  }

  return fallback;
}

function astGitHubResolveCacheConfig(requestOptions = {}, runtimeConfig = {}, scriptConfig = {}) {
  const requestCache = astGitHubResolveIsPlainObject(requestOptions.cache)
    ? requestOptions.cache
    : {};

  const backend = astGitHubResolveStringCandidates([
    requestCache.backend,
    runtimeConfig.GITHUB_CACHE_BACKEND,
    scriptConfig.GITHUB_CACHE_BACKEND
  ], AST_GITHUB_DEFAULTS.cache.backend);

  const namespace = astGitHubResolveStringCandidates([
    requestCache.namespace,
    runtimeConfig.GITHUB_CACHE_NAMESPACE,
    scriptConfig.GITHUB_CACHE_NAMESPACE
  ], AST_GITHUB_DEFAULTS.cache.namespace);

  const storageUri = astGitHubResolveStringCandidates([
    requestCache.storageUri,
    runtimeConfig.GITHUB_CACHE_STORAGE_URI,
    scriptConfig.GITHUB_CACHE_STORAGE_URI
  ], AST_GITHUB_DEFAULTS.cache.storageUri);

  const ttlSec = astGitHubResolvePositiveInt(
    requestCache.ttlSec,
    astGitHubResolvePositiveInt(runtimeConfig.GITHUB_CACHE_TTL_SEC,
      astGitHubResolvePositiveInt(scriptConfig.GITHUB_CACHE_TTL_SEC, AST_GITHUB_DEFAULTS.cache.ttlSec, 0),
    0),
    0
  );

  const staleTtlSecRaw = astGitHubResolvePositiveInt(
    requestCache.staleTtlSec,
    astGitHubResolvePositiveInt(runtimeConfig.GITHUB_CACHE_STALE_TTL_SEC,
      astGitHubResolvePositiveInt(scriptConfig.GITHUB_CACHE_STALE_TTL_SEC, AST_GITHUB_DEFAULTS.cache.staleTtlSec, 0),
    0),
    0
  );

  const etagTtlSecRaw = astGitHubResolvePositiveInt(
    requestCache.etagTtlSec,
    astGitHubResolvePositiveInt(runtimeConfig.GITHUB_CACHE_ETAG_TTL_SEC,
      astGitHubResolvePositiveInt(scriptConfig.GITHUB_CACHE_ETAG_TTL_SEC, AST_GITHUB_DEFAULTS.cache.etagTtlSec, 0),
    0),
    0
  );

  const staleTtlSec = Math.max(ttlSec, staleTtlSecRaw);
  const etagTtlSec = Math.max(0, etagTtlSecRaw);

  return {
    enabled: astGitHubResolveBoolean(
      requestCache.enabled,
      astGitHubResolveBoolean(
        runtimeConfig.GITHUB_CACHE_ENABLED,
        astGitHubResolveBoolean(scriptConfig.GITHUB_CACHE_ENABLED, AST_GITHUB_DEFAULTS.cache.enabled)
      )
    ),
    backend,
    namespace,
    storageUri,
    ttlSec,
    staleTtlSec,
    etagTtlSec,
    coalesce: astGitHubResolveBoolean(
      requestCache.coalesce,
      astGitHubResolveBoolean(
        runtimeConfig.GITHUB_CACHE_COALESCE,
        astGitHubResolveBoolean(scriptConfig.GITHUB_CACHE_COALESCE, AST_GITHUB_DEFAULTS.cache.coalesce)
      )
    ),
    coalesceLeaseMs: astGitHubResolvePositiveInt(
      requestCache.coalesceLeaseMs,
      astGitHubResolvePositiveInt(runtimeConfig.GITHUB_CACHE_COALESCE_LEASE_MS,
        astGitHubResolvePositiveInt(scriptConfig.GITHUB_CACHE_COALESCE_LEASE_MS, AST_GITHUB_DEFAULTS.cache.coalesceLeaseMs, 1),
      1),
      1
    ),
    coalesceWaitMs: astGitHubResolvePositiveInt(
      requestCache.coalesceWaitMs,
      astGitHubResolvePositiveInt(runtimeConfig.GITHUB_CACHE_COALESCE_WAIT_MS,
        astGitHubResolvePositiveInt(scriptConfig.GITHUB_CACHE_COALESCE_WAIT_MS, AST_GITHUB_DEFAULTS.cache.coalesceWaitMs, 1),
      1),
      1
    ),
    pollMs: astGitHubResolvePositiveInt(
      requestCache.pollMs,
      astGitHubResolvePositiveInt(runtimeConfig.GITHUB_CACHE_POLL_MS,
        astGitHubResolvePositiveInt(scriptConfig.GITHUB_CACHE_POLL_MS, AST_GITHUB_DEFAULTS.cache.pollMs, 1),
      1),
      1
    ),
    serveStaleOnError: astGitHubResolveBoolean(
      requestCache.serveStaleOnError,
      astGitHubResolveBoolean(
        runtimeConfig.GITHUB_CACHE_SERVE_STALE_ON_ERROR,
        astGitHubResolveBoolean(scriptConfig.GITHUB_CACHE_SERVE_STALE_ON_ERROR, AST_GITHUB_DEFAULTS.cache.serveStaleOnError)
      )
    )
  };
}

function astGitHubBuildDefaultGraphqlUrl(baseUrl) {
  const normalizedBase = astGitHubResolveNormalizeString(baseUrl, AST_GITHUB_DEFAULTS.apiBaseUrl)
    .replace(/\/+$/, '');
  if (/\/api\/v3$/i.test(normalizedBase)) {
    return normalizedBase.replace(/\/api\/v3$/i, '/api/graphql');
  }
  return `${normalizedBase}/graphql`;
}

function astGitHubResolveConfig(request = {}) {
  if (!astGitHubResolveIsPlainObject(request)) {
    throw new AstGitHubValidationError('resolve config expected normalized GitHub request object');
  }

  const runtimeConfig = astGitHubGetRuntimeConfig();
  const scriptConfig = astGitHubGetScriptPropertiesSnapshot();
  const auth = astGitHubResolveIsPlainObject(request.auth) ? request.auth : {};
  const options = astGitHubResolveIsPlainObject(request.options) ? request.options : {};
  const providerOptions = astGitHubResolveIsPlainObject(request.providerOptions) ? request.providerOptions : {};

  const operation = astGitHubResolveStringCandidates([request.operation], '').toLowerCase();
  const tokenOptionalOperations = {
    auth_as_app: true,
    verify_webhook: true,
    parse_webhook: true
  };
  const tokenOptional = Object.prototype.hasOwnProperty.call(tokenOptionalOperations, operation);

  const tokenTypeRaw = astGitHubResolveStringCandidates([
    auth.tokenType,
    runtimeConfig.GITHUB_TOKEN_TYPE,
    scriptConfig.GITHUB_TOKEN_TYPE
  ], null);
  const normalizedTokenType = astGitHubResolveNormalizeString(tokenTypeRaw, null)
    ? astGitHubResolveNormalizeString(tokenTypeRaw, 'pat').toLowerCase()
    : null;

  if (normalizedTokenType && !['pat', 'github_app', 'app'].includes(normalizedTokenType)) {
    throw new AstGitHubValidationError('Unsupported GitHub tokenType; expected pat or github_app', {
      field: 'tokenType',
      value: tokenTypeRaw
    });
  }

  const tokenRaw = astGitHubResolveStringCandidates([
    auth.token,
    runtimeConfig.GITHUB_TOKEN,
    scriptConfig.GITHUB_TOKEN
  ], null);
  const tokenRequestedByCall = Boolean(astGitHubResolveNormalizeString(auth.token, null));
  const tokenTypeWantsApp = normalizedTokenType === 'github_app' || normalizedTokenType === 'app';
  const shouldResolveToken = Boolean(tokenRaw) && (
    tokenRequestedByCall || (!tokenOptional && !tokenTypeWantsApp)
  );
  const token = shouldResolveToken
    ? astGitHubResolveSecretValue(tokenRaw, 'token')
    : null;

  const appIdRaw = astGitHubResolveStringCandidates([
    auth.appId,
    auth.app_id,
    runtimeConfig.GITHUB_APP_ID,
    scriptConfig.GITHUB_APP_ID
  ], null);
  const appInstallationIdRaw = astGitHubResolveStringCandidates([
    auth.installationId,
    auth.installation_id,
    runtimeConfig.GITHUB_APP_INSTALLATION_ID,
    scriptConfig.GITHUB_APP_INSTALLATION_ID
  ], null);
  const appPrivateKeyRaw = astGitHubResolveStringCandidates([
    auth.privateKey,
    auth.privateKeyPem,
    auth.private_key,
    runtimeConfig.GITHUB_APP_PRIVATE_KEY,
    scriptConfig.GITHUB_APP_PRIVATE_KEY
  ], null);
  const webhookSecretRaw = astGitHubResolveStringCandidates([
    auth.webhookSecret,
    auth.webhook_secret,
    runtimeConfig.GITHUB_WEBHOOK_SECRET,
    scriptConfig.GITHUB_WEBHOOK_SECRET
  ], null);

  const rawAppCredentialsProvided = Boolean(appIdRaw || appInstallationIdRaw || appPrivateKeyRaw);
  const requestedAppAuth = operation === 'auth_as_app' || normalizedTokenType === 'github_app' || normalizedTokenType === 'app';
  const shouldResolveAppCredentials = requestedAppAuth || (!token && rawAppCredentialsProvided);
  const appId = shouldResolveAppCredentials
    ? astGitHubResolveSecretValue(appIdRaw, 'appId')
    : null;
  const appInstallationId = shouldResolveAppCredentials
    ? astGitHubResolveSecretValue(appInstallationIdRaw, 'appInstallationId')
    : null;
  const appPrivateKey = shouldResolveAppCredentials
    ? astGitHubResolvePrivateKeyValue(appPrivateKeyRaw)
    : null;
  const hasAppCredentials = Boolean(appId && appInstallationId && appPrivateKey);

  const shouldResolveWebhookSecret = operation === 'verify_webhook'
    || (operation === 'parse_webhook' && options.verifySignature === true);
  const webhookSecret = shouldResolveWebhookSecret
    ? astGitHubResolveSecretValue(webhookSecretRaw, 'webhookSecret')
    : null;

  const tokenType = normalizedTokenType
    ? normalizedTokenType
    : (token ? 'pat' : (hasAppCredentials ? 'github_app' : 'pat'));
  const wantsAppAuth = tokenType === 'github_app' || tokenType === 'app';

  if (!token && !hasAppCredentials && !tokenOptional) {
    throw new AstGitHubAuthError("Missing required GitHub configuration field 'token'", {
      field: 'token',
      scriptKey: 'GITHUB_TOKEN',
      alsoAccepted: ['GITHUB_APP_ID', 'GITHUB_APP_INSTALLATION_ID', 'GITHUB_APP_PRIVATE_KEY']
    });
  }

  if ((operation === 'auth_as_app' || wantsAppAuth) && !hasAppCredentials) {
    throw new AstGitHubAuthError('Missing required GitHub App configuration fields', {
      required: ['appId', 'appInstallationId', 'appPrivateKey'],
      scriptKeys: ['GITHUB_APP_ID', 'GITHUB_APP_INSTALLATION_ID', 'GITHUB_APP_PRIVATE_KEY']
    });
  }

  const baseUrl = astGitHubResolveStringCandidates([
    providerOptions.baseUrl,
    options.baseUrl,
    runtimeConfig.GITHUB_API_BASE_URL,
    scriptConfig.GITHUB_API_BASE_URL
  ], AST_GITHUB_DEFAULTS.apiBaseUrl);

  const graphqlUrl = astGitHubResolveStringCandidates([
    providerOptions.graphqlUrl,
    options.graphqlUrl,
    runtimeConfig.GITHUB_GRAPHQL_URL,
    scriptConfig.GITHUB_GRAPHQL_URL
  ], astGitHubBuildDefaultGraphqlUrl(baseUrl));

  const owner = astGitHubResolveStringCandidates([
    request.owner,
    request.body && request.body.owner,
    runtimeConfig.GITHUB_OWNER,
    scriptConfig.GITHUB_OWNER
  ], null);

  const repo = astGitHubResolveStringCandidates([
    request.repo,
    request.body && request.body.repo,
    runtimeConfig.GITHUB_REPO,
    scriptConfig.GITHUB_REPO
  ], null);

  const timeoutMs = astGitHubResolvePositiveInt(
    options.timeoutMs,
    astGitHubResolvePositiveInt(runtimeConfig.GITHUB_TIMEOUT_MS,
      astGitHubResolvePositiveInt(scriptConfig.GITHUB_TIMEOUT_MS, AST_GITHUB_DEFAULTS.timeoutMs, 1),
    1),
    1
  );

  const retries = astGitHubResolvePositiveInt(
    options.retries,
    astGitHubResolvePositiveInt(runtimeConfig.GITHUB_RETRIES,
      astGitHubResolvePositiveInt(scriptConfig.GITHUB_RETRIES, AST_GITHUB_DEFAULTS.retries, 0),
    0),
    0
  );

  const userAgent = astGitHubResolveStringCandidates([
    providerOptions.userAgent,
    options.userAgent,
    runtimeConfig.GITHUB_USER_AGENT,
    scriptConfig.GITHUB_USER_AGENT
  ], AST_GITHUB_DEFAULTS.userAgent);

  const apiVersion = astGitHubResolveStringCandidates([
    providerOptions.apiVersion,
    options.apiVersion
  ], AST_GITHUB_DEFAULTS.apiVersion);

  const cache = astGitHubResolveCacheConfig(options, runtimeConfig, scriptConfig);

  return {
    token,
    tokenType: wantsAppAuth ? 'github_app' : tokenType,
    appId,
    appInstallationId,
    appPrivateKey,
    webhookSecret,
    baseUrl: baseUrl.replace(/\/+$/, ''),
    graphqlUrl,
    owner,
    repo,
    timeoutMs,
    retries,
    userAgent,
    apiVersion,
    cache
  };
}

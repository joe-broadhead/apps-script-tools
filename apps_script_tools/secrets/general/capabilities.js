const AST_SECRETS_PROVIDER_CAPABILITIES = Object.freeze({
  script_properties: Object.freeze({
    get: true,
    set: true,
    delete: true
  }),
  secret_manager: Object.freeze({
    get: true,
    set: false,
    delete: false
  })
});

const AST_SECRETS_PROVIDER_ALIASES = Object.freeze({
  script_properties: 'script_properties',
  scriptproperties: 'script_properties',
  script_props: 'script_properties',
  script: 'script_properties',
  props: 'script_properties',
  property: 'script_properties',
  secret_manager: 'secret_manager',
  secretmanager: 'secret_manager',
  google_secret_manager: 'secret_manager',
  googlesecretmanager: 'secret_manager',
  gsm: 'secret_manager'
});

const AST_SECRETS_PROVIDERS = Object.freeze(Object.keys(AST_SECRETS_PROVIDER_CAPABILITIES));

function astSecretsNormalizeProvider(provider, fallback = null) {
  if (typeof provider !== 'string') {
    return fallback;
  }

  const normalized = provider
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');

  if (!normalized) {
    return fallback;
  }

  return AST_SECRETS_PROVIDER_ALIASES[normalized] || fallback;
}

function astSecretsListProviders() {
  return AST_SECRETS_PROVIDERS.slice();
}

function astSecretsGetCapabilities(provider) {
  const normalized = astSecretsNormalizeProvider(provider, null);
  if (!normalized) {
    throw new AstSecretsValidationError(
      `Unsupported secrets provider '${provider}'`,
      { provider }
    );
  }

  return Object.assign({}, AST_SECRETS_PROVIDER_CAPABILITIES[normalized]);
}

function astSecretsEnsureOperationSupported(provider, operation) {
  const capabilities = astSecretsGetCapabilities(provider);
  if (!capabilities[operation]) {
    throw new AstSecretsCapabilityError(
      `Secrets provider '${provider}' does not support '${operation}'`,
      { provider, operation }
    );
  }
}

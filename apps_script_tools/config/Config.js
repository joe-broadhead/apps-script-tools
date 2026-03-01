const __astConfigRoot = typeof globalThis !== 'undefined' ? globalThis : this;

function astConfigResolveFacadeFunction(name) {
  const fn = __astConfigRoot[name];
  if (typeof fn === 'function') {
    return fn;
  }
  throw new Error(`AST.Config helper '${name}' is not available`);
}

const AST_CONFIG = Object.freeze({
  fromScriptProperties: options => astConfigResolveFacadeFunction('astConfigFromScriptProperties')(options),
  schema: definition => astConfigResolveFacadeFunction('astConfigSchema')(definition),
  bind: (definitionOrSchema, options) => astConfigResolveFacadeFunction('astConfigBind')(definitionOrSchema, options)
});

if (typeof astConfigFromScriptProperties === 'function') __astConfigRoot.astConfigFromScriptProperties = astConfigFromScriptProperties;
if (typeof astConfigSchema === 'function') __astConfigRoot.astConfigSchema = astConfigSchema;
if (typeof astConfigBind === 'function') __astConfigRoot.astConfigBind = astConfigBind;
if (typeof astConfigGetScriptPropertiesSnapshotMemoized === 'function') __astConfigRoot.astConfigGetScriptPropertiesSnapshotMemoized = astConfigGetScriptPropertiesSnapshotMemoized;
if (typeof astConfigInvalidateScriptPropertiesSnapshotMemoized === 'function') __astConfigRoot.astConfigInvalidateScriptPropertiesSnapshotMemoized = astConfigInvalidateScriptPropertiesSnapshotMemoized;
if (typeof astConfigResolveFirstString === 'function') __astConfigRoot.astConfigResolveFirstString = astConfigResolveFirstString;
if (typeof astConfigResolveFirstBoolean === 'function') __astConfigRoot.astConfigResolveFirstBoolean = astConfigResolveFirstBoolean;
if (typeof astConfigResolveFirstInteger === 'function') __astConfigRoot.astConfigResolveFirstInteger = astConfigResolveFirstInteger;
if (typeof astConfigMergeNormalizedConfig === 'function') __astConfigRoot.astConfigMergeNormalizedConfig = astConfigMergeNormalizedConfig;
if (typeof astConfigParseJsonSafe === 'function') __astConfigRoot.astConfigParseJsonSafe = astConfigParseJsonSafe;
if (typeof astConfigSleep === 'function') __astConfigRoot.astConfigSleep = astConfigSleep;
if (typeof astConfigNormalizeTimeoutMs === 'function') __astConfigRoot.astConfigNormalizeTimeoutMs = astConfigNormalizeTimeoutMs;
if (typeof astConfigElapsedMs === 'function') __astConfigRoot.astConfigElapsedMs = astConfigElapsedMs;
if (typeof astConfigRemainingMs === 'function') __astConfigRoot.astConfigRemainingMs = astConfigRemainingMs;
if (typeof astConfigTimedOut === 'function') __astConfigRoot.astConfigTimedOut = astConfigTimedOut;
if (typeof astConfigIsTransientHttpStatus === 'function') __astConfigRoot.astConfigIsTransientHttpStatus = astConfigIsTransientHttpStatus;
if (typeof astConfigBuildHttpCoreError === 'function') __astConfigRoot.astConfigBuildHttpCoreError = astConfigBuildHttpCoreError;
if (typeof astConfigHttpRequestWithRetryCore === 'function') __astConfigRoot.astConfigHttpRequestWithRetryCore = astConfigHttpRequestWithRetryCore;
__astConfigRoot.AST_CONFIG = AST_CONFIG;

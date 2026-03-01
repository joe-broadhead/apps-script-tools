# Config Contracts

`ASTX.Config` provides deterministic script-property snapshots and typed schema binding for module resolvers.

## Surface

```javascript
ASTX.Config.fromScriptProperties(options)
ASTX.Config.schema(definition)
ASTX.Config.bind(definitionOrSchema, options)
```

## `fromScriptProperties(options)`

Returns normalized string values from Script Properties with optional key/prefix filtering.

```javascript
const props = ASTX.Config.fromScriptProperties({
  scriptProperties: PropertiesService.getScriptProperties(),
  keys: ['OPENAI_API_KEY', 'OPENAI_MODEL']
});
```

## `schema(definition)`

Compiles and validates a typed schema once, then reuses it for repeated bindings.

Supported types:

- `string`
- `int`
- `float`
- `bool` (`boolean` alias)
- `enum`
- `json`
- `secret-ref`

```javascript
const schema = ASTX.Config.schema({
  GITHUB_TIMEOUT_MS: { type: 'int', min: 1000, default: 45000 },
  GITHUB_CACHE_ENABLED: { type: 'bool', default: false },
  GITHUB_MODE: { type: 'enum', values: ['fast', 'safe'], default: 'fast' }
});
```

## `bind(definitionOrSchema, options)`

Binds typed config values with precedence support and deterministic validation.

Default precedence is:

1. `request`
2. `runtime`
3. `script_properties`

```javascript
const cfg = ASTX.Config.bind(schema, {
  request: requestConfig,
  runtime: ASTX.GitHub.getConfig(),
  scriptProperties: PropertiesService.getScriptProperties()
});
```

### Bind options

- `request`: per-request overrides (highest precedence).
- `runtime`: module/runtime config map.
- `scriptProperties`: Script Properties handle.
- `script`: forwarded `fromScriptProperties(...)` options (`keys`, `prefix`, `stripPrefix`, `cacheScopeId`, `disableCache`, `forceRefresh`, `cacheDefaultHandle`).
- `source`: force single source (`request`, `runtime`, `script_properties`).
- `precedence`: custom precedence array.
- `includeMeta`: return `{ values, sourceByKey, precedence, schema }` instead of plain values.

### Error behavior

Validation failures throw `AstConfigValidationError` with deterministic `details` payload (`key`, `type`, `source`, bounds/pattern metadata).

## Migration guidance for module resolvers

Instead of hand-rolling per-key normalization and precedence logic, use a shared schema:

```javascript
const GITHUB_RESOLVER_SCHEMA = ASTX.Config.schema({
  GITHUB_TOKEN: { type: 'secret-ref', required: true },
  GITHUB_TIMEOUT_MS: { type: 'int', min: 1000, default: 45000 },
  GITHUB_RETRIES: { type: 'int', min: 0, max: 10, default: 2 },
  GITHUB_CACHE_ENABLED: { type: 'bool', default: false }
});

function resolveGitHubConfig(request = {}, runtimeConfig = {}) {
  return ASTX.Config.bind(GITHUB_RESOLVER_SCHEMA, {
    request,
    runtime: runtimeConfig,
    scriptProperties: PropertiesService.getScriptProperties()
  });
}
```

# Storage Contracts

## Import alias

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

## API surface

```javascript
ASTX.Storage.run(request)
ASTX.Storage.list(request)
ASTX.Storage.head(request)
ASTX.Storage.read(request)
ASTX.Storage.write(request)
ASTX.Storage.delete(request)
ASTX.Storage.providers()
ASTX.Storage.capabilities(provider)
ASTX.Storage.configure(config, options)
ASTX.Storage.getConfig()
ASTX.Storage.clearConfig()
```

## Request shape

```javascript
{
  provider: 'gcs' | 's3' | 'dbfs',
  operation: 'list' | 'head' | 'read' | 'write' | 'delete',
  uri: 'gcs://bucket/key' | 's3://bucket/key' | 'dbfs:/path',
  location: {
    bucket: 'gcs/s3 bucket',
    key: 'gcs/s3 object key',
    path: 'dbfs:/...'
  },
  payload: {
    base64: '...'
    // or
    text: '...'
    // or
    json: { ... },
    mimeType: 'application/json',
    encoding: 'utf-8'
  },
  options: {
    recursive: false,
    pageSize: 1000,
    pageToken: null,
    maxItems: 10000,
    timeoutMs: 45000,
    retries: 2,
    includeRaw: false,
    overwrite: true
  },
  auth: { ... },
  providerOptions: { ... }
}
```

## Response shape

```javascript
{
  provider,
  operation,
  uri,
  id,
  output: {
    items,    // list
    object,   // head
    data,     // read
    written,  // write
    deleted   // delete
  },
  page: {
    nextPageToken,
    truncated
  },
  usage: {
    requestCount,
    bytesIn,
    bytesOut
  },
  warnings,
  raw
}
```

`options.timeoutMs` is enforced as a retry-budget timeout window in Apps Script. Because `UrlFetchApp.fetch` does not expose hard per-request timeout control, use provider-side timeout settings where available.

## Not-found behavior

- `head`, `read`, and `delete` throw `AstStorageNotFoundError`.
- Missing objects never return `null` fallback.

## Payload normalization

- `write` accepts exactly one source format: `base64`, `text`, or `json`.
- Canonical write payload is base64.
- Read responses return `output.data.base64` and include `text/json` when MIME type is text-like.

## Auth/config precedence

1. per-call `request.auth.*`
2. runtime config from `ASTX.Storage.configure(...)`
3. script properties

## Typed errors

- `AstStorageError`
- `AstStorageValidationError`
- `AstStorageAuthError`
- `AstStorageCapabilityError`
- `AstStorageNotFoundError`
- `AstStorageProviderError`
- `AstStorageParseError`

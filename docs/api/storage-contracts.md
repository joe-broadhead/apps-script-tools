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
ASTX.Storage.exists(request)
ASTX.Storage.copy(request)
ASTX.Storage.move(request)
ASTX.Storage.signedUrl(request)
ASTX.Storage.multipartWrite(request)
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
  operation:
    'list' |
    'head' |
    'read' |
    'write' |
    'delete' |
    'exists' |
    'copy' |
    'move' |
    'signed_url' |
    'multipart_write',
  uri: 'gcs://bucket/key' | 's3://bucket/key' | 'dbfs:/path',
  fromUri: 'gcs://bucket/key' | 's3://bucket/key' | 'dbfs:/path', // copy/move
  toUri: 'gcs://bucket/key' | 's3://bucket/key' | 'dbfs:/path',   // copy/move
  location: {
    bucket: 'gcs/s3 bucket',
    key: 'gcs/s3 object key',
    path: 'dbfs:/...'
  },
  fromLocation: { bucket, key } | { path }, // copy/move alternative to fromUri
  toLocation: { bucket, key } | { path },   // copy/move alternative to toUri
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
    overwrite: true,
    expiresInSec: 900,     // signed_url
    method: 'GET',         // signed_url
    partSizeBytes: 5242880 // multipart_write
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
    deleted,  // delete
    exists,   // exists
    copied,   // copy
    moved,    // move
    signedUrl,        // signed_url
    multipartWritten  // multipart_write
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

`copy/move` contract notes:

- `fromUri/toUri` are preferred.
- `fromLocation/toLocation` are supported for provider-native inputs.
- Source and destination providers must match in this release.

## Not-found behavior

- `head`, `read`, and `delete` throw `AstStorageNotFoundError`.
- `exists` never throws for not-found; it returns `output.exists.exists=false`.
- Missing objects never return `null` fallback.

## Payload normalization

- `write` accepts exactly one source format: `base64`, `text`, or `json`.
- Canonical write payload is base64.
- Read responses return `output.data.base64` and include `text/json` when MIME type is text-like.
- `multipart_write` reuses the same payload contract as `write`.

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

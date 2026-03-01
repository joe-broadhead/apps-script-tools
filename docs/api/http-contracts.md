# HTTP Contracts

`ASTX.Http` provides a shared transport surface for deterministic HTTP execution in Apps Script.

## Public methods

```javascript
ASTX.Http.request(request)
ASTX.Http.requestBatch(request)
ASTX.Http.capabilities(operation)
ASTX.Http.configure(config, options)
ASTX.Http.getConfig()
ASTX.Http.clearConfig()
```

## `request(...)` contract

```javascript
{
  url: 'https://api.example.com/v1/resource',
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  headers: { Authorization: 'Bearer ...' },

  // one of payload/body/json
  payload: 'raw-body-or-object',
  body: 'raw-body-or-object',
  json: { ... },

  contentType: 'application/json',
  options: {
    retries: 2,
    timeoutMs: 45000,
    includeRaw: false,
    parseJson: true,
    followRedirects: true,
    validateHttpsCertificates: true,
    userAgent: 'optional override',
    defaultHeaders: { ... },
    isTransientStatus: statusCode => [429, 500, 502, 503, 504].includes(statusCode)
  }
}
```

## `request(...)` response

```javascript
{
  status: 'ok',
  source: {
    method: 'GET',
    url: 'https://api.example.com/v1/resource'
  },
  output: {
    statusCode: 200,
    text: '{"ok":true}',
    json: { ok: true },
    headers: { ... }
  },
  usage: {
    attempts: 1,
    elapsedMs: 123
  },
  raw: { response } // when includeRaw=true
}
```

## `requestBatch(...)` contract

```javascript
{
  requests: [
    { url: 'https://api.example.com/a', method: 'GET' },
    { url: 'https://api.example.com/b', method: 'GET' }
  ],
  options: {
    continueOnError: true,
    includeRaw: false
  }
}
```

## `requestBatch(...)` response

```javascript
{
  status: 'ok',
  operation: 'request_batch',
  items: [
    { index: 0, status: 'ok', response: { ... } },
    { index: 1, status: 'error', error: { name, message, details } }
  ],
  usage: {
    total: 2,
    success: 1,
    failed: 1,
    elapsedMs: 345
  }
}
```

## Runtime config + script properties

Precedence: request options > `ASTX.Http.configure(...)` > Script Properties.

Supported Script Properties:

- `HTTP_TIMEOUT_MS`
- `HTTP_RETRIES`
- `HTTP_USER_AGENT`
- `HTTP_INCLUDE_RAW`
- `HTTP_DEFAULT_HEADERS` (JSON object string)

## Error model

- `AstHttpValidationError`
- `AstHttpAuthError`
- `AstHttpNotFoundError`
- `AstHttpRateLimitError`
- `AstHttpCapabilityError`
- `AstHttpProviderError`

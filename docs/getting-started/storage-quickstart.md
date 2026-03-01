# Storage Quick Start

## Import pattern

Use your configured Apps Script library identifier (recommended: `ASTLib`) and normalize once:

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

## Configure runtime defaults

Load script properties once at startup if you want shared defaults:

```javascript
function configureStorageRuntime() {
  const ASTX = ASTLib.AST || ASTLib;
  ASTX.Storage.configure(PropertiesService.getScriptProperties().getProperties());
}
```

Supported script property keys:

- `GCS_SERVICE_ACCOUNT_JSON`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_SESSION_TOKEN`
- `S3_REGION`
- `S3_ENDPOINT`
- `DATABRICKS_HOST`
- `DATABRICKS_TOKEN`

## List objects

```javascript
function storageListExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const out = ASTX.Storage.list({
    uri: 'gcs://my-bucket/project/',
    options: {
      recursive: false,
      pageSize: 200
    }
  });

  Logger.log(JSON.stringify(out.output.items));
}
```

## Read object

```javascript
function storageReadExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const out = ASTX.Storage.read({
    uri: 's3://my-bucket/config/settings.json'
  });

  Logger.log(out.output.data.mimeType);
  Logger.log(JSON.stringify(out.output.data.json || out.output.data.text));
}
```

## Write object

```javascript
function storageWriteExample() {
  const ASTX = ASTLib.AST || ASTLib;

  ASTX.Storage.write({
    uri: 'dbfs:/mnt/project/output/run.json',
    payload: {
      json: {
        runAt: new Date().toISOString(),
        status: 'ok'
      }
    },
    options: {
      overwrite: true
    }
  });
}
```

## Delete object

```javascript
function storageDeleteExample() {
  const ASTX = ASTLib.AST || ASTLib;

  ASTX.Storage.delete({
    uri: 'gcs://my-bucket/tmp/old-file.txt'
  });
}
```

## Exists check

```javascript
function storageExistsExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const out = ASTX.Storage.exists({
    uri: 's3://my-bucket/config/settings.json'
  });

  Logger.log(out.output.exists.exists); // true/false
}
```

## Copy / move

```javascript
function storageCopyMoveExample() {
  const ASTX = ASTLib.AST || ASTLib;

  ASTX.Storage.copy({
    fromUri: 'gcs://my-bucket/inbound/run.json',
    toUri: 'gcs://my-bucket/archive/run.json'
  });

  ASTX.Storage.move({
    fromUri: 'dbfs:/mnt/staging/a.csv',
    toUri: 'dbfs:/mnt/processed/a.csv'
  });
}
```

## Signed URL

```javascript
function storageSignedUrlExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const out = ASTX.Storage.signedUrl({
    uri: 's3://my-bucket/reports/latest.csv',
    options: {
      method: 'GET',
      expiresInSec: 900
    }
  });

  Logger.log(out.output.signedUrl.url);
}
```

## Multipart write

```javascript
function storageMultipartWriteExample() {
  const ASTX = ASTLib.AST || ASTLib;

  ASTX.Storage.multipartWrite({
    uri: 's3://my-bucket/large/events.ndjson',
    payload: {
      text: '...large content...'
    },
    options: {
      partSizeBytes: 5 * 1024 * 1024
    }
  });
}
```

## Bulk prefix operations

```javascript
function storageBulkExample() {
  const ASTX = ASTLib.AST || ASTLib;

  // Enumerate prefix contents with deterministic ordering/filters.
  const walk = ASTX.Storage.walk({
    uri: 'gcs://my-bucket/inbound/',
    options: {
      recursive: true,
      includePrefixes: ['2026/'],
      maxObjects: 5000
    }
  });
  Logger.log(JSON.stringify(walk.output.summary));

  // Plan a copy without mutating (dryRun).
  const plan = ASTX.Storage.copyPrefix({
    fromUri: 'gcs://my-bucket/inbound/',
    toUri: 'gcs://my-bucket/archive/',
    options: {
      dryRun: true
    }
  });
  Logger.log(JSON.stringify(plan.output.summary));

  // Sync source->target and delete extra target objects not in source.
  ASTX.Storage.sync({
    fromUri: 's3://raw/events/',
    toUri: 's3://curated/events/',
    options: {
      recursive: true,
      overwrite: true,
      deleteExtra: true,
      continueOnError: true
    }
  });
}
```

## Behavior notes

- Not found in `head`, `read`, or `delete` throws `AstStorageNotFoundError`.
- `exists` returns `output.exists.exists=false` for missing objects.
- `copy/move` requires same-provider `fromUri` and `toUri`.
- `copyPrefix/deletePrefix/sync` support `options.dryRun`, `options.maxObjects`, and per-item failure reporting in `output.items`.
- Payloads are normalized to base64 internally (`text`/`json` are helper inputs).
- Config resolution precedence: request auth > `ASTX.Storage.configure(...)` > script properties.

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

## Behavior notes

- Not found in `head`, `read`, or `delete` throws `AstStorageNotFoundError`.
- Payloads are normalized to base64 internally (`text`/`json` are helper inputs).
- Config resolution precedence: request auth > `ASTX.Storage.configure(...)` > script properties.

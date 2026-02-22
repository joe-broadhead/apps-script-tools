# Storage Providers

## Supported providers

```javascript
ASTX.Storage.providers();
// ['gcs', 's3', 'dbfs']
```

## Capability matrix

| Provider | list | head | read | write | delete |
|---|---|---|---|---|---|
| `gcs` | Yes | Yes | Yes | Yes | Yes |
| `s3` | Yes | Yes | Yes | Yes | Yes |
| `dbfs` | Yes | Yes | Yes | Yes | Yes |

Use runtime checks:

```javascript
ASTX.Storage.capabilities('gcs');
```

## GCS auth modes

- `oauth`: uses `request.auth.oauthToken` or Apps Script `ScriptApp.getOAuthToken()`.
- `service_account`: uses `request.auth.serviceAccountJson` or `GCS_SERVICE_ACCOUNT_JSON`.
- `auto` (default): tries OAuth first, then service account.

## S3 auth

Requires:

- `accessKeyId` (`S3_ACCESS_KEY_ID`)
- `secretAccessKey` (`S3_SECRET_ACCESS_KEY`)
- `region` (`S3_REGION`)

Optional:

- `sessionToken` (`S3_SESSION_TOKEN`)
- `endpoint` (`S3_ENDPOINT`) for S3-compatible APIs

Requests are signed with SigV4.

## DBFS auth

Requires:

- `host` (`DATABRICKS_HOST`)
- `token` (`DATABRICKS_TOKEN`)

Uses Databricks DBFS REST API (`/api/2.0/dbfs/*`).

## URI examples

- `gcs://my-bucket/folder/file.json`
- `s3://analytics-bucket/exports/run-001.csv`
- `dbfs:/mnt/project/data/events.parquet`

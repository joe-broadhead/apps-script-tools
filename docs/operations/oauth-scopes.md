# OAuth Scope Inventory

The production library manifest is `apps_script_tools/appsscript.json`. It intentionally declares the full scope set needed by the reusable library, while cookbook manifests stay narrower and declare only the scopes their examples need.

`npm run lint` compares the table below with `apps_script_tools/appsscript.json`. Any added or removed production scope must update this inventory in the same change.

<!-- oauth-scope-inventory:start -->
| Scope | Required by | Review notes |
| --- | --- | --- |
| `https://www.googleapis.com/auth/script.external_request` | `AST.Http`, external AI providers, GitHub, Slack/Teams/Chat webhook transports, S3/DBFS/GCS HTTP paths, service-account token exchanges | Keep for full-library outbound HTTP support. Cookbooks should add it only when they call external APIs. |
| `https://www.googleapis.com/auth/cloud-platform` | Vertex Gemini OAuth mode, Vertex embeddings, Google Cloud Storage OAuth mode, Secret Manager provider | Keep for Google Cloud provider integrations. Consumers using service-account JSON can still choose narrower project/IAM permissions outside Apps Script. |
| `https://www.googleapis.com/auth/script.scriptapp` | `AST.Triggers` and `AST.Jobs.schedule(...)` installable-trigger lifecycle helpers | Keep for trigger creation, update, listing, deletion, and job-to-trigger scheduling. |
| `https://www.googleapis.com/auth/spreadsheets` | `AST.Sheets`, `EnhancedSpreadsheet`, `EnhancedSheet`, DataFrame/Series sheet export helpers | Keep for spreadsheet read/write workflows. Consumers with read-only use cases should evaluate narrower app-level manifests. |
| `https://www.googleapis.com/auth/drive` | `AST.Drive`, Drive-backed cache, Drive-backed telemetry export, Drive-backed RAG source/index operations, dbt Drive artifact loading | Keep because the library includes both read and write Drive operations. Cookbooks should prefer `drive.readonly` where they only read fixtures or manifests. |
| `https://www.googleapis.com/auth/bigquery` | `AST.Sql` BigQuery execution and DataFrame table-load helpers | Keep for BigQuery query and load support. |
| `https://www.googleapis.com/auth/documents` | Workspace helpers and RAG ingestion for Google Docs content | Keep for document extraction/read workflows that operate on native Google Docs. |
| `https://www.googleapis.com/auth/presentations` | Workspace helpers and RAG ingestion for Google Slides content, including speaker notes | Keep for presentation extraction/read workflows. |
| `https://www.googleapis.com/auth/forms` | Workspace helpers for Google Forms-facing workflows | Keep for Forms integration support. |
| `https://www.googleapis.com/auth/gmail.send` | `AST.Messaging.email.send(...)`, batch sends, draft/send flows | Keep for outbound email features. Consumers running only dry-run planning do not need to add this to their cookbook/app manifest. |
| `https://www.googleapis.com/auth/gmail.modify` | `AST.Messaging.email` mailbox search, thread/message reads, label updates, draft management | Keep for mailbox and label mutation features. Consumers sending only basic email should evaluate whether `gmail.send` is enough in their own script. |
<!-- oauth-scope-inventory:end -->

## Cookbook policy

Cookbook manifests are independent Apps Script projects. They should not copy the full production manifest by default.

- Keep committed cookbook manifests least-privilege and example-specific.
- Leave scopes omitted when a cookbook's default smoke/demo path is dry-run or local-only.
- Add `https://www.googleapis.com/auth/script.external_request` only for examples that make outbound HTTP/provider calls.
- Prefer `https://www.googleapis.com/auth/drive.readonly` for read-only Drive examples.
- Add Gmail, BigQuery, Cloud Platform, Sheets, Docs, Slides, Forms, or Drive write scopes only when the committed cookbook code actually needs them.
- Keep any web app deployment access restricted to the audience required by the cookbook; do not commit public anonymous web app access.

## Consumer review

Before installing the published library into a consumer Apps Script project:

1. Start from the cookbook or app-specific manifest, not the production library manifest.
2. Remove scopes for modules you do not call.
3. Reauthorize after scope changes and run the relevant smoke entrypoints.
4. For regulated environments, document the module-to-scope rationale from the inventory above in your deployment review.

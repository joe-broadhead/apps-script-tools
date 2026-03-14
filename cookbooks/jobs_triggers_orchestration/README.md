# Jobs + Triggers Orchestration Cookbook

This cookbook demonstrates reliable async orchestration with `AST.Jobs` and `AST.Triggers`.

It uses only public `AST` APIs:

- `ASTX.Jobs.enqueue(...)`
- `ASTX.Jobs.resume(...)`
- `ASTX.Jobs.status(...)`
- `ASTX.Jobs.list(...)`
- `ASTX.Jobs.run(...)`
- `ASTX.Jobs.chain(...)`
- `ASTX.Jobs.enqueueMany(...)`
- `ASTX.Jobs.mapReduce(...)`
- `ASTX.Jobs.schedule(...)`
- `ASTX.Jobs.listFailed(...)`
- `ASTX.Jobs.moveToDlq(...)`
- `ASTX.Jobs.replayDlq(...)`
- `ASTX.Jobs.purgeDlq(...)`
- `ASTX.Triggers.upsert(...)`
- `ASTX.Triggers.list(...)`
- `ASTX.Triggers.runNow(...)`
- `ASTX.Triggers.delete(...)`

## What it covers

Smoke flow:

1. cleans stale cookbook trigger/job state
2. creates one direct trigger with `ASTX.Triggers.upsert(...)`
3. validates `list(...)` + `runNow(...)`
4. enqueues a retryable job and verifies `queued -> paused -> completed` transitions via `resume(...)`
5. deletes the trigger and removes cookbook state again

Demo flow:

1. runs a sequential `chain(...)`
2. runs bounded fan-out via `enqueueMany(...)`
3. runs a small `mapReduce(...)`
4. provisions a trigger-backed scheduled job with `ASTX.Jobs.schedule(...)`
5. executes `schedule(... run_now)` and then removes the trigger
6. forces a failed job into DLQ, lists it, replays it idempotently, then purges replayed entries

## Folder contract

```text
cookbooks/jobs_triggers_orchestration/
  README.md
  .clasp.json.example
  .claspignore
  src/
    appsscript.json
    00_Config.gs
    10_EntryPoints.gs
    20_Smoke.gs
    30_Examples.gs
    99_DevTools.gs
```

## Setup

1. Copy `.clasp.json.example` to `.clasp.json`.
2. Set your Apps Script `scriptId`.
3. Replace `<PUBLISHED_AST_LIBRARY_VERSION>` in `src/appsscript.json`.
4. Push with `clasp push`.
5. Run `seedCookbookConfig()`.
6. Run `runCookbookAll()`.

## Script properties

| Key | Required | Default | Purpose |
| --- | --- | --- | --- |
| `JOBS_TRIGGERS_APP_NAME` | Yes | `AST Jobs + Triggers Orchestration` | Display name included in cookbook output. |
| `JOBS_TRIGGERS_JOB_PREFIX` | Yes | `AST_JOBS_COOKBOOK_` | Job state prefix used for deterministic cleanup. |
| `JOBS_TRIGGERS_TRIGGER_PROPERTY_PREFIX` | Yes | `AST_TRIGGERS_COOKBOOK_` | Trigger definition prefix used for deterministic cleanup. |
| `JOBS_TRIGGERS_TRIGGER_BASE_ID` | Yes | `ast_jobs_cookbook` | Base id used for created trigger definitions. |
| `JOBS_TRIGGERS_TIMEZONE` | Yes | `Etc/UTC` | Time zone used for scheduled trigger examples. |
| `JOBS_TRIGGERS_SCHEDULE_HOURS` | Yes | `6` | `every_hours` interval used by trigger examples. Must be between `1` and `23`. |
| `JOBS_TRIGGERS_MAX_RETRIES` | Yes | `1` | Default retry budget for cookbook jobs. |
| `JOBS_TRIGGERS_MAX_RUNTIME_MS` | Yes | `30000` | Default runtime budget for cookbook jobs. |
| `JOBS_TRIGGERS_MAX_CONCURRENCY` | Yes | `2` | Bounded width for `enqueueMany(...)` and `mapReduce(...)`. |
| `JOBS_TRIGGERS_VERBOSE` | No | `false` | Enables extra helper logging when true. |

## Entrypoints

Required template entrypoints:

- `seedCookbookConfig()`
- `validateCookbookConfig()`
- `runCookbookSmoke()`
- `runCookbookDemo()`
- `runCookbookAll()`

Additional helper entrypoints:

- `cleanupCookbookArtifacts()`
- `showCookbookContract()`
- `showCookbookSources()`
- `clearCookbookConfig()`

## Expected outputs

`runCookbookSmoke()` returns a payload like:

```json
{
  "status": "ok",
  "entrypoint": "runCookbookSmoke",
  "trigger": {
    "runNowMode": "direct"
  },
  "job": {
    "transitions": ["queued", "paused", "completed"],
    "finalStatus": "completed"
  }
}
```

`runCookbookDemo()` returns a payload like:

```json
{
  "status": "ok",
  "entrypoint": "runCookbookDemo",
  "chain": {
    "status": "completed"
  },
  "enqueueMany": {
    "completedStatus": "completed"
  },
  "mapReduce": {
    "status": "completed",
    "reduce": 18
  },
  "schedule": {
    "runNowMode": "jobs"
  },
  "dlq": {
    "movedState": "queued",
    "replayIdempotent": true
  }
}
```

## Idempotency and retry guidance

- Use stable `propertyPrefix` values per app/workload so retries, resumes, and cleanup remain isolated.
- Keep handler payloads JSON-serializable and deterministic.
- Treat retries as re-execution, not continuation. Handlers should tolerate duplicate invocation.
- Use bounded `maxConcurrency` for `enqueueMany(...)` and `mapReduce(...)` to control dependency width and Script Properties churn.
- Use stable replay keys with `replayDlq(...)` when replay requests may be retried from an operator UI or webhook.

## Safe trigger lifecycle patterns

- Prefer stable `id` values on `ASTX.Triggers.upsert(...)` and `ASTX.Jobs.schedule(...)`.
- Use `runNow(...)` or `schedule(... run_now)` to validate dispatch before waiting on real time-based execution.
- Delete triggers explicitly when a cookbook/demo run is finished.
- Keep trigger definitions and job checkpoints on separate prefixes so cleanup can be precise.
- Run `cleanupCookbookArtifacts()` before repeating a manual test if a prior run was interrupted.

## OAuth scopes

Required Apps Script scope:

- `https://www.googleapis.com/auth/script.scriptapp`

## Troubleshooting

`Cookbook config is invalid`

- Run `seedCookbookConfig()` again.
- Ensure numeric settings are valid integers within the documented bounds.

`Trigger upsert fails with authorization errors`

- Confirm the project has authorized `https://www.googleapis.com/auth/script.scriptapp`.
- Re-run authorization after pushing updated scopes.

`Job replay does not change status`

- Confirm the job was moved into DLQ first with `moveToDlq(...)`.
- Reuse the same `propertyPrefix` on replay that the original job used.

`Repeated runs leave stale state`

- Run `cleanupCookbookArtifacts()`.
- Keep cookbook-specific `JOBS_TRIGGERS_JOB_PREFIX` and `JOBS_TRIGGERS_TRIGGER_PROPERTY_PREFIX` values unique per test project.

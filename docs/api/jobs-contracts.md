# Jobs Contracts

`ASTX.Jobs` provides checkpointed job orchestration for bounded multi-step workflows in Apps Script.

## Import pattern

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

## Public API

```javascript
ASTX.Jobs.run(request)
ASTX.Jobs.enqueue(request)
ASTX.Jobs.resume(jobId, options)
ASTX.Jobs.status(jobId, options)
ASTX.Jobs.list(filters, options)
ASTX.Jobs.cancel(jobId, options)
ASTX.Jobs.configure(config, options)
ASTX.Jobs.getConfig()
ASTX.Jobs.clearConfig()
```

## Run/Enqueue request contract

```javascript
{
  name: 'job-name',
  steps: [
    {
      id: 'step_id',
      handler: 'globalFunctionName', // or named function reference
      dependsOn: ['optional_step_id'],
      payload: { ... } // optional
    }
  ],
  options: {
    maxRetries: 2,               // 0..20
    maxRuntimeMs: 240000,        // 1000..600000
    checkpointStore: 'properties',
    autoResume: true,
    propertyPrefix: 'AST_JOBS_JOB_'
  }
}
```

Validation rules:

- `name` must be a non-empty string.
- `steps` must be non-empty with unique `id`.
- dependency graph must be valid (no unknown refs, no cycles, no self dependency).
- step handlers must resolve to globally available named functions.
- async step handlers are not supported.
- step outputs must be JSON serializable.

## Job status model

Job status values:

- `queued`
- `running`
- `paused`
- `failed`
- `completed`
- `canceled`

Step status values:

- `pending`
- `running`
- `completed`
- `failed`
- `canceled`

## List filters

```javascript
{
  status: 'queued|running|paused|failed|completed|canceled',
  name: 'optional exact job name',
  limit: 100 // 1..1000
}
```

## Runtime config and precedence

Runtime config can be set with:

```javascript
ASTX.Jobs.configure({
  maxRetries: 2,
  maxRuntimeMs: 240000,
  checkpointStore: 'properties',
  propertyPrefix: 'AST_JOBS_JOB_'
});
```

Resolution precedence:

1. per-call request/options
2. `ASTX.Jobs.configure(...)` runtime config
3. script properties
4. built-in defaults

Supported script property keys:

- `AST_JOBS_DEFAULT_MAX_RETRIES`
- `AST_JOBS_DEFAULT_MAX_RUNTIME_MS`
- `AST_JOBS_CHECKPOINT_STORE`
- `AST_JOBS_PROPERTY_PREFIX`

Current capability note:

- `checkpointStore='properties'` is currently the only supported checkpoint store.

## Response shape

All operational calls (`run`, `enqueue`, `resume`, `status`, `cancel`) return a persisted job record:

```javascript
{
  id: 'job_...',
  name: 'job-name',
  status: 'queued|running|paused|failed|completed|canceled',
  createdAt: 'ISO-8601',
  updatedAt: 'ISO-8601',
  startedAt: 'ISO-8601|null',
  completedAt: 'ISO-8601|null',
  pausedAt: 'ISO-8601|null',
  canceledAt: 'ISO-8601|null',
  lastError: { name, message, details } | null,
  options: { ...resolvedOptions },
  steps: [
    {
      id,
      handlerName,
      dependsOn: [],
      state,
      attempts,
      startedAt,
      completedAt,
      lastError
    }
  ],
  results: {
    step_id: {}
  }
}
```

`ASTX.Jobs.list(...)` returns an array of job records.

## Typed errors

- `AstJobsError`
- `AstJobsValidationError`
- `AstJobsNotFoundError`
- `AstJobsConflictError`
- `AstJobsStepExecutionError`
- `AstJobsCapabilityError`

## Example

```javascript
function extractStep(ctx) {
  return { rows: 100, payload: ctx.payload };
}

function publishStep(ctx) {
  return { published: true, previous: ctx.results.extract };
}

function runJobsExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const queued = ASTX.Jobs.enqueue({
    name: 'demo-job',
    steps: [
      { id: 'extract', handler: 'extractStep', payload: { source: 'sheet' } },
      { id: 'publish', handler: 'publishStep', dependsOn: ['extract'] }
    ]
  });

  const completed = ASTX.Jobs.resume(queued.id);
  Logger.log(completed.status);
}
```

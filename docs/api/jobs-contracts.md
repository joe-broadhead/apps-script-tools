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
ASTX.Jobs.enqueueMany(request)
ASTX.Jobs.chain(request)
ASTX.Jobs.mapReduce(request)
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

## Orchestration helper contracts

### `ASTX.Jobs.chain(request)`

```javascript
{
  name: 'chain-job',
  mode: 'run', // run | enqueue
  tasks: [
    { id: 'optional', handler: 'globalFunctionName', payload: { ... } }
  ],
  options: { ...standard job options }
}
```

- Tasks are converted into sequential dependencies (`task[n]` depends on `task[n-1]`).
- Missing task IDs are auto-generated as `chain_step_<n>`.
- Default mode is `run`.

### `ASTX.Jobs.enqueueMany(request)`

```javascript
{
  name: 'fanout-job',
  mode: 'enqueue', // run | enqueue
  handler: 'globalFunctionName',
  items: [ ... ],
  maxConcurrency: 10,        // 1..1000 dependency window
  stepIdPrefix: 'item',
  sharedPayload: { ... },    // optional, copied to each step payload.shared
  options: { ...standard job options }
}
```

- Generates one step per item with payload `{ item, index, position, total, shared? }`.
- Applies a bounded dependency window (`step[i]` depends on `step[i-maxConcurrency]`) for deterministic fan-out shape.
- Default mode is `enqueue`.

### `ASTX.Jobs.mapReduce(request)`

```javascript
{
  name: 'map-reduce-job',
  mode: 'run', // run | enqueue
  items: [ ... ],
  maxConcurrency: 10,
  map: {
    handler: 'globalMapHandler',
    stepIdPrefix: 'map',
    payload: { ... } // optional shared map payload
  },
  reduce: {
    id: 'reduce',
    handler: 'globalReduceHandler',
    payload: { ... } // optional shared reduce payload
  },
  options: { ...standard job options }
}
```

Shorthand keys are also supported: `mapHandler`, `reduceHandler`, `mapPayload`, `reducePayload`, `mapStepIdPrefix`, `reduceStepId`.

- Generates map steps with bounded dependency window.
- Adds one reduce step that depends on all map steps.
- Reduce payload includes `{ mapStepIds, total, shared? }`.
- Default mode is `run`.

## Retry and cancel semantics for helpers

- Helpers compile to standard Jobs step graphs and therefore inherit the same checkpoint/retry model.
- Retries are controlled by `options.maxRetries` on the helper request.
- On retryable step failure, helper jobs transition to `paused`; resume with `ASTX.Jobs.resume(jobId)`.
- If a step exceeds retry budget, helper jobs transition to `failed`.
- `ASTX.Jobs.cancel(jobId)` works unchanged for helper-created jobs and marks pending/running helper steps as `canceled`.

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
  },
  orchestration: { // present on chain/enqueueMany/mapReduce returns
    helper: 'chain|enqueue_many|map_reduce',
    mode: 'run|enqueue',
    parent: { jobId, status },
    children: {
      status: 'queued|pending|running|paused|failed|completed|canceled|mixed',
      counts: { total, pending, running, completed, failed, canceled }
    },
    stages: {
      stageName: {
        status: 'queued|pending|running|paused|failed|completed|canceled|mixed',
        counts: { total, pending, running, completed, failed, canceled },
        maxConcurrency: 10 // when applicable
      }
    }
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

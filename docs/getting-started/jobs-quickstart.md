# Jobs Quick Start

## Import alias

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

## Configure runtime defaults

```javascript
function configureJobsRuntime() {
  const ASTX = ASTLib.AST || ASTLib;
  ASTX.Jobs.configure({
    AST_JOBS_PROPERTY_PREFIX: 'jobs_v1',
    AST_JOBS_DEFAULT_MAX_RUNTIME_MS: 240000,
    AST_JOBS_DEFAULT_MAX_RETRIES: 3
  });
}
```

## Enqueue and resume a multi-step job

```javascript
function jobsEnqueueExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const queued = ASTX.Jobs.enqueue({
    name: 'example-job',
    steps: [
      { id: 'prepare', handler: 'jobsPrepare_' },
      { id: 'compute', handler: 'jobsCompute_', dependsOn: ['prepare'] }
    ]
  });

  const result = ASTX.Jobs.resume(queued.id);
  Logger.log(JSON.stringify(result));
}

function jobsPrepare_() {
  return { batchId: Utilities.getUuid() };
}

function jobsCompute_(context) {
  return { prepared: context.results.prepare.batchId };
}
```

## Inspect and cancel

```javascript
function jobsStatusExample(jobId) {
  const ASTX = ASTLib.AST || ASTLib;
  Logger.log(JSON.stringify(ASTX.Jobs.status(jobId)));
}

function jobsCancelExample(jobId) {
  const ASTX = ASTLib.AST || ASTLib;
  Logger.log(JSON.stringify(ASTX.Jobs.cancel(jobId)));
}
```

## Dead-letter queue triage and replay

```javascript
function jobsDlqReplayExample(jobId) {
  const ASTX = ASTLib.AST || ASTLib;

  // 1) Move failed job into DLQ queue
  const moved = ASTX.Jobs.moveToDlq(jobId);
  Logger.log(JSON.stringify(moved));

  // 2) Replay one DLQ batch deterministically
  const replayed = ASTX.Jobs.replayDlq({
    limit: 10,
    maxConcurrency: 5,
    idempotencyKey: `replay_${jobId}_${new Date().toISOString().slice(0, 10)}`
  });
  Logger.log(JSON.stringify(replayed));

  // 3) Purge replayed entries after triage window
  const purged = ASTX.Jobs.purgeDlq({
    state: 'replayed',
    limit: 100
  });
  Logger.log(JSON.stringify(purged));
}
```

## Schedule a job with trigger lifecycle managed by AST.Jobs

```javascript
function jobsScheduleExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const scheduled = ASTX.Jobs.schedule({
    operation: 'upsert',
    id: 'jobs_hourly_sync',
    schedule: {
      type: 'every_hours',
      every: 1
    },
    autoResumeJobs: true,
    name: 'hourly-sync-job',
    steps: [
      { id: 'sync_step', handler: 'jobsSyncStep_' }
    ]
  });

  Logger.log(JSON.stringify(scheduled));
}
```

## Orchestration recipes

```javascript
function jobsChainRecipe() {
  const ASTX = ASTLib.AST || ASTLib;
  const result = ASTX.Jobs.chain({
    name: 'chain-recipe',
    tasks: [
      { handler: 'jobsPrepare_' },
      { handler: 'jobsCompute_' }
    ]
  });
  Logger.log(JSON.stringify(result.orchestration));
}

function jobsEnqueueManyRecipe() {
  const ASTX = ASTLib.AST || ASTLib;
  const queued = ASTX.Jobs.enqueueMany({
    name: 'fanout-recipe',
    handler: 'jobsFanout_',
    items: [{ id: 1 }, { id: 2 }, { id: 3 }],
    maxConcurrency: 2
  });

  // Resume in a trigger/worker loop until terminal status.
  const status = ASTX.Jobs.resume(queued.id);
  Logger.log(status.status);
}

function jobsMapReduceRecipe() {
  const ASTX = ASTLib.AST || ASTLib;
  const result = ASTX.Jobs.mapReduce({
    name: 'map-reduce-recipe',
    items: [{ value: 5 }, { value: 7 }, { value: 9 }],
    mapHandler: 'jobsMap_',
    reduceHandler: 'jobsReduce_',
    maxConcurrency: 2
  });
  Logger.log(JSON.stringify(result.results.reduce));
}

function jobsFanout_(ctx) {
  return { processedId: ctx.payload.item.id };
}

function jobsMap_(ctx) {
  return ctx.payload.item.value;
}

function jobsReduce_(ctx) {
  return ctx.payload.mapStepIds.reduce((sum, stepId) => sum + ctx.results[stepId], 0);
}
```

## Notes

- Jobs are checkpointed and resumable; each step must be deterministic and serializable.
- `resume(...)` enforces lease ownership to avoid concurrent worker collisions.
- `chain`, `enqueueMany`, and `mapReduce` compile to normal job steps and use the same retry/cancel/checkpoint semantics.
- `moveToDlq`, `replayDlq`, and `purgeDlq` provide deterministic failed-job triage/replay lifecycle.
- `schedule` bridges Jobs definitions into Triggers lifecycle with `dispatch.mode='jobs'`.
- Keep job payloads compact; store large artifacts in `AST.Storage` and pass references.

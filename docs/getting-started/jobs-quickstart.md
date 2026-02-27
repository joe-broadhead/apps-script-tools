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
    JOBS_PROPERTY_PREFIX: 'jobs_v1',
    JOBS_MAX_RUNTIME_MS: 240000,
    JOBS_MAX_ATTEMPTS: 3
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

## Notes

- Jobs are checkpointed and resumable; each step must be deterministic and serializable.
- `resume(...)` enforces lease ownership to avoid concurrent worker collisions.
- Keep job payloads compact; store large artifacts in `AST.Storage` and pass references.

# Triggers Contracts

`ASTX.Triggers` provides declarative management for installable time-based triggers.

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

## Public surface

```javascript
ASTX.Triggers.run(request)
ASTX.Triggers.upsert(request)
ASTX.Triggers.list(request)
ASTX.Triggers.delete(request)
ASTX.Triggers.runNow(request)
ASTX.Triggers.configure(config, options)
ASTX.Triggers.getConfig()
ASTX.Triggers.clearConfig()
```

## `upsert` request

```javascript
{
  id: 'optional-idempotent-identity',
  enabled: true,
  schedule: {
    type: 'every_minutes' | 'every_hours' | 'every_days' | 'every_weeks',
    every: 1,
    atHour: 5,       // optional (days/weeks)
    nearMinute: 15,  // optional (hours/days/weeks)
    onWeekDay: 'MONDAY', // required for every_weeks
    timeZone: 'Europe/London' // optional
  },
  dispatch: {
    mode: 'direct' | 'jobs',
    handler: 'globalHandlerName', // required for direct; optional with dispatch.job
    payload: { ... },
    autoResumeJobs: false,
    job: {
      name: 'job-name',
      steps: [{ id: 'step_one', handler: 'globalHandlerName' }],
      options: { propertyPrefix: 'AST_JOBS_JOB_' }
    }
  },
  metadata: { ... },
  options: {
    dryRun: false,
    includeRaw: false
  }
}
```

Behavior:

- `upsert` is idempotent on `{ enabled, schedule, dispatch }`.
- unchanged definitions return `noop=true` without recreating trigger state.
- `dryRun=true` validates/plans without mutating ScriptApp or script properties.
- when `id` is omitted, a deterministic ID is derived from schedule + dispatch.

## `list` request

```javascript
{
  filters: {
    id: 'single-id',
    ids: ['id_1', 'id_2'],
    enabled: true
  },
  options: {
    limit: 100,
    offset: 0,
    includeRaw: false,
    includeOrphans: false
  }
}
```

## `delete` request

```javascript
{
  id: 'single-id', // required unless options.all=true
  options: {
    all: false,
    dryRun: false
  }
}
```

## `runNow` request

```javascript
{
  id: 'trigger-id',        // or triggerUid
  triggerUid: 'uid-string',
  event: { ... },          // optional event payload
  options: {
    includeRaw: false
  }
}
```

## Runtime config keys

`ASTX.Triggers.configure(...)` and script properties share the same key names:

- `AST_TRIGGERS_PROPERTY_PREFIX` (default: `AST_TRIGGERS_DEF_`)
- `AST_TRIGGERS_DISPATCH_HANDLER` (default: `astTriggersDispatch`)
- `AST_TRIGGERS_DEFAULT_TIMEZONE`
- `AST_TRIGGERS_DEFAULT_DISPATCH_MODE` (`direct` or `jobs`)
- `AST_TRIGGERS_JOBS_AUTO_RESUME` (`true`/`false`)

Precedence:

1. request values
2. runtime `ASTX.Triggers.configure(...)`
3. script properties
4. built-in defaults

## Error types

- `AstTriggersError`
- `AstTriggersValidationError`
- `AstTriggersNotFoundError`
- `AstTriggersCapabilityError`
- `AstTriggersDispatchError`

## OAuth scope

To create/delete time-based triggers, include:

`https://www.googleapis.com/auth/script.scriptapp`

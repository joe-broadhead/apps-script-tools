# Triggers Quick Start

## Import alias

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

## Configure runtime defaults

```javascript
function configureTriggersRuntime() {
  const ASTX = ASTLib.AST || ASTLib;
  ASTX.Triggers.configure({
    TRIGGERS_PROPERTY_PREFIX: 'triggers_v1'
  });
}
```

## Upsert a schedule

```javascript
function triggersUpsertExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const out = ASTX.Triggers.upsert({
    id: 'daily_sync',
    schedule: {
      kind: 'every_days',
      every: 1,
      hour: 7,
      minute: 30
    },
    dispatch: {
      mode: 'direct',
      handler: 'runDailySync_'
    }
  });

  Logger.log(JSON.stringify(out));
}

function runDailySync_() {
  Logger.log('daily sync triggered');
}
```

## Dry-run plan

```javascript
function triggersDryRunExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const plan = ASTX.Triggers.upsert({
    id: 'weekly_cleanup',
    schedule: {
      kind: 'every_weeks',
      every: 1,
      dayOfWeek: 'MONDAY',
      hour: 6,
      minute: 0
    },
    dispatch: {
      mode: 'direct',
      handler: 'runWeeklyCleanup_'
    },
    options: { dryRun: true }
  });

  Logger.log(JSON.stringify(plan.dryRun));
}
```

## List and delete

```javascript
function triggersListAndDeleteExample() {
  const ASTX = ASTLib.AST || ASTLib;

  Logger.log(JSON.stringify(ASTX.Triggers.list()));
  Logger.log(JSON.stringify(ASTX.Triggers.delete({ id: 'daily_sync' })));
}
```

## Notes

- `upsert` is idempotent by trigger id + schedule + dispatch definition.
- Use `dispatch.mode='jobs'` when the trigger should enqueue resilient `AST.Jobs` workflows.
- Prefer dry-run in rollout scripts before applying trigger mutations.

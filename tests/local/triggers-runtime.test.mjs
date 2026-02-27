import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext, loadScripts, listScriptFiles } from './helpers.mjs';
import { loadTriggersScripts } from './triggers-helpers.mjs';

function createScriptPropertiesStore(seed = {}) {
  const values = { ...seed };
  return {
    values,
    handle: {
      getProperty: key => (Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null),
      getProperties: () => ({ ...values }),
      setProperty: (key, value) => {
        values[key] = String(value);
      },
      setProperties: map => {
        Object.keys(map || {}).forEach(key => {
          values[key] = String(map[key]);
        });
      },
      deleteProperty: key => {
        delete values[key];
      }
    }
  };
}

function createScriptAppMock() {
  const weekDayEnum = {
    SUNDAY: 'SUNDAY',
    MONDAY: 'MONDAY',
    TUESDAY: 'TUESDAY',
    WEDNESDAY: 'WEDNESDAY',
    THURSDAY: 'THURSDAY',
    FRIDAY: 'FRIDAY',
    SATURDAY: 'SATURDAY'
  };

  const triggerStore = [];
  let sequence = 1;
  let failNextCreateError = null;

  function buildTrigger(handler, schedule) {
    const triggerUid = `trigger_uid_${sequence++}`;
    return {
      __schedule: schedule,
      getUniqueId: () => triggerUid,
      getHandlerFunction: () => handler
    };
  }

  function createBuilder(handler) {
    const schedule = {};
    const api = {
      inTimezone: value => {
        schedule.timeZone = value;
        return api;
      },
      everyMinutes: value => {
        schedule.type = 'every_minutes';
        schedule.every = value;
        return api;
      },
      everyHours: value => {
        schedule.type = 'every_hours';
        schedule.every = value;
        return api;
      },
      everyDays: value => {
        schedule.type = 'every_days';
        schedule.every = value;
        return api;
      },
      everyWeeks: value => {
        schedule.type = 'every_weeks';
        schedule.every = value;
        return api;
      },
      onWeekDay: value => {
        schedule.onWeekDay = value;
        return api;
      },
      atHour: value => {
        schedule.atHour = value;
        return api;
      },
      nearMinute: value => {
        schedule.nearMinute = value;
        return api;
      },
      create: () => {
        if (failNextCreateError) {
          const error = failNextCreateError;
          failNextCreateError = null;
          throw error;
        }
        const trigger = buildTrigger(handler, schedule);
        triggerStore.push(trigger);
        return trigger;
      }
    };

    return {
      timeBased: () => api
    };
  }

  return {
    WeekDay: weekDayEnum,
    newTrigger: handler => createBuilder(handler),
    getProjectTriggers: () => triggerStore.slice(),
    deleteTrigger: trigger => {
      const targetUid = trigger && typeof trigger.getUniqueId === 'function'
        ? trigger.getUniqueId()
        : null;
      const next = triggerStore.filter(item => item.getUniqueId() !== targetUid);
      triggerStore.length = 0;
      next.forEach(item => triggerStore.push(item));
    },
    __getTriggers: () => triggerStore.slice(),
    __failNextCreate: error => {
      failNextCreateError = error || new Error('forced create failure');
    }
  };
}

function createTriggersContext({
  includeAst = true,
  includeJobs = false,
  scriptPropertiesSeed = {}
} = {}) {
  const scriptProps = createScriptPropertiesStore(scriptPropertiesSeed);
  const scriptApp = createScriptAppMock();

  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => scriptProps.handle
    },
    ScriptApp: scriptApp
  });

  loadTriggersScripts(context, { includeAst, includeJobs });
  if (includeAst) {
    loadScripts(context, [
      ...listScriptFiles('apps_script_tools/runtime/general'),
      'apps_script_tools/runtime/Runtime.js'
    ]);
  }

  return {
    context,
    scriptProps,
    scriptApp
  };
}

test('AST exposes Triggers namespace and required methods', () => {
  const { context } = createTriggersContext();

  const requiredMethods = [
    'run',
    'upsert',
    'list',
    'delete',
    'runNow',
    'configure',
    'getConfig',
    'clearConfig'
  ];

  requiredMethods.forEach(method => {
    assert.equal(typeof context.AST.Triggers[method], 'function');
  });
});

test('AST.Triggers upsert is idempotent and runNow dispatches direct handlers', () => {
  const { context, scriptApp } = createTriggersContext();

  context.myDirectHandler = input => ({
    ok: true,
    payload: input.payload,
    source: input.source
  });

  const request = {
    id: 'hourly_sync',
    schedule: {
      type: 'every_hours',
      every: 2
    },
    dispatch: {
      mode: 'direct',
      handler: 'myDirectHandler',
      payload: { marker: 'v1' }
    }
  };

  const first = context.AST.Triggers.upsert(request);
  assert.equal(first.created, true);
  assert.equal(first.noop, false);
  assert.equal(scriptApp.__getTriggers().length, 1);

  const second = context.AST.Triggers.upsert(request);
  assert.equal(second.noop, true);
  assert.equal(scriptApp.__getTriggers().length, 1);

  const runNow = context.AST.Triggers.runNow({
    id: 'hourly_sync',
    options: { includeRaw: true }
  });
  assert.equal(runNow.status, 'ok');
  assert.equal(runNow.dispatchMode, 'direct');
  assert.equal(runNow.result.mode, 'direct');
  assert.equal(runNow.result.result.ok, true);
  assert.equal(runNow.result.result.payload.marker, 'v1');
  assert.equal(runNow.result.result.source, 'run_now');
});

test('AST.Triggers upsert replaces existing trigger when schedule changes', () => {
  const { context, scriptApp } = createTriggersContext();
  context.mockHandler = () => true;

  const first = context.AST.Triggers.upsert({
    id: 'daily_rollup',
    schedule: { type: 'every_days', every: 1, atHour: 3 },
    dispatch: { mode: 'direct', handler: 'mockHandler' }
  });
  assert.equal(first.created, true);
  assert.equal(scriptApp.__getTriggers().length, 1);

  const second = context.AST.Triggers.upsert({
    id: 'daily_rollup',
    schedule: { type: 'every_days', every: 1, atHour: 6 },
    dispatch: { mode: 'direct', handler: 'mockHandler' }
  });
  assert.equal(second.updated, true);
  assert.equal(second.noop, false);
  assert.equal(scriptApp.__getTriggers().length, 1);
  assert.notEqual(first.triggerUid, second.triggerUid);
});

test('AST.Triggers rejects onWeekDay for daily schedules', () => {
  const { context } = createTriggersContext();
  context.invalidDailyHandler = () => true;

  assert.throws(
    () => context.AST.Triggers.upsert({
      id: 'invalid_daily_weekday',
      schedule: { type: 'every_days', every: 1, onWeekDay: 'MONDAY' },
      dispatch: { mode: 'direct', handler: 'invalidDailyHandler' }
    }),
    /schedule\.onWeekDay is only supported for every_weeks/
  );
});

test('AST.Triggers rejects reserved internal IDs', () => {
  const { context } = createTriggersContext();
  context.reservedIdHandler = () => true;

  assert.throws(
    () => context.AST.Triggers.upsert({
      id: '__index',
      schedule: { type: 'every_minutes', every: 10 },
      dispatch: { mode: 'direct', handler: 'reservedIdHandler' }
    }),
    /reserved/
  );

  assert.throws(
    () => context.AST.Triggers.upsert({
      id: '__uid__manual',
      schedule: { type: 'every_minutes', every: 10 },
      dispatch: { mode: 'direct', handler: 'reservedIdHandler' }
    }),
    /reserved/
  );
});

test('AST.Triggers rejects invalid schedule.every values', () => {
  const { context } = createTriggersContext();
  context.invalidEveryHandler = () => true;

  assert.throws(
    () => context.AST.Triggers.upsert({
      id: 'invalid_every_zero',
      schedule: { type: 'every_minutes', every: 0 },
      dispatch: { mode: 'direct', handler: 'invalidEveryHandler' }
    }),
    /schedule\.every must be an integer between 1 and 60/
  );

  assert.throws(
    () => context.AST.Triggers.upsert({
      id: 'invalid_every_large',
      schedule: { type: 'every_days', every: 61 },
      dispatch: { mode: 'direct', handler: 'invalidEveryHandler' }
    }),
    /schedule\.every must be an integer between 1 and 60/
  );
});

test('AST.Triggers upsert recreates trigger when dispatch handler config changes', () => {
  const { context, scriptApp } = createTriggersContext();
  context.dispatchHandlerA = () => true;
  context.dispatchHandlerB = () => true;

  context.AST.Triggers.configure({
    AST_TRIGGERS_DISPATCH_HANDLER: 'dispatchHandlerA'
  });

  const first = context.AST.Triggers.upsert({
    id: 'handler_rotation',
    schedule: { type: 'every_minutes', every: 15 },
    dispatch: { mode: 'direct', handler: 'dispatchHandlerA' }
  });

  assert.equal(first.created, true);
  assert.equal(first.noop, false);
  assert.equal(scriptApp.__getTriggers().length, 1);
  assert.equal(scriptApp.__getTriggers()[0].getHandlerFunction(), 'dispatchHandlerA');

  context.AST.Triggers.configure({
    AST_TRIGGERS_DISPATCH_HANDLER: 'dispatchHandlerB'
  });

  const second = context.AST.Triggers.upsert({
    id: 'handler_rotation',
    schedule: { type: 'every_minutes', every: 15 },
    dispatch: { mode: 'direct', handler: 'dispatchHandlerA' }
  });

  assert.equal(second.updated, true);
  assert.equal(second.noop, false);
  assert.equal(scriptApp.__getTriggers().length, 1);
  assert.equal(scriptApp.__getTriggers()[0].getHandlerFunction(), 'dispatchHandlerB');
  assert.notEqual(first.triggerUid, second.triggerUid);
});

test('AST.Triggers keeps existing trigger when replacement creation fails', () => {
  const { context, scriptApp } = createTriggersContext();
  context.recreateSafeHandler = () => true;

  const first = context.AST.Triggers.upsert({
    id: 'recreate_safe',
    schedule: { type: 'every_hours', every: 1 },
    dispatch: { mode: 'direct', handler: 'recreateSafeHandler' }
  });
  const originalUid = first.triggerUid;
  assert.equal(scriptApp.__getTriggers().length, 1);

  scriptApp.__failNextCreate(new Error('forced create failure'));
  assert.throws(
    () => context.AST.Triggers.upsert({
      id: 'recreate_safe',
      schedule: { type: 'every_hours', every: 2 },
      dispatch: { mode: 'direct', handler: 'recreateSafeHandler' }
    }),
    /Failed to create replacement trigger|forced create failure/
  );

  const triggersAfter = scriptApp.__getTriggers();
  assert.equal(triggersAfter.length, 1);
  assert.equal(triggersAfter[0].getUniqueId(), originalUid);

  const listed = context.AST.Triggers.list({
    filters: { id: 'recreate_safe' },
    options: { includeRaw: true }
  });
  assert.equal(listed.page.total, 1);
  assert.equal(listed.items[0].triggerUid, originalUid);
  assert.equal(listed.items[0].definition.schedule.every, 1);
});

test('AST.Triggers runNow supports jobs dispatch integration', () => {
  const { context } = createTriggersContext({ includeJobs: true });
  context.jobsTriggerStep = ({ payload }) => payload.value + 5;

  context.AST.Triggers.upsert({
    id: 'jobs_dispatch_trigger',
    schedule: { type: 'every_minutes', every: 10 },
    dispatch: {
      mode: 'jobs',
      autoResumeJobs: true,
      job: {
        name: 'trigger-jobs-dispatch',
        options: {
          propertyPrefix: 'AST_JOBS_TRIGGERS_TEST_'
        },
        steps: [
          {
            id: 'step_one',
            handler: 'jobsTriggerStep',
            payload: { value: 7 }
          }
        ]
      }
    }
  });

  const output = context.AST.Triggers.runNow({
    id: 'jobs_dispatch_trigger',
    options: { includeRaw: true }
  });

  assert.equal(output.status, 'ok');
  assert.equal(output.dispatchMode, 'jobs');
  assert.equal(output.result.mode, 'jobs');
  assert.equal(typeof output.result.enqueued.id, 'string');
  assert.equal(output.result.resumed.status, 'completed');
  assert.equal(output.result.resumed.results.step_one, 12);
});

test('AST.Triggers list/delete support pagination and full cleanup', () => {
  const { context, scriptApp } = createTriggersContext();
  context.cleanHandler = () => true;

  context.AST.Triggers.upsert({
    id: 'cleanup_a',
    schedule: { type: 'every_minutes', every: 5 },
    dispatch: { mode: 'direct', handler: 'cleanHandler' }
  });
  context.AST.Triggers.upsert({
    id: 'cleanup_b',
    schedule: { type: 'every_minutes', every: 6 },
    dispatch: { mode: 'direct', handler: 'cleanHandler' }
  });

  const listPaged = context.AST.Triggers.list({
    options: { limit: 1, offset: 0 }
  });
  assert.equal(listPaged.page.returned, 1);
  assert.equal(listPaged.page.total, 2);
  assert.equal(listPaged.page.hasMore, true);

  const deleted = context.AST.Triggers.delete({
    options: { all: true }
  });
  assert.equal(deleted.deleted, 2);
  assert.equal(scriptApp.__getTriggers().length, 0);

  const listed = context.AST.Triggers.list({});
  assert.equal(listed.page.total, 0);
});

test('AST.Triggers list includeOrphans ignores list filters for managed trigger UIDs', () => {
  const { context } = createTriggersContext();
  context.orphanFilterHandler = () => true;

  context.AST.Triggers.upsert({
    id: 'orphan_filter_a',
    schedule: { type: 'every_minutes', every: 5 },
    dispatch: { mode: 'direct', handler: 'orphanFilterHandler' }
  });
  context.AST.Triggers.upsert({
    id: 'orphan_filter_b',
    schedule: { type: 'every_minutes', every: 6 },
    dispatch: { mode: 'direct', handler: 'orphanFilterHandler' }
  });

  const filtered = context.AST.Triggers.list({
    filters: { id: 'orphan_filter_a' },
    options: { includeOrphans: true }
  });

  assert.equal(filtered.page.returned, 1);
  assert.equal(Array.isArray(filtered.orphans), true);
  assert.equal(filtered.orphans.length, 0);
});

test('AST.Triggers metadata-only upsert updates definition without trigger recreation', () => {
  const { context, scriptApp } = createTriggersContext();
  context.metadataHandler = input => input.metadata;

  const first = context.AST.Triggers.upsert({
    id: 'metadata_update',
    schedule: { type: 'every_minutes', every: 10 },
    dispatch: { mode: 'direct', handler: 'metadataHandler' },
    metadata: { version: 1, owner: 'ops' }
  });
  assert.equal(first.created, true);
  assert.equal(scriptApp.__getTriggers().length, 1);

  const second = context.AST.Triggers.upsert({
    id: 'metadata_update',
    schedule: { type: 'every_minutes', every: 10 },
    dispatch: { mode: 'direct', handler: 'metadataHandler' },
    metadata: { version: 2, owner: 'ops' }
  });

  assert.equal(second.updated, true);
  assert.equal(second.noop, false);
  assert.equal(second.triggerUid, first.triggerUid);
  assert.equal(scriptApp.__getTriggers().length, 1);
  assert.equal(second.actions.createdTrigger, false);

  const listed = context.AST.Triggers.list({
    filters: { id: 'metadata_update' },
    options: { includeRaw: true }
  });
  assert.equal(listed.page.total, 1);
  assert.equal(listed.items[0].definition.metadata.version, 2);
});

test('AST.Runtime.configureFromProps can configure Triggers defaults', () => {
  const { context } = createTriggersContext({
    scriptPropertiesSeed: {
      AST_TRIGGERS_PROPERTY_PREFIX: 'AST_TRIGGERS_CUSTOM_',
      AST_TRIGGERS_DEFAULT_DISPATCH_MODE: 'jobs',
      AST_TRIGGERS_JOBS_AUTO_RESUME: 'true'
    }
  });

  loadScripts(context, ['apps_script_tools/AST.js']);
  context.AST.Triggers.clearConfig();

  const summary = context.AST.Runtime.configureFromProps({
    modules: ['Triggers'],
    keys: [
      'AST_TRIGGERS_PROPERTY_PREFIX',
      'AST_TRIGGERS_DEFAULT_DISPATCH_MODE',
      'AST_TRIGGERS_JOBS_AUTO_RESUME'
    ]
  });

  assert.equal(JSON.stringify(summary.configuredModules), JSON.stringify(['Triggers']));
  assert.equal(summary.failedModules.length, 0);

  const config = context.AST.Triggers.getConfig();
  assert.equal(config.AST_TRIGGERS_PROPERTY_PREFIX, 'AST_TRIGGERS_CUSTOM_');
  assert.equal(config.AST_TRIGGERS_DEFAULT_DISPATCH_MODE, 'jobs');
  assert.equal(config.AST_TRIGGERS_JOBS_AUTO_RESUME, 'true');
});

test('AST.Triggers upsert/delete supports dryRun planning mode', () => {
  const { context, scriptApp } = createTriggersContext();
  context.mockDryRunHandler = () => true;

  const upsertDryRun = context.AST.Triggers.upsert({
    id: 'dry_run_trigger',
    schedule: { type: 'every_minutes', every: 5 },
    dispatch: { mode: 'direct', handler: 'mockDryRunHandler' },
    options: { dryRun: true }
  });

  assert.equal(upsertDryRun.dryRun, true);
  assert.equal(scriptApp.__getTriggers().length, 0);

  const deleteDryRun = context.AST.Triggers.delete({
    id: 'dry_run_trigger',
    options: { dryRun: true }
  });
  assert.equal(deleteDryRun.dryRun, true);
});

test('AST.Triggers dryRun upsert does not mutate existing trigger state', () => {
  const { context, scriptApp } = createTriggersContext();
  context.mutateCheckHandler = () => true;

  const initial = context.AST.Triggers.upsert({
    id: 'dry_run_existing',
    schedule: { type: 'every_hours', every: 1 },
    dispatch: { mode: 'direct', handler: 'mutateCheckHandler' }
  });
  assert.equal(initial.created, true);
  assert.equal(scriptApp.__getTriggers().length, 1);

  const planned = context.AST.Triggers.upsert({
    id: 'dry_run_existing',
    schedule: { type: 'every_hours', every: 2 },
    dispatch: { mode: 'direct', handler: 'mutateCheckHandler' },
    options: { dryRun: true }
  });

  assert.equal(planned.dryRun, true);
  assert.equal(scriptApp.__getTriggers().length, 1);
});

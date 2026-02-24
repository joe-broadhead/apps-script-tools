import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadJobsScripts } from './jobs-helpers.mjs';

function createPropertiesService(seed = {}) {
  const store = { ...seed };
  const handle = {
    getProperty: key => {
      const normalized = String(key || '');
      return Object.prototype.hasOwnProperty.call(store, normalized) ? store[normalized] : null;
    },
    getProperties: () => ({ ...store }),
    setProperty: (key, value) => {
      store[String(key)] = String(value);
    },
    setProperties: (entries, deleteAllOthers) => {
      if (deleteAllOthers) {
        Object.keys(store).forEach(key => delete store[key]);
      }

      const source = entries && typeof entries === 'object' ? entries : {};
      Object.keys(source).forEach(key => {
        store[String(key)] = String(source[key]);
      });
    }
  };

  return {
    service: {
      getScriptProperties: () => handle
    },
    store
  };
}

function createJobsContext() {
  const properties = createPropertiesService();
  const context = createGasContext({
    PropertiesService: properties.service
  });

  loadJobsScripts(context, { includeAst: true });
  return {
    context,
    store: properties.store
  };
}

test('AST exposes Jobs namespace methods', () => {
  const { context } = createJobsContext();

  const methods = [
    'run',
    'enqueue',
    'resume',
    'status',
    'list',
    'cancel',
    'configure',
    'getConfig',
    'clearConfig'
  ];

  methods.forEach(method => {
    assert.equal(typeof context.AST.Jobs[method], 'function');
  });
});

test('AST.Jobs.run executes dependent steps and stores outputs', () => {
  const { context } = createJobsContext();
  const propertyPrefix = `AST_JOBS_LOCAL_RUN_${Date.now()}_`;

  context.jobsStepOne = ({ payload }) => payload.value * 2;
  context.jobsStepTwo = ({ results, payload }) => results.step_one + payload.increment;

  const result = context.AST.Jobs.run({
    name: 'local-run',
    options: {
      propertyPrefix
    },
    steps: [
      {
        id: 'step_one',
        handler: 'jobsStepOne',
        payload: { value: 10 }
      },
      {
        id: 'step_two',
        handler: 'jobsStepTwo',
        dependsOn: ['step_one'],
        payload: { increment: 5 }
      }
    ]
  });

  assert.equal(result.status, 'completed');
  assert.equal(result.results.step_one, 20);
  assert.equal(result.results.step_two, 25);
  assert.equal(result.steps[0].state, 'completed');
  assert.equal(result.steps[1].state, 'completed');
});

test('AST.Jobs supports pause and resume with retry semantics', () => {
  const { context } = createJobsContext();
  const propertyPrefix = `AST_JOBS_LOCAL_RESUME_${Date.now()}_`;

  context.__flakyAttempts = 0;
  context.jobsFlakyStep = () => {
    context.__flakyAttempts += 1;
    if (context.__flakyAttempts === 1) {
      throw new Error('retry-me');
    }
    return { attempts: context.__flakyAttempts, ok: true };
  };

  const queued = context.AST.Jobs.enqueue({
    name: 'resume-test',
    options: {
      propertyPrefix,
      maxRetries: 1
    },
    steps: [
      {
        id: 'flaky',
        handler: 'jobsFlakyStep'
      }
    ]
  });

  const firstPass = context.AST.Jobs.resume(queued.id);
  assert.equal(firstPass.status, 'paused');
  assert.equal(firstPass.steps[0].attempts, 1);

  const secondPass = context.AST.Jobs.resume(queued.id);
  assert.equal(secondPass.status, 'completed');
  assert.equal(secondPass.steps[0].attempts, 1);
  assert.equal(secondPass.results.flaky.attempts, 2);
});

test('AST.Jobs.status resolves jobs without requiring propertyPrefix override', () => {
  const { context } = createJobsContext();
  const propertyPrefix = `AST_JOBS_LOCAL_STATUS_${Date.now()}_`;

  context.jobsNoop = () => true;

  const queued = context.AST.Jobs.enqueue({
    name: 'status-test',
    options: {
      propertyPrefix
    },
    steps: [
      {
        id: 'only',
        handler: 'jobsNoop'
      }
    ]
  });

  const status = context.AST.Jobs.status(queued.id);
  assert.equal(status.id, queued.id);
  assert.equal(status.status, 'queued');
});

test('AST.Jobs.cancel marks queued jobs as canceled and list filters include them', () => {
  const { context } = createJobsContext();
  const propertyPrefix = `AST_JOBS_LOCAL_CANCEL_${Date.now()}_`;

  context.jobsCancelNoop = () => true;

  const queued = context.AST.Jobs.enqueue({
    name: 'cancel-test',
    options: {
      propertyPrefix
    },
    steps: [
      {
        id: 'queued_step',
        handler: 'jobsCancelNoop'
      }
    ]
  });

  const canceled = context.AST.Jobs.cancel(queued.id);
  assert.equal(canceled.status, 'canceled');
  assert.equal(canceled.steps[0].state, 'canceled');

  assert.throws(
    () => context.AST.Jobs.cancel(queued.id),
    /not cancelable/
  );

  const canceledJobs = context.AST.Jobs.list({ status: 'canceled', limit: 50 });
  assert.ok(canceledJobs.some(job => job.id === queued.id));
});

test('AST.Jobs.run fails deterministically when step output is non-serializable', () => {
  const { context } = createJobsContext();
  const propertyPrefix = `AST_JOBS_LOCAL_NON_SERIAL_${Date.now()}_`;

  context.jobsNonSerializable = () => ({ value: BigInt(42) });

  const result = context.AST.Jobs.run({
    name: 'non-serializable-output',
    options: {
      propertyPrefix,
      maxRetries: 0
    },
    steps: [
      {
        id: 'bad_step',
        handler: 'jobsNonSerializable'
      }
    ]
  });

  assert.equal(result.status, 'failed');
  assert.equal(result.steps[0].state, 'failed');
  assert.equal(result.lastError.stepId, 'bad_step');
  assert.equal(result.lastError.name, 'AstJobsStepExecutionError');
  assert.match(result.lastError.message, /JSON serializable/);

  const persisted = context.AST.Jobs.status(result.id);
  assert.equal(persisted.status, 'failed');
});

test('AST.Jobs.cancel rejects jobs currently marked as running', () => {
  const { context } = createJobsContext();
  const propertyPrefix = `AST_JOBS_LOCAL_RUNNING_CANCEL_${Date.now()}_`;

  context.jobsRunningCancelNoop = () => true;

  const queued = context.AST.Jobs.enqueue({
    name: 'running-cancel-test',
    options: {
      propertyPrefix
    },
    steps: [
      {
        id: 'step_one',
        handler: 'jobsRunningCancelNoop'
      }
    ]
  });

  const stored = context.astJobsReadJobRecord(queued.id);
  stored.status = 'running';
  context.astJobsWriteJobRecord(stored, {
    propertyPrefix: stored.options.propertyPrefix
  });

  assert.throws(
    () => context.AST.Jobs.cancel(queued.id),
    /not cancelable/
  );
});

test('AST.Jobs.configure controls runtime defaults', () => {
  const { context } = createJobsContext();
  const propertyPrefix = `AST_JOBS_LOCAL_CONFIG_${Date.now()}_`;

  context.jobsAlwaysFail = () => {
    throw new Error('always-fail');
  };

  context.AST.Jobs.clearConfig();
  context.AST.Jobs.configure({
    maxRetries: 0,
    propertyPrefix
  });

  const result = context.AST.Jobs.run({
    name: 'config-defaults',
    steps: [
      {
        id: 'failing_step',
        handler: 'jobsAlwaysFail'
      }
    ]
  });

  assert.equal(result.status, 'failed');
  assert.equal(result.options.maxRetries, 0);
  assert.equal(result.options.propertyPrefix, propertyPrefix);
});

test('jobs execution options memoize script properties snapshots and invalidate on clearConfig', () => {
  let getPropertiesCalls = 0;
  const store = {
    AST_JOBS_DEFAULT_MAX_RETRIES: '1',
    AST_JOBS_DEFAULT_MAX_RUNTIME_MS: '30000',
    AST_JOBS_PROPERTY_PREFIX: 'AST_JOBS_MEMO_A_'
  };

  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => {
          getPropertiesCalls += 1;
          return { ...store };
        },
        getProperty: key => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
        setProperty: (key, value) => {
          store[String(key)] = String(value);
        }
      })
    }
  });

  loadJobsScripts(context, { includeAst: true });
  context.AST.Jobs.clearConfig();

  const first = context.astJobsResolveExecutionOptions({});
  const second = context.astJobsResolveExecutionOptions({});
  assert.equal(first.maxRetries, 1);
  assert.equal(second.maxRetries, 1);
  assert.equal(getPropertiesCalls, 1);

  store.AST_JOBS_DEFAULT_MAX_RETRIES = '3';
  const stillCached = context.astJobsResolveExecutionOptions({});
  assert.equal(stillCached.maxRetries, 1);
  assert.equal(getPropertiesCalls, 1);

  context.AST.Jobs.clearConfig();
  const refreshed = context.astJobsResolveExecutionOptions({});
  assert.equal(refreshed.maxRetries, 3);
  assert.equal(getPropertiesCalls, 2);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadJobsScripts } from './jobs-helpers.mjs';

function createPropertiesService(seed = {}) {
  const store = { ...seed };
  const counters = {
    getProperty: 0,
    getProperties: 0,
    setProperty: 0,
    setProperties: 0
  };
  const handle = {
    getProperty: key => {
      counters.getProperty += 1;
      const normalized = String(key || '');
      return Object.prototype.hasOwnProperty.call(store, normalized) ? store[normalized] : null;
    },
    getProperties: () => {
      counters.getProperties += 1;
      return { ...store };
    },
    setProperty: (key, value) => {
      counters.setProperty += 1;
      store[String(key)] = String(value);
    },
    setProperties: (entries, deleteAllOthers) => {
      counters.setProperties += 1;
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
    store,
    counters
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
    store: properties.store,
    counters: properties.counters
  };
}

function createLegacyJobRecord(jobId, name, propertyPrefix) {
  const now = new Date().toISOString();
  return {
    id: jobId,
    version: 0,
    name,
    status: 'queued',
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    pausedAt: null,
    completedAt: null,
    canceledAt: null,
    leaseOwner: null,
    leaseExpiresAt: null,
    lastHeartbeatAt: null,
    lastError: null,
    options: {
      maxRetries: 2,
      maxRuntimeMs: 240000,
      leaseTtlMs: 120000,
      checkpointStore: 'properties',
      autoResume: true,
      propertyPrefix
    },
    steps: [
      {
        id: 'legacy_step',
        handlerName: 'legacyHandler',
        dependsOn: [],
        payload: null,
        state: 'pending',
        attempts: 0,
        startedAt: null,
        completedAt: null,
        lastError: null
      }
    ],
    results: {}
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

test('AST.Jobs run renews lease for step execution using at least maxRuntimeMs budget', () => {
  const { context } = createJobsContext();
  const propertyPrefix = `AST_JOBS_LOCAL_LEASE_RENEW_${Date.now()}_`;
  const renewedTtls = [];
  const originalRenew = context.astJobsRenewLease;

  context.astJobsRenewLease = (jobId, workerId, leaseTtlMs, options) => {
    renewedTtls.push(leaseTtlMs);
    return originalRenew(jobId, workerId, leaseTtlMs, options);
  };

  context.jobsLeaseRenewNoop = () => true;

  const result = context.AST.Jobs.run({
    name: 'lease-renew-step-test',
    options: {
      propertyPrefix,
      leaseTtlMs: 1000,
      maxRuntimeMs: 5000
    },
    steps: [
      {
        id: 'lease_renew_step',
        handler: 'jobsLeaseRenewNoop'
      }
    ]
  });

  assert.equal(result.status, 'completed');
  assert.equal(renewedTtls.some(ttl => ttl >= 5000), true);
});

test('AST.Jobs uses CAS to reject stale writes', () => {
  const { context } = createJobsContext();
  const propertyPrefix = `AST_JOBS_LOCAL_CAS_${Date.now()}_`;

  context.jobsCasNoop = () => true;

  const queued = context.AST.Jobs.enqueue({
    name: 'cas-test',
    options: {
      propertyPrefix
    },
    steps: [
      {
        id: 'cas_step',
        handler: 'jobsCasNoop'
      }
    ]
  });

  const first = context.astJobsReadJobRecord(queued.id);
  const second = context.astJobsReadJobRecord(queued.id);

  first.status = 'paused';
  context.astJobsWriteJobRecordCas(first, first.version, {
    propertyPrefix: first.options.propertyPrefix
  });

  second.status = 'canceled';
  assert.throws(
    () => context.astJobsWriteJobRecordCas(second, second.version, {
      propertyPrefix: second.options.propertyPrefix
    }),
    /version conflict/
  );
});

test('AST.Jobs lease acquisition blocks concurrent worker and allows takeover after expiry', () => {
  const { context } = createJobsContext();
  const propertyPrefix = `AST_JOBS_LOCAL_LEASE_${Date.now()}_`;

  context.jobsLeaseNoop = () => true;

  const queued = context.AST.Jobs.enqueue({
    name: 'lease-test',
    options: {
      propertyPrefix
    },
    steps: [
      {
        id: 'lease_step',
        handler: 'jobsLeaseNoop'
      }
    ]
  });

  const firstLease = context.astJobsAcquireLease(queued.id, 'worker_a', 5000, {
    propertyPrefix
  });
  assert.equal(firstLease.leaseOwner, 'worker_a');

  assert.throws(
    () => context.astJobsAcquireLease(queued.id, 'worker_b', 5000, {
      propertyPrefix
    }),
    /already held by another worker/
  );

  const staleLease = context.astJobsReadJobRecord(queued.id, {
    propertyPrefix
  });
  staleLease.leaseExpiresAt = new Date(Date.now() - 1000).toISOString();
  context.astJobsWriteJobRecordCas(staleLease, staleLease.version, {
    propertyPrefix
  });

  const takeoverLease = context.astJobsAcquireLease(queued.id, 'worker_b', 5000, {
    propertyPrefix
  });
  assert.equal(takeoverLease.leaseOwner, 'worker_b');
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

test('AST.Jobs.status falls back to legacy prefix scan when locator is missing', () => {
  const { context, store } = createJobsContext();
  const propertyPrefix = `AST_JOBS_LEGACY_STATUS_${Date.now()}_`;
  const jobId = `legacy_status_${Date.now()}`;
  const propertyKey = `${propertyPrefix}${jobId}`;

  store[propertyKey] = JSON.stringify(createLegacyJobRecord(jobId, 'legacy-status', propertyPrefix));

  const status = context.AST.Jobs.status(jobId);
  assert.equal(status.id, jobId);
  assert.equal(status.options.propertyPrefix, propertyPrefix);
  assert.equal(typeof store[`AST_JOBS_LOCATOR_${jobId}`], 'string');
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

test('AST.Jobs.resume on completed job does not mutate lease/version state', () => {
  const { context } = createJobsContext();
  const propertyPrefix = `AST_JOBS_LOCAL_RESUME_COMPLETED_${Date.now()}_`;

  context.jobsCompleteStep = () => true;

  const completed = context.AST.Jobs.run({
    name: 'resume-completed-no-mutate',
    options: {
      propertyPrefix
    },
    steps: [
      {
        id: 'done_step',
        handler: 'jobsCompleteStep'
      }
    ]
  });
  assert.equal(completed.status, 'completed');

  const before = context.AST.Jobs.status(completed.id, {
    propertyPrefix
  });

  assert.throws(
    () => context.AST.Jobs.resume(completed.id, {
      propertyPrefix
    }),
    /terminal|resumable/
  );

  const after = context.AST.Jobs.status(completed.id, {
    propertyPrefix
  });
  assert.equal(after.status, 'completed');
  assert.equal(after.version, before.version);
  assert.equal(after.updatedAt, before.updatedAt);
});

test('AST.Jobs status/list avoid broad script property scans on indexed paths', () => {
  const { context, counters } = createJobsContext();
  const propertyPrefix = `AST_JOBS_LOCAL_INDEXED_${Date.now()}_`;

  context.jobsIndexedNoop = () => true;
  context.AST.Jobs.clearConfig();
  context.AST.Jobs.configure({
    maxRetries: 2,
    maxRuntimeMs: 240000,
    leaseTtlMs: 120000,
    checkpointStore: 'properties',
    propertyPrefix: 'AST_JOBS_JOB_'
  }, {
    merge: false
  });

  const queued = context.AST.Jobs.enqueue({
    name: 'indexed-test',
    options: {
      propertyPrefix
    },
    steps: [
      {
        id: 'indexed_step',
        handler: 'jobsIndexedNoop'
      }
    ]
  });

  counters.getProperties = 0;
  const status = context.AST.Jobs.status(queued.id);
  const listed = context.AST.Jobs.list({
    name: 'indexed-test'
  });

  assert.equal(status.id, queued.id);
  assert.equal(listed.some(item => item.id === queued.id), true);
  assert.equal(counters.getProperties, 0);
});

test('AST.Jobs.list discovers legacy prefixes when registry is missing', () => {
  const { context, store } = createJobsContext();
  const prefixA = `AST_JOBS_LEGACY_A_${Date.now()}_`;
  const prefixB = `AST_JOBS_LEGACY_B_${Date.now()}_`;
  const idA = `legacy_a_${Date.now()}`;
  const idB = `legacy_b_${Date.now()}`;

  store[`${prefixA}${idA}`] = JSON.stringify(createLegacyJobRecord(idA, 'legacy-list', prefixA));
  store[`${prefixB}${idB}`] = JSON.stringify(createLegacyJobRecord(idB, 'legacy-list', prefixB));
  delete store.AST_JOBS_PREFIX_REGISTRY;

  const listed = context.AST.Jobs.list({
    name: 'legacy-list',
    limit: 20
  });

  assert.equal(listed.some(item => item.id === idA), true);
  assert.equal(listed.some(item => item.id === idB), true);
  assert.equal(typeof store.AST_JOBS_PREFIX_REGISTRY, 'string');
});

test('AST.Jobs.list with explicit propertyPrefix includes legacy records when indexes are missing', () => {
  const { context, store } = createJobsContext();
  const prefix = `AST_JOBS_LEGACY_EXPLICIT_${Date.now()}_`;
  const jobId = `legacy_explicit_${Date.now()}`;

  store[`${prefix}${jobId}`] = JSON.stringify(createLegacyJobRecord(jobId, 'legacy-explicit', prefix));
  delete store.AST_JOBS_PREFIX_REGISTRY;

  const listed = context.AST.Jobs.list({
    name: 'legacy-explicit',
    limit: 20
  }, {
    propertyPrefix: prefix
  });

  assert.equal(listed.some(item => item.id === jobId), true);
});

test('AST.Jobs.list keeps returning legacy records after registry bootstrap', () => {
  const { context, store } = createJobsContext();
  const prefix = `AST_JOBS_LEGACY_REPEAT_${Date.now()}_`;
  const jobId = `legacy_repeat_${Date.now()}`;

  store[`${prefix}${jobId}`] = JSON.stringify(createLegacyJobRecord(jobId, 'legacy-repeat', prefix));
  delete store.AST_JOBS_PREFIX_REGISTRY;

  const first = context.AST.Jobs.list({
    name: 'legacy-repeat',
    limit: 20
  });
  assert.equal(first.some(item => item.id === jobId), true);

  const second = context.AST.Jobs.list({
    name: 'legacy-repeat',
    limit: 20
  });
  assert.equal(second.some(item => item.id === jobId), true);
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
  const scriptHandle = {
    getProperties: () => {
      getPropertiesCalls += 1;
      return { ...store };
    },
    getProperty: key => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
    setProperty: (key, value) => {
      store[String(key)] = String(value);
    }
  };

  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => scriptHandle
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

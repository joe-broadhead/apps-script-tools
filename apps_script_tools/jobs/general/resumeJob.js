function astJobsResume(jobId, options = {}) {
  return astJobsExecutePersistedJob(jobId, options);
}

function astJobsDeepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function astJobsStatus(jobId, options = {}) {
  const job = astJobsReadJobRecord(jobId, options);
  return astJobsDeepClone(job);
}

function astJobsList(filters = {}, options = {}) {
  return astJobsListJobRecords(filters, options).map(item => astJobsDeepClone(item));
}

function astJobsCancel(jobId, options = {}) {
  const normalizedJobId = astJobsNormalizeJobId(jobId);
  const job = astJobsReadJobRecord(normalizedJobId, options);

  if (job.status === 'completed' || job.status === 'canceled' || job.status === 'running') {
    throw new AstJobsConflictError('Job is not cancelable in its current state', {
      jobId: normalizedJobId,
      status: job.status
    });
  }

  const now = new Date().toISOString();
  job.status = 'canceled';
  job.canceledAt = now;
  job.pausedAt = null;
  job.updatedAt = now;

  if (Array.isArray(job.steps)) {
    job.steps = job.steps.map(step => {
      if (!astJobsIsPlainObject(step)) {
        return step;
      }

      if (step.state === 'pending' || step.state === 'running') {
        return Object.assign({}, step, {
          state: 'canceled'
        });
      }

      return step;
    });
  }

  astJobsWriteJobRecord(job, {
    propertyPrefix: job.options && job.options.propertyPrefix
  });

  return astJobsDeepClone(job);
}

const __astJobsResumeRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astJobsResumeRoot.astJobsResume = astJobsResume;
__astJobsResumeRoot.astJobsStatus = astJobsStatus;
__astJobsResumeRoot.astJobsList = astJobsList;
__astJobsResumeRoot.astJobsCancel = astJobsCancel;
this.astJobsResume = astJobsResume;
this.astJobsStatus = astJobsStatus;
this.astJobsList = astJobsList;
this.astJobsCancel = astJobsCancel;

function astJobsApiRun(request = {}) {
  return astJobsRun(request);
}

function astJobsApiEnqueue(request = {}) {
  return astJobsEnqueue(request);
}

function astJobsApiResume(jobId, options = {}) {
  return astJobsResume(jobId, options);
}

function astJobsApiStatus(jobId, options = {}) {
  return astJobsStatus(jobId, options);
}

function astJobsApiList(filters = {}, options = {}) {
  return astJobsList(filters, options);
}

function astJobsApiCancel(jobId, options = {}) {
  return astJobsCancel(jobId, options);
}

function astJobsApiListFailed(filters = {}, options = {}) {
  return astJobsListFailed(filters, options);
}

function astJobsApiMoveToDlq(jobId, options = {}) {
  return astJobsMoveToDlq(jobId, options);
}

function astJobsApiReplayDlq(request = {}) {
  return astJobsReplayDlq(request);
}

function astJobsApiPurgeDlq(request = {}) {
  return astJobsPurgeDlq(request);
}

function astJobsApiConfigure(config = {}, options = {}) {
  return astJobsSetRuntimeConfig(config, options);
}

function astJobsApiEnqueueMany(request = {}) {
  return astJobsEnqueueMany(request);
}

function astJobsApiChain(request = {}) {
  return astJobsChain(request);
}

function astJobsApiMapReduce(request = {}) {
  return astJobsMapReduce(request);
}

function astJobsApiSchedule(request = {}) {
  return astJobsSchedule(request);
}

function astJobsApiGetConfig() {
  return astJobsGetRuntimeConfig();
}

function astJobsApiClearConfig() {
  return astJobsClearRuntimeConfig();
}

const AST_JOBS = Object.freeze({
  run: astJobsApiRun,
  enqueue: astJobsApiEnqueue,
  resume: astJobsApiResume,
  status: astJobsApiStatus,
  list: astJobsApiList,
  cancel: astJobsApiCancel,
  listFailed: astJobsApiListFailed,
  moveToDlq: astJobsApiMoveToDlq,
  replayDlq: astJobsApiReplayDlq,
  purgeDlq: astJobsApiPurgeDlq,
  enqueueMany: astJobsApiEnqueueMany,
  chain: astJobsApiChain,
  mapReduce: astJobsApiMapReduce,
  schedule: astJobsApiSchedule,
  configure: astJobsApiConfigure,
  getConfig: astJobsApiGetConfig,
  clearConfig: astJobsApiClearConfig
});

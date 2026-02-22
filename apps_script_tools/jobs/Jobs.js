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

function astJobsApiConfigure(config = {}, options = {}) {
  return astJobsSetRuntimeConfig(config, options);
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
  configure: astJobsApiConfigure,
  getConfig: astJobsApiGetConfig,
  clearConfig: astJobsApiClearConfig
});

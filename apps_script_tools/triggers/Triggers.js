function astTriggersApiRun(request = {}) {
  return astRunTriggersRequest(request);
}

function astTriggersApiUpsert(request = {}) {
  return astRunTriggersRequest(Object.assign({}, request, { operation: 'upsert' }));
}

function astTriggersApiList(request = {}) {
  return astRunTriggersRequest(Object.assign({}, request, { operation: 'list' }));
}

function astTriggersApiDelete(request = {}) {
  return astRunTriggersRequest(Object.assign({}, request, { operation: 'delete' }));
}

function astTriggersApiRunNow(request = {}) {
  return astRunTriggersRequest(Object.assign({}, request, { operation: 'run_now' }));
}

function astTriggersApiConfigure(config = {}, options = {}) {
  return astTriggersSetRuntimeConfig(config, options);
}

function astTriggersApiGetConfig() {
  return astTriggersGetRuntimeConfig();
}

function astTriggersApiClearConfig() {
  return astTriggersClearRuntimeConfig();
}

const AST_TRIGGERS = Object.freeze({
  run: astTriggersApiRun,
  upsert: astTriggersApiUpsert,
  list: astTriggersApiList,
  delete: astTriggersApiDelete,
  runNow: astTriggersApiRunNow,
  configure: astTriggersApiConfigure,
  getConfig: astTriggersApiGetConfig,
  clearConfig: astTriggersApiClearConfig
});

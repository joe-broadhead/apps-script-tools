function clearCookbookConfig() {
  const props = cookbookScriptProperties_();
  const fields = cookbookConfigFields_();
  const removed = [];

  for (let idx = 0; idx < fields.length; idx += 1) {
    props.deleteProperty(fields[idx].key);
    removed.push(fields[idx].key);
  }

  return cookbookLogResult_('clearCookbookConfig', {
    status: 'ok',
    cookbook: cookbookName_(),
    removed
  });
}

function showCookbookContract() {
  return cookbookLogResult_('showCookbookContract', {
    cookbook: cookbookName_(),
    templateVersion: cookbookTemplateVersion_(),
    requiredEntrypoints: [
      'seedCookbookConfig',
      'validateCookbookConfig',
      'runCookbookSmoke',
      'runCookbookDemo',
      'runCookbookAll'
    ],
    configFields: cookbookConfigFields_()
  });
}

function showMessagingRuntimeConfig() {
  const ASTX = cookbookAst_();
  return cookbookLogResult_('showMessagingRuntimeConfig', ASTX.Messaging.getConfig());
}

function clearMessagingRuntimeConfig() {
  const ASTX = cookbookAst_();
  return cookbookLogResult_('clearMessagingRuntimeConfig', ASTX.Messaging.clearConfig());
}

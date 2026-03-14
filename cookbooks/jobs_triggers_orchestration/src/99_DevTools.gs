function clearCookbookConfig() {
  const props = cookbookScriptProperties_();
  const fields = cookbookConfigFields_();
  for (let idx = 0; idx < fields.length; idx += 1) {
    props.deleteProperty(fields[idx].key);
  }
  return cookbookLogResult_('clearCookbookConfig', {
    status: 'ok',
    cookbook: cookbookName_(),
    templateVersion: cookbookTemplateVersion_(),
    clearedKeys: fields.map(function (field) { return field.key; })
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
      'runCookbookAll',
      'cleanupCookbookArtifacts'
    ],
    scriptProperties: cookbookConfigFields_().map(function (field) {
      return {
        key: field.key,
        required: field.required,
        defaultValue: field.defaultValue,
        description: field.description
      };
    })
  });
}

function showCookbookSources() {
  const validation = cookbookRequireValidConfig_();
  return cookbookLogResult_('showCookbookSources', {
    cookbook: cookbookName_(),
    config: cookbookPublicConfig_(validation.config),
    jobNames: cookbookJobNames_(validation.config),
    triggerIds: cookbookTriggerIds_(validation.config),
    schedule: cookbookTriggerSchedule_(validation.config),
    jobOptions: cookbookJobOptions_(validation.config)
  });
}

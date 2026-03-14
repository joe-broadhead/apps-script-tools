function clearCookbookConfig() {
  const props = cookbookScriptProperties_();
  const fields = cookbookConfigFields_();

  for (let idx = 0; idx < fields.length; idx += 1) {
    props.deleteProperty(fields[idx].key);
  }

  return cookbookLogResult_('clearCookbookConfig', {
    status: 'ok',
    cookbook: cookbookName_(),
    clearedKeys: fields.map(function (field) {
      return field.key;
    }),
    templateVersion: cookbookTemplateVersion_()
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

function showTelemetryRuntimeConfig() {
  const ASTX = cookbookAst_();
  return cookbookLogResult_('showTelemetryRuntimeConfig', {
    cookbook: cookbookName_(),
    runtimeConfig: ASTX.Telemetry.getConfig()
  });
}

function clearTelemetryRuntimeConfig() {
  const ASTX = cookbookAst_();
  ASTX.Telemetry.clearConfig();
  return cookbookLogResult_('clearTelemetryRuntimeConfig', {
    cookbook: cookbookName_(),
    status: 'ok'
  });
}

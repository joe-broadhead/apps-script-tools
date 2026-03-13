function clearCookbookConfig() {
  const props = cookbookScriptProperties_();
  const fields = cookbookConfigFields_();

  for (let idx = 0; idx < fields.length; idx += 1) {
    props.deleteProperty(fields[idx].key);
  }

  return cookbookLogResult_('clearCookbookConfig', {
    status: 'ok',
    clearedKeys: fields.map(function (field) { return field.key; }),
    templateVersion: cookbookTemplateVersion_(),
    cookbook: cookbookName_()
  });
}

function showCookbookContract() {
  return cookbookLogResult_('showCookbookContract', {
    templateVersion: cookbookTemplateVersion_(),
    cookbook: cookbookName_(),
    requiredEntrypoints: [
      'seedCookbookConfig',
      'validateCookbookConfig',
      'runCookbookSmoke',
      'runCookbookDemo',
      'runCookbookAll'
    ],
    additionalEntrypoints: [
      'runCookbookGuardrailDemo',
      'showCookbookProviders'
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

function showCookbookProviders() {
  return cookbookWithAiRuntime_(function (ASTX) {
    const providers = ASTX.AI.providers();
    const matrix = {};
    for (let idx = 0; idx < providers.length; idx += 1) {
      matrix[providers[idx]] = ASTX.AI.capabilities(providers[idx]);
    }

    return cookbookLogResult_('showCookbookProviders', {
      cookbook: cookbookName_(),
      providers: providers,
      capabilities: matrix,
      activeConfig: validateCookbookConfig().config
    });
  });
}

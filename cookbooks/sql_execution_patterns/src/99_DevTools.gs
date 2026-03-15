function clearCookbookConfig() {
  const props = cookbookScriptProperties_();
  const fields = cookbookConfigFields_();

  for (let idx = 0; idx < fields.length; idx += 1) {
    props.deleteProperty(fields[idx].key);
  }

  return cookbookLogResult_('clearCookbookConfig', {
    status: 'ok',
    clearedKeys: fields.map(field => field.key),
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
    scriptProperties: cookbookConfigFields_().map(field => ({
      key: field.key,
      required: field.required,
      defaultValue: field.defaultValue,
      description: field.description
    }))
  });
}

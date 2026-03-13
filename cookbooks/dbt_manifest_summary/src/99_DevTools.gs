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
      'runCookbookFixtureLab',
      'showCookbookSources'
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
    manifestRequest: cookbookBuildManifestRequest_(validation.config),
    ownerPaths: cookbookSplitCsv_(validation.config.DBT_ARTIFACT_EXPLORER_OWNER_PATHS),
    optionalArtifacts: {
      catalog: validation.config.DBT_ARTIFACT_EXPLORER_CATALOG_URI,
      run_results: validation.config.DBT_ARTIFACT_EXPLORER_RUN_RESULTS_URI,
      sources: validation.config.DBT_ARTIFACT_EXPLORER_SOURCES_URI
    }
  });
}

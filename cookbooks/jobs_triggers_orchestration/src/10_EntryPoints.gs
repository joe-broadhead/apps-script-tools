function runCookbookSmoke() {
  const validation = cookbookRequireValidConfig_();
  return cookbookLogResult_('runCookbookSmoke', runCookbookSmokeInternal_(validation.config));
}

function runCookbookDemo() {
  const validation = cookbookRequireValidConfig_();
  return cookbookLogResult_('runCookbookDemo', runCookbookDemoInternal_(validation.config));
}

function runCookbookAll() {
  const validation = cookbookRequireValidConfig_();
  const output = {
    status: 'ok',
    cookbook: cookbookName_(),
    templateVersion: cookbookTemplateVersion_(),
    config: cookbookPublicConfig_(validation.config),
    smoke: runCookbookSmokeInternal_(validation.config),
    demo: runCookbookDemoInternal_(validation.config),
    completedAt: new Date().toISOString()
  };
  return cookbookLogResult_('runCookbookAll', output);
}

function cleanupCookbookArtifacts() {
  const validation = cookbookRequireValidConfig_();
  return cookbookLogResult_(
    'cleanupCookbookArtifacts',
    cookbookCleanupState_(cookbookAst_(), validation.config)
  );
}

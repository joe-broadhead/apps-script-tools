function runCookbookSmoke() {
  const validation = cookbookRequireValidConfig_();
  const ASTX = cookbookAst_();
  cookbookConfigureGitHub_(ASTX, validation.config);
  return cookbookLogResult_('runCookbookSmoke', runCookbookSmokeInternal_(ASTX, validation.config));
}

function runCookbookDemo() {
  const validation = cookbookRequireValidConfig_();
  const ASTX = cookbookAst_();
  cookbookConfigureGitHub_(ASTX, validation.config);
  return cookbookLogResult_('runCookbookDemo', runCookbookDemoInternal_(ASTX, validation.config));
}

function runCookbookWebhookFixture() {
  const validation = cookbookRequireValidConfig_();
  const ASTX = cookbookAst_();
  cookbookConfigureGitHub_(ASTX, validation.config);
  return cookbookLogResult_('runCookbookWebhookFixture', cookbookRunWebhookFixture_(ASTX, validation.config));
}

function runCookbookAll() {
  const validation = cookbookRequireValidConfig_();
  const ASTX = cookbookAst_();
  cookbookConfigureGitHub_(ASTX, validation.config);
  const output = {
    status: 'ok',
    templateVersion: cookbookTemplateVersion_(),
    cookbook: cookbookName_(),
    config: cookbookPublicConfig_(validation.config),
    smoke: runCookbookSmokeInternal_(ASTX, validation.config),
    demo: runCookbookDemoInternal_(ASTX, validation.config),
    completedAt: new Date().toISOString()
  };
  return cookbookLogResult_('runCookbookAll', output);
}

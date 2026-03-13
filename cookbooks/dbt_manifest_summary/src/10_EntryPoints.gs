function runCookbookSmoke() {
  const validation = cookbookRequireValidConfig_();
  const ASTX = cookbookAst_();
  const context = cookbookBuildLiveContext_(ASTX, validation.config);
  return cookbookLogResult_('runCookbookSmoke', runCookbookSmokeInternal_(ASTX, validation.config, context));
}

function runCookbookDemo() {
  const validation = cookbookRequireValidConfig_();
  const ASTX = cookbookAst_();
  const context = cookbookBuildLiveContext_(ASTX, validation.config);
  return cookbookLogResult_('runCookbookDemo', runCookbookDemoInternal_(ASTX, validation.config, context));
}

function runCookbookFixtureLab() {
  const validation = cookbookRequireValidConfig_();
  const ASTX = cookbookAst_();
  return cookbookLogResult_('runCookbookFixtureLab', cookbookRunFixtureLab_(ASTX, validation.config));
}

function runCookbookAll() {
  const validation = cookbookRequireValidConfig_();
  const ASTX = cookbookAst_();
  const context = cookbookBuildLiveContext_(ASTX, validation.config);
  const output = {
    status: 'ok',
    templateVersion: cookbookTemplateVersion_(),
    cookbook: cookbookName_(),
    config: validation.config,
    smoke: runCookbookSmokeInternal_(ASTX, validation.config, context),
    demo: runCookbookDemoInternal_(ASTX, validation.config, context),
    completedAt: new Date().toISOString()
  };
  return cookbookLogResult_('runCookbookAll', output);
}

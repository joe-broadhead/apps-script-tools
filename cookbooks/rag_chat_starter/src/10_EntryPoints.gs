function runCookbookSmoke() {
  const config = cookbookRequireValidConfig_();
  return cookbookLogResult_('runCookbookSmoke', runCookbookSmokeInternal_(config));
}

function runCookbookDemo() {
  const config = cookbookRequireValidConfig_();
  return cookbookLogResult_('runCookbookDemo', runCookbookDemoInternal_(config));
}

function runCookbookAll() {
  const config = cookbookRequireValidConfig_();
  const output = {
    status: 'ok',
    cookbook: cookbookName_(),
    templateVersion: cookbookTemplateVersion_(),
    config: config,
    smoke: runCookbookSmokeInternal_(config),
    demo: runCookbookDemoInternal_(config),
    completedAt: new Date().toISOString()
  };
  return cookbookLogResult_('runCookbookAll', output);
}

function doGet() {
  const validation = validateCookbookConfig();
  if (validation.status !== 'ok') {
    return HtmlService
      .createHtmlOutput(cookbookRenderConfigErrorPage_(validation))
      .setTitle('Cookbook config error');
  }

  const template = HtmlService.createTemplateFromFile('Index');
  template.initialTitle = validation.config.RAG_CHAT_APP_NAME;
  return template
    .evaluate()
    .setTitle(validation.config.RAG_CHAT_APP_NAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

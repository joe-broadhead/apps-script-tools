function runCookbookSmoke() {
  const validation = cookbookRequireValidConfig_();
  return cookbookLogResult_('runCookbookSmoke', runCookbookSmokeInternal_(validation.config));
}

function runCookbookDemo() {
  const validation = cookbookRequireValidConfig_();
  return cookbookLogResult_('runCookbookDemo', runCookbookDemoInternal_(validation.config));
}

function runCookbookAll() {
  const validation = validateCookbookConfig();
  const smoke = validation.status === 'ok' ? runCookbookSmokeInternal_(validation.config) : null;
  const demo = validation.status === 'ok' ? runCookbookDemoInternal_(validation.config) : null;

  return cookbookLogResult_('runCookbookAll', {
    status: validation.status,
    cookbook: cookbookName_(),
    templateVersion: cookbookTemplateVersion_(),
    validation: cookbookValidationSummary_(validation),
    smoke,
    demo,
    generatedAt: new Date().toISOString()
  });
}

function runCookbookSmoke() {
  const validation = cookbookRequireValidConfig_();
  return cookbookWithAiRuntime_(function (ASTX) {
    return cookbookLogResult_('runCookbookSmoke', runCookbookSmokeInternal_(ASTX, validation.config));
  });
}

function runCookbookDemo() {
  const validation = cookbookRequireValidConfig_();
  return cookbookWithAiRuntime_(function (ASTX) {
    return cookbookLogResult_('runCookbookDemo', runCookbookDemoInternal_(ASTX, validation.config));
  });
}

function runCookbookGuardrailDemo() {
  const validation = cookbookRequireValidConfig_();
  return cookbookWithAiRuntime_(function (ASTX) {
    return cookbookLogResult_('runCookbookGuardrailDemo', runCookbookGuardrailDemoInternal_(ASTX, validation.config));
  });
}

function runCookbookAll() {
  const validation = cookbookRequireValidConfig_();
  return cookbookWithAiRuntime_(function (ASTX) {
    const guardrail = validation.config.AI_PLAYGROUND_RUN_GUARDRAIL_DEMO
      ? runCookbookGuardrailDemoInternal_(ASTX, validation.config)
      : {
          status: 'skip',
          entrypoint: 'runCookbookGuardrailDemo',
          reason: 'AI_PLAYGROUND_RUN_GUARDRAIL_DEMO=false'
        };

    const output = {
      status: 'ok',
      templateVersion: cookbookTemplateVersion_(),
      cookbook: cookbookName_(),
      config: validation.config,
      smoke: runCookbookSmokeInternal_(ASTX, validation.config),
      demo: runCookbookDemoInternal_(ASTX, validation.config),
      guardrail: guardrail,
      completedAt: new Date().toISOString()
    };
    return cookbookLogResult_('runCookbookAll', output);
  });
}

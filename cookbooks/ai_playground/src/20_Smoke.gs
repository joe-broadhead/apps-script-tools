function cookbookAssertSmokeText_(response) {
  const outputText = String(response && response.output && response.output.text ? response.output.text : '').trim().toUpperCase();
  if (outputText.indexOf('READY') === -1) {
    throw new Error(`Smoke text request did not contain READY. Received: ${outputText}`);
  }
}

function cookbookAssertSmokeStructured_(response) {
  const payload = response && response.output ? response.output.json : null;
  if (!payload || payload.status !== 'ok' || payload.mode !== 'structured' || Number(payload.checksum) !== 42) {
    throw new Error(`Structured smoke validation failed: ${JSON.stringify(payload)}`);
  }
}

function cookbookAssertSmokeTools_(response) {
  const toolResults = response && response.output && Array.isArray(response.output.toolResults)
    ? response.output.toolResults
    : [];
  if (toolResults.length !== 1 || Number(toolResults[0].result) !== 42) {
    throw new Error(`Tool smoke validation failed: ${JSON.stringify(toolResults)}`);
  }
}

function runCookbookSmokeInternal_(ASTX, config) {
  const startedAtMs = Date.now();
  const primaryProvider = config.AI_PLAYGROUND_PRIMARY_PROVIDER;
  const capabilities = ASTX.AI.capabilities(primaryProvider);

  const textResponse = ASTX.AI.text({
    provider: primaryProvider,
    input: config.AI_PLAYGROUND_TEXT_PROMPT,
    options: cookbookBaseAiOptions_(config)
  });
  cookbookAssertSmokeText_(textResponse);

  const structuredResponse = ASTX.AI.structured({
    provider: primaryProvider,
    input: 'Return JSON only with status="ok", mode="structured", checksum=42.',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        mode: { type: 'string' },
        checksum: { type: 'integer' }
      },
      required: ['status', 'mode', 'checksum'],
      additionalProperties: false
    },
    options: cookbookBaseAiOptions_(config, {
      reliability: {
        maxSchemaRetries: 2,
        repairMode: 'json_repair',
        strictValidation: true
      }
    })
  });
  cookbookAssertSmokeStructured_(structuredResponse);

  const toolsResponse = ASTX.AI.tools({
    provider: primaryProvider,
    input: 'Use the add_numbers tool exactly once with a=19 and b=23. After the tool result, answer with exactly 42.',
    tools: cookbookBuildToolDefinitions_(config),
    toolChoice: { name: 'add_numbers' },
    options: cookbookBaseAiOptions_(config, {
      maxToolRounds: 3
    })
  });
  cookbookAssertSmokeTools_(toolsResponse);

  return {
    status: 'ok',
    cookbook: cookbookName_(),
    entrypoint: 'runCookbookSmoke',
    appName: config.AI_PLAYGROUND_APP_NAME,
    provider: primaryProvider,
    capabilities: capabilities,
    durationMs: Date.now() - startedAtMs,
    text: {
      containsReady: true,
      finishReason: textResponse.finishReason,
      preview: String(textResponse.output.text || '').trim(),
      usage: textResponse.usage || null
    },
    structured: {
      checksum: structuredResponse.output.json.checksum,
      payload: structuredResponse.output.json,
      usage: structuredResponse.usage || null
    },
    tools: {
      toolName: 'add_numbers',
      toolResult: toolsResponse.output.toolResults[0].result,
      finalText: String(toolsResponse.output.text || '').trim(),
      toolCallCount: Array.isArray(toolsResponse.output.toolCalls) ? toolsResponse.output.toolCalls.length : 0,
      usage: toolsResponse.usage || null
    }
  };
}

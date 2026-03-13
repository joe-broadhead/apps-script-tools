function runCookbookDemoInternal_(ASTX, config) {
  const startedAtMs = Date.now();
  const primaryProvider = config.AI_PLAYGROUND_PRIMARY_PROVIDER;
  const rendered = ASTX.AI.renderPromptTemplate({
    template: 'Reply with exactly {{token}} on a single line.',
    variables: {
      token: 'STREAM_OK'
    }
  });
  const estimate = ASTX.AI.estimateTokens({
    provider: primaryProvider,
    input: rendered.text,
    options: {
      maxOutputTokens: config.AI_PLAYGROUND_MAX_OUTPUT_TOKENS
    }
  });

  const streamEvents = [];
  const streamResponse = ASTX.AI.stream({
    provider: primaryProvider,
    input: rendered.text,
    onEvent: function (event) {
      streamEvents.push({
        type: event.type,
        delta: event.delta || '',
        provider: event.provider || '',
        model: event.model || ''
      });
    },
    options: cookbookBaseAiOptions_(config, {
      streamChunkSize: config.AI_PLAYGROUND_STREAM_CHUNK_SIZE
    })
  });
  const streamText = String(streamResponse.output.text || '').trim();
  if (streamText.toUpperCase().indexOf('STREAM_OK') === -1) {
    throw new Error(`Stream demo did not contain STREAM_OK. Received: ${streamText}`);
  }

  const routingOutput = config.AI_PLAYGROUND_ROUTING_ENABLED
    ? cookbookRunRoutingDemo_(ASTX, config)
    : {
        status: 'skip',
        enabled: false,
        reason: 'AI_PLAYGROUND_ROUTING_ENABLED=false'
      };

  return {
    status: 'ok',
    cookbook: cookbookName_(),
    entrypoint: 'runCookbookDemo',
    appName: config.AI_PLAYGROUND_APP_NAME,
    durationMs: Date.now() - startedAtMs,
    provider: primaryProvider,
    estimate: {
      inputTokens: estimate.input ? estimate.input.tokens : null,
      outputTokens: estimate.output ? estimate.output.reservedTokens : null,
      totalTokens: estimate.totalTokens,
      exceedsBudget: estimate.budget ? estimate.budget.exceedsBudget : false
    },
    stream: {
      finalText: streamText,
      eventTypes: streamEvents.map(function (event) { return event.type; }),
      tokenEventCount: streamEvents.filter(function (event) { return event.type === 'token'; }).length,
      preview: streamEvents.slice(0, 5)
    },
    routing: routingOutput
  };
}

function cookbookRunRoutingDemo_(ASTX, config) {
  const response = ASTX.AI.text({
    input: 'Reply with exactly ROUTED_OK on a single line.',
    routing: {
      strategy: 'priority',
      maxProviderAttempts: 2,
      retryOn: {
        providerErrors: config.AI_PLAYGROUND_ROUTING_RETRY_PROVIDER_ERRORS
      },
      candidates: cookbookBuildRoutingCandidates_(config)
    },
    options: cookbookBaseAiOptions_(config)
  });
  const finalText = String(response.output && response.output.text ? response.output.text : '').trim();
  if (finalText.toUpperCase().indexOf('ROUTED_OK') === -1) {
    throw new Error(`Routing demo did not contain ROUTED_OK. Received: ${finalText}`);
  }

  return {
    status: 'ok',
    enabled: true,
    selectedProvider: response.route ? response.route.selectedProvider : response.provider,
    selectedModel: response.route ? response.route.selectedModel : response.model,
    attemptCount: response.route && Array.isArray(response.route.attempts) ? response.route.attempts.length : 1,
    attempts: response.route && Array.isArray(response.route.attempts)
      ? response.route.attempts.map(function (attempt) {
          return {
            attempt: attempt.attempt,
            provider: attempt.provider,
            model: attempt.model,
            status: attempt.status,
            retryable: attempt.error ? attempt.error.retryable : null,
            statusCode: attempt.error ? attempt.error.statusCode : null
          };
        })
      : [],
    finalText: finalText
  };
}

function runCookbookGuardrailDemoInternal_(ASTX, config) {
  try {
    ASTX.AI.tools({
      provider: config.AI_PLAYGROUND_PRIMARY_PROVIDER,
      input: 'Call the oversized_payload tool exactly once.',
      tools: [cookbookBuildGuardrailTool_(config)],
      toolChoice: { name: 'oversized_payload' },
      options: cookbookBaseAiOptions_(config, {
        maxToolRounds: 2
      })
    });

    throw new Error('Expected AstAiToolPayloadLimitError but the guardrail demo completed successfully.');
  } catch (error) {
    if (error && error.name === 'AstAiToolPayloadLimitError') {
      return {
        status: 'ok',
        cookbook: cookbookName_(),
        entrypoint: 'runCookbookGuardrailDemo',
        provider: config.AI_PLAYGROUND_PRIMARY_PROVIDER,
        expectedErrorName: error.name,
        message: error.message
      };
    }

    throw error;
  }
}

function astValidateToolDefinition(tool, index) {
  if (!tool || typeof tool !== 'object' || Array.isArray(tool)) {
    throw new AstAiValidationError('Tool definition must be an object', { index });
  }

  const name = typeof tool.name === 'string' ? tool.name.trim() : '';
  if (!name) {
    throw new AstAiValidationError('Tool definition requires a non-empty name', { index });
  }

  const inputSchema = tool.inputSchema && typeof tool.inputSchema === 'object' && !Array.isArray(tool.inputSchema)
    ? tool.inputSchema
    : { type: 'object', properties: {} };

  const description = typeof tool.description === 'string' ? tool.description : '';
  const guardrails = astNormalizeToolGuardrails(tool.guardrails, name);

  return {
    name,
    description,
    inputSchema,
    handler: tool.handler,
    guardrails
  };
}

function astResolveToolHandler(handler, toolName) {
  if (typeof handler === 'function') {
    return handler;
  }

  if (typeof handler === 'string' && handler.trim().length > 0) {
    const globalScope = typeof globalThis !== 'undefined' ? globalThis : this;
    const resolved = globalScope[handler.trim()];

    if (typeof resolved === 'function') {
      return resolved;
    }
  }

  throw new AstAiValidationError('Tool handler must be a function or global function name string', {
    toolName
  });
}

function astPrepareToolRegistry(tools) {
  const registry = {};

  tools.forEach((tool, index) => {
    const normalized = astValidateToolDefinition(tool, index);

    if (registry[normalized.name]) {
      throw new AstAiValidationError('Tool names must be unique', { toolName: normalized.name });
    }

    registry[normalized.name] = {
      name: normalized.name,
      description: normalized.description,
      inputSchema: normalized.inputSchema,
      handler: astResolveToolHandler(normalized.handler, normalized.name),
      guardrails: normalized.guardrails
    };
  });

  return registry;
}

function astToolRegistryToProviderTools(registry) {
  return Object.keys(registry).map(name => {
    const tool = registry[name];
    return {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    };
  });
}

function astNormalizeToolArguments(toolCall) {
  const rawArguments = toolCall.arguments;

  if (typeof rawArguments === 'string') {
    const parsed = astAiSafeJsonParse(rawArguments);
    if (parsed == null) {
      throw new AstAiToolExecutionError('Tool call arguments must be valid JSON when provided as a string', {
        toolName: toolCall.name,
        rawArguments
      });
    }

    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new AstAiToolExecutionError('Tool call arguments JSON must decode to an object', {
        toolName: toolCall.name,
        parsed
      });
    }

    return parsed;
  }

  if (typeof rawArguments === 'undefined' || rawArguments === null) {
    return {};
  }

  if (typeof rawArguments !== 'object' || Array.isArray(rawArguments)) {
    throw new AstAiToolExecutionError('Tool call arguments must be an object', {
      toolName: toolCall.name,
      rawArguments
    });
  }

  return rawArguments;
}

function astSerializeToolResult(toolName, result) {
  let serializedResult = '';

  try {
    serializedResult = JSON.stringify(result);
  } catch (error) {
    throw new AstAiToolExecutionError(
      `Tool handler '${toolName}' returned a non-serializable result`,
      {
        toolName
      },
      error
    );
  }

  if (typeof serializedResult === 'undefined') {
    return 'null';
  }

  return serializedResult;
}

function astSerializeToolArguments(toolName, args) {
  let serializedArguments = '';

  try {
    serializedArguments = JSON.stringify(args);
  } catch (error) {
    throw new AstAiToolExecutionError(
      `Tool handler '${toolName}' received non-serializable arguments`,
      {
        toolName
      },
      error
    );
  }

  if (typeof serializedArguments === 'undefined') {
    return 'null';
  }

  return serializedArguments;
}

function astNormalizeToolCallId(toolName, toolCall) {
  return typeof toolCall.id === 'string' && toolCall.id.trim().length > 0
    ? toolCall.id
    : `${toolName}_${new Date().getTime()}`;
}

function astExecuteToolCall(toolCall, registry, requestContext, idempotencyStore) {
  if (!toolCall || typeof toolCall !== 'object') {
    throw new AstAiToolExecutionError('Tool call must be an object', {
      toolCall
    });
  }

  const toolName = typeof toolCall.name === 'string' ? toolCall.name.trim() : '';
  if (!toolName) {
    throw new AstAiToolExecutionError('Tool call name is required', {
      toolCall
    });
  }

  const tool = registry[toolName];
  if (!tool) {
    throw new AstAiToolExecutionError('Tool call referenced an unknown tool', {
      toolName
    });
  }

  const args = astNormalizeToolArguments(toolCall);
  const callId = astNormalizeToolCallId(toolName, toolCall);
  const guardrails = tool.guardrails || astNormalizeToolGuardrails(null, toolName);

  const serializedArguments = astSerializeToolArguments(toolName, args);
  astAssertToolPayloadLimit(serializedArguments, guardrails.maxArgsBytes, {
    toolName,
    payloadType: 'arguments',
    limitField: 'maxArgsBytes'
  });

  const idempotencyKey = astResolveToolIdempotencyKey(tool, toolCall, args);
  const argsFingerprint = idempotencyKey ? astBuildToolArgsFingerprint(args) : null;
  const idempotencyHit = astGetToolIdempotencyResult(
    idempotencyStore,
    idempotencyKey,
    argsFingerprint,
    toolName
  );

  if (idempotencyHit) {
    return {
      id: callId,
      name: toolName,
      arguments: args,
      result: idempotencyHit.result,
      idempotentReplay: true
    };
  }

  const maxAttempts = guardrails.retries + 1;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const startedAt = new Date().getTime();

    try {
      const result = tool.handler(args, {
        request: requestContext,
        toolCall
      });

      if (result && typeof result.then === 'function') {
        throw new AstAiToolExecutionError(
          `Tool handler '${toolName}' returned a Promise; async handlers are not supported`,
          {
            toolName,
            arguments: args
          }
        );
      }

      const durationMs = new Date().getTime() - startedAt;
      if (durationMs > guardrails.timeoutMs) {
        throw new AstAiToolTimeoutError(
          `Tool handler '${toolName}' exceeded timeoutMs`,
          {
            toolName,
            timeoutMs: guardrails.timeoutMs,
            durationMs,
            attempt,
            maxAttempts
          }
        );
      }

      const serializedResult = astSerializeToolResult(toolName, result);
      astAssertToolPayloadLimit(serializedResult, guardrails.maxResultBytes, {
        toolName,
        payloadType: 'result',
        limitField: 'maxResultBytes'
      });

      astSetToolIdempotencyResult(idempotencyStore, idempotencyKey, argsFingerprint, result);

      return {
        id: callId,
        name: toolName,
        arguments: args,
        result
      };
    } catch (error) {
      const wrapped = error && error.name && error.name.indexOf('AstAi') === 0
        ? error
        : new AstAiToolExecutionError(
          `Tool handler '${toolName}' threw an error`,
          {
            toolName,
            arguments: args,
            attempt,
            maxAttempts
          },
          error
        );

      const canRetry = attempt < maxAttempts && astShouldRetryToolError(wrapped);
      if (!canRetry) {
        throw wrapped;
      }

      lastError = wrapped;
    }
  }

  throw lastError || new AstAiToolExecutionError(
    `Tool handler '${toolName}' failed`,
    {
      toolName,
      arguments: args
    }
  );
}

function astCloneMessages(messages) {
  return messages.map(message => {
    const cloned = {
      role: message.role,
      content: message.content
    };

    if (message.toolCalls) {
      cloned.toolCalls = message.toolCalls.map(toolCall => ({
        id: toolCall.id,
        name: toolCall.name,
        arguments: toolCall.arguments
      }));
    }

    if (message.name) {
      cloned.name = message.name;
    }

    if (message.toolCallId) {
      cloned.toolCallId = message.toolCallId;
    }

    return cloned;
  });
}

function astRunAiTools(request, config, providerExecutor) {
  const registry = astPrepareToolRegistry(request.tools || []);
  const providerTools = astToolRegistryToProviderTools(registry);
  const maxToolRounds = request.options.maxToolRounds;
  const workingMessages = astCloneMessages(request.messages || []);
  const allToolResults = [];
  const idempotencyStore = astCreateToolIdempotencyStore();

  let latestResponse = null;

  for (let round = 0; round < maxToolRounds; round++) {
    const roundToolChoice = (round > 0 && request.toolChoice && typeof request.toolChoice === 'object')
      ? 'auto'
      : request.toolChoice;

    const providerRequest = Object.assign({}, request, {
      messages: workingMessages,
      tools: providerTools,
      toolChoice: roundToolChoice
    });

    latestResponse = providerExecutor(providerRequest, config);

    const toolCalls = latestResponse && latestResponse.output && Array.isArray(latestResponse.output.toolCalls)
      ? latestResponse.output.toolCalls
      : [];

    if (toolCalls.length === 0) {
      if (latestResponse && latestResponse.output) {
        latestResponse.output.toolResults = allToolResults;
      }
      return latestResponse;
    }

    const roundToolResults = toolCalls.map(toolCall => astExecuteToolCall(
      toolCall,
      registry,
      request,
      idempotencyStore
    ));

    allToolResults.push(...roundToolResults);

    const assistantText = latestResponse.output && typeof latestResponse.output.text === 'string'
      ? latestResponse.output.text
      : '';

    workingMessages.push({
      role: 'assistant',
      content: assistantText,
      toolCalls
    });

    roundToolResults.forEach(result => {
      const serializedResult = astSerializeToolResult(result.name, result.result);

      workingMessages.push({
        role: 'tool',
        name: result.name,
        toolCallId: result.id,
        content: serializedResult
      });
    });
  }

  throw new AstAiToolLoopError('Tool execution exceeded maxToolRounds', {
    provider: request.provider,
    model: config.model,
    maxToolRounds
  });
}

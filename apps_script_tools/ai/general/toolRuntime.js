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

  return {
    name,
    description,
    inputSchema,
    handler: tool.handler
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
      handler: astResolveToolHandler(normalized.handler, normalized.name)
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

function astExecuteToolCall(toolCall, registry, requestContext) {
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

  try {
    const result = tool.handler(args, {
      request: requestContext,
      toolCall
    });

    return {
      id: typeof toolCall.id === 'string' && toolCall.id.trim().length > 0
        ? toolCall.id
        : `${toolName}_${new Date().getTime()}`,
      name: toolName,
      arguments: args,
      result
    };
  } catch (error) {
    throw new AstAiToolExecutionError(
      `Tool handler '${toolName}' threw an error`,
      {
        toolName,
        arguments: args
      },
      error
    );
  }
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

    const roundToolResults = toolCalls.map(toolCall => {
      return astExecuteToolCall(toolCall, registry, request);
    });

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
      workingMessages.push({
        role: 'tool',
        name: result.name,
        toolCallId: result.id,
        content: JSON.stringify(result.result)
      });
    });
  }

  throw new AstAiToolLoopError('Tool execution exceeded maxToolRounds', {
    provider: request.provider,
    model: config.model,
    maxToolRounds
  });
}

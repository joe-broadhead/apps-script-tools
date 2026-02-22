function astAiStreamResolveModel(request, config, response) {
  const fromResponse = response && typeof response.model === 'string' && response.model.trim().length > 0
    ? response.model.trim()
    : null;
  if (fromResponse) {
    return fromResponse;
  }

  const fromConfig = config && typeof config.model === 'string' && config.model.trim().length > 0
    ? config.model.trim()
    : null;
  if (fromConfig) {
    return fromConfig;
  }

  const fromRequest = request && typeof request.model === 'string' && request.model.trim().length > 0
    ? request.model.trim()
    : null;
  return fromRequest;
}

function astAiStreamBuildEventBase(request, config, response = null) {
  return {
    provider: request.provider,
    operation: request.operation,
    model: astAiStreamResolveModel(request, config, response)
  };
}

function astAiStreamEmit(onEvent, event) {
  if (typeof onEvent !== 'function') {
    return;
  }

  try {
    onEvent(event);
  } catch (error) {
    throw new AstAiValidationError(
      'AI stream onEvent callback threw an error',
      {
        eventType: event && event.type ? event.type : null
      },
      error
    );
  }
}

function astAiStreamChunkText(text, chunkSize) {
  const source = typeof text === 'string' ? text : '';
  if (!source) {
    return [];
  }

  const size = Number.isInteger(chunkSize) && chunkSize > 0 ? chunkSize : 24;
  const chunks = [];

  for (let idx = 0; idx < source.length; idx += size) {
    chunks.push(source.slice(idx, idx + size));
  }

  return chunks;
}

function astAiStreamEmitToolEvents(response, request, config, onEvent) {
  const base = astAiStreamBuildEventBase(request, config, response);
  const output = response && response.output && typeof response.output === 'object'
    ? response.output
    : {};
  const toolResults = Array.isArray(output.toolResults) ? output.toolResults : [];

  for (let idx = 0; idx < toolResults.length; idx += 1) {
    const toolResult = toolResults[idx] || {};

    astAiStreamEmit(onEvent, Object.assign({}, base, {
      type: 'tool_call',
      index: idx,
      toolCall: {
        id: toolResult.id || `tool_call_${idx + 1}`,
        name: toolResult.name || '',
        arguments: typeof toolResult.arguments === 'undefined' ? {} : toolResult.arguments
      }
    }));

    astAiStreamEmit(onEvent, Object.assign({}, base, {
      type: 'tool_result',
      index: idx,
      toolResult: {
        id: toolResult.id || `tool_call_${idx + 1}`,
        name: toolResult.name || '',
        result: typeof toolResult.result === 'undefined' ? null : toolResult.result
      }
    }));
  }
}

function astAiStreamEmitTokenEvents(response, request, config, onEvent) {
  const base = astAiStreamBuildEventBase(request, config, response);
  const text = response && response.output && typeof response.output.text === 'string'
    ? response.output.text
    : '';
  const chunks = astAiStreamChunkText(text, request.options.streamChunkSize);
  let accumulated = '';

  for (let idx = 0; idx < chunks.length; idx += 1) {
    const delta = chunks[idx];
    accumulated += delta;
    astAiStreamEmit(onEvent, Object.assign({}, base, {
      type: 'token',
      index: idx,
      delta,
      text: accumulated
    }));
  }
}

function astRunAiStream(request, config, providerExecutor) {
  const onEvent = request.onEvent;
  const base = astAiStreamBuildEventBase(request, config, null);

  astAiStreamEmit(onEvent, Object.assign({}, base, { type: 'start' }));

  let response = null;
  try {
    response = request.operation === 'tools'
      ? astRunAiTools(request, config, providerExecutor)
      : providerExecutor(request, config);

    if (request.operation === 'tools') {
      astAiStreamEmitToolEvents(response, request, config, onEvent);
    }

    astAiStreamEmitTokenEvents(response, request, config, onEvent);

    astAiStreamEmit(onEvent, Object.assign({}, astAiStreamBuildEventBase(request, config, response), {
      type: 'done',
      response
    }));

    return response;
  } catch (error) {
    astAiStreamEmit(onEvent, Object.assign({}, base, {
      type: 'error',
      error: {
        name: error && error.name ? error.name : 'Error',
        message: error && error.message ? error.message : String(error)
      }
    }));
    throw error;
  }
}

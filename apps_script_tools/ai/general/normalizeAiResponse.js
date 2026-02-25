function astNormalizeNumber(value) {
  if (typeof value === 'number' && isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0 && !isNaN(Number(value))) {
    return Number(value);
  }

  return 0;
}

function astNormalizeUsage(usage = {}) {
  return {
    inputTokens: astNormalizeNumber(usage.inputTokens || usage.prompt_tokens || usage.promptTokenCount || usage.prompt_tokens_count),
    outputTokens: astNormalizeNumber(usage.outputTokens || usage.completion_tokens || usage.candidatesTokenCount || usage.completion_tokens_count),
    totalTokens: astNormalizeNumber(usage.totalTokens || usage.total_tokens || usage.totalTokenCount || usage.total_tokens_count)
  };
}

function astNormalizeToolCalls(toolCalls) {
  if (!Array.isArray(toolCalls)) {
    return [];
  }

  return toolCalls.map((toolCall, index) => {
    const normalized = toolCall && typeof toolCall === 'object' ? toolCall : {};

    return {
      id: typeof normalized.id === 'string' && normalized.id.trim().length > 0
        ? normalized.id
        : `tool_call_${index + 1}`,
      name: typeof normalized.name === 'string' ? normalized.name : '',
      arguments: typeof normalized.arguments === 'undefined'
        ? {}
        : normalized.arguments
    };
  });
}

function astNormalizeImages(images) {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map(image => {
      if (!image || typeof image !== 'object') {
        return null;
      }

      const base64 = typeof image.base64 === 'string' ? image.base64 : null;

      if (!base64) {
        return null;
      }

      return {
        base64,
        mimeType: typeof image.mimeType === 'string' && image.mimeType.trim().length > 0
          ? image.mimeType
          : 'image/png',
        width: typeof image.width === 'number' ? image.width : null,
        height: typeof image.height === 'number' ? image.height : null
      };
    })
    .filter(Boolean);
}

function astNormalizeAiResponse(payload = {}) {
  const output = payload.output || {};
  const includeRaw = payload.includeRaw === true;

  const normalized = {
    provider: payload.provider || '',
    operation: payload.operation || 'text',
    model: payload.model || '',
    id: payload.id || '',
    createdAt: payload.createdAt || new Date().toISOString(),
    finishReason: payload.finishReason || null,
    output: {
      text: typeof output.text === 'string' ? output.text : '',
      json: typeof output.json === 'undefined' ? null : output.json,
      images: astNormalizeImages(output.images),
      toolCalls: astNormalizeToolCalls(output.toolCalls),
      toolResults: Array.isArray(output.toolResults) ? output.toolResults : []
    },
    usage: astNormalizeUsage(payload.usage || {})
  };

  if (includeRaw) {
    normalized.raw = typeof payload.raw === 'undefined' ? null : payload.raw;
  }

  return normalized;
}

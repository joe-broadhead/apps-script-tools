const AST_AI_CAPABILITY_MATRIX = Object.freeze({
  openai: Object.freeze({
    text: true,
    structured: true,
    tools: true,
    imageGeneration: true,
    imageUnderstanding: true
  }),
  gemini: Object.freeze({
    text: true,
    structured: true,
    tools: true,
    imageGeneration: true,
    imageUnderstanding: true
  }),
  vertex_gemini: Object.freeze({
    text: true,
    structured: true,
    tools: true,
    imageGeneration: false,
    imageUnderstanding: true
  }),
  openrouter: Object.freeze({
    text: true,
    structured: true,
    tools: true,
    imageGeneration: true,
    imageUnderstanding: true
  }),
  perplexity: Object.freeze({
    text: true,
    structured: true,
    tools: true,
    imageGeneration: true,
    imageUnderstanding: true
  })
});

function astCloneCapabilities(capability) {
  return {
    text: Boolean(capability.text),
    structured: Boolean(capability.structured),
    tools: Boolean(capability.tools),
    imageGeneration: Boolean(capability.imageGeneration),
    imageUnderstanding: Boolean(capability.imageUnderstanding)
  };
}

function astGetAiCapabilities(provider) {
  if (typeof provider === 'undefined' || provider === null || provider === '') {
    const output = {};
    Object.keys(AST_AI_CAPABILITY_MATRIX).forEach(key => {
      output[key] = astCloneCapabilities(AST_AI_CAPABILITY_MATRIX[key]);
    });
    return output;
  }

  const key = String(provider).trim();
  const capabilities = AST_AI_CAPABILITY_MATRIX[key];

  if (!capabilities) {
    throw new AstAiValidationError('Unknown AI provider', { provider: key });
  }

  return astCloneCapabilities(capabilities);
}

function astOperationToCapabilityKey(operation) {
  switch (operation) {
    case 'text':
      return 'text';
    case 'structured':
      return 'structured';
    case 'tools':
      return 'tools';
    case 'image':
      return 'imageGeneration';
    default:
      return null;
  }
}

function astMessageContainsImage(content) {
  if (!Array.isArray(content)) {
    return false;
  }

  return content.some(part => {
    if (!part || typeof part !== 'object') {
      return false;
    }

    const type = String(part.type || '').toLowerCase();

    return type === 'image' ||
      type === 'input_image' ||
      type === 'image_url' ||
      type === 'inline_data' ||
      type === 'file_data' ||
      Boolean(part.image_url) ||
      Boolean(part.inlineData) ||
      Boolean(part.fileData);
  });
}

function astRequestIncludesImageInput(request) {
  if (!request || !Array.isArray(request.messages)) {
    return false;
  }

  for (let idx = 0; idx < request.messages.length; idx++) {
    const message = request.messages[idx];
    if (message && astMessageContainsImage(message.content)) {
      return true;
    }
  }

  return false;
}

function astAssertAiCapability(provider, operation) {
  const capabilities = astGetAiCapabilities(provider);
  const capabilityKey = astOperationToCapabilityKey(operation);

  if (!capabilityKey) {
    throw new AstAiValidationError('Unknown AI operation', {
      provider,
      operation
    });
  }

  if (!capabilities[capabilityKey]) {
    throw new AstAiCapabilityError(
      `Provider '${provider}' does not support '${operation}'`,
      {
        provider,
        operation,
        capabilityKey
      }
    );
  }
}

function astAssertAiInputCapabilities(request) {
  const includesImages = astRequestIncludesImageInput(request);

  if (!includesImages) {
    return;
  }

  const capabilities = astGetAiCapabilities(request.provider);

  if (!capabilities.imageUnderstanding) {
    throw new AstAiCapabilityError(
      `Provider '${request.provider}' does not support image understanding`,
      {
        provider: request.provider,
        operation: request.operation
      }
    );
  }
}

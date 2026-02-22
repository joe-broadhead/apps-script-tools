const AST_AI_PROVIDERS = Object.freeze([
  'openai',
  'gemini',
  'vertex_gemini',
  'openrouter',
  'perplexity'
]);

const AST_AI_OPERATIONS = Object.freeze([
  'text',
  'structured',
  'tools',
  'image'
]);

function astIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astClonePlainObject(value) {
  return Object.assign({}, value || {});
}

function astNormalizeRole(role) {
  const normalized = String(role || '').trim().toLowerCase();
  if (!normalized) {
    throw new AstAiValidationError('Message role is required');
  }

  const allowed = ['system', 'user', 'assistant', 'tool'];
  if (!allowed.includes(normalized)) {
    throw new AstAiValidationError('Message role is not supported', { role: normalized });
  }

  return normalized;
}

function astNormalizeMessages(input, system) {
  const messages = [];

  if (typeof input === 'string') {
    if (!input.trim()) {
      throw new AstAiValidationError('AI input string must be non-empty');
    }

    messages.push({ role: 'user', content: input });
  } else if (Array.isArray(input)) {
    if (input.length === 0) {
      throw new AstAiValidationError('AI input messages array must be non-empty');
    }

    input.forEach((message, index) => {
      if (!astIsPlainObject(message)) {
        throw new AstAiValidationError('Each message must be an object', { index });
      }

      const role = astNormalizeRole(message.role);
      const output = {
        role,
        content: message.content
      };

      if (role === 'assistant' && Array.isArray(message.toolCalls)) {
        output.toolCalls = message.toolCalls.map(toolCall => astClonePlainObject(toolCall));
      }

      if (role === 'tool') {
        if (typeof message.name === 'string' && message.name.trim().length > 0) {
          output.name = message.name.trim();
        }

        if (typeof message.toolCallId === 'string' && message.toolCallId.trim().length > 0) {
          output.toolCallId = message.toolCallId.trim();
        }
      }

      messages.push(output);
    });
  } else {
    throw new AstAiValidationError('AI input must be a prompt string or messages array');
  }

  if (typeof system === 'string' && system.trim().length > 0) {
    const hasSystem = messages.some(message => message.role === 'system');

    if (!hasSystem) {
      messages.unshift({ role: 'system', content: system.trim() });
    }
  }

  return messages;
}

function astNormalizeToolChoice(toolChoice) {
  if (typeof toolChoice === 'undefined') {
    return 'auto';
  }

  if (toolChoice === 'auto' || toolChoice === 'none') {
    return toolChoice;
  }

  if (astIsPlainObject(toolChoice) && typeof toolChoice.name === 'string' && toolChoice.name.trim().length > 0) {
    return { name: toolChoice.name.trim() };
  }

  throw new AstAiValidationError('toolChoice must be auto, none, or an object with a name field');
}

function astNormalizeAiOptions(options = {}) {
  if (!astIsPlainObject(options)) {
    throw new AstAiValidationError('AI request options must be an object');
  }

  const timeoutMs = typeof options.timeoutMs === 'number' && isFinite(options.timeoutMs)
    ? Math.max(1, Math.floor(options.timeoutMs))
    : 45000;

  const retries = Number.isInteger(options.retries)
    ? Math.max(0, Math.min(5, options.retries))
    : 2;

  const maxToolRounds = Number.isInteger(options.maxToolRounds)
    ? Math.max(1, Math.min(10, options.maxToolRounds))
    : 3;

  const stream = Boolean(options.stream);

  let streamChunkSize = 24;
  if (typeof options.streamChunkSize !== 'undefined' && options.streamChunkSize !== null) {
    if (!Number.isInteger(options.streamChunkSize) || options.streamChunkSize < 1) {
      throw new AstAiValidationError('options.streamChunkSize must be a positive integer when provided');
    }

    streamChunkSize = Math.min(1024, options.streamChunkSize);
  }

  let temperature = null;
  if (typeof options.temperature !== 'undefined' && options.temperature !== null) {
    if (typeof options.temperature !== 'number' || !isFinite(options.temperature)) {
      throw new AstAiValidationError('options.temperature must be a finite number when provided');
    }

    temperature = options.temperature;
  }

  let maxOutputTokens = null;
  if (typeof options.maxOutputTokens !== 'undefined' && options.maxOutputTokens !== null) {
    if (!Number.isInteger(options.maxOutputTokens) || options.maxOutputTokens < 1) {
      throw new AstAiValidationError('options.maxOutputTokens must be a positive integer when provided');
    }

    maxOutputTokens = options.maxOutputTokens;
  }

  return {
    temperature,
    maxOutputTokens,
    timeoutMs,
    retries,
    includeRaw: Boolean(options.includeRaw),
    maxToolRounds,
    stream,
    streamChunkSize
  };
}

function validateAiRequest(request = {}, forcedOperation) {
  if (!astIsPlainObject(request)) {
    throw new AstAiValidationError('AI request must be an object');
  }

  const requestedProvider = String(request.provider || '').trim();

  const operation = forcedOperation || request.operation || 'text';
  if (!AST_AI_OPERATIONS.includes(operation)) {
    throw new AstAiValidationError('Operation must be one of: text, structured, tools, image');
  }

  const model = typeof request.model === 'string' && request.model.trim().length > 0
    ? request.model.trim()
    : null;

  const auth = typeof request.auth === 'undefined' ? {} : request.auth;
  if (!astIsPlainObject(auth)) {
    throw new AstAiValidationError('auth must be an object when provided');
  }

  const providerOptions = typeof request.providerOptions === 'undefined' ? {} : request.providerOptions;
  if (!astIsPlainObject(providerOptions)) {
    throw new AstAiValidationError('providerOptions must be an object when provided');
  }

  const options = astNormalizeAiOptions(request.options || {});
  const routing = astAiNormalizeRoutingConfig(request.routing, requestedProvider || null, model);
  const provider = requestedProvider
    || (routing && routing.candidates && routing.candidates[0] ? routing.candidates[0].provider : '');

  if (!AST_AI_PROVIDERS.includes(provider)) {
    throw new AstAiValidationError('Provider must be one of: openai, gemini, vertex_gemini, openrouter, perplexity');
  }

  const messages = astNormalizeMessages(request.input, request.system);

  let schema = null;
  if (operation === 'structured') {
    if (!astIsPlainObject(request.schema)) {
      throw new AstAiValidationError('structured operation requires schema as an object');
    }

    schema = astClonePlainObject(request.schema);
  }

  let tools = [];
  if (operation === 'tools') {
    if (!Array.isArray(request.tools) || request.tools.length === 0) {
      throw new AstAiValidationError('tools operation requires a non-empty tools array');
    }

    tools = request.tools.map(tool => astClonePlainObject(tool));
  }

  const toolChoice = operation === 'tools'
    ? astNormalizeToolChoice(request.toolChoice)
    : 'none';

  const onEvent = typeof request.onEvent === 'function' ? request.onEvent : null;
  const candidateStreamEnabled = Boolean(
    routing
    && Array.isArray(routing.candidates)
    && routing.candidates.some(candidate => candidate.options && candidate.options.stream === true)
  );
  const streamEnabled = Boolean(options.stream || candidateStreamEnabled);

  if (streamEnabled && routing && routing.candidates.length > 1) {
    throw new AstAiValidationError('Streaming is only supported with a single routing candidate');
  }

  if (streamEnabled && !onEvent) {
    throw new AstAiValidationError('options.stream=true requires onEvent callback function');
  }

  return {
    provider,
    operation,
    model,
    input: request.input,
    messages,
    system: typeof request.system === 'string' ? request.system : null,
    schema,
    tools,
    toolChoice,
    onEvent,
    auth: astClonePlainObject(auth),
    providerOptions: astClonePlainObject(providerOptions),
    options,
    routing
  };
}

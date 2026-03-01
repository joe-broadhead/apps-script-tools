const AST_AI_PROMPT_TEMPLATE_TOKEN_REGEX = /\{\{\s*([A-Za-z_][A-Za-z0-9_.-]*)\s*\}\}/g;

const AST_AI_TOKEN_HEURISTICS = Object.freeze({
  openai: Object.freeze({
    charsPerToken: 4.0,
    messageOverhead: 4,
    toolCharsPerToken: 3.6,
    schemaCharsPerToken: 3.8
  }),
  openrouter: Object.freeze({
    charsPerToken: 4.0,
    messageOverhead: 4,
    toolCharsPerToken: 3.6,
    schemaCharsPerToken: 3.8
  }),
  gemini: Object.freeze({
    charsPerToken: 4.2,
    messageOverhead: 3,
    toolCharsPerToken: 3.8,
    schemaCharsPerToken: 4.0
  }),
  vertex_gemini: Object.freeze({
    charsPerToken: 4.2,
    messageOverhead: 3,
    toolCharsPerToken: 3.8,
    schemaCharsPerToken: 4.0
  }),
  perplexity: Object.freeze({
    charsPerToken: 4.1,
    messageOverhead: 4,
    toolCharsPerToken: 3.7,
    schemaCharsPerToken: 3.9
  })
});

const AST_AI_TRUNCATION_STRATEGIES = Object.freeze([
  'tail',
  'head',
  'semantic_blocks'
]);

function astAiPromptIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astAiPromptNormalizeString(value, fallback = '') {
  return typeof value === 'string'
    ? value
    : fallback;
}

function astAiPromptNormalizeProvider(request = {}) {
  const routing = astAiPromptIsPlainObject(request.routing)
    ? request.routing
    : {};
  const routingCandidates = Array.isArray(routing.candidates)
    ? routing.candidates
    : [];

  const firstRoutingProvider = routingCandidates.length > 0 && astAiPromptIsPlainObject(routingCandidates[0])
    ? astAiPromptNormalizeString(routingCandidates[0].provider, '')
    : '';
  const providerRaw = astAiPromptNormalizeString(request.provider, firstRoutingProvider || 'openai')
    .trim()
    .toLowerCase();

  if (!Object.prototype.hasOwnProperty.call(AST_AI_TOKEN_HEURISTICS, providerRaw)) {
    throw new AstAiValidationError(
      'estimate/truncate provider must be one of: openai, gemini, vertex_gemini, openrouter, perplexity',
      { provider: providerRaw }
    );
  }

  return providerRaw;
}

function astAiPromptNormalizeModel(request = {}) {
  const modelValue = astAiPromptNormalizeString(request.model, '').trim();
  if (modelValue) {
    return modelValue;
  }

  const routing = astAiPromptIsPlainObject(request.routing)
    ? request.routing
    : {};
  const candidates = Array.isArray(routing.candidates)
    ? routing.candidates
    : [];
  if (candidates.length === 0 || !astAiPromptIsPlainObject(candidates[0])) {
    return null;
  }

  const routedModel = astAiPromptNormalizeString(candidates[0].model, '').trim();
  return routedModel || null;
}

function astAiPromptValueToString(value) {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value == null) {
    return '';
  }
  try {
    return JSON.stringify(value);
  } catch (_error) {
    return String(value);
  }
}

function astAiPromptEstimateChars(value) {
  return astAiPromptValueToString(value).length;
}

function astAiPromptEstimateTokensFromChars(chars, charsPerToken) {
  if (!Number.isFinite(charsPerToken) || charsPerToken <= 0) {
    return 0;
  }
  if (!Number.isFinite(chars) || chars <= 0) {
    return 0;
  }
  return Math.ceil(chars / charsPerToken);
}

function astAiPromptNormalizeRole(role) {
  const normalized = astAiPromptNormalizeString(role, '').trim().toLowerCase();
  if (!normalized) {
    throw new AstAiValidationError('Message role is required');
  }
  if (!['system', 'user', 'assistant', 'tool'].includes(normalized)) {
    throw new AstAiValidationError('Message role is not supported', { role: normalized });
  }
  return normalized;
}

function astAiPromptNormalizeMessage(message, index) {
  if (!astAiPromptIsPlainObject(message)) {
    throw new AstAiValidationError('Each message must be an object', { index });
  }

  const role = astAiPromptNormalizeRole(message.role);
  const normalized = {
    role,
    content: Object.prototype.hasOwnProperty.call(message, 'content') ? message.content : ''
  };

  if (role === 'assistant' && Array.isArray(message.toolCalls)) {
    normalized.toolCalls = message.toolCalls.slice();
  }

  if (role === 'tool') {
    if (typeof message.name === 'string' && message.name.trim().length > 0) {
      normalized.name = message.name.trim();
    }
    if (typeof message.toolCallId === 'string' && message.toolCallId.trim().length > 0) {
      normalized.toolCallId = message.toolCallId.trim();
    }
  }

  return normalized;
}

function astAiPromptNormalizeMessagesRequest(request = {}) {
  if (!astAiPromptIsPlainObject(request)) {
    throw new AstAiValidationError('AI prompt utility request must be an object');
  }

  const messages = [];
  if (Array.isArray(request.messages)) {
    if (request.messages.length === 0) {
      throw new AstAiValidationError('messages array must be non-empty');
    }
    request.messages.forEach((message, index) => {
      messages.push(astAiPromptNormalizeMessage(message, index));
    });
  } else if (typeof request.input === 'string') {
    if (!request.input.trim()) {
      throw new AstAiValidationError('input string must be non-empty');
    }
    messages.push({
      role: 'user',
      content: request.input
    });
  } else if (Array.isArray(request.input)) {
    if (request.input.length === 0) {
      throw new AstAiValidationError('input messages array must be non-empty');
    }
    request.input.forEach((message, index) => {
      messages.push(astAiPromptNormalizeMessage(message, index));
    });
  } else {
    throw new AstAiValidationError('Request requires either messages[] or input');
  }

  const system = astAiPromptNormalizeString(request.system, '').trim();
  if (system) {
    const hasSystem = messages.some(message => message.role === 'system');
    if (!hasSystem) {
      messages.unshift({
        role: 'system',
        content: system
      });
    }
  }

  return messages;
}

function astAiPromptEstimateMessageTokens(messages, heuristic) {
  const rows = [];
  let totalTokens = 0;
  let totalChars = 0;
  let systemTokens = 0;

  messages.forEach((message, index) => {
    const contentChars = astAiPromptEstimateChars(message.content);
    const contentTokens = astAiPromptEstimateTokensFromChars(contentChars, heuristic.charsPerToken);
    const nameChars = astAiPromptEstimateChars(message.name || '');
    const nameTokens = astAiPromptEstimateTokensFromChars(nameChars, heuristic.charsPerToken);
    const toolCallChars = Array.isArray(message.toolCalls) ? astAiPromptEstimateChars(message.toolCalls) : 0;
    const toolCallTokens = astAiPromptEstimateTokensFromChars(toolCallChars, heuristic.charsPerToken);

    const roleOverhead = heuristic.messageOverhead;
    const tokens = roleOverhead + contentTokens + nameTokens + toolCallTokens;
    const chars = contentChars + nameChars + toolCallChars;

    rows.push({
      index,
      role: message.role,
      chars,
      tokens
    });

    totalChars += chars;
    totalTokens += tokens;
    if (message.role === 'system') {
      systemTokens += tokens;
    }
  });

  return {
    rows,
    totalTokens,
    totalChars,
    systemTokens
  };
}

function astAiPromptEstimateToolsTokens(tools, heuristic) {
  if (!Array.isArray(tools) || tools.length === 0) {
    return 0;
  }
  let chars = 0;
  tools.forEach(tool => {
    chars += astAiPromptEstimateChars(tool);
  });
  return astAiPromptEstimateTokensFromChars(chars, heuristic.toolCharsPerToken);
}

function astAiPromptEstimateSchemaTokens(schema, heuristic) {
  if (!astAiPromptIsPlainObject(schema)) {
    return 0;
  }
  const chars = astAiPromptEstimateChars(schema);
  return astAiPromptEstimateTokensFromChars(chars, heuristic.schemaCharsPerToken);
}

function astAiPromptNormalizePositiveInt(value, fallback = null) {
  if (typeof value === 'undefined' || value === null || value === '') {
    return fallback;
  }
  const asNumber = Number(value);
  if (!Number.isFinite(asNumber) || asNumber < 1) {
    throw new AstAiValidationError('Expected a positive integer value', { value });
  }
  return Math.floor(asNumber);
}

function astAiEstimateTokens(request = {}) {
  if (!astAiPromptIsPlainObject(request)) {
    throw new AstAiValidationError('estimateTokens request must be an object');
  }

  const provider = astAiPromptNormalizeProvider(request);
  const model = astAiPromptNormalizeModel(request);
  const heuristic = AST_AI_TOKEN_HEURISTICS[provider];
  const messages = astAiPromptNormalizeMessagesRequest(request);
  const messageEstimate = astAiPromptEstimateMessageTokens(messages, heuristic);

  const toolsTokens = astAiPromptEstimateToolsTokens(request.tools, heuristic);
  const schemaTokens = astAiPromptEstimateSchemaTokens(request.schema, heuristic);
  const options = astAiPromptIsPlainObject(request.options)
    ? request.options
    : {};
  const reservedOutputTokens = astAiPromptNormalizePositiveInt(
    typeof request.maxOutputTokens !== 'undefined' ? request.maxOutputTokens : options.maxOutputTokens,
    0
  );
  const maxTotalTokens = astAiPromptNormalizePositiveInt(
    typeof request.maxTotalTokens !== 'undefined' ? request.maxTotalTokens : options.maxTotalTokens,
    null
  );

  const inputTokens = messageEstimate.totalTokens + toolsTokens + schemaTokens;
  const totalTokens = inputTokens + reservedOutputTokens;
  const exceedsBudget = maxTotalTokens != null
    ? totalTokens > maxTotalTokens
    : false;
  const remainingTokens = maxTotalTokens != null
    ? Math.max(0, maxTotalTokens - totalTokens)
    : null;

  return {
    status: 'ok',
    provider,
    model,
    approximation: {
      method: 'heuristic_char_length',
      charsPerToken: heuristic.charsPerToken,
      messageOverhead: heuristic.messageOverhead,
      limitations: [
        'Estimated counts only; provider tokenizer behavior may differ.',
        'Tool/schema payloads are approximated using JSON string length.'
      ]
    },
    input: {
      messageCount: messages.length,
      charCount: messageEstimate.totalChars,
      tokens: inputTokens,
      systemTokens: messageEstimate.systemTokens,
      toolsTokens,
      schemaTokens,
      messageBreakdown: messageEstimate.rows
    },
    output: {
      reservedTokens: reservedOutputTokens
    },
    totalTokens,
    budget: {
      maxTotalTokens,
      exceedsBudget,
      remainingTokens
    },
    warnings: []
  };
}

function astAiPromptNormalizeTruncationStrategy(request = {}) {
  const options = astAiPromptIsPlainObject(request.options)
    ? request.options
    : {};
  const inputStrategy = typeof request.strategy !== 'undefined'
    ? request.strategy
    : options.strategy;
  const normalized = astAiPromptNormalizeString(inputStrategy, 'tail').trim().toLowerCase();
  if (normalized === 'semantic') {
    return 'semantic_blocks';
  }
  if (!AST_AI_TRUNCATION_STRATEGIES.includes(normalized)) {
    throw new AstAiValidationError('truncateMessages strategy must be one of: tail, head, semantic_blocks', {
      strategy: normalized
    });
  }
  return normalized;
}

function astAiPromptKeepHeadIndexes(indexes, rows, budget, startTokens) {
  let used = startTokens;
  const kept = [];
  for (let index = 0; index < indexes.length; index += 1) {
    const candidate = indexes[index];
    const row = rows[candidate];
    if (used + row.tokens > budget) {
      break;
    }
    kept.push(candidate);
    used += row.tokens;
  }
  return {
    indexes: kept,
    usedTokens: used
  };
}

function astAiPromptKeepTailIndexes(indexes, rows, budget, startTokens) {
  let used = startTokens;
  const kept = [];
  for (let cursor = indexes.length - 1; cursor >= 0; cursor -= 1) {
    const candidate = indexes[cursor];
    const row = rows[candidate];
    if (used + row.tokens > budget) {
      break;
    }
    kept.push(candidate);
    used += row.tokens;
  }
  kept.sort((left, right) => left - right);
  return {
    indexes: kept,
    usedTokens: used
  };
}

function astAiPromptGroupSemanticBlocks(nonSystemIndexes, rows) {
  const blocks = [];
  let current = [];

  for (let i = 0; i < nonSystemIndexes.length; i += 1) {
    const messageIndex = nonSystemIndexes[i];
    const row = rows[messageIndex];
    if (row.role === 'user' && current.length > 0) {
      blocks.push(current);
      current = [messageIndex];
    } else {
      current.push(messageIndex);
    }
  }

  if (current.length > 0) {
    blocks.push(current);
  }

  return blocks;
}

function astAiPromptKeepSemanticBlocks(nonSystemIndexes, rows, budget, startTokens) {
  const blocks = astAiPromptGroupSemanticBlocks(nonSystemIndexes, rows);
  let used = startTokens;
  const keptBlocks = [];

  for (let cursor = blocks.length - 1; cursor >= 0; cursor -= 1) {
    const block = blocks[cursor];
    let blockTokens = 0;
    for (let i = 0; i < block.length; i += 1) {
      blockTokens += rows[block[i]].tokens;
    }

    if (used + blockTokens > budget) {
      break;
    }

    keptBlocks.push(block);
    used += blockTokens;
  }

  const keptIndexes = [];
  keptBlocks.reverse().forEach(block => {
    block.forEach(index => keptIndexes.push(index));
  });

  return {
    indexes: keptIndexes,
    usedTokens: used
  };
}

function astAiTruncateMessages(request = {}) {
  if (!astAiPromptIsPlainObject(request)) {
    throw new AstAiValidationError('truncateMessages request must be an object');
  }

  const provider = astAiPromptNormalizeProvider(request);
  const model = astAiPromptNormalizeModel(request);
  const heuristic = AST_AI_TOKEN_HEURISTICS[provider];
  const strategy = astAiPromptNormalizeTruncationStrategy(request);
  const options = astAiPromptIsPlainObject(request.options)
    ? request.options
    : {};
  const maxInputTokens = astAiPromptNormalizePositiveInt(
    typeof request.maxInputTokens !== 'undefined' ? request.maxInputTokens : options.maxInputTokens,
    null
  );
  if (maxInputTokens == null) {
    throw new AstAiValidationError('truncateMessages requires maxInputTokens');
  }

  const preserveSystem = typeof request.preserveSystem === 'undefined'
    ? true
    : Boolean(request.preserveSystem);

  const messages = astAiPromptNormalizeMessagesRequest(request);
  const estimate = astAiPromptEstimateMessageTokens(messages, heuristic);
  const beforeTokens = estimate.totalTokens;

  if (beforeTokens <= maxInputTokens) {
    return {
      status: 'ok',
      provider,
      model,
      strategy,
      maxInputTokens,
      truncated: false,
      before: {
        messageCount: messages.length,
        inputTokens: beforeTokens
      },
      after: {
        messageCount: messages.length,
        inputTokens: beforeTokens
      },
      dropped: {
        count: 0,
        indexes: [],
        roles: []
      },
      messages: messages.slice(),
      approximation: {
        method: 'heuristic_char_length',
        charsPerToken: heuristic.charsPerToken
      },
      warnings: []
    };
  }

  const rows = estimate.rows;
  const systemIndexes = [];
  const nonSystemIndexes = [];
  rows.forEach((row, index) => {
    if (row.role === 'system') {
      systemIndexes.push(index);
    } else {
      nonSystemIndexes.push(index);
    }
  });

  let selectedSystemIndexes = [];
  let usedTokens = 0;
  if (preserveSystem && systemIndexes.length > 0) {
    const selected = strategy === 'tail'
      ? astAiPromptKeepTailIndexes(systemIndexes, rows, maxInputTokens, 0)
      : astAiPromptKeepHeadIndexes(systemIndexes, rows, maxInputTokens, 0);
    selectedSystemIndexes = selected.indexes;
    usedTokens = selected.usedTokens;
  }

  let selectedNonSystem = [];
  if (strategy === 'head') {
    selectedNonSystem = astAiPromptKeepHeadIndexes(nonSystemIndexes, rows, maxInputTokens, usedTokens);
  } else if (strategy === 'tail') {
    selectedNonSystem = astAiPromptKeepTailIndexes(nonSystemIndexes, rows, maxInputTokens, usedTokens);
  } else {
    selectedNonSystem = astAiPromptKeepSemanticBlocks(nonSystemIndexes, rows, maxInputTokens, usedTokens);
  }

  const selectedIndexes = selectedSystemIndexes
    .concat(selectedNonSystem.indexes)
    .sort((left, right) => left - right);
  const selectedSet = new Set(selectedIndexes);
  const nextMessages = selectedIndexes.map(index => messages[index]);
  const afterEstimate = astAiPromptEstimateMessageTokens(nextMessages, heuristic);
  const droppedIndexes = [];
  const droppedRoles = [];
  rows.forEach(row => {
    if (!selectedSet.has(row.index)) {
      droppedIndexes.push(row.index);
      droppedRoles.push(row.role);
    }
  });

  const warnings = [];
  if (preserveSystem && selectedSystemIndexes.length < systemIndexes.length) {
    warnings.push('Some system messages were dropped to satisfy maxInputTokens');
  }
  if (selectedIndexes.length === 0 && messages.length > 0) {
    warnings.push('No messages fit within maxInputTokens');
  }

  return {
    status: 'ok',
    provider,
    model,
    strategy,
    maxInputTokens,
    truncated: true,
    before: {
      messageCount: messages.length,
      inputTokens: beforeTokens
    },
    after: {
      messageCount: nextMessages.length,
      inputTokens: afterEstimate.totalTokens
    },
    dropped: {
      count: droppedIndexes.length,
      indexes: droppedIndexes,
      roles: droppedRoles
    },
    messages: nextMessages,
    approximation: {
      method: 'heuristic_char_length',
      charsPerToken: heuristic.charsPerToken
    },
    warnings
  };
}

function astAiPromptIsBlockedTemplatePathSegment(segment) {
  return segment === '__proto__'
    || segment === 'prototype'
    || segment === 'constructor';
}

function astAiPromptResolveTemplatePath(params, tokenPath) {
  const segments = tokenPath.split('.');
  let cursor = params;
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    if (!segment || astAiPromptIsBlockedTemplatePathSegment(segment)) {
      return {
        hasValue: false
      };
    }
    if (!astAiPromptIsPlainObject(cursor) || !Object.prototype.hasOwnProperty.call(cursor, segment)) {
      return {
        hasValue: false
      };
    }
    cursor = cursor[segment];
  }

  return {
    hasValue: true,
    value: cursor
  };
}

function astAiPromptCollectTemplatePaths(value) {
  if (!astAiPromptIsPlainObject(value)) {
    return [];
  }

  return Object.keys(value).filter(key => !astAiPromptIsBlockedTemplatePathSegment(key));
}

function astAiPromptNormalizeTemplateOptions(options = {}) {
  if (typeof options === 'undefined' || options === null) {
    return {
      strict: true,
      failOnUnused: false,
      missingBehavior: 'error'
    };
  }

  if (!astAiPromptIsPlainObject(options)) {
    throw new AstAiValidationError('renderPromptTemplate options must be an object');
  }

  const strict = typeof options.strict === 'undefined'
    ? true
    : Boolean(options.strict);
  const failOnUnused = Boolean(options.failOnUnused);
  const missingBehaviorRaw = astAiPromptNormalizeString(options.missingBehavior, strict ? 'error' : 'empty')
    .trim()
    .toLowerCase();
  if (!['error', 'empty', 'keep'].includes(missingBehaviorRaw)) {
    throw new AstAiValidationError('renderPromptTemplate missingBehavior must be one of: error, empty, keep');
  }

  return {
    strict,
    failOnUnused,
    missingBehavior: missingBehaviorRaw
  };
}

function astAiRenderPromptTemplate(request = {}) {
  if (!astAiPromptIsPlainObject(request)) {
    throw new AstAiValidationError('renderPromptTemplate request must be an object');
  }

  const template = astAiPromptNormalizeString(request.template, '');
  if (!template) {
    throw new AstAiValidationError('renderPromptTemplate requires a non-empty template string');
  }

  const variables = astAiPromptIsPlainObject(request.variables)
    ? request.variables
    : {};
  const options = astAiPromptNormalizeTemplateOptions(request.options || {});

  const missing = new Set();
  const used = new Set();
  const rendered = template.replace(AST_AI_PROMPT_TEMPLATE_TOKEN_REGEX, (match, tokenPath) => {
    const resolution = astAiPromptResolveTemplatePath(variables, tokenPath);
    if (!resolution.hasValue) {
      missing.add(tokenPath);
      if (options.missingBehavior === 'keep') {
        return match;
      }
      return '';
    }

    used.add(tokenPath);
    return astAiPromptValueToString(resolution.value);
  });

  const missingVariables = Array.from(missing.values()).sort();
  if ((options.strict || options.missingBehavior === 'error') && missingVariables.length > 0) {
    throw new AstAiValidationError('Template references missing variables', {
      missingVariables
    });
  }

  const knownVariablePaths = astAiPromptCollectTemplatePaths(variables);
  const usedTopLevel = new Set(Array.from(used.values()).map(path => path.split('.')[0]));
  const unusedVariables = knownVariablePaths
    .filter(path => !usedTopLevel.has(path))
    .sort();

  if (options.failOnUnused && unusedVariables.length > 0) {
    throw new AstAiValidationError('Template variables include unused values', {
      unusedVariables
    });
  }

  return {
    status: 'ok',
    text: rendered,
    template,
    usedVariables: Array.from(used.values()).sort(),
    missingVariables,
    unusedVariables
  };
}

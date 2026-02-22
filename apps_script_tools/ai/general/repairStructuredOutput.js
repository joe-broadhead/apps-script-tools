function astAiStripCodeFences(text) {
  const value = typeof text === 'string' ? text.trim() : '';
  if (!value) {
    return '';
  }

  const fenceMatch = value.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  return value;
}

function astAiExtractJsonSubstring(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return null;
  }

  const source = text;
  const starts = [];
  for (let i = 0; i < source.length; i++) {
    const ch = source.charAt(i);
    if (ch === '{' || ch === '[') {
      starts.push(i);
    }
  }

  for (let s = 0; s < starts.length; s++) {
    const start = starts[s];
    const stack = [];
    let inString = false;
    let escaped = false;

    for (let i = start; i < source.length; i++) {
      const ch = source.charAt(i);

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === '\\') {
          escaped = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }

      if (ch === '{' || ch === '[') {
        stack.push(ch);
        continue;
      }

      if (ch === '}' || ch === ']') {
        const top = stack[stack.length - 1];
        const expected = ch === '}' ? '{' : '[';

        if (top !== expected) {
          break;
        }

        stack.pop();

        if (stack.length === 0) {
          return source.slice(start, i + 1);
        }
      }
    }
  }

  return null;
}

function astAiNormalizeJsonCandidate(text) {
  if (typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/^[\uFEFF]/, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, '\'')
    .replace(/,\s*([}\]])/g, '$1')
    .trim();
}

function astAiTryParseJsonCandidate(text) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    return null;
  }

  const candidates = [];
  const stripped = astAiStripCodeFences(text);
  if (stripped) {
    candidates.push({ value: stripped, strategy: 'fence_strip' });
  }

  const extracted = astAiExtractJsonSubstring(stripped || text);
  if (extracted && extracted !== stripped) {
    candidates.push({ value: extracted, strategy: 'substring_extract' });
  }

  candidates.push({ value: text, strategy: 'raw' });

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const normalized = astAiNormalizeJsonCandidate(candidate.value);
    const parsed = astAiSafeJsonParse(normalized);
    if (parsed != null) {
      return {
        json: parsed,
        repairedText: normalized,
        strategy: candidate.strategy
      };
    }
  }

  return null;
}

function astAiBuildLlmRepairPrompt(rawText, schema, validationErrors = []) {
  const errorSummary = Array.isArray(validationErrors) && validationErrors.length > 0
    ? validationErrors
      .slice(0, 8)
      .map(error => `${error.path || '$'}: ${error.message || 'validation failure'}`)
      .join('\n')
    : 'No schema validation errors were captured; JSON parsing failed.';

  return [
    'Repair this output so it is valid JSON and matches the target schema.',
    'Return JSON only. Do not include markdown, explanation, or comments.',
    '',
    'Target schema:',
    JSON.stringify(schema || {}, null, 2),
    '',
    'Validation errors:',
    errorSummary,
    '',
    'Broken output:',
    typeof rawText === 'string' ? rawText : ''
  ].join('\n');
}

function astAiBuildLlmRepairRequest(request, rawText, validationErrors) {
  const messages = [
    {
      role: 'system',
      content: 'You transform invalid structured outputs into strict JSON that matches a provided JSON schema.'
    },
    {
      role: 'user',
      content: astAiBuildLlmRepairPrompt(rawText, request.schema, validationErrors)
    }
  ];

  return {
    provider: request.provider,
    operation: 'text',
    model: request.model,
    input: messages,
    messages,
    system: null,
    auth: Object.assign({}, request.auth || {}),
    providerOptions: Object.assign({}, request.providerOptions || {}),
    options: Object.assign({}, request.options || {}, {
      stream: false,
      streamChunkSize: request.options && request.options.streamChunkSize ? request.options.streamChunkSize : 24
    }),
    routing: null
  };
}

function astAiRepairStructuredOutput({
  request,
  rawText,
  validationErrors,
  repairMode,
  executeRequest
} = {}) {
  const mode = typeof repairMode === 'string' ? repairMode : 'none';

  if (mode === 'none') {
    return {
      attempted: false,
      mode: 'none',
      json: null,
      repairText: null,
      error: null
    };
  }

  const localRepair = astAiTryParseJsonCandidate(rawText);
  if (localRepair && localRepair.json != null) {
    return {
      attempted: true,
      mode: 'json_repair',
      json: localRepair.json,
      repairText: localRepair.repairedText,
      strategy: localRepair.strategy,
      error: null
    };
  }

  if (mode !== 'llm_repair' || typeof executeRequest !== 'function') {
    return {
      attempted: true,
      mode,
      json: null,
      repairText: null,
      error: null
    };
  }

  try {
    const repairRequest = astAiBuildLlmRepairRequest(request, rawText, validationErrors);
    const repairResponse = executeRequest(repairRequest);
    const repairText = repairResponse && repairResponse.output && typeof repairResponse.output.text === 'string'
      ? repairResponse.output.text
      : '';
    const parsedRepair = astAiTryParseJsonCandidate(repairText);

    return {
      attempted: true,
      mode: 'llm_repair',
      json: parsedRepair ? parsedRepair.json : null,
      repairText: parsedRepair ? parsedRepair.repairedText : repairText,
      strategy: parsedRepair ? parsedRepair.strategy : null,
      error: null
    };
  } catch (error) {
    return {
      attempted: true,
      mode: 'llm_repair',
      json: null,
      repairText: null,
      error
    };
  }
}

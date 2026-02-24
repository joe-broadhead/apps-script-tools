function astAiOutputRepairIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astAiOutputRepairNormalizeString(value, fallback = null) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  return fallback;
}

function astAiOutputRepairNormalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  return fallback;
}

function astAiOutputRepairCloneObject(value) {
  return Object.assign({}, value || {});
}

function astAiOutputRepairTail(text, maxChars) {
  if (typeof text !== 'string') {
    return '';
  }

  if (!Number.isInteger(maxChars) || maxChars < 0 || text.length <= maxChars) {
    return text;
  }

  return text.slice(text.length - maxChars);
}

function astAiNormalizeContinuationPasses(value, fallback = 2) {
  if (typeof value === 'number' && isFinite(value)) {
    const rounded = Math.floor(value);
    if (rounded >= 1 && rounded <= 5) {
      return rounded;
    }
  }

  return fallback;
}

function astAiNormalizeContinuationTokenLimit(value, fallback = 512) {
  if (typeof value === 'number' && isFinite(value)) {
    const rounded = Math.floor(value);
    if (rounded >= 64 && rounded <= 8192) {
      return rounded;
    }
  }

  return fallback;
}

function astAiIsLikelyTruncatedText(text, finishReason) {
  if (typeof finishReason === 'string' && finishReason.trim().length > 0) {
    const normalized = finishReason.toLowerCase();
    if (
      normalized === 'length' ||
      normalized === 'max_tokens' ||
      normalized === 'max_output_tokens' ||
      normalized === 'token_limit'
    ) {
      return true;
    }
  }

  if (typeof text !== 'string' || text.trim().length === 0) {
    return false;
  }

  const trimmed = text.trim();
  const terminalPunctuation = /[.!?:"'\]\)]$/.test(trimmed);
  const hasOpenFence = (trimmed.match(/```/g) || []).length % 2 !== 0;
  const hasOpenBracket = (trimmed.match(/\[/g) || []).length > (trimmed.match(/\]/g) || []).length;

  if (hasOpenFence || hasOpenBracket) {
    return true;
  }

  if (terminalPunctuation) {
    return false;
  }

  return /[A-Za-z0-9]$/.test(trimmed);
}

function astAiMergeContinuation(baseText, continuation) {
  const base = typeof baseText === 'string' ? baseText : '';
  const next = typeof continuation === 'string' ? continuation : '';

  if (!next.trim()) {
    return base;
  }

  const maxOverlap = Math.min(400, base.length, next.length);
  let overlap = 0;

  for (let length = maxOverlap; length >= 8; length -= 1) {
    if (base.slice(-length) === next.slice(0, length)) {
      overlap = length;
      break;
    }
  }

  let suffix = overlap > 0 ? next.slice(overlap) : next;

  if (overlap === 0) {
    const tail = base.trimEnd();
    const lastWordMatch = tail.match(/([A-Za-z0-9_]+)$/);
    const lastWord = lastWordMatch ? lastWordMatch[1] : null;
    const nextTrimmed = next.trimStart();

    if (
      lastWord &&
      nextTrimmed.toLowerCase().startsWith(`${lastWord.toLowerCase()} `)
    ) {
      suffix = nextTrimmed.slice(lastWord.length + 1);
    }
  }

  return `${base}${suffix}`;
}

function astAiBuildContinuationPrompt(partial, question, citations) {
  const citationLines = Array.isArray(citations)
    ? citations
      .slice(0, 8)
      .map(citation => {
        const citationId = citation && citation.citationId ? citation.citationId : 'S?';
        const snippet = citation && typeof citation.snippet === 'string'
          ? citation.snippet.replace(/\s+/g, ' ').trim()
          : '';
        return `[${citationId}] ${snippet}`;
      })
      .filter(Boolean)
    : [];

  return [
    'Continue the assistant response exactly where it stopped.',
    'Do not repeat prior text.',
    'Do not add extra preface.',
    'Respect existing citation IDs and formatting.',
    '',
    `Question: ${typeof question === 'string' ? question : ''}`,
    '',
    'Current partial response (tail):',
    astAiOutputRepairTail(String(partial || ''), 2200),
    '',
    citationLines.length > 0 ? 'Available citations:' : '',
    citationLines.length > 0 ? citationLines.join('\n') : ''
  ].filter(Boolean).join('\n');
}

function astAiContinueIfTruncated(request = {}) {
  if (!astAiOutputRepairIsPlainObject(request)) {
    throw new AstAiValidationError('OutputRepair.continueIfTruncated request must be an object');
  }

  const partial = typeof request.partial === 'string' ? request.partial : '';
  if (!partial.trim()) {
    throw new AstAiValidationError('OutputRepair.continueIfTruncated requires a non-empty partial string');
  }

  const provider = astAiOutputRepairNormalizeString(request.provider, null);
  if (!provider) {
    throw new AstAiValidationError('OutputRepair.continueIfTruncated requires provider');
  }

  const force = astAiOutputRepairNormalizeBoolean(request.force, false);
  const likelyTruncated = astAiIsLikelyTruncatedText(partial, request.finishReason);
  if (!force && !likelyTruncated) {
    return {
      text: partial,
      continued: false,
      likelyTruncated: false,
      passesUsed: 0,
      finishReason: astAiOutputRepairNormalizeString(request.finishReason, null)
    };
  }

  const passes = astAiNormalizeContinuationPasses(request.passes, 2);
  const maxOutputTokens = astAiNormalizeContinuationTokenLimit(request.maxOutputTokens, 512);
  const model = astAiOutputRepairNormalizeString(request.model, null);
  const auth = astAiOutputRepairIsPlainObject(request.auth) ? astAiOutputRepairCloneObject(request.auth) : {};
  const providerOptions = astAiOutputRepairIsPlainObject(request.providerOptions)
    ? astAiOutputRepairCloneObject(request.providerOptions)
    : {};
  const baseOptions = astAiOutputRepairIsPlainObject(request.options) ? astAiOutputRepairCloneObject(request.options) : {};

  let text = partial;
  let finishReason = astAiOutputRepairNormalizeString(request.finishReason, null);
  let passesUsed = 0;

  for (let pass = 1; pass <= passes; pass += 1) {
    passesUsed = pass;
    const prompt = astAiBuildContinuationPrompt(text, request.question, request.citations);
    const response = runAiRequest({
      provider,
      operation: 'text',
      model,
      input: prompt,
      auth,
      providerOptions,
      options: Object.assign({}, baseOptions, {
        maxOutputTokens,
        stream: false
      })
    });

    const continuation = response && response.output && typeof response.output.text === 'string'
      ? response.output.text
      : '';
    const responseFinishReason = astAiOutputRepairNormalizeString(
      response && response.finishReason,
      null
    );
    finishReason = responseFinishReason;
    text = astAiMergeContinuation(text, continuation);

    if (!astAiIsLikelyTruncatedText(continuation, responseFinishReason)) {
      break;
    }
  }

  return {
    text,
    continued: text !== partial,
    likelyTruncated: true,
    passesUsed,
    finishReason
  };
}

const AST_AI_OUTPUT_REPAIR = Object.freeze({
  continueIfTruncated: astAiContinueIfTruncated
});

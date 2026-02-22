function astAiStructuredCloneMessage(message) {
  if (!message || typeof message !== 'object') {
    return message;
  }

  const cloned = Object.assign({}, message);

  if (Array.isArray(message.toolCalls)) {
    cloned.toolCalls = message.toolCalls.map(toolCall => Object.assign({}, toolCall));
  }

  return cloned;
}

function astAiStructuredTruncateText(value, maxChars = 4000) {
  if (typeof value !== 'string') {
    return '';
  }

  if (value.length <= maxChars) {
    return value;
  }

  return `${value.slice(0, maxChars)}...(truncated)`;
}

function astAiStructuredSummarizeErrors(errors = []) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return 'No schema diagnostics available.';
  }

  return errors
    .slice(0, 8)
    .map(entry => `${entry.path || '$'}: ${entry.message || 'validation failure'}`)
    .join('\n');
}

function astAiBuildStructuredRetryMessage(lastFailure, attempt) {
  const summary = lastFailure && lastFailure.validationErrors
    ? astAiStructuredSummarizeErrors(lastFailure.validationErrors)
    : (lastFailure && lastFailure.message ? lastFailure.message : 'Previous response did not match the required schema.');

  return [
    `Structured output retry ${attempt}:`,
    'Return only valid JSON that conforms to the provided schema.',
    'Do not include markdown or extra explanation.',
    `Previous failure: ${summary}`
  ].join('\n');
}

function astAiBuildStructuredRetryRequest(baseRequest, lastFailure, attempt) {
  const nextMessages = Array.isArray(baseRequest.messages)
    ? baseRequest.messages.map(astAiStructuredCloneMessage)
    : [];

  nextMessages.push({
    role: 'user',
    content: astAiBuildStructuredRetryMessage(lastFailure, attempt)
  });

  return Object.assign({}, baseRequest, {
    messages: nextMessages
  });
}

function astAiBuildStructuredFailureError(baseRequest, reliability, attempts, lastFailure) {
  const attemptCount = Array.isArray(attempts) ? attempts.length : 0;
  const totalAttempts = 1 + (reliability.maxSchemaRetries || 0);
  const message = `Failed to produce schema-valid structured output after ${attemptCount}/${totalAttempts} attempt(s)`;

  throw new AstAiResponseParseError(message, {
    provider: baseRequest.provider,
    operation: 'structured',
    model: baseRequest.model || null,
    retryCount: reliability.maxSchemaRetries || 0,
    repairMode: reliability.repairMode,
    strictValidation: reliability.strictValidation !== false,
    schema: baseRequest.schema || null,
    originalPayload: lastFailure && lastFailure.rawText ? lastFailure.rawText : null,
    attempts
  });
}

function astAiExtractStructuredParseCandidate(response) {
  const output = response && response.output && typeof response.output === 'object'
    ? response.output
    : {};
  const text = typeof output.text === 'string' ? output.text : '';

  if (typeof output.json !== 'undefined' && output.json !== null) {
    return {
      json: output.json,
      rawText: text,
      strategy: 'provider_json'
    };
  }

  const parsed = astAiTryParseJsonCandidate(text);
  if (parsed && typeof parsed.json !== 'undefined' && parsed.json !== null) {
    return {
      json: parsed.json,
      rawText: text,
      strategy: parsed.strategy
    };
  }

  return {
    json: null,
    rawText: text,
    strategy: 'none'
  };
}

function astRunStructuredWithReliability(baseRequest, executeRequest) {
  const reliability = baseRequest && baseRequest.options && baseRequest.options.reliability
    ? baseRequest.options.reliability
    : {
      maxSchemaRetries: 2,
      repairMode: 'json_repair',
      strictValidation: true
    };

  const maxAttempts = Math.max(1, 1 + (reliability.maxSchemaRetries || 0));
  const attempts = [];
  let lastFailure = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const requestForAttempt = attempt === 1
      ? baseRequest
      : astAiBuildStructuredRetryRequest(baseRequest, lastFailure, attempt);

    const response = executeRequest(requestForAttempt);
    const parsedCandidate = astAiExtractStructuredParseCandidate(response);

    if (parsedCandidate.json == null) {
      const repairResult = astAiRepairStructuredOutput({
        request: requestForAttempt,
        rawText: parsedCandidate.rawText,
        validationErrors: [],
        repairMode: reliability.repairMode,
        executeRequest
      });

      if (repairResult && repairResult.json != null) {
        const repairedValidation = astAiValidateStructuredOutput(repairResult.json, baseRequest.schema, {
          strictValidation: reliability.strictValidation !== false
        });

        if (repairedValidation.valid) {
          if (response.output && typeof response.output === 'object') {
            response.output.json = repairResult.json;
          }
          return response;
        }

        lastFailure = {
          attempt,
          kind: 'schema_validation',
          message: 'Repaired output did not match schema',
          validationErrors: repairedValidation.errors,
          rawText: astAiStructuredTruncateText(repairResult.repairText || parsedCandidate.rawText)
        };
      } else {
        lastFailure = {
          attempt,
          kind: 'json_parse',
          message: 'Structured response was not valid JSON',
          validationErrors: [],
          rawText: astAiStructuredTruncateText(parsedCandidate.rawText)
        };

        if (repairResult && repairResult.error) {
          lastFailure.repairError = {
            name: repairResult.error.name || 'Error',
            message: repairResult.error.message || 'Unknown repair error'
          };
        }
      }

      attempts.push(lastFailure);

      if (attempt === maxAttempts) {
        astAiBuildStructuredFailureError(baseRequest, reliability, attempts, lastFailure);
      }

      continue;
    }

    const validation = astAiValidateStructuredOutput(parsedCandidate.json, baseRequest.schema, {
      strictValidation: reliability.strictValidation !== false
    });

    if (validation.valid) {
      if (response.output && typeof response.output === 'object') {
        response.output.json = parsedCandidate.json;
      }
      return response;
    }

    const repairResult = astAiRepairStructuredOutput({
      request: requestForAttempt,
      rawText: parsedCandidate.rawText || JSON.stringify(parsedCandidate.json),
      validationErrors: validation.errors,
      repairMode: reliability.repairMode,
      executeRequest
    });

    if (repairResult && repairResult.json != null) {
      const repairedValidation = astAiValidateStructuredOutput(repairResult.json, baseRequest.schema, {
        strictValidation: reliability.strictValidation !== false
      });

      if (repairedValidation.valid) {
        if (response.output && typeof response.output === 'object') {
          response.output.json = repairResult.json;
        }
        return response;
      }

      lastFailure = {
        attempt,
        kind: 'schema_validation',
        message: 'Schema validation failed after repair',
        validationErrors: repairedValidation.errors,
        rawText: astAiStructuredTruncateText(repairResult.repairText || parsedCandidate.rawText)
      };
    } else {
      lastFailure = {
        attempt,
        kind: 'schema_validation',
        message: 'Schema validation failed',
        validationErrors: validation.errors,
        rawText: astAiStructuredTruncateText(parsedCandidate.rawText)
      };

      if (repairResult && repairResult.error) {
        lastFailure.repairError = {
          name: repairResult.error.name || 'Error',
          message: repairResult.error.message || 'Unknown repair error'
        };
      }
    }

    attempts.push(lastFailure);

    if (attempt === maxAttempts) {
      astAiBuildStructuredFailureError(baseRequest, reliability, attempts, lastFailure);
    }
  }

  astAiBuildStructuredFailureError(baseRequest, reliability, attempts, lastFailure);
}

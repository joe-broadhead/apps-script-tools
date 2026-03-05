function astRagAnswerStreamEmit(onEvent, event) {
  if (typeof onEvent !== 'function') {
    return;
  }

  try {
    onEvent(event);
  } catch (error) {
    throw new AstRagValidationError(
      'RAG answerStream onEvent callback threw an error',
      {
        eventType: event && event.type ? event.type : null
      },
      error
    );
  }
}

function astRagAnswerStreamChunkText(text, chunkSize) {
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

function astRagBuildAnswerStreamEventBase(normalizedRequest = {}) {
  return {
    indexFileId: normalizedRequest.indexFileId || null,
    provider: normalizedRequest.generation && normalizedRequest.generation.provider
      ? normalizedRequest.generation.provider
      : null,
    model: normalizedRequest.generation && normalizedRequest.generation.model
      ? normalizedRequest.generation.model
      : null
  };
}

function astRagBuildAnswerStreamMetadataFrame(response = {}) {
  return {
    status: astRagNormalizeString(response.status, 'ok'),
    citations: Array.isArray(response.citations)
      ? response.citations.map(item => astRagCloneObject(item))
      : [],
    retrieval: astRagIsPlainObject(response.retrieval) ? astRagCloneObject(response.retrieval) : null,
    usage: astRagIsPlainObject(response.usage) ? astRagCloneObject(response.usage) : null,
    queryProvenance: astRagIsPlainObject(response.queryProvenance) ? astRagCloneObject(response.queryProvenance) : null,
    diagnostics: astRagIsPlainObject(response.diagnostics) ? astRagCloneObject(response.diagnostics) : null
  };
}

function astRagAnswerStreamCore(request = {}) {
  const normalizedRequest = astRagValidateAnswerStreamRequest(request);
  const onEvent = normalizedRequest.onEvent;
  const eventBase = astRagBuildAnswerStreamEventBase(normalizedRequest);

  astRagAnswerStreamEmit(onEvent, Object.assign({}, eventBase, {
    type: 'start',
    question: normalizedRequest.question
  }));
  astRagAnswerStreamEmit(onEvent, Object.assign({}, eventBase, {
    type: 'progress',
    phase: 'answer_started'
  }));

  try {
    const response = astRagAnswerCore(normalizedRequest);
    astRagAnswerStreamEmit(onEvent, Object.assign({}, eventBase, {
      type: 'progress',
      phase: 'answer_ready',
      status: response && response.status ? response.status : null
    }));
    const chunks = astRagAnswerStreamChunkText(response && response.answer, normalizedRequest.streamChunkSize);
    let accumulated = '';

    for (let idx = 0; idx < chunks.length; idx += 1) {
      const delta = chunks[idx];
      accumulated += delta;
      astRagAnswerStreamEmit(onEvent, Object.assign({}, eventBase, {
        type: 'token',
        index: idx,
        delta,
        text: accumulated,
        status: response && response.status ? response.status : null
      }));
    }

    astRagAnswerStreamEmit(onEvent, Object.assign({}, eventBase, {
      type: 'metadata',
      metadata: astRagBuildAnswerStreamMetadataFrame(response)
    }));

    astRagAnswerStreamEmit(onEvent, Object.assign({}, eventBase, {
      type: 'done',
      response
    }));

    return response;
  } catch (error) {
    try {
      astRagAnswerStreamEmit(onEvent, Object.assign({}, eventBase, {
        type: 'error',
        error: {
          name: error && error.name ? error.name : 'Error',
          message: error && error.message ? error.message : String(error)
        }
      }));
    } catch (_emitError) {
      // Preserve original upstream failure so callers receive the true root cause.
    }
    throw error;
  }
}

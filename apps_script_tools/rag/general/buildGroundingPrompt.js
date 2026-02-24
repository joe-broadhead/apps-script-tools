function astRagBuildContextBlocks(results) {
  return results.map((result, index) => {
    const citationId = `S${index + 1}`;
    const location = [];

    if (result.page != null) {
      location.push(`page=${result.page}`);
    }
    if (result.slide != null) {
      location.push(`slide=${result.slide}`);
    }
    if (result.section) {
      location.push(`section=${result.section}`);
    }

    const locationText = location.length > 0 ? ` (${location.join(', ')})` : '';

    return {
      citationId,
      text: `[${citationId}] ${result.fileName}${locationText}\n${result.text}`
    };
  });
}

function astRagBuildGroundingStyleInstruction(style) {
  if (style === 'concise') {
    return 'Prefer concise responses with minimal filler and direct facts.';
  }
  if (style === 'detailed') {
    return 'Provide detailed responses with clear sections when useful.';
  }
  if (style === 'bullets') {
    return 'Format the answer as short bullet points when possible.';
  }
  return 'Respond in a natural chat style while staying factual and grounded.';
}

function astRagBuildForbiddenPhrasesInstruction(forbiddenPhrases = []) {
  const normalized = Array.isArray(forbiddenPhrases)
    ? forbiddenPhrases
      .map(value => astRagNormalizeString(value, null))
      .filter(Boolean)
    : [];

  if (normalized.length === 0) {
    return null;
  }

  return `Do not use these phrases verbatim: ${normalized.join(', ')}.`;
}

function astRagBuildGroundingPrompt(question, history, searchResults, generation = {}) {
  const contextBlocks = astRagBuildContextBlocks(searchResults || []);
  const style = astRagNormalizeString(generation.style, 'chat');
  const customInstructions = astRagNormalizeString(generation.instructions, null);
  const forbiddenInstruction = astRagBuildForbiddenPhrasesInstruction(generation.forbiddenPhrases);

  const instructionParts = [
    'You are a grounded project assistant.',
    'Only answer using the provided context blocks.',
    'Always include citations using IDs like S1, S2.',
    'If context is insufficient, set answer to the insufficient evidence message and return no citations.',
    astRagBuildGroundingStyleInstruction(style)
  ];

  if (customInstructions) {
    instructionParts.push(`Additional response instructions: ${customInstructions}`);
  }
  if (forbiddenInstruction) {
    instructionParts.push(forbiddenInstruction);
  }

  const instructions = instructionParts.join(' ');

  const messages = [{
    role: 'system',
    content: instructions
  }];

  if (Array.isArray(history)) {
    history.forEach(message => {
      if (!message || typeof message !== 'object') {
        return;
      }

      const role = astRagNormalizeString(message.role, null);
      const content = astRagNormalizeString(message.content, null);

      if (!role || !content) {
        return;
      }

      if (!['user', 'assistant', 'system'].includes(role)) {
        return;
      }

      messages.push({ role, content });
    });
  }

  const contextText = contextBlocks.length > 0
    ? contextBlocks.map(block => block.text).join('\n\n')
    : '[NO_CONTEXT]';

  messages.push({
    role: 'user',
    content: [
      `Question: ${question}`,
      'Context blocks:',
      contextText,
      'Return JSON: {"answer":"...","citations":["S1","S2"]}'
    ].join('\n\n')
  });

  return {
    messages,
    contextBlocks
  };
}

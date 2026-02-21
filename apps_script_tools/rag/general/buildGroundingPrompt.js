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

function astRagBuildGroundingPrompt(question, history, searchResults) {
  const contextBlocks = astRagBuildContextBlocks(searchResults || []);

  const instructions = [
    'You are a grounded project assistant.',
    'Only answer using the provided context blocks.',
    'Always include citations using IDs like S1, S2.',
    'If context is insufficient, set answer to the insufficient evidence message and return no citations.'
  ].join(' ');

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

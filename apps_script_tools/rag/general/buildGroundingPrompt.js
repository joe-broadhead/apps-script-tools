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
      rank: index + 1,
      text: `[${citationId}] ${result.fileName}${locationText}\n${result.text}`
    };
  });
}

function astRagApproxTokenCount(text) {
  const normalized = astRagNormalizeString(text, '');
  if (!normalized) {
    return 0;
  }
  return Math.max(1, Math.ceil(normalized.length / 4));
}

function astRagBuildGroundingContextBudget(generation = {}) {
  const maxContextChars = astRagNormalizePositiveInt(generation.maxContextChars, null, 1);
  const maxContextTokensApprox = astRagNormalizePositiveInt(generation.maxContextTokensApprox, null, 1);
  return {
    maxContextChars: typeof maxContextChars === 'number' ? maxContextChars : null,
    maxContextTokensApprox: typeof maxContextTokensApprox === 'number' ? maxContextTokensApprox : null
  };
}

function astRagPackContextBlocks(contextBlocks = [], budget = {}) {
  const list = Array.isArray(contextBlocks) ? contextBlocks : [];
  const maxChars = typeof budget.maxContextChars === 'number' && isFinite(budget.maxContextChars)
    ? Math.max(1, Math.floor(budget.maxContextChars))
    : null;
  const maxTokensApprox = typeof budget.maxContextTokensApprox === 'number' && isFinite(budget.maxContextTokensApprox)
    ? Math.max(1, Math.floor(budget.maxContextTokensApprox))
    : null;

  const selected = [];
  const droppedCitationIds = [];
  let usedChars = 0;
  let usedTokensApprox = 0;
  let truncatedBlocks = 0;

  function getRemainingChars() {
    const byChars = maxChars == null ? Infinity : Math.max(0, maxChars - usedChars);
    const byTokens = maxTokensApprox == null
      ? Infinity
      : Math.max(0, (maxTokensApprox - usedTokensApprox) * 4);
    return Math.max(0, Math.min(byChars, byTokens));
  }

  for (let idx = 0; idx < list.length; idx += 1) {
    const block = list[idx];
    const text = astRagNormalizeString(block && block.text, '');
    if (!text) {
      droppedCitationIds.push(block && block.citationId ? block.citationId : null);
      continue;
    }

    const fullChars = text.length;
    const fullTokens = astRagApproxTokenCount(text);
    const underCharBudget = maxChars == null || (usedChars + fullChars) <= maxChars;
    const underTokenBudget = maxTokensApprox == null || (usedTokensApprox + fullTokens) <= maxTokensApprox;

    if (underCharBudget && underTokenBudget) {
      selected.push({
        citationId: block.citationId,
        rank: block.rank,
        truncated: false,
        text
      });
      usedChars += fullChars;
      usedTokensApprox += fullTokens;
      continue;
    }

    const remainingChars = getRemainingChars();
    const minViableChars = 48;
    if (remainingChars < minViableChars) {
      droppedCitationIds.push(block.citationId);
      continue;
    }

    let truncatedText = astRagTruncate(text, remainingChars);
    if (truncatedText.length < text.length && truncatedText.length >= 4) {
      truncatedText = `${truncatedText.slice(0, -1)}…`;
    }

    const truncatedTokens = astRagApproxTokenCount(truncatedText);
    if (
      truncatedText.length < minViableChars ||
      (maxTokensApprox != null && (usedTokensApprox + truncatedTokens) > maxTokensApprox)
    ) {
      droppedCitationIds.push(block.citationId);
      continue;
    }

    selected.push({
      citationId: block.citationId,
      rank: block.rank,
      truncated: true,
      text: truncatedText
    });
    usedChars += truncatedText.length;
    usedTokensApprox += truncatedTokens;
    truncatedBlocks += 1;
  }

  if (selected.length === 0 && list.length > 0) {
    const first = list[0];
    const firstText = astRagNormalizeString(first && first.text, '');
    if (firstText) {
      const fallbackMaxChars = maxChars != null
        ? Math.max(32, maxChars)
        : (maxTokensApprox != null ? Math.max(32, maxTokensApprox * 4) : firstText.length);
      let fallbackText = astRagTruncate(firstText, fallbackMaxChars);
      if (fallbackText.length < firstText.length && fallbackText.length >= 4) {
        fallbackText = `${fallbackText.slice(0, -1)}…`;
      }
      selected.push({
        citationId: first.citationId,
        rank: first.rank,
        truncated: fallbackText.length < firstText.length,
        text: fallbackText
      });
      usedChars = fallbackText.length;
      usedTokensApprox = astRagApproxTokenCount(fallbackText);
      truncatedBlocks = fallbackText.length < firstText.length ? 1 : 0;
      droppedCitationIds.length = 0;
      for (let idx = 1; idx < list.length; idx += 1) {
        droppedCitationIds.push(list[idx].citationId);
      }
    }
  }

  return {
    contextBlocks: selected,
    contextStats: {
      maxContextChars: maxChars,
      maxContextTokensApprox: maxTokensApprox,
      inputBlocks: list.length,
      selectedBlocks: selected.length,
      droppedBlocks: Math.max(0, list.length - selected.length),
      truncatedBlocks,
      usedChars,
      usedTokensApprox,
      droppedCitationIds: droppedCitationIds.filter(Boolean)
    }
  };
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
  const packed = astRagPackContextBlocks(
    contextBlocks,
    astRagBuildGroundingContextBudget(generation)
  );
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

  const contextText = packed.contextBlocks.length > 0
    ? packed.contextBlocks.map(block => block.text).join('\n\n')
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
    contextBlocks: packed.contextBlocks,
    contextStats: packed.contextStats
  };
}

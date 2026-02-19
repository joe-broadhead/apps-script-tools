function runAiLiveSmoke(provider = 'openai', prompt = 'Reply with OK', model = '') {
  const request = {
    provider,
    input: prompt,
    options: {
      maxOutputTokens: 128,
      retries: 1,
      includeRaw: false
    }
  };

  if (typeof model === 'string' && model.trim().length > 0) {
    request.model = model.trim();
  }

  const response = AST.AI.text(request);

  if (!response || !response.output || typeof response.output.text !== 'string' || !response.output.text.trim()) {
    throw new Error(`Live AI smoke test returned empty text for provider ${provider}`);
  }

  const text = response.output.text.trim();

  return {
    provider,
    model: response.model,
    finishReason: response.finishReason,
    textPreview: text.length > 160 ? `${text.slice(0, 157)}...` : text
  };
}

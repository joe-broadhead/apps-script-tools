function astStableSerializeForIdempotency(value) {
  if (value === null) {
    return 'null';
  }

  const type = typeof value;
  if (type === 'number' || type === 'boolean') {
    return JSON.stringify(value);
  }

  if (type === 'string') {
    return JSON.stringify(value);
  }

  if (type === 'undefined') {
    return '"__undefined__"';
  }

  if (Array.isArray(value)) {
    return `[${value.map(astStableSerializeForIdempotency).join(',')}]`;
  }

  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  if (type === 'object') {
    const keys = Object.keys(value).sort();
    const entries = keys.map(key => `${JSON.stringify(key)}:${astStableSerializeForIdempotency(value[key])}`);
    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(String(value));
}

function astCreateToolIdempotencyStore() {
  return {
    entries: Object.create(null)
  };
}

function astBuildToolArgsFingerprint(args) {
  return astStableSerializeForIdempotency(args || {});
}

function astResolveToolIdempotencyKey(tool, toolCall, args) {
  const guardrails = tool.guardrails || {};

  if (guardrails.idempotencyKey) {
    return `${tool.name}:${guardrails.idempotencyKey}`;
  }

  if (!guardrails.idempotencyKeyFromArgs) {
    return null;
  }

  return `${tool.name}:${astBuildToolArgsFingerprint(args)}`;
}

function astGetToolIdempotencyResult(store, key, argsFingerprint, toolName) {
  if (!key) {
    return null;
  }

  const entry = store && store.entries ? store.entries[key] : null;
  if (!entry) {
    return null;
  }

  if (entry.argsFingerprint !== argsFingerprint) {
    throw new AstAiToolIdempotencyError('Tool idempotency key collision detected', {
      toolName,
      key
    });
  }

  return {
    result: entry.result
  };
}

function astSetToolIdempotencyResult(store, key, argsFingerprint, result) {
  if (!key || !store || !store.entries) {
    return;
  }

  store.entries[key] = {
    argsFingerprint,
    result
  };
}

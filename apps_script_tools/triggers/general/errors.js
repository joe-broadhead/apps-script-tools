class AstTriggersError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstTriggersError';
    this.details = details && typeof details === 'object' ? details : {};
    if (cause) {
      this.cause = cause;
    }
  }

  toJSON() {
    const output = {
      name: this.name,
      message: this.message,
      details: this.details
    };
    if (Object.prototype.hasOwnProperty.call(this, 'cause')) {
      output.cause = astTriggersSerializeErrorCause_(this.cause);
    }
    return output;
  }
}

class AstTriggersValidationError extends AstTriggersError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstTriggersValidationError';
  }
}

class AstTriggersNotFoundError extends AstTriggersError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstTriggersNotFoundError';
  }
}

class AstTriggersCapabilityError extends AstTriggersError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstTriggersCapabilityError';
  }
}

class AstTriggersDispatchError extends AstTriggersError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstTriggersDispatchError';
  }
}

function astTriggersSerializeErrorCause_(cause) {
  if (cause == null) {
    return cause;
  }
  let causeToJson = null;
  if (cause && (typeof cause === 'object' || typeof cause === 'function')) {
    try {
      causeToJson = cause.toJSON;
    } catch (_error) {
      causeToJson = null;
    }
  }
  if (typeof causeToJson === 'function') {
    try {
      return causeToJson.call(cause);
    } catch (_error) {
      // ignore cause serialization failures and fall back below
    }
  }
  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message
    };
  }
  if (typeof cause === 'object') {
    return astTriggersCloneSerializableValue_(cause, []);
  }
  return { message: String(cause) };
}

function astTriggersCloneSerializableValue_(value, seen) {
  if (value == null) {
    return value;
  }

  const valueType = typeof value;
  if (valueType !== 'object') {
    return value;
  }

  for (let i = 0; i < seen.length; i += 1) {
    if (seen[i] === value) {
      return '[Circular]';
    }
  }

  seen.push(value);
  if (Array.isArray(value)) {
    const outputArray = [];
    for (let i = 0; i < value.length; i += 1) {
      let entry;
      try {
        entry = value[i];
      } catch (_error) {
        outputArray.push('[Unserializable]');
        continue;
      }
      outputArray.push(astTriggersCloneSerializableValue_(entry, seen));
    }
    seen.pop();
    return outputArray;
  }

  const output = {};
  const keys = Object.keys(value);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (key === 'toJSON') {
      continue;
    }
    let entry;
    try {
      entry = value[key];
    } catch (_error) {
      output[key] = '[Unserializable]';
      continue;
    }
    if (typeof entry === 'function') {
      continue;
    }
    output[key] = astTriggersCloneSerializableValue_(entry, seen);
  }
  seen.pop();
  return output;
}

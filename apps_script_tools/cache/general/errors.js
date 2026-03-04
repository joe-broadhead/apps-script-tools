class AstCacheError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstCacheError';
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
      output.cause = astCacheSerializeErrorCause_(this.cause);
    }
    return output;
  }
}

class AstCacheValidationError extends AstCacheError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstCacheValidationError';
  }
}

class AstCacheCapabilityError extends AstCacheError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstCacheCapabilityError';
  }
}

function astCacheSerializeErrorCause_(cause) {
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
    return astCacheCloneSerializableValue_(cause, []);
  }
  return { message: String(cause) };
}

function astCacheCloneSerializableValue_(value, seen) {
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
      outputArray.push(astCacheCloneSerializableValue_(entry, seen));
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
    output[key] = astCacheCloneSerializableValue_(entry, seen);
  }
  seen.pop();
  return output;
}

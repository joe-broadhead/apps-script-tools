class AstMessagingError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstMessagingError';
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
      output.cause = astMessagingSerializeErrorCause_(this.cause);
    }
    return output;
  }
}

class AstMessagingValidationError extends AstMessagingError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstMessagingValidationError';
  }
}

class AstMessagingAuthError extends AstMessagingError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstMessagingAuthError';
  }
}

class AstMessagingCapabilityError extends AstMessagingError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstMessagingCapabilityError';
  }
}

class AstMessagingNotFoundError extends AstMessagingError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstMessagingNotFoundError';
  }
}

class AstMessagingRateLimitError extends AstMessagingError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstMessagingRateLimitError';
  }
}

class AstMessagingProviderError extends AstMessagingError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstMessagingProviderError';
  }
}

class AstMessagingParseError extends AstMessagingError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstMessagingParseError';
  }
}

class AstMessagingTrackingError extends AstMessagingError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstMessagingTrackingError';
  }
}

function astMessagingSerializeErrorCause_(cause) {
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
    return astMessagingCloneSerializableValue_(cause, []);
  }
  return { message: String(cause) };
}

function astMessagingCloneSerializableValue_(value, seen) {
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
      outputArray.push(astMessagingCloneSerializableValue_(entry, seen));
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
    output[key] = astMessagingCloneSerializableValue_(entry, seen);
  }
  seen.pop();
  return output;
}

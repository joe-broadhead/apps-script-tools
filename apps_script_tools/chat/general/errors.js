class AstChatError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstChatError';
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
      output.cause = astChatSerializeErrorCause_(this.cause);
    }
    return output;
  }
}

class AstChatValidationError extends AstChatError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstChatValidationError';
  }
}

class AstChatCapabilityError extends AstChatError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstChatCapabilityError';
  }
}

class AstChatNotFoundError extends AstChatError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstChatNotFoundError';
  }
}

class AstChatLockError extends AstChatError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstChatLockError';
  }
}

function astChatSerializeErrorCause_(cause) {
  if (cause == null) {
    return cause;
  }
  if (cause && typeof cause.toJSON === 'function') {
    try {
      return cause.toJSON();
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
    return astChatCloneSerializableValue_(cause, []);
  }
  return { message: String(cause) };
}

function astChatCloneSerializableValue_(value, seen) {
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
      outputArray.push(astChatCloneSerializableValue_(value[i], seen));
    }
    seen.pop();
    return outputArray;
  }

  const output = {};
  const keys = Object.keys(value);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (key === 'toJSON' && typeof value[key] === 'function') {
      continue;
    }
    const entry = value[key];
    if (typeof entry === 'function') {
      continue;
    }
    output[key] = astChatCloneSerializableValue_(entry, seen);
  }
  seen.pop();
  return output;
}

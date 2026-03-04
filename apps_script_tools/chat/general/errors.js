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
    return cause;
  }
  return { message: String(cause) };
}

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

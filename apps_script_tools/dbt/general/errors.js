class AstDbtError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstDbtError';
    this.details = details;
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
      output.cause = astDbtSerializeErrorCause_(this.cause);
    }
    return output;
  }
}

class AstDbtValidationError extends AstDbtError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstDbtValidationError';
  }
}

class AstDbtLoadError extends AstDbtError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstDbtLoadError';
  }
}

class AstDbtParseError extends AstDbtError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstDbtParseError';
  }
}

class AstDbtSchemaError extends AstDbtError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstDbtSchemaError';
  }
}

class AstDbtNotFoundError extends AstDbtError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstDbtNotFoundError';
  }
}

class AstDbtCapabilityError extends AstDbtError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstDbtCapabilityError';
  }
}

function astDbtSerializeErrorCause_(cause) {
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

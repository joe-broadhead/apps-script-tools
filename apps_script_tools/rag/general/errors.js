class AstRagError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstRagError';
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
      output.cause = astRagSerializeErrorCause_(this.cause);
    }
    return output;
  }
}

class AstRagValidationError extends AstRagError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstRagValidationError';
  }
}

class AstRagAuthError extends AstRagError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstRagAuthError';
  }
}

class AstRagAccessError extends AstRagError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstRagAccessError';
  }
}

class AstRagSourceError extends AstRagError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstRagSourceError';
  }
}

class AstRagIndexError extends AstRagError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstRagIndexError';
  }
}

class AstRagRetrievalError extends AstRagError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstRagRetrievalError';
  }
}

class AstRagEmbeddingCapabilityError extends AstRagError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstRagEmbeddingCapabilityError';
  }
}

class AstRagGroundingError extends AstRagError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstRagGroundingError';
  }
}

function astRagSerializeErrorCause_(cause) {
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

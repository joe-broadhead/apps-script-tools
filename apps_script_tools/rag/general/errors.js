class AstRagError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstRagError';
    this.details = details;
    if (cause) {
      this.cause = cause;
    }
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

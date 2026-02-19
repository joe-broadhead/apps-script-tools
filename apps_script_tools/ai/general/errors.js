class AstAiError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstAiError';
    this.details = details;
    if (cause) {
      this.cause = cause;
    }
  }
}

class AstAiValidationError extends AstAiError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstAiValidationError';
  }
}

class AstAiAuthError extends AstAiError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstAiAuthError';
  }
}

class AstAiCapabilityError extends AstAiError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstAiCapabilityError';
  }
}

class AstAiProviderError extends AstAiError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstAiProviderError';
  }
}

class AstAiToolExecutionError extends AstAiError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstAiToolExecutionError';
  }
}

class AstAiToolLoopError extends AstAiError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstAiToolLoopError';
  }
}

class AstAiResponseParseError extends AstAiError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstAiResponseParseError';
  }
}

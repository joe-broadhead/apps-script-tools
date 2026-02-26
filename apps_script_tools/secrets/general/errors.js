class AstSecretsError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstSecretsError';
    this.details = details;
    if (cause) {
      this.cause = cause;
    }
  }
}

class AstSecretsValidationError extends AstSecretsError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstSecretsValidationError';
  }
}

class AstSecretsAuthError extends AstSecretsError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstSecretsAuthError';
  }
}

class AstSecretsCapabilityError extends AstSecretsError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstSecretsCapabilityError';
  }
}

class AstSecretsProviderError extends AstSecretsError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstSecretsProviderError';
  }
}

class AstSecretsNotFoundError extends AstSecretsError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstSecretsNotFoundError';
  }
}

class AstSecretsParseError extends AstSecretsError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstSecretsParseError';
  }
}

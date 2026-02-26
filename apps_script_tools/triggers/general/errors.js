class AstTriggersError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstTriggersError';
    this.details = details && typeof details === 'object' ? details : {};
    if (cause) {
      this.cause = cause;
    }
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

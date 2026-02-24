class AstChatError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstChatError';
    this.details = details && typeof details === 'object' ? details : {};

    if (cause) {
      this.cause = cause;
    }
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

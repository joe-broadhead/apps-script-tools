class AstDbtError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstDbtError';
    this.details = details;
    if (cause) {
      this.cause = cause;
    }
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

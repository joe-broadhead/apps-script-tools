class AstGitHubError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstGitHubError';
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
      output.cause = astGitHubSerializeErrorCause_(this.cause);
    }
    return output;
  }
}

class AstGitHubValidationError extends AstGitHubError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstGitHubValidationError';
  }
}

class AstGitHubAuthError extends AstGitHubError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstGitHubAuthError';
  }
}

class AstGitHubNotFoundError extends AstGitHubError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstGitHubNotFoundError';
  }
}

class AstGitHubRateLimitError extends AstGitHubError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstGitHubRateLimitError';
  }
}

class AstGitHubConflictError extends AstGitHubError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstGitHubConflictError';
  }
}

class AstGitHubCapabilityError extends AstGitHubError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstGitHubCapabilityError';
  }
}

class AstGitHubProviderError extends AstGitHubError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstGitHubProviderError';
  }
}

class AstGitHubParseError extends AstGitHubError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstGitHubParseError';
  }
}

function astGitHubSerializeErrorCause_(cause) {
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

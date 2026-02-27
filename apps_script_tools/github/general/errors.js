class AstGitHubError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstGitHubError';
    this.details = details;
    if (cause) {
      this.cause = cause;
    }
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

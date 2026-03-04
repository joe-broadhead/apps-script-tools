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
    return astGitHubCloneSerializableValue_(cause, []);
  }
  return { message: String(cause) };
}

function astGitHubCloneSerializableValue_(value, seen) {
  if (value == null) {
    return value;
  }

  const valueType = typeof value;
  if (valueType !== 'object') {
    return value;
  }

  for (let i = 0; i < seen.length; i += 1) {
    if (seen[i] === value) {
      return '[Circular]';
    }
  }

  seen.push(value);
  if (Array.isArray(value)) {
    const outputArray = [];
    for (let i = 0; i < value.length; i += 1) {
      outputArray.push(astGitHubCloneSerializableValue_(value[i], seen));
    }
    seen.pop();
    return outputArray;
  }

  const output = {};
  const keys = Object.keys(value);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (key === 'toJSON' && typeof value[key] === 'function') {
      continue;
    }
    const entry = value[key];
    if (typeof entry === 'function') {
      continue;
    }
    output[key] = astGitHubCloneSerializableValue_(entry, seen);
  }
  seen.pop();
  return output;
}

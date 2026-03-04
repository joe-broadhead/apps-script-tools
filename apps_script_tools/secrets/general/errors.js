class AstSecretsError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstSecretsError';
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
      output.cause = astSecretsSerializeErrorCause_(this.cause);
    }
    return output;
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

function astSecretsSerializeErrorCause_(cause) {
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
    return astSecretsCloneSerializableValue_(cause, []);
  }
  return { message: String(cause) };
}

function astSecretsCloneSerializableValue_(value, seen) {
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
      outputArray.push(astSecretsCloneSerializableValue_(value[i], seen));
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
    output[key] = astSecretsCloneSerializableValue_(entry, seen);
  }
  seen.pop();
  return output;
}

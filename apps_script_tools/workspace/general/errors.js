class AstWorkspaceError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstWorkspaceError';
    this.details = (
      details != null
      && typeof details === 'object'
      && !Array.isArray(details)
    ) ? details : {};

    if (cause) {
      this.cause = cause;
    }
  }

  toJSON() {
    const out = {
      name: this.name,
      message: this.message,
      details: this.details
    };
    if (Object.prototype.hasOwnProperty.call(this, 'cause')) {
      out.cause = astWorkspaceSerializeErrorCause_(this.cause);
    }
    return out;
  }
}

class AstWorkspaceValidationError extends AstWorkspaceError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstWorkspaceValidationError';
  }
}

class AstWorkspaceNotFoundError extends AstWorkspaceError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstWorkspaceNotFoundError';
  }
}

class AstWorkspaceCapabilityError extends AstWorkspaceError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstWorkspaceCapabilityError';
  }
}

class AstWorkspaceProviderError extends AstWorkspaceError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstWorkspaceProviderError';
  }
}

class AstWorkspaceParseError extends AstWorkspaceError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstWorkspaceParseError';
  }
}

function astWorkspaceSerializeErrorCause_(cause) {
  if (cause == null) {
    return cause;
  }

  let causeToJson = null;
  if (cause && (typeof cause === 'object' || typeof cause === 'function')) {
    try {
      causeToJson = cause.toJSON;
    } catch (_error) {
      causeToJson = null;
    }
  }

  if (typeof causeToJson === 'function') {
    try {
      return causeToJson.call(cause);
    } catch (_error) {
      // ignore serialization failures and fall back below
    }
  }

  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message
    };
  }

  if (typeof cause === 'object') {
    return astWorkspaceCloneSerializableValue_(cause, []);
  }

  return { message: String(cause) };
}

function astWorkspaceCloneSerializableValue_(value, seen) {
  if (value == null) {
    return value;
  }

  if (typeof value !== 'object') {
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
      let entry;
      try {
        entry = value[i];
      } catch (_error) {
        outputArray.push('[Unserializable]');
        continue;
      }
      outputArray.push(astWorkspaceCloneSerializableValue_(entry, seen));
    }
    seen.pop();
    return outputArray;
  }

  const output = {};
  const keys = Object.keys(value);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (key === 'toJSON') {
      continue;
    }

    let entry;
    try {
      entry = value[key];
    } catch (_error) {
      output[key] = '[Unserializable]';
      continue;
    }

    if (typeof entry === 'function') {
      continue;
    }

    output[key] = astWorkspaceCloneSerializableValue_(entry, seen);
  }
  seen.pop();
  return output;
}

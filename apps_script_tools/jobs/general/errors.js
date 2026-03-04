class AstJobsError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = 'AstJobsError';
    this.details = details && typeof details === 'object' ? details : {};

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
      output.cause = astJobsSerializeErrorCause_(this.cause);
    }
    return output;
  }
}

class AstJobsValidationError extends AstJobsError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstJobsValidationError';
  }
}

class AstJobsNotFoundError extends AstJobsError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstJobsNotFoundError';
  }
}

class AstJobsConflictError extends AstJobsError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstJobsConflictError';
  }
}

class AstJobsStepExecutionError extends AstJobsError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstJobsStepExecutionError';
  }
}

class AstJobsCapabilityError extends AstJobsError {
  constructor(message, details = {}, cause = null) {
    super(message, details, cause);
    this.name = 'AstJobsCapabilityError';
  }
}

function astJobsSerializeErrorCause_(cause) {
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
    return astJobsCloneSerializableValue_(cause, []);
  }
  return { message: String(cause) };
}

function astJobsCloneSerializableValue_(value, seen) {
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
      let entry;
      try {
        entry = value[i];
      } catch (_error) {
        outputArray.push('[Unserializable]');
        continue;
      }
      outputArray.push(astJobsCloneSerializableValue_(entry, seen));
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
    output[key] = astJobsCloneSerializableValue_(entry, seen);
  }
  seen.pop();
  return output;
}

const __astJobsErrorsRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astJobsErrorsRoot.AstJobsError = AstJobsError;
__astJobsErrorsRoot.AstJobsValidationError = AstJobsValidationError;
__astJobsErrorsRoot.AstJobsNotFoundError = AstJobsNotFoundError;
__astJobsErrorsRoot.AstJobsConflictError = AstJobsConflictError;
__astJobsErrorsRoot.AstJobsStepExecutionError = AstJobsStepExecutionError;
__astJobsErrorsRoot.AstJobsCapabilityError = AstJobsCapabilityError;
this.AstJobsError = AstJobsError;
this.AstJobsValidationError = AstJobsValidationError;
this.AstJobsNotFoundError = AstJobsNotFoundError;
this.AstJobsConflictError = AstJobsConflictError;
this.AstJobsStepExecutionError = AstJobsStepExecutionError;
this.AstJobsCapabilityError = AstJobsCapabilityError;

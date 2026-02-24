function astTelemetryHelpersIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astTelemetryHelpersNormalizeError(error) {
  if (error && typeof error === 'object') {
    return {
      name: typeof error.name === 'string' && error.name.trim().length > 0 ? error.name.trim() : 'Error',
      message: typeof error.message === 'string' && error.message.trim().length > 0
        ? error.message.trim()
        : 'Unknown error'
    };
  }

  return {
    name: 'Error',
    message: String(error)
  };
}

function astTelemetryHelpersResolveApi() {
  const root = typeof globalThis !== 'undefined' ? globalThis : this;

  if (typeof AST_TELEMETRY !== 'undefined' && AST_TELEMETRY) {
    return AST_TELEMETRY;
  }

  if (root && root.AST_TELEMETRY) {
    return root.AST_TELEMETRY;
  }

  if (root && root.AST && root.AST.Telemetry) {
    return root.AST.Telemetry;
  }

  return null;
}

function astTelemetryHelpersStartSpanSafe(name, context = {}, options = {}) {
  const api = astTelemetryHelpersResolveApi();
  if (!api || typeof api.startSpan !== 'function') {
    return null;
  }

  try {
    return api.startSpan(name, context, options);
  } catch (_error) {
    return null;
  }
}

function astTelemetryHelpersEndSpanSafe(spanId, result = {}, options = {}) {
  if (!spanId) {
    return null;
  }

  const api = astTelemetryHelpersResolveApi();
  if (!api || typeof api.endSpan !== 'function') {
    return null;
  }

  try {
    return api.endSpan(spanId, result, options);
  } catch (_error) {
    return null;
  }
}

function astTelemetryHelpersRecordEventSafe(event = {}, options = {}) {
  const api = astTelemetryHelpersResolveApi();
  if (!api || typeof api.recordEvent !== 'function') {
    return null;
  }

  try {
    return api.recordEvent(event, options);
  } catch (_error) {
    return null;
  }
}

function astTelemetryHelpersResolveWithSpanArgs(name, contextOrTask, taskOrOptions, maybeOptions) {
  const spanName = typeof name === 'string' ? name.trim() : '';
  if (!spanName) {
    throw new Error('AST.TelemetryHelpers.withSpan requires a non-empty span name');
  }

  if (typeof contextOrTask === 'function') {
    return {
      spanName,
      context: {},
      task: contextOrTask,
      options: astTelemetryHelpersIsPlainObject(taskOrOptions) ? taskOrOptions : {}
    };
  }

  if (typeof taskOrOptions !== 'function') {
    throw new Error('AST.TelemetryHelpers.withSpan requires a task function');
  }

  return {
    spanName,
    context: astTelemetryHelpersIsPlainObject(contextOrTask) ? contextOrTask : {},
    task: taskOrOptions,
    options: astTelemetryHelpersIsPlainObject(maybeOptions) ? maybeOptions : {}
  };
}

function astTelemetryHelpersBuildSpanResult({ status, startedAtMs, result, error, options }) {
  const payload = { status };
  const includeDuration = options.includeDuration !== false;

  if (includeDuration) {
    payload.durationMs = Math.max(0, new Date().getTime() - startedAtMs);
  }

  if (status === 'ok' && options.includeResult === true) {
    payload.result = typeof options.resultMapper === 'function'
      ? options.resultMapper(result)
      : result;
  }

  if (status === 'error') {
    payload.error = typeof options.errorMapper === 'function'
      ? options.errorMapper(error)
      : astTelemetryHelpersNormalizeError(error);
  }

  return payload;
}

function astTelemetryHelpersWithSpan(name, contextOrTask, taskOrOptions, maybeOptions) {
  const resolved = astTelemetryHelpersResolveWithSpanArgs(name, contextOrTask, taskOrOptions, maybeOptions);
  const endOptions = astTelemetryHelpersIsPlainObject(resolved.options.endOptions)
    ? resolved.options.endOptions
    : {};
  const startedAtMs = new Date().getTime();
  const spanId = astTelemetryHelpersStartSpanSafe(
    resolved.spanName,
    resolved.context,
    astTelemetryHelpersIsPlainObject(resolved.options.startOptions) ? resolved.options.startOptions : {}
  );

  try {
    const output = resolved.task();

    if (output && typeof output.then === 'function') {
      return output
        .then(value => {
          const endPayload = astTelemetryHelpersBuildSpanResult({
            status: 'ok',
            startedAtMs,
            result: value,
            options: resolved.options
          });
          astTelemetryHelpersEndSpanSafe(spanId, endPayload, endOptions);
          return value;
        })
        .catch(error => {
          const endPayload = astTelemetryHelpersBuildSpanResult({
            status: 'error',
            startedAtMs,
            error,
            options: resolved.options
          });
          astTelemetryHelpersEndSpanSafe(spanId, endPayload, endOptions);
          throw error;
        });
    }

    const endPayload = astTelemetryHelpersBuildSpanResult({
      status: 'ok',
      startedAtMs,
      result: output,
      options: resolved.options
    });
    astTelemetryHelpersEndSpanSafe(spanId, endPayload, endOptions);
    return output;
  } catch (error) {
    const endPayload = astTelemetryHelpersBuildSpanResult({
      status: 'error',
      startedAtMs,
      error,
      options: resolved.options
    });
    astTelemetryHelpersEndSpanSafe(spanId, endPayload, endOptions);
    throw error;
  }
}

function astTelemetryHelpersWrap(name, task, options = {}) {
  if (typeof task !== 'function') {
    throw new Error('AST.TelemetryHelpers.wrap requires a task function');
  }

  const normalizedOptions = astTelemetryHelpersIsPlainObject(options) ? options : {};

  return function wrappedTelemetryTask(...args) {
    const context = typeof normalizedOptions.contextFactory === 'function'
      ? normalizedOptions.contextFactory(args, this)
      : normalizedOptions.context;
    const contextObject = astTelemetryHelpersIsPlainObject(context) ? context : {};
    const withSpanOptions = Object.assign({}, normalizedOptions);
    delete withSpanOptions.context;
    delete withSpanOptions.contextFactory;

    return astTelemetryHelpersWithSpan(
      name,
      contextObject,
      () => task.apply(this, args),
      withSpanOptions
    );
  };
}

const AST_TELEMETRY_HELPERS = Object.freeze({
  startSpanSafe: astTelemetryHelpersStartSpanSafe,
  endSpanSafe: astTelemetryHelpersEndSpanSafe,
  recordEventSafe: astTelemetryHelpersRecordEventSafe,
  withSpan: astTelemetryHelpersWithSpan,
  wrap: astTelemetryHelpersWrap
});

const __astTelemetryHelpersApiRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astTelemetryHelpersApiRoot.astTelemetryHelpersStartSpanSafe = astTelemetryHelpersStartSpanSafe;
__astTelemetryHelpersApiRoot.astTelemetryHelpersEndSpanSafe = astTelemetryHelpersEndSpanSafe;
__astTelemetryHelpersApiRoot.astTelemetryHelpersRecordEventSafe = astTelemetryHelpersRecordEventSafe;
__astTelemetryHelpersApiRoot.astTelemetryHelpersWithSpan = astTelemetryHelpersWithSpan;
__astTelemetryHelpersApiRoot.astTelemetryHelpersWrap = astTelemetryHelpersWrap;
__astTelemetryHelpersApiRoot.AST_TELEMETRY_HELPERS = AST_TELEMETRY_HELPERS;
this.astTelemetryHelpersStartSpanSafe = astTelemetryHelpersStartSpanSafe;
this.astTelemetryHelpersEndSpanSafe = astTelemetryHelpersEndSpanSafe;
this.astTelemetryHelpersRecordEventSafe = astTelemetryHelpersRecordEventSafe;
this.astTelemetryHelpersWithSpan = astTelemetryHelpersWithSpan;
this.astTelemetryHelpersWrap = astTelemetryHelpersWrap;
this.AST_TELEMETRY_HELPERS = AST_TELEMETRY_HELPERS;

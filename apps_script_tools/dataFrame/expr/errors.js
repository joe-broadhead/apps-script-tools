function __astExprGetLocation(source, index) {
  const normalizedSource = typeof source === 'string' ? source : '';
  const boundedIndex = Math.max(0, Math.min(
    Number.isInteger(index) ? index : 0,
    normalizedSource.length
  ));

  let line = 1;
  let column = 1;

  for (let idx = 0; idx < boundedIndex; idx++) {
    const char = normalizedSource[idx];
    if (char === '\n') {
      line += 1;
      column = 1;
      continue;
    }
    column += 1;
  }

  return { line, column, index: boundedIndex };
}

function __astExprBuildParseError(message, source, index = 0, details = {}) {
  const location = __astExprGetLocation(source, index);
  const error = new Error(`${message} (line ${location.line}, column ${location.column})`);
  error.name = 'DataFrameExprParseError';
  error.details = Object.assign({}, details, location);
  return error;
}

function __astExprBuildRuntimeError(message, details = {}, cause = null) {
  const error = new Error(message);
  error.name = 'DataFrameExprRuntimeError';
  error.details = details;
  if (cause) {
    error.cause = cause;
  }
  return error;
}

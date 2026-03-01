const AST_HTTP_CAPABILITIES = Object.freeze({
  request: Object.freeze({
    retries: true,
    timeoutBudget: true,
    redaction: true,
    parseJson: true
  }),
  request_batch: Object.freeze({
    supported: true,
    continueOnError: true
  })
});

function astHttpGetCapabilities(operation = null) {
  if (operation == null) {
    return AST_HTTP_CAPABILITIES;
  }

  const normalized = astHttpNormalizeString(operation, '').toLowerCase();
  if (!normalized) {
    return AST_HTTP_CAPABILITIES;
  }

  return AST_HTTP_CAPABILITIES[normalized] || null;
}

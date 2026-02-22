function astRagHasAccessControlRules(accessControl = {}) {
  if (!astRagIsPlainObject(accessControl)) {
    return false;
  }

  const listFields = [
    'allowedFileIds',
    'deniedFileIds',
    'allowedMimeTypes',
    'deniedMimeTypes'
  ];

  return listFields.some(field => Array.isArray(accessControl[field]) && accessControl[field].length > 0);
}

function astRagCompileAccessControl(accessControl = {}) {
  if (!astRagIsPlainObject(accessControl)) {
    accessControl = {};
  }

  return {
    hasRules: astRagHasAccessControlRules(accessControl),
    allowedFileIds: new Set(accessControl.allowedFileIds || []),
    deniedFileIds: new Set(accessControl.deniedFileIds || []),
    allowedMimeTypes: new Set(accessControl.allowedMimeTypes || []),
    deniedMimeTypes: new Set(accessControl.deniedMimeTypes || [])
  };
}

function astRagIsChunkAllowedByAccess(chunk = {}, accessControl = {}, compiledAccessControl = null) {
  const compiled = compiledAccessControl || astRagCompileAccessControl(accessControl);
  if (!compiled.hasRules) {
    return true;
  }

  const fileId = astRagNormalizeString(chunk.fileId, '');
  const mimeType = astRagNormalizeString(chunk.mimeType, '');

  if (compiled.deniedFileIds.has(fileId)) {
    return false;
  }

  if (compiled.deniedMimeTypes.has(mimeType)) {
    return false;
  }

  if (compiled.allowedFileIds.size > 0 && !compiled.allowedFileIds.has(fileId)) {
    return false;
  }

  if (compiled.allowedMimeTypes.size > 0 && !compiled.allowedMimeTypes.has(mimeType)) {
    return false;
  }

  return true;
}

function astRagApplyAccessControl(chunks = [], accessControl = {}, options = {}) {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return [];
  }

  const enforceAccessControl = astRagNormalizeBoolean(options.enforceAccessControl, true);
  const compiled = astRagCompileAccessControl(accessControl);
  if (!enforceAccessControl || !compiled.hasRules) {
    return chunks.slice();
  }

  return chunks.filter(chunk => astRagIsChunkAllowedByAccess(chunk, accessControl, compiled));
}

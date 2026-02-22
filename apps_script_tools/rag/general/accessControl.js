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

function astRagIsChunkAllowedByAccess(chunk = {}, accessControl = {}) {
  if (!astRagHasAccessControlRules(accessControl)) {
    return true;
  }

  const fileId = astRagNormalizeString(chunk.fileId, '');
  const mimeType = astRagNormalizeString(chunk.mimeType, '');
  const allowedFileIds = new Set(accessControl.allowedFileIds || []);
  const deniedFileIds = new Set(accessControl.deniedFileIds || []);
  const allowedMimeTypes = new Set(accessControl.allowedMimeTypes || []);
  const deniedMimeTypes = new Set(accessControl.deniedMimeTypes || []);

  if (deniedFileIds.has(fileId)) {
    return false;
  }

  if (deniedMimeTypes.has(mimeType)) {
    return false;
  }

  if (allowedFileIds.size > 0 && !allowedFileIds.has(fileId)) {
    return false;
  }

  if (allowedMimeTypes.size > 0 && !allowedMimeTypes.has(mimeType)) {
    return false;
  }

  return true;
}

function astRagApplyAccessControl(chunks = [], accessControl = {}, options = {}) {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return [];
  }

  const enforceAccessControl = astRagNormalizeBoolean(options.enforceAccessControl, true);
  if (!enforceAccessControl || !astRagHasAccessControlRules(accessControl)) {
    return chunks.slice();
  }

  return chunks.filter(chunk => astRagIsChunkAllowedByAccess(chunk, accessControl));
}

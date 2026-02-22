function astStorageEnsureUtilitiesFn(name) {
  if (
    typeof Utilities === 'undefined' ||
    !Utilities ||
    typeof Utilities[name] !== 'function'
  ) {
    throw new AstStorageValidationError(`Utilities.${name} is required for storage payload handling`);
  }
}

function astStorageGetSoftLimitBytes() {
  return 50 * 1024 * 1024;
}

function astStorageBuildSoftLimitWarning(direction, sizeBytes) {
  const normalizedDirection = astStorageNormalizeString(direction, 'payload');
  const normalizedSize = Number.isFinite(Number(sizeBytes)) ? Number(sizeBytes) : 0;
  return `${normalizedDirection} exceeds soft cap of ${astStorageGetSoftLimitBytes()} bytes (${normalizedSize} bytes)`;
}

function astStorageBuildReadWarnings(sizeBytes) {
  if (sizeBytes > astStorageGetSoftLimitBytes()) {
    return [astStorageBuildSoftLimitWarning('read payload', sizeBytes)];
  }

  return [];
}

function astStorageBytesToBase64(bytes) {
  astStorageEnsureUtilitiesFn('base64Encode');
  return Utilities.base64Encode(bytes || []);
}

function astStorageBase64ToBytes(base64) {
  astStorageEnsureUtilitiesFn('base64Decode');
  return Utilities.base64Decode(base64 || '');
}

function astStorageTextToBase64(text) {
  astStorageEnsureUtilitiesFn('base64Encode');
  return Utilities.base64Encode(String(text || ''));
}

function astStorageBase64ToText(base64) {
  const bytes = astStorageBase64ToBytes(base64);

  if (
    typeof Utilities !== 'undefined' &&
    Utilities &&
    typeof Utilities.newBlob === 'function'
  ) {
    const blob = Utilities.newBlob(bytes);
    if (blob && typeof blob.getDataAsString === 'function') {
      return blob.getDataAsString();
    }
  }

  let output = '';
  for (let idx = 0; idx < bytes.length; idx += 1) {
    const value = bytes[idx];
    output += String.fromCharCode(value < 0 ? value + 256 : value);
  }

  return output;
}

function astStorageBytesLength(bytes) {
  if (!bytes) {
    return 0;
  }

  if (Array.isArray(bytes)) {
    return bytes.length;
  }

  if (typeof bytes.length === 'number') {
    return bytes.length;
  }

  return 0;
}

function astStorageIsTextMimeType(mimeType) {
  const normalized = astStorageNormalizeString(mimeType, '').toLowerCase();
  if (!normalized) {
    return false;
  }

  return (
    normalized.startsWith('text/') ||
    normalized.includes('json') ||
    normalized.includes('xml') ||
    normalized.includes('javascript')
  );
}

function astStorageBuildReadData(base64, mimeType = 'application/octet-stream') {
  const normalizedMimeType = astStorageNormalizeMimeType(mimeType, 'application/octet-stream');
  const out = {
    base64,
    mimeType: normalizedMimeType
  };

  if (!astStorageIsTextMimeType(normalizedMimeType)) {
    return out;
  }

  try {
    const text = astStorageBase64ToText(base64);
    out.text = text;

    if (normalizedMimeType.includes('json')) {
      try {
        out.json = JSON.parse(text);
      } catch (error) {
        // Keep text even when json parsing fails.
      }
    }
  } catch (error) {
    // Base64 decode failure should not break binary read response.
  }

  return out;
}

function astStorageNormalizeReadMimeType(responseHeaders = {}, fallback = 'application/octet-stream') {
  if (astStorageIsPlainObject(responseHeaders)) {
    const key = Object.keys(responseHeaders).find(header => {
      return String(header || '').toLowerCase() === 'content-type';
    });

    if (key) {
      return astStorageNormalizeMimeType(responseHeaders[key], fallback);
    }
  }

  return astStorageNormalizeMimeType(fallback, 'application/octet-stream');
}

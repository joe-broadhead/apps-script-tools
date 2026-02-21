function astRagComputeChecksum(payload) {
  const normalized = typeof payload === 'string' ? payload : astRagStableStringify(payload);

  if (typeof sha256Hash === 'function') {
    return sha256Hash(normalized);
  }

  if (typeof Utilities !== 'undefined' && Utilities && typeof Utilities.computeDigest === 'function') {
    const digest = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      normalized,
      Utilities.Charset.UTF_8
    );

    return digest.map(byte => {
      const hex = (byte & 0xFF).toString(16);
      return hex.length === 1 ? `0${hex}` : hex;
    }).join('');
  }

  return String(normalized.length);
}

function astRagBuildSourceFingerprint(sourceDescriptor, extracted = {}) {
  const payload = {
    fileId: sourceDescriptor.fileId,
    fileName: sourceDescriptor.fileName,
    mimeType: sourceDescriptor.mimeType,
    modifiedTime: sourceDescriptor.modifiedTime,
    textHash: astRagComputeChecksum(extracted.combinedText || ''),
    segments: Array.isArray(extracted.segments) ? extracted.segments.length : 0
  };

  return astRagComputeChecksum(payload);
}

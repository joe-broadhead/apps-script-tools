function astTelemetryGetDriveFolder(config = {}) {
  if (typeof DriveApp === 'undefined' || !DriveApp) {
    throw new AstTelemetryCapabilityError('DriveApp is required for telemetry drive_json sink');
  }

  const folderId = astTelemetryNormalizeString(config.driveFolderId, null);
  if (!folderId) {
    if (typeof DriveApp.getRootFolder !== 'function') {
      throw new AstTelemetryCapabilityError('DriveApp.getRootFolder is not available');
    }
    return DriveApp.getRootFolder();
  }

  if (typeof DriveApp.getFolderById !== 'function') {
    throw new AstTelemetryCapabilityError('DriveApp.getFolderById is not available');
  }

  return DriveApp.getFolderById(folderId);
}

function astTelemetryResolveDriveFile(folder, fileName) {
  if (!folder || typeof folder.getFilesByName !== 'function') {
    throw new AstTelemetryCapabilityError('Drive folder handle does not support getFilesByName');
  }

  const filesIterator = folder.getFilesByName(fileName);
  if (filesIterator && typeof filesIterator.hasNext === 'function' && filesIterator.hasNext()) {
    return filesIterator.next();
  }

  if (typeof folder.createFile !== 'function') {
    throw new AstTelemetryCapabilityError('Drive folder handle does not support createFile');
  }

  return folder.createFile(fileName, '', 'application/x-ndjson');
}

function astTelemetryReadDriveText(file) {
  if (!file) {
    return '';
  }

  if (typeof file.getBlob === 'function') {
    const blob = file.getBlob();
    if (blob && typeof blob.getDataAsString === 'function') {
      return String(blob.getDataAsString() || '');
    }
  }

  if (typeof file.getDataAsString === 'function') {
    return String(file.getDataAsString() || '');
  }

  return '';
}

function astTelemetryWriteDriveText(file, content) {
  if (!file) {
    throw new AstTelemetryCapabilityError('Drive file handle is not available');
  }

  if (typeof file.setContent === 'function') {
    file.setContent(content);
    return;
  }

  if (typeof file.setDataFromString === 'function') {
    file.setDataFromString(content);
    return;
  }

  throw new AstTelemetryCapabilityError('Drive file handle does not support content updates');
}

function astTelemetrySinkDriveJson(record, config = {}) {
  const safeFileName = astTelemetryNormalizeString(config.driveFileName, 'ast-telemetry.ndjson');
  const line = astTelemetryTryOrFallback(
    () => JSON.stringify(record),
    '{"error":"telemetry-serialize-failed"}'
  );
  const folder = astTelemetryGetDriveFolder(config);
  const file = astTelemetryResolveDriveFile(folder, safeFileName);
  const existing = astTelemetryReadDriveText(file);
  const nextContent = existing ? `${existing}\n${line}` : line;
  astTelemetryWriteDriveText(file, nextContent);
}

const __astTelemetrySinkDriveRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astTelemetrySinkDriveRoot.astTelemetrySinkDriveJson = astTelemetrySinkDriveJson;
this.astTelemetrySinkDriveJson = astTelemetrySinkDriveJson;

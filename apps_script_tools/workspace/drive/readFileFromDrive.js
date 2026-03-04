function readFileFromDrive(fileId, fileType, options = {}) {
  const normalizedFileId = astWorkspaceValidateDriveFileId_(fileId);
  const normalizedFileType = astWorkspaceValidateDriveFileType_(fileType);
  const normalizedOptions = astWorkspaceNormalizeReadFileOptions_(options);

  const file = astWorkspaceOpenDriveFileById_(normalizedFileId);
  let content = '';
  try {
    content = file.getBlob().getDataAsString();
  } catch (error) {
    throw new AstWorkspaceProviderError(
      'Unable to read file content from Drive',
      { operation: 'drive.read', fileId: normalizedFileId, fileType: normalizedFileType },
      error
    );
  }

  switch (normalizedFileType) {
    case 'txt':
      return content;

    case 'json':
      try {
        return JSON.parse(content);
      } catch (error) {
        throw new AstWorkspaceParseError(
          'Unable to parse JSON file content',
          { operation: 'drive.read', fileId: normalizedFileId, fileType: normalizedFileType },
          error
        );
      }
      
    case 'csv':
      try {
        const csvArrays = Utilities.parseCsv(content, normalizedOptions.delimiter);
        return zipArraysIntoRecords(csvArrays, normalizedOptions.headerRow);
      } catch (error) {
        throw new AstWorkspaceParseError(
          'Unable to parse CSV file content',
          {
            operation: 'drive.read',
            fileId: normalizedFileId,
            fileType: normalizedFileType,
            delimiter: normalizedOptions.delimiter,
            headerRow: normalizedOptions.headerRow
          },
          error
        );
      }
      
    default:
      throw new AstWorkspaceCapabilityError('Unsupported file type. Use "txt", "json" or "csv".', {
        operation: 'drive.read',
        fileType: normalizedFileType
      });
  }
}

function astWorkspaceValidateDriveFileId_(fileId) {
  const value = astWorkspaceNormalizeDriveString_(fileId, '');
  if (!value) {
    throw new AstWorkspaceValidationError('fileId is required');
  }
  return value;
}

function astWorkspaceValidateDriveFileType_(fileType) {
  const value = astWorkspaceNormalizeDriveString_(fileType, '').toLowerCase();
  if (!value) {
    throw new AstWorkspaceValidationError('fileType is required');
  }
  const supported = { txt: true, json: true, csv: true };
  if (!supported[value]) {
    throw new AstWorkspaceValidationError('Unsupported file type. Use "txt", "json" or "csv".', {
      fileType: value
    });
  }
  return value;
}

function astWorkspaceNormalizeReadFileOptions_(options) {
  if (options == null) {
    return { headerRow: 0, delimiter: ',' };
  }
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new AstWorkspaceValidationError('options must be an object');
  }

  const out = {
    headerRow: options.headerRow == null ? 0 : options.headerRow,
    delimiter: options.delimiter == null ? ',' : options.delimiter
  };

  if (!Number.isFinite(out.headerRow) || Math.floor(out.headerRow) !== out.headerRow || out.headerRow < 0) {
    throw new AstWorkspaceValidationError('options.headerRow must be a non-negative integer', {
      headerRow: out.headerRow
    });
  }

  out.delimiter = astWorkspaceNormalizeDriveString_(out.delimiter, '');
  if (!out.delimiter) {
    throw new AstWorkspaceValidationError('options.delimiter must be a non-empty string');
  }

  return out;
}

function astWorkspaceOpenDriveFileById_(fileId) {
  let file = null;
  try {
    file = DriveApp.getFileById(fileId);
  } catch (error) {
    throw astWorkspaceMapDriveProviderError_(
      'Unable to load file from Drive',
      { operation: 'drive.read', fileId: fileId },
      error
    );
  }

  if (!file) {
    throw new AstWorkspaceNotFoundError('Drive file not found', {
      operation: 'drive.read',
      fileId: fileId
    });
  }
  return file;
}

function astWorkspaceMapDriveProviderError_(message, details, error) {
  if (error && error.name && String(error.name).indexOf('AstWorkspace') === 0) {
    return error;
  }

  const text = astWorkspaceNormalizeDriveString_(error && error.message, '').toLowerCase();
  if (text.indexOf('not found') >= 0 || text.indexOf('no item with the given id') >= 0) {
    return new AstWorkspaceNotFoundError(message, details, error);
  }
  return new AstWorkspaceProviderError(message, details, error);
}

function astWorkspaceNormalizeDriveString_(value, fallback = '') {
  if (value == null) {
    return fallback;
  }
  if (typeof value !== 'string') {
    return fallback;
  }
  return value.trim();
}

function createFileInDrive(fileType, fileName, options = {}) {
  const normalizedFileType = astWorkspaceNormalizeCreateFileType_(fileType);
  const normalizedFileName = astWorkspaceNormalizeCreateFileName_(fileName);
  const normalizedOptions = astWorkspaceNormalizeCreateFileOptions_(options);
  let newFile;

  switch (normalizedFileType) {
    case `spreadsheet`:
      newFile = astWorkspaceRunCreateOperation_(
        () => SpreadsheetApp.create(normalizedFileName),
        normalizedFileType,
        normalizedFileName
      );
      break;

    case `document`:
      newFile = astWorkspaceRunCreateOperation_(
        () => DocumentApp.create(normalizedFileName),
        normalizedFileType,
        normalizedFileName
      );
      break;

    case `presentation`:
      newFile = astWorkspaceRunCreateOperation_(
        () => SlidesApp.create(normalizedFileName),
        normalizedFileType,
        normalizedFileName
      );
      break;

    case `form`:
      newFile = astWorkspaceRunCreateOperation_(
        () => FormApp.create(normalizedFileName),
        normalizedFileType,
        normalizedFileName
      );
      break;

    case `json`:
      astWorkspaceValidateCreateRecords_(normalizedOptions.content, normalizedFileType);
      newFile = astWorkspaceRunCreateOperation_(
        () => {
          const jsonContent = JSON.stringify(normalizedOptions.content, null, 2);
          return DriveApp.createFile(`${normalizedFileName}.json`, jsonContent);
        },
        normalizedFileType,
        normalizedFileName
      );
      break;

    case `csv`:
      astWorkspaceValidateCreateRecords_(normalizedOptions.content, normalizedFileType);
      newFile = astWorkspaceRunCreateOperation_(
        () => {
          const csvContent = convertRecordsToCsvFormat(normalizedOptions.content);
          return DriveApp.createFile(`${normalizedFileName}.csv`, csvContent);
        },
        normalizedFileType,
        normalizedFileName
      );
      break;

    default:
      throw new AstWorkspaceCapabilityError('Unsupported file type', { fileType: normalizedFileType });
  }

  if (normalizedOptions.destinationFolder) {
    astWorkspaceValidateDestinationFolder_(normalizedOptions.destinationFolder);

    const normalizedFileId = astWorkspaceNormalizeCreateFileId_(newFile && newFile.getId && newFile.getId());
    if (!normalizedFileId) {
      throw new AstWorkspaceProviderError('Unable to resolve created file id', {
        operation: 'drive.create',
        fileType: normalizedFileType,
        fileName: normalizedFileName
      });
    }

    try {
      const file = DriveApp.getFileById(newFile.getId());
      if (!file) {
        throw new AstWorkspaceNotFoundError('Created Drive file not found', {
          operation: 'drive.create',
          fileId: normalizedFileId,
          fileType: normalizedFileType,
          fileName: normalizedFileName
        });
      }
      file.moveTo(normalizedOptions.destinationFolder);
    } catch (error) {
      throw astWorkspaceMapCreateDriveProviderError_(
        'Unable to move created file to destination folder',
        {
          operation: 'drive.create',
          fileId: normalizedFileId,
          fileType: normalizedFileType,
          fileName: normalizedFileName
        },
        error
      );
    }
  }

  return newFile;
}

function astWorkspaceNormalizeCreateFileType_(fileType) {
  const value = astWorkspaceNormalizeCreateString_(fileType, '').toLowerCase();
  if (!value) {
    throw new AstWorkspaceValidationError('fileType is required');
  }
  const supported = {
    spreadsheet: true,
    document: true,
    presentation: true,
    form: true,
    json: true,
    csv: true
  };
  if (!supported[value]) {
    throw new AstWorkspaceValidationError('Unsupported file type', { fileType: value });
  }
  return value;
}

function astWorkspaceNormalizeCreateFileName_(fileName) {
  const value = astWorkspaceNormalizeCreateString_(fileName, '');
  if (!value) {
    throw new AstWorkspaceValidationError('fileName is required');
  }
  return value;
}

function astWorkspaceNormalizeCreateFileOptions_(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new AstWorkspaceValidationError('options must be an object');
  }
  return {
    content: options.content == null ? null : options.content,
    destinationFolder: options.destinationFolder == null ? null : options.destinationFolder
  };
}

function astWorkspaceValidateCreateRecords_(records, fileType) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new AstWorkspaceValidationError(
      'Valid records are required to create this file type.',
      { fileType: fileType }
    );
  }
}

function astWorkspaceValidateDestinationFolder_(destinationFolder) {
  if (!destinationFolder || typeof destinationFolder !== 'object') {
    throw new AstWorkspaceValidationError('destinationFolder must be a folder object');
  }
}

function astWorkspaceNormalizeCreateFileId_(fileId) {
  return astWorkspaceNormalizeCreateString_(fileId, '');
}

function astWorkspaceRunCreateOperation_(createFn, fileType, fileName) {
  try {
    return createFn();
  } catch (error) {
    throw astWorkspaceMapCreateDriveProviderError_(
      'Unable to create file in Drive',
      {
        operation: 'drive.create',
        fileType: fileType,
        fileName: fileName
      },
      error
    );
  }
}

function astWorkspaceMapCreateDriveProviderError_(message, details, error) {
  if (error && error.name && String(error.name).indexOf('AstWorkspace') === 0) {
    return error;
  }

  const text = astWorkspaceNormalizeCreateString_(error && error.message, '').toLowerCase();
  if (text.indexOf('not found') >= 0 || text.indexOf('no item with the given id') >= 0) {
    return new AstWorkspaceNotFoundError(message, details, error);
  }
  return new AstWorkspaceProviderError(message, details, error);
}

function astWorkspaceNormalizeCreateString_(value, fallback = '') {
  if (value == null) {
    return fallback;
  }
  if (typeof value !== 'string') {
    return fallback;
  }
  return value.trim();
}

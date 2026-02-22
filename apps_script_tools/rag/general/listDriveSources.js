function astRagCollectDriveFiles(folder, includeSubfolders, output) {
  const filesIterator = folder.getFiles();
  while (filesIterator.hasNext()) {
    output.push(filesIterator.next());
  }

  if (!includeSubfolders) {
    return;
  }

  const foldersIterator = folder.getFolders();
  while (foldersIterator.hasNext()) {
    const subfolder = foldersIterator.next();
    astRagCollectDriveFiles(subfolder, includeSubfolders, output);
  }
}

function astRagSortDriveSourcesDeterministically(sources) {
  const list = Array.isArray(sources) ? sources.slice() : [];
  list.sort((left, right) => {
    const leftId = astRagNormalizeString(left.fileId, '') || '';
    const rightId = astRagNormalizeString(right.fileId, '') || '';
    if (leftId < rightId) {
      return -1;
    }
    if (leftId > rightId) {
      return 1;
    }
    return 0;
  });
  return list;
}

function astRagListDriveSources(sourceRequest, options = {}) {
  if (!sourceRequest || typeof sourceRequest !== 'object') {
    throw new AstRagValidationError('Source request is required');
  }

  if (typeof DriveApp === 'undefined' || !DriveApp || typeof DriveApp.getFolderById !== 'function') {
    throw new AstRagSourceError('DriveApp.getFolderById is not available');
  }

  const folder = DriveApp.getFolderById(sourceRequest.folderId);
  const files = [];
  astRagCollectDriveFiles(folder, sourceRequest.includeSubfolders, files);

  const excluded = new Set(sourceRequest.excludeFileIds || []);
  const includeSet = new Set(sourceRequest.includeMimeTypes || AST_RAG_SUPPORTED_MIME_TYPES);
  const maxFiles = astRagNormalizePositiveInt(options.maxFiles, AST_RAG_DEFAULT_OPTIONS.maxFiles, 1);

  const output = [];
  for (let idx = 0; idx < files.length; idx += 1) {
    const file = files[idx];
    const fileId = file.getId();

    if (excluded.has(fileId)) {
      continue;
    }

    const mimeType = file.getMimeType();
    if (!includeSet.has(mimeType)) {
      continue;
    }

    output.push({
      fileId,
      fileName: file.getName(),
      mimeType,
      modifiedTime: file.getLastUpdated ? file.getLastUpdated().toISOString() : null,
      driveFile: file
    });

    if (output.length >= maxFiles) {
      break;
    }
  }

  return astRagSortDriveSourcesDeterministically(output);
}

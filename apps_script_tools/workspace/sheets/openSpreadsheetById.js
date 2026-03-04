function openSpreadsheetById(spreadsheetId) {
  const normalizedSpreadsheetId = astWorkspaceValidateSpreadsheetId_(spreadsheetId);

  try {
    const spreadsheet = SpreadsheetApp.openById(normalizedSpreadsheetId);
    if (!spreadsheet) {
      throw new AstWorkspaceNotFoundError(
        'Spreadsheet not found',
        { operation: 'sheets.open_by_id', spreadsheetId: normalizedSpreadsheetId }
      );
    }
    return new EnhancedSpreadsheet(spreadsheet);
  } catch (error) {
    throw astWorkspaceMapSheetsProviderError_(
      'Unable to open spreadsheet by id',
      { operation: 'sheets.open_by_id', spreadsheetId: normalizedSpreadsheetId },
      error
    );
  }
}

function astWorkspaceValidateSpreadsheetId_(spreadsheetId) {
  const value = astWorkspaceNormalizeWorkspaceString_(spreadsheetId, '');
  if (!value) {
    throw new AstWorkspaceValidationError('spreadsheetId is required');
  }
  if (/^https?:\/\//i.test(value)) {
    throw new AstWorkspaceValidationError('spreadsheetId must be an ID, not a URL', { spreadsheetId: value });
  }
  return value;
}

function astWorkspaceNormalizeWorkspaceString_(value, fallback = '') {
  if (value == null) {
    return fallback;
  }
  if (typeof value !== 'string') {
    return fallback;
  }
  return value.trim();
}

function astWorkspaceMapSheetsProviderError_(message, details, error) {
  if (error && error.name && String(error.name).indexOf('AstWorkspace') === 0) {
    return error;
  }

  const text = astWorkspaceNormalizeWorkspaceString_(error && error.message, '').toLowerCase();
  if (text.indexOf('not found') >= 0 || text.indexOf('cannot find') >= 0) {
    return new AstWorkspaceNotFoundError(message, details, error);
  }
  return new AstWorkspaceProviderError(message, details, error);
}

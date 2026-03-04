function openSpreadsheetByUrl(spreadsheetUrl) {
  const normalizedSpreadsheetUrl = astWorkspaceValidateSpreadsheetUrl_(spreadsheetUrl);

  try {
    const spreadsheet = SpreadsheetApp.openByUrl(normalizedSpreadsheetUrl);
    if (!spreadsheet) {
      throw new AstWorkspaceNotFoundError(
        'Spreadsheet not found',
        { operation: 'sheets.open_by_url', spreadsheetUrl: normalizedSpreadsheetUrl }
      );
    }
    return new EnhancedSpreadsheet(spreadsheet);
  } catch (error) {
    throw astWorkspaceMapSheetsProviderErrorByUrl_(
      'Unable to open spreadsheet by url',
      { operation: 'sheets.open_by_url', spreadsheetUrl: normalizedSpreadsheetUrl },
      error
    );
  }
}

function astWorkspaceValidateSpreadsheetUrl_(spreadsheetUrl) {
  const value = astWorkspaceNormalizeWorkspaceUrlString_(spreadsheetUrl, '');
  if (!value) {
    throw new AstWorkspaceValidationError('spreadsheetUrl is required');
  }
  if (!/^https:\/\/docs\.google\.com\/spreadsheets\//i.test(value)) {
    throw new AstWorkspaceValidationError(
      'spreadsheetUrl must be a Google Sheets URL',
      { spreadsheetUrl: value }
    );
  }
  return value;
}

function astWorkspaceNormalizeWorkspaceUrlString_(value, fallback = '') {
  if (value == null) {
    return fallback;
  }
  if (typeof value !== 'string') {
    return fallback;
  }
  return value.trim();
}

function astWorkspaceMapSheetsProviderErrorByUrl_(message, details, error) {
  if (error && error.name && String(error.name).indexOf('AstWorkspace') === 0) {
    return error;
  }

  const text = astWorkspaceNormalizeWorkspaceUrlString_(error && error.message, '').toLowerCase();
  if (text.indexOf('not found') >= 0 || text.indexOf('cannot find') >= 0) {
    return new AstWorkspaceNotFoundError(message, details, error);
  }
  return new AstWorkspaceProviderError(message, details, error);
}

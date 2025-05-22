function openSpreadsheetById(spreadsheetId) {
  return new EnhancedSpreadsheet(SpreadsheetApp.openById(spreadsheetId));
};

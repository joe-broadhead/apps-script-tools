function openSpreadsheetByUrl(spreadsheetUrl) {
  return new EnhancedSpreadsheet(SpreadsheetApp.openByUrl(spreadsheetUrl));
};

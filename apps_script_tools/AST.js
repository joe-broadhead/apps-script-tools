const AST = {};
const AST_GLOBAL = typeof globalThis !== 'undefined' ? globalThis : this;

function resolveAstBinding(name, lexicalResolver) {
  if (typeof lexicalResolver === 'function') {
    const lexicalValue = lexicalResolver();
    if (typeof lexicalValue !== 'undefined') {
      return lexicalValue;
    }
  }
  return AST_GLOBAL[name];
}

Object.defineProperties(AST, {
  VERSION: {
    value: '0.0.0',
    enumerable: true
  },
  Series: {
    get: () => resolveAstBinding('Series', () => (typeof Series === 'undefined' ? undefined : Series)),
    enumerable: true
  },
  DataFrame: {
    get: () => resolveAstBinding('DataFrame', () => (typeof DataFrame === 'undefined' ? undefined : DataFrame)),
    enumerable: true
  },
  GroupBy: {
    get: () => resolveAstBinding('GroupBy', () => (typeof GroupBy === 'undefined' ? undefined : GroupBy)),
    enumerable: true
  },
  Sheets: {
    get: () => ({
      openById: resolveAstBinding('openSpreadsheetById', () => (typeof openSpreadsheetById === 'undefined' ? undefined : openSpreadsheetById)),
      openByUrl: resolveAstBinding('openSpreadsheetByUrl', () => (typeof openSpreadsheetByUrl === 'undefined' ? undefined : openSpreadsheetByUrl)),
      EnhancedSheet: resolveAstBinding('EnhancedSheet', () => (typeof EnhancedSheet === 'undefined' ? undefined : EnhancedSheet)),
      EnhancedSpreadsheet: resolveAstBinding('EnhancedSpreadsheet', () => (typeof EnhancedSpreadsheet === 'undefined' ? undefined : EnhancedSpreadsheet)),
      numberToSheetRangeNotation: resolveAstBinding('numberToSheetRangeNotation', () => (typeof numberToSheetRangeNotation === 'undefined' ? undefined : numberToSheetRangeNotation))
    }),
    enumerable: true
  },
  Drive: {
    get: () => ({
      read: resolveAstBinding('readFileFromDrive', () => (typeof readFileFromDrive === 'undefined' ? undefined : readFileFromDrive)),
      create: resolveAstBinding('createFileInDrive', () => (typeof createFileInDrive === 'undefined' ? undefined : createFileInDrive))
    }),
    enumerable: true
  },
  Sql: {
    get: () => ({
      run: resolveAstBinding('runSqlQuery', () => (typeof runSqlQuery === 'undefined' ? undefined : runSqlQuery))
    }),
    enumerable: true
  }
});

this.AST = AST;

const AST = {};
const AST_GLOBAL = typeof globalThis !== 'undefined' ? globalThis : this;
const AST_UTILITY_NAMES = Object.freeze([
  'addValues',
  'applySchemaToObject',
  'applySchemaToRecords',
  'applyTransformationsToObject',
  'applyTransformationsToRecords',
  'arrayApply',
  'arrayAstype',
  'arrayChunk',
  'arrayClip',
  'arrayCumsum',
  'arrayDifference',
  'arrayFromRange',
  'arrayIntersect',
  'arrayLen',
  'arrayMax',
  'arrayMean',
  'arrayMedian',
  'arrayMin',
  'arrayMode',
  'arrayNunique',
  'arrayProduct',
  'arrayRange',
  'arrayRank',
  'arrayRolling',
  'arraySort',
  'arrayStandardDeviation',
  'arraySum',
  'arrayTranspose',
  'arrayUnion',
  'arrayUnique',
  'arrayValueCounts',
  'arrayVariance',
  'checkRecordsAreConsistent',
  'clipValues',
  'coerceValues',
  'concatValues',
  'convertDateToUnixTimestamp',
  'convertIntervalToDurationInMilliseconds',
  'convertMillisecondsToInterval',
  'convertRecordsToCsvFormat',
  'dateAdd',
  'dateDiff',
  'dateSub',
  'decrypt',
  'divideValues',
  'encrypt',
  'flattenObject',
  'getValueAtPath',
  'groupRecordsOnKeys',
  'joinRecordsOnKeys',
  'multiplyValues',
  'newlineJsonToRecords',
  'normalizeValues',
  'pad',
  'recordsToNewlineJson',
  'removeDuplicatesFromRecords',
  'removeKeysFromObject',
  'renameKeysInObject',
  'renameKeysInRecords',
  'selectKeysFromObject',
  'sha256Hash',
  'standardizeArrays',
  'standardizeRecords',
  'subtractValues',
  'toCapitalCase',
  'toSnakeCase',
  'toTitleCase',
  'unzipObjectIntoArrays',
  'unzipRecordsIntoArrays',
  'zfill',
  'zipArraysIntoObject',
  'zipArraysIntoRecords'
]);
const AST_UTILS = {};

function resolveAstBinding(name, lexicalResolver) {
  if (typeof lexicalResolver === 'function') {
    const lexicalValue = lexicalResolver();
    if (typeof lexicalValue !== 'undefined') {
      return lexicalValue;
    }
  }
  return AST_GLOBAL[name];
}

AST_UTILITY_NAMES.forEach(name => {
  Object.defineProperty(AST_UTILS, name, {
    get: () => resolveAstBinding(name, () => AST_GLOBAL[name]),
    enumerable: true
  });
});

Object.freeze(AST_UTILS);

Object.defineProperties(AST, {
  VERSION: {
    value: '0.0.4',
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
  AI: {
    get: () => resolveAstBinding('AST_AI', () => (typeof AST_AI === 'undefined' ? undefined : AST_AI)),
    enumerable: true
  },
  RAG: {
    get: () => resolveAstBinding('AST_RAG', () => (typeof AST_RAG === 'undefined' ? undefined : AST_RAG)),
    enumerable: true
  },
  Storage: {
    get: () => resolveAstBinding('AST_STORAGE', () => (typeof AST_STORAGE === 'undefined' ? undefined : AST_STORAGE)),
    enumerable: true
  },
  Sql: {
    get: () => ({
      run: resolveAstBinding('runSqlQuery', () => (typeof runSqlQuery === 'undefined' ? undefined : runSqlQuery))
    }),
    enumerable: true
  },
  Utils: {
    value: AST_UTILS,
    enumerable: true
  }
});

this.AST = AST;

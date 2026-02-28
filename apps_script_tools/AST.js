/**
 * Public namespace facade for apps-script-tools.
 * Exposes lazy getters so module globals can resolve safely in Apps Script load order.
 */
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

/**
 * Resolve a symbol first from local lexical scope fallback, then global scope.
 *
 * @param {string} name
 * @param {Function} lexicalResolver
 * @returns {*}
 */
function astResolveAstBinding(name, lexicalResolver) {
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
    get: () => astResolveAstBinding(name, () => AST_GLOBAL[name]),
    enumerable: true
  });
});

Object.freeze(AST_UTILS);

Object.defineProperties(AST, {
  VERSION: {
    value: '0.0.5',
    enumerable: true
  },
  Series: {
    get: () => astResolveAstBinding('Series', () => (typeof Series === 'undefined' ? undefined : Series)),
    enumerable: true
  },
  DataFrame: {
    get: () => astResolveAstBinding('DataFrame', () => (typeof DataFrame === 'undefined' ? undefined : DataFrame)),
    enumerable: true
  },
  GroupBy: {
    get: () => astResolveAstBinding('GroupBy', () => (typeof GroupBy === 'undefined' ? undefined : GroupBy)),
    enumerable: true
  },
  Sheets: {
    get: () => ({
      openById: astResolveAstBinding('openSpreadsheetById', () => (typeof openSpreadsheetById === 'undefined' ? undefined : openSpreadsheetById)),
      openByUrl: astResolveAstBinding('openSpreadsheetByUrl', () => (typeof openSpreadsheetByUrl === 'undefined' ? undefined : openSpreadsheetByUrl)),
      EnhancedSheet: astResolveAstBinding('EnhancedSheet', () => (typeof EnhancedSheet === 'undefined' ? undefined : EnhancedSheet)),
      EnhancedSpreadsheet: astResolveAstBinding('EnhancedSpreadsheet', () => (typeof EnhancedSpreadsheet === 'undefined' ? undefined : EnhancedSpreadsheet)),
      numberToSheetRangeNotation: astResolveAstBinding('numberToSheetRangeNotation', () => (typeof numberToSheetRangeNotation === 'undefined' ? undefined : numberToSheetRangeNotation))
    }),
    enumerable: true
  },
  Drive: {
    get: () => ({
      read: astResolveAstBinding('readFileFromDrive', () => (typeof readFileFromDrive === 'undefined' ? undefined : readFileFromDrive)),
      create: astResolveAstBinding('createFileInDrive', () => (typeof createFileInDrive === 'undefined' ? undefined : createFileInDrive))
    }),
    enumerable: true
  },
  AI: {
    get: () => astResolveAstBinding('AST_AI', () => (typeof AST_AI === 'undefined' ? undefined : AST_AI)),
    enumerable: true
  },
  RAG: {
    get: () => astResolveAstBinding('AST_RAG', () => (typeof AST_RAG === 'undefined' ? undefined : AST_RAG)),
    enumerable: true
  },
  DBT: {
    get: () => astResolveAstBinding('AST_DBT', () => (typeof AST_DBT === 'undefined' ? undefined : AST_DBT)),
    enumerable: true
  },
  Cache: {
    get: () => astResolveAstBinding('AST_CACHE', () => (typeof AST_CACHE === 'undefined' ? undefined : AST_CACHE)),
    enumerable: true
  },
  Storage: {
    get: () => astResolveAstBinding('AST_STORAGE', () => (typeof AST_STORAGE === 'undefined' ? undefined : AST_STORAGE)),
    enumerable: true
  },
  Secrets: {
    get: () => astResolveAstBinding('AST_SECRETS', () => (typeof AST_SECRETS === 'undefined' ? undefined : AST_SECRETS)),
    enumerable: true
  },
  Config: {
    get: () => astResolveAstBinding('AST_CONFIG', () => (typeof AST_CONFIG === 'undefined' ? undefined : AST_CONFIG)),
    enumerable: true
  },
  Runtime: {
    get: () => astResolveAstBinding('AST_RUNTIME', () => (typeof AST_RUNTIME === 'undefined' ? undefined : AST_RUNTIME)),
    enumerable: true
  },
  Telemetry: {
    get: () => astResolveAstBinding('AST_TELEMETRY', () => (typeof AST_TELEMETRY === 'undefined' ? undefined : AST_TELEMETRY)),
    enumerable: true
  },
  TelemetryHelpers: {
    get: () => astResolveAstBinding('AST_TELEMETRY_HELPERS', () => (typeof AST_TELEMETRY_HELPERS === 'undefined' ? undefined : AST_TELEMETRY_HELPERS)),
    enumerable: true
  },
  Jobs: {
    get: () => astResolveAstBinding('AST_JOBS', () => (typeof AST_JOBS === 'undefined' ? undefined : AST_JOBS)),
    enumerable: true
  },
  Triggers: {
    get: () => astResolveAstBinding('AST_TRIGGERS', () => (typeof AST_TRIGGERS === 'undefined' ? undefined : AST_TRIGGERS)),
    enumerable: true
  },
  Chat: {
    get: () => astResolveAstBinding('AST_CHAT', () => (typeof AST_CHAT === 'undefined' ? undefined : AST_CHAT)),
    enumerable: true
  },
  GitHub: {
    get: () => astResolveAstBinding('AST_GITHUB', () => (typeof AST_GITHUB === 'undefined' ? undefined : AST_GITHUB)),
    enumerable: true
  },
  Sql: {
    get: () => ({
      run: astResolveAstBinding('runSqlQuery', () => (typeof runSqlQuery === 'undefined' ? undefined : runSqlQuery)),
      prepare: astResolveAstBinding('astSqlPrepare', () => (typeof astSqlPrepare === 'undefined' ? undefined : astSqlPrepare)),
      executePrepared: astResolveAstBinding('astSqlExecutePrepared', () => (typeof astSqlExecutePrepared === 'undefined' ? undefined : astSqlExecutePrepared)),
      status: astResolveAstBinding('astSqlStatus', () => (typeof astSqlStatus === 'undefined' ? undefined : astSqlStatus)),
      cancel: astResolveAstBinding('astSqlCancel', () => (typeof astSqlCancel === 'undefined' ? undefined : astSqlCancel)),
      providers: astResolveAstBinding('astListSqlProviders', () => (typeof astListSqlProviders === 'undefined' ? undefined : astListSqlProviders)),
      capabilities: astResolveAstBinding('astGetSqlProviderCapabilities', () => (typeof astGetSqlProviderCapabilities === 'undefined' ? undefined : astGetSqlProviderCapabilities))
    }),
    enumerable: true
  },
  Utils: {
    value: AST_UTILS,
    enumerable: true
  }
});

this.AST = AST;

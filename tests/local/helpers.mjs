import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';

const ROOT = process.cwd();

export function createGasContext(overrides = {}) {
  const base = {
    console,
    Date,
    Logger: {
      log: () => {},
      error: () => {},
      warn: () => {}
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      Charset: { UTF_8: 'UTF_8' },
      computeDigest: (_alg, input) => {
        const buffer = crypto.createHash('sha256').update(String(input), 'utf8').digest();
        return Array.from(buffer.values()).map(byte => (byte > 127 ? byte - 256 : byte));
      },
      sleep: () => {},
      parseCsv: (value, delimiter = ',') => String(value).split('\n').map(line => line.split(delimiter)),
      newBlob: (data, _mime, name) => ({
        getDataAsString: () => String(data),
        getName: () => name
      }),
      formatDate: date => {
        const d = new Date(date);
        return d.toISOString().slice(0, 10);
      }
    },
    BigQuery: {
      Jobs: {
        query: () => ({
          jobReference: { jobId: 'job-1' },
          jobComplete: true,
          schema: { fields: [] },
          rows: undefined
        }),
        getQueryResults: () => ({ jobComplete: true, schema: { fields: [] }, rows: undefined }),
        insert: () => ({ jobReference: { jobId: 'job-1' }, status: { state: 'DONE' } }),
        get: () => ({ status: { state: 'DONE' } })
      }
    },
    UrlFetchApp: { fetch: () => ({ getContentText: () => '{}' }) },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: () => null,
        getProperties: () => ({}),
        setProperties: () => {}
      })
    },
    ScriptApp: {
      getOAuthToken: () => 'test-oauth-token'
    },
    SpreadsheetApp: {},
    DriveApp: {},
    DocumentApp: {},
    SlidesApp: {},
    FormApp: {},
    ...overrides
  };

  const context = vm.createContext(base);
  context.globalThis = context;
  return context;
}

export function loadScripts(context, relativePaths) {
  for (const relativePath of relativePaths) {
    const fullPath = path.join(ROOT, relativePath);
    const source = fs.readFileSync(fullPath, 'utf8');
    vm.runInContext(source, context, { filename: relativePath });
  }
  return context;
}

export function listScriptFiles(relativeDir) {
  const directory = path.join(ROOT, relativeDir);
  const files = [];

  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        files.push(path.relative(ROOT, fullPath));
      }
    }
  }

  walk(directory);
  return files.sort();
}

export function loadCoreDataContext(context) {
  const utilityFiles = listScriptFiles('apps_script_tools/utilities');
  const coreFiles = [
    'apps_script_tools/series/_StringMethods.js',
    'apps_script_tools/series/_DateMethods.js',
    'apps_script_tools/series/Series.js',
    'apps_script_tools/groupBy/GroupBy.js',
    'apps_script_tools/dataFrame/DataFrame.js'
  ];

  loadScripts(context, [...utilityFiles, ...coreFiles]);
  return context;
}

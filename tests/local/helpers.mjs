import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

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
        let source;
        if (Array.isArray(input)) {
          source = Buffer.from(input.map(value => (value < 0 ? value + 256 : value)));
        } else if (Buffer.isBuffer(input)) {
          source = input;
        } else if (input instanceof Uint8Array) {
          source = Buffer.from(input);
        } else {
          source = Buffer.from(String(input), 'utf8');
        }

        const buffer = crypto.createHash('sha256').update(source).digest();
        return Array.from(buffer.values()).map(byte => (byte > 127 ? byte - 256 : byte));
      },
      computeHmacSha256Signature: (value, key) => {
        const normalize = input => {
          if (Array.isArray(input)) {
            return Buffer.from(input.map(entry => (entry < 0 ? entry + 256 : entry)));
          }
          if (Buffer.isBuffer(input)) {
            return input;
          }
          if (input instanceof Uint8Array) {
            return Buffer.from(input);
          }
          return Buffer.from(String(input), 'utf8');
        };

        const signature = crypto
          .createHmac('sha256', normalize(key))
          .update(normalize(value))
          .digest();

        return Array.from(signature.values()).map(byte => (byte > 127 ? byte - 256 : byte));
      },
      computeRsaSha256Signature: (value, key) => {
        const signature = crypto
          .createSign('RSA-SHA256')
          .update(String(value))
          .end()
          .sign(String(key));

        return Array.from(signature.values()).map(byte => (byte > 127 ? byte - 256 : byte));
      },
      sleep: () => {},
      base64Encode: value => {
        if (Array.isArray(value)) {
          const normalized = value.map(entry => (entry < 0 ? entry + 256 : entry));
          return Buffer.from(normalized).toString('base64');
        }
        return Buffer.from(String(value), 'utf8').toString('base64');
      },
      base64EncodeWebSafe: value => {
        const base64 = Array.isArray(value)
          ? Buffer.from(value.map(entry => (entry < 0 ? entry + 256 : entry))).toString('base64')
          : Buffer.from(String(value), 'utf8').toString('base64');
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
      },
      base64Decode: value => {
        const normalized = String(value || '')
          .replace(/-/g, '+')
          .replace(/_/g, '/');
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
        const bytes = Buffer.from(padded, 'base64');
        return Array.from(bytes.values()).map(byte => (byte > 127 ? byte - 256 : byte));
      },
      parseCsv: (value, delimiter = ',') => String(value).split('\n').map(line => line.split(delimiter)),
      newBlob: (data, _mime, name) => ({
        getDataAsString: () => {
          if (Array.isArray(data)) {
            return Buffer.from(data.map(entry => (entry < 0 ? entry + 256 : entry))).toString('utf8');
          }
          return String(data);
        },
        getName: () => name,
        getBytes: () => {
          if (Array.isArray(data)) {
            return data;
          }
          return Array.from(Buffer.from(String(data), 'utf8').values()).map(byte => (byte > 127 ? byte - 256 : byte));
        },
        getContentType: () => _mime || 'application/octet-stream'
      }),
      ungzip: blob => {
        const bytes = blob && typeof blob.getBytes === 'function'
          ? blob.getBytes()
          : [];
        const normalized = bytes.map(entry => (entry < 0 ? entry + 256 : entry));
        const output = zlib.gunzipSync(Buffer.from(normalized));
        return {
          getDataAsString: () => output.toString('utf8'),
          getBytes: () => Array.from(output.values()).map(byte => (byte > 127 ? byte - 256 : byte)),
          getContentType: () => 'application/json'
        };
      },
      gzip: blob => {
        const bytes = blob && typeof blob.getBytes === 'function'
          ? blob.getBytes()
          : [];
        const normalized = bytes.map(entry => (entry < 0 ? entry + 256 : entry));
        const output = zlib.gzipSync(Buffer.from(normalized));
        return {
          getDataAsString: () => output.toString('utf8'),
          getBytes: () => Array.from(output.values()).map(byte => (byte > 127 ? byte - 256 : byte)),
          getContentType: () => 'application/gzip'
        };
      },
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
    MimeType: {
      PLAIN_TEXT: 'text/plain'
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
  if (!context.__loadedScriptFiles || typeof context.__loadedScriptFiles !== 'object') {
    context.__loadedScriptFiles = {};
  }

  for (const relativePath of relativePaths) {
    if (context.__loadedScriptFiles[relativePath]) {
      continue;
    }

    const fullPath = path.join(ROOT, relativePath);
    const source = fs.readFileSync(fullPath, 'utf8');
    vm.runInContext(source, context, { filename: relativePath });
    context.__loadedScriptFiles[relativePath] = true;
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
  const dataFrameSchemaFiles = listScriptFiles('apps_script_tools/dataFrame/schema');
  const dataFrameExprFiles = listScriptFiles('apps_script_tools/dataFrame/expr');
  const coreFiles = [
    'apps_script_tools/series/_StringMethods.js',
    'apps_script_tools/series/_DateMethods.js',
    'apps_script_tools/series/_SeriesInternals.js',
    'apps_script_tools/series/Series.js',
    'apps_script_tools/groupBy/GroupBy.js',
    ...dataFrameSchemaFiles,
    ...dataFrameExprFiles,
    'apps_script_tools/dataFrame/_DataFrameInternals.js',
    'apps_script_tools/dataFrame/DataFrame.js'
  ];

  loadScripts(context, [...utilityFiles, ...coreFiles]);
  return context;
}

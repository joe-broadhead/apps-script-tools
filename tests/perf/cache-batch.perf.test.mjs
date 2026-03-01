import { performance } from 'node:perf_hooks';

import { createGasContext } from '../local/helpers.mjs';
import { loadCacheScripts } from '../local/cache-helpers.mjs';

function measureMs(task) {
  const start = performance.now();
  task();
  return performance.now() - start;
}

function buildSeedEntries(count) {
  const entries = [];
  for (let idx = 0; idx < count; idx += 1) {
    entries.push({
      key: `k:${idx}`,
      value: { idx, value: `v${idx}` }
    });
  }
  return entries;
}

function createDriveMock() {
  const files = {};

  function createFileHandle(name, content = '') {
    const state = {
      name,
      content: String(content || '')
    };

    return {
      getName: () => state.name,
      getBlob: () => ({
        getDataAsString: () => state.content
      }),
      setContent: value => {
        state.content = String(value || '');
      }
    };
  }

  const folder = {
    getFilesByName: name => {
      const key = String(name || '');
      const list = files[key] ? [files[key]] : [];
      let index = 0;
      return {
        hasNext: () => index < list.length,
        next: () => list[index++]
      };
    },
    createFile: (name, content) => {
      const key = String(name || '');
      const handle = createFileHandle(key, content);
      files[key] = handle;
      return handle;
    }
  };

  return {
    DriveApp: {
      getRootFolder: () => folder,
      getFolderById: () => folder
    }
  };
}

function createPropertiesService(seed = {}) {
  const store = { ...seed };
  const handle = {
    getProperty: key => {
      const normalized = String(key || '');
      return Object.prototype.hasOwnProperty.call(store, normalized) ? store[normalized] : null;
    },
    getProperties: () => ({ ...store }),
    setProperty: (key, value) => {
      store[String(key)] = String(value);
    },
    setProperties: (entries = {}, deleteAllOthers = false) => {
      if (deleteAllOthers) {
        Object.keys(store).forEach(key => delete store[key]);
      }

      const keys = Object.keys(entries || {});
      for (let idx = 0; idx < keys.length; idx += 1) {
        const key = keys[idx];
        store[String(key)] = String(entries[key]);
      }
    }
  };

  return {
    service: {
      getScriptProperties: () => handle
    }
  };
}

function createStorageRunnerMock() {
  const objects = {};

  function normalizeUri(uri) {
    return String(uri || '');
  }

  function buildNotFoundError() {
    const error = new Error('not found');
    error.name = 'AstStorageNotFoundError';
    return error;
  }

  function detectProvider(uri) {
    if (uri.startsWith('s3://')) return 's3';
    if (uri.startsWith('gcs://')) return 'gcs';
    return 'dbfs';
  }

  return {
    astRunStorageRequest: request => {
      const operation = String(request && request.operation || '').toLowerCase();
      const uri = normalizeUri(request && request.uri);
      const options = request && request.options ? request.options : {};

      if (!uri) {
        throw new Error('uri is required');
      }

      if (operation === 'list') {
        const keys = Object.keys(objects)
          .filter(key => key.startsWith(uri))
          .sort();
        const pageSize = Number.isInteger(options.pageSize) && options.pageSize > 0
          ? options.pageSize
          : keys.length || 1;
        const pageToken = Number.isInteger(Number(options.pageToken))
          ? Number(options.pageToken)
          : 0;
        const start = pageToken >= 0 ? pageToken : 0;
        const pageKeys = keys.slice(start, start + pageSize);
        const nextPageToken = start + pageSize < keys.length
          ? String(start + pageSize)
          : null;

        return {
          provider: detectProvider(uri),
          operation: 'list',
          uri,
          output: {
            items: pageKeys.map(key => ({
              uri: key,
              key
            }))
          },
          page: {
            nextPageToken,
            truncated: Boolean(nextPageToken)
          }
        };
      }

      if (operation === 'read') {
        if (!Object.prototype.hasOwnProperty.call(objects, uri)) {
          throw buildNotFoundError();
        }

        return {
          provider: detectProvider(uri),
          operation: 'read',
          uri,
          output: {
            data: {
              text: objects[uri],
              mimeType: 'application/json'
            }
          }
        };
      }

      if (operation === 'write') {
        const payload = request && request.payload ? request.payload : {};
        if (typeof payload.text === 'string') {
          objects[uri] = payload.text;
        } else if (typeof payload.base64 === 'string') {
          objects[uri] = Buffer.from(payload.base64, 'base64').toString('utf8');
        } else if (typeof payload.json !== 'undefined') {
          objects[uri] = JSON.stringify(payload.json);
        } else {
          throw new Error('unsupported payload');
        }

        return {
          provider: detectProvider(uri),
          operation: 'write',
          uri,
          output: {
            written: { uri }
          }
        };
      }

      if (operation === 'delete') {
        if (!Object.prototype.hasOwnProperty.call(objects, uri)) {
          throw buildNotFoundError();
        }

        delete objects[uri];
        return {
          provider: detectProvider(uri),
          operation: 'delete',
          uri,
          output: {
            deleted: {
              uri,
              deleted: true
            }
          }
        };
      }

      if (operation === 'head') {
        if (!Object.prototype.hasOwnProperty.call(objects, uri)) {
          throw buildNotFoundError();
        }

        return {
          provider: detectProvider(uri),
          operation: 'head',
          uri,
          output: {
            object: {
              uri,
              size: String(objects[uri]).length
            }
          }
        };
      }

      throw new Error(`unsupported operation: ${operation}`);
    }
  };
}

function createLockServiceMock() {
  return {
    getScriptLock: () => ({
      tryLock: () => true,
      releaseLock: () => {}
    })
  };
}

function createBackendContext(backend, sampleIdx) {
  const overrides = {
    LockService: createLockServiceMock()
  };

  if (backend === 'drive_json') {
    const drive = createDriveMock();
    overrides.DriveApp = drive.DriveApp;
  } else if (backend === 'script_properties') {
    const properties = createPropertiesService();
    overrides.PropertiesService = properties.service;
  } else if (backend === 'storage_json') {
    const storage = createStorageRunnerMock();
    overrides.astRunStorageRequest = storage.astRunStorageRequest;
  }

  const context = createGasContext(overrides);
  loadCacheScripts(context, { includeAst: true });
  context.AST.Cache.clearConfig();

  const configurePayload = {
    backend,
    namespace: `perf_cache_batch_${backend}_${sampleIdx}_${Date.now()}`
  };
  if (backend === 'drive_json') {
    configurePayload.driveFileName = `perf-cache-batch-${sampleIdx}.json`;
  }
  if (backend === 'storage_json') {
    configurePayload.storageUri = `gcs://perf-cache/batch-${sampleIdx}/cache.json`;
  }
  context.AST.Cache.configure(configurePayload);

  return context;
}

function runBackendBatchProfile(backend, sampleIdx, keyCount) {
  const context = createBackendContext(backend, sampleIdx);
  const keys = [];
  for (let idx = 0; idx < keyCount; idx += 1) {
    keys.push(`k:${idx}`);
  }
  const entries = buildSeedEntries(keyCount);

  const singleSetMs = measureMs(() => {
    for (let idx = 0; idx < entries.length; idx += 1) {
      const entry = entries[idx];
      context.AST.Cache.set(entry.key, entry.value, { ttlSec: 120, tags: ['perf'] });
    }
  });

  context.AST.Cache.clear();

  const batchSetMs = measureMs(() => {
    context.AST.Cache.setMany(entries, { ttlSec: 120, tags: ['perf'] });
  });

  const singleGetMs = measureMs(() => {
    const singleItems = new Array(keys.length);
    for (let idx = 0; idx < keys.length; idx += 1) {
      const key = keys[idx];
      const value = context.AST.Cache.get(key);
      // Mirror getMany response shaping so ratios compare equivalent work.
      const normalizedKey = context.astCacheNormalizeKey(key);
      singleItems[idx] = {
        key,
        keyHash: context.astCacheHashKey(normalizedKey),
        status: value === null ? 'miss' : 'hit',
        value
      };
    }
    return singleItems;
  });

  const batchGetMs = measureMs(() => {
    context.AST.Cache.getMany(keys);
  });

  return {
    backend,
    keyCount,
    singleSetMs,
    batchSetMs,
    singleGetMs,
    batchGetMs,
    setManyRelativePct: singleSetMs > 0 ? (batchSetMs / singleSetMs) * 100 : 0,
    getManyRelativePct: singleGetMs > 0 ? (batchGetMs / singleGetMs) * 100 : 0
  };
}

export function runCachePerf(_context, options = {}) {
  const samples = Number.isInteger(options.samples) ? Math.max(1, options.samples) : 1;
  const backendKeyCounts = {
    memory: 500,
    drive_json: 220,
    script_properties: 220,
    storage_json: 180
  };
  const backendNames = Object.keys(backendKeyCounts);

  const metrics = [];
  for (let sampleIdx = 0; sampleIdx < samples; sampleIdx += 1) {
    const backendProfiles = [];
    for (let idx = 0; idx < backendNames.length; idx += 1) {
      const backend = backendNames[idx];
      backendProfiles.push(runBackendBatchProfile(backend, sampleIdx, backendKeyCounts[backend]));
    }

    const aggregate = backendProfiles.reduce((acc, profile) => {
      acc.singleSetMs += profile.singleSetMs;
      acc.batchSetMs += profile.batchSetMs;
      acc.singleGetMs += profile.singleGetMs;
      acc.batchGetMs += profile.batchGetMs;
      return acc;
    }, {
      singleSetMs: 0,
      batchSetMs: 0,
      singleGetMs: 0,
      batchGetMs: 0
    });

    aggregate.setManyRelativePct = aggregate.singleSetMs > 0
      ? (aggregate.batchSetMs / aggregate.singleSetMs) * 100
      : 0;
    aggregate.getManyRelativePct = aggregate.singleGetMs > 0
      ? (aggregate.batchGetMs / aggregate.singleGetMs) * 100
      : 0;

    metrics.push({
      aggregate,
      backendProfiles
    });
  }

  const bestSample = metrics
    .slice()
    .sort((left, right) =>
      (left.aggregate.batchGetMs + left.aggregate.batchSetMs)
      - (right.aggregate.batchGetMs + right.aggregate.batchSetMs)
    )[0];
  const medianSample = metrics
    .slice()
    .sort((left, right) =>
      (left.aggregate.singleGetMs + left.aggregate.singleSetMs)
      - (right.aggregate.singleGetMs + right.aggregate.singleSetMs)
    )[Math.floor(metrics.length / 2)];

  const profileLookup = {};
  for (let idx = 0; idx < bestSample.backendProfiles.length; idx += 1) {
    const profile = bestSample.backendProfiles[idx];
    profileLookup[profile.backend] = profile;
  }

  return [{
    name: 'cache.batch_profile',
    bestMs: Number((bestSample.aggregate.batchGetMs + bestSample.aggregate.batchSetMs).toFixed(3)),
    medianMs: Number((medianSample.aggregate.singleGetMs + medianSample.aggregate.singleSetMs).toFixed(3)),
    maxHeapDeltaBytes: 0,
    samples,
    counters: {
      backendCount: bestSample.backendProfiles.length,
      setManyRelativePct: Number(bestSample.aggregate.setManyRelativePct.toFixed(3)),
      getManyRelativePct: Number(bestSample.aggregate.getManyRelativePct.toFixed(3)),
      memorySetManyRelativePct: Number(profileLookup.memory.setManyRelativePct.toFixed(3)),
      memoryGetManyRelativePct: Number(profileLookup.memory.getManyRelativePct.toFixed(3)),
      storageSetManyRelativePct: Number(profileLookup.storage_json.setManyRelativePct.toFixed(3)),
      storageGetManyRelativePct: Number(profileLookup.storage_json.getManyRelativePct.toFixed(3))
    },
    outputType: 'Object'
  }];
}

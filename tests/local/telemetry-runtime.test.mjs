import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadTelemetryScripts } from './telemetry-helpers.mjs';
import { loadAiScripts } from './ai-helpers.mjs';
import { loadScripts } from './helpers.mjs';

function createLoggerCapture() {
  const logs = [];
  return {
    logs,
    Logger: {
      log: value => {
        logs.push(String(value));
      }
    }
  };
}

function createOpenAiResponse(body) {
  return {
    getResponseCode: () => 200,
    getContentText: () => JSON.stringify(body),
    getAllHeaders: () => ({})
  };
}

function createDriveMock() {
  const files = {};
  const filesCreated = [];
  let folderCounter = 0;
  let fileCounter = 0;
  let getBlobCalls = 0;
  let setContentCalls = 0;

  function createIterator(list) {
    let cursor = 0;
    return {
      hasNext: () => cursor < list.length,
      next: () => list[cursor++]
    };
  }

  function createFolderHandle(name, parentPath) {
    const foldersByName = {};
    const filesByName = {};
    const path = parentPath ? `${parentPath}/${name}` : String(name || '');
    const folderId = `folder_${++folderCounter}`;

    return {
      getId: () => folderId,
      getName: () => String(name || ''),
      getFoldersByName: childName => {
        const key = String(childName || '');
        const folder = foldersByName[key];
        return createIterator(folder ? [folder] : []);
      },
      createFolder: childName => {
        const key = String(childName || '');
        if (!foldersByName[key]) {
          foldersByName[key] = createFolderHandle(key, path);
        }
        return foldersByName[key];
      },
      getFilesByName: fileName => {
        const key = String(fileName || '');
        const file = filesByName[key];
        return createIterator(file ? [file] : []);
      },
      createFile: (fileName, content = '') => {
        const key = String(fileName || '');
        const state = {
          id: `file_${++fileCounter}`,
          name: key,
          content: String(content || ''),
          path: path ? `${path}/${key}` : key
        };

        const handle = {
          getId: () => state.id,
          getName: () => state.name,
          getBlob: () => {
            getBlobCalls += 1;
            return {
              getDataAsString: () => state.content
            };
          },
          setContent: next => {
            setContentCalls += 1;
            state.content = String(next || '');
          }
        };

        filesByName[key] = handle;
        files[state.path] = handle;
        filesCreated.push({
          path: state.path,
          file: handle
        });
        return handle;
      }
    };
  }

  const folder = createFolderHandle('root', '');

  return {
    files,
    filesCreated,
    getBlobCalls: () => getBlobCalls,
    setContentCalls: () => setContentCalls,
    DriveApp: {
      getRootFolder: () => folder,
      getFolderById: () => folder
    }
  };
}

test('AST exposes Telemetry namespace and core methods', () => {
  const context = createGasContext();
  loadTelemetryScripts(context, { includeAst: true });

  assert.equal(typeof context.AST.Telemetry.configure, 'function');
  assert.equal(typeof context.AST.Telemetry.getConfig, 'function');
  assert.equal(typeof context.AST.Telemetry.clearConfig, 'function');
  assert.equal(typeof context.AST.Telemetry.startSpan, 'function');
  assert.equal(typeof context.AST.Telemetry.endSpan, 'function');
  assert.equal(typeof context.AST.Telemetry.recordEvent, 'function');
  assert.equal(typeof context.AST.Telemetry.getTrace, 'function');
  assert.equal(typeof context.AST.Telemetry.flush, 'function');
});

test('Telemetry redacts sensitive keys in span context', () => {
  const logger = createLoggerCapture();
  const context = createGasContext({
    Logger: logger.Logger
  });

  loadTelemetryScripts(context, { includeAst: true });
  context.AST.Telemetry._reset();
  context.AST.Telemetry.clearConfig();
  context.AST.Telemetry.configure({
    sink: 'logger',
    redactSecrets: true
  });

  const spanId = context.AST.Telemetry.startSpan('telemetry.redaction', {
    apiKey: 'secret-value',
    nested: {
      token: 'abc123'
    },
    safe: 'hello'
  });

  const ended = context.AST.Telemetry.endSpan(spanId, {
    status: 'ok',
    result: {
      password: 'hidden',
      ok: true
    }
  });
  const trace = context.AST.Telemetry.getTrace(ended.traceId);

  assert.equal(trace.spans[0].context.apiKey, '[REDACTED]');
  assert.equal(trace.spans[0].context.nested.token, '[REDACTED]');
  assert.equal(trace.spans[0].context.safe, 'hello');
  assert.equal(trace.spans[0].result.result.password, '[REDACTED]');
  assert.ok(logger.logs.length > 0);
});

test('Telemetry drive_json sink writes partitioned batch files without full-file appends', () => {
  const drive = createDriveMock();
  const context = createGasContext({
    DriveApp: drive.DriveApp
  });

  loadTelemetryScripts(context, { includeAst: true });
  context.AST.Telemetry._reset();
  context.AST.Telemetry.clearConfig();
  context.AST.Telemetry.configure({
    sink: 'drive_json',
    driveFileName: 'telemetry-test.ndjson',
    flushMode: 'threshold',
    batchMaxEvents: 2
  });

  const spanA = context.AST.Telemetry.startSpan('telemetry.drive.one', {});
  context.AST.Telemetry.endSpan(spanA, {
    status: 'ok'
  });
  assert.equal(drive.filesCreated.length, 0);

  const spanB = context.AST.Telemetry.startSpan('telemetry.drive.two', {});
  context.AST.Telemetry.endSpan(spanB, {
    status: 'ok'
  });

  assert.equal(drive.filesCreated.length, 1);
  assert.equal(drive.getBlobCalls(), 0, 'sink should not read existing files to append records');
  assert.equal(drive.setContentCalls(), 0, 'sink should not rewrite existing file content');

  const batchFile = drive.filesCreated[0];
  assert.match(
    batchFile.path,
    /events\/\d{4}\/\d{2}\/\d{2}\/\d{2}\/telemetry-test_\d{14}_telemetry_batch_/
  );

  const file = batchFile.file;
  const lines = file.getBlob().getDataAsString().split('\n').filter(Boolean);
  assert.equal(lines.length, 2);
  const payload = JSON.parse(lines[0]);
  assert.equal(payload.type, 'span_end');
});

test('Telemetry drive_json sink uses script lock when LockService is available', () => {
  const drive = createDriveMock();
  let tryLockCalls = 0;
  let releaseCalls = 0;

  const context = createGasContext({
    DriveApp: drive.DriveApp,
    LockService: {
      getScriptLock: () => ({
        tryLock: _timeoutMs => {
          tryLockCalls += 1;
          return true;
        },
        releaseLock: () => {
          releaseCalls += 1;
        }
      })
    }
  });

  loadTelemetryScripts(context, { includeAst: true });
  context.AST.Telemetry._reset();
  context.AST.Telemetry.clearConfig();
  context.AST.Telemetry.configure({
    sink: 'drive_json',
    driveFileName: 'telemetry-lock-test.ndjson',
    flushMode: 'immediate'
  });

  const spanId = context.AST.Telemetry.startSpan('telemetry.drive.lock', {});
  context.AST.Telemetry.endSpan(spanId, { status: 'ok' });

  assert.equal(tryLockCalls, 1);
  assert.equal(releaseCalls, 1);
});

test('Telemetry drive_json sink supports manual flush mode', () => {
  const drive = createDriveMock();
  const context = createGasContext({
    DriveApp: drive.DriveApp
  });

  loadTelemetryScripts(context, { includeAst: true });
  context.AST.Telemetry._reset();
  context.AST.Telemetry.clearConfig();
  context.AST.Telemetry.configure({
    sink: 'drive_json',
    driveFileName: 'telemetry-manual.ndjson',
    flushMode: 'manual'
  });

  const spanId = context.AST.Telemetry.startSpan('telemetry.drive.manual', {});
  context.AST.Telemetry.endSpan(spanId, { status: 'ok' });
  assert.equal(drive.filesCreated.length, 0);

  const flushResult = context.AST.Telemetry.flush();
  assert.equal(flushResult.flushed, 1);
  assert.equal(flushResult.pending, 0);
  assert.equal(drive.filesCreated.length, 1);
});

test('Telemetry reset clears buffered drive_json records', () => {
  const drive = createDriveMock();
  const context = createGasContext({
    DriveApp: drive.DriveApp
  });

  loadTelemetryScripts(context, { includeAst: true });
  context.AST.Telemetry._reset();
  context.AST.Telemetry.clearConfig();
  context.AST.Telemetry.configure({
    sink: 'drive_json',
    driveFileName: 'telemetry-reset.ndjson',
    flushMode: 'manual'
  });

  const spanId = context.AST.Telemetry.startSpan('telemetry.drive.reset', {});
  context.AST.Telemetry.endSpan(spanId, { status: 'ok' });
  assert.equal(drive.filesCreated.length, 0);

  context.AST.Telemetry._reset();
  const flushResult = context.AST.Telemetry.flush();

  assert.equal(flushResult.flushed, 0);
  assert.equal(flushResult.pending, 0);
  assert.equal(drive.filesCreated.length, 0);
});

test('Telemetry storage_json sink supports manual flush mode', () => {
  const writes = [];
  const context = createGasContext({
    astRunStorageRequest: request => {
      writes.push(request);
      return {
        provider: 's3',
        operation: 'write',
        uri: request.uri
      };
    }
  });

  loadTelemetryScripts(context, { includeAst: true });
  context.AST.Telemetry._reset();
  context.AST.Telemetry.clearConfig();
  context.AST.Telemetry.configure({
    sink: 'storage_json',
    storageUri: 's3://ast-telemetry/tests',
    flushMode: 'manual'
  });

  const spanId = context.AST.Telemetry.startSpan('telemetry.storage.manual', {});
  context.AST.Telemetry.endSpan(spanId, { status: 'ok' });

  assert.equal(writes.length, 0, 'manual flush mode should not write on endSpan');

  const flushResult = context.AST.Telemetry.flush();
  assert.equal(flushResult.flushed, 1);
  assert.equal(flushResult.pending, 0);
  assert.equal(writes.length, 1);
  assert.match(writes[0].uri, /^s3:\/\/ast-telemetry\/tests\/events\/\d{4}\/\d{2}\/\d{2}\/\d{2}\/telemetry_batch_/);
  assert.match(writes[0].payload.text, /"type":"span_end"/);
});

test('Telemetry reset clears buffered storage_json records', () => {
  const writes = [];
  const context = createGasContext({
    astRunStorageRequest: request => {
      writes.push(request);
      return {
        provider: 's3',
        operation: 'write',
        uri: request.uri
      };
    }
  });

  loadTelemetryScripts(context, { includeAst: true });
  context.AST.Telemetry._reset();
  context.AST.Telemetry.clearConfig();
  context.AST.Telemetry.configure({
    sink: 'storage_json',
    storageUri: 's3://ast-telemetry/tests',
    flushMode: 'manual'
  });

  const spanId = context.AST.Telemetry.startSpan('telemetry.storage.reset', {});
  context.AST.Telemetry.endSpan(spanId, { status: 'ok' });
  assert.equal(writes.length, 0);

  context.AST.Telemetry._reset();
  const flushResult = context.AST.Telemetry.flush();
  assert.equal(flushResult.flushed, 0);
  assert.equal(flushResult.pending, 0);
  assert.equal(writes.length, 0);
});

test('Telemetry storage_json sink flushes on threshold', () => {
  const writes = [];
  const context = createGasContext({
    astRunStorageRequest: request => {
      writes.push(request);
      return {
        provider: 'gcs',
        operation: 'write',
        uri: request.uri
      };
    }
  });

  loadTelemetryScripts(context, { includeAst: true });
  context.AST.Telemetry._reset();
  context.AST.Telemetry.clearConfig();
  context.AST.Telemetry.configure({
    sink: 'storage_json',
    storageUri: 'gcs://ast-telemetry/tests',
    flushMode: 'threshold',
    batchMaxEvents: 2
  });

  const spanA = context.AST.Telemetry.startSpan('telemetry.storage.threshold.a', {});
  context.AST.Telemetry.endSpan(spanA, { status: 'ok' });
  assert.equal(writes.length, 0);

  const spanB = context.AST.Telemetry.startSpan('telemetry.storage.threshold.b', {});
  context.AST.Telemetry.endSpan(spanB, { status: 'ok' });
  assert.equal(writes.length, 1);

  const flushResult = context.AST.Telemetry.flush();
  assert.equal(flushResult.flushed, 0);
  assert.equal(flushResult.pending, 0);
});

test('Telemetry keeps running traces eligible for endSpan under maxTraceCount pressure', () => {
  const context = createGasContext();
  loadTelemetryScripts(context, { includeAst: true });

  context.AST.Telemetry._reset();
  context.AST.Telemetry.clearConfig();
  context.AST.Telemetry.configure({
    sink: 'logger',
    maxTraceCount: 10
  });

  const span1 = context.AST.Telemetry.startSpan('trace.one', { traceId: 'trace_1' });
  for (let traceNum = 2; traceNum <= 11; traceNum += 1) {
    context.AST.Telemetry.startSpan(`trace.${traceNum}`, {
      traceId: `trace_${traceNum}`
    });
  }

  // Running traces should not be evicted before they can be ended.
  assert.ok(context.AST.Telemetry.getTrace('trace_1'));

  const ended = context.AST.Telemetry.endSpan(span1, { status: 'ok' });
  assert.equal(ended.traceId, 'trace_1');
  assert.equal(ended.status, 'ok');

  // After completion, old traces can be evicted to enforce maxTraceCount.
  context.AST.Telemetry.startSpan('trace.12', { traceId: 'trace_12' });
  assert.equal(context.AST.Telemetry.getTrace('trace_1'), null);
});

test('astRunAiRequest emits telemetry span_end records', () => {
  const logger = createLoggerCapture();
  const context = createGasContext({
    Logger: logger.Logger,
    UrlFetchApp: {
      fetch: () => createOpenAiResponse({
        id: 'chatcmpl_123',
        model: 'gpt-4.1-mini',
        created: 1710000000,
        choices: [
          {
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: 'hello from ai'
            }
          }
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15
        }
      })
    }
  });

  loadTelemetryScripts(context, { includeAst: true });
  loadAiScripts(context);

  context.AST.Telemetry._reset();
  context.AST.Telemetry.clearConfig();
  context.AST.Telemetry.configure({
    sink: 'logger'
  });

  const response = context.astRunAiRequest({
    provider: 'openai',
    operation: 'text',
    input: 'hello',
    auth: {
      apiKey: 'sk-test'
    },
    model: 'gpt-4.1-mini'
  });

  assert.equal(response.provider, 'openai');

  const spanLog = logger.logs
    .map(item => {
      try {
        return JSON.parse(item);
      } catch (_error) {
        return null;
      }
    })
    .filter(item => item && item.type === 'span_end' && item.span && item.span.name === 'ai.run')[0];

  assert.ok(spanLog, 'Expected ai.run span_end log');
  assert.equal(spanLog.span.status, 'ok');
});

test('astRunAiRequest telemetry attributes provider/model to successful fallback attempt', () => {
  const logger = createLoggerCapture();
  const context = createGasContext({
    Logger: logger.Logger
  });

  loadTelemetryScripts(context, { includeAst: true });
  loadAiScripts(context);

  context.AST.Telemetry._reset();
  context.AST.Telemetry.clearConfig();
  context.AST.Telemetry.configure({
    sink: 'logger'
  });

  const originalRunOpenAi = context.astRunOpenAi;
  const originalRunGemini = context.astRunGemini;

  context.astRunOpenAi = () => {
    const error = new Error('temporary upstream failure');
    error.name = 'AstAiProviderError';
    error.details = { statusCode: 503 };
    throw error;
  };

  context.astRunGemini = request => context.astNormalizeAiResponse({
    provider: 'gemini',
    operation: 'text',
    model: request.model,
    output: {
      text: 'fallback-ok'
    }
  });

  const response = context.astRunAiRequest({
    input: 'hello',
    routing: {
      strategy: 'priority',
      candidates: [
        {
          provider: 'openai',
          model: 'gpt-4.1-mini',
          auth: { apiKey: 'openai-key' }
        },
        {
          provider: 'gemini',
          model: 'gemini-2.0-flash',
          auth: { apiKey: 'gemini-key' }
        }
      ]
    }
  });

  context.astRunOpenAi = originalRunOpenAi;
  context.astRunGemini = originalRunGemini;

  assert.equal(response.provider, 'gemini');

  const spanLog = logger.logs
    .map(item => {
      try {
        return JSON.parse(item);
      } catch (_error) {
        return null;
      }
    })
    .filter(item => item && item.type === 'span_end' && item.span && item.span.name === 'ai.run')[0];

  assert.ok(spanLog, 'Expected ai.run span_end log');
  assert.equal(spanLog.span.status, 'ok');
  assert.equal(spanLog.span.result.result.provider, 'gemini');
  assert.equal(spanLog.span.result.result.model, 'gemini-2.0-flash');
  assert.equal(spanLog.span.result.result.selectedProvider, 'gemini');
  assert.equal(spanLog.span.result.result.attemptCount, 2);
});

test('astRagBuildIndexCore emits telemetry span_end records', () => {
  const logger = createLoggerCapture();
  const context = createGasContext({
    Logger: logger.Logger
  });

  loadTelemetryScripts(context, { includeAst: true });
  loadScripts(context, [
    'apps_script_tools/rag/general/helpers.js',
    'apps_script_tools/rag/general/vectorMath.js',
    'apps_script_tools/rag/general/sourceFingerprint.js',
    'apps_script_tools/rag/general/buildRagIndex.js'
  ]);

  context.AST.Telemetry._reset();
  context.AST.Telemetry.clearConfig();
  context.AST.Telemetry.configure({
    sink: 'logger'
  });

  context.astRagValidateBuildRequest = () => ({
    source: {},
    index: {
      indexName: 'telemetry-rag'
    },
    chunking: {
      chunkSizeChars: 1000,
      chunkOverlapChars: 100,
      minChunkChars: 100
    },
    options: {
      maxFiles: 10,
      maxChunks: 50,
      skipParseFailures: false
    },
    embedding: {
      provider: 'vertex_gemini',
      model: 'text-embedding-005',
      providerOptions: {}
    },
    auth: {},
    retrievalDefaults: {}
  });
  context.astRagListDriveSources = () => [{
    fileId: 'file_1',
    fileName: 'Doc 1',
    mimeType: 'text/plain',
    modifiedTime: '2026-01-01T00:00:00.000Z'
  }];
  context.astRagReadDriveSourceText = () => ({
    segments: [
      {
        text: 'hello telemetry rag',
        page: null,
        slide: null,
        section: 'body'
      }
    ]
  });
  context.astRagChunkSegments = segments => segments;
  context.astRagBuildSourceFingerprint = () => 'fingerprint';
  context.astRagEmbedTexts = () => ({
    model: 'text-embedding-005',
    vectors: [[0.1, 0.2, 0.3]]
  });
  context.astRagBuildIndexDocument = (_request, sources, chunks) => ({
    indexName: 'telemetry-rag',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    sources,
    chunks
  });
  context.astRagPersistIndexDocument = () => ({
    indexFileId: 'index_1'
  });

  const result = context.astRagBuildIndexCore({
    index: {
      indexName: 'telemetry-rag'
    }
  });

  assert.equal(result.indexFileId, 'index_1');

  const spanLog = logger.logs
    .map(item => {
      try {
        return JSON.parse(item);
      } catch (_error) {
        return null;
      }
    })
    .filter(item => item && item.type === 'span_end' && item.span && item.span.name === 'rag.buildIndex')[0];

  assert.ok(spanLog, 'Expected rag.buildIndex span_end log');
  assert.equal(spanLog.span.status, 'ok');
});

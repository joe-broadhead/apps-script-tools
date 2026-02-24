import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext, listScriptFiles, loadScripts } from './helpers.mjs';
import { loadRagScripts } from './rag-helpers.mjs';

const MIME_TEXT = 'text/plain';
const MIME_PDF = 'application/pdf';
const MIME_DOC = 'application/vnd.google-apps.document';
const MIME_SLIDES = 'application/vnd.google-apps.presentation';

function makeIterator(items) {
  let cursor = 0;
  const list = Array.isArray(items) ? items : [];
  return {
    hasNext: () => cursor < list.length,
    next: () => list[cursor++]
  };
}

function makeBlob(text, mimeType = MIME_TEXT) {
  let content = String(text || '');
  return {
    getDataAsString: () => content,
    getContentType: () => mimeType,
    getBytes: () => Array.from(Buffer.from(content, 'utf8')),
    _setContent: value => {
      content = String(value || '');
    }
  };
}

function makeDriveFile({ id, name, mimeType, text, lastUpdated }) {
  const blob = makeBlob(text, mimeType);
  let updatedAt = new Date(lastUpdated || '2026-01-01T00:00:00.000Z');

  return {
    _id: id,
    _name: name,
    _mimeType: mimeType,
    _blob: blob,
    getId: () => id,
    getName: () => name,
    getMimeType: () => mimeType,
    getBlob: () => blob,
    getLastUpdated: () => updatedAt,
    setContent: value => {
      blob._setContent(value);
      updatedAt = new Date(updatedAt.getTime() + 1000);
    },
    moveTo: () => {},
    _setText: value => {
      blob._setContent(value);
      updatedAt = new Date(updatedAt.getTime() + 1000);
    },
    _setLastUpdated: value => {
      updatedAt = new Date(value);
    }
  };
}

function createDriveRuntime({ folderId = 'root', files = [] } = {}) {
  const byId = {};
  const folderFiles = Array.isArray(files) ? files : [];
  folderFiles.forEach(file => {
    byId[file.getId()] = file;
  });

  let indexCounter = 0;
  const folder = {
    getFiles: () => makeIterator(folderFiles),
    getFolders: () => makeIterator([])
  };

  const DriveApp = {
    getFolderById: id => {
      if (id !== folderId) {
        throw new Error(`Unknown folder: ${id}`);
      }
      return folder;
    },
    getFileById: id => {
      if (!byId[id]) {
        throw new Error(`Unknown file: ${id}`);
      }
      return byId[id];
    },
    createFile: (name, content, mimeType) => {
      indexCounter += 1;
      const id = `index_${indexCounter}`;
      const file = makeDriveFile({
        id,
        name,
        mimeType,
        text: content,
        lastUpdated: '2026-01-02T00:00:00.000Z'
      });
      byId[id] = file;
      return file;
    }
  };

  return {
    DriveApp,
    folderFiles,
    byId
  };
}

function createEmbeddingFetchMock(tracker = null) {
  return {
    fetch: (_url, options) => {
      const payload = JSON.parse(options.payload);
      const inputs = Array.isArray(payload.input) ? payload.input : [payload.input];
      if (tracker && typeof tracker === 'object') {
        tracker.calls = (tracker.calls || 0) + 1;
        tracker.textsEmbedded = (tracker.textsEmbedded || 0) + inputs.length;
        tracker.batches = Array.isArray(tracker.batches) ? tracker.batches : [];
        tracker.batches.push(inputs.slice());
      }
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          data: inputs.map((_, index) => ({
            embedding: [1, index + 1, 0.5]
          })),
          usage: {
            prompt_tokens: inputs.length * 3,
            total_tokens: inputs.length * 3
          }
        })
      };
    }
  };
}

function loadRagWithCacheScripts(context, options = {}) {
  const cachePaths = [];
  cachePaths.push(...listScriptFiles('apps_script_tools/cache/backends'));
  cachePaths.push(...listScriptFiles('apps_script_tools/cache/general'));
  cachePaths.push('apps_script_tools/cache/Cache.js');
  loadScripts(context, cachePaths);
  return loadRagScripts(context, options);
}

test('Slides extraction includes slide body and speaker notes metadata', () => {
  const context = createGasContext({
    SlidesApp: {
      openById: () => ({
        getSlides: () => [{
          getPageElements: () => [{
            asShape: () => ({
              getText: () => ({
                asString: () => 'Slide body text'
              })
            })
          }],
          getNotesPage: () => ({
            getSpeakerNotesShape: () => ({
              getText: () => ({
                asString: () => 'Speaker notes text'
              })
            })
          })
        }]
      })
    }
  });

  loadRagScripts(context, { includeAi: false, includeUtilities: false });

  const extracted = context.astRagReadDriveSourceText({
    fileId: 'slide_1',
    fileName: 'Roadmap',
    mimeType: MIME_SLIDES,
    driveFile: {}
  });

  assert.equal(extracted.segments.length, 2);
  assert.equal(extracted.segments[0].slide, 1);
  assert.equal(extracted.segments[0].section, 'body');
  assert.equal(extracted.segments[1].slide, 1);
  assert.equal(extracted.segments[1].section, 'notes');
});

test('buildIndex skips PDF parse failures as warnings when skipParseFailures=true', () => {
  const txt = makeDriveFile({
    id: 'file_txt_1',
    name: 'notes.txt',
    mimeType: MIME_TEXT,
    text: 'Project requirements and scope.'
  });
  const pdf = makeDriveFile({
    id: 'file_pdf_1',
    name: 'spec.pdf',
    mimeType: MIME_PDF,
    text: '%PDF-1.4'
  });

  const drive = createDriveRuntime({
    files: [txt, pdf]
  });

  const context = createGasContext({
    DriveApp: drive.DriveApp,
    UrlFetchApp: createEmbeddingFetchMock()
  });

  loadRagScripts(context, { includeAst: true });

  const output = context.AST.RAG.buildIndex({
    source: {
      folderId: 'root',
      includeSubfolders: false,
      includeMimeTypes: [MIME_TEXT, MIME_PDF]
    },
    index: {
      indexName: 'project-index'
    },
    embedding: {
      provider: 'openai',
      model: 'text-embedding-3-small'
    },
    options: {
      skipParseFailures: true,
      maxFiles: 20,
      maxChunks: 100
    },
    auth: {
      openai: {
        apiKey: 'test-openai-key'
      }
    }
  });

  assert.equal(output.sourceCount, 1);
  assert.equal(output.chunkCount > 0, true);
  assert.equal(output.warnings.length, 1);
  assert.equal(output.warnings[0].fileId, 'file_pdf_1');

  const inspected = context.AST.RAG.inspectIndex({ indexFileId: output.indexFileId });
  assert.equal(inspected.chunkCount > 0, true);
  assert.equal(inspected.sourceCount, 1);
});

test('PDF extraction throws typed auth error when Vertex config is missing', () => {
  const pdf = makeDriveFile({
    id: 'file_pdf_2',
    name: 'missing-config.pdf',
    mimeType: MIME_PDF,
    text: '%PDF-1.4'
  });

  const context = createGasContext();
  loadRagScripts(context, { includeAi: false, includeUtilities: false });

  assert.throws(
    () => context.astRagReadDriveSourceText({
      fileId: 'file_pdf_2',
      fileName: 'missing-config.pdf',
      mimeType: MIME_PDF,
      driveFile: pdf
    }),
    /Missing required RAG configuration field 'projectId'/
  );
});

test('buildIndex + syncIndex update source and chunk counts deterministically', () => {
  const fileA = makeDriveFile({
    id: 'file_a',
    name: 'a.txt',
    mimeType: MIME_TEXT,
    text: 'alpha alpha alpha'
  });
  const fileB = makeDriveFile({
    id: 'file_b',
    name: 'b.txt',
    mimeType: MIME_TEXT,
    text: 'bravo bravo bravo'
  });

  const drive = createDriveRuntime({
    files: [fileA, fileB]
  });

  const context = createGasContext({
    DriveApp: drive.DriveApp,
    UrlFetchApp: createEmbeddingFetchMock()
  });

  loadRagScripts(context, { includeAst: true });

  const built = context.AST.RAG.buildIndex({
    source: {
      folderId: 'root',
      includeSubfolders: false,
      includeMimeTypes: [MIME_TEXT]
    },
    index: {
      indexName: 'sync-index'
    },
    embedding: {
      provider: 'openai',
      model: 'text-embedding-3-small'
    },
    options: {
      maxFiles: 20,
      maxChunks: 200
    },
    auth: {
      apiKey: 'test-openai-key'
    }
  });

  assert.equal(built.sourceCount, 2);

  const fileC = makeDriveFile({
    id: 'file_c',
    name: 'c.txt',
    mimeType: MIME_TEXT,
    text: 'charlie charlie charlie'
  });
  drive.folderFiles.splice(1, 1); // remove fileB
  drive.folderFiles.push(fileC); // add fileC
  fileA._setText('alpha updated text');
  fileA._setLastUpdated('2026-01-04T00:00:00.000Z');
  drive.byId[fileC.getId()] = fileC;

  const synced = context.AST.RAG.syncIndex({
    source: {
      folderId: 'root',
      includeSubfolders: false,
      includeMimeTypes: [MIME_TEXT]
    },
    index: {
      indexName: 'sync-index',
      indexFileId: built.indexFileId
    },
    embedding: {
      provider: 'openai',
      model: 'text-embedding-3-small'
    },
    options: {
      maxFiles: 20,
      maxChunks: 200
    },
    auth: {
      apiKey: 'test-openai-key'
    }
  });

  assert.equal(synced.updatedSources, 1);
  assert.equal(synced.addedSources, 1);
  assert.equal(synced.removedSources, 1);
  assert.equal(synced.addedChunks > 0, true);
});

test('buildIndex applies maxFiles after deterministic source ordering', () => {
  const fileZ = makeDriveFile({
    id: 'z_file',
    name: 'z.txt',
    mimeType: MIME_TEXT,
    text: 'zeta zeta zeta'
  });
  const fileM = makeDriveFile({
    id: 'm_file',
    name: 'm.txt',
    mimeType: MIME_TEXT,
    text: 'mu mu mu'
  });
  const fileA = makeDriveFile({
    id: 'a_file',
    name: 'a.txt',
    mimeType: MIME_TEXT,
    text: 'alpha alpha alpha'
  });

  const drive = createDriveRuntime({
    files: [fileZ, fileM, fileA]
  });

  const context = createGasContext({
    DriveApp: drive.DriveApp,
    UrlFetchApp: createEmbeddingFetchMock()
  });

  loadRagScripts(context, { includeAst: true });

  const built = context.AST.RAG.buildIndex({
    source: {
      folderId: 'root',
      includeSubfolders: false,
      includeMimeTypes: [MIME_TEXT]
    },
    index: {
      indexName: 'ordered-max-files-index'
    },
    embedding: {
      provider: 'openai',
      model: 'text-embedding-3-small'
    },
    options: {
      maxFiles: 2,
      maxChunks: 200
    },
    auth: {
      apiKey: 'test-openai-key'
    }
  });

  const loaded = context.astRagLoadIndexDocument(built.indexFileId).document;
  const fileIds = loaded.sources.map(source => source.fileId);
  assert.equal(JSON.stringify(fileIds), JSON.stringify(['a_file', 'm_file']));
  assert.equal(loaded.sources.some(source => source.fileId === 'z_file'), false);
});

test('syncIndex maxChunks guard does not double-count pending embeds', () => {
  const fileA = makeDriveFile({
    id: 'max_guard_a',
    name: 'a.txt',
    mimeType: MIME_TEXT,
    text: 'A'.repeat(250)
  });
  const fileB = makeDriveFile({
    id: 'max_guard_b',
    name: 'b.txt',
    mimeType: MIME_TEXT,
    text: 'B'.repeat(250)
  });

  const drive = createDriveRuntime({
    files: [fileA, fileB]
  });

  const context = createGasContext({
    DriveApp: drive.DriveApp,
    UrlFetchApp: createEmbeddingFetchMock()
  });

  loadRagScripts(context, { includeAst: true });

  const built = context.AST.RAG.buildIndex({
    source: {
      folderId: 'root',
      includeSubfolders: false,
      includeMimeTypes: [MIME_TEXT]
    },
    index: {
      indexName: 'max-guard-index'
    },
    embedding: {
      provider: 'openai',
      model: 'text-embedding-3-small'
    },
    options: {
      maxFiles: 20,
      maxChunks: 2
    },
    auth: {
      apiKey: 'test-openai-key'
    }
  });

  fileA._setText('X'.repeat(250));
  fileA._setLastUpdated('2026-01-07T00:00:00.000Z');
  fileB._setText('Y'.repeat(250));
  fileB._setLastUpdated('2026-01-08T00:00:00.000Z');

  const synced = context.AST.RAG.syncIndex({
    source: {
      folderId: 'root',
      includeSubfolders: false,
      includeMimeTypes: [MIME_TEXT]
    },
    index: {
      indexName: 'max-guard-index',
      indexFileId: built.indexFileId
    },
    embedding: {
      provider: 'openai',
      model: 'text-embedding-3-small'
    },
    options: {
      maxFiles: 20,
      maxChunks: 2
    },
    auth: {
      apiKey: 'test-openai-key'
    }
  });

  assert.equal(synced.updatedSources, 2);
  assert.equal(synced.reembeddedChunks, 2);
  assert.equal(synced.addedChunks, 2);
  assert.equal(synced.removedChunks, 2);

  const loaded = context.astRagLoadIndexDocument(built.indexFileId).document;
  assert.equal(loaded.chunks.length, 2);
});

test('syncIndex does not re-embed unchanged corpus', () => {
  const fileA = makeDriveFile({
    id: 'file_static_a',
    name: 'static-a.txt',
    mimeType: MIME_TEXT,
    text: 'alpha alpha alpha'
  });
  const fileB = makeDriveFile({
    id: 'file_static_b',
    name: 'static-b.txt',
    mimeType: MIME_TEXT,
    text: 'bravo bravo bravo'
  });

  const drive = createDriveRuntime({
    files: [fileA, fileB]
  });
  const tracker = { calls: 0, textsEmbedded: 0, batches: [] };

  const context = createGasContext({
    DriveApp: drive.DriveApp,
    UrlFetchApp: createEmbeddingFetchMock(tracker)
  });

  loadRagScripts(context, { includeAst: true });

  const built = context.AST.RAG.buildIndex({
    source: {
      folderId: 'root',
      includeSubfolders: false,
      includeMimeTypes: [MIME_TEXT]
    },
    index: {
      indexName: 'sync-unchanged-index'
    },
    embedding: {
      provider: 'openai',
      model: 'text-embedding-3-small'
    },
    options: {
      maxFiles: 20,
      maxChunks: 200
    },
    auth: {
      apiKey: 'test-openai-key'
    }
  });

  assert.equal(built.sourceCount, 2);
  tracker.calls = 0;
  tracker.textsEmbedded = 0;
  tracker.batches = [];

  const synced = context.AST.RAG.syncIndex({
    source: {
      folderId: 'root',
      includeSubfolders: false,
      includeMimeTypes: [MIME_TEXT]
    },
    index: {
      indexName: 'sync-unchanged-index',
      indexFileId: built.indexFileId
    },
    embedding: {
      provider: 'openai',
      model: 'text-embedding-3-small'
    },
    options: {
      maxFiles: 20,
      maxChunks: 200
    },
    auth: {
      apiKey: 'test-openai-key'
    }
  });

  assert.equal(synced.addedSources, 0);
  assert.equal(synced.updatedSources, 0);
  assert.equal(synced.removedSources, 0);
  assert.equal(synced.unchangedSources, 2);
  assert.equal(synced.reembeddedChunks, 0);
  assert.equal(tracker.calls, 0);
  assert.equal(tracker.textsEmbedded, 0);
});

test('syncIndex re-embeds only changed chunks for edited source', () => {
  const fileA = makeDriveFile({
    id: 'file_chunk_a',
    name: 'chunk-a.txt',
    mimeType: MIME_TEXT,
    text: `${'A'.repeat(200)}${'B'.repeat(200)}${'C'.repeat(200)}`
  });

  const drive = createDriveRuntime({
    files: [fileA]
  });
  const tracker = { calls: 0, textsEmbedded: 0, batches: [] };

  const context = createGasContext({
    DriveApp: drive.DriveApp,
    UrlFetchApp: createEmbeddingFetchMock(tracker)
  });

  loadRagScripts(context, { includeAst: true });

  const built = context.AST.RAG.buildIndex({
    source: {
      folderId: 'root',
      includeSubfolders: false,
      includeMimeTypes: [MIME_TEXT]
    },
    index: {
      indexName: 'sync-chunk-diff-index'
    },
    embedding: {
      provider: 'openai',
      model: 'text-embedding-3-small'
    },
    chunking: {
      chunkSizeChars: 200,
      chunkOverlapChars: 0,
      minChunkChars: 1
    },
    options: {
      maxFiles: 20,
      maxChunks: 200
    },
    auth: {
      apiKey: 'test-openai-key'
    }
  });

  assert.equal(built.chunkCount, 3);
  tracker.calls = 0;
  tracker.textsEmbedded = 0;
  tracker.batches = [];

  fileA._setText(`${'A'.repeat(200)}${'X'.repeat(200)}${'C'.repeat(200)}`);
  fileA._setLastUpdated('2026-01-06T00:00:00.000Z');

  const synced = context.AST.RAG.syncIndex({
    source: {
      folderId: 'root',
      includeSubfolders: false,
      includeMimeTypes: [MIME_TEXT]
    },
    index: {
      indexName: 'sync-chunk-diff-index',
      indexFileId: built.indexFileId
    },
    embedding: {
      provider: 'openai',
      model: 'text-embedding-3-small'
    },
    chunking: {
      chunkSizeChars: 200,
      chunkOverlapChars: 0,
      minChunkChars: 1
    },
    options: {
      maxFiles: 20,
      maxChunks: 200
    },
    auth: {
      apiKey: 'test-openai-key'
    }
  });

  assert.equal(synced.updatedSources, 1);
  assert.equal(synced.addedSources, 0);
  assert.equal(synced.reusedChunks, 2);
  assert.equal(synced.reembeddedChunks, 1);
  assert.equal(synced.addedChunks, 1);
  assert.equal(synced.removedChunks, 1);
  assert.equal(tracker.calls, 1);
  assert.equal(tracker.textsEmbedded, 1);

  const after = context.astRagLoadIndexDocument(built.indexFileId).document;
  assert.equal(after.chunks.length, 3);
  assert.equal(new Set(after.chunks.map(chunk => chunk.chunkId)).size, after.chunks.length);
  assert.equal(after.sync.lastSyncSummary.reembeddedChunks, 1);
  const inspected = context.AST.RAG.inspectIndex({ indexFileId: built.indexFileId });
  assert.equal(typeof inspected.lastSyncAt, 'string');
});

test('syncIndex dryRun reports delta without persisting index', () => {
  const fileA = makeDriveFile({
    id: 'file_dry_a',
    name: 'dry-a.txt',
    mimeType: MIME_TEXT,
    text: 'alpha alpha alpha'
  });
  const fileB = makeDriveFile({
    id: 'file_dry_b',
    name: 'dry-b.txt',
    mimeType: MIME_TEXT,
    text: 'bravo bravo bravo'
  });

  const drive = createDriveRuntime({
    files: [fileA, fileB]
  });
  const tracker = { calls: 0, textsEmbedded: 0, batches: [] };

  const context = createGasContext({
    DriveApp: drive.DriveApp,
    UrlFetchApp: createEmbeddingFetchMock(tracker)
  });

  loadRagScripts(context, { includeAst: true });

  const built = context.AST.RAG.buildIndex({
    source: {
      folderId: 'root',
      includeSubfolders: false,
      includeMimeTypes: [MIME_TEXT]
    },
    index: {
      indexName: 'sync-dry-run-index'
    },
    embedding: {
      provider: 'openai',
      model: 'text-embedding-3-small'
    },
    options: {
      maxFiles: 20,
      maxChunks: 200
    },
    auth: {
      apiKey: 'test-openai-key'
    }
  });

  const before = context.astRagLoadIndexDocument(built.indexFileId).document;
  fileA._setText('alpha alpha alpha changed');
  fileA._setLastUpdated('2026-01-05T00:00:00.000Z');
  tracker.calls = 0;
  tracker.textsEmbedded = 0;
  tracker.batches = [];

  const dryRun = context.AST.RAG.syncIndex({
    source: {
      folderId: 'root',
      includeSubfolders: false,
      includeMimeTypes: [MIME_TEXT]
    },
    index: {
      indexName: 'sync-dry-run-index',
      indexFileId: built.indexFileId
    },
    embedding: {
      provider: 'openai',
      model: 'text-embedding-3-small'
    },
    options: {
      dryRun: true,
      maxFiles: 20,
      maxChunks: 200
    },
    auth: {
      apiKey: 'test-openai-key'
    }
  });

  assert.equal(dryRun.dryRun, true);
  assert.equal(dryRun.persisted, false);
  assert.equal(dryRun.updatedSources, 1);
  assert.equal(dryRun.reembeddedChunks > 0, true);
  assert.equal(tracker.calls, 0);
  assert.equal(dryRun.currentChunkCount, before.chunks.length);
  assert.equal(dryRun.nextChunkCount > 0, true);

  const after = context.astRagLoadIndexDocument(built.indexFileId).document;
  assert.equal(after.updatedAt, before.updatedAt);
});

test('syncIndex preserves existing source data when parse fails and skipParseFailures=true', () => {
  const fileA = makeDriveFile({
    id: 'file_keep_a',
    name: 'a.txt',
    mimeType: MIME_TEXT,
    text: 'alpha alpha alpha'
  });
  const fileB = makeDriveFile({
    id: 'file_keep_b',
    name: 'b.txt',
    mimeType: MIME_TEXT,
    text: 'bravo bravo bravo'
  });

  const drive = createDriveRuntime({
    files: [fileA, fileB]
  });

  const context = createGasContext({
    DriveApp: drive.DriveApp,
    UrlFetchApp: createEmbeddingFetchMock()
  });

  loadRagScripts(context, { includeAst: true });

  const built = context.AST.RAG.buildIndex({
    source: {
      folderId: 'root',
      includeSubfolders: false,
      includeMimeTypes: [MIME_TEXT]
    },
    index: {
      indexName: 'sync-preserve-index'
    },
    embedding: {
      provider: 'openai',
      model: 'text-embedding-3-small'
    },
    options: {
      maxFiles: 20,
      maxChunks: 200
    },
    auth: {
      apiKey: 'test-openai-key'
    }
  });

  const before = context.astRagLoadIndexDocument(built.indexFileId).document;
  assert.equal(before.sources.length, 2);

  const originalRead = context.astRagReadDriveSourceText;
  context.astRagReadDriveSourceText = (sourceDescriptor, auth, options) => {
    if (sourceDescriptor.fileId === 'file_keep_b') {
      throw new Error('transient parse failure');
    }
    return originalRead(sourceDescriptor, auth, options);
  };

  const synced = context.AST.RAG.syncIndex({
    source: {
      folderId: 'root',
      includeSubfolders: false,
      includeMimeTypes: [MIME_TEXT]
    },
    index: {
      indexName: 'sync-preserve-index',
      indexFileId: built.indexFileId
    },
    embedding: {
      provider: 'openai',
      model: 'text-embedding-3-small'
    },
    options: {
      skipParseFailures: true,
      maxFiles: 20,
      maxChunks: 200
    },
    auth: {
      apiKey: 'test-openai-key'
    }
  });

  assert.equal(synced.addedSources, 0);
  assert.equal(synced.updatedSources, 0);
  assert.equal(synced.removedSources, 0);
  assert.equal(synced.warnings.length, 1);
  assert.equal(synced.warnings[0].fileId, 'file_keep_b');
  assert.equal(synced.warnings[0].preservedExistingData, true);

  const after = context.astRagLoadIndexDocument(built.indexFileId).document;
  assert.equal(after.sources.length, 2);
  assert.equal(after.chunks.length, before.chunks.length);
  assert.equal(after.sources.some(source => source.fileId === 'file_keep_b'), true);
});

test('search ranks and filters index chunks by cosine score', () => {
  const indexDoc = {
    schemaVersion: '1.0',
    indexId: 'idx_1',
    indexName: 'rank-index',
    embedding: {
      provider: 'openai',
      model: 'text-embedding-3-small',
      dimensions: 3
    },
    sources: [],
    chunks: [
      {
        chunkId: 'c1',
        sourceId: 's1',
        fileId: 'f1',
        fileName: 'one.txt',
        mimeType: MIME_TEXT,
        page: null,
        slide: null,
        section: 'body',
        text: 'one',
        embedding: [1, 0, 0]
      },
      {
        chunkId: 'c2',
        sourceId: 's2',
        fileId: 'f2',
        fileName: 'two.txt',
        mimeType: MIME_TEXT,
        page: null,
        slide: null,
        section: 'body',
        text: 'two',
        embedding: [0.2, 0.9, 0]
      }
    ]
  };

  const context = createGasContext();
  loadRagScripts(context, { includeAst: true });

  context.astRagLoadIndexDocument = () => ({
    indexFileId: 'index_search',
    fileName: 'rank-index.json',
    document: indexDoc
  });
  context.astRagEmbedTexts = () => ({
    vectors: [[1, 0, 0]],
    usage: { inputTokens: 1, totalTokens: 1 }
  });

  const output = context.AST.RAG.search({
    indexFileId: 'index_search',
    query: 'find one',
    topK: 2,
    minScore: 0,
    filters: { fileIds: ['f1'] }
  });

  assert.equal(output.results.length, 1);
  assert.equal(output.results[0].chunkId, 'c1');
  assert.equal(output.results[0].score > 0.99, true);
  assert.equal(output.mode, 'vector');
});

test('search cache reuses query embedding and ranked results when enabled', () => {
  const indexDoc = {
    schemaVersion: '1.0',
    indexId: 'idx_cache',
    indexName: 'cache-index',
    updatedAt: '2026-02-01T00:00:00.000Z',
    embedding: {
      provider: 'openai',
      model: 'text-embedding-3-small',
      dimensions: 3
    },
    sources: [],
    chunks: [
      {
        chunkId: 'c1',
        sourceId: 's1',
        fileId: 'f1',
        fileName: 'one.txt',
        mimeType: MIME_TEXT,
        page: null,
        slide: null,
        section: 'body',
        text: 'cache me once',
        embedding: [1, 0, 0]
      }
    ]
  };

  let embedCalls = 0;
  const context = createGasContext();
  loadRagWithCacheScripts(context, { includeAst: true });

  context.astRagLoadIndexDocument = () => ({
    indexFileId: 'index_cache',
    fileName: 'cache-index.json',
    versionToken: '2026-02-01T00:00:00.000Z',
    document: indexDoc
  });
  context.astRagEmbedTexts = () => {
    embedCalls += 1;
    return {
      vectors: [[1, 0, 0]],
      usage: { inputTokens: 2, totalTokens: 2 }
    };
  };

  const request = {
    indexFileId: 'index_cache',
    query: 'cache me',
    retrieval: {
      topK: 2,
      minScore: 0
    },
    cache: {
      enabled: true,
      backend: 'memory',
      namespace: 'rag_test_cache'
    }
  };

  const first = context.AST.RAG.search(request);
  const second = context.AST.RAG.search(request);

  assert.equal(first.results.length, 1);
  assert.equal(second.results.length, 1);
  assert.equal(embedCalls, 1, 'second search should reuse cached embedding/ranking');
});

test('search diagnostics include phase timings and cache-hit metadata when enabled', () => {
  const indexDoc = {
    schemaVersion: '1.0',
    indexId: 'idx_diag_search',
    indexName: 'diag-search-index',
    updatedAt: '2026-02-01T00:00:00.000Z',
    embedding: {
      provider: 'openai',
      model: 'text-embedding-3-small',
      dimensions: 3
    },
    sources: [],
    chunks: [
      {
        chunkId: 'diag_chunk_1',
        sourceId: 'diag_src_1',
        fileId: 'diag_file_1',
        fileName: 'diag.txt',
        mimeType: MIME_TEXT,
        page: null,
        slide: null,
        section: 'body',
        text: 'Diagnostics search content',
        embedding: [1, 0, 0]
      }
    ]
  };

  let embedCalls = 0;
  const context = createGasContext();
  loadRagWithCacheScripts(context, { includeAst: true });

  context.astRagLoadIndexDocument = () => ({
    indexFileId: 'index_diag_search',
    fileName: 'diag-search-index.json',
    versionToken: '2026-02-01T00:00:00.000Z',
    cacheHit: true,
    document: indexDoc
  });
  context.astRagEmbedTexts = () => {
    embedCalls += 1;
    return {
      vectors: [[1, 0, 0]],
      usage: { inputTokens: 2, totalTokens: 2 }
    };
  };

  const request = {
    indexFileId: 'index_diag_search',
    query: 'diagnostics',
    retrieval: {
      topK: 3,
      minScore: 0
    },
    options: {
      diagnostics: true
    },
    cache: {
      enabled: true,
      backend: 'memory',
      namespace: 'rag_diag_search_cache'
    }
  };

  const first = context.AST.RAG.search(request);
  const second = context.AST.RAG.search(request);

  assert.equal(embedCalls, 1);
  assert.equal(typeof first.diagnostics, 'object');
  assert.equal(first.diagnostics.cache.indexDocHit, true);
  assert.equal(first.diagnostics.cache.searchHit, false);
  assert.equal(typeof first.diagnostics.timings.indexLoadMs, 'number');
  assert.equal(typeof first.diagnostics.timings.embeddingMs, 'number');
  assert.equal(typeof first.diagnostics.timings.retrievalMs, 'number');
  assert.equal(first.diagnostics.retrieval.mode, 'vector');
  assert.equal(first.diagnostics.retrieval.returned, 1);

  assert.equal(typeof second.diagnostics, 'object');
  assert.equal(second.diagnostics.cache.searchHit, true);
  assert.equal(second.diagnostics.cache.embeddingHit, true);
});

test('search supports hybrid retrieval with lexical+vector score fusion', () => {
  const indexDoc = {
    schemaVersion: '1.0',
    indexId: 'idx_hybrid',
    indexName: 'hybrid-index',
    embedding: {
      provider: 'openai',
      model: 'text-embedding-3-small',
      dimensions: 3
    },
    sources: [],
    chunks: [
      {
        chunkId: 'vector_first',
        sourceId: 's1',
        fileId: 'f1',
        fileName: 'vector.txt',
        mimeType: MIME_TEXT,
        page: null,
        slide: null,
        section: 'body',
        text: 'General overview with limited keyword overlap.',
        embedding: [1, 0, 0]
      },
      {
        chunkId: 'lexical_first',
        sourceId: 's2',
        fileId: 'f2',
        fileName: 'lexical.txt',
        mimeType: MIME_TEXT,
        page: null,
        slide: null,
        section: 'body',
        text: 'Project risks and mitigation plan with explicit project risks details.',
        embedding: [0.4, 0.9, 0]
      }
    ]
  };

  const context = createGasContext();
  loadRagScripts(context, { includeAst: true });

  context.astRagLoadIndexDocument = () => ({
    indexFileId: 'index_hybrid',
    fileName: 'hybrid-index.json',
    document: indexDoc
  });
  context.astRagEmbedTexts = () => ({
    vectors: [[1, 0, 0]],
    usage: { inputTokens: 1, totalTokens: 1 }
  });

  const output = context.AST.RAG.search({
    indexFileId: 'index_hybrid',
    query: 'project risks',
    retrieval: {
      mode: 'hybrid',
      topK: 2,
      minScore: 0,
      vectorWeight: 0.15,
      lexicalWeight: 0.85
    }
  });

  assert.equal(output.mode, 'hybrid');
  assert.equal(output.results.length, 2);
  assert.equal(output.results[0].chunkId, 'lexical_first');
  assert.equal(typeof output.results[0].vectorScore, 'number');
  assert.equal(typeof output.results[0].lexicalScore, 'number');
  assert.equal(typeof output.results[0].finalScore, 'number');
  assert.equal(output.results[0].score, output.results[0].finalScore);
});

test('search supports lexical retrieval mode without embedding calls', () => {
  const indexDoc = {
    schemaVersion: '1.0',
    indexId: 'idx_lexical',
    indexName: 'lexical-index',
    sources: [],
    chunks: [
      {
        chunkId: 'lexical_hit',
        sourceId: 's1',
        fileId: 'f1',
        fileName: 'lexical-hit.txt',
        mimeType: MIME_TEXT,
        page: null,
        slide: null,
        section: 'body',
        text: 'Project risks include supplier delays and mitigation controls.'
      },
      {
        chunkId: 'lexical_miss',
        sourceId: 's2',
        fileId: 'f2',
        fileName: 'lexical-miss.txt',
        mimeType: MIME_TEXT,
        page: null,
        slide: null,
        section: 'body',
        text: 'Completely unrelated content.'
      }
    ]
  };

  const context = createGasContext();
  loadRagScripts(context, { includeAst: true });

  context.astRagLoadIndexDocument = () => ({
    indexFileId: 'index_lexical',
    fileName: 'lexical-index.json',
    document: indexDoc
  });
  context.astRagEmbedTexts = () => {
    throw new Error('astRagEmbedTexts should not run in lexical mode');
  };

  const output = context.AST.RAG.search({
    indexFileId: 'index_lexical',
    query: 'project risks',
    retrieval: {
      mode: 'lexical',
      topK: 2,
      minScore: 0
    }
  });

  assert.equal(output.mode, 'lexical');
  assert.equal(output.results.length, 2);
  assert.equal(output.results[0].chunkId, 'lexical_hit');
  assert.equal(output.results[0].vectorScore, null);
  assert.equal(typeof output.results[0].lexicalScore, 'number');
  assert.equal(typeof output.results[0].finalScore, 'number');
  assert.equal(output.results[0].score, output.results[0].finalScore);
  assert.equal(output.usage.totalTokens, 0);
});

test('search rerank can promote phrase-exact chunk within topN', () => {
  const indexDoc = {
    schemaVersion: '1.0',
    indexId: 'idx_rerank',
    indexName: 'rerank-index',
    embedding: {
      provider: 'openai',
      model: 'text-embedding-3-small',
      dimensions: 3
    },
    sources: [],
    chunks: [
      {
        chunkId: 'vector_ahead',
        sourceId: 's1',
        fileId: 'f1',
        fileName: 'a.txt',
        mimeType: MIME_TEXT,
        page: null,
        slide: null,
        section: 'body',
        text: 'Checklist details are described later.',
        embedding: [1, 0, 0]
      },
      {
        chunkId: 'phrase_exact',
        sourceId: 's2',
        fileId: 'f2',
        fileName: 'b.txt',
        mimeType: MIME_TEXT,
        page: null,
        slide: null,
        section: 'body',
        text: 'Critical launch checklist includes rollback, owners, and approvals.',
        embedding: [0.95, 0.31, 0]
      }
    ]
  };

  const context = createGasContext();
  loadRagScripts(context, { includeAst: true });

  context.astRagLoadIndexDocument = () => ({
    indexFileId: 'index_rerank',
    fileName: 'rerank-index.json',
    document: indexDoc
  });
  context.astRagEmbedTexts = () => ({
    vectors: [[1, 0, 0]],
    usage: { inputTokens: 1, totalTokens: 1 }
  });

  const output = context.AST.RAG.search({
    indexFileId: 'index_rerank',
    query: 'critical launch checklist',
    retrieval: {
      mode: 'vector',
      topK: 2,
      minScore: 0,
      rerank: {
        enabled: true,
        topN: 2
      }
    }
  });

  assert.equal(output.results.length, 2);
  assert.equal(output.results[0].chunkId, 'phrase_exact');
  assert.equal(typeof output.results[0].rerankScore, 'number');
});

test('search enforces retrieval access control allow/deny constraints', () => {
  const indexDoc = {
    schemaVersion: '1.0',
    indexId: 'idx_access',
    indexName: 'access-index',
    embedding: {
      provider: 'openai',
      model: 'text-embedding-3-small',
      dimensions: 3
    },
    sources: [],
    chunks: [
      {
        chunkId: 'allowed_chunk',
        sourceId: 's1',
        fileId: 'allowed_file',
        fileName: 'allowed.txt',
        mimeType: MIME_TEXT,
        page: null,
        slide: null,
        section: 'body',
        text: 'Project risks and mitigations',
        embedding: [1, 0, 0]
      },
      {
        chunkId: 'denied_chunk',
        sourceId: 's2',
        fileId: 'denied_file',
        fileName: 'denied.txt',
        mimeType: MIME_TEXT,
        page: null,
        slide: null,
        section: 'body',
        text: 'Sensitive project risks and escalations',
        embedding: [0.98, 0.05, 0]
      }
    ]
  };

  const context = createGasContext();
  loadRagScripts(context, { includeAst: true });

  context.astRagLoadIndexDocument = () => ({
    indexFileId: 'index_access',
    fileName: 'access-index.json',
    document: indexDoc
  });
  context.astRagEmbedTexts = () => ({
    vectors: [[1, 0, 0]],
    usage: { inputTokens: 1, totalTokens: 1 }
  });

  const output = context.AST.RAG.search({
    indexFileId: 'index_access',
    query: 'project risks',
    retrieval: {
      topK: 5,
      minScore: 0,
      access: {
        allowedFileIds: ['allowed_file'],
        deniedFileIds: ['denied_file']
      }
    },
    options: {
      enforceAccessControl: true
    }
  });

  assert.equal(output.results.length, 1);
  assert.equal(output.results[0].chunkId, 'allowed_chunk');
  assert.equal(output.results[0].fileId, 'allowed_file');

  const outputNoEnforce = context.AST.RAG.search({
    indexFileId: 'index_access',
    query: 'project risks',
    retrieval: {
      topK: 5,
      minScore: 0,
      access: {
        deniedFileIds: ['denied_file']
      }
    },
    options: {
      enforceAccessControl: false
    }
  });

  assert.equal(outputNoEnforce.results.length, 2);
});

test('answer enforces strict citation mapping and abstains on missing grounding', () => {
  const context = createGasContext();
  loadRagScripts(context, { includeAst: true });

  context.astRagLoadIndexDocument = () => ({
    indexFileId: 'index_answer',
    fileName: 'answer-index.json',
    document: {
      embedding: {
        provider: 'openai',
        model: 'text-embedding-3-small'
      },
      chunks: [
        {
          chunkId: 'chunk_1',
          sourceId: 'src_1',
          fileId: 'f_1',
          fileName: 'doc.txt',
          mimeType: MIME_TEXT,
          page: null,
          slide: null,
          section: 'body',
          text: 'The support email is support@example.com.',
          embedding: [1, 0, 0]
        }
      ]
    }
  });
  context.astRagEmbedTexts = () => ({
    vectors: [[1, 0, 0]],
    usage: { inputTokens: 1, totalTokens: 1 }
  });

  context.runAiRequest = () => ({
    output: {
      json: {
        answer: 'Contact support@example.com [S1]',
        citations: ['S1']
      }
    },
    usage: {
      inputTokens: 2,
      outputTokens: 4,
      totalTokens: 6
    }
  });

  const grounded = context.AST.RAG.answer({
    indexFileId: 'index_answer',
    question: 'What is the support email?',
    generation: {
      provider: 'openai',
      auth: { apiKey: 'test-key' }
    },
    options: {
      requireCitations: true,
      insufficientEvidenceMessage: 'Insufficient context.'
    }
  });

  assert.equal(grounded.status, 'ok');
  assert.equal(grounded.citations.length, 1);
  assert.equal(grounded.citations[0].chunkId, 'chunk_1');
  assert.equal(grounded.retrieval.mode, 'vector');
  assert.equal(typeof grounded.citations[0].vectorScore, 'number');
  assert.equal(grounded.citations[0].lexicalScore, null);
  assert.equal(typeof grounded.citations[0].finalScore, 'number');
  assert.equal(grounded.citations[0].finalScore, grounded.citations[0].score);
  assert.equal(grounded.citations[0].rerankScore, null);

  context.runAiRequest = () => ({
    output: {
      json: {
        answer: 'I think it is support@example.com.',
        citations: []
      }
    },
    usage: {
      inputTokens: 2,
      outputTokens: 4,
      totalTokens: 6
    }
  });

  const abstain = context.AST.RAG.answer({
    indexFileId: 'index_answer',
    question: 'What is the support email?',
    generation: {
      provider: 'openai',
      auth: { apiKey: 'test-key' }
    },
    options: {
      requireCitations: true,
      insufficientEvidenceMessage: 'Insufficient context.'
    }
  });

  assert.equal(abstain.status, 'insufficient_context');
  assert.equal(abstain.answer, 'Insufficient context.');
});

test('answer supports lexical retrieval mode without embedding calls', () => {
  const context = createGasContext();
  loadRagScripts(context, { includeAst: true });

  context.astRagLoadIndexDocument = () => ({
    indexFileId: 'index_answer_lexical',
    fileName: 'answer-lexical-index.json',
    document: {
      chunks: [
        {
          chunkId: 'chunk_lexical_1',
          sourceId: 'src_lexical_1',
          fileId: 'f_lexical_1',
          fileName: 'lexical.txt',
          mimeType: MIME_TEXT,
          page: null,
          slide: null,
          section: 'body',
          text: 'Project timeline includes preparation and reopening phases.'
        }
      ]
    }
  });
  context.astRagEmbedTexts = () => {
    throw new Error('astRagEmbedTexts should not run in lexical mode');
  };

  context.runAiRequest = () => ({
    output: {
      json: {
        answer: 'The timeline includes preparation and reopening [S1]',
        citations: ['S1']
      }
    },
    usage: {
      inputTokens: 3,
      outputTokens: 5,
      totalTokens: 8
    }
  });

  const grounded = context.AST.RAG.answer({
    indexFileId: 'index_answer_lexical',
    question: 'What are the timeline phases?',
    retrieval: {
      mode: 'lexical',
      topK: 1,
      minScore: 0
    },
    generation: {
      provider: 'openai',
      auth: { apiKey: 'test-key' }
    }
  });

  assert.equal(grounded.status, 'ok');
  assert.equal(grounded.retrieval.mode, 'lexical');
  assert.equal(grounded.citations.length, 1);
  assert.equal(grounded.citations[0].vectorScore, null);
  assert.equal(typeof grounded.citations[0].lexicalScore, 'number');
  assert.equal(typeof grounded.citations[0].finalScore, 'number');
});

test('answer cache reuses grounded response when history is empty', () => {
  const context = createGasContext();
  loadRagWithCacheScripts(context, { includeAst: true });

  let embedCalls = 0;
  let generationCalls = 0;
  context.astRagLoadIndexDocument = () => ({
    indexFileId: 'index_answer_cache',
    fileName: 'answer-cache.json',
    versionToken: '2026-02-01T00:00:00.000Z',
    document: {
      updatedAt: '2026-02-01T00:00:00.000Z',
      embedding: {
        provider: 'openai',
        model: 'text-embedding-3-small'
      },
      chunks: [
        {
          chunkId: 'chunk_cache_1',
          sourceId: 'src_1',
          fileId: 'f_1',
          fileName: 'doc.txt',
          mimeType: MIME_TEXT,
          page: null,
          slide: null,
          section: 'body',
          text: 'Cached answer grounding text.',
          embedding: [1, 0, 0]
        }
      ]
    }
  });
  context.astRagEmbedTexts = () => {
    embedCalls += 1;
    return {
      vectors: [[1, 0, 0]],
      usage: { inputTokens: 1, totalTokens: 1 }
    };
  };
  context.runAiRequest = () => {
    generationCalls += 1;
    return {
      output: {
        json: {
          answer: 'Cached answer [S1]',
          citations: ['S1']
        }
      },
      usage: {
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15
      }
    };
  };

  const request = {
    indexFileId: 'index_answer_cache',
    question: 'What is cached?',
    generation: {
      provider: 'openai',
      auth: { apiKey: 'test-key' }
    },
    cache: {
      enabled: true,
      backend: 'memory',
      namespace: 'rag_answer_cache_test'
    }
  };

  const first = context.AST.RAG.answer(request);
  const second = context.AST.RAG.answer(request);

  assert.equal(first.status, 'ok');
  assert.equal(second.status, 'ok');
  assert.equal(embedCalls, 1);
  assert.equal(generationCalls, 1, 'second answer should reuse cached grounded output');
});

test('answer returns insufficient_context when access policy excludes all retrieved chunks', () => {
  const context = createGasContext();
  loadRagScripts(context, { includeAst: true });

  context.astRagLoadIndexDocument = () => ({
    indexFileId: 'index_answer_access',
    fileName: 'answer-access-index.json',
    document: {
      embedding: {
        provider: 'openai',
        model: 'text-embedding-3-small'
      },
      chunks: [
        {
          chunkId: 'chunk_denied',
          sourceId: 'src_denied',
          fileId: 'file_denied',
          fileName: 'denied.txt',
          mimeType: MIME_TEXT,
          page: null,
          slide: null,
          section: 'body',
          text: 'Denied content only',
          embedding: [1, 0, 0]
        }
      ]
    }
  });
  context.astRagEmbedTexts = () => ({
    vectors: [[1, 0, 0]],
    usage: { inputTokens: 1, totalTokens: 1 }
  });

  let aiCallCount = 0;
  context.runAiRequest = () => {
    aiCallCount += 1;
    return {
      output: {
        json: {
          answer: 'Denied content [S1]',
          citations: ['S1']
        }
      },
      usage: {
        inputTokens: 1,
        outputTokens: 1,
        totalTokens: 2
      }
    };
  };

  const response = context.AST.RAG.answer({
    indexFileId: 'index_answer_access',
    question: 'What is the denied content?',
    retrieval: {
      topK: 4,
      minScore: 0,
      access: {
        allowedFileIds: ['file_allowed']
      }
    },
    generation: {
      provider: 'openai',
      auth: { apiKey: 'test-key' }
    },
    options: {
      enforceAccessControl: true,
      requireCitations: true,
      insufficientEvidenceMessage: 'No accessible context.'
    }
  });

  assert.equal(response.status, 'insufficient_context');
  assert.equal(response.answer, 'No accessible context.');
  assert.equal(response.citations.length, 0);
  assert.equal(aiCallCount, 0);
});

test('answer citation validation rejects inaccessible cited chunks when access is enforced', () => {
  const context = createGasContext();
  loadRagScripts(context, { includeAst: true });

  const originalRetrieve = context.astRagRetrieveRankedChunks;
  context.astRagLoadIndexDocument = () => ({
    indexFileId: 'index_answer_access_citation',
    fileName: 'answer-access-citation-index.json',
    document: {
      embedding: {
        provider: 'openai',
        model: 'text-embedding-3-small'
      },
      chunks: []
    }
  });
  context.astRagEmbedTexts = () => ({
    vectors: [[1, 0, 0]],
    usage: { inputTokens: 1, totalTokens: 1 }
  });
  context.astRagRetrieveRankedChunks = () => [{
    chunkId: 'chunk_denied',
    sourceId: 'src_denied',
    fileId: 'file_denied',
    fileName: 'denied.txt',
    mimeType: MIME_TEXT,
    page: null,
    slide: null,
    section: 'body',
    text: 'Denied content only',
    score: 1,
    finalScore: 1,
    vectorScore: 1,
    lexicalScore: null
  }];
  context.runAiRequest = () => ({
    output: {
      json: {
        answer: 'Denied content [S1]',
        citations: ['S1']
      }
    },
    usage: {
      inputTokens: 1,
      outputTokens: 1,
      totalTokens: 2
    }
  });

  try {
    const response = context.AST.RAG.answer({
      indexFileId: 'index_answer_access_citation',
      question: 'What is the denied content?',
      retrieval: {
        access: {
          allowedFileIds: ['file_allowed']
        }
      },
      generation: {
        provider: 'openai',
        auth: { apiKey: 'test-key' }
      },
      options: {
        enforceAccessControl: true,
        requireCitations: true,
        insufficientEvidenceMessage: 'No accessible context.'
      }
    });

    assert.equal(response.status, 'insufficient_context');
    assert.equal(response.answer, 'No accessible context.');
    assert.equal(response.citations.length, 0);
  } finally {
    context.astRagRetrieveRankedChunks = originalRetrieve;
  }
});

test('answer diagnostics include stable retrieval and generation metadata', () => {
  const context = createGasContext();
  loadRagScripts(context, { includeAst: true });

  context.astRagLoadIndexDocument = () => ({
    indexFileId: 'index_answer_diag',
    fileName: 'answer-diag-index.json',
    document: {
      embedding: {
        provider: 'openai',
        model: 'text-embedding-3-small'
      },
      chunks: [
        {
          chunkId: 'chunk_diag_1',
          sourceId: 'src_diag_1',
          fileId: 'file_diag_1',
          fileName: 'diag.txt',
          mimeType: MIME_TEXT,
          page: null,
          slide: null,
          section: 'body',
          text: 'Project diagnostics baseline content.',
          embedding: [1, 0, 0]
        }
      ]
    }
  });

  context.astRagEmbedTexts = () => ({
    vectors: [[1, 0, 0]],
    usage: { inputTokens: 1, totalTokens: 1 }
  });

  context.runAiRequest = () => ({
    finishReason: 'STOP',
    output: {
      json: {
        answer: 'Diagnostics baseline answer [S1]',
        citations: ['S1']
      }
    },
    usage: {
      inputTokens: 3,
      outputTokens: 4,
      totalTokens: 7
    }
  });

  const response = context.AST.RAG.answer({
    indexFileId: 'index_answer_diag',
    question: 'Provide diagnostics baseline.',
    generation: {
      provider: 'openai',
      auth: { apiKey: 'test-key' }
    },
    options: {
      diagnostics: true
    }
  });

  assert.equal(response.status, 'ok');
  assert.equal(typeof response.diagnostics, 'object');
  assert.equal(response.diagnostics.pipelinePath, 'standard');
  assert.equal(typeof response.diagnostics.totalMs, 'number');
  assert.equal(response.diagnostics.retrieval.source, 'index');
  assert.equal(typeof response.diagnostics.retrieval.ms, 'number');
  assert.equal(response.diagnostics.retrieval.rawSources, 1);
  assert.equal(response.diagnostics.retrieval.usableSources, 1);
  assert.equal(response.diagnostics.generation.status, 'ok');
  assert.equal(response.diagnostics.generation.grounded, true);
});

test('answer omits diagnostics by default when diagnostics option is not enabled', () => {
  const context = createGasContext();
  loadRagScripts(context, { includeAst: true });

  context.astRagLoadIndexDocument = () => ({
    indexFileId: 'index_answer_no_diag',
    fileName: 'answer-no-diag-index.json',
    document: {
      embedding: {
        provider: 'openai',
        model: 'text-embedding-3-small'
      },
      chunks: [
        {
          chunkId: 'chunk_no_diag_1',
          sourceId: 'src_no_diag_1',
          fileId: 'file_no_diag_1',
          fileName: 'no-diag.txt',
          mimeType: MIME_TEXT,
          page: null,
          slide: null,
          section: 'body',
          text: 'No diagnostics by default.',
          embedding: [1, 0, 0]
        }
      ]
    }
  });

  context.astRagEmbedTexts = () => ({
    vectors: [[1, 0, 0]],
    usage: { inputTokens: 1, totalTokens: 1 }
  });

  context.runAiRequest = () => ({
    output: {
      json: {
        answer: 'No diagnostics response [S1]',
        citations: ['S1']
      }
    },
    usage: {
      inputTokens: 3,
      outputTokens: 3,
      totalTokens: 6
    }
  });

  const response = context.AST.RAG.answer({
    indexFileId: 'index_answer_no_diag',
    question: 'Do we include diagnostics?',
    generation: {
      provider: 'openai',
      auth: { apiKey: 'test-key' }
    }
  });

  assert.equal(response.status, 'ok');
  assert.equal(typeof response.diagnostics, 'undefined');
});

test('answer recovery policy relaxes retrieval and applies recovered candidates', () => {
  const context = createGasContext();
  loadRagScripts(context, { includeAst: true });

  context.astRagLoadIndexDocument = () => ({
    indexFileId: 'index_answer_recovery',
    fileName: 'answer-recovery-index.json',
    document: {
      embedding: {
        provider: 'openai',
        model: 'text-embedding-3-small'
      },
      chunks: [
        {
          chunkId: 'chunk_recovery_1',
          sourceId: 'src_recovery_1',
          fileId: 'file_recovery_1',
          fileName: 'recovery.txt',
          mimeType: MIME_TEXT,
          page: null,
          slide: null,
          section: 'body',
          text: 'Recovery candidate content.',
          embedding: [1, 0, 0]
        }
      ]
    }
  });

  context.astRagEmbedTexts = () => ({
    vectors: [[1, 0, 0]],
    usage: { inputTokens: 1, totalTokens: 1 }
  });

  let retrievalCalls = 0;
  const originalRetrieve = context.astRagRetrieveRankedChunks;
  context.astRagRetrieveRankedChunks = (_index, _query, _vector, retrieval) => {
    retrievalCalls += 1;
    if (retrieval.minScore >= 0.8) {
      return [];
    }
    return [{
      chunkId: 'chunk_recovery_1',
      sourceId: 'src_recovery_1',
      fileId: 'file_recovery_1',
      fileName: 'recovery.txt',
      mimeType: MIME_TEXT,
      page: null,
      slide: null,
      section: 'body',
      text: 'Recovery candidate content.',
      score: 0.31,
      finalScore: 0.31,
      vectorScore: 0.31,
      lexicalScore: null
    }];
  };

  context.runAiRequest = () => ({
    output: {
      json: {
        answer: 'Recovery answer [S1]',
        citations: ['S1']
      }
    },
    usage: {
      inputTokens: 3,
      outputTokens: 3,
      totalTokens: 6
    }
  });

  try {
    const response = context.AST.RAG.answer({
      indexFileId: 'index_answer_recovery',
      question: 'Can recovery find context?',
      retrieval: {
        topK: 2,
        minScore: 0.8,
        recovery: {
          enabled: true,
          topKBoost: 2,
          minScoreFloor: 0.1,
          maxAttempts: 2
        }
      },
      generation: {
        provider: 'openai',
        auth: { apiKey: 'test-key' }
      },
      options: {
        diagnostics: true
      }
    });

    assert.equal(response.status, 'ok');
    assert.equal(response.diagnostics.pipelinePath, 'recovery_applied');
    assert.equal(response.diagnostics.retrieval.recoveryAttempted, true);
    assert.equal(response.diagnostics.retrieval.recoveryApplied, true);
    assert.equal(response.diagnostics.retrieval.attempts.length >= 1, true);
    assert.equal(retrievalCalls >= 2, true);
  } finally {
    context.astRagRetrieveRankedChunks = originalRetrieve;
  }
});

test('answer fallback.onRetrievalError returns deterministic fallback instead of throwing', () => {
  const context = createGasContext();
  loadRagScripts(context, { includeAst: true });

  context.astRagLoadIndexDocument = () => ({
    indexFileId: 'index_answer_fallback_error',
    fileName: 'answer-fallback-error-index.json',
    document: {
      embedding: {
        provider: 'openai',
        model: 'text-embedding-3-small'
      },
      chunks: [
        {
          chunkId: 'chunk_error_1',
          sourceId: 'src_error_1',
          fileId: 'file_error_1',
          fileName: 'error.txt',
          mimeType: MIME_TEXT,
          page: null,
          slide: null,
          section: 'body',
          text: 'Error fallback source.',
          embedding: [1, 0, 0]
        }
      ]
    }
  });

  context.astRagEmbedTexts = () => {
    throw new Error('Embedding backend unavailable');
  };

  const response = context.AST.RAG.answer({
    indexFileId: 'index_answer_fallback_error',
    question: 'What happened?',
    fallback: {
      onRetrievalError: true
    },
    generation: {
      provider: 'openai',
      auth: { apiKey: 'test-key' }
    },
    options: {
      diagnostics: true,
      insufficientEvidenceMessage: 'Fallback insufficient.'
    }
  });

  assert.equal(response.status, 'insufficient_context');
  assert.equal(response.answer, 'Fallback insufficient.');
  assert.equal(response.diagnostics.pipelinePath, 'fallback');
  assert.equal(response.diagnostics.retrieval.emptyReason, 'retrieval_error');
  assert.equal(response.diagnostics.generation.status, 'skipped');
});

test('answer fallback.onRetrievalEmpty can synthesize citation-grounded facts', () => {
  const context = createGasContext();
  loadRagScripts(context, { includeAst: true });

  context.astRagLoadIndexDocument = () => ({
    indexFileId: 'index_answer_fallback_empty',
    fileName: 'answer-fallback-empty-index.json',
    document: {
      embedding: {
        provider: 'openai',
        model: 'text-embedding-3-small'
      },
      chunks: []
    }
  });

  const payload = context.astRagBuildRetrievalPayload({
    indexFileId: 'index_answer_fallback_empty',
    versionToken: null,
    query: 'Give me facts',
    retrieval: {
      topK: 3,
      minScore: 0.2
    },
    results: [
      {
        chunkId: 'chunk_payload_1',
        sourceId: 'src_payload_1',
        fileId: 'file_payload_1',
        fileName: 'payload.txt',
        mimeType: MIME_TEXT,
        section: 'body',
        text: 'The project starts with planning and partner alignment.',
        score: 0.55,
        finalScore: 0.55
      }
    ]
  });

  const response = context.AST.RAG.answer({
    indexFileId: 'index_answer_fallback_empty',
    question: 'Give me facts',
    retrievalPayload: payload,
    retrieval: {
      topK: 3,
      minScore: 0.9
    },
    fallback: {
      onRetrievalEmpty: true,
      intent: 'facts',
      factCount: 1
    },
    options: {
      diagnostics: true,
      insufficientEvidenceMessage: 'No grounded facts.'
    },
    generation: {
      provider: 'openai',
      auth: { apiKey: 'test-key' }
    }
  });

  assert.equal(response.status, 'ok');
  assert.equal(response.answer.includes('[S1]'), true);
  assert.equal(response.diagnostics.pipelinePath, 'fallback');
  assert.equal(response.diagnostics.retrieval.source, 'payload');
  assert.equal(response.diagnostics.retrieval.emptyReason, 'below_min_score');
  assert.equal(response.diagnostics.generation.status, 'not_started');
});

test('previewSources returns citation-ready cards and caches retrieval payloads', () => {
  const context = createGasContext();
  loadRagWithCacheScripts(context, { includeAst: true });

  let loadCalls = 0;
  context.astRagLoadIndexDocument = () => {
    loadCalls += 1;
    return {
      indexFileId: 'index_preview_1',
      fileName: 'preview-index.json',
      versionToken: '2026-02-24T00:00:00.000Z',
      cacheHit: true,
      document: {
        updatedAt: '2026-02-24T00:00:00.000Z',
        embedding: {
          provider: 'openai',
          model: 'text-embedding-3-small'
        },
        chunks: [
          {
            chunkId: 'chunk_preview_1',
            sourceId: 'src_preview_1',
            fileId: 'doc_1',
            fileName: 'project-brief',
            mimeType: MIME_DOC,
            page: null,
            slide: null,
            section: 'body',
            text: 'Modernization project launch details and sequencing.',
            embedding: [1, 0, 0]
          }
        ]
      }
    };
  };

  context.astRagEmbedTexts = () => ({
    vectors: [[1, 0, 0]],
    usage: { inputTokens: 3, totalTokens: 3 }
  });

  const response = context.AST.RAG.previewSources({
    indexFileId: 'index_preview_1',
    query: 'project launch',
    retrieval: {
      topK: 5,
      minScore: 0
    },
    cache: {
      enabled: true,
      backend: 'memory',
      namespace: 'rag_preview_search_cache'
    },
    options: {
      diagnostics: true
    },
    preview: {
      cachePayload: true,
      payloadCache: {
        backend: 'memory',
        namespace: 'rag_preview_payload_cache'
      }
    }
  });

  assert.equal(response.cards.length, 1);
  assert.equal(response.cards[0].citationId, 'S1');
  assert.equal(
    response.cards[0].url,
    'https://docs.google.com/document/d/doc_1/edit'
  );
  assert.equal(typeof response.cacheKey, 'string');
  assert.equal(response.payload.query, 'project launch');
  assert.equal(typeof response.diagnostics, 'object');
  assert.equal(typeof response.diagnostics.timings.searchMs, 'number');
  assert.equal(typeof response.diagnostics.timings.payloadCacheWriteMs, 'number');
  assert.equal(response.diagnostics.retrieval.returned, 1);
  assert.equal(response.diagnostics.cache.indexDocHit, true);
  assert.equal(loadCalls, 1);

  const payload = context.AST.RAG.getRetrievalPayload(response.cacheKey, {
    backend: 'memory',
    namespace: 'rag_preview_payload_cache'
  });

  assert.equal(payload.indexFileId, 'index_preview_1');
  assert.equal(payload.results.length, 1);
});

test('previewSources validates search contract once per request', () => {
  const context = createGasContext();
  loadRagWithCacheScripts(context, { includeAst: true });

  const originalValidateSearchRequest = context.astRagValidateSearchRequest;
  let validateCalls = 0;
  context.astRagValidateSearchRequest = request => {
    validateCalls += 1;
    return originalValidateSearchRequest(request);
  };

  context.astRagLoadIndexDocument = () => ({
    indexFileId: 'index_preview_validate_once',
    fileName: 'preview-validate-once.json',
    versionToken: '2026-02-24T00:00:00.000Z',
    document: {
      updatedAt: '2026-02-24T00:00:00.000Z',
      embedding: {
        provider: 'openai',
        model: 'text-embedding-3-small'
      },
      chunks: [
        {
          chunkId: 'chunk_preview_validate_once_1',
          sourceId: 'src_preview_validate_once_1',
          fileId: 'doc_preview_validate_once_1',
          fileName: 'preview-validate-once',
          mimeType: MIME_TEXT,
          page: null,
          slide: null,
          section: 'body',
          text: 'Validation call counting for preview payload cache.',
          embedding: [1, 0, 0]
        }
      ]
    }
  });

  context.astRagEmbedTexts = () => ({
    vectors: [[1, 0, 0]],
    usage: { inputTokens: 1, totalTokens: 1 }
  });

  const response = context.AST.RAG.previewSources({
    indexFileId: 'index_preview_validate_once',
    query: 'validation call counting',
    retrieval: {
      topK: 3,
      minScore: 0
    },
    preview: {
      cachePayload: true,
      payloadCache: {
        backend: 'memory',
        namespace: 'rag_preview_validate_once'
      }
    }
  });

  assert.equal(response.resultCount, 1);
  assert.equal(validateCalls, 1);
});

test('previewSources supports lexical retrieval mode without embedding calls', () => {
  const context = createGasContext();
  loadRagWithCacheScripts(context, { includeAst: true });

  context.astRagLoadIndexDocument = () => ({
    indexFileId: 'index_preview_lexical',
    fileName: 'preview-lexical-index.json',
    versionToken: '2026-02-24T00:00:00.000Z',
    document: {
      updatedAt: '2026-02-24T00:00:00.000Z',
      chunks: [
        {
          chunkId: 'chunk_preview_lexical_1',
          sourceId: 'src_preview_lexical_1',
          fileId: 'doc_lexical_1',
          fileName: 'lexical-brief',
          mimeType: MIME_DOC,
          page: null,
          slide: null,
          section: 'body',
          text: 'Launch checklist covers project risks and mitigation.',
          embedding: [1, 0, 0]
        }
      ]
    }
  });

  context.astRagEmbedTexts = () => {
    throw new Error('astRagEmbedTexts should not run in lexical mode');
  };

  const response = context.AST.RAG.previewSources({
    indexFileId: 'index_preview_lexical',
    query: 'project risks',
    retrieval: {
      mode: 'lexical',
      topK: 5,
      minScore: 0
    },
    preview: {
      cachePayload: false
    }
  });

  assert.equal(response.retrieval.mode, 'lexical');
  assert.equal(response.cards.length, 1);
  assert.equal(response.cards[0].vectorScore, null);
  assert.equal(typeof response.cards[0].lexicalScore, 'number');
  assert.equal(typeof response.cards[0].finalScore, 'number');
});

test('previewSources cache key differentiates enforceAccessControl policy', () => {
  const context = createGasContext();
  loadRagWithCacheScripts(context, { includeAst: true });

  context.astRagLoadIndexDocument = () => ({
    indexFileId: 'index_preview_access',
    fileName: 'preview-access-index.json',
    versionToken: '2026-02-24T00:00:00.000Z',
    document: {
      updatedAt: '2026-02-24T00:00:00.000Z',
      embedding: {
        provider: 'openai',
        model: 'text-embedding-3-small'
      },
      chunks: [
        {
          chunkId: 'chunk_preview_access_1',
          sourceId: 'src_preview_access_1',
          fileId: 'file_preview_denied',
          fileName: 'denied.txt',
          mimeType: MIME_TEXT,
          page: null,
          slide: null,
          section: 'body',
          text: 'Restricted context',
          embedding: [1, 0, 0]
        }
      ]
    }
  });

  context.astRagEmbedTexts = () => ({
    vectors: [[1, 0, 0]],
    usage: { inputTokens: 2, totalTokens: 2 }
  });

  const strictResponse = context.AST.RAG.previewSources({
    indexFileId: 'index_preview_access',
    query: 'restricted context',
    retrieval: {
      topK: 5,
      minScore: 0,
      access: {
        allowedFileIds: ['file_other']
      }
    },
    options: {
      enforceAccessControl: true
    }
  });

  const relaxedResponse = context.AST.RAG.previewSources({
    indexFileId: 'index_preview_access',
    query: 'restricted context',
    retrieval: {
      topK: 5,
      minScore: 0,
      access: {
        allowedFileIds: ['file_other']
      }
    },
    options: {
      enforceAccessControl: false
    }
  });

  assert.equal(strictResponse.resultCount, 0);
  assert.equal(relaxedResponse.resultCount, 1);
  assert.notEqual(strictResponse.cacheKey, relaxedResponse.cacheKey);
});

test('answer reuses retrieval payload and skips query embedding when payload is provided', () => {
  const context = createGasContext();
  loadRagWithCacheScripts(context, { includeAst: true });

  let embedCalls = 0;
  context.astRagLoadIndexDocument = () => ({
    indexFileId: 'index_answer_payload',
    fileName: 'answer-payload-index.json',
    versionToken: '2026-02-24T00:00:00.000Z',
    document: {
      updatedAt: '2026-02-24T00:00:00.000Z',
      embedding: {
        provider: 'openai',
        model: 'text-embedding-3-small'
      },
      chunks: []
    }
  });
  context.astRagEmbedTexts = () => {
    embedCalls += 1;
    return {
      vectors: [[1, 0, 0]],
      usage: { inputTokens: 1, totalTokens: 1 }
    };
  };
  context.runAiRequest = () => ({
    output: {
      json: {
        answer: 'Project launch is underway [S1]',
        citations: ['S1']
      }
    },
    usage: {
      inputTokens: 11,
      outputTokens: 4,
      totalTokens: 15
    }
  });

  const payload = {
    indexFileId: 'index_answer_payload',
    versionToken: '2026-02-24T00:00:00.000Z',
    query: 'What is happening?',
    retrieval: {
      topK: 4,
      minScore: 0.1,
      mode: 'vector'
    },
    results: [
      {
        chunkId: 'chunk_payload_1',
        sourceId: 'src_payload_1',
        fileId: 'file_payload_1',
        fileName: 'notes.txt',
        mimeType: MIME_TEXT,
        page: null,
        slide: null,
        section: 'body',
        text: 'Project launch is underway and teams are aligned.',
        score: 0.9,
        finalScore: 0.9,
        vectorScore: 0.9,
        lexicalScore: null
      }
    ]
  };

  const response = context.AST.RAG.answer({
    indexFileId: 'index_answer_payload',
    question: 'What is happening?',
    retrievalPayload: payload,
    generation: {
      provider: 'openai',
      auth: { apiKey: 'test-key' }
    }
  });

  assert.equal(response.status, 'ok');
  assert.equal(response.citations.length, 1);
  assert.equal(response.citations[0].chunkId, 'chunk_payload_1');
  assert.equal(embedCalls, 0, 'embedding should be skipped when payload is reused');
});

test('answer bypasses answer cache when retrieval payload is provided', () => {
  const context = createGasContext();
  loadRagWithCacheScripts(context, { includeAst: true });

  let generationCalls = 0;
  context.astRagLoadIndexDocument = () => ({
    indexFileId: 'index_answer_payload_cache_bypass',
    fileName: 'answer-payload-cache-bypass-index.json',
    versionToken: '2026-02-24T00:00:00.000Z',
    document: {
      updatedAt: '2026-02-24T00:00:00.000Z',
      embedding: {
        provider: 'openai',
        model: 'text-embedding-3-small'
      },
      chunks: []
    }
  });
  context.astRagEmbedTexts = () => {
    throw new Error('Embedding path should not run when retrieval payload is supplied');
  };
  context.runAiRequest = () => {
    generationCalls += 1;
    return {
      output: {
        json: {
          answer: `Answer call ${generationCalls} [S1]`,
          citations: ['S1']
        }
      },
      usage: {
        inputTokens: 10,
        outputTokens: 4,
        totalTokens: 14
      }
    };
  };

  const baseRequest = {
    indexFileId: 'index_answer_payload_cache_bypass',
    question: 'What changed?',
    generation: {
      provider: 'openai',
      auth: { apiKey: 'test-key' }
    },
    cache: {
      enabled: true,
      backend: 'memory',
      namespace: 'rag_answer_payload_cache_bypass'
    }
  };

  const payloadA = {
    indexFileId: 'index_answer_payload_cache_bypass',
    versionToken: '2026-02-24T00:00:00.000Z',
    query: 'What changed?',
    retrieval: { topK: 4, minScore: 0, mode: 'vector' },
    results: [{
      chunkId: 'chunk_payload_a',
      sourceId: 'src_a',
      fileId: 'file_a',
      fileName: 'a.txt',
      mimeType: MIME_TEXT,
      page: null,
      slide: null,
      section: 'body',
      text: 'Payload A text',
      score: 0.9,
      finalScore: 0.9
    }]
  };

  const payloadB = {
    indexFileId: 'index_answer_payload_cache_bypass',
    versionToken: '2026-02-24T00:00:00.000Z',
    query: 'What changed?',
    retrieval: { topK: 4, minScore: 0, mode: 'vector' },
    results: [{
      chunkId: 'chunk_payload_b',
      sourceId: 'src_b',
      fileId: 'file_b',
      fileName: 'b.txt',
      mimeType: MIME_TEXT,
      page: null,
      slide: null,
      section: 'body',
      text: 'Payload B text',
      score: 0.95,
      finalScore: 0.95
    }]
  };

  const first = context.AST.RAG.answer(Object.assign({}, baseRequest, {
    retrievalPayload: payloadA
  }));
  const second = context.AST.RAG.answer(Object.assign({}, baseRequest, {
    retrievalPayload: payloadB
  }));

  assert.equal(generationCalls, 2);
  assert.equal(first.citations[0].chunkId, 'chunk_payload_a');
  assert.equal(second.citations[0].chunkId, 'chunk_payload_b');
});

test('IndexManager.ensure supports MIME fallback diagnostics and reuses existing index', () => {
  const sourceFile = makeDriveFile({
    id: 'file_mgr_1',
    name: 'mgr.txt',
    mimeType: MIME_TEXT,
    text: 'Manager build content'
  });
  const drive = createDriveRuntime({
    files: [sourceFile]
  });

  const context = createGasContext({
    DriveApp: drive.DriveApp
  });
  loadRagScripts(context, { includeAst: true });

  let embedCalls = 0;
  context.astRagEmbedTexts = request => {
    embedCalls += 1;
    return {
      model: request.model || 'text-embedding-3-small',
      vectors: request.texts.map(() => [1, 0, 0]),
      usage: {
        inputTokens: request.texts.length,
        totalTokens: request.texts.length
      }
    };
  };

  const manager = context.AST.RAG.IndexManager.create({
    defaults: {
      indexName: 'manager-index',
      source: {
        folderId: 'root',
        includeSubfolders: false
      },
      embedding: {
        provider: 'openai',
        model: 'text-embedding-3-small'
      },
      auth: {
        apiKey: 'test-openai-key'
      }
    }
  });

  const first = manager.ensure({
    source: {
      includeMimeTypes: [MIME_TEXT, 'application/zip']
    },
    options: {
      fallbackToSupportedMimeTypes: true,
      allowAutoBuild: true
    }
  });

  assert.equal(first.action, 'build');
  assert.equal(first.diagnostics.fallbackToSupportedMimeTypes, true);
  assert.equal(first.diagnostics.unsupportedMimeTypes[0], 'application/zip');
  assert.equal(typeof first.indexFileId, 'string');

  const second = manager.ensure({
    source: {
      folderId: 'root'
    }
  });

  assert.equal(second.action, 'reuse');
  assert.equal(second.indexFileId, first.indexFileId);
  assert.equal(embedCalls, 1, 'reuse path should avoid rebuilding embeddings');

  const fast = manager.fastState({ inspect: true });
  assert.equal(fast.ready, true);
  assert.equal(fast.chunkCount > 0, true);
});

test('Doc extraction works through DocumentApp for Google Docs sources', () => {
  const context = createGasContext({
    DocumentApp: {
      openById: () => ({
        getBody: () => ({
          getText: () => 'Document body text'
        })
      })
    }
  });

  loadRagScripts(context, { includeAi: false, includeUtilities: false });

  const extracted = context.astRagReadDriveSourceText({
    fileId: 'doc_1',
    fileName: 'brief',
    mimeType: MIME_DOC,
    driveFile: {}
  });

  assert.equal(extracted.segments.length, 1);
  assert.equal(extracted.segments[0].section, 'body');
  assert.equal(extracted.segments[0].text, 'Document body text');
});

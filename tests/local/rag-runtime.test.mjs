import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
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
  assert.equal(typeof inspected.indexVersion, 'string');
  assert.equal(inspected.indexVersion.length > 0, true);
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
  assert.equal(typeof inspected.indexVersion, 'string');
  assert.equal(inspected.indexVersion.length > 0, true);
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
      answerCache: false,
      insufficientEvidenceMessage: 'Insufficient context.'
    }
  });

  assert.equal(abstain.status, 'insufficient_context');
  assert.equal(abstain.answer, 'Insufficient context.');
});

test('answer reuses cached response for identical request and indexVersion', () => {
  const cacheStore = {};
  const context = createGasContext({
    CacheService: {
      getScriptCache: () => ({
        get: key => (Object.prototype.hasOwnProperty.call(cacheStore, key) ? cacheStore[key] : null),
        put: (key, value) => {
          cacheStore[key] = String(value);
        }
      })
    }
  });
  loadRagScripts(context, { includeAst: true });

  context.astRagLoadIndexDocument = () => ({
    indexFileId: 'index_cached_answer',
    fileName: 'index-cached-answer.json',
    document: {
      indexVersion: 'idxv_test_1',
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
          text: 'Cached response test context',
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
          answer: 'Cached response test context [S1]',
          citations: ['S1']
        }
      },
      usage: {
        inputTokens: 2,
        outputTokens: 3,
        totalTokens: 5
      }
    };
  };

  const request = {
    indexFileId: 'index_cached_answer',
    question: 'What is the cached context?',
    generation: {
      provider: 'openai',
      auth: { apiKey: 'test-key' }
    },
    options: {
      answerCache: true,
      answerCacheTtlSec: 300,
      requireCitations: true
    }
  };

  const first = context.AST.RAG.answer(request);
  const second = context.AST.RAG.answer(request);

  assert.equal(first.status, 'ok');
  assert.equal(second.status, 'ok');
  assert.equal(second.cached, true);
  assert.equal(aiCallCount, 1);
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

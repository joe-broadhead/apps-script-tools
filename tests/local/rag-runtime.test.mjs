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

function createEmbeddingFetchMock() {
  return {
    fetch: (_url, options) => {
      const payload = JSON.parse(options.payload);
      const inputs = Array.isArray(payload.input) ? payload.input : [payload.input];
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

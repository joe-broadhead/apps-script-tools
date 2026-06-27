import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadCoreDataContext } from './helpers.mjs';

test('DataFrame constructor helpers preserve pure fromColumns behavior', () => {
  const context = createGasContext();
  loadCoreDataContext(context);

  const source = [1, 2];
  const frame = context.astDataFrameFromColumns(context.DataFrame, {
    id: source
  });
  source[0] = 99;

  assert.equal(JSON.stringify(frame.toRecords()), JSON.stringify([
    { id: 1 },
    { id: 2 }
  ]));
});

test('DataFrame IO constructors remain thin static API delegates', () => {
  const calls = [];
  const context = createGasContext({
    EnhancedSheet: class EnhancedSheet {
      constructor(sheet) {
        this.sheet = sheet;
      }

      toDataFrame(options) {
        calls.push({ type: 'sheet', sheet: this.sheet, options });
        return context.DataFrame.fromRecords([{ id: 10 }]);
      }
    },
    readFileFromDrive: (fileId, fileType, options) => {
      calls.push({ type: 'drive', fileId, fileType, options });
      return [{ id: 20 }];
    },
    runSqlQuery: request => {
      calls.push({ type: 'query', request });
      return { provider: request.provider, rows: 1 };
    }
  });

  loadCoreDataContext(context);

  assert.equal(JSON.stringify(context.DataFrame.fromSheet('sheet-1', 2).toRecords()), JSON.stringify([{ id: 10 }]));
  assert.equal(JSON.stringify(context.DataFrame.fromDriveFile('file-1', 'csv', { headerRow: 1 }).toRecords()), JSON.stringify([{ id: 20 }]));
  assert.equal(JSON.stringify(context.DataFrame.fromQuery({ provider: 'bigquery' })), JSON.stringify({ provider: 'bigquery', rows: 1 }));
  assert.equal(JSON.stringify(calls), JSON.stringify([
    { type: 'sheet', sheet: 'sheet-1', options: { headerRow: 2 } },
    { type: 'drive', fileId: 'file-1', fileType: 'csv', options: { headerRow: 1 } },
    { type: 'query', request: { provider: 'bigquery' } }
  ]));
});

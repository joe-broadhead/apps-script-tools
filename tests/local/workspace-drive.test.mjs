import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadScripts } from './helpers.mjs';

function buildDriveMocks() {
  const files = new Map();
  let nextId = 0;

  function createDriveFile(name, content = '') {
    const id = `file-${++nextId}`;
    const file = {
      name,
      content,
      movedTo: null,
      getId: () => id,
      getBlob: () => ({ getDataAsString: () => content }),
      moveTo: folder => {
        file.movedTo = folder;
      }
    };
    files.set(id, file);
    return file;
  }

  return {
    files,
    createDriveFile,
    DriveApp: {
      createFile: (name, content) => createDriveFile(name, content),
      getFileById: id => files.get(id)
    },
    SpreadsheetApp: {
      create: name => createDriveFile(`${name}.gsheet`)
    },
    DocumentApp: {
      create: name => createDriveFile(`${name}.gdoc`)
    },
    SlidesApp: {
      create: name => createDriveFile(`${name}.gslides`)
    },
    FormApp: {
      create: name => createDriveFile(`${name}.gform`)
    }
  };
}

test('createFileInDrive writes JSON and CSV files and supports destination folder moves', () => {
  const mocks = buildDriveMocks();
  const context = createGasContext({
    DriveApp: mocks.DriveApp,
    SpreadsheetApp: mocks.SpreadsheetApp,
    DocumentApp: mocks.DocumentApp,
    SlidesApp: mocks.SlidesApp,
    FormApp: mocks.FormApp
  });

  loadScripts(context, [
    'apps_script_tools/utilities/records/convertRecordsToCsvFormat.js',
    'apps_script_tools/workspace/drive/createFileInDrive.js'
  ]);

  const folder = { id: 'folder-1' };
  const jsonFile = context.createFileInDrive('json', 'dataset', {
    content: [{ id: 1, name: 'Alice' }],
    destinationFolder: folder
  });

  const csvFile = context.createFileInDrive('csv', 'dataset', {
    content: [{ id: 0, active: false }]
  });

  const movedJsonFile = mocks.DriveApp.getFileById(jsonFile.getId());
  const writtenCsvFile = mocks.DriveApp.getFileById(csvFile.getId());

  assert.equal(movedJsonFile.movedTo, folder);
  assert.match(writtenCsvFile.content, /id,active/);
  assert.match(writtenCsvFile.content, /0,false/);
});

test('readFileFromDrive reads CSV into record objects', () => {
  const mocks = buildDriveMocks();
  const csvFile = mocks.createDriveFile('input.csv', 'id,name\n1,Alice\n2,Bob');
  const context = createGasContext({
    DriveApp: mocks.DriveApp
  });

  loadScripts(context, [
    'apps_script_tools/utilities/object/zipArraysIntoObject.js',
    'apps_script_tools/utilities/records/zipArraysIntoRecords.js',
    'apps_script_tools/workspace/drive/readFileFromDrive.js'
  ]);

  const records = context.readFileFromDrive(csvFile.getId(), 'csv', { headerRow: 0 });
  assert.equal(
    JSON.stringify(records),
    JSON.stringify([
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' }
    ])
  );
});

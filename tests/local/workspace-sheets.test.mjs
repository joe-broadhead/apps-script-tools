import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadScripts } from './helpers.mjs';

function buildSpreadsheetMocks() {
  const sheets = [
    {
      getName: () => 'Main',
      getSheetId: () => 101,
      getSheetName: () => 'Main',
      getRange: () => ({})
    }
  ];

  const spreadsheet = {
    getSheetByName: name => sheets.find(sheet => sheet.getName() === name) || null,
    getSheets: () => sheets
  };

  let openedById = null;
  let openedByUrl = null;

  return {
    spreadsheet,
    getOpenedById: () => openedById,
    getOpenedByUrl: () => openedByUrl,
    SpreadsheetApp: {
      openById: id => {
        openedById = id;
        return spreadsheet;
      },
      openByUrl: url => {
        openedByUrl = url;
        return spreadsheet;
      }
    }
  };
}

test('workspace sheet helpers expose EnhancedSpreadsheet behavior', () => {
  const mocks = buildSpreadsheetMocks();
  const context = createGasContext({
    SpreadsheetApp: mocks.SpreadsheetApp
  });

  loadScripts(context, [
    'apps_script_tools/workspace/general/errors.js',
    'apps_script_tools/workspace/sheets/EnhancedSheet.js',
    'apps_script_tools/workspace/sheets/EnhancedSpreadsheet.js',
    'apps_script_tools/workspace/sheets/openSpreadsheetById.js',
    'apps_script_tools/workspace/sheets/openSpreadsheetByUrl.js',
    'apps_script_tools/workspace/sheets/numberToSheetRangeNotation.js'
  ]);

  const spreadsheetById = context.openSpreadsheetById('spreadsheet-id');
  const spreadsheetByUrl = context.openSpreadsheetByUrl('https://docs.google.com/spreadsheets/d/sheet-id');

  assert.equal(mocks.getOpenedById(), 'spreadsheet-id');
  assert.equal(mocks.getOpenedByUrl(), 'https://docs.google.com/spreadsheets/d/sheet-id');
  assert.equal(spreadsheetById.sheetExists('Main'), true);
  assert.equal(JSON.stringify(spreadsheetById.mapSheetNamesToId()), JSON.stringify({ Main: 101 }));
  assert.equal(spreadsheetByUrl.sheetExists('Missing'), false);

  assert.equal(context.numberToSheetRangeNotation(1), 'A');
  assert.equal(context.numberToSheetRangeNotation(27), 'AA');
});

test('openSpreadsheetById and openSpreadsheetByUrl validate request inputs', () => {
  const mocks = buildSpreadsheetMocks();
  const context = createGasContext({
    SpreadsheetApp: mocks.SpreadsheetApp
  });

  loadScripts(context, [
    'apps_script_tools/workspace/general/errors.js',
    'apps_script_tools/workspace/sheets/EnhancedSheet.js',
    'apps_script_tools/workspace/sheets/EnhancedSpreadsheet.js',
    'apps_script_tools/workspace/sheets/openSpreadsheetById.js',
    'apps_script_tools/workspace/sheets/openSpreadsheetByUrl.js'
  ]);

  assert.throws(
    () => context.openSpreadsheetById('https://docs.google.com/spreadsheets/d/abc123'),
    error => error && error.name === 'AstWorkspaceValidationError'
  );

  assert.throws(
    () => context.openSpreadsheetByUrl('https://example.com/not-a-sheet'),
    error => error && error.name === 'AstWorkspaceValidationError'
  );
});

test('sheet open helpers map provider errors to typed workspace errors', () => {
  const context = createGasContext({
    SpreadsheetApp: {
      openById: () => {
        throw new Error('backend unavailable');
      },
      openByUrl: () => {
        throw new Error('Spreadsheet not found');
      }
    }
  });

  loadScripts(context, [
    'apps_script_tools/workspace/general/errors.js',
    'apps_script_tools/workspace/sheets/EnhancedSheet.js',
    'apps_script_tools/workspace/sheets/EnhancedSpreadsheet.js',
    'apps_script_tools/workspace/sheets/openSpreadsheetById.js',
    'apps_script_tools/workspace/sheets/openSpreadsheetByUrl.js'
  ]);

  assert.throws(
    () => context.openSpreadsheetById('spreadsheet-id'),
    error => error && error.name === 'AstWorkspaceProviderError'
  );

  assert.throws(
    () => context.openSpreadsheetByUrl('https://docs.google.com/spreadsheets/d/sheet-id'),
    error => error && error.name === 'AstWorkspaceNotFoundError'
  );
});

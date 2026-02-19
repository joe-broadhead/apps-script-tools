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

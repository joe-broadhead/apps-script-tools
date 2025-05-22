class EnhancedSpreadsheet {
  constructor(spreadsheet) {
    this.spreadsheet = spreadsheet;

    return new Proxy(this, {
      get(target, prop, receiver) {
        if (prop in target) {
          return Reflect.get(target, prop, receiver);
        }

        const spreadsheetProp = target.spreadsheet[prop];
        if (typeof spreadsheetProp === 'function') {
          return (...args) => {
            const result = spreadsheetProp.apply(target.spreadsheet, args);

            if (result === target.spreadsheet) {
              return receiver; // Return EnhancedSpreadsheet for chaining
            }

            if (result && result.getSheetName && result.getRange) {
              return new EnhancedSheet(result); // Return an EnhancedSheet instance
            }

            return result;
          };
        }

        return spreadsheetProp;
      }
    });
  }

  deleteSheets(deleteSheetsOnCondition = _ => false) {
    const sheets = this.spreadsheet.getSheets();

    for (const sheet of sheets) {
      if (deleteSheetsOnCondition(sheet)) {
        this.spreadsheet.deleteSheet(sheet);
      }
    }

    return this;
  }

  hideSheets(hideSheetsOnCondition = _ => false) {
    const sheets = this.spreadsheet.getSheets();

    for (const sheet of sheets) {
      if (hideSheetsOnCondition(sheet)) {
        sheet.hideSheet();
      }
    }

    return this;
  }

  sheetExists(sheetName) {
    const sheet = this.spreadsheet.getSheetByName(sheetName);
    return sheet !== null;
  }

  mapSheetNamesToId(reverse = false){
    const sheets = this.spreadsheet.getSheets();

    return sheets.reduce((output, sheet) => {
      let sheetName = sheet.getName();
      let sheetId = sheet.getSheetId();

      reverse ? output[sheetId] = sheetName : output[sheetName] = sheetId

      return output;
    }, {});
  };
}

this.EnhancedSpreadsheet = EnhancedSpreadsheet;

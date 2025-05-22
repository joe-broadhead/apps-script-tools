class EnhancedSheet {
  constructor(sheet) {
    this.sheet = sheet;

    return new Proxy(this, {
      get(target, prop, receiver) {
        if (prop in target) {
          return Reflect.get(target, prop, receiver);
        }

        const sheetProp = target.sheet[prop];
        if (typeof sheetProp === 'function') {
          return (...args) => {
            const result = sheetProp.apply(target.sheet, args);

            if (result === target.sheet) {
              return receiver; // Return EnhancedSheet for chaining
            }

            if (result && result.getSheetName && result.getRange) {
              return new EnhancedSheet(result);
            }

            return result;
          };
        }
        return sheetProp;
      }
    });
  }

  deleteWhitespaceFromSheet(options = {}) {
    const {
      startColumn = null,
      startRow = null,
      deleteRows = true,
      deleteColumns = true
    } = options;

    if (deleteColumns) {
      const lastColumn = startColumn ? startColumn : this.sheet.getLastColumn() + 1;
      const columnsToDelete = this.sheet.getMaxColumns() - lastColumn + 1;
      if (columnsToDelete > 0) {
        this.sheet.deleteColumns(lastColumn, columnsToDelete);
      }
    }

    if (deleteRows) {
      if (this.sheet.getLastRow() <= 1) {
        return this; // Safely return chaining continuation
      }
      const lastRow = startRow ? startRow : this.sheet.getLastRow() + 1;
      const rowsToDelete = this.sheet.getMaxRows() - lastRow + 1;
      if (rowsToDelete > 0) {
        this.sheet.deleteRows(lastRow, rowsToDelete);
      }
    }

    return this;
  }

  overwriteSheet(values){
    this.sheet.clearContents().getRange(1, 1, values.length, values[0].length).setValues(values);
    return this;
  }

  overwriteRange(startRow, startCol, values){
    this.sheet.getRange(startRow, startCol, values.length, values[0].length).clearContent().setValues(values);
    return this;
  }

  appendToSheet(values) {
    const lastRow = this.sheet.getLastRow();
    this.sheet.getRange(lastRow + 1, 1, values.length, values[0].length).setValues(values);
    return this;
  }

  prependToSheet(values, headerRows = 0){
    this.sheet.insertRowsBefore(headerRows + 1, values.length).getRange(headerRows + 1, 1, values.length, values[0].length).setValues(values);
    return this;
  }

  toRecords({ headerRow = 0, func = r => r, funcArgs = [] } = {}) {
    return zipArraysIntoRecords(this.sheet.getDataRange().getValues(), headerRow, func, ...funcArgs);
  }

  toDataFrame({ headerRow = 0 } = {}) { 
    return DataFrame.fromRecords(this.toRecords({ headerRow }));
  }

}

this.EnhancedSheet = EnhancedSheet

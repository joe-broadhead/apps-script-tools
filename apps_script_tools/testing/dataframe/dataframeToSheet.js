DATAFRAME_TO_SHEET_TESTS = [
  {
    description: 'DataFrame.toSheet() should no-op for empty DataFrame with no columns',
    test: () => {
      const originalEnhancedSheet = EnhancedSheet;
      const calls = [];

      EnhancedSheet = class EnhancedSheetMock {
        constructor(_sheet) {}
        overwriteSheet(values) {
          calls.push({ method: 'overwriteSheet', values });
          return this;
        }
        appendToSheet(values) {
          calls.push({ method: 'appendToSheet', values });
          return this;
        }
        prependToSheet(values, headerRows = 0) {
          calls.push({ method: 'prependToSheet', values, headerRows });
          return this;
        }
        overwriteRange(startRow, startCol, values) {
          calls.push({ method: 'overwriteRange', startRow, startCol, values });
          return this;
        }
      };

      try {
        const df = new DataFrame({});
        df.toSheet({}, { mode: 'overwrite' });
      } finally {
        EnhancedSheet = originalEnhancedSheet;
      }

      if (calls.length !== 0) {
        throw new Error(`Expected no sheet writes for empty DataFrame, got ${calls.length}`);
      }
    }
  },
  {
    description: 'DataFrame.toSheet() append should omit header by default',
    test: () => {
      const originalEnhancedSheet = EnhancedSheet;
      const calls = [];

      EnhancedSheet = class EnhancedSheetMock {
        constructor(_sheet) {}
        appendToSheet(values) {
          calls.push({ method: 'appendToSheet', values });
          return this;
        }
      };

      try {
        const df = DataFrame.fromRecords([
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' }
        ]);

        df.toSheet({}, { mode: 'append' });
      } finally {
        EnhancedSheet = originalEnhancedSheet;
      }

      if (calls.length !== 1) {
        throw new Error(`Expected one append call, got ${calls.length}`);
      }

      const expected = [
        [1, 'Alice'],
        [2, 'Bob']
      ];

      if (JSON.stringify(calls[0].values) !== JSON.stringify(expected)) {
        throw new Error(`Expected append rows ${JSON.stringify(expected)}, got ${JSON.stringify(calls[0].values)}`);
      }
    }
  },
  {
    description: 'DataFrame.toSheet() append should include header when includeHeader=true',
    test: () => {
      const originalEnhancedSheet = EnhancedSheet;
      const calls = [];

      EnhancedSheet = class EnhancedSheetMock {
        constructor(_sheet) {}
        appendToSheet(values) {
          calls.push({ method: 'appendToSheet', values });
          return this;
        }
      };

      try {
        const df = DataFrame.fromRecords([
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' }
        ]);

        df.toSheet({}, { mode: 'append', includeHeader: true });
      } finally {
        EnhancedSheet = originalEnhancedSheet;
      }

      const expected = [
        ['id', 'name'],
        [1, 'Alice'],
        [2, 'Bob']
      ];

      if (calls.length !== 1) {
        throw new Error(`Expected one append call, got ${calls.length}`);
      }

      if (JSON.stringify(calls[0].values) !== JSON.stringify(expected)) {
        throw new Error(`Expected append rows ${JSON.stringify(expected)}, got ${JSON.stringify(calls[0].values)}`);
      }
    }
  },
  {
    description: 'DataFrame.toSheet() overwrite should write header for zero-row DataFrame with columns',
    test: () => {
      const originalEnhancedSheet = EnhancedSheet;
      const calls = [];

      EnhancedSheet = class EnhancedSheetMock {
        constructor(_sheet) {}
        overwriteSheet(values) {
          calls.push({ method: 'overwriteSheet', values });
          return this;
        }
      };

      try {
        const df = DataFrame.fromColumns({
          id: [],
          name: []
        });

        df.toSheet({}, { mode: 'overwrite' });
      } finally {
        EnhancedSheet = originalEnhancedSheet;
      }

      const expected = [['id', 'name']];

      if (calls.length !== 1) {
        throw new Error(`Expected one overwrite call, got ${calls.length}`);
      }

      if (JSON.stringify(calls[0].values) !== JSON.stringify(expected)) {
        throw new Error(`Expected overwrite values ${JSON.stringify(expected)}, got ${JSON.stringify(calls[0].values)}`);
      }
    }
  },
  {
    description: 'DataFrame.toSheet() overwriteRange should require startRow and startCol',
    test: () => {
      const originalEnhancedSheet = EnhancedSheet;
      EnhancedSheet = class EnhancedSheetMock {
        constructor(_sheet) {}
        overwriteRange(_startRow, _startCol, _values) {
          return this;
        }
      };

      try {
        const df = DataFrame.fromRecords([{ id: 1 }]);
        let error = null;

        try {
          df.toSheet({}, { mode: 'overwriteRange' });
        } catch (err) {
          error = err;
        }

        if (!error || !String(error.message || '').includes("requires 'startRow' and 'startCol'")) {
          throw new Error(`Expected startRow/startCol validation error, got ${error ? error.message : 'no error'}`);
        }
      } finally {
        EnhancedSheet = originalEnhancedSheet;
      }
    }
  }
];

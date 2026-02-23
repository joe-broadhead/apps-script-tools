DATAFRAME_SCHEMA_TESTS = [
  {
    description: 'DataFrame.schema() should return inferred column types',
    test: () => {
      const df = DataFrame.fromRecords([
        { id: 1, name: 'Alice', active: true },
        { id: 2, name: 'Bob', active: false }
      ]);

      const schema = df.schema();
      const expected = { id: 'number', name: 'string', active: 'boolean' };

      if (JSON.stringify(schema) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(schema)}`);
      }
    }
  },
  {
    description: 'DataFrame.schema() should include undefined for empty columns',
    test: () => {
      const df = new DataFrame({
        id: new Series([], 'id'),
        amount: new Series([], 'amount')
      });

      const schema = df.schema();
      const expected = { id: 'undefined', amount: 'undefined' };

      if (JSON.stringify(schema) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(schema)}`);
      }
    }
  },
  {
    description: 'DataFrame.schema() should reflect explicit asType() casts',
    test: () => {
      const df = DataFrame.fromRecords([
        { id: 1, amount: '10.5' },
        { id: 2, amount: '20.25' }
      ]).asType({
        id: 'string',
        amount: 'float'
      });

      const schema = df.schema();
      const expected = { id: 'string', amount: 'number' };

      if (JSON.stringify(schema) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(schema)}`);
      }
    }
  },
  {
    description: 'DataFrame.validateSchema() should report missing/extra/type/nullability violations',
    test: () => {
      const df = DataFrame.fromRecords([
        { id: '1', amount: 10, extra: 'x' },
        { id: null, amount: 'bad', extra: 'y' }
      ]);

      const report = DataFrame.validateSchema(df, {
        id: { type: 'integer', nullable: false },
        amount: { type: 'float', nullable: false },
        status: { type: 'string', nullable: true }
      });

      if (report.valid !== false) {
        throw new Error('Expected validation report to be invalid');
      }

      if (JSON.stringify(report.violations.missingColumns) !== JSON.stringify(['status'])) {
        throw new Error(`Expected missingColumns ['status'], got ${JSON.stringify(report.violations.missingColumns)}`);
      }

      if (JSON.stringify(report.violations.extraColumns) !== JSON.stringify(['extra'])) {
        throw new Error(`Expected extraColumns ['extra'], got ${JSON.stringify(report.violations.extraColumns)}`);
      }

      if (report.violations.nullabilityViolations.length !== 1) {
        throw new Error(`Expected 1 nullability violation, got ${report.violations.nullabilityViolations.length}`);
      }

      if (report.violations.typeMismatches.length < 2) {
        throw new Error(`Expected at least 2 type mismatches, got ${report.violations.typeMismatches.length}`);
      }
    }
  },
  {
    description: 'DataFrame.enforceSchema() should coerce schema columns and optionally drop extras',
    test: () => {
      const df = DataFrame.fromRecords([
        { id: '1', amount: '10.5', active: 'true', extra: 'x' },
        { id: '2', amount: 'bad', active: 'false', extra: 'y' }
      ]);

      const out = df.enforceSchema(
        {
          id: { type: 'integer', nullable: false },
          amount: { type: 'float', nullable: true },
          active: { type: 'boolean', nullable: false }
        },
        {
          coerce: true,
          dropExtraColumns: true,
          strict: false
        }
      );

      const expectedColumns = ['id', 'amount', 'active'];
      if (JSON.stringify(out.columns) !== JSON.stringify(expectedColumns)) {
        throw new Error(`Expected columns ${JSON.stringify(expectedColumns)}, got ${JSON.stringify(out.columns)}`);
      }

      if (JSON.stringify(out.id.array) !== JSON.stringify([1, 2])) {
        throw new Error(`Expected id [1,2], got ${JSON.stringify(out.id.array)}`);
      }

      if (JSON.stringify(out.amount.array) !== JSON.stringify([10.5, null])) {
        throw new Error(`Expected amount [10.5,null], got ${JSON.stringify(out.amount.array)}`);
      }

      if (JSON.stringify(out.active.array) !== JSON.stringify([true, false])) {
        throw new Error(`Expected active [true,false], got ${JSON.stringify(out.active.array)}`);
      }
    }
  },
  {
    description: 'DataFrame.enforceSchema() strict mode should throw on non-coercible non-nullable values',
    test: () => {
      const df = DataFrame.fromRecords([{ amount: 'bad' }]);

      let threw = false;
      try {
        df.enforceSchema({ amount: { type: 'float', nullable: false } });
      } catch (error) {
        threw = String(error && error.message).includes('DataFrame.enforceSchema schema validation failed');
      }

      if (!threw) {
        throw new Error('Expected enforceSchema to throw in strict mode');
      }
    }
  },
  {
    description: 'DataFrame.enforceSchema() should honor coerce=false without implicit type coercion',
    test: () => {
      const df = DataFrame.fromRecords([{ id: '1' }]);

      const out = df.enforceSchema(
        { id: { type: 'integer', nullable: false } },
        { coerce: false, strict: false }
      );

      if (JSON.stringify(out.id.array) !== JSON.stringify(['1'])) {
        throw new Error(`Expected id ['1'], got ${JSON.stringify(out.id.array)}`);
      }

      if (out.schema().id !== 'string') {
        throw new Error(`Expected schema type 'string', got ${out.schema().id}`);
      }
    }
  },
  {
    description: 'DataFrame.validateSchema() should report invalid Date mismatch without throwing in non-strict mode',
    test: () => {
      const df = DataFrame.fromRecords([{ happened_at: new Date('bad') }]);

      const report = df.validateSchema(
        { happened_at: { type: 'date', nullable: false } },
        { strict: false }
      );

      if (report.valid !== false) {
        throw new Error('Expected validation report to be invalid');
      }

      if (report.violations.typeMismatches.length !== 1) {
        throw new Error(`Expected 1 type mismatch, got ${report.violations.typeMismatches.length}`);
      }

      if (report.violations.typeMismatches[0].actualType !== 'invalid_date') {
        throw new Error(`Expected actualType invalid_date, got ${report.violations.typeMismatches[0].actualType}`);
      }
    }
  }
];

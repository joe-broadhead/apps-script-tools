const DATABASE_LOAD_DATABRICKS_TABLE_TESTS = [
  {
    description: 'astLoadDatabricksTable() should require mergeKey in merge mode',
    test: () => {
      try {
        astLoadDatabricksTable({
          arrays: [
            ['id', 'name'],
            [1, 'Alice']
          ],
          tableName: 'analytics.users',
          tableSchema: { id: 'INT', name: 'STRING' },
          mode: 'merge',
          databricks_parameters: {
            host: 'dbc.example.com',
            sqlWarehouseId: 'w-1',
            schema: 'analytics',
            token: 'token'
          }
        });
        throw new Error('Expected mergeKey validation error, but none was thrown');
      } catch (error) {
        if (!error.message.includes('mergeKey is required for merge mode')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: 'astLoadDatabricksTable() should wrap provider failures with DatabricksLoadError',
    test: () => {
      const originalRunDatabricksSql = astRunDatabricksSql;

      astRunDatabricksSql = () => {
        const providerError = new Error('statement failed');
        providerError.name = 'DatabricksSqlError';
        throw providerError;
      };

      try {
        astLoadDatabricksTable({
          arrays: [
            ['id', 'name'],
            [1, 'Alice']
          ],
          tableName: 'analytics.users',
          tableSchema: { id: 'INT', name: 'STRING' },
          mode: 'insert',
          databricks_parameters: {
            host: 'dbc.example.com',
            sqlWarehouseId: 'w-1',
            schema: 'analytics',
            token: 'token'
          }
        });
        throw new Error('Expected DatabricksLoadError, but none was thrown');
      } catch (error) {
        if (error.name !== 'DatabricksLoadError') {
          throw new Error(`Expected DatabricksLoadError, got ${error.name}`);
        }
      } finally {
        astRunDatabricksSql = originalRunDatabricksSql;
      }
    },
  },
  {
    description: 'astLoadDatabricksTable() should forward polling options to Databricks SQL statements',
    test: () => {
      const originalRunDatabricksSql = astRunDatabricksSql;
      const capturedOptions = [];

      astRunDatabricksSql = (sql, parameters, placeholders, options) => {
        capturedOptions.push(options);
        return {};
      };

      try {
        astLoadDatabricksTable({
          arrays: [
            ['id', 'name'],
            [1, 'Alice']
          ],
          tableName: 'analytics.users',
          tableSchema: { id: 'INT', name: 'STRING' },
          mode: 'insert',
          databricks_parameters: {
            host: 'dbc.example.com',
            sqlWarehouseId: 'w-1',
            schema: 'analytics',
            token: 'token'
          },
          options: {
            maxWaitMs: 2000,
            pollIntervalMs: 250
          }
        });
      } finally {
        astRunDatabricksSql = originalRunDatabricksSql;
      }

      if (capturedOptions.length === 0) {
        throw new Error('Expected astRunDatabricksSql to be called');
      }

      const expected = JSON.stringify({ maxWaitMs: 2000, pollIntervalMs: 250 });
      const hasMismatch = capturedOptions.some(options => JSON.stringify(options) !== expected);
      if (hasMismatch) {
        throw new Error(`Expected all calls to receive ${expected}, got ${JSON.stringify(capturedOptions)}`);
      }
    },
  },
];

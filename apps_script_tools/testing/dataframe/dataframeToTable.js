DATAFRAME_TO_TABLE_TESTS = [
  {
    description: 'DataFrame.toTable() should route BigQuery loads to astLoadBigQueryTable',
    test: () => {
      const originalLoadBigQueryTable = astLoadBigQueryTable;
      let callCount = 0;
      let capturedConfig = null;

      astLoadBigQueryTable = config => {
        callCount += 1;
        capturedConfig = config;
      };

      const df = DataFrame.fromRecords([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);

      df.toTable({
        provider: 'bigquery',
        config: {
          tableName: 'dataset.users',
          tableSchema: { id: 'INT64', name: 'STRING' },
          bigquery_parameters: { projectId: 'project' }
        }
      });

      astLoadBigQueryTable = originalLoadBigQueryTable;

      if (callCount !== 1) {
        throw new Error(`Expected astLoadBigQueryTable to be called once, got ${callCount}`);
      }

      if (!capturedConfig || !Array.isArray(capturedConfig.arrays)) {
        throw new Error('Expected table load config with arrays payload');
      }
    },
  },
  {
    description: 'DataFrame.toTable() should route Databricks loads to astLoadDatabricksTable',
    test: () => {
      const originalLoadDatabricksTable = astLoadDatabricksTable;
      let callCount = 0;
      let capturedConfig = null;

      astLoadDatabricksTable = config => {
        callCount += 1;
        capturedConfig = config;
      };

      const df = DataFrame.fromRecords([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);

      df.toTable({
        provider: 'databricks',
        config: {
          tableName: 'analytics.users',
          tableSchema: { id: 'INT', name: 'STRING' },
          databricks_parameters: {
            host: 'dbc.example.com',
            sqlWarehouseId: 'w-1',
            schema: 'analytics',
            token: 'token'
          },
          options: {
            maxWaitMs: 2000,
            pollIntervalMs: 300
          }
        }
      });

      astLoadDatabricksTable = originalLoadDatabricksTable;

      if (callCount !== 1) {
        throw new Error(`Expected astLoadDatabricksTable to be called once, got ${callCount}`);
      }

      if (!capturedConfig || !Array.isArray(capturedConfig.arrays)) {
        throw new Error('Expected table load config with arrays payload');
      }

      const optionsJson = JSON.stringify(capturedConfig.options || {});
      const expectedOptionsJson = JSON.stringify({ maxWaitMs: 2000, pollIntervalMs: 300 });
      if (optionsJson !== expectedOptionsJson) {
        throw new Error(`Expected Databricks options ${expectedOptionsJson}, got ${optionsJson}`);
      }
    },
  },
];

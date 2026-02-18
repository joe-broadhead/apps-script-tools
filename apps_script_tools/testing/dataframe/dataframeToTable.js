DATAFRAME_TO_TABLE_TESTS = [
  {
    description: 'DataFrame.toTable() should route BigQuery loads to loadBigQueryTable',
    test: () => {
      const originalLoadBigQueryTable = loadBigQueryTable;
      let callCount = 0;
      let capturedConfig = null;

      loadBigQueryTable = config => {
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

      loadBigQueryTable = originalLoadBigQueryTable;

      if (callCount !== 1) {
        throw new Error(`Expected loadBigQueryTable to be called once, got ${callCount}`);
      }

      if (!capturedConfig || !Array.isArray(capturedConfig.arrays)) {
        throw new Error('Expected table load config with arrays payload');
      }
    },
  },
];

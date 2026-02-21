const DATABASE_RUN_SQL_QUERY_TESTS = [
  {
    description: 'runSqlQuery() should reject unsafe placeholders by default',
    test: () => {
      const request = {
        provider: 'bigquery',
        sql: 'select 1 where region = {{region}}',
        parameters: { projectId: 'test' },
        placeholders: { region: 'north' }
      };

      try {
        runSqlQuery(request);
        throw new Error('Expected an error, but none was thrown');
      } catch (error) {
        if (!error.message.includes('Unsafe placeholder interpolation is disabled')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: 'runSqlQuery() should validate required BigQuery parameters',
    test: () => {
      const request = {
        provider: 'bigquery',
        sql: 'select 1',
        parameters: {}
      };

      try {
        runSqlQuery(request);
        throw new Error('Expected an error, but none was thrown');
      } catch (error) {
        if (!error.message.includes('parameters.projectId')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: 'runSqlQuery() should validate required Databricks parameters',
    test: () => {
      const request = {
        provider: 'databricks',
        sql: 'select 1',
        parameters: { host: 'dbc.example.com', sqlWarehouseId: 'w-1', schema: 'default' }
      };

      try {
        runSqlQuery(request);
        throw new Error('Expected an error, but none was thrown');
      } catch (error) {
        if (!error.message.includes('parameters.token')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: 'runSqlQuery() should surface Databricks provider failures as thrown errors',
    test: () => {
      const originalRunDatabricksSql = runDatabricksSql;

      runDatabricksSql = () => {
        throw new Error('Databricks statement failed');
      };

      try {
        runSqlQuery({
          provider: 'databricks',
          sql: 'select 1',
          parameters: {
            host: 'dbc.example.com',
            sqlWarehouseId: 'w-1',
            schema: 'default',
            token: 'token'
          }
        });
        throw new Error('Expected provider error, but none was thrown');
      } catch (error) {
        if (!error.message.includes('Databricks statement failed')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      } finally {
        runDatabricksSql = originalRunDatabricksSql;
      }
    },
  },
  {
    description: 'runSqlQuery() should reject pollIntervalMs greater than maxWaitMs',
    test: () => {
      try {
        runSqlQuery({
          provider: 'bigquery',
          sql: 'select 1',
          parameters: { projectId: 'test' },
          options: {
            maxWaitMs: 100,
            pollIntervalMs: 200
          }
        });
        throw new Error('Expected validation error, but none was thrown');
      } catch (error) {
        if (!error.message.includes('options.pollIntervalMs cannot be greater than options.maxWaitMs')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: 'runSqlQuery() should forward normalized options to providers',
    test: () => {
      const originalRunBigQuerySql = runBigQuerySql;
      let captured = null;

      runBigQuerySql = (sql, parameters, placeholders, options) => {
        captured = { sql, parameters, placeholders, options };
        return DataFrame.fromRecords([{ ok: true }]);
      };

      try {
        runSqlQuery({
          provider: 'bigquery',
          sql: 'select * from t where region = {{region}}',
          parameters: { projectId: 'test' },
          placeholders: { region: 'north' },
          options: {
            allowUnsafePlaceholders: true,
            maxWaitMs: 2000,
            pollIntervalMs: 250
          }
        });

        if (!captured) {
          throw new Error('Expected runBigQuerySql to be called');
        }

        if (captured.options.maxWaitMs !== 2000 || captured.options.pollIntervalMs !== 250) {
          throw new Error(`Expected options to be forwarded, got ${JSON.stringify(captured.options)}`);
        }
      } finally {
        runBigQuerySql = originalRunBigQuerySql;
      }
    },
  },
  {
    description: 'replacePlaceHoldersInQuery() should escape regex placeholder keys safely',
    test: () => {
      const output = replacePlaceHoldersInQuery(
        'select {{a+b}} as plus_key, {{region.name}} as region_key',
        { 'a+b': 5, 'region.name': 'north' }
      );

      const expected = "select 5 as plus_key, 'north' as region_key";
      if (output !== expected) {
        throw new Error(`Expected '${expected}', but got '${output}'`);
      }
    },
  },
];

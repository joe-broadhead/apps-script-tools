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

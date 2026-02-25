const DATABASE_RUN_SQL_QUERY_TESTS = [
  {
    description: 'sql provider adapter registry should list supported providers',
    test: () => {
      const providers = astListSqlProviders();
      const expected = JSON.stringify(['bigquery', 'databricks']);
      if (JSON.stringify(providers) !== expected) {
        throw new Error(`Expected providers ${expected}, got ${JSON.stringify(providers)}`);
      }
    },
  },
  {
    description: 'sql provider adapter registry should throw typed validation errors for unknown providers',
    test: () => {
      try {
        astGetSqlProviderAdapter('snowflake');
        throw new Error('Expected astGetSqlProviderAdapter to throw');
      } catch (error) {
        if (error.name !== 'SqlProviderValidationError') {
          throw new Error(`Expected SqlProviderValidationError, got ${error.name}`);
        }
      }
    },
  },
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
      const originalRunDatabricksSql = astRunDatabricksSql;

      astRunDatabricksSql = () => {
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
        astRunDatabricksSql = originalRunDatabricksSql;
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
      const originalRunBigQuerySql = astRunBigQuerySql;
      let captured = null;

      astRunBigQuerySql = (sql, parameters, placeholders, options) => {
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
          throw new Error('Expected astRunBigQuerySql to be called');
        }

        if (captured.options.maxWaitMs !== 2000 || captured.options.pollIntervalMs !== 250) {
          throw new Error(`Expected options to be forwarded, got ${JSON.stringify(captured.options)}`);
        }
      } finally {
        astRunBigQuerySql = originalRunBigQuerySql;
      }
    },
  },
  {
    description: 'runSqlQuery() should forward normalized options to Databricks provider',
    test: () => {
      const originalRunDatabricksSql = astRunDatabricksSql;
      let captured = null;

      astRunDatabricksSql = (sql, parameters, placeholders, options) => {
        captured = { sql, parameters, placeholders, options };
        return DataFrame.fromRecords([{ ok: true }]);
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
          },
          options: {
            maxWaitMs: 2000,
            pollIntervalMs: 300
          }
        });

        if (!captured) {
          throw new Error('Expected astRunDatabricksSql to be called');
        }

        if (captured.options.maxWaitMs !== 2000 || captured.options.pollIntervalMs !== 300) {
          throw new Error(`Expected options to be forwarded, got ${JSON.stringify(captured.options)}`);
        }
      } finally {
        astRunDatabricksSql = originalRunDatabricksSql;
      }
    },
  },
  {
    description: 'astSqlPrepare()/astSqlExecutePrepared() should bind params and route to detailed provider execution',
    test: () => {
      const originalExecuteBigQuerySqlDetailed = astExecuteBigQuerySqlDetailed;
      let captured = null;

      astExecuteBigQuerySqlDetailed = (sql, parameters, placeholders, options) => {
        captured = { sql, parameters, placeholders, options };
        return {
          dataFrame: DataFrame.fromRecords([{ ok: true }]),
          execution: {
            provider: 'bigquery',
            executionId: 'job-123',
            state: 'SUCCEEDED'
          }
        };
      };

      try {
        const prepared = astSqlPrepare({
          provider: 'bigquery',
          sql: 'select * from t where id = {{id}} and region = {{region}}',
          paramsSchema: {
            id: 'integer',
            region: 'string'
          },
          parameters: { projectId: 'test' }
        });

        const out = astSqlExecutePrepared({
          statementId: prepared.statementId,
          params: {
            id: 9,
            region: 'north'
          }
        });

        if (!captured) {
          throw new Error('Expected astExecuteBigQuerySqlDetailed to be called');
        }
        if (!/id = 9/.test(captured.sql) || !/region = 'north'/.test(captured.sql)) {
          throw new Error(`Unexpected rendered SQL: ${captured.sql}`);
        }
        if (!out.execution || out.execution.executionId !== 'job-123') {
          throw new Error(`Unexpected execution payload: ${JSON.stringify(out.execution)}`);
        }
      } finally {
        astExecuteBigQuerySqlDetailed = originalExecuteBigQuerySqlDetailed;
      }
    },
  },
  {
    description: 'astSqlStatus() should route status requests through provider adapter',
    test: () => {
      const originalGetBigQuerySqlStatus = astGetBigQuerySqlStatus;
      let captured = null;

      astGetBigQuerySqlStatus = (parameters, jobId) => {
        captured = { parameters, jobId };
        return {
          provider: 'bigquery',
          executionId: jobId,
          state: 'RUNNING',
          complete: false
        };
      };

      try {
        const status = astSqlStatus({
          provider: 'bigquery',
          executionId: 'job-77',
          parameters: { projectId: 'test' }
        });

        if (!captured || captured.jobId !== 'job-77') {
          throw new Error(`Unexpected status routing payload: ${JSON.stringify(captured)}`);
        }
        if (status.state !== 'RUNNING') {
          throw new Error(`Expected RUNNING, got ${status.state}`);
        }
      } finally {
        astGetBigQuerySqlStatus = originalGetBigQuerySqlStatus;
      }
    },
  },
  {
    description: 'astSqlCancel() should route cancel requests through provider adapter',
    test: () => {
      const originalCancelDatabricksSql = astCancelDatabricksSql;
      let captured = null;

      astCancelDatabricksSql = (parameters, statementId) => {
        captured = { parameters, statementId };
        return {
          provider: 'databricks',
          executionId: statementId,
          state: 'CANCELED',
          canceled: true
        };
      };

      try {
        const status = astSqlCancel({
          provider: 'databricks',
          statementId: 'stmt-99',
          parameters: {
            host: 'dbc.example.com',
            token: 'token'
          }
        });

        if (!captured || captured.statementId !== 'stmt-99') {
          throw new Error(`Unexpected cancel routing payload: ${JSON.stringify(captured)}`);
        }
        if (status.canceled !== true) {
          throw new Error(`Expected canceled=true, got ${JSON.stringify(status)}`);
        }
      } finally {
        astCancelDatabricksSql = originalCancelDatabricksSql;
      }
    },
  },
  {
    description: 'astReplacePlaceHoldersInQuery() should escape regex placeholder keys safely',
    test: () => {
      const output = astReplacePlaceHoldersInQuery(
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

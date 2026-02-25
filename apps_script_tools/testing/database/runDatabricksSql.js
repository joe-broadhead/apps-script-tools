const DATABASE_RUN_DATABRICKS_SQL_TESTS = [
  {
    description: 'astRunDatabricksSql() should reject pollIntervalMs greater than maxWaitMs',
    test: () => {
      try {
        astRunDatabricksSql(
          'select 1',
          {
            host: 'dbc.example.com',
            sqlWarehouseId: 'w-1',
            schema: 'default',
            token: 'token'
          },
          {},
          {
            maxWaitMs: 100,
            pollIntervalMs: 200
          }
        );
        throw new Error('Expected options validation error, but none was thrown');
      } catch (error) {
        if (!error.message.includes('options.pollIntervalMs cannot be greater than options.maxWaitMs')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: 'astRunDatabricksSql() should cap final polling sleep to remaining timeout budget',
    test: () => {
      const originalFetch = UrlFetchApp.fetch;
      const originalSleep = Utilities.sleep;
      const originalDateNow = Date.now;

      let now = 0;
      const sleepDurations = [];

      UrlFetchApp.fetch = (_url, options = {}) => {
        if (options.method === 'post') {
          return {
            getContentText: () => JSON.stringify({ statement_id: 'stmt-timeout' })
          };
        }

        return {
          getContentText: () => JSON.stringify({
            status: { state: 'RUNNING' }
          })
        };
      };

      Utilities.sleep = ms => {
        sleepDurations.push(ms);
        now += ms;
      };

      Date.now = () => now;

      try {
        astRunDatabricksSql(
          'select 1',
          {
            host: 'dbc.example.com',
            sqlWarehouseId: 'w-1',
            schema: 'default',
            token: 'token'
          },
          {},
          {
            maxWaitMs: 1000,
            pollIntervalMs: 600
          }
        );
        throw new Error('Expected timeout error, but none was thrown');
      } catch (error) {
        if (!error.message.includes('timed out after 1000ms')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      } finally {
        UrlFetchApp.fetch = originalFetch;
        Utilities.sleep = originalSleep;
        Date.now = originalDateNow;
      }

      const expected = JSON.stringify([600, 400]);
      const actual = JSON.stringify(sleepDurations);
      if (actual !== expected) {
        throw new Error(`Expected sleep durations ${expected}, got ${actual}`);
      }
    },
  },
];

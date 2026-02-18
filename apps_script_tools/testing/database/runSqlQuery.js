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
];

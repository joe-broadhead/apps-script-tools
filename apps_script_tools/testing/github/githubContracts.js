GITHUB_CONTRACT_TESTS = [
  {
    description: 'AST.GitHub.run(get_me) should normalize response payload',
    test: () => {
      AST.GitHub.clearConfig();
      AST.GitHub.configure({
        GITHUB_TOKEN: 'gas-test-token',
        GITHUB_CACHE_ENABLED: false
      });

      const originalFetch = UrlFetchApp.fetch;
      UrlFetchApp.fetch = () => ({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ login: 'octocat' }),
        getAllHeaders: () => ({
          'x-ratelimit-limit': '5000',
          'x-ratelimit-remaining': '4999',
          'x-ratelimit-reset': '2000000000'
        })
      });

      try {
        const response = AST.GitHub.run({ operation: 'get_me' });
        if (response.status !== 'ok') {
          throw new Error(`Expected status ok, got ${response.status}`);
        }
        if (!response.data || response.data.login !== 'octocat') {
          throw new Error(`Unexpected data payload: ${JSON.stringify(response.data)}`);
        }
      } finally {
        UrlFetchApp.fetch = originalFetch;
        AST.GitHub.clearConfig();
      }
    }
  },
  {
    description: 'AST.GitHub mutation dryRun should not execute network calls',
    test: () => {
      AST.GitHub.clearConfig();
      AST.GitHub.configure({
        GITHUB_TOKEN: 'gas-test-token',
        GITHUB_CACHE_ENABLED: false
      });

      const originalFetch = UrlFetchApp.fetch;
      let fetchCalls = 0;
      UrlFetchApp.fetch = () => {
        fetchCalls += 1;
        throw new Error('dryRun should not execute UrlFetchApp.fetch');
      };

      try {
        const response = AST.GitHub.createIssue({
          owner: 'octocat',
          repo: 'hello-world',
          body: {
            title: 'Dry-run issue'
          },
          options: {
            dryRun: true
          }
        });

        if (!response.dryRun || response.dryRun.enabled !== true) {
          throw new Error('Expected dryRun.enabled=true');
        }
        if (fetchCalls !== 0) {
          throw new Error(`Expected 0 fetch calls, got ${fetchCalls}`);
        }
      } finally {
        UrlFetchApp.fetch = originalFetch;
        AST.GitHub.clearConfig();
      }
    }
  },
  {
    description: 'AST.GitHub.graphql should execute query and return data',
    test: () => {
      AST.GitHub.clearConfig();
      AST.GitHub.configure({
        GITHUB_TOKEN: 'gas-test-token',
        GITHUB_CACHE_ENABLED: false
      });

      const originalFetch = UrlFetchApp.fetch;
      UrlFetchApp.fetch = () => ({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          data: {
            viewer: {
              login: 'octocat'
            }
          }
        }),
        getAllHeaders: () => ({
          'x-ratelimit-limit': '5000',
          'x-ratelimit-remaining': '4999'
        })
      });

      try {
        const response = AST.GitHub.graphql({
          query: 'query { viewer { login } }'
        });

        if (!response.data || !response.data.data || !response.data.data.viewer) {
          throw new Error(`Unexpected graphql payload: ${JSON.stringify(response.data)}`);
        }
      } finally {
        UrlFetchApp.fetch = originalFetch;
        AST.GitHub.clearConfig();
      }
    }
  }
];

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
    description: 'AST.GitHub.authAsApp dryRun should plan token exchange without network call',
    test: () => {
      AST.GitHub.clearConfig();
      AST.GitHub.configure({
        GITHUB_APP_ID: '12345',
        GITHUB_APP_INSTALLATION_ID: '67890',
        GITHUB_APP_PRIVATE_KEY: 'test_private_key_placeholder'
      });

      const originalFetch = UrlFetchApp.fetch;
      let fetchCalls = 0;
      UrlFetchApp.fetch = () => {
        fetchCalls += 1;
        throw new Error('dryRun should not execute UrlFetchApp.fetch');
      };

      try {
        const response = AST.GitHub.authAsApp({
          options: {
            dryRun: true
          }
        });
        if (!response || !response.dryRun || response.dryRun.enabled !== true) {
          throw new Error(`Expected authAsApp dryRun plan, got ${JSON.stringify(response)}`);
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
    description: 'AST.GitHub.verifyWebhook should validate HMAC signature',
    test: () => {
      AST.GitHub.clearConfig();
      AST.GitHub.configure({
        GITHUB_WEBHOOK_SECRET: 'test-webhook-secret'
      });

      const payload = JSON.stringify({ action: 'opened', repository: { full_name: 'octocat/hello-world' } });
      const signature = Utilities.computeHmacSha256Signature(payload, 'test-webhook-secret');
      const toHex = bytes => bytes.map(value => (value < 0 ? value + 256 : value).toString(16).padStart(2, '0')).join('');
      const signatureHeader = `sha256=${toHex(signature)}`;

      const response = AST.GitHub.verifyWebhook({
        payload,
        headers: {
          'X-Hub-Signature-256': signatureHeader,
          'X-GitHub-Event': 'issues',
          'X-GitHub-Delivery': 'delivery-1'
        }
      });

      if (!response || !response.data || response.data.valid !== true) {
        throw new Error(`Expected verifyWebhook valid=true, got ${JSON.stringify(response)}`);
      }

      AST.GitHub.clearConfig();
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
  },
  {
    description: 'AST.GitHub.listWorkflows should call actions workflows endpoint',
    test: () => {
      AST.GitHub.clearConfig();
      AST.GitHub.configure({
        GITHUB_TOKEN: 'gas-test-token',
        GITHUB_CACHE_ENABLED: false
      });

      const originalFetch = UrlFetchApp.fetch;
      let calledUrl = null;
      UrlFetchApp.fetch = url => {
        calledUrl = url;
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ total_count: 1, workflows: [{ id: 1, name: 'CI' }] }),
          getAllHeaders: () => ({})
        };
      };

      try {
        const response = AST.GitHub.listWorkflows({
          owner: 'octocat',
          repo: 'hello-world'
        });
        if (!calledUrl || calledUrl.indexOf('/actions/workflows') === -1) {
          throw new Error(`Expected actions workflows URL, got: ${calledUrl}`);
        }
        if (!response || !response.data || response.data.total_count !== 1) {
          throw new Error(`Unexpected listWorkflows response: ${JSON.stringify(response)}`);
        }
      } finally {
        UrlFetchApp.fetch = originalFetch;
        AST.GitHub.clearConfig();
      }
    }
  },
  {
    description: 'AST.GitHub.listCheckRuns should call commit check-runs endpoint',
    test: () => {
      AST.GitHub.clearConfig();
      AST.GitHub.configure({
        GITHUB_TOKEN: 'gas-test-token',
        GITHUB_CACHE_ENABLED: false
      });

      const originalFetch = UrlFetchApp.fetch;
      let calledUrl = null;
      UrlFetchApp.fetch = url => {
        calledUrl = url;
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ total_count: 0, check_runs: [] }),
          getAllHeaders: () => ({})
        };
      };

      try {
        const response = AST.GitHub.listCheckRuns({
          owner: 'octocat',
          repo: 'hello-world',
          ref: 'abc123'
        });
        if (!calledUrl || calledUrl.indexOf('/commits/abc123/check-runs') === -1) {
          throw new Error(`Expected commit check-runs URL, got: ${calledUrl}`);
        }
        if (!response || response.status !== 'ok') {
          throw new Error(`Unexpected listCheckRuns response: ${JSON.stringify(response)}`);
        }
      } finally {
        UrlFetchApp.fetch = originalFetch;
        AST.GitHub.clearConfig();
      }
    }
  },
  {
    description: 'AST.GitHub.listProjectsV2 should execute GraphQL owner projects query',
    test: () => {
      AST.GitHub.clearConfig();
      AST.GitHub.configure({
        GITHUB_TOKEN: 'gas-test-token',
        GITHUB_CACHE_ENABLED: false
      });

      const originalFetch = UrlFetchApp.fetch;
      let calledUrl = null;
      let payload = null;
      UrlFetchApp.fetch = (url, options) => {
        calledUrl = url;
        payload = options && options.payload ? JSON.parse(options.payload) : null;
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            data: {
              organization: {
                __typename: 'Organization',
                login: 'octocat',
                projectsV2: {
                  nodes: [],
                  pageInfo: { hasNextPage: false, endCursor: null },
                  totalCount: 0
                }
              },
              user: null
            }
          }),
          getAllHeaders: () => ({})
        };
      };

      try {
        const response = AST.GitHub.listProjectsV2({
          owner: 'octocat'
        });
        if (!calledUrl || calledUrl.indexOf('/graphql') === -1) {
          throw new Error(`Expected GraphQL URL, got: ${calledUrl}`);
        }
        if (!payload || !payload.query || payload.query.indexOf('projectsV2') === -1) {
          throw new Error(`Expected projectsV2 GraphQL query, got: ${JSON.stringify(payload)}`);
        }
        if (!response || response.status !== 'ok') {
          throw new Error(`Unexpected listProjectsV2 response: ${JSON.stringify(response)}`);
        }
      } finally {
        UrlFetchApp.fetch = originalFetch;
        AST.GitHub.clearConfig();
      }
    }
  }
];

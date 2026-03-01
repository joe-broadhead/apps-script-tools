GITHUB_NAMESPACE_TESTS = [
  {
    description: 'AST.GitHub should expose public helper methods',
    test: () => astTestRunWithAssertions(t => {
      t.ok(AST && AST.GitHub, 'AST.GitHub is not available');

      const requiredMethods = [
        'run',
        'graphql',
        'authAsApp',
        'verifyWebhook',
        'parseWebhook',
        'getMe',
        'getRepository',
        'createRepository',
        'forkRepository',
        'listBranches',
        'createBranch',
        'listCommits',
        'getCommit',
        'getFileContents',
        'createOrUpdateFile',
        'deleteFile',
        'pushFiles',
        'listIssues',
        'getIssue',
        'getIssueComments',
        'createIssue',
        'updateIssue',
        'addIssueComment',
        'listPullRequests',
        'searchPullRequests',
        'getPullRequest',
        'getPullRequestDiff',
        'getPullRequestFiles',
        'getPullRequestComments',
        'getPullRequestReviewComments',
        'getPullRequestReviews',
        'getPullRequestStatus',
        'createPullRequest',
        'updatePullRequest',
        'mergePullRequest',
        'updatePullRequestBranch',
        'createPullRequestReview',
        'submitPendingPullRequestReview',
        'deletePendingPullRequestReview',
        'addCommentToPendingReview',
        'replyToPullRequestComment',
        'listReleases',
        'getLatestRelease',
        'getReleaseByTag',
        'listTags',
        'getTag',
        'searchRepositories',
        'searchUsers',
        'searchCode',
        'searchIssues',
        'rateLimit',
        'operations',
        'providers',
        'capabilities',
        'configure',
        'getConfig',
        'clearConfig'
      ];

      requiredMethods.forEach(method => {
        t.equal(typeof AST.GitHub[method], 'function', `AST.GitHub.${method} is not available`);
      });
    })
  },
  {
    description: 'AST.GitHub.operations() should expose graphql + registry operations',
    test: () => astTestRunWithAssertions(t => {
      const operations = AST.GitHub.operations();
      t.ok(operations.indexOf('get_repository') !== -1, 'Missing get_repository operation');
      t.ok(operations.indexOf('graphql') !== -1, 'Missing graphql operation');
      t.ok(operations.indexOf('auth_as_app') !== -1, 'Missing auth_as_app operation');
    })
  },
  {
    description: 'AST.GitHub.providers() should return github transport',
    test: () => astTestRunWithAssertions(t => {
      const providers = AST.GitHub.providers();
      const expected = ['github'];
      t.deepEqual(providers, expected, `Expected providers ${JSON.stringify(expected)}, got ${JSON.stringify(providers)}`);
    })
  }
];

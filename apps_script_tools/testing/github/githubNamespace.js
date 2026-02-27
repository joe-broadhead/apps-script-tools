GITHUB_NAMESPACE_TESTS = [
  {
    description: 'AST.GitHub should expose public helper methods',
    test: () => {
      if (!AST || !AST.GitHub) {
        throw new Error('AST.GitHub is not available');
      }

      const requiredMethods = [
        'run',
        'graphql',
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
        if (typeof AST.GitHub[method] !== 'function') {
          throw new Error(`AST.GitHub.${method} is not available`);
        }
      });
    }
  },
  {
    description: 'AST.GitHub.operations() should expose graphql + registry operations',
    test: () => {
      const operations = AST.GitHub.operations();
      if (operations.indexOf('get_repository') === -1) {
        throw new Error('Missing get_repository operation');
      }
      if (operations.indexOf('graphql') === -1) {
        throw new Error('Missing graphql operation');
      }
    }
  },
  {
    description: 'AST.GitHub.providers() should return github transport',
    test: () => {
      const providers = AST.GitHub.providers();
      const expected = ['github'];
      if (JSON.stringify(providers) !== JSON.stringify(expected)) {
        throw new Error(`Expected providers ${JSON.stringify(expected)}, got ${JSON.stringify(providers)}`);
      }
    }
  }
];

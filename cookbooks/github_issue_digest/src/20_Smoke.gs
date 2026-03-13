function cookbookPickDefaultRef_(repository, config) {
  return config.GITHUB_AUTOMATION_DEFAULT_BRANCH
    || (repository && repository.data && repository.data.default_branch ? repository.data.default_branch : '')
    || 'main';
}

function cookbookIssuesOnly_(items) {
  const rows = Array.isArray(items) ? items : [];
  return rows.filter(function (item) {
    return item && !item.pull_request;
  });
}

function runCookbookSmokeInternal_(ASTX, config) {
  const startedAtMs = Date.now();
  const cache = cookbookBuildCacheConfig_(config);
  const repository = ASTX.GitHub.getRepository({
    options: {
      cache: cache
    }
  });
  const issues = ASTX.GitHub.listIssues({
    state: 'open',
    options: {
      page: 1,
      perPage: 10,
      cache: cache
    }
  });
  const pulls = ASTX.GitHub.listPullRequests({
    state: 'open',
    options: {
      page: 1,
      perPage: 10,
      cache: cache
    }
  });
  const checks = ASTX.GitHub.listCheckRuns({
    ref: cookbookPickDefaultRef_(repository, config),
    options: {
      page: 1,
      perPage: 10,
      cache: cache
    }
  });
  const dryRunIssue = ASTX.GitHub.createIssue({
    body: {
      title: '[dry-run] GitHub automation cookbook smoke issue',
      body: 'Planned by runCookbookSmoke() only. No network mutation should execute.'
    },
    options: {
      dryRun: true
    }
  });

  return {
    status: 'ok',
    cookbook: cookbookName_(),
    entrypoint: 'runCookbookSmoke',
    appName: config.GITHUB_AUTOMATION_APP_NAME,
    durationMs: Date.now() - startedAtMs,
    repository: {
      fullName: repository.data ? repository.data.full_name : null,
      defaultBranch: repository.data ? repository.data.default_branch : null,
      private: repository.data ? repository.data.private : null,
      cache: repository.cache || null
    },
    issues: {
      openIssues: cookbookIssuesOnly_(issues.data).length,
      page: issues.page || null,
      cache: issues.cache || null
    },
    pullRequests: {
      openPullRequests: Array.isArray(pulls.data) ? pulls.data.length : 0,
      page: pulls.page || null,
      cache: pulls.cache || null
    },
    checks: {
      ref: cookbookPickDefaultRef_(repository, config),
      total: checks.data && typeof checks.data.total_count !== 'undefined'
        ? checks.data.total_count
        : (Array.isArray(checks.data && checks.data.check_runs) ? checks.data.check_runs.length : 0),
      cache: checks.cache || null
    },
    dryRun: {
      enabled: dryRunIssue.dryRun ? dryRunIssue.dryRun.enabled : false,
      plannedRequest: dryRunIssue.dryRun ? dryRunIssue.dryRun.plannedRequest : null
    },
    rateLimit: repository.rateLimit || null
  };
}

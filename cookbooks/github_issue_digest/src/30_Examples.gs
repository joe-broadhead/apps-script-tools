function cookbookPublicConfig_(config) {
  return {
    GITHUB_AUTOMATION_APP_NAME: config.GITHUB_AUTOMATION_APP_NAME,
    GITHUB_AUTOMATION_OWNER: config.runtime.owner,
    GITHUB_AUTOMATION_REPO: config.runtime.repo,
    GITHUB_AUTOMATION_DEFAULT_BRANCH: config.GITHUB_AUTOMATION_DEFAULT_BRANCH,
    GITHUB_AUTOMATION_PROJECT_OWNER: config.runtime.projectOwner,
    GITHUB_AUTOMATION_PROJECT_ID: config.GITHUB_AUTOMATION_PROJECT_ID,
    GITHUB_AUTOMATION_CACHE_ENABLED: config.GITHUB_AUTOMATION_CACHE_ENABLED,
    GITHUB_AUTOMATION_CACHE_BACKEND: config.GITHUB_AUTOMATION_CACHE_BACKEND,
    GITHUB_AUTOMATION_CACHE_NAMESPACE: config.GITHUB_AUTOMATION_CACHE_NAMESPACE,
    GITHUB_AUTOMATION_CACHE_TTL_SEC: config.GITHUB_AUTOMATION_CACHE_TTL_SEC,
    GITHUB_AUTOMATION_CACHE_STALE_TTL_SEC: config.GITHUB_AUTOMATION_CACHE_STALE_TTL_SEC,
    GITHUB_AUTOMATION_CACHE_ETAG_TTL_SEC: config.GITHUB_AUTOMATION_CACHE_ETAG_TTL_SEC,
    GITHUB_AUTOMATION_CACHE_STORAGE_URI: config.GITHUB_AUTOMATION_CACHE_STORAGE_URI,
    hasToken: Boolean(config.runtime && config.runtime.token),
    hasAppAuth: Boolean(config.runtime && config.runtime.hasAppAuth)
  };
}

function cookbookPickFirstIssueNumber_(issuesResponse) {
  const issues = cookbookIssuesOnly_(issuesResponse && issuesResponse.data);
  return issues.length > 0 && issues[0] && issues[0].number ? issues[0].number : 0;
}

function cookbookPickFirstPullNumber_(pullsResponse) {
  const pulls = Array.isArray(pullsResponse && pullsResponse.data) ? pullsResponse.data : [];
  return pulls.length > 0 && pulls[0] && pulls[0].number ? pulls[0].number : 0;
}

function cookbookBytesToHex_(bytes) {
  const values = Array.isArray(bytes) ? bytes : [];
  return values.map(function (value) {
    const normalized = value < 0 ? value + 256 : value;
    return normalized.toString(16).padStart(2, '0');
  }).join('');
}

function cookbookRunWebhookFixture_(ASTX, config) {
  const payload = JSON.stringify({
    action: 'opened',
    repository: {
      name: config.runtime.repo,
      full_name: config.runtime.owner + '/' + config.runtime.repo,
      owner: { login: config.runtime.owner }
    },
    sender: {
      login: 'cookbook-bot',
      type: 'Bot'
    },
    installation: {
      id: 123456
    },
    issue: {
      number: 42,
      title: 'Cookbook fixture issue'
    }
  });
  const secret = 'cookbook-webhook-secret';
  const signature = 'sha256=' + cookbookBytesToHex_(Utilities.computeHmacSha256Signature(payload, secret));
  const headers = {
    'X-Hub-Signature-256': signature,
    'X-GitHub-Event': 'issues',
    'X-GitHub-Delivery': 'cookbook-delivery-1'
  };
  const verify = ASTX.GitHub.verifyWebhook({
    payload: payload,
    headers: headers,
    auth: {
      webhookSecret: secret
    }
  });
  const parsed = ASTX.GitHub.parseWebhook({
    payload: payload,
    headers: headers,
    auth: {
      webhookSecret: secret
    },
    options: {
      verifySignature: true
    }
  });

  return {
    status: 'ok',
    verify: verify.data || null,
    parsed: parsed.data || null
  };
}

function cookbookMaybeRunProjectsDemo_(ASTX, config) {
  const owner = config.runtime.projectOwner;
  if (!owner) {
    return {
      status: 'skip',
      reason: 'Set GITHUB_AUTOMATION_PROJECT_OWNER to enable Projects v2 examples.'
    };
  }

  const projects = ASTX.GitHub.listProjectsV2({
    owner: owner,
    options: {
      perPage: 10,
      cache: cookbookBuildCacheConfig_(config)
    }
  });

  if (!config.GITHUB_AUTOMATION_PROJECT_ID) {
    return {
      status: 'ok',
      owner: owner,
      projectCount: Array.isArray(projects.data && projects.data.items) ? projects.data.items.length : 0,
      page: projects.page || null,
      cache: projects.cache || null,
      items: {
        status: 'skip',
        reason: 'Set GITHUB_AUTOMATION_PROJECT_ID to inspect Project v2 items.'
      }
    };
  }

  const items = ASTX.GitHub.listProjectV2Items({
    projectId: config.GITHUB_AUTOMATION_PROJECT_ID,
    options: {
      perPage: 10,
      cache: cookbookBuildCacheConfig_(config)
    }
  });

  return {
    status: 'ok',
    owner: owner,
    projectCount: Array.isArray(projects.data && projects.data.items) ? projects.data.items.length : 0,
    page: projects.page || null,
    cache: projects.cache || null,
    items: {
      projectId: config.GITHUB_AUTOMATION_PROJECT_ID,
      count: Array.isArray(items.data && items.data.items) ? items.data.items.length : 0,
      page: items.page || null,
      cache: items.cache || null
    }
  };
}

function cookbookMaybeRunAppAuthDemo_(ASTX, config) {
  if (!config.runtime.hasAppAuth) {
    return {
      status: 'skip',
      reason: 'Set GitHub App credentials to enable authAsApp example.'
    };
  }

  const response = ASTX.GitHub.authAsApp({
    options: {
      dryRun: true
    }
  });

  return {
    status: response.status,
    dryRun: response.dryRun || null,
    warnings: response.warnings || []
  };
}

function runCookbookDemoInternal_(ASTX, config) {
  const startedAtMs = Date.now();
  const cache = cookbookBuildCacheConfig_(config);
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
  const issueNumber = cookbookPickFirstIssueNumber_(issues);
  const pullNumber = cookbookPickFirstPullNumber_(pulls);
  const issue = issueNumber
    ? ASTX.GitHub.getIssue({
        issueNumber: issueNumber,
        options: {
          cache: cache
        }
      })
    : null;
  const issueComments = issueNumber
    ? ASTX.GitHub.getIssueComments({
        issueNumber: issueNumber,
        options: {
          page: 1,
          perPage: 5,
          cache: cache
        }
      })
    : null;
  const pullStatus = pullNumber
    ? ASTX.GitHub.getPullRequestStatus({
        pullNumber: pullNumber,
        options: {
          cache: cache
        }
      })
    : null;
  const workflows = ASTX.GitHub.listWorkflows({
    options: {
      page: 1,
      perPage: 10,
      cache: cache
    }
  });
  const search = ASTX.GitHub.searchPullRequests({
    query: 'repo:' + config.runtime.owner + '/' + config.runtime.repo + ' state:open',
    options: {
      page: 1,
      perPage: 10,
      cache: cache
    }
  });
  const graph = ASTX.GitHub.graphql({
    query: 'query($owner:String!, $repo:String!) { repository(owner:$owner, name:$repo) { name isPrivate defaultBranchRef { name } } }',
    variables: {
      owner: config.runtime.owner,
      repo: config.runtime.repo
    },
    options: {
      cache: cache
    }
  });
  const webhookFixture = cookbookRunWebhookFixture_(ASTX, config);
  const projects = cookbookMaybeRunProjectsDemo_(ASTX, config);
  const appAuth = cookbookMaybeRunAppAuthDemo_(ASTX, config);

  return {
    status: 'ok',
    cookbook: cookbookName_(),
    entrypoint: 'runCookbookDemo',
    appName: config.GITHUB_AUTOMATION_APP_NAME,
    durationMs: Date.now() - startedAtMs,
    repository: {
      owner: config.runtime.owner,
      repo: config.runtime.repo
    },
    issueFlow: issue
      ? {
          issueNumber: issueNumber,
          title: issue.data ? issue.data.title : null,
          commentCount: Array.isArray(issueComments && issueComments.data) ? issueComments.data.length : 0,
          cache: issue.cache || null
        }
      : {
          status: 'skip',
          reason: 'Repository has no open issues.'
        },
    pullRequestFlow: pullStatus
      ? {
          pullNumber: pullNumber,
          state: pullStatus.data ? pullStatus.data.state : null,
          statuses: pullStatus.data && Array.isArray(pullStatus.data.statuses)
            ? pullStatus.data.statuses.length
            : 0,
          cache: pullStatus.cache || null
        }
      : {
          status: 'skip',
          reason: 'Repository has no open pull requests.'
        },
    actions: {
      workflowCount: Array.isArray(workflows.data && workflows.data.workflows) ? workflows.data.workflows.length : 0,
      cache: workflows.cache || null
    },
    search: {
      total: search.page ? search.page.total : 0,
      returned: search.page ? search.page.returned : 0,
      cache: search.cache || null
    },
    graphql: {
      repository: graph.data && graph.data.repository ? graph.data.repository : null,
      cache: graph.cache || null
    },
    projects: projects,
    webhookFixture: webhookFixture,
    appAuth: appAuth
  };
}

function astGitHubRunIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astGitHubRunNormalizeString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function astGitHubApplyConfigDefaults(request, config) {
  const out = astGitHubRunIsPlainObject(request) ? Object.assign({}, request) : {};

  if (!out.owner && config.owner) {
    out.owner = config.owner;
  }

  if (!out.repo && config.repo) {
    out.repo = config.repo;
  }

  if (!astGitHubRunIsPlainObject(out.options)) {
    out.options = {};
  }

  if (!astGitHubRunIsPlainObject(out.options.cache)) {
    out.options.cache = {};
  }

  return out;
}

function astGitHubBuildUrl(baseUrl, path, queryParams = {}) {
  const normalizedBase = astGitHubRunNormalizeString(baseUrl, '').replace(/\/+$/, '');
  const normalizedPath = astGitHubRunNormalizeString(path, '');
  const queryString = astGitHubBuildQueryString(queryParams);

  return `${normalizedBase}${normalizedPath}${queryString}`;
}

function astGitHubExtractAllowedQueryFields(input = {}, fields = []) {
  const source = astGitHubRunIsPlainObject(input) ? input : {};
  const out = {};

  for (let idx = 0; idx < fields.length; idx += 1) {
    const key = fields[idx];
    if (source[key] == null || source[key] === '') {
      continue;
    }
    out[key] = source[key];
  }

  return out;
}

function astGitHubEnsureSearchQuery(request, forceQualifier = null) {
  const body = astGitHubRunIsPlainObject(request.body) ? request.body : {};
  let query = astGitHubRunNormalizeString(request.query || body.q, '');

  if (!query) {
    throw new AstGitHubValidationError("Missing required GitHub request field 'query' for search operation", {
      field: 'query',
      operation: request.operation
    });
  }

  if (forceQualifier && !astGitHubSearchHasQualifierToken(query, forceQualifier)) {
    query = `${query} ${forceQualifier}`.trim();
  }

  return query;
}

function astGitHubSearchHasQualifierToken(query, qualifier) {
  const normalizedQuery = astGitHubRunNormalizeString(query, '');
  const normalizedQualifier = astGitHubRunNormalizeString(qualifier, '').toLowerCase();

  if (!normalizedQuery || !normalizedQualifier) {
    return false;
  }

  const escapedQualifier = normalizedQualifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(^|[\\s(])${escapedQualifier}(?![A-Za-z0-9_-])`, 'i');

  return pattern.test(normalizedQuery);
}

function astGitHubBuildOperationQuery(request, spec, pagination) {
  const body = astGitHubRunIsPlainObject(request.body) ? request.body : {};
  const base = pagination && pagination.paginated ? pagination.query : {};

  switch (request.operation) {
    case 'list_commits':
      return astGitHubMergeQuery(base, astGitHubExtractAllowedQueryFields(body, [
        'sha',
        'path',
        'author',
        'since',
        'until'
      ]));
    case 'get_file_contents':
      return astGitHubMergeQuery(base, {
        ref: request.ref || request.branch || body.ref || body.branch || null
      });
    case 'list_issues':
      return astGitHubMergeQuery(base, astGitHubExtractAllowedQueryFields(body, [
        'milestone',
        'state',
        'assignee',
        'creator',
        'mentioned',
        'labels',
        'sort',
        'direction',
        'since'
      ]));
    case 'get_issue_comments':
      return astGitHubMergeQuery(base, astGitHubExtractAllowedQueryFields(body, ['since']));
    case 'list_pull_requests':
      return astGitHubMergeQuery(base, astGitHubExtractAllowedQueryFields(body, [
        'state',
        'head',
        'base',
        'sort',
        'direction'
      ]));
    case 'get_pull_request_comments':
    case 'get_pull_request_review_comments':
    case 'get_pull_request_reviews':
    case 'get_pull_request_files':
      return astGitHubMergeQuery(base, astGitHubExtractAllowedQueryFields(body, ['sort', 'direction', 'since']));
    case 'list_branches':
      return astGitHubMergeQuery(base, astGitHubExtractAllowedQueryFields(body, ['protected']));
    case 'search_pull_requests': {
      const query = astGitHubEnsureSearchQuery(request, 'is:pr');
      return astGitHubMergeQuery(base, astGitHubMergeQuery(
        astGitHubExtractAllowedQueryFields(body, ['sort', 'order']),
        { q: query }
      ));
    }
    case 'search_issues': {
      const query = astGitHubEnsureSearchQuery(request, 'is:issue');
      return astGitHubMergeQuery(base, astGitHubMergeQuery(
        astGitHubExtractAllowedQueryFields(body, ['sort', 'order']),
        { q: query }
      ));
    }
    case 'search_repositories':
    case 'search_users':
    case 'search_code': {
      const query = astGitHubEnsureSearchQuery(request, null);
      return astGitHubMergeQuery(base, astGitHubMergeQuery(
        astGitHubExtractAllowedQueryFields(body, ['sort', 'order']),
        { q: query }
      ));
    }
    default:
      if (spec && spec.paginated === true) {
        return astGitHubMergeQuery(base, {});
      }
      return {};
  }
}

function astGitHubBuildMutationTags(request, spec) {
  const tags = ['github:all'];

  if (spec && spec.group) {
    tags.push(`github:group:${spec.group}`);
  }

  if (request.owner && request.repo) {
    tags.push(`github:repo:${request.owner}/${request.repo}`);
  }

  if (request.operation) {
    tags.push(`github:operation:${request.operation}`);
  }

  return tags;
}

function astGitHubResolveAcceptHeader(request, spec) {
  const providerOptions = astGitHubRunIsPlainObject(request && request.providerOptions)
    ? request.providerOptions
    : {};
  const requestedAccept = astGitHubRunNormalizeString(providerOptions.accept, null);
  if (requestedAccept) {
    return requestedAccept;
  }
  if (spec && spec.accept) {
    return spec.accept;
  }
  return 'application/vnd.github+json';
}

function astGitHubBuildHeaders(config, request, spec, extraHeaders = {}) {
  const headers = {
    Authorization: `Bearer ${config.token}`,
    Accept: astGitHubResolveAcceptHeader(request, spec),
    'X-GitHub-Api-Version': config.apiVersion,
    'User-Agent': config.userAgent
  };

  if (astGitHubRunIsPlainObject(extraHeaders)) {
    Object.keys(extraHeaders).forEach(key => {
      const value = extraHeaders[key];
      if (value == null || value === '') {
        return;
      }
      headers[key] = String(value);
    });
  }

  return headers;
}

function astGitHubBuildRequestBody(request, operation) {
  const body = astGitHubRunIsPlainObject(request.body)
    ? Object.assign({}, request.body)
    : {};

  if (operation === 'create_repository' && body.organization) {
    delete body.organization;
  }

  if (operation === 'submit_pending_pull_request_review' && !body.event) {
    body.event = 'COMMENT';
  }

  return body;
}

function astGitHubValidateRequiredField(value, field) {
  if (value == null || value === '') {
    throw new AstGitHubValidationError(`Missing required GitHub request field '${field}'`, {
      field
    });
  }
}

function astGitHubExecuteStandardOperation(request, config, spec, overrides = {}) {
  const operationSpec = spec || astGitHubGetOperationSpec(request.operation);
  if (!operationSpec) {
    throw new AstGitHubCapabilityError('GitHub operation is not supported', {
      operation: request.operation
    });
  }

  const method = overrides.method || operationSpec.method;
  const path = overrides.path || operationSpec.path(request);
  const pagination = overrides.pagination || astGitHubBuildPagination(request.options, operationSpec);
  const queryParams = overrides.queryParams || astGitHubBuildOperationQuery(request, operationSpec, pagination);
  const url = astGitHubBuildUrl(config.baseUrl, path, queryParams);
  const requestBody = typeof overrides.body !== 'undefined'
    ? overrides.body
    : astGitHubBuildRequestBody(request, request.operation);

  const includeBody = ['post', 'patch', 'put', 'delete'].includes(String(method).toLowerCase())
    && requestBody
    && Object.keys(requestBody).length > 0;

  const dryRunPlan = request.options.dryRun && operationSpec.mutation === true
    ? astGitHubBuildDryRunPlan({
      request,
      config,
      operationSpec,
      method,
      path,
      queryParams,
      body: includeBody ? requestBody : null
    })
    : null;

  if (dryRunPlan) {
    return astGitHubNormalizeResponse({
      operation: request.operation,
      operationSpec,
      method,
      path,
      request,
      config,
      dryRunPlan
    });
  }

  const useCache = overrides.forceCacheEnabled === true
    ? true
    : (overrides.forceCacheEnabled === false
      ? false
      : astGitHubIsCacheEnabled(operationSpec, config, request.options));
  const cacheConfig = config.cache || {};
  const requestHeaders = astGitHubBuildHeaders(config, request, operationSpec);
  const cacheVary = {
    accept: requestHeaders.Accept || null,
    apiVersion: requestHeaders['X-GitHub-Api-Version'] || null
  };

  const cacheKey = useCache
    ? astGitHubBuildCacheKey(request, config, method, path, queryParams, null, false, cacheVary)
    : null;

  const nowMs = Date.now();
  const cached = cacheKey ? astGitHubReadCacheEntry(cacheKey, cacheConfig) : null;
  const cachedState = astGitHubClassifyCachedPayload(cached, nowMs);

  if (useCache && cachedState.fresh) {
    return astGitHubNormalizeResponse({
      operation: request.operation,
      operationSpec,
      method,
      path,
      request,
      config,
      cached,
      cacheMeta: {
        enabled: true,
        hit: true,
        etagUsed: false,
        revalidated304: false,
        key: cacheKey
      }
    });
  }

  const requestHeadersWithConditional = Object.assign({}, requestHeaders);
  if (useCache && cachedState.etagValid) {
    requestHeadersWithConditional['If-None-Match'] = cached.etag;
  }

  let httpResult;
  try {
    httpResult = astGitHubHttpRequest({
      operation: request.operation,
      url,
      method,
      headers: requestHeadersWithConditional,
      payload: includeBody ? JSON.stringify(requestBody) : undefined,
      retries: config.retries,
      timeoutMs: config.timeoutMs
    });
  } catch (error) {
    if (useCache && cachedState.stale && cacheConfig.serveStaleOnError === true) {
      return astGitHubNormalizeResponse({
        operation: request.operation,
        operationSpec,
        method,
        path,
        request,
        config,
        cached,
        cacheMeta: {
          enabled: true,
          hit: true,
          etagUsed: false,
          revalidated304: false,
          key: cacheKey
        },
        warnings: ['Served stale GitHub cache entry due to upstream error']
      });
    }

    throw error;
  }

  if (httpResult.statusCode === 304 && useCache && cachedState.hasValue) {
    const refreshed = astGitHubBuildCachedEnvelope(
      cached.data,
      httpResult.headers,
      cacheConfig,
      cached.etag,
      Date.now()
    );
    astGitHubWriteCacheEntry(cacheKey, refreshed, cacheConfig, [
      'github:all',
      `github:operation:${request.operation}`,
      operationSpec.group ? `github:group:${operationSpec.group}` : null,
      request.owner && request.repo ? `github:repo:${request.owner}/${request.repo}` : null
    ]);

    return astGitHubNormalizeResponse({
      operation: request.operation,
      operationSpec,
      method,
      path,
      request,
      config,
      cached: refreshed,
      cacheMeta: {
        enabled: true,
        hit: true,
        etagUsed: true,
        revalidated304: true,
        key: cacheKey
      }
    });
  }

  if (useCache) {
    const envelope = astGitHubBuildCachedEnvelope(
      astGitHubExtractDataBody(operationSpec, httpResult),
      httpResult.headers,
      cacheConfig,
      astGitHubRunNormalizeString(httpResult.headers.etag, null),
      Date.now()
    );

    astGitHubWriteCacheEntry(cacheKey, envelope, cacheConfig, [
      'github:all',
      `github:operation:${request.operation}`,
      operationSpec.group ? `github:group:${operationSpec.group}` : null,
      request.owner && request.repo ? `github:repo:${request.owner}/${request.repo}` : null
    ]);
  }

  if (operationSpec.mutation === true) {
    astGitHubInvalidateCacheTags(astGitHubBuildMutationTags(request, operationSpec), cacheConfig);
  }

  return astGitHubNormalizeResponse({
    operation: request.operation,
    operationSpec,
    method,
    path,
    request,
    config,
    httpResult,
    cacheMeta: {
      enabled: useCache,
      hit: false,
      etagUsed: cachedState.etagValid,
      revalidated304: false,
      key: cacheKey
    }
  });
}

function astGitHubExecuteCreateBranch(request, config) {
  const body = astGitHubRunIsPlainObject(request.body) ? request.body : {};
  const branch = astGitHubRunNormalizeString(request.branch || body.branch, '');
  astGitHubValidateRequiredField(branch, 'branch');

  let sha = astGitHubRunNormalizeString(request.ref || body.sha, '');
  let sourceBranch = astGitHubRunNormalizeString(
    body.fromBranch || body.from_branch || body.baseBranch || body.base_branch,
    ''
  );

  if (!sha) {
    if (!sourceBranch) {
      const repositoryOutput = astGitHubExecuteStandardOperation(
        Object.assign({}, request, {
          operation: 'create_branch_repo_lookup',
          options: Object.assign({}, request.options, { dryRun: false })
        }),
        config,
        {
          method: 'get',
          path: req => astGitHubBuildRepoPath(req),
          read: true,
          paginated: false,
          group: 'branches',
          mutation: false
        },
        {
          path: astGitHubBuildRepoPath(request),
          queryParams: {},
          forceCacheEnabled: false
        }
      );

      sourceBranch = astGitHubRunNormalizeString(
        repositoryOutput &&
        repositoryOutput.data &&
        repositoryOutput.data.default_branch,
        ''
      ) || 'main';
    }

    const refPath = astGitHubBuildRepoPath(request, `/git/ref/heads/${encodeURIComponent(sourceBranch)}`);
    const refResponse = astGitHubExecuteStandardOperation(
      Object.assign({}, request, {
        operation: 'create_branch_ref_lookup',
        options: Object.assign({}, request.options, { dryRun: false })
      }),
      config,
      {
        method: 'get',
        path: () => refPath,
        read: true,
        paginated: false,
        group: 'branches',
        mutation: false
      },
      {
        path: refPath,
        queryParams: {},
        forceCacheEnabled: false
      }
    );

    const object = refResponse && refResponse.data && refResponse.data.object
      ? refResponse.data.object
      : null;
    sha = astGitHubRunNormalizeString(object && object.sha, '');
  }

  astGitHubValidateRequiredField(sha, 'sha');

  const payload = {
    ref: `refs/heads/${branch}`,
    sha
  };

  return astGitHubExecuteStandardOperation(
    Object.assign({}, request, {
      body: payload,
      operation: 'create_branch'
    }),
    config,
    {
      method: 'post',
      path: req => astGitHubBuildRepoPath(req, '/git/refs'),
      read: false,
      paginated: false,
      group: 'branches',
      mutation: true
    },
    {
      path: astGitHubBuildRepoPath(request, '/git/refs'),
      queryParams: {},
      body: payload,
      forceCacheEnabled: false
    }
  );
}

function astGitHubExecutePushFiles(request, config) {
  const body = astGitHubRunIsPlainObject(request.body) ? request.body : {};
  const files = Array.isArray(body.files) ? body.files : [];

  if (files.length === 0) {
    throw new AstGitHubValidationError("GitHub operation 'push_files' requires body.files as a non-empty array", {
      operation: 'push_files',
      field: 'body.files'
    });
  }

  const defaultMessage = astGitHubRunNormalizeString(body.message, '');
  const defaultBranch = astGitHubRunNormalizeString(body.branch, null);
  const normalizedFiles = [];

  for (let idx = 0; idx < files.length; idx += 1) {
    const file = files[idx];
    if (!astGitHubRunIsPlainObject(file)) {
      throw new AstGitHubValidationError('Each push_files item must be an object', {
        operation: 'push_files',
        index: idx
      });
    }

    const path = astGitHubRunNormalizeString(file.path, '');
    const message = astGitHubRunNormalizeString(file.message, defaultMessage);
    const content = astGitHubRunNormalizeString(file.content, '');
    const branch = astGitHubRunNormalizeString(file.branch, defaultBranch);
    const sha = astGitHubRunNormalizeString(file.sha, null);

    astGitHubValidateRequiredField(path, 'body.files[].path');
    astGitHubValidateRequiredField(message, 'body.files[].message');
    astGitHubValidateRequiredField(content, 'body.files[].content');

    normalizedFiles.push({
      path,
      message,
      content,
      branch,
      sha
    });
  }

  if (request.options && request.options.dryRun === true) {
    const plan = astGitHubBuildDryRunPlan({
      request,
      config,
      operationSpec: {
        method: 'post',
        mutation: true
      },
      method: 'post',
      path: astGitHubBuildRepoPath(request, '/contents/*'),
      queryParams: {},
      body: {
        branch: defaultBranch,
        files: normalizedFiles.map(file => ({
          path: file.path,
          message: file.message,
          hasSha: Boolean(file.sha),
          branch: file.branch
        }))
      }
    });

    return astGitHubNormalizeResponse({
      operation: 'push_files',
      operationSpec: { read: false, mutation: true, paginated: false, group: 'files' },
      method: 'post',
      path: astGitHubBuildRepoPath(request, '/contents/*'),
      request,
      config,
      dryRunPlan: plan
    });
  }

  const results = [];
  for (let idx = 0; idx < normalizedFiles.length; idx += 1) {
    const file = normalizedFiles[idx];

    const subRequest = {
      operation: 'create_or_update_file',
      owner: request.owner,
      repo: request.repo,
      path: file.path,
      body: {
        message: file.message,
        content: file.content,
        branch: file.branch,
        sha: file.sha
      },
      options: Object.assign({}, request.options, { dryRun: false })
    };

    const output = astGitHubExecuteStandardOperation(subRequest, config, astGitHubGetOperationSpec('create_or_update_file'));
    results.push({
      index: idx,
      path: file.path,
      status: 'ok',
      data: output.data
    });
  }

  return astGitHubNormalizeResponse({
    operation: 'push_files',
    operationSpec: { read: false, mutation: true, paginated: false, group: 'files' },
    method: 'post',
    path: astGitHubBuildRepoPath(request, '/contents/*'),
    request,
    config,
    httpResult: {
      statusCode: 200,
      bodyJson: {
        count: results.length,
        results
      },
      bodyText: '',
      headers: {}
    }
  });
}

function astGitHubExecutePullRequestStatus(request, config) {
  const pullResponse = astGitHubExecuteStandardOperation(
    Object.assign({}, request, {
      operation: 'get_pull_request',
      options: Object.assign({}, request.options, { dryRun: false })
    }),
    config,
    astGitHubGetOperationSpec('get_pull_request')
  );

  const sha = astGitHubRunNormalizeString(
    pullResponse && pullResponse.data && pullResponse.data.head && pullResponse.data.head.sha,
    ''
  );

  astGitHubValidateRequiredField(sha, 'pull.head.sha');

  return astGitHubExecuteStandardOperation(
    Object.assign({}, request, {
      operation: 'get_pull_request_status',
      ref: sha,
      options: Object.assign({}, request.options, { dryRun: false })
    }),
    config,
    {
      method: 'get',
      path: req => astGitHubBuildRepoPath(req, `/commits/${encodeURIComponent(req.ref)}/status`),
      read: true,
      paginated: false,
      group: 'pull_requests',
      mutation: false
    },
    {
      path: astGitHubBuildRepoPath(request, `/commits/${encodeURIComponent(sha)}/status`),
      queryParams: {},
      forceCacheEnabled: false
    }
  );
}

function astGitHubDispatchCustomOperation(request, config, spec) {
  if (!spec || !spec.customExecutor) {
    throw new AstGitHubCapabilityError('GitHub custom operation metadata is missing', {
      operation: request.operation
    });
  }

  if (spec.customExecutor === 'create_branch') {
    return astGitHubExecuteCreateBranch(request, config);
  }

  if (spec.customExecutor === 'push_files') {
    return astGitHubExecutePushFiles(request, config);
  }

  if (spec.customExecutor === 'pull_status') {
    return astGitHubExecutePullRequestStatus(request, config);
  }

  throw new AstGitHubCapabilityError('Unsupported custom GitHub operation executor', {
    operation: request.operation,
    executor: spec.customExecutor
  });
}

function astRunGitHubRequest(request = {}) {
  const normalized = astGitHubValidateRequest(request);
  const config = astGitHubResolveConfig(normalized);
  const withDefaults = astGitHubApplyConfigDefaults(normalized, config);

  if (withDefaults.operation === 'graphql') {
    return astGitHubRunGraphqlRequest(withDefaults, config);
  }

  const spec = astGitHubGetOperationSpec(withDefaults.operation);
  if (!spec) {
    throw new AstGitHubCapabilityError('Unsupported GitHub operation', {
      operation: withDefaults.operation
    });
  }

  try {
    if (spec.customExecutor) {
      return astGitHubDispatchCustomOperation(withDefaults, config, spec);
    }

    return astGitHubExecuteStandardOperation(withDefaults, config, spec);
  } catch (error) {
    if (
      error &&
      (
        error.name === 'AstGitHubError' ||
        error.name === 'AstGitHubValidationError' ||
        error.name === 'AstGitHubAuthError' ||
        error.name === 'AstGitHubNotFoundError' ||
        error.name === 'AstGitHubRateLimitError' ||
        error.name === 'AstGitHubConflictError' ||
        error.name === 'AstGitHubCapabilityError' ||
        error.name === 'AstGitHubProviderError' ||
        error.name === 'AstGitHubParseError'
      )
    ) {
      throw error;
    }

    throw new AstGitHubProviderError('GitHub operation failed', {
      operation: withDefaults.operation
    }, error);
  }
}

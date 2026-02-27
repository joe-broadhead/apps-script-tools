function astGitHubPathIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astGitHubNormalizePathString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function astGitHubEncodePathSegment(value, fieldName = 'value') {
  const normalized = astGitHubNormalizePathString(value, '');
  if (!normalized) {
    throw new AstGitHubValidationError(`Missing required GitHub request field '${fieldName}'`, {
      field: fieldName
    });
  }

  if (/[\u0000-\u001F]/.test(normalized) || normalized.includes('/') || normalized.includes('\\') || normalized.includes('..')) {
    throw new AstGitHubValidationError(`GitHub request field '${fieldName}' contains disallowed path characters`, {
      field: fieldName,
      value: normalized
    });
  }
  return encodeURIComponent(normalized);
}

function astGitHubBuildRepoPath(request = {}, suffix = '') {
  const owner = astGitHubEncodePathSegment(request.owner, 'owner');
  const repo = astGitHubEncodePathSegment(request.repo, 'repo');
  const normalizedSuffix = astGitHubNormalizePathString(suffix, '');
  if (!normalizedSuffix) {
    return `/repos/${owner}/${repo}`;
  }
  return `/repos/${owner}/${repo}${normalizedSuffix.startsWith('/') ? normalizedSuffix : `/${normalizedSuffix}`}`;
}

function astGitHubBuildIssueNumberPath(request = {}, suffix = '') {
  const issueNumber = Number(request.issueNumber);
  if (!Number.isInteger(issueNumber) || issueNumber < 1) {
    throw new AstGitHubValidationError("Missing required GitHub request field 'issueNumber'", {
      field: 'issueNumber'
    });
  }
  return astGitHubBuildRepoPath(request, `/issues/${issueNumber}${suffix || ''}`);
}

function astGitHubBuildPullNumberPath(request = {}, suffix = '') {
  const pullNumber = Number(request.pullNumber);
  if (!Number.isInteger(pullNumber) || pullNumber < 1) {
    throw new AstGitHubValidationError("Missing required GitHub request field 'pullNumber'", {
      field: 'pullNumber'
    });
  }
  return astGitHubBuildRepoPath(request, `/pulls/${pullNumber}${suffix || ''}`);
}

function astGitHubBuildPullIssueCommentsPath(request = {}) {
  const pullNumber = Number(request.pullNumber);
  if (!Number.isInteger(pullNumber) || pullNumber < 1) {
    throw new AstGitHubValidationError("Missing required GitHub request field 'pullNumber'", {
      field: 'pullNumber'
    });
  }
  return astGitHubBuildRepoPath(request, `/issues/${pullNumber}/comments`);
}

function astGitHubBuildPathForTag(request = {}, includeGitRef = false) {
  const tag = astGitHubEncodePathSegment(request.tag, 'tag');
  if (includeGitRef) {
    return astGitHubBuildRepoPath(request, `/git/ref/tags/${tag}`);
  }
  return astGitHubBuildRepoPath(request, `/releases/tags/${tag}`);
}

function astGitHubBuildFileContentsPath(request = {}) {
  const path = astGitHubNormalizePathString(request.path, '');
  if (!path) {
    throw new AstGitHubValidationError("Missing required GitHub request field 'path'", {
      field: 'path'
    });
  }

  const segments = path
    .split('/')
    .filter(Boolean)
    .map(segment => {
      if (segment === '.' || segment === '..') {
        throw new AstGitHubValidationError("GitHub request field 'path' must not include '.' or '..' segments", {
          field: 'path',
          value: path
        });
      }
      if (/[\u0000-\u001F]/.test(segment) || segment.includes('\\')) {
        throw new AstGitHubValidationError("GitHub request field 'path' contains disallowed path characters", {
          field: 'path',
          value: path
        });
      }
      return encodeURIComponent(segment);
    });

  if (segments.length === 0) {
    throw new AstGitHubValidationError("GitHub request field 'path' must not resolve to empty", {
      field: 'path'
    });
  }

  return astGitHubBuildRepoPath(request, `/contents/${segments.join('/')}`);
}

function astGitHubMergeQuery(base = {}, extra = {}) {
  const out = astGitHubPathIsPlainObject(base)
    ? Object.assign({}, base)
    : {};
  if (astGitHubPathIsPlainObject(extra)) {
    Object.keys(extra).forEach(key => {
      if (typeof extra[key] === 'undefined' || extra[key] === null || extra[key] === '') {
        return;
      }
      out[key] = extra[key];
    });
  }
  return out;
}

function astGitHubBuildQueryString(params = {}) {
  if (!astGitHubPathIsPlainObject(params)) {
    return '';
  }

  const entries = Object.keys(params)
    .filter(key => {
      const value = params[key];
      return !(value === null || typeof value === 'undefined' || value === '');
    })
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`);

  return entries.length > 0 ? `?${entries.join('&')}` : '';
}

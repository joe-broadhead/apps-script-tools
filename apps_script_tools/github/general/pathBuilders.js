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

function astGitHubEncodePathSegment(value, fieldName = 'value', options = {}) {
  const normalized = astGitHubNormalizePathString(value, '');
  if (!normalized) {
    throw new AstGitHubValidationError(`Missing required GitHub request field '${fieldName}'`, {
      field: fieldName
    });
  }

  const allowSlash = astGitHubPathIsPlainObject(options) && options.allowSlash === true;

  if (/[\u0000-\u001F]/.test(normalized) || normalized.includes('\\') || normalized.includes('..')) {
    throw new AstGitHubValidationError(`GitHub request field '${fieldName}' contains disallowed path characters`, {
      field: fieldName,
      value: normalized
    });
  }

  if (!allowSlash && normalized.includes('/')) {
    throw new AstGitHubValidationError(`GitHub request field '${fieldName}' contains disallowed path characters`, {
      field: fieldName,
      value: normalized
    });
  }

  if (!allowSlash) {
    return encodeURIComponent(normalized);
  }

  if (normalized.startsWith('/') || normalized.endsWith('/') || normalized.includes('//')) {
    throw new AstGitHubValidationError(`GitHub request field '${fieldName}' contains invalid slash placement`, {
      field: fieldName,
      value: normalized
    });
  }

  const encodedSegments = normalized
    .split('/')
    .map(segment => {
      if (!segment || segment === '.' || segment === '..') {
        throw new AstGitHubValidationError(`GitHub request field '${fieldName}' contains invalid path segments`, {
          field: fieldName,
          value: normalized
        });
      }
      return encodeURIComponent(segment);
    });

  return encodedSegments.join('%2F');
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
  const tag = astGitHubEncodePathSegment(request.tag, 'tag', { allowSlash: true });
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

function astGitHubReadRequestField(request = {}, fieldNames = []) {
  const source = astGitHubPathIsPlainObject(request) ? request : {};
  const body = astGitHubPathIsPlainObject(source.body) ? source.body : {};
  const keys = Array.isArray(fieldNames) ? fieldNames : [];

  for (let idx = 0; idx < keys.length; idx += 1) {
    const key = keys[idx];
    if (!key) {
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] != null && source[key] !== '') {
      return source[key];
    }
    if (Object.prototype.hasOwnProperty.call(body, key) && body[key] != null && body[key] !== '') {
      return body[key];
    }
  }

  return null;
}

function astGitHubResolveWorkflowIdentifier(request = {}) {
  const workflowRaw = astGitHubReadRequestField(request, ['workflowId', 'workflow_id', 'workflow']);
  if (workflowRaw == null || workflowRaw === '') {
    throw new AstGitHubValidationError("Missing required GitHub request field 'workflowId'", {
      field: 'workflowId'
    });
  }

  return astGitHubEncodePathSegment(String(workflowRaw), 'workflowId', { allowSlash: true });
}

function astGitHubResolveNumericIdentifier(request = {}, fieldName = '', aliases = []) {
  const keys = [fieldName].concat(Array.isArray(aliases) ? aliases : []);
  const rawValue = astGitHubReadRequestField(request, keys);
  const resolvedField = astGitHubNormalizePathString(fieldName, 'id');

  if (rawValue == null || rawValue === '') {
    throw new AstGitHubValidationError(`Missing required GitHub request field '${resolvedField}'`, {
      field: resolvedField
    });
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new AstGitHubValidationError(`GitHub request field '${resolvedField}' must be an integer >= 1`, {
      field: resolvedField,
      value: rawValue
    });
  }

  return parsed;
}

function astGitHubBuildActionsWorkflowPath(request = {}, suffix = '') {
  const workflowId = astGitHubResolveWorkflowIdentifier(request);
  return astGitHubBuildRepoPath(request, `/actions/workflows/${workflowId}${suffix || ''}`);
}

function astGitHubBuildActionsRunPath(request = {}, suffix = '') {
  const runId = astGitHubResolveNumericIdentifier(request, 'runId', ['run_id']);
  return astGitHubBuildRepoPath(request, `/actions/runs/${runId}${suffix || ''}`);
}

function astGitHubBuildActionsArtifactPath(request = {}, suffix = '') {
  const artifactId = astGitHubResolveNumericIdentifier(request, 'artifactId', ['artifact_id']);
  return astGitHubBuildRepoPath(request, `/actions/artifacts/${artifactId}${suffix || ''}`);
}

function astGitHubResolveCommitRef(request = {}) {
  const refRaw = astGitHubReadRequestField(request, ['ref', 'sha']);
  if (refRaw == null || refRaw === '') {
    throw new AstGitHubValidationError("Missing required GitHub request field 'ref'", {
      field: 'ref'
    });
  }
  return astGitHubEncodePathSegment(String(refRaw), 'ref', { allowSlash: true });
}

function astGitHubBuildCommitPath(request = {}, suffix = '') {
  const ref = astGitHubResolveCommitRef(request);
  return astGitHubBuildRepoPath(request, `/commits/${ref}${suffix || ''}`);
}

function astGitHubBuildCheckRunPath(request = {}, suffix = '') {
  const checkRunId = astGitHubResolveNumericIdentifier(request, 'checkRunId', ['check_run_id']);
  return astGitHubBuildRepoPath(request, `/check-runs/${checkRunId}${suffix || ''}`);
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

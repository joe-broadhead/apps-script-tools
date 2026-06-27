const AST_GITHUB_GRAPHQL_OPERATION_CAPABILITY = Object.freeze({
  operation: 'graphql',
  group: 'graphql',
  method: 'GRAPHQL',
  supported: true,
  read: true,
  mutation: true,
  paginated: false,
  graphql: true,
  cacheable: true,
  dryRun: true
});

function astGitHubBuildOperationGroups() {
  const groups = {};
  astGitHubListOperations().forEach(operation => {
    const spec = astGitHubGetOperationSpec(operation);
    const group = spec && spec.group ? spec.group : 'other';
    if (!Array.isArray(groups[group])) {
      groups[group] = [];
    }
    groups[group].push(operation);
  });
  groups.graphql = ['graphql'];

  Object.keys(groups).forEach(group => {
    groups[group] = Object.freeze(groups[group].slice().sort());
  });

  return Object.freeze(groups);
}

function astGitHubGetCapabilities(operationOrGroup) {
  const supportedOperations = Array.from(new Set(astGitHubListOperations().concat(['graphql']))).sort();
  const operationGroups = astGitHubBuildOperationGroups();

  if (typeof operationOrGroup === 'undefined' || operationOrGroup === null || operationOrGroup === '') {
    return {
      operations: supportedOperations,
      groups: Object.keys(operationGroups).sort(),
      graphql: true,
      dryRun: true,
      cache: true,
      etag: true,
      auth: {
        pat: true,
        githubApp: true
      },
      webhooks: {
        verify: true,
        parse: true
      },
      projectsV2: true
    };
  }

  const key = astGitHubNormalizePathString(operationOrGroup, '').toLowerCase();
  if (key === 'graphql') {
    return Object.assign({}, AST_GITHUB_GRAPHQL_OPERATION_CAPABILITY, { cache: true });
  }

  if (Object.prototype.hasOwnProperty.call(operationGroups, key)) {
    return {
      group: key,
      operations: operationGroups[key].slice(),
      count: operationGroups[key].length
    };
  }

  const spec = astGitHubGetOperationSpec(key);
  if (!spec) {
    throw new AstGitHubValidationError('Unknown GitHub operation or capability group', {
      operationOrGroup: key
    });
  }

  return {
    operation: key,
    supported: true,
    method: String(spec.method || 'get').toUpperCase(),
    read: spec.read === true,
    mutation: spec.mutation === true,
    paginated: spec.paginated === true,
    group: spec.group || null,
    graphql: spec.graphql === true,
    cacheable: spec.read === true,
    dryRun: spec.mutation === true
  };
}

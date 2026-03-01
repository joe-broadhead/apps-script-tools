function astGitHubProjectsNormalizeString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function astGitHubProjectsReadBodyField(request = {}, key, fallback = null) {
  const body = request && typeof request.body === 'object' && request.body && !Array.isArray(request.body)
    ? request.body
    : {};
  if (Object.prototype.hasOwnProperty.call(body, key)) {
    return body[key];
  }
  return fallback;
}

function astGitHubProjectsResolveId(request = {}, key, aliases = []) {
  const aliasList = Array.isArray(aliases) ? aliases : [];
  const candidates = [key].concat(aliasList);
  for (let idx = 0; idx < candidates.length; idx += 1) {
    const candidate = candidates[idx];
    const value = request && Object.prototype.hasOwnProperty.call(request, candidate)
      ? request[candidate]
      : astGitHubProjectsReadBodyField(request, candidate, null);
    const normalized = astGitHubProjectsNormalizeString(value, '');
    if (normalized) {
      return normalized;
    }
  }
  throw new AstGitHubValidationError(`Missing required GitHub request field '${key}'`, {
    field: key
  });
}

function astGitHubProjectsNormalizePageSize(request = {}, fallback = 20) {
  const options = request && typeof request.options === 'object' && request.options && !Array.isArray(request.options)
    ? request.options
    : {};
  const body = request && typeof request.body === 'object' && request.body && !Array.isArray(request.body)
    ? request.body
    : {};
  const candidate = options.perPage != null ? options.perPage : body.first;
  if (candidate == null || candidate === '') {
    return fallback;
  }
  const parsed = Number(candidate);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new AstGitHubValidationError('GitHub Projects v2 page size must be an integer >= 1', {
      field: 'options.perPage'
    });
  }
  return Math.min(parsed, 100);
}

function astGitHubProjectsNormalizeCursor(request = {}) {
  const options = request && typeof request.options === 'object' && request.options && !Array.isArray(request.options)
    ? request.options
    : {};
  const body = request && typeof request.body === 'object' && request.body && !Array.isArray(request.body)
    ? request.body
    : {};
  const candidate = options.pageToken != null ? options.pageToken : body.after;
  return astGitHubProjectsNormalizeString(candidate, '') || null;
}

function astGitHubProjectsResolveOwner(request = {}) {
  const requestOwner = astGitHubProjectsNormalizeString(
    request.owner != null ? request.owner : astGitHubProjectsReadBodyField(request, 'owner', ''),
    ''
  );
  if (requestOwner) {
    return requestOwner;
  }

  const config = astGitHubResolveConfig(request);
  const configOwner = astGitHubProjectsNormalizeString(config && config.owner, '');
  if (configOwner) {
    return configOwner;
  }

  throw new AstGitHubValidationError("Missing required GitHub request field 'owner'", {
    field: 'owner'
  });
}

function astGitHubProjectsExtractGraphqlData(response, operation) {
  if (!response || typeof response !== 'object') {
    throw new AstGitHubParseError('GitHub Projects v2 response is not an object', {
      operation
    });
  }
  const envelope = response.data;
  if (!envelope || typeof envelope !== 'object') {
    throw new AstGitHubParseError('GitHub GraphQL envelope missing from response', {
      operation
    });
  }
  const data = envelope.data;
  if (!data || typeof data !== 'object') {
    throw new AstGitHubParseError('GitHub GraphQL data payload missing from response', {
      operation
    });
  }
  return data;
}

function astGitHubProjectsBuildOwnerQuery() {
  return `
query ListProjectsV2($owner: String!, $first: Int!, $after: String) {
  organization(login: $owner) {
    __typename
    login
    projectsV2(first: $first, after: $after, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes {
        id
        number
        title
        shortDescription
        closed
        url
        updatedAt
      }
      pageInfo { hasNextPage endCursor }
      totalCount
    }
  }
  user(login: $owner) {
    __typename
    login
    projectsV2(first: $first, after: $after, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes {
        id
        number
        title
        shortDescription
        closed
        url
        updatedAt
      }
      pageInfo { hasNextPage endCursor }
      totalCount
    }
  }
}`.trim();
}

function astGitHubProjectsBuildItemsQuery() {
  return `
query ListProjectV2Items($projectId: ID!, $first: Int!, $after: String) {
  node(id: $projectId) {
    __typename
    ... on ProjectV2 {
      id
      number
      title
      shortDescription
      closed
      url
      items(first: $first, after: $after) {
        nodes {
          id
          type
          isArchived
          updatedAt
          content {
            __typename
            ... on Issue {
              id
              number
              title
              url
              state
            }
            ... on PullRequest {
              id
              number
              title
              url
              state
            }
            ... on DraftIssue {
              id
              title
            }
          }
          fieldValues(first: 50) {
            nodes {
              __typename
              ... on ProjectV2ItemFieldTextValue {
                text
                field { ... on ProjectV2FieldCommon { id name } }
              }
              ... on ProjectV2ItemFieldNumberValue {
                number
                field { ... on ProjectV2FieldCommon { id name } }
              }
              ... on ProjectV2ItemFieldDateValue {
                date
                field { ... on ProjectV2FieldCommon { id name } }
              }
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
                optionId
                field { ... on ProjectV2FieldCommon { id name } }
              }
              ... on ProjectV2ItemFieldIterationValue {
                title
                iterationId
                startDate
                duration
                field { ... on ProjectV2FieldCommon { id name } }
              }
            }
          }
        }
        pageInfo { hasNextPage endCursor }
        totalCount
      }
    }
  }
}`.trim();
}

function astGitHubProjectsBuildUpdateMutation() {
  return `
mutation UpdateProjectV2FieldValue(
  $projectId: ID!,
  $itemId: ID!,
  $fieldId: ID!,
  $value: ProjectV2FieldValue!,
  $clientMutationId: String
) {
  updateProjectV2ItemFieldValue(
    input: {
      projectId: $projectId,
      itemId: $itemId,
      fieldId: $fieldId,
      value: $value,
      clientMutationId: $clientMutationId
    }
  ) {
    projectV2Item {
      id
      type
      isArchived
      updatedAt
    }
  }
}`.trim();
}

function astGitHubProjectsNormalizeListProjectsResponse(response, owner) {
  const data = astGitHubProjectsExtractGraphqlData(response, 'listProjectsV2');
  const org = data.organization || null;
  const user = data.user || null;
  const ownerNode = org && org.projectsV2 ? org : (user && user.projectsV2 ? user : null);
  if (!ownerNode) {
    throw new AstGitHubParseError('GitHub Projects v2 owner node missing projectsV2 connection', {
      operation: 'listProjectsV2',
      owner
    });
  }

  const projects = ownerNode.projectsV2 || {};
  const nodes = Array.isArray(projects.nodes) ? projects.nodes : [];
  const pageInfo = projects.pageInfo && typeof projects.pageInfo === 'object'
    ? projects.pageInfo
    : { hasNextPage: false, endCursor: null };

  return Object.assign({}, response, {
    operation: 'list_projects_v2',
    data: {
      owner: {
        login: ownerNode.login || owner,
        type: ownerNode.__typename || null
      },
      items: nodes,
      totalCount: Number(projects.totalCount || 0),
      pageInfo: {
        hasNextPage: pageInfo.hasNextPage === true,
        endCursor: pageInfo.endCursor || null
      }
    },
    page: {
      page: response && response.page ? response.page.page : 1,
      perPage: response && response.page ? response.page.perPage : nodes.length,
      nextPage: null,
      hasMore: pageInfo.hasNextPage === true
    }
  });
}

function astGitHubProjectsNormalizeListItemsResponse(response, projectId) {
  const data = astGitHubProjectsExtractGraphqlData(response, 'listProjectV2Items');
  const node = data.node || null;
  if (!node || node.__typename !== 'ProjectV2' || !node.items) {
    throw new AstGitHubParseError('GitHub Projects v2 response missing ProjectV2 node/items', {
      operation: 'listProjectV2Items',
      projectId
    });
  }

  const itemsConnection = node.items || {};
  const nodes = Array.isArray(itemsConnection.nodes) ? itemsConnection.nodes : [];
  const pageInfo = itemsConnection.pageInfo && typeof itemsConnection.pageInfo === 'object'
    ? itemsConnection.pageInfo
    : { hasNextPage: false, endCursor: null };

  return Object.assign({}, response, {
    operation: 'list_project_v2_items',
    data: {
      project: {
        id: node.id,
        number: node.number,
        title: node.title,
        shortDescription: node.shortDescription || '',
        closed: node.closed === true,
        url: node.url || null
      },
      items: nodes,
      totalCount: Number(itemsConnection.totalCount || 0),
      pageInfo: {
        hasNextPage: pageInfo.hasNextPage === true,
        endCursor: pageInfo.endCursor || null
      }
    },
    page: {
      page: response && response.page ? response.page.page : 1,
      perPage: response && response.page ? response.page.perPage : nodes.length,
      nextPage: null,
      hasMore: pageInfo.hasNextPage === true
    }
  });
}

function astGitHubProjectsNormalizeValueInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AstGitHubValidationError("GitHub request field 'value' must be an object", {
      field: 'value'
    });
  }
  const allowedKeys = ['text', 'number', 'date', 'singleSelectOptionId', 'iterationId'];
  const keys = Object.keys(value).filter(key => allowedKeys.includes(key) && value[key] != null && value[key] !== '');
  if (keys.length !== 1) {
    throw new AstGitHubValidationError("GitHub request field 'value' must include exactly one of: text, number, date, singleSelectOptionId, iterationId", {
      field: 'value'
    });
  }
  const key = keys[0];
  const out = {};
  out[key] = value[key];
  return out;
}

function astGitHubProjectsNormalizeUpdateResponse(response, projectId, itemId, fieldId) {
  const data = astGitHubProjectsExtractGraphqlData(response, 'updateProjectV2FieldValue');
  const payload = data.updateProjectV2ItemFieldValue || null;
  const item = payload && payload.projectV2Item ? payload.projectV2Item : null;
  if (!item || !item.id) {
    throw new AstGitHubParseError('GitHub Projects v2 mutation response missing projectV2Item', {
      operation: 'updateProjectV2FieldValue',
      projectId,
      itemId,
      fieldId
    });
  }

  return Object.assign({}, response, {
    operation: 'update_project_v2_field_value',
    data: {
      projectId,
      itemId,
      fieldId,
      item
    }
  });
}

function astGitHubListProjectsV2Helper(request = {}) {
  const owner = astGitHubProjectsResolveOwner(request);

  const response = astGitHubGraphql({
    query: astGitHubProjectsBuildOwnerQuery(),
    variables: {
      owner,
      first: astGitHubProjectsNormalizePageSize(request, 20),
      after: astGitHubProjectsNormalizeCursor(request)
    },
    options: request.options || {},
    auth: request.auth || {},
    providerOptions: request.providerOptions || {}
  });

  return astGitHubProjectsNormalizeListProjectsResponse(response, owner);
}

function astGitHubListProjectV2ItemsHelper(request = {}) {
  const projectId = astGitHubProjectsResolveId(request, 'projectId', ['project_id']);

  const response = astGitHubGraphql({
    query: astGitHubProjectsBuildItemsQuery(),
    variables: {
      projectId,
      first: astGitHubProjectsNormalizePageSize(request, 20),
      after: astGitHubProjectsNormalizeCursor(request)
    },
    options: request.options || {},
    auth: request.auth || {},
    providerOptions: request.providerOptions || {}
  });

  return astGitHubProjectsNormalizeListItemsResponse(response, projectId);
}

function astGitHubUpdateProjectV2FieldValueHelper(request = {}) {
  const projectId = astGitHubProjectsResolveId(request, 'projectId', ['project_id']);
  const itemId = astGitHubProjectsResolveId(request, 'itemId', ['item_id']);
  const fieldId = astGitHubProjectsResolveId(request, 'fieldId', ['field_id']);
  const valueInput = astGitHubProjectsReadBodyField(request, 'value', null);
  const value = astGitHubProjectsNormalizeValueInput(valueInput);
  const clientMutationId = astGitHubProjectsNormalizeString(astGitHubProjectsReadBodyField(request, 'clientMutationId', ''), '') || null;

  const response = astGitHubGraphql({
    query: astGitHubProjectsBuildUpdateMutation(),
    variables: {
      projectId,
      itemId,
      fieldId,
      value,
      clientMutationId
    },
    options: request.options || {},
    auth: request.auth || {},
    providerOptions: request.providerOptions || {}
  });

  if (response && response.dryRun && response.dryRun.enabled === true) {
    return Object.assign({}, response, {
      operation: 'update_project_v2_field_value',
      data: null
    });
  }

  return astGitHubProjectsNormalizeUpdateResponse(response, projectId, itemId, fieldId);
}

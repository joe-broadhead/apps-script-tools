function astGitHubBuildDryRunPlan({ request, config, operationSpec, method, path, queryParams, body, graphqlPayload }) {
  const plan = {
    enabled: true,
    operation: request.operation,
    mutation: operationSpec && operationSpec.mutation === true,
    source: {
      baseUrl: config.baseUrl,
      method: String(method || operationSpec.method || 'get').toUpperCase(),
      path,
      query: queryParams || {}
    }
  };

  if (graphqlPayload) {
    plan.source.graphqlUrl = config.graphqlUrl;
    plan.graphql = {
      operationName: request.operationName || null,
      variables: request.variables || {},
      query: request.query
    };
    return plan;
  }

  if (body && Object.keys(body).length > 0) {
    plan.body = body;
  }

  return plan;
}

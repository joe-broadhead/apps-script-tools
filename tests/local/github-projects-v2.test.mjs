import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadGitHubScripts } from './github-helpers.mjs';

function createResponse(statusCode, body, headers = {}) {
  const bodyText = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    getResponseCode: () => statusCode,
    getContentText: () => bodyText,
    getAllHeaders: () => headers
  };
}

function parsePayload(options = {}) {
  if (!options || typeof options.payload !== 'string') {
    return null;
  }
  return JSON.parse(options.payload);
}

test('listProjectsV2 sends GraphQL owner query and normalizes response', () => {
  const calls = [];
  const context = createGasContext({
    UrlFetchApp: {
      fetch: (_url, options) => {
        calls.push(options);
        return createResponse(200, {
          data: {
            organization: {
              __typename: 'Organization',
              login: 'octo-org',
              projectsV2: {
                nodes: [{ id: 'P_1', number: 1, title: 'Roadmap' }],
                pageInfo: { hasNextPage: false, endCursor: null },
                totalCount: 1
              }
            },
            user: null
          }
        });
      }
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({ GITHUB_TOKEN: 'token' });

  const response = context.AST.GitHub.listProjectsV2({
    owner: 'octo-org',
    options: { perPage: 10 }
  });

  assert.equal(calls.length, 1);
  const payload = parsePayload(calls[0]);
  assert.match(payload.query, /projectsV2/);
  assert.equal(payload.variables.owner, 'octo-org');
  assert.equal(payload.variables.first, 10);
  assert.equal(response.operation, 'list_projects_v2');
  assert.equal(response.data.owner.type, 'Organization');
  assert.equal(response.data.items.length, 1);
});

test('listProjectsV2 falls back to configured default owner', () => {
  const calls = [];
  const context = createGasContext({
    UrlFetchApp: {
      fetch: (_url, options) => {
        calls.push(options);
        return createResponse(200, {
          data: {
            organization: {
              __typename: 'Organization',
              login: 'configured-owner',
              projectsV2: {
                nodes: [],
                pageInfo: { hasNextPage: false, endCursor: null },
                totalCount: 0
              }
            },
            user: null
          }
        });
      }
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({
    GITHUB_TOKEN: 'token',
    GITHUB_OWNER: 'configured-owner'
  });

  const response = context.AST.GitHub.listProjectsV2({});

  assert.equal(calls.length, 1);
  const payload = parsePayload(calls[0]);
  assert.equal(payload.variables.owner, 'configured-owner');
  assert.equal(response.data.owner.login, 'configured-owner');
});

test('listProjectV2Items sends project node query and normalizes response', () => {
  const calls = [];
  const context = createGasContext({
    UrlFetchApp: {
      fetch: (_url, options) => {
        calls.push(options);
        return createResponse(200, {
          data: {
            node: {
              __typename: 'ProjectV2',
              id: 'PVT_1',
              number: 4,
              title: 'Program',
              shortDescription: 'tracking',
              closed: false,
              url: 'https://github.com/orgs/acme/projects/4',
              items: {
                nodes: [{ id: 'PVTI_1', type: 'ISSUE' }],
                pageInfo: { hasNextPage: true, endCursor: 'CUR_1' },
                totalCount: 12
              }
            }
          }
        });
      }
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({ GITHUB_TOKEN: 'token' });

  const response = context.AST.GitHub.listProjectV2Items({
    projectId: 'PVT_1',
    options: { perPage: 25 }
  });

  assert.equal(calls.length, 1);
  const payload = parsePayload(calls[0]);
  assert.match(payload.query, /node\(id: \$projectId\)/);
  assert.equal(payload.variables.projectId, 'PVT_1');
  assert.equal(payload.variables.first, 25);
  assert.equal(response.operation, 'list_project_v2_items');
  assert.equal(response.data.project.id, 'PVT_1');
  assert.equal(response.data.items.length, 1);
  assert.equal(response.page.hasMore, true);
});

test('updateProjectV2FieldValue validates value object shape', () => {
  const context = createGasContext();
  loadGitHubScripts(context, { includeAst: true });

  assert.throws(
    () => context.AST.GitHub.updateProjectV2FieldValue({
      projectId: 'P_1',
      itemId: 'I_1',
      fieldId: 'F_1',
      body: { value: {} }
    }),
    /exactly one/
  );

  assert.throws(
    () => context.AST.GitHub.updateProjectV2FieldValue({
      projectId: 'P_1',
      itemId: 'I_1',
      fieldId: 'F_1',
      body: { value: { text: 'x', date: '2026-03-01' } }
    }),
    /exactly one/
  );
});

test('updateProjectV2FieldValue supports dryRun without network call', () => {
  let fetchCalls = 0;
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => {
        fetchCalls += 1;
        throw new Error('should not fetch in dryRun');
      }
    }
  });

  loadGitHubScripts(context, { includeAst: true });
  context.AST.GitHub.configure({ GITHUB_TOKEN: 'token' });

  const response = context.AST.GitHub.updateProjectV2FieldValue({
    projectId: 'PVT_1',
    itemId: 'PVTI_1',
    fieldId: 'PVTF_1',
    body: {
      value: { text: 'Ready' }
    },
    options: {
      dryRun: true
    }
  });

  assert.equal(fetchCalls, 0);
  assert.equal(response.operation, 'update_project_v2_field_value');
  assert.equal(response.dryRun.enabled, true);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadGitHubScripts } from './github-helpers.mjs';

test('validate request rejects unsupported operations', () => {
  const context = createGasContext();
  loadGitHubScripts(context);

  assert.throws(
    () => context.astGitHubValidateRequest({ operation: 'not_real' }),
    /Unsupported GitHub operation/
  );
});

test('validate request rejects invalid pagination fields', () => {
  const context = createGasContext();
  loadGitHubScripts(context);

  assert.throws(
    () => context.astGitHubValidateRequest({
      operation: 'list_issues',
      owner: 'octocat',
      repo: 'hello-world',
      options: { perPage: 0 }
    }),
    /options.perPage/
  );
});

test('validate request rejects traversal-like owner/repo/path fields', () => {
  const context = createGasContext();
  loadGitHubScripts(context);

  assert.throws(
    () => context.astGitHubValidateRequest({
      operation: 'get_repository',
      owner: '../owner',
      repo: 'repo'
    }),
    /contains disallowed path characters/
  );

  assert.throws(
    () => context.astGitHubValidateRequest({
      operation: 'get_repository',
      owner: 'octocat',
      repo: 'repo/name'
    }),
    /contains disallowed path characters/
  );

  assert.throws(
    () => context.astGitHubValidateRequest({
      operation: 'get_file_contents',
      owner: 'octocat',
      repo: 'hello-world',
      path: 'src/../secrets.env'
    }),
    /must not include/
  );
});

test('validate request enforces graphql query', () => {
  const context = createGasContext();
  loadGitHubScripts(context);

  assert.throws(
    () => context.astGitHubValidateGraphqlRequest({}),
    /Missing required GitHub request field 'query'/
  );
});

test('validate request enforces payload/signature for verify_webhook', () => {
  const context = createGasContext();
  loadGitHubScripts(context);

  assert.throws(
    () => context.astGitHubValidateRequest({
      operation: 'verify_webhook',
      payload: '{"action":"opened"}',
      headers: {}
    }),
    /x-hub-signature-256/
  );
});

test('validate request allows parse_webhook without token fields', () => {
  const context = createGasContext();
  loadGitHubScripts(context);

  const normalized = context.astGitHubValidateRequest({
    operation: 'parse_webhook',
    payload: '{"action":"opened"}',
    headers: {
      'x-github-event': 'issues'
    }
  });

  assert.equal(normalized.operation, 'parse_webhook');
});

test('validate request accepts workflowId and run/artifact numeric identifiers', () => {
  const context = createGasContext();
  loadGitHubScripts(context);

  const normalized = context.astGitHubValidateRequest({
    operation: 'list_workflow_runs',
    owner: 'octocat',
    repo: 'hello-world',
    workflowId: '.github/workflows/ci.yml',
    runId: 123,
    artifactId: 456
  });

  assert.equal(normalized.workflowId, '.github/workflows/ci.yml');
  assert.equal(normalized.runId, 123);
  assert.equal(normalized.artifactId, 456);
});

test('validate request rejects traversal-like workflowId values', () => {
  const context = createGasContext();
  loadGitHubScripts(context);

  assert.throws(
    () => context.astGitHubValidateRequest({
      operation: 'get_workflow',
      owner: 'octocat',
      repo: 'hello-world',
      workflowId: '../workflows/ci.yml'
    }),
    /workflowId/
  );
});

test('resolve config throws auth error when token is missing', () => {
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({})
      })
    }
  });
  loadGitHubScripts(context);

  const normalized = context.astGitHubValidateRequest({ operation: 'get_me' });
  assert.throws(
    () => context.astGitHubResolveConfig(normalized),
    /Missing required GitHub configuration field 'token'/
  );
});

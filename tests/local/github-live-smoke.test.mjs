import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext, loadScripts } from './helpers.mjs';

const LIVE_SMOKE_SCRIPT = 'apps_script_tools/testing/github/githubLiveSmoke.js';

function createContextForLiveSmoke(overrides = {}) {
  const context = createGasContext({
    AST: {
      GitHub: {
        getMe: () => ({ data: { login: 'tester' }, rateLimit: { remaining: 4999 } }),
        getRepository: () => ({ data: { full_name: 'octocat/hello-world', id: 1 } })
      }
    },
    ...overrides
  });
  loadScripts(context, [LIVE_SMOKE_SCRIPT]);
  return context;
}

test('runGitHubLiveSmoke (legacy token-first) uses explicit token with single argument', () => {
  const calls = { getMe: [] };
  const context = createContextForLiveSmoke({
    AST: {
      GitHub: {
        getMe: request => {
          calls.getMe.push(request);
          return { data: { login: 'tester' }, rateLimit: {} };
        },
        getRepository: () => ({ data: { full_name: 'octocat/hello-world', id: 1 } })
      }
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: () => ''
      })
    }
  });

  const response = context.runGitHubLiveSmoke('ghp_legacyTokenValue1234567890');
  assert.equal(response.status, 'ok');
  assert.equal(calls.getMe.length, 1);
  assert.equal(calls.getMe[0].auth.token, 'ghp_legacyTokenValue1234567890');
});

test('runGitHubLiveSmoke (legacy token-first) keeps token when owner is provided without repo', () => {
  const calls = { getMe: [], getRepository: 0 };
  const context = createContextForLiveSmoke({
    AST: {
      GitHub: {
        getMe: request => {
          calls.getMe.push(request);
          return { data: { login: 'tester' }, rateLimit: {} };
        },
        getRepository: () => {
          calls.getRepository += 1;
          return { data: { full_name: 'octocat/hello-world', id: 1 } };
        }
      }
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: () => ''
      })
    }
  });

  context.runGitHubLiveSmoke('ghp_legacyTokenValue1234567890', 'octocat');
  assert.equal(calls.getMe.length, 1);
  assert.equal(calls.getMe[0].auth.token, 'ghp_legacyTokenValue1234567890');
  assert.equal(calls.getRepository, 0);
});

test('runGitHubLiveSmokeForRepo uses script property token and repository target', () => {
  const calls = { getMe: [], getRepository: [] };
  const context = createContextForLiveSmoke({
    AST: {
      GitHub: {
        getMe: request => {
          calls.getMe.push(request);
          return { data: { login: 'tester' }, rateLimit: {} };
        },
        getRepository: request => {
          calls.getRepository.push(request);
          return { data: { full_name: 'octocat/hello-world', id: 1 } };
        }
      }
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: key => (key === 'GITHUB_TOKEN' ? 'ghp_scriptTokenValue1234567890' : '')
      })
    }
  });

  context.runGitHubLiveSmokeForRepo('octocat', 'hello-world');
  assert.equal(calls.getMe.length, 1);
  assert.equal(calls.getMe[0].auth.token, 'ghp_scriptTokenValue1234567890');
  assert.equal(calls.getRepository.length, 1);
  assert.equal(calls.getRepository[0].owner, 'octocat');
  assert.equal(calls.getRepository[0].repo, 'hello-world');
  assert.equal(calls.getRepository[0].auth.token, 'ghp_scriptTokenValue1234567890');
});

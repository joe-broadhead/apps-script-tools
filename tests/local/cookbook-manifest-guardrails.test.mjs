import assert from 'node:assert/strict';
import test from 'node:test';

import { validateCookbookManifest } from '../../scripts/check-cookbooks.mjs';

function createValidManifest(overrides = {}) {
  return {
    timeZone: 'Etc/UTC',
    dependencies: {
      libraries: [
        {
          userSymbol: 'ASTLib',
          libraryId: '1gZ_6DiLeDhh-a4qcezluTFDshw4OEhTXbeD3wthl_UdHEAFkXf6i6Ho_',
          version: '<PUBLISHED_AST_LIBRARY_VERSION>'
        }
      ]
    },
    exceptionLogging: 'STACKDRIVER',
    runtimeVersion: 'V8',
    ...overrides
  };
}

test('validateCookbookManifest accepts the committed cookbook manifest shape', () => {
  const findings = validateCookbookManifest(
    'unit',
    createValidManifest({
      oauthScopes: [
        'https://www.googleapis.com/auth/script.external_request',
        'https://www.googleapis.com/auth/drive.readonly'
      ]
    }),
    'cookbooks/unit/src/appsscript.json'
  );

  assert.deepEqual(findings, []);
});

test('validateCookbookManifest rejects public execution and deployer webapp access', () => {
  const findings = validateCookbookManifest(
    'unit',
    createValidManifest({
      executionApi: { access: 'ANYONE' },
      webapp: {
        access: 'ANYONE_ANONYMOUS',
        executeAs: 'USER_DEPLOYING'
      }
    }),
    'cookbooks/unit/src/appsscript.json'
  );

  assert.match(findings.join('\n'), /executionApi\.access=ANYONE/);
  assert.match(findings.join('\n'), /webapp\.access=ANYONE_ANONYMOUS/);
  assert.match(findings.join('\n'), /webapp\.executeAs=USER_DEPLOYING/);
});

test('validateCookbookManifest rejects stale AST library bindings and unexpected scopes', () => {
  const findings = validateCookbookManifest(
    'unit',
    createValidManifest({
      dependencies: {
        libraries: [
          {
            userSymbol: 'LegacyAST',
            libraryId: 'stale-library-id',
            version: '42'
          }
        ]
      },
      oauthScopes: [
        'https://www.googleapis.com/auth/script.external_request',
        'https://www.googleapis.com/auth/script.external_request',
        'https://www.googleapis.com/auth/admin.directory.user'
      ]
    }),
    'cookbooks/unit/src/appsscript.json'
  );

  assert.match(findings.join('\n'), /userSymbol/);
  assert.match(findings.join('\n'), /libraryId/);
  assert.match(findings.join('\n'), /library version/);
  assert.match(findings.join('\n'), /duplicates 1 OAuth scope/);
  assert.match(findings.join('\n'), /unexpected OAuth scope/);
  assert.equal(findings.join('\n').includes('admin.directory.user'), false);
});

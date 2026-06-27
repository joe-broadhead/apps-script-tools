import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractTrackedClaspPaths,
  findForbiddenProductionPaths,
  validateProductionTrackedPaths
} from '../../scripts/check-clasp-production-push.mjs';

test('extractTrackedClaspPaths parses only the tracked clasp status section', () => {
  const tracked = extractTrackedClaspPaths(`
Tracked files:
└─ apps_script_tools/AST.js
└─ apps_script_tools/testing/runTests.js
Untracked files:
└─ apps_script_tools/.opencowork/
`);

  assert.deepEqual(tracked, [
    'apps_script_tools/AST.js',
    'apps_script_tools/testing/runTests.js'
  ]);
});

test('extractTrackedClaspPaths parses pinned clasp 2.4 not-ignored section', () => {
  const tracked = extractTrackedClaspPaths(`
(node:1) [DEP0040] DeprecationWarning: ignored for parsing
Not ignored files:
└─ apps_script_tools/AST.js
└─ apps_script_tools/testing/github/githubLiveSmoke.js

Ignored files:
└─ apps_script_tools/testing/runTests.js
`);

  assert.deepEqual(tracked, [
    'apps_script_tools/AST.js',
    'apps_script_tools/testing/github/githubLiveSmoke.js'
  ]);
});

test('findForbiddenProductionPaths flags test harnesses and local-only metadata', () => {
  const findings = findForbiddenProductionPaths([
    'apps_script_tools/AST.js',
    'apps_script_tools/testing/runTests.js',
    'apps_script_tools/.opencowork/state.json'
  ]);

  assert.equal(findings.length, 3);
  assert.equal(findings.some(finding => finding.label === 'Apps Script test harness'), true);
  assert.equal(findings.some(finding => finding.label === 'test-only Apps Script entrypoint'), true);
  assert.equal(findings.some(finding => finding.label === 'local cowork metadata'), true);
});

test('findForbiddenProductionPaths flags rootDir-relative forbidden paths', () => {
  const findings = findForbiddenProductionPaths([
    'AST.js',
    'testing/TestAssertions.js',
    '.opencowork/state.json'
  ]);

  assert.equal(findings.length, 2);
  assert.equal(findings.some(finding => finding.filePath === 'testing/TestAssertions.js'), true);
  assert.equal(findings.some(finding => finding.filePath === '.opencowork/state.json'), true);
  assert.equal(findings.some(finding => finding.label === 'Apps Script test harness'), true);
  assert.equal(findings.some(finding => finding.label === 'local cowork metadata'), true);
});

test('validateProductionTrackedPaths accepts library-only clasp status output', () => {
  const findings = validateProductionTrackedPaths(`
Tracked files:
└─ apps_script_tools/AST.js
└─ apps_script_tools/dataFrame/DataFrame.js
Untracked files:
└─ README.md
`);

  assert.deepEqual(findings, []);
});

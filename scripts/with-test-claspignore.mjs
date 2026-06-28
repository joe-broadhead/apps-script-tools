import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const PRODUCTION_IGNORE = path.join(ROOT, '.claspignore');
const TEST_IGNORE = path.join(ROOT, '.claspignore.test');
const CLASP_CONFIG = path.join(ROOT, '.clasp.json');

function usage() {
  process.stderr.write('Usage: node scripts/with-test-claspignore.mjs -- <command> [args...]\n');
}

export function validateTestScriptBinding({
  activeScriptId,
  expectedTestScriptId,
  productionScriptId
}) {
  const active = String(activeScriptId || '').trim();
  const expected = String(expectedTestScriptId || '').trim();
  const production = String(productionScriptId || '').trim();

  if (!expected) {
    return 'GAS_TEST_SCRIPT_ID must be set before running a test-mode clasp push.';
  }
  if (!production) {
    return 'GAS_PRODUCTION_SCRIPT_ID or GAS_SCRIPT_ID must be set before running a test-mode clasp push.';
  }
  if (!active) {
    return '.clasp.json must define scriptId before running a test-mode clasp push.';
  }
  if (active !== expected) {
    return `.clasp.json scriptId (${active}) must match GAS_TEST_SCRIPT_ID before running a test-mode clasp push.`;
  }
  if (production && active === production) {
    return 'GAS_TEST_SCRIPT_ID must not match GAS_SCRIPT_ID; test-mode pushes require a separate Apps Script project.';
  }

  return null;
}

export function buildTestClaspArgs(command, args = [], ignoreFile = TEST_IGNORE) {
  const commandName = path.basename(String(command || ''))
    .replace(/\.(cmd|exe)$/i, '')
    .toLowerCase();
  const normalizedArgs = Array.isArray(args) ? args.slice() : [];

  if (commandName !== 'clasp') {
    return normalizedArgs;
  }

  return ['--ignore', ignoreFile, ...normalizedArgs];
}

function readActiveScriptId() {
  if (!fs.existsSync(CLASP_CONFIG)) {
    return '';
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(CLASP_CONFIG, 'utf8'));
    return parsed.scriptId;
  } catch (error) {
    process.stderr.write(`Unable to parse .clasp.json: ${error.message}\n`);
    process.exit(1);
  }
}

function main() {
  const separator = process.argv.indexOf('--');
  if (separator === -1 || separator === process.argv.length - 1) {
    usage();
    process.exit(2);
  }

  if (!fs.existsSync(PRODUCTION_IGNORE)) {
    process.stderr.write('Missing .claspignore production ignore file.\n');
    process.exit(1);
  }

  if (!fs.existsSync(TEST_IGNORE)) {
    process.stderr.write('Missing .claspignore.test test deployment ignore file.\n');
    process.exit(1);
  }

  const bindingError = validateTestScriptBinding({
    activeScriptId: readActiveScriptId(),
    expectedTestScriptId: process.env.GAS_TEST_SCRIPT_ID,
    productionScriptId: process.env.GAS_PRODUCTION_SCRIPT_ID || process.env.GAS_SCRIPT_ID
  });
  if (bindingError) {
    process.stderr.write(`${bindingError}\n`);
    process.exit(1);
  }

  const command = process.argv[separator + 1];
  const args = process.argv.slice(separator + 2);
  const result = spawnSync(command, buildTestClaspArgs(command, args), {
    cwd: ROOT,
    env: {
      ...process.env,
      clasp_config_ignore: TEST_IGNORE
    },
    stdio: 'inherit'
  });

  if (result.signal) {
    process.kill(process.pid, result.signal);
    return;
  }

  process.exit(result.status === null ? 1 : result.status);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

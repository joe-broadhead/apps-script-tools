import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const COVERAGE_DIR = path.join(ROOT, 'coverage');
const COVERAGE_LOG_PATH = path.join(COVERAGE_DIR, 'local-coverage.txt');
const COVERAGE_SUMMARY_JSON_PATH = path.join(COVERAGE_DIR, 'local-coverage-summary.json');
const COVERAGE_SUMMARY_MD_PATH = path.join(COVERAGE_DIR, 'local-coverage-summary.md');

function toNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }
  return fallback;
}

function ensureCoverageDir() {
  fs.mkdirSync(COVERAGE_DIR, { recursive: true });
}

function listLocalTestFiles() {
  const testsDir = path.join(ROOT, 'tests', 'local');
  return fs.readdirSync(testsDir)
    .filter(name => name.endsWith('.test.mjs'))
    .sort()
    .map(name => path.posix.join('tests', 'local', name));
}

function parseCoveragePercent(value) {
  const match = String(value || '').match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function parseCoverageMetrics(output) {
  const lines = String(output || '').split(/\r?\n/);
  const coverageLine = lines.find(line => /\ball files\b/i.test(line) && line.includes('|'));
  if (!coverageLine) {
    return null;
  }

  const parts = coverageLine.split('|').map(part => part.trim());
  if (parts.length < 4) {
    return null;
  }

  const linesPct = parseCoveragePercent(parts[1]);
  const branchesPct = parseCoveragePercent(parts[2]);
  const functionsPct = parseCoveragePercent(parts[3]);
  const filesPct = parts.length > 4
    ? parseCoveragePercent(parts[4])
    : null;

  if (
    linesPct == null
    || branchesPct == null
    || functionsPct == null
  ) {
    return null;
  }

  return {
    linesPct,
    branchesPct,
    functionsPct,
    filesPct: filesPct == null ? linesPct : filesPct
  };
}

function evaluateThresholds(metrics, thresholds) {
  const failures = [];
  if (!metrics) {
    failures.push('Coverage summary row ("all files") was not found in test output.');
    return failures;
  }

  if (metrics.linesPct < thresholds.linesPct) {
    failures.push(`linesPct ${metrics.linesPct}% < threshold ${thresholds.linesPct}%`);
  }
  if (metrics.branchesPct < thresholds.branchesPct) {
    failures.push(`branchesPct ${metrics.branchesPct}% < threshold ${thresholds.branchesPct}%`);
  }
  if (metrics.functionsPct < thresholds.functionsPct) {
    failures.push(`functionsPct ${metrics.functionsPct}% < threshold ${thresholds.functionsPct}%`);
  }
  if (metrics.filesPct < thresholds.filesPct) {
    failures.push(`filesPct ${metrics.filesPct}% < threshold ${thresholds.filesPct}%`);
  }

  return failures;
}

function writeCoverageArtifacts(payload, combinedOutput) {
  ensureCoverageDir();
  fs.writeFileSync(COVERAGE_LOG_PATH, `${combinedOutput}\n`, 'utf8');
  fs.writeFileSync(COVERAGE_SUMMARY_JSON_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  const lines = [
    '## Local Test Coverage',
    '',
    `- Coverage summary found: ${payload.coverageFound ? 'yes' : 'no'}`,
    `- Threshold mode: ${payload.enforceThresholds ? 'enforced' : 'warn-only'}`,
    `- Test exit code: ${payload.testExitCode}`,
    '',
    '| Metric | Coverage | Threshold |',
    '| --- | ---: | ---: |',
    `| Lines | ${payload.metrics ? `${payload.metrics.linesPct}%` : 'n/a'} | ${payload.thresholds.linesPct}% |`,
    `| Branches | ${payload.metrics ? `${payload.metrics.branchesPct}%` : 'n/a'} | ${payload.thresholds.branchesPct}% |`,
    `| Functions | ${payload.metrics ? `${payload.metrics.functionsPct}%` : 'n/a'} | ${payload.thresholds.functionsPct}% |`,
    `| Files | ${payload.metrics ? `${payload.metrics.filesPct}%` : 'n/a'} | ${payload.thresholds.filesPct}% |`
  ];

  if (payload.thresholdFailures.length > 0) {
    lines.push('', '### Threshold findings');
    payload.thresholdFailures.forEach(finding => lines.push(`- ${finding}`));
  }

  fs.writeFileSync(COVERAGE_SUMMARY_MD_PATH, `${lines.join('\n')}\n`, 'utf8');
}

function main() {
  const thresholds = {
    linesPct: toNumber(process.env.COVERAGE_MIN_LINES, 0),
    branchesPct: toNumber(process.env.COVERAGE_MIN_BRANCHES, 0),
    functionsPct: toNumber(process.env.COVERAGE_MIN_FUNCTIONS, 0),
    filesPct: toNumber(process.env.COVERAGE_MIN_FILES, 0)
  };
  const enforceThresholds = parseBoolean(process.env.COVERAGE_ENFORCE, false);
  const testFiles = listLocalTestFiles();

  if (testFiles.length === 0) {
    throw new Error('No local test files were found under tests/local');
  }

  const args = ['--test', '--experimental-test-coverage', ...testFiles];
  const result = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 200
  });

  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  const combinedOutput = [stdout, stderr].filter(Boolean).join('\n');

  if (stdout) {
    process.stdout.write(stdout);
  }
  if (stderr) {
    process.stderr.write(stderr);
  }

  const metrics = parseCoverageMetrics(combinedOutput);
  const thresholdFailures = evaluateThresholds(metrics, thresholds);
  const payload = {
    generatedAt: new Date().toISOString(),
    nodeVersion: process.version,
    command: [process.execPath, ...args].join(' '),
    testExitCode: result.status == null ? 1 : result.status,
    coverageFound: Boolean(metrics),
    metrics,
    thresholds,
    enforceThresholds,
    thresholdFailures
  };

  writeCoverageArtifacts(payload, combinedOutput);

  if (payload.testExitCode !== 0) {
    process.exit(payload.testExitCode);
  }

  if (thresholdFailures.length > 0) {
    const message = `Coverage thresholds not met (${thresholdFailures.length} findings).`;
    if (enforceThresholds) {
      console.error(message);
      thresholdFailures.forEach(failure => console.error(`- ${failure}`));
      process.exit(1);
    }

    console.warn(message);
    thresholdFailures.forEach(failure => console.warn(`- ${failure}`));
  }
}

main();

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const FORBIDDEN_TRACKED_PATHS = Object.freeze([
  {
    label: 'Apps Script test harness',
    matches: filePath => filePath.startsWith('apps_script_tools/testing/') || filePath.startsWith('testing/')
  },
  {
    label: 'local cowork metadata',
    matches: filePath => filePath.startsWith('apps_script_tools/.opencowork/') || filePath.startsWith('.opencowork/')
  },
  {
    label: 'test-only Apps Script entrypoint',
    matches: filePath => /(?:^|\/)(runTests|runAllTests|runPerformanceBenchmarks|aiLiveSmoke|githubLiveSmoke)\.js$/.test(filePath)
  }
]);

export function extractTrackedClaspPaths(statusText) {
  const tracked = [];
  let inTrackedSection = false;

  String(statusText || '').split(/\r?\n/).forEach(line => {
    if (/^(?:Tracked files|Not ignored files):\s*$/.test(line)) {
      inTrackedSection = true;
      return;
    }

    if (/^[A-Z][A-Za-z ]+:\s*$/.test(line)) {
      inTrackedSection = false;
      return;
    }

    if (!inTrackedSection) {
      return;
    }

    const match = line.match(/^\s*[└├]─\s+(.+?)\s*$/u);
    if (match) {
      tracked.push(match[1]);
    }
  });

  return tracked;
}

export function findForbiddenProductionPaths(trackedPaths) {
  return trackedPaths.flatMap(filePath => {
    const rules = FORBIDDEN_TRACKED_PATHS.filter(rule => rule.matches(filePath));
    return rules.map(rule => ({
      filePath,
      label: rule.label
    }));
  });
}

export function validateProductionTrackedPaths(statusText) {
  const trackedPaths = extractTrackedClaspPaths(statusText);
  return findForbiddenProductionPaths(trackedPaths);
}

function main() {
  const status = spawnSync('clasp', ['status'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  if (status.status !== 0) {
    process.stderr.write(status.stderr || status.stdout || 'clasp status failed.\n');
    process.exit(status.status || 1);
  }

  const trackedPaths = extractTrackedClaspPaths(status.stdout);
  if (trackedPaths.length === 0) {
    process.stderr.write('Unable to parse clasp status push candidates; refusing to pass production push-set check.\n');
    process.exit(1);
  }

  const forbidden = findForbiddenProductionPaths(trackedPaths);
  if (forbidden.length > 0) {
    process.stderr.write('Production clasp push set includes forbidden files:\n');
    forbidden.forEach(finding => {
      process.stderr.write(`- ${finding.filePath} (${finding.label})\n`);
    });
    process.exit(1);
  }

  process.stdout.write('Production clasp push set excludes test and local-only files.\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

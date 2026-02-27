import fs from 'node:fs';
import path from 'node:path';

import { createGasContext, loadCoreDataContext } from '../local/helpers.mjs';
import { loadDbtScripts } from '../local/dbt-helpers.mjs';
import { runDataFramePerf } from './dataframe.perf.test.mjs';
import { runDbtManifestPerf } from './dbt-manifest.perf.test.mjs';
import { runGithubPerf } from './github-cache.perf.test.mjs';
import { runSeriesPerf } from './series.perf.test.mjs';
import { runUtilitiesPerf } from './utilities.perf.test.mjs';

const ROOT = process.cwd();

function parseArgs(argv) {
  const options = {
    mode: 'report',
    rows: 100000,
    samples: 1,
    out: null,
    thresholds: path.join(ROOT, 'tests/perf/perf-thresholds.json')
  };

  for (let idx = 2; idx < argv.length; idx++) {
    const token = argv[idx];
    const next = argv[idx + 1];

    if (token === '--mode' && next) {
      options.mode = next;
      idx += 1;
      continue;
    }

    if (token === '--rows' && next) {
      options.rows = Number(next);
      idx += 1;
      continue;
    }

    if (token === '--samples' && next) {
      options.samples = Number(next);
      idx += 1;
      continue;
    }

    if (token === '--out' && next) {
      options.out = path.isAbsolute(next) ? next : path.join(ROOT, next);
      idx += 1;
      continue;
    }

    if (token === '--thresholds' && next) {
      options.thresholds = path.isAbsolute(next) ? next : path.join(ROOT, next);
      idx += 1;
      continue;
    }
  }

  return options;
}

function ensureDir(filePath) {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, payload) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function buildPayload(options, results) {
  return {
    generatedAt: new Date().toISOString(),
    mode: options.mode,
    nodeVersion: process.version,
    rows: options.rows,
    samples: options.samples,
    results
  };
}

function evaluateThresholds(payload, thresholdPath) {
  const thresholds = readJson(thresholdPath);
  const runtimeKey = `node${process.versions.node.split('.')[0]}`;
  const runtimeThresholds = thresholds[runtimeKey] || thresholds.node20;

  if (!runtimeThresholds) {
    return [`Missing threshold configuration for runtime key '${runtimeKey}'`];
  }

  const byName = Object.fromEntries(payload.results.map(result => [result.name, result]));
  const failures = [];

  const maxMs = runtimeThresholds.maxMs || {};
  Object.entries(maxMs).forEach(([operation, threshold]) => {
    const result = byName[operation];
    if (!result) {
      failures.push(`Missing benchmark result for '${operation}'`);
      return;
    }

    if (result.bestMs > threshold) {
      failures.push(`${operation} exceeded maxMs: ${result.bestMs}ms > ${threshold}ms`);
    }
  });

  const maxHeapDeltaBytes = runtimeThresholds.maxHeapDeltaBytes || {};
  Object.entries(maxHeapDeltaBytes).forEach(([operation, threshold]) => {
    const result = byName[operation];
    if (!result) {
      failures.push(`Missing benchmark result for '${operation}'`);
      return;
    }

    if (result.maxHeapDeltaBytes > threshold) {
      failures.push(`${operation} exceeded maxHeapDeltaBytes: ${result.maxHeapDeltaBytes} > ${threshold}`);
    }
  });

  const maxCounters = runtimeThresholds.maxCounters || {};
  Object.entries(maxCounters).forEach(([operation, limits]) => {
    const result = byName[operation];
    if (!result) {
      failures.push(`Missing benchmark result for '${operation}'`);
      return;
    }

    if (!result.counters) {
      failures.push(`${operation} does not report counters but thresholds require them`);
      return;
    }

    Object.entries(limits).forEach(([counterName, threshold]) => {
      const value = result.counters[counterName];
      if (value == null) {
        failures.push(`${operation} missing counter '${counterName}'`);
        return;
      }

      if (value > threshold) {
        failures.push(`${operation} exceeded counter ${counterName}: ${value} > ${threshold}`);
      }
    });
  });

  return failures;
}

function formatSummary(payload) {
  const lines = [];
  lines.push(`Performance run: ${payload.mode}`);
  lines.push(`Runtime: ${payload.nodeVersion}`);
  lines.push(`Rows: ${payload.rows}`);
  lines.push('---');

  payload.results.forEach(result => {
    lines.push(`${result.name}`);
    lines.push(`  bestMs=${result.bestMs}`);
    lines.push(`  medianMs=${result.medianMs}`);
    lines.push(`  maxHeapDeltaBytes=${result.maxHeapDeltaBytes}`);
    if (result.counters) {
      lines.push(`  counters=${JSON.stringify(result.counters)}`);
    }
  });

  return lines.join('\n');
}

function runAllBenchmarks(options) {
  const context = createGasContext({
    astLoadDatabricksTable: () => {},
    astLoadBigQueryTable: () => {}
  });

  loadCoreDataContext(context);
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const dataframeResults = runDataFramePerf(context, { rows: options.rows, samples: options.samples });
  const dbtResults = runDbtManifestPerf(context, { samples: options.samples });
  const seriesResults = runSeriesPerf(context, { rows: options.rows, samples: options.samples });
  const utilityResults = runUtilitiesPerf(context, { rows: options.rows, samples: options.samples });
  const githubResults = runGithubPerf(context, { rows: options.rows, samples: options.samples });

  return [...dataframeResults, ...dbtResults, ...seriesResults, ...utilityResults, ...githubResults];
}

function main() {
  const options = parseArgs(process.argv);
  const results = runAllBenchmarks(options);
  const payload = buildPayload(options, results);

  const defaultOut = options.mode === 'baseline'
    ? path.join(ROOT, 'benchmarks/baselines/node20.json')
    : path.join(ROOT, 'benchmarks/latest/node20.json');

  const outputPath = options.out || defaultOut;
  writeJson(outputPath, payload);

  console.log(formatSummary(payload));
  console.log('---');
  console.log(`Wrote benchmark output to ${path.relative(ROOT, outputPath)}`);

  if (options.mode === 'check') {
    const failures = evaluateThresholds(payload, options.thresholds);

    if (failures.length > 0) {
      console.error('Performance check failed:');
      failures.forEach(failure => console.error(`- ${failure}`));
      process.exit(1);
    }

    console.log('Performance check passed.');
  }
}

main();

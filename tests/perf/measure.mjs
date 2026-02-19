import { performance } from 'node:perf_hooks';

function round(value) {
  return Number(value.toFixed(3));
}

export function measureBenchmark(name, fn, options = {}) {
  const {
    samples = 1,
    warmup = 1,
    resetCounters = null,
    readCounters = null
  } = options;

  let sink;

  for (let warmupIdx = 0; warmupIdx < warmup; warmupIdx++) {
    sink = fn();
  }

  const timings = [];
  const heapDeltas = [];
  const counterSnapshots = [];

  for (let sampleIdx = 0; sampleIdx < samples; sampleIdx++) {
    if (typeof resetCounters === 'function') {
      resetCounters();
    }

    const heapBefore = process.memoryUsage().heapUsed;
    const start = performance.now();
    sink = fn();
    const elapsedMs = performance.now() - start;
    const heapAfter = process.memoryUsage().heapUsed;

    timings.push(elapsedMs);
    heapDeltas.push(Math.max(0, heapAfter - heapBefore));

    if (typeof readCounters === 'function') {
      counterSnapshots.push(readCounters());
    }
  }

  const bestMs = Math.min(...timings);
  const medianMs = timings.slice().sort((a, b) => a - b)[Math.floor(timings.length / 2)];
  const maxHeapDeltaBytes = Math.max(...heapDeltas);

  const output = {
    name,
    bestMs: round(bestMs),
    medianMs: round(medianMs),
    maxHeapDeltaBytes,
    samples
  };

  if (counterSnapshots.length > 0) {
    output.counters = counterSnapshots[counterSnapshots.length - 1];
  }

  if (sink && typeof sink === 'object') {
    output.outputType = sink.constructor ? sink.constructor.name : 'object';
  } else {
    output.outputType = typeof sink;
  }

  return output;
}

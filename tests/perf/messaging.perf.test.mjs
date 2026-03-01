import { performance } from 'node:perf_hooks';

import { createGasContext } from '../local/helpers.mjs';
import { loadMessagingScripts } from '../local/messaging-helpers.mjs';

function createResponse(statusCode, body, headers = {}) {
  const bodyText = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    getResponseCode: () => statusCode,
    getContentText: () => bodyText,
    getAllHeaders: () => headers
  };
}

function measureMs(fn) {
  const started = performance.now();
  fn();
  return performance.now() - started;
}

export function runMessagingPerf(_context, options = {}) {
  const samples = Number.isInteger(options.samples) ? Math.max(1, options.samples) : 1;
  const metrics = [];

  for (let idx = 0; idx < samples; idx += 1) {
    let fetchCalls = 0;
    const context = createGasContext({
      UrlFetchApp: {
        fetch: () => {
          fetchCalls += 1;
          return createResponse(200, { name: `spaces/abc/messages/${fetchCalls}` });
        }
      }
    });

    loadMessagingScripts(context, { includeAst: true });

    context.AST.Messaging.configure({
      MESSAGING_LOG_BACKEND: 'memory',
      MESSAGING_LOG_NAMESPACE: `perf_messaging_${idx}`
    });

    const request = {
      body: {
        transport: 'webhook',
        webhookUrl: 'https://chat.googleapis.com/v1/spaces/abc/messages?key=x&token=y',
        message: {
          text: 'performance test message'
        }
      },
      options: {
        retries: 0
      }
    };

    const coldMs = measureMs(() => {
      context.AST.Messaging.chat.send(request);
    });

    const warmMs = measureMs(() => {
      context.AST.Messaging.chat.send(request);
    });

    const dryRunMs = measureMs(() => {
      context.AST.Messaging.chat.send({
        body: request.body,
        options: {
          dryRun: true
        }
      });
    });

    metrics.push({
      coldMs,
      warmMs,
      dryRunMs,
      fetchCalls,
      warmRelativePct: coldMs > 0 ? (warmMs / coldMs) * 100 : 0,
      dryRunRelativePct: coldMs > 0 ? (dryRunMs / coldMs) * 100 : 0
    });
  }

  const best = metrics.slice().sort((a, b) => a.warmRelativePct - b.warmRelativePct)[0];
  const median = metrics.slice().sort((a, b) => a.coldMs - b.coldMs)[Math.floor(metrics.length / 2)];

  return [{
    name: 'messaging.send_profile',
    bestMs: Number(best.warmMs.toFixed(3)),
    medianMs: Number(median.coldMs.toFixed(3)),
    maxHeapDeltaBytes: 0,
    samples,
    counters: {
      coldMs: Number(best.coldMs.toFixed(3)),
      warmMs: Number(best.warmMs.toFixed(3)),
      dryRunMs: Number(best.dryRunMs.toFixed(3)),
      warmRelativePct: Number(best.warmRelativePct.toFixed(3)),
      dryRunRelativePct: Number(best.dryRunRelativePct.toFixed(3)),
      fetchCalls: best.fetchCalls
    },
    outputType: 'Object'
  }];
}

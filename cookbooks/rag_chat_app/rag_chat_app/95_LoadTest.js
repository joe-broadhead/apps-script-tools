function runCookbookLoadTest(request) {
  request = request || {};

  var iterations = Math.max(1, integerOr_(request.iterations, 20));
  var deepEvery = Math.max(0, integerOr_(request.deepEvery, 0));
  var chatRateLimitMaxRequests = Math.max(
    iterations + 10,
    integerOr_(request.chatRateLimitMaxRequests, iterations + 10)
  );
  var questions = Array.isArray(request.questions) && request.questions.length
    ? request.questions
    : [
      'What is this project about?',
      'What are the key risks or blockers?',
      'What concrete next steps are documented?',
      'Summarize the timeline and milestones.',
      'List action owners if available in context.'
    ];

  var started = Date.now();
  var init = initAppWeb({
    chatRateLimitMaxRequests: chatRateLimitMaxRequests
  });
  var threadId = init && init.activeThread ? stringOrEmpty_(init.activeThread.id) : '';

  var latencies = [];
  var results = [];
  var okCount = 0;
  var failCount = 0;
  var dedupeCount = 0;

  for (var i = 0; i < iterations; i += 1) {
    var question = stringOrEmpty_(questions[i % questions.length]).trim();
    if (!question) continue;

    var deep = deepEvery > 0 && ((i + 1) % deepEvery === 0);
    var turnStarted = Date.now();

    try {
      var response = chatTurnWeb({
        threadId: threadId,
        message: question,
        deep: deep,
        chatRateLimitMaxRequests: chatRateLimitMaxRequests
      });
      var turnMs = Date.now() - turnStarted;
      latencies.push(turnMs);
      okCount += 1;
      if (response && response.diagnostics && response.diagnostics.cached === true) {
        dedupeCount += 1;
      }
      if (response && response.threadId) {
        threadId = response.threadId;
      }
      results.push({
        index: i + 1,
        ok: true,
        deep: deep,
        status: stringOrEmpty_(response && response.status) || 'ok',
        totalMs: turnMs,
        cached: !!(response && response.diagnostics && response.diagnostics.cached)
      });
    } catch (error) {
      var failMs = Date.now() - turnStarted;
      latencies.push(failMs);
      failCount += 1;
      results.push({
        index: i + 1,
        ok: false,
        deep: deep,
        totalMs: failMs,
        error: stringOrEmpty_(error && error.message) || String(error)
      });
    }
  }

  latencies.sort(function (a, b) { return a - b; });
  var totalMs = Date.now() - started;
  var summary = {
    ok: failCount === 0,
    iterations: iterations,
    successCount: okCount,
    failureCount: failCount,
    dedupeCount: dedupeCount,
    durationMs: totalMs,
    latencyMs: {
      min: latencies.length ? latencies[0] : 0,
      p50: percentileFromSorted_(latencies, 0.5),
      p95: percentileFromSorted_(latencies, 0.95),
      max: latencies.length ? latencies[latencies.length - 1] : 0,
      avg: latencies.length
        ? Math.round(latencies.reduce(function (acc, v) { return acc + v; }, 0) / latencies.length)
        : 0
    },
    sampleResults: results.slice(0, Math.min(30, results.length))
  };

  Logger.log(JSON.stringify(summary, null, 2));
  return summary;
}

function percentileFromSorted_(values, percentile) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  var p = Number(percentile);
  if (!isFinite(p) || p <= 0) return values[0];
  if (p >= 1) return values[values.length - 1];
  var idx = Math.floor((values.length - 1) * p);
  return values[idx];
}

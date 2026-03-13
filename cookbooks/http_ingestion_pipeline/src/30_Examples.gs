function cookbookCaptureHttpError_(task) {
  try {
    return {
      status: 'ok',
      value: task()
    };
  } catch (error) {
    return {
      status: 'error',
      error: {
        name: error && error.name ? error.name : 'Error',
        message: error && error.message ? error.message : String(error),
        details: error && error.details ? error.details : null
      }
    };
  }
}

function runCookbookDemoInternal_(ASTX, config) {
  const startedAtMs = Date.now();
  const traceId = 'trace_http_cookbook_' + String(startedAtMs);
  const spanId = config.HTTP_COOKBOOK_TELEMETRY_ENABLED
    ? ASTX.Telemetry.startSpan('cookbook.http.demo', {
        traceId: traceId,
        module: 'http',
        cookbook: cookbookName_(),
        userAgent: config.HTTP_COOKBOOK_USER_AGENT,
        successUrl: cookbookRedactQueryString_(config.HTTP_COOKBOOK_SUCCESS_URL)
      })
    : null;

  try {
    const cacheResult = config.HTTP_COOKBOOK_CACHE_ENABLED
      ? ASTX.Cache.fetch('http:success:' + config.HTTP_COOKBOOK_SUCCESS_URL, function () {
          return ASTX.Http.request({
            url: config.HTTP_COOKBOOK_SUCCESS_URL,
            method: 'GET',
            headers: {
              'X-Cookbook-App': config.HTTP_COOKBOOK_APP_NAME,
              'X-Mode': 'cache-fetch'
            },
            options: cookbookBuildHttpOptions_(config)
          });
        }, cookbookBuildCacheOptions_(config))
      : {
          status: 'skip',
          reason: 'Cache integration is disabled.'
        };

    const transientFailure = cookbookCaptureHttpError_(function () {
      return ASTX.Http.request({
        url: config.HTTP_COOKBOOK_TRANSIENT_URL,
        method: 'GET',
        options: cookbookBuildHttpOptions_(config)
      });
    });

    const deterministicFailure = cookbookCaptureHttpError_(function () {
      return ASTX.Http.request({
        url: config.HTTP_COOKBOOK_NOT_FOUND_URL,
        method: 'GET',
        options: cookbookBuildHttpOptions_(config)
      });
    });

    const batch = ASTX.Http.requestBatch({
      requests: [
        {
          url: config.HTTP_COOKBOOK_SUCCESS_URL,
          method: 'GET',
          options: cookbookBuildHttpOptions_(config)
        },
        {
          url: config.HTTP_COOKBOOK_TRANSIENT_URL,
          method: 'GET',
          options: cookbookBuildHttpOptions_(config)
        },
        {
          url: config.HTTP_COOKBOOK_NOT_FOUND_URL,
          method: 'GET',
          options: cookbookBuildHttpOptions_(config)
        }
      ],
      options: {
        continueOnError: true,
        includeRaw: false
      }
    });

    let telemetry = {
      status: 'skip',
      reason: 'Telemetry integration is disabled.'
    };
    if (spanId) {
      ASTX.Telemetry.recordEvent({
        traceId: traceId,
        spanId: spanId,
        name: 'cookbook.http.batch',
        level: 'info',
        payload: {
          total: batch.usage.total,
          success: batch.usage.success,
          failed: batch.usage.failed
        }
      });
      const ended = ASTX.Telemetry.endSpan(spanId, {
        status: 'ok',
        result: {
          success: batch.usage.success,
          failed: batch.usage.failed,
          cacheHit: Boolean(cacheResult && cacheResult.cacheHit)
        }
      });
      const trace = ended && ended.traceId ? ASTX.Telemetry.getTrace(ended.traceId) : null;
      telemetry = {
        status: 'ok',
        traceId: ended ? ended.traceId : null,
        spanCount: trace && Array.isArray(trace.spans) ? trace.spans.length : 0,
        eventCount: trace && Array.isArray(trace.events) ? trace.events.length : 0
      };
    }

    return {
      status: 'ok',
      cookbook: cookbookName_(),
      entrypoint: 'runCookbookDemo',
      appName: config.HTTP_COOKBOOK_APP_NAME,
      durationMs: Date.now() - startedAtMs,
      cache: config.HTTP_COOKBOOK_CACHE_ENABLED
        ? {
            cacheHit: cacheResult.cacheHit,
            source: cacheResult.source,
            stale: cacheResult.stale,
            statusCode: cacheResult.value && cacheResult.value.output ? cacheResult.value.output.statusCode : null
          }
        : cacheResult,
      failures: {
        transient: transientFailure.status === 'error'
          ? transientFailure.error
          : { status: 'unexpected_success', value: cookbookSummarizeRequest_(transientFailure.value) },
        deterministic: deterministicFailure.status === 'error'
          ? deterministicFailure.error
          : { status: 'unexpected_success', value: cookbookSummarizeRequest_(deterministicFailure.value) }
      },
      batch: {
        total: batch.usage.total,
        success: batch.usage.success,
        failed: batch.usage.failed,
        errorNames: batch.items.filter(function (item) {
          return item.status === 'error';
        }).map(function (item) {
          return item.error && item.error.name ? item.error.name : 'Error';
        })
      },
      telemetry: telemetry,
      safeLoggingExample: {
        url: cookbookRedactQueryString_(config.HTTP_COOKBOOK_SUCCESS_URL),
        headers: cookbookRedactHeaders_({
          Authorization: 'Bearer should-not-log',
          'X-Cookbook-App': config.HTTP_COOKBOOK_APP_NAME
        })
      }
    };
  } catch (error) {
    if (spanId) {
      ASTX.Telemetry.endSpan(spanId, {
        status: 'error',
        error: error
      });
    }
    throw error;
  }
}

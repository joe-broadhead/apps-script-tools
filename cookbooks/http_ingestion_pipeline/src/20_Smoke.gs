function cookbookRedactQueryString_(value) {
  const normalized = cookbookNormalizeString_(value, '');
  if (!normalized) {
    return normalized;
  }
  return normalized.replace(/([?&](?:token|key|api_key|apikey|access_token)=)[^&]+/ig, '$1[REDACTED]');
}

function cookbookRedactHeaders_(headers) {
  const source = headers && typeof headers === 'object' ? headers : {};
  const out = {};
  Object.keys(source).forEach(function (key) {
    const lowered = String(key).toLowerCase();
    if (['authorization', 'x-api-key', 'api-key', 'cookie', 'set-cookie'].indexOf(lowered) !== -1) {
      out[key] = '[REDACTED]';
      return;
    }
    out[key] = source[key];
  });
  return out;
}

function cookbookSummarizeRequest_(request) {
  return {
    method: request && request.source ? request.source.method : null,
    url: cookbookRedactQueryString_(request && request.source ? request.source.url : ''),
    statusCode: request && request.output ? request.output.statusCode : null,
    attempts: request && request.usage ? request.usage.attempts : null,
    elapsedMs: request && request.usage ? request.usage.elapsedMs : null
  };
}

function runCookbookSmokeInternal_(ASTX, config) {
  const startedAtMs = Date.now();
  const successRequest = ASTX.Http.request({
    url: config.HTTP_COOKBOOK_SUCCESS_URL,
    method: 'GET',
    headers: {
      'X-Cookbook-App': config.HTTP_COOKBOOK_APP_NAME
    },
    options: cookbookBuildHttpOptions_(config)
  });

  const batch = ASTX.Http.requestBatch({
    requests: [
      {
        url: config.HTTP_COOKBOOK_SUCCESS_URL,
        method: 'GET',
        headers: {
          'X-Cookbook-App': config.HTTP_COOKBOOK_APP_NAME,
          'X-Mode': 'batch-success'
        },
        options: cookbookBuildHttpOptions_(config)
      },
      {
        url: config.HTTP_COOKBOOK_NOT_FOUND_URL,
        method: 'GET',
        headers: {
          'X-Cookbook-App': config.HTTP_COOKBOOK_APP_NAME,
          'X-Mode': 'batch-not-found'
        },
        options: cookbookBuildHttpOptions_(config)
      }
    ],
    options: {
      continueOnError: true,
      includeRaw: false
    }
  });

  return {
    status: 'ok',
    cookbook: cookbookName_(),
    entrypoint: 'runCookbookSmoke',
    appName: config.HTTP_COOKBOOK_APP_NAME,
    durationMs: Date.now() - startedAtMs,
    request: cookbookSummarizeRequest_(successRequest),
    requestMetadata: {
      headers: cookbookRedactHeaders_({
        'X-Cookbook-App': config.HTTP_COOKBOOK_APP_NAME,
        'User-Agent': config.HTTP_COOKBOOK_USER_AGENT
      })
    },
    response: {
      hasJson: Boolean(successRequest.output && successRequest.output.json),
      echoedUrl: successRequest.output && successRequest.output.json && successRequest.output.json.url
        ? cookbookRedactQueryString_(successRequest.output.json.url)
        : null
    },
    batch: {
      total: batch.usage.total,
      success: batch.usage.success,
      failed: batch.usage.failed,
      items: batch.items.map(function (item) {
        return item.status === 'ok'
          ? {
              index: item.index,
              status: item.status,
              statusCode: item.response && item.response.output ? item.response.output.statusCode : null
            }
          : {
              index: item.index,
              status: item.status,
              error: item.error ? { name: item.error.name, message: item.error.message } : null
            };
      })
    }
  };
}

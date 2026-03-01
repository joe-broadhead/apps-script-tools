const AST_MESSAGING_CONFIG_KEYS = Object.freeze([
  'MESSAGING_DEFAULT_FROM',
  'MESSAGING_DEFAULT_REPLY_TO',
  'MESSAGING_DEFAULT_SENDER_NAME',
  'MESSAGING_CHAT_WEBHOOK_URL',
  'MESSAGING_CHAT_SPACE',
  'MESSAGING_CHAT_API_BASE_URL',
  'MESSAGING_SLACK_WEBHOOK_URL',
  'MESSAGING_SLACK_BOT_TOKEN',
  'MESSAGING_SLACK_CHANNEL',
  'MESSAGING_SLACK_API_BASE_URL',
  'MESSAGING_TEAMS_WEBHOOK_URL',
  'MESSAGING_TIMEOUT_MS',
  'MESSAGING_RETRIES',
  'MESSAGING_TRACKING_ENABLED',
  'MESSAGING_TRACKING_OPEN_ENABLED',
  'MESSAGING_TRACKING_CLICK_ENABLED',
  'MESSAGING_TRACKING_BASE_URL',
  'MESSAGING_TRACKING_SIGNING_SECRET',
  'MESSAGING_LOG_BACKEND',
  'MESSAGING_LOG_NAMESPACE',
  'MESSAGING_LOG_DRIVE_FOLDER_ID',
  'MESSAGING_LOG_DRIVE_FILE_NAME',
  'MESSAGING_LOG_STORAGE_URI',
  'MESSAGING_LOG_TTL_SEC',
  'MESSAGING_ASYNC_ENABLED',
  'MESSAGING_ASYNC_QUEUE',
  'MESSAGING_IDEMPOTENCY_BACKEND',
  'MESSAGING_IDEMPOTENCY_NAMESPACE',
  'MESSAGING_IDEMPOTENCY_TTL_SEC'
]);

const AST_MESSAGING_DEFAULTS = Object.freeze({
  timeoutMs: 45000,
  retries: 2,
  defaults: Object.freeze({
    from: '',
    replyTo: '',
    senderName: '',
    noReply: true
  }),
  chat: Object.freeze({
    webhookUrl: '',
    space: '',
    apiBaseUrl: 'https://chat.googleapis.com/v1',
    slackWebhookUrl: '',
    slackBotToken: '',
    slackChannel: '',
    slackApiBaseUrl: 'https://slack.com/api',
    teamsWebhookUrl: ''
  }),
  tracking: Object.freeze({
    enabled: false,
    openEnabled: false,
    clickEnabled: false,
    baseUrl: '',
    signingSecret: ''
  }),
  logs: Object.freeze({
    backend: 'drive_json',
    namespace: 'ast_messaging_logs',
    driveFolderId: '',
    driveFileName: 'ast_messaging_logs.json',
    storageUri: '',
    ttlSec: 31536000,
    maxEntries: 5000
  }),
  async: Object.freeze({
    enabled: false,
    queue: 'jobs'
  }),
  idempotency: Object.freeze({
    backend: 'memory',
    namespace: 'ast_messaging_idempotency',
    ttlSec: 900
  })
});

let AST_MESSAGING_RUNTIME_CONFIG = {};

function astMessagingConfigIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astMessagingConfigCloneObject(value) {
  return astMessagingConfigIsPlainObject(value)
    ? Object.assign({}, value)
    : {};
}

function astMessagingConfigNormalizeString(value, fallback = null) {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function astMessagingConfigNormalizeBoolean(value, fallback) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no'].includes(normalized)) {
      return false;
    }
  }
  return fallback;
}

function astMessagingConfigNormalizeInteger(value, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (value === null || typeof value === 'undefined' || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const normalized = Math.floor(parsed);
  if (normalized < min || normalized > max) {
    return fallback;
  }

  return normalized;
}

function astMessagingConfigNormalizeValue(value) {
  if (value == null) {
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return null;
}

function astMessagingGetScriptPropertiesSnapshot() {
  const output = {};

  try {
    if (
      typeof PropertiesService !== 'undefined' &&
      PropertiesService &&
      typeof PropertiesService.getScriptProperties === 'function'
    ) {
      const scriptProperties = PropertiesService.getScriptProperties();
      if (!scriptProperties) {
        return output;
      }

      if (typeof scriptProperties.getProperties === 'function') {
        const properties = scriptProperties.getProperties();
        if (astMessagingConfigIsPlainObject(properties)) {
          Object.keys(properties).forEach(key => {
            const normalized = astMessagingConfigNormalizeValue(properties[key]);
            if (normalized != null) {
              output[key] = normalized;
            }
          });
        }
      }

      if (typeof scriptProperties.getProperty === 'function') {
        AST_MESSAGING_CONFIG_KEYS.forEach(key => {
          if (output[key]) {
            return;
          }
          const normalized = astMessagingConfigNormalizeValue(scriptProperties.getProperty(key));
          if (normalized != null) {
            output[key] = normalized;
          }
        });
      }
    }
  } catch (_error) {
    // Ignore script property lookup failures.
  }

  return output;
}

function astMessagingGetRuntimeConfig() {
  return astMessagingConfigCloneObject(AST_MESSAGING_RUNTIME_CONFIG);
}

function astMessagingSetRuntimeConfig(config = {}, options = {}) {
  if (!astMessagingConfigIsPlainObject(config)) {
    throw new AstMessagingValidationError('Messaging runtime config must be an object');
  }
  if (!astMessagingConfigIsPlainObject(options)) {
    throw new AstMessagingValidationError('Messaging runtime config options must be an object');
  }

  const merge = options.merge !== false;
  const next = merge ? astMessagingGetRuntimeConfig() : {};

  Object.keys(config).forEach(key => {
    const normalizedKey = astMessagingConfigNormalizeString(key, null);
    if (!normalizedKey) {
      return;
    }

    const normalizedValue = astMessagingConfigNormalizeValue(config[key]);
    if (normalizedValue == null) {
      delete next[normalizedKey];
      return;
    }

    next[normalizedKey] = normalizedValue;
  });

  AST_MESSAGING_RUNTIME_CONFIG = next;
  return astMessagingGetRuntimeConfig();
}

function astMessagingClearRuntimeConfig() {
  AST_MESSAGING_RUNTIME_CONFIG = {};
  return {};
}

function astMessagingResolveFirstString(candidates, fallback = null) {
  for (let idx = 0; idx < candidates.length; idx += 1) {
    const normalized = astMessagingConfigNormalizeString(candidates[idx], null);
    if (normalized) {
      return normalized;
    }
  }
  return fallback;
}

function astMessagingResolveBaseConfig(normalizedRequest = {}) {
  const runtimeConfig = astMessagingGetRuntimeConfig();
  const scriptConfig = astMessagingGetScriptPropertiesSnapshot();

  const requestOptions = astMessagingConfigIsPlainObject(normalizedRequest.options)
    ? normalizedRequest.options
    : {};

  const timeoutMs = astMessagingConfigNormalizeInteger(
    requestOptions.timeoutMs,
    astMessagingConfigNormalizeInteger(runtimeConfig.MESSAGING_TIMEOUT_MS,
      astMessagingConfigNormalizeInteger(scriptConfig.MESSAGING_TIMEOUT_MS, AST_MESSAGING_DEFAULTS.timeoutMs, 1, 300000),
    1, 300000),
    1,
    300000
  );

  const retries = astMessagingConfigNormalizeInteger(
    requestOptions.retries,
    astMessagingConfigNormalizeInteger(runtimeConfig.MESSAGING_RETRIES,
      astMessagingConfigNormalizeInteger(scriptConfig.MESSAGING_RETRIES, AST_MESSAGING_DEFAULTS.retries, 0, 10),
    0, 10),
    0,
    10
  );

  const defaults = {
    from: astMessagingResolveFirstString(
      [normalizedRequest.body && normalizedRequest.body.options && normalizedRequest.body.options.from, runtimeConfig.MESSAGING_DEFAULT_FROM, scriptConfig.MESSAGING_DEFAULT_FROM],
      AST_MESSAGING_DEFAULTS.defaults.from
    ),
    replyTo: astMessagingResolveFirstString(
      [normalizedRequest.body && normalizedRequest.body.options && normalizedRequest.body.options.replyTo, runtimeConfig.MESSAGING_DEFAULT_REPLY_TO, scriptConfig.MESSAGING_DEFAULT_REPLY_TO],
      AST_MESSAGING_DEFAULTS.defaults.replyTo
    ),
    senderName: astMessagingResolveFirstString(
      [normalizedRequest.body && normalizedRequest.body.options && normalizedRequest.body.options.name, runtimeConfig.MESSAGING_DEFAULT_SENDER_NAME, scriptConfig.MESSAGING_DEFAULT_SENDER_NAME],
      AST_MESSAGING_DEFAULTS.defaults.senderName
    ),
    noReply: astMessagingConfigNormalizeBoolean(
      normalizedRequest.body && normalizedRequest.body.options && normalizedRequest.body.options.noReply,
      astMessagingConfigNormalizeBoolean(runtimeConfig.MESSAGING_NO_REPLY,
        astMessagingConfigNormalizeBoolean(scriptConfig.MESSAGING_NO_REPLY, AST_MESSAGING_DEFAULTS.defaults.noReply)
      )
    )
  };

  const chat = {
    webhookUrl: astMessagingResolveFirstString(
      [
        normalizedRequest.auth && normalizedRequest.auth.chatWebhookUrl,
        normalizedRequest.auth && normalizedRequest.auth.webhookUrl,
        runtimeConfig.MESSAGING_CHAT_WEBHOOK_URL,
        scriptConfig.MESSAGING_CHAT_WEBHOOK_URL
      ],
      AST_MESSAGING_DEFAULTS.chat.webhookUrl
    ),
    space: astMessagingResolveFirstString(
      [normalizedRequest.body && normalizedRequest.body.space, runtimeConfig.MESSAGING_CHAT_SPACE, scriptConfig.MESSAGING_CHAT_SPACE],
      AST_MESSAGING_DEFAULTS.chat.space
    ),
    apiBaseUrl: astMessagingResolveFirstString(
      [runtimeConfig.MESSAGING_CHAT_API_BASE_URL, scriptConfig.MESSAGING_CHAT_API_BASE_URL],
      AST_MESSAGING_DEFAULTS.chat.apiBaseUrl
    ),
    slackWebhookUrl: astMessagingResolveFirstString(
      [
        normalizedRequest.auth && normalizedRequest.auth.slackWebhookUrl,
        normalizedRequest.auth && normalizedRequest.auth.slack_webhook_url,
        runtimeConfig.MESSAGING_SLACK_WEBHOOK_URL,
        scriptConfig.MESSAGING_SLACK_WEBHOOK_URL
      ],
      AST_MESSAGING_DEFAULTS.chat.slackWebhookUrl
    ),
    slackBotToken: astMessagingResolveFirstString(
      [
        normalizedRequest.auth && normalizedRequest.auth.slackBotToken,
        normalizedRequest.auth && normalizedRequest.auth.slack_bot_token,
        runtimeConfig.MESSAGING_SLACK_BOT_TOKEN,
        scriptConfig.MESSAGING_SLACK_BOT_TOKEN
      ],
      AST_MESSAGING_DEFAULTS.chat.slackBotToken
    ),
    slackChannel: astMessagingResolveFirstString(
      [runtimeConfig.MESSAGING_SLACK_CHANNEL, scriptConfig.MESSAGING_SLACK_CHANNEL],
      AST_MESSAGING_DEFAULTS.chat.slackChannel
    ),
    slackApiBaseUrl: astMessagingResolveFirstString(
      [runtimeConfig.MESSAGING_SLACK_API_BASE_URL, scriptConfig.MESSAGING_SLACK_API_BASE_URL],
      AST_MESSAGING_DEFAULTS.chat.slackApiBaseUrl
    ),
    teamsWebhookUrl: astMessagingResolveFirstString(
      [
        normalizedRequest.auth && normalizedRequest.auth.teamsWebhookUrl,
        normalizedRequest.auth && normalizedRequest.auth.teams_webhook_url,
        runtimeConfig.MESSAGING_TEAMS_WEBHOOK_URL,
        scriptConfig.MESSAGING_TEAMS_WEBHOOK_URL
      ],
      AST_MESSAGING_DEFAULTS.chat.teamsWebhookUrl
    )
  };

  const tracking = {
    enabled: astMessagingConfigNormalizeBoolean(
      normalizedRequest.body && normalizedRequest.body.options && normalizedRequest.body.options.track && normalizedRequest.body.options.track.enabled,
      astMessagingConfigNormalizeBoolean(runtimeConfig.MESSAGING_TRACKING_ENABLED,
        astMessagingConfigNormalizeBoolean(scriptConfig.MESSAGING_TRACKING_ENABLED, AST_MESSAGING_DEFAULTS.tracking.enabled)
      )
    ),
    openEnabled: astMessagingConfigNormalizeBoolean(
      normalizedRequest.body && normalizedRequest.body.options && normalizedRequest.body.options.track && normalizedRequest.body.options.track.open,
      astMessagingConfigNormalizeBoolean(runtimeConfig.MESSAGING_TRACKING_OPEN_ENABLED,
        astMessagingConfigNormalizeBoolean(scriptConfig.MESSAGING_TRACKING_OPEN_ENABLED, AST_MESSAGING_DEFAULTS.tracking.openEnabled)
      )
    ),
    clickEnabled: astMessagingConfigNormalizeBoolean(
      normalizedRequest.body && normalizedRequest.body.options && normalizedRequest.body.options.track && normalizedRequest.body.options.track.click,
      astMessagingConfigNormalizeBoolean(runtimeConfig.MESSAGING_TRACKING_CLICK_ENABLED,
        astMessagingConfigNormalizeBoolean(scriptConfig.MESSAGING_TRACKING_CLICK_ENABLED, AST_MESSAGING_DEFAULTS.tracking.clickEnabled)
      )
    ),
    baseUrl: astMessagingResolveFirstString(
      [runtimeConfig.MESSAGING_TRACKING_BASE_URL, scriptConfig.MESSAGING_TRACKING_BASE_URL],
      AST_MESSAGING_DEFAULTS.tracking.baseUrl
    ),
    signingSecret: astMessagingResolveFirstString(
      [runtimeConfig.MESSAGING_TRACKING_SIGNING_SECRET, scriptConfig.MESSAGING_TRACKING_SIGNING_SECRET],
      AST_MESSAGING_DEFAULTS.tracking.signingSecret
    )
  };

  const logs = {
    backend: astMessagingResolveFirstString(
      [runtimeConfig.MESSAGING_LOG_BACKEND, scriptConfig.MESSAGING_LOG_BACKEND],
      AST_MESSAGING_DEFAULTS.logs.backend
    ),
    namespace: astMessagingResolveFirstString(
      [runtimeConfig.MESSAGING_LOG_NAMESPACE, scriptConfig.MESSAGING_LOG_NAMESPACE],
      AST_MESSAGING_DEFAULTS.logs.namespace
    ),
    driveFolderId: astMessagingResolveFirstString(
      [runtimeConfig.MESSAGING_LOG_DRIVE_FOLDER_ID, scriptConfig.MESSAGING_LOG_DRIVE_FOLDER_ID],
      AST_MESSAGING_DEFAULTS.logs.driveFolderId
    ),
    driveFileName: astMessagingResolveFirstString(
      [runtimeConfig.MESSAGING_LOG_DRIVE_FILE_NAME, scriptConfig.MESSAGING_LOG_DRIVE_FILE_NAME],
      AST_MESSAGING_DEFAULTS.logs.driveFileName
    ),
    storageUri: astMessagingResolveFirstString(
      [runtimeConfig.MESSAGING_LOG_STORAGE_URI, scriptConfig.MESSAGING_LOG_STORAGE_URI],
      AST_MESSAGING_DEFAULTS.logs.storageUri
    ),
    ttlSec: astMessagingConfigNormalizeInteger(
      runtimeConfig.MESSAGING_LOG_TTL_SEC,
      astMessagingConfigNormalizeInteger(scriptConfig.MESSAGING_LOG_TTL_SEC, AST_MESSAGING_DEFAULTS.logs.ttlSec, 0, 31536000),
      0,
      31536000
    ),
    maxEntries: AST_MESSAGING_DEFAULTS.logs.maxEntries
  };

  const asyncConfig = {
    enabled: astMessagingConfigNormalizeBoolean(
      requestOptions.async && requestOptions.async.enabled,
      astMessagingConfigNormalizeBoolean(runtimeConfig.MESSAGING_ASYNC_ENABLED,
        astMessagingConfigNormalizeBoolean(scriptConfig.MESSAGING_ASYNC_ENABLED, AST_MESSAGING_DEFAULTS.async.enabled)
      )
    ),
    queue: astMessagingResolveFirstString(
      [requestOptions.async && requestOptions.async.queue, runtimeConfig.MESSAGING_ASYNC_QUEUE, scriptConfig.MESSAGING_ASYNC_QUEUE],
      AST_MESSAGING_DEFAULTS.async.queue
    )
  };

  const idempotency = {
    backend: astMessagingResolveFirstString(
      [runtimeConfig.MESSAGING_IDEMPOTENCY_BACKEND, scriptConfig.MESSAGING_IDEMPOTENCY_BACKEND],
      AST_MESSAGING_DEFAULTS.idempotency.backend
    ),
    namespace: astMessagingResolveFirstString(
      [runtimeConfig.MESSAGING_IDEMPOTENCY_NAMESPACE, scriptConfig.MESSAGING_IDEMPOTENCY_NAMESPACE],
      AST_MESSAGING_DEFAULTS.idempotency.namespace
    ),
    ttlSec: astMessagingConfigNormalizeInteger(
      runtimeConfig.MESSAGING_IDEMPOTENCY_TTL_SEC,
      astMessagingConfigNormalizeInteger(scriptConfig.MESSAGING_IDEMPOTENCY_TTL_SEC, AST_MESSAGING_DEFAULTS.idempotency.ttlSec, 1, 86400),
      1,
      86400
    )
  };

  const transport = astMessagingResolveFirstString(
    [normalizedRequest.providerOptions && normalizedRequest.providerOptions.transport, normalizedRequest.body && normalizedRequest.body.transport],
    null
  );

  return {
    timeoutMs,
    retries,
    defaults,
    chat,
    tracking,
    logs,
    async: asyncConfig,
    idempotency,
    transport
  };
}

function astMessagingResolveConfig(normalizedRequest = {}) {
  if (!astMessagingConfigIsPlainObject(normalizedRequest)) {
    normalizedRequest = {};
  }

  return astMessagingResolveBaseConfig(normalizedRequest);
}

# Messaging Contracts

## Namespace

```javascript
ASTX.Messaging.run(request)
ASTX.Messaging.email.send(request)
ASTX.Messaging.email.sendBatch(request)
ASTX.Messaging.email.createDraft(request)
ASTX.Messaging.email.sendDraft(request)
ASTX.Messaging.email.listThreads(request)
ASTX.Messaging.email.getThread(request)
ASTX.Messaging.email.searchMessages(request)
ASTX.Messaging.email.getMessage(request)
ASTX.Messaging.email.listLabels(request)
ASTX.Messaging.email.updateMessageLabels(request)
ASTX.Messaging.chat.send(request)
ASTX.Messaging.chat.sendBatch(request)
ASTX.Messaging.chat.getMessage(request)
ASTX.Messaging.chat.listMessages(request)
ASTX.Messaging.tracking.buildPixelUrl(request)
ASTX.Messaging.tracking.wrapLinks(request)
ASTX.Messaging.tracking.recordEvent(request)
ASTX.Messaging.tracking.handleWebEvent(request)
ASTX.Messaging.logs.list(request)
ASTX.Messaging.logs.get(request)
ASTX.Messaging.logs.delete(request)
ASTX.Messaging.operations()
ASTX.Messaging.capabilities(operationOrGroup)
ASTX.Messaging.configure(config, options)
ASTX.Messaging.getConfig()
ASTX.Messaging.clearConfig()
```

## `run(request)`

```javascript
{
  operation: 'email_send' | 'chat_send' | 'tracking_record_event' | ...,
  body: { ... },
  auth: {
    oauthToken: 'optional',
    chatWebhookUrl: 'optional',
    slackWebhookUrl: 'optional',
    slackBotToken: 'optional',
    teamsWebhookUrl: 'optional'
  },
  options: {
    dryRun: false,
    includeRaw: false,
    timeoutMs: 45000,
    retries: 2,
    idempotencyKey: 'optional',
    async: {
      enabled: false,
      queue: 'jobs'
    },
    telemetry: {
      enabled: true,
      spanPrefix: 'messaging'
    }
  },
  providerOptions: {
    transport: 'gmailapp' | 'chat_webhook' | 'chat_api' | 'slack_webhook' | 'slack_api' | 'teams_webhook'
  }
}
```

## Response shape

```javascript
{
  status: 'ok',
  operation: 'email_send',
  channel: 'email',
  transport: 'gmailapp',
  data: { ... },
  tracking: { ... },
  log: { ... },
  dryRun: {
    enabled: false,
    plannedRequest: null
  },
  warnings: [],
  raw: null
}
```

## Operation groups

- `email`: send, draft, search, thread/message reads, label updates
- `chat`: Google Chat + Slack + Teams sends, Google Chat message reads
- `tracking`: pixel URL build, link wrapping, event recording, web event handling
- `logs`: event list/get/delete

## Dry-run

- Mutation operations support `options.dryRun=true`.
- Dry-run validates request shape and returns `dryRun.plannedRequest`.
- No provider call or mutation is executed.

## Idempotency

- Send operations auto-generate idempotency keys when not provided.
- Optional override: `options.idempotencyKey`.
- Replay responses include warning: `idempotentReplay=true`.

## Config precedence

1. Request-level fields (`body`, `auth`, `options`)
2. Runtime config via `ASTX.Messaging.configure(...)`
3. Script Properties
4. Built-in defaults

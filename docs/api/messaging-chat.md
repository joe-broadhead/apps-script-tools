# Messaging Chat API

`ASTX.Messaging.chat` supports Google Chat, Slack, and Microsoft Teams transports.

## Methods

```javascript
ASTX.Messaging.chat.send(request)
ASTX.Messaging.chat.sendBatch(request)
ASTX.Messaging.chat.getMessage(request)
ASTX.Messaging.chat.listMessages(request)
```

## Transports

### 1) Webhook transport

```javascript
{
  body: {
    transport: 'webhook',
    webhookUrl: 'https://chat.googleapis.com/v1/spaces/...',
    message: {
      text: 'hello',
      cardsV2: [ ... ]
    }
  }
}
```

### 2) Chat API transport

```javascript
{
  body: {
    transport: 'chat_api',
    space: 'spaces/AAAA...',
    thread: {
      threadKey: 'optional',
      reply: false
    },
    message: {
      text: 'hello',
      cardsV2: [ ... ]
    }
  },
  auth: {
    oauthToken: 'optional override'
  }
}
```

If `auth.oauthToken` is omitted, the module uses `ScriptApp.getOAuthToken()`.

### 3) Slack webhook transport

```javascript
{
  body: {
    transport: 'slack_webhook',
    webhookUrl: 'https://hooks.slack.com/services/...',
    message: {
      text: 'hello',
      blocks: [ ... ]
    }
  }
}
```

### 4) Slack API transport

```javascript
{
  body: {
    transport: 'slack_api',
    channel: 'C12345678',
    message: {
      text: 'hello'
    }
  },
  auth: {
    slackBotToken: 'xoxb-...'
  }
}
```

If `body.channel` is omitted, runtime config can provide `MESSAGING_SLACK_CHANNEL`.

### 5) Teams webhook transport

```javascript
{
  body: {
    transport: 'teams_webhook',
    webhookUrl: 'https://outlook.office.com/webhook/...',
    message: {
      text: 'hello'
    }
  }
}
```

## Read methods

- `chat.getMessage`: requires `body.messageName` (`spaces/.../messages/...`).
- `chat.listMessages`: requires `body.space`, supports `body.pageSize` and `body.pageToken`.

## Notes

- `sendBatch` performs sequential sends.
- `chat.getMessage` and `chat.listMessages` use Google Chat API transport only.
- Non-2xx responses map to typed messaging errors.

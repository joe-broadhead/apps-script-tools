# Messaging Chat API

`ASTX.Messaging.chat` supports webhook and Chat API transports.

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

## Read methods

- `chat.getMessage`: requires `body.messageName` (`spaces/.../messages/...`).
- `chat.listMessages`: requires `body.space`, supports `body.pageSize` and `body.pageToken`.

## Notes

- `sendBatch` performs sequential sends.
- `chat.getMessage` and `chat.listMessages` use Chat API transport only.
- Non-2xx responses map to typed messaging errors.

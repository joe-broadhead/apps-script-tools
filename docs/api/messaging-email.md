# Messaging Email API

`ASTX.Messaging.email` provides GmailApp-first send and mailbox operations.

## Send methods

```javascript
ASTX.Messaging.email.send(request)
ASTX.Messaging.email.sendBatch(request)
ASTX.Messaging.email.createDraft(request)
ASTX.Messaging.email.sendDraft(request)
```

### `email.send` payload

```javascript
{
  body: {
    to: ['user@example.com'],
    subject: 'Required',
    textBody: 'Optional when htmlBody present',
    htmlBody: '<html>...</html>',
    template: {
      params: { key: 'value' } // for {{key}}
    },
    options: {
      cc: [],
      bcc: [],
      from: '',
      name: '',
      noReply: true,
      replyTo: '',
      attachments: [],
      inlineImages: {},
      track: {
        enabled: true,
        open: true,
        click: true
      }
    },
    metadata: {
      campaign: 'optional',
      tags: ['optional']
    }
  }
}
```

## Mailbox methods

```javascript
ASTX.Messaging.email.listThreads(request)
ASTX.Messaging.email.getThread(request)
ASTX.Messaging.email.searchMessages(request)
ASTX.Messaging.email.getMessage(request)
ASTX.Messaging.email.listLabels(request)
ASTX.Messaging.email.updateMessageLabels(request)
```

### Label update payload

```javascript
{
  body: {
    messageId: 'required',
    addLabels: ['optional'],
    removeLabels: ['optional']
  }
}
```

## Notes

- Uses `GmailApp` runtime APIs.
- `sendBatch` executes per-message send in sequence.
- `updateMessageLabels` creates missing labels when possible.
- For safe rollout, use `options.dryRun=true`.

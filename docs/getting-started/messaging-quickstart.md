# Messaging Quick Start

Use `AST.Messaging` for Google email plus Google Chat/Slack/Teams sends with optional tracking and durable delivery logs.

## Import pattern

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

## Configure defaults

```javascript
function configureMessaging() {
  const ASTX = ASTLib.AST || ASTLib;

  ASTX.Messaging.configure({
    MESSAGING_DEFAULT_FROM: 'alerts@example.com',
    MESSAGING_DEFAULT_REPLY_TO: 'support@example.com',
    MESSAGING_CHAT_WEBHOOK_URL: 'https://chat.googleapis.com/v1/spaces/...',
    MESSAGING_SLACK_WEBHOOK_URL: 'https://hooks.slack.com/services/...',
    MESSAGING_SLACK_BOT_TOKEN: 'xoxb-...',
    MESSAGING_SLACK_CHANNEL: 'C12345678',
    MESSAGING_TEAMS_WEBHOOK_URL: 'https://outlook.office.com/webhook/...',
    MESSAGING_TRACKING_ENABLED: 'true',
    MESSAGING_TRACKING_OPEN_ENABLED: 'true',
    MESSAGING_TRACKING_CLICK_ENABLED: 'true',
    MESSAGING_TRACKING_BASE_URL: 'https://your-webapp-url',
    MESSAGING_TRACKING_SIGNING_SECRET: 'replace-me',
    MESSAGING_LOG_BACKEND: 'drive_json',
    MESSAGING_LOG_NAMESPACE: 'ast_messaging',
    MESSAGING_LOG_DRIVE_FILE_NAME: 'ast_messaging_logs.json'
  });
}
```

## Send email

```javascript
function sendEmailExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const out = ASTX.Messaging.email.send({
    body: {
      to: ['user@example.com'],
      subject: 'Hello {{name}}',
      textBody: 'Hi {{name}}',
      htmlBody: '<p>Hi {{name}}</p><a href="https://example.com">Open</a>',
      template: {
        params: { name: 'Joe' }
      },
      options: {
        track: {
          enabled: true,
          open: true,
          click: true
        }
      }
    }
  });

  Logger.log(JSON.stringify(out, null, 2));
}
```

## Send Chat message (webhook)

```javascript
function sendChatWebhookExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const out = ASTX.Messaging.chat.send({
    body: {
      transport: 'webhook',
      webhookUrl: 'https://chat.googleapis.com/v1/spaces/...',
      message: {
        text: 'Pipeline completed successfully.'
      }
    }
  });

  Logger.log(JSON.stringify(out, null, 2));
}
```

## Send Chat message (Chat API)

```javascript
function sendChatApiExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const out = ASTX.Messaging.chat.send({
    body: {
      transport: 'chat_api',
      space: 'spaces/AAAA...',
      message: {
        text: 'Build completed.'
      },
      thread: {
        threadKey: 'build-123',
        reply: true
      }
    }
  });

  Logger.log(JSON.stringify(out, null, 2));
}
```

## Send Slack message

```javascript
function sendSlackExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const out = ASTX.Messaging.chat.send({
    body: {
      transport: 'slack_api',
      channel: 'C12345678',
      message: {
        text: 'Build completed.'
      }
    },
    auth: {
      slackBotToken: 'xoxb-...'
    }
  });

  Logger.log(JSON.stringify(out, null, 2));
}
```

## Send Teams message

```javascript
function sendTeamsExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const out = ASTX.Messaging.chat.send({
    body: {
      transport: 'teams_webhook',
      webhookUrl: 'https://outlook.office.com/webhook/...',
      message: {
        text: 'Release deployed successfully.'
      }
    }
  });

  Logger.log(JSON.stringify(out, null, 2));
}
```

## Logs and tracking events

```javascript
function listMessagingLogs() {
  const ASTX = ASTLib.AST || ASTLib;

  const out = ASTX.Messaging.logs.list({
    body: {
      limit: 50,
      offset: 0,
      includeEntries: true
    }
  });

  Logger.log(JSON.stringify(out.data.page, null, 2));
}
```

## Dry-run for safe rollout

```javascript
function dryRunEmailSend() {
  const ASTX = ASTLib.AST || ASTLib;

  const plan = ASTX.Messaging.email.send({
    body: {
      to: ['user@example.com'],
      subject: 'Dry run',
      textBody: 'No delivery'
    },
    options: {
      dryRun: true
    }
  });

  Logger.log(JSON.stringify(plan.dryRun.plannedRequest, null, 2));
}
```

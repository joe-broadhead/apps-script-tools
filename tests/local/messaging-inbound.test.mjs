import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadMessagingScripts } from './messaging-helpers.mjs';

function toHex(bytes = []) {
  return bytes.map(byte => {
    const normalized = byte < 0 ? byte + 256 : byte;
    return normalized.toString(16).padStart(2, '0');
  }).join('');
}

function buildSlackSignature(context, timestampSec, payloadRaw, secret) {
  const base = `v0:${timestampSec}:${payloadRaw}`;
  const bytes = context.Utilities.computeHmacSha256Signature(base, secret);
  return `v0=${toHex(bytes)}`;
}

test('inbound verify validates Slack signatures and blocks replay', () => {
  const context = createGasContext();
  loadMessagingScripts(context, { includeAst: true });

  context.AST.Messaging.configure({
    MESSAGING_INBOUND_SLACK_SIGNING_SECRET: 'slack-signing-secret',
    MESSAGING_INBOUND_REPLAY_BACKEND: 'memory',
    MESSAGING_INBOUND_REPLAY_NAMESPACE: 'msg_inbound_replay_test',
    MESSAGING_INBOUND_REPLAY_TTL_SEC: '600'
  });

  const payloadRaw = JSON.stringify({
    type: 'event_callback',
    event_id: 'evt_001',
    event: {
      type: 'message',
      text: 'hello'
    }
  });
  const timestampSec = Math.floor(Date.now() / 1000);
  const signature = buildSlackSignature(context, timestampSec, payloadRaw, 'slack-signing-secret');

  const verified = context.AST.Messaging.verifyInbound({
    body: {
      provider: 'slack',
      rawBody: payloadRaw,
      headers: {
        'x-slack-request-timestamp': String(timestampSec),
        'x-slack-signature': signature
      }
    }
  });

  assert.equal(verified.status, 'ok');
  assert.equal(verified.operation, 'inbound_verify');
  assert.equal(verified.data.verified, true);
  assert.equal(verified.data.verification.provider, 'slack');
  assert.equal(verified.data.verification.valid, true);

  assert.throws(
    () => context.AST.Messaging.verifyInbound({
      body: {
        provider: 'slack',
        rawBody: payloadRaw,
        headers: {
          'x-slack-request-timestamp': String(timestampSec),
          'x-slack-signature': signature
        }
      }
    }),
    /Inbound replay detected/
  );
});

test('inbound parse handles Slack form payload envelope', () => {
  const context = createGasContext();
  loadMessagingScripts(context, { includeAst: true });

  const embeddedPayload = JSON.stringify({
    type: 'event_callback',
    event_id: 'evt_002',
    event: {
      type: 'message',
      text: 'form encoded'
    }
  });

  const parsed = context.AST.Messaging.parseInbound({
    body: {
      provider: 'slack',
      rawBody: `payload=${encodeURIComponent(embeddedPayload)}`
    }
  });

  assert.equal(parsed.status, 'ok');
  assert.equal(parsed.operation, 'inbound_parse');
  assert.equal(parsed.data.parsed.provider, 'slack');
  assert.equal(parsed.data.parsed.eventType, 'message');
  assert.equal(parsed.data.parsed.text, 'form encoded');
});

test('inbound verify rejects stale Slack request timestamps', () => {
  const context = createGasContext();
  loadMessagingScripts(context, { includeAst: true });

  context.AST.Messaging.configure({
    MESSAGING_INBOUND_SLACK_SIGNING_SECRET: 'slack-signing-secret',
    MESSAGING_INBOUND_MAX_SKEW_SEC: '60'
  });

  const payloadRaw = JSON.stringify({
    type: 'event_callback',
    event_id: 'evt_stale_001',
    event: {
      type: 'message',
      text: 'stale'
    }
  });
  const staleTimestampSec = Math.floor(Date.now() / 1000) - 600;
  const signature = buildSlackSignature(context, staleTimestampSec, payloadRaw, 'slack-signing-secret');

  assert.throws(
    () => context.AST.Messaging.verifyInbound({
      body: {
        provider: 'slack',
        rawBody: payloadRaw,
        headers: {
          'x-slack-request-timestamp': String(staleTimestampSec),
          'x-slack-signature': signature
        }
      }
    }),
    /timestamp outside allowed skew/
  );
});

test('inbound route chooses provider-specific handler and executes function route', () => {
  const context = createGasContext();
  loadMessagingScripts(context, { includeAst: true });

  context.AST.Messaging.configure({
    MESSAGING_INBOUND_SLACK_SIGNING_SECRET: 'route-signing-secret'
  });

  const payloadRaw = JSON.stringify({
    type: 'event_callback',
    event_id: 'evt_route_1',
    event: {
      type: 'message',
      text: 'route this'
    }
  });
  const timestampSec = Math.floor(Date.now() / 1000);
  const signature = buildSlackSignature(context, timestampSec, payloadRaw, 'route-signing-secret');

  const routed = context.AST.Messaging.routeInbound({
    body: {
      provider: 'slack',
      rawBody: payloadRaw,
      headers: {
        'x-slack-request-timestamp': String(timestampSec),
        'x-slack-signature': signature
      },
      routes: {
        'slack:message': routeContext => ({
          ok: true,
          eventType: routeContext.eventType,
          text: routeContext.text
        }),
        default: () => ({ ok: false })
      }
    }
  });

  assert.equal(routed.status, 'ok');
  assert.equal(routed.operation, 'inbound_route');
  assert.equal(routed.data.route.key, 'slack:message');
  assert.equal(routed.data.route.handled, true);
  assert.equal(routed.data.output.ok, true);
  assert.equal(routed.data.output.eventType, 'message');
  assert.equal(routed.data.output.text, 'route this');
});

test('inbound verify supports Google Chat verification token flow', () => {
  const context = createGasContext();
  loadMessagingScripts(context, { includeAst: true });

  context.AST.Messaging.configure({
    MESSAGING_INBOUND_GOOGLE_CHAT_VERIFICATION_TOKEN: 'google-chat-token'
  });

  const verified = context.AST.Messaging.verifyInbound({
    body: {
      provider: 'google_chat',
      payload: {
        type: 'MESSAGE',
        token: 'google-chat-token',
        eventId: 'chat_evt_01',
        message: {
          text: 'hello'
        }
      }
    }
  });

  assert.equal(verified.status, 'ok');
  assert.equal(verified.data.verification.provider, 'google_chat');
  assert.equal(verified.data.verification.method, 'verification_token');
  assert.equal(verified.data.parsed.eventType, 'MESSAGE');
});

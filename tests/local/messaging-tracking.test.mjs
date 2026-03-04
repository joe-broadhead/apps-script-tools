import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadMessagingScripts } from './messaging-helpers.mjs';

test('tracking pixel, wrapping, record, and web event handling work with signatures', () => {
  const context = createGasContext();
  loadMessagingScripts(context, { includeAst: true });

  context.AST.Messaging.configure({
    MESSAGING_TRACKING_BASE_URL: 'https://example.com',
    MESSAGING_TRACKING_SIGNING_SECRET: 'secret-1',
    MESSAGING_LOG_BACKEND: 'memory'
  });

  const pixel = context.AST.Messaging.tracking.buildPixelUrl({
    body: {
      deliveryId: 'delivery_1',
      eventType: 'open',
      trackingHash: 'hash_1'
    }
  });

  assert.equal(pixel.status, 'ok');
  assert.equal(pixel.data.url.includes('/tracking/event?'), true);
  assert.equal(typeof pixel.data.signature, 'string');

  const wrapped = context.AST.Messaging.tracking.wrapLinks({
    body: {
      html: '<a href="https://example.org/path">click</a>',
      deliveryId: 'delivery_1',
      trackingHash: 'hash_1'
    }
  });

  assert.equal(wrapped.data.wrappedCount, 1);
  assert.equal(wrapped.data.html.includes('eventType=click'), true);

  const unsafeWrapped = context.AST.Messaging.tracking.wrapLinks({
    body: {
      html: '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">x</a><a href="vbscript:msgbox(1)">y</a><a href="jaVaScRiPt%3Aalert(1)">z</a>',
      deliveryId: 'delivery_unsafe',
      trackingHash: 'hash_unsafe'
    }
  });

  assert.equal(unsafeWrapped.data.wrappedCount, 0);
  assert.equal(unsafeWrapped.data.html.includes('eventType=click'), false);
  assert.equal(unsafeWrapped.data.html.includes('data:text/html;base64'), true);
  assert.equal(unsafeWrapped.data.html.includes('vbscript:msgbox(1)'), true);
  assert.equal(unsafeWrapped.data.html.includes('jaVaScRiPt%3Aalert(1)'), true);

  const recorded = context.AST.Messaging.tracking.recordEvent({
    body: {
      eventType: 'open',
      deliveryId: 'delivery_1',
      trackingHash: 'hash_1'
    }
  });

  assert.equal(recorded.status, 'ok');
  assert.equal(recorded.data.event.eventType, 'open');

  const canonical = context.astMessagingTrackingBuildCanonicalPayload('open', 'delivery_2', 'hash_2');
  const sig = context.astMessagingTrackingSignPayload(canonical, 'secret-1');
  const handled = context.AST.Messaging.tracking.handleWebEvent({
    body: {
      query: {
        eventType: 'open',
        deliveryId: 'delivery_2',
        trackingHash: 'hash_2',
        sig
      }
    }
  });

  assert.equal(handled.status, 'ok');
  assert.equal(handled.data.event.deliveryId, 'delivery_2');
  assert.equal(handled.data.pixel, true);
});

test('tracking wrapLinks skips links that fail click redirect validation', () => {
  const context = createGasContext();
  loadMessagingScripts(context, { includeAst: true });

  context.AST.Messaging.configure({
    MESSAGING_TRACKING_BASE_URL: 'https://tracker.example.com',
    MESSAGING_TRACKING_SIGNING_SECRET: 'secret-wrap',
    MESSAGING_TRACKING_ALLOWED_DOMAINS: 'example.com',
    MESSAGING_LOG_BACKEND: 'memory'
  });

  const wrapped = context.AST.Messaging.tracking.wrapLinks({
    body: {
      html: [
        '<a href="https://docs.example.com/path">ok</a>',
        '<a href="http://docs.example.com/path">http</a>',
        '<a href="/relative/path">relative</a>',
        '<a href="https://other.net/path">other</a>'
      ].join(' '),
      deliveryId: 'delivery_wrap_1',
      trackingHash: 'hash_wrap_1'
    }
  });

  assert.equal(wrapped.status, 'ok');
  assert.equal(wrapped.data.wrappedCount, 1);
  assert.equal((wrapped.data.html.match(/eventType=click/g) || []).length, 1);
  assert.equal(wrapped.data.html.includes('href="http://docs.example.com/path"'), true);
  assert.equal(wrapped.data.html.includes('href="/relative/path"'), true);
  assert.equal(wrapped.data.html.includes('href="https://other.net/path"'), true);
});

test('tracking web click events enforce https allowed-domain redirects', () => {
  const context = createGasContext();
  loadMessagingScripts(context, { includeAst: true });

  context.AST.Messaging.configure({
    MESSAGING_TRACKING_SIGNING_SECRET: 'secret-2',
    MESSAGING_TRACKING_ALLOWED_DOMAINS: 'example.com,.allowed.test',
    MESSAGING_LOG_BACKEND: 'memory'
  });

  const target = 'https://docs.example.com/path?a=1';
  const payload = context.astMessagingTrackingBuildCanonicalPayload('click', 'delivery_click_1', target);
  const sig = context.astMessagingTrackingSignPayload(payload, 'secret-2');

  const handled = context.AST.Messaging.tracking.handleWebEvent({
    body: {
      query: {
        eventType: 'click',
        deliveryId: 'delivery_click_1',
        trackingHash: 'hash_click_1',
        target,
        sig
      }
    }
  });

  assert.equal(handled.status, 'ok');
  assert.equal(handled.data.pixel, false);
  assert.equal(handled.data.redirectUrl, target);
});

test('tracking web click events reject non-https and disallowed hosts', () => {
  const context = createGasContext();
  loadMessagingScripts(context, { includeAst: true });

  context.AST.Messaging.configure({
    MESSAGING_TRACKING_SIGNING_SECRET: 'secret-3',
    MESSAGING_TRACKING_ALLOWED_DOMAINS: 'example.com',
    MESSAGING_LOG_BACKEND: 'memory'
  });

  const insecureTarget = 'http://example.com/path';
  const insecurePayload = context.astMessagingTrackingBuildCanonicalPayload('click', 'delivery_click_2', insecureTarget);
  const insecureSig = context.astMessagingTrackingSignPayload(insecurePayload, 'secret-3');

  assert.throws(
    () => context.AST.Messaging.tracking.handleWebEvent({
      body: {
        query: {
          eventType: 'click',
          deliveryId: 'delivery_click_2',
          trackingHash: 'hash_click_2',
          target: insecureTarget,
          sig: insecureSig
        }
      }
    }),
    /https scheme/i
  );

  const disallowedTarget = 'https://evil.example.net/path';
  const disallowedPayload = context.astMessagingTrackingBuildCanonicalPayload('click', 'delivery_click_3', disallowedTarget);
  const disallowedSig = context.astMessagingTrackingSignPayload(disallowedPayload, 'secret-3');

  assert.throws(
    () => context.AST.Messaging.tracking.handleWebEvent({
      body: {
        query: {
          eventType: 'click',
          deliveryId: 'delivery_click_3',
          trackingHash: 'hash_click_3',
          target: disallowedTarget,
          sig: disallowedSig
        }
      }
    }),
    /host is not allowed/i
  );

  const escapedAuthorityTarget = 'https://evil.com\\@example.com/path';
  const escapedAuthorityPayload = context.astMessagingTrackingBuildCanonicalPayload('click', 'delivery_click_4', escapedAuthorityTarget);
  const escapedAuthoritySig = context.astMessagingTrackingSignPayload(escapedAuthorityPayload, 'secret-3');

  assert.throws(
    () => context.AST.Messaging.tracking.handleWebEvent({
      body: {
        query: {
          eventType: 'click',
          deliveryId: 'delivery_click_4',
          trackingHash: 'hash_click_4',
          target: escapedAuthorityTarget,
          sig: escapedAuthoritySig
        }
      }
    }),
    /Invalid click redirect target URL/i
  );
});

test('tracking signature verification uses constant-time helper semantics', () => {
  const context = createGasContext();
  loadMessagingScripts(context, { includeAst: true });

  assert.equal(context.astMessagingTrackingConstantTimeEqual('abc123', 'abc123'), true);
  assert.equal(context.astMessagingTrackingConstantTimeEqual('abc123', 'abc124'), false);
  assert.equal(context.astMessagingTrackingConstantTimeEqual('abc123', 'abc1234'), false);
  assert.equal(context.astMessagingTrackingConstantTimeEqual('abc123', null), false);
});

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

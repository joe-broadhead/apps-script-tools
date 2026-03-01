import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadMessagingScripts } from './messaging-helpers.mjs';

test('log operations persist and paginate via configured backend', () => {
  const context = createGasContext();
  loadMessagingScripts(context, { includeAst: true });

  context.AST.Messaging.configure({
    MESSAGING_LOG_BACKEND: 'memory',
    MESSAGING_LOG_NAMESPACE: 'ast_messaging_logs_test'
  });

  const recorded = context.AST.Messaging.tracking.recordEvent({
    body: {
      eventType: 'open',
      deliveryId: 'delivery_123',
      trackingHash: 'hash_123'
    }
  });

  const eventId = recorded.data.log.eventId;
  assert.equal(typeof eventId, 'string');

  const listed = context.AST.Messaging.logs.list({
    body: {
      limit: 10,
      offset: 0,
      includeEntries: true
    }
  });

  assert.equal(listed.data.page.returned >= 1, true);

  const fetched = context.AST.Messaging.logs.get({ body: { eventId } });
  assert.equal(fetched.data.item.eventId, eventId);

  const deleted = context.AST.Messaging.logs.delete({ body: { eventId } });
  assert.equal(deleted.data.deleted, true);

  assert.throws(
    () => context.AST.Messaging.logs.get({ body: { eventId } }),
    /not found/i
  );
});

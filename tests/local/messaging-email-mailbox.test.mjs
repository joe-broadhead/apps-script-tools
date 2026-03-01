import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadMessagingScripts } from './messaging-helpers.mjs';

function createMockGmail() {
  const labels = new Map();

  const createLabelObject = name => ({
    getId: () => `lbl_${name}`,
    getName: () => name
  });

  const thread = {
    getId: () => 'thread_1',
    getFirstMessageSubject: () => 'Subject 1',
    getMessageCount: () => 1,
    getLastMessageDate: () => new Date('2026-01-01T10:00:00Z'),
    getMessages: () => [message]
  };

  const message = {
    getId: () => 'msg_1',
    getSubject: () => 'Subject 1',
    getFrom: () => 'sender@example.com',
    getTo: () => 'to@example.com',
    getCc: () => '',
    getBcc: () => '',
    getDate: () => new Date('2026-01-01T10:00:00Z'),
    getThread: () => thread,
    getPlainBody: () => 'Plain body',
    getBody: () => '<p>Html body</p>',
    addLabel: () => {},
    removeLabel: () => {}
  };

  labels.set('existing', createLabelObject('existing'));

  return {
    search: () => [thread],
    getThreadById: id => (id === 'thread_1' ? thread : null),
    getMessageById: id => (id === 'msg_1' ? message : null),
    getUserLabels: () => Array.from(labels.values()),
    getUserLabelByName: name => (labels.has(name) ? labels.get(name) : null),
    createLabel: name => {
      const label = createLabelObject(name);
      labels.set(name, label);
      return label;
    }
  };
}

test('email mailbox operations map thread/message/label payloads', () => {
  const context = createGasContext({
    GmailApp: createMockGmail()
  });
  loadMessagingScripts(context, { includeAst: true });

  const listThreads = context.AST.Messaging.email.listThreads({
    body: { query: 'subject:Subject', start: 0, max: 10 }
  });
  assert.equal(listThreads.status, 'ok');
  assert.equal(listThreads.data.count, 1);

  const getThread = context.AST.Messaging.email.getThread({ body: { threadId: 'thread_1' } });
  assert.equal(getThread.data.item.id, 'thread_1');
  assert.equal(getThread.data.item.messages.length, 1);

  const searchMessages = context.AST.Messaging.email.searchMessages({ body: { query: 'subject:Subject' } });
  assert.equal(searchMessages.data.count, 1);
  assert.equal(searchMessages.data.items[0].id, 'msg_1');

  const getMessage = context.AST.Messaging.email.getMessage({ body: { messageId: 'msg_1', includeBodies: true } });
  assert.equal(getMessage.data.item.id, 'msg_1');
  assert.equal(getMessage.data.item.htmlBody.includes('Html body'), true);

  const listLabels = context.AST.Messaging.email.listLabels({});
  assert.equal(Array.isArray(listLabels.data.items), true);
  assert.equal(listLabels.data.items.length >= 1, true);

  const updateLabels = context.AST.Messaging.email.updateMessageLabels({
    body: {
      messageId: 'msg_1',
      addLabels: ['new-label'],
      removeLabels: ['existing']
    }
  });
  assert.equal(updateLabels.data.added.length, 1);
  assert.equal(updateLabels.data.removed.length, 1);
});

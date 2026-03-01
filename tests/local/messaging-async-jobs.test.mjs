import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadMessagingScripts } from './messaging-helpers.mjs';

test('async mode enqueues AST.Jobs workflow instead of direct send', () => {
  let sendCalls = 0;
  let enqueueCalls = 0;

  const context = createGasContext({
    GmailApp: {
      sendEmail: () => {
        sendCalls += 1;
      }
    }
  });

  loadMessagingScripts(context, { includeAst: true });

  context.astJobsEnqueue = request => {
    enqueueCalls += 1;
    assert.equal(typeof request.name, 'string');
    assert.equal(Array.isArray(request.steps), true);
    return {
      id: 'job_123',
      status: 'queued'
    };
  };

  const response = context.AST.Messaging.email.send({
    body: {
      to: ['user@example.com'],
      subject: 'Hello',
      textBody: 'Body'
    },
    options: {
      async: {
        enabled: true,
        queue: 'jobs'
      }
    }
  });

  assert.equal(response.status, 'ok');
  assert.equal(response.data.queued, true);
  assert.equal(response.data.jobId, 'job_123');
  assert.equal(enqueueCalls, 1);
  assert.equal(sendCalls, 0);
});

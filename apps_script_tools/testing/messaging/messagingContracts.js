MESSAGING_CONTRACT_TESTS = [
  {
    description: 'AST.Messaging email send should support dryRun planning mode',
    test: () => {
      const response = AST.Messaging.email.send({
        body: {
          to: ['user@example.com'],
          subject: 'Hello',
          textBody: 'Body'
        },
        options: {
          dryRun: true
        }
      });

      if (response.status !== 'ok') {
        throw new Error(`Unexpected status: ${JSON.stringify(response)}`);
      }
      if (!response.dryRun || response.dryRun.enabled !== true) {
        throw new Error(`Expected dryRun enabled response, got ${JSON.stringify(response)}`);
      }
    }
  },
  {
    description: 'AST.Messaging tracking record/list/get/delete should persist log entries',
    test: () => {
      AST.Messaging.configure({
        MESSAGING_LOG_BACKEND: 'memory',
        MESSAGING_LOG_NAMESPACE: `ast_messaging_gas_${Date.now()}`
      });

      const recorded = AST.Messaging.tracking.recordEvent({
        body: {
          eventType: 'open',
          deliveryId: `delivery_${Date.now()}`,
          trackingHash: `hash_${Date.now()}`
        }
      });

      const eventId = recorded && recorded.data && recorded.data.log && recorded.data.log.eventId;
      if (!eventId) {
        throw new Error(`Expected eventId in tracking response, got ${JSON.stringify(recorded)}`);
      }

      const listed = AST.Messaging.logs.list({
        body: {
          limit: 10,
          offset: 0,
          includeEntries: true
        }
      });

      if (!listed || !listed.data || !listed.data.page || listed.data.page.returned < 1) {
        throw new Error(`Expected at least one log item, got ${JSON.stringify(listed)}`);
      }

      const fetched = AST.Messaging.logs.get({
        body: {
          eventId
        }
      });

      if (!fetched || !fetched.data || !fetched.data.item || fetched.data.item.eventId !== eventId) {
        throw new Error(`Expected fetched event ${eventId}, got ${JSON.stringify(fetched)}`);
      }

      const deleted = AST.Messaging.logs.delete({
        body: {
          eventId
        }
      });

      if (!deleted || !deleted.data || deleted.data.deleted !== true) {
        throw new Error(`Expected successful delete result, got ${JSON.stringify(deleted)}`);
      }

      AST.Messaging.clearConfig();
    }
  }
];

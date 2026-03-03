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
  },
  {
    description: 'AST.Messaging templates register/render and dry-run send should be deterministic',
    test: () => {
      AST.Messaging.configure({
        MESSAGING_TEMPLATE_BACKEND: 'memory',
        MESSAGING_TEMPLATE_NAMESPACE: `ast_messaging_templates_gas_${Date.now()}`
      });

      const registered = AST.Messaging.registerTemplate({
        body: {
          templateId: `sample_template_${Date.now()}`,
          channel: 'email',
          template: {
            subject: 'Hello {{name}}',
            textBody: 'Status {{status}}',
            variables: {
              name: { type: 'string', required: true },
              status: { type: 'string', required: true }
            }
          }
        }
      });

      const templateId = registered && registered.data && registered.data.templateId;
      if (!templateId) {
        throw new Error(`Expected templateId in register response, got ${JSON.stringify(registered)}`);
      }

      const rendered = AST.Messaging.renderTemplate({
        body: {
          templateId,
          variables: {
            name: 'Joe',
            status: 'ok'
          }
        }
      });

      if (!rendered || !rendered.data || !rendered.data.rendered || rendered.data.rendered.subject !== 'Hello Joe') {
        throw new Error(`Expected rendered template output, got ${JSON.stringify(rendered)}`);
      }

      const dryRun = AST.Messaging.sendTemplate({
        body: {
          templateId,
          to: ['user@example.com'],
          variables: {
            name: 'Joe',
            status: 'ok'
          }
        },
        options: {
          dryRun: true
        }
      });

      if (!dryRun || !dryRun.dryRun || dryRun.dryRun.enabled !== true) {
        throw new Error(`Expected dry-run sendTemplate result, got ${JSON.stringify(dryRun)}`);
      }

      AST.Messaging.clearConfig();
    }
  },
  {
    description: 'AST.Messaging inbound verify/route should parse and dispatch deterministic handlers',
    test: () => {
      AST.Messaging.configure({
        MESSAGING_INBOUND_GOOGLE_CHAT_VERIFICATION_TOKEN: 'gas-chat-token'
      });

      const verified = AST.Messaging.verifyInbound({
        body: {
          provider: 'google_chat',
          payload: {
            type: 'MESSAGE',
            token: 'gas-chat-token',
            eventId: `evt_${Date.now()}`,
            message: { text: 'hello' }
          }
        }
      });

      if (!verified || verified.status !== 'ok' || !verified.data || verified.data.verified !== true) {
        throw new Error(`Expected successful inbound verify response, got ${JSON.stringify(verified)}`);
      }

      const routed = AST.Messaging.routeInbound({
        body: {
          provider: 'google_chat',
          payload: {
            type: 'MESSAGE',
            token: 'gas-chat-token',
            eventId: `evt_route_${Date.now()}`,
            message: { text: 'route me' }
          },
          routes: {
            'google_chat:MESSAGE': routeContext => ({
              ok: true,
              text: routeContext.text
            }),
            default: () => ({ ok: false })
          }
        }
      });

      if (!routed || !routed.data || !routed.data.route || routed.data.route.key !== 'google_chat:MESSAGE') {
        throw new Error(`Expected routed key google_chat:MESSAGE, got ${JSON.stringify(routed)}`);
      }
      if (!routed.data.output || routed.data.output.ok !== true || routed.data.output.text !== 'route me') {
        throw new Error(`Expected routed handler output, got ${JSON.stringify(routed)}`);
      }

      AST.Messaging.clearConfig();
    }
  }
];

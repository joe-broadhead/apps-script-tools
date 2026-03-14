function runCookbookSmokeInternal_(config) {
  const ASTX = cookbookAst_();
  cookbookConfigureMessaging_(ASTX, config);

  const templateIds = cookbookRegisterTemplates_(ASTX);
  const rendered = ASTX.Messaging.renderTemplate({
    body: {
      templateId: templateIds.email,
      variables: {
        name: 'Cookbook User',
        status: 'green',
        release: '2026.03.14'
      }
    }
  });

  const emailPlan = ASTX.Messaging.sendTemplate({
    body: {
      templateId: templateIds.email,
      to: [config.MESSAGING_HUB_DEFAULT_EMAIL_TO],
      variables: {
        name: 'Cookbook User',
        status: 'green',
        release: '2026.03.14'
      }
    },
    options: {
      dryRun: true
    }
  });

  const chatPlan = ASTX.Messaging.chat.send({
    body: cookbookBuildSmokeChatRequest_(config),
    options: {
      dryRun: true
    }
  });

  const trackingEvent = ASTX.Messaging.tracking.recordEvent({
    body: {
      eventType: 'open',
      deliveryId: 'messaging_hub_smoke_delivery',
      trackingHash: 'messaging_hub_smoke_hash'
    }
  });

  const listedLogs = ASTX.Messaging.logs.list({
    body: {
      limit: 10,
      offset: 0,
      includeEntries: true
    }
  });

  const slackVerifyFixture = cookbookBuildSlackFixture_(config, {
    eventId: 'evt_messaging_hub_verify',
    text: 'verify this inbound slack message'
  });

  const slackRouteFixture = cookbookBuildSlackFixture_(config, {
    eventId: 'evt_messaging_hub_route',
    text: 'route this inbound slack message'
  });

  const slackVerified = ASTX.Messaging.verifyInbound({
    body: {
      provider: 'slack',
      rawBody: slackVerifyFixture.rawBody,
      headers: slackVerifyFixture.headers
    }
  });

  const slackRouted = ASTX.Messaging.routeInbound({
    body: {
      provider: 'slack',
      rawBody: slackRouteFixture.rawBody,
      headers: slackRouteFixture.headers,
      routes: {
        'slack:message': routeContext => ({
          ok: true,
          provider: routeContext.provider,
          eventType: routeContext.eventType,
          text: routeContext.text
        }),
        default: () => ({ ok: false })
      }
    }
  });

  const googleChatVerified = ASTX.Messaging.verifyInbound({
    body: {
      provider: 'google_chat',
      payload: cookbookBuildGoogleChatFixture_(config, {
        eventId: 'evt_google_chat_smoke',
        text: 'hello from google chat'
      })
    }
  });

  cookbookAssert_(rendered.data.rendered.subject === 'Release 2026.03.14 for Cookbook User', 'Rendered template subject did not match expected output.');
  cookbookAssert_(emailPlan.dryRun && emailPlan.dryRun.enabled === true, 'Email dry-run did not return enabled plan output.');
  cookbookAssert_(chatPlan.dryRun && chatPlan.dryRun.enabled === true, 'Chat dry-run did not return enabled plan output.');
  cookbookAssert_(slackVerified.data.verified === true, 'Slack fixture verification failed.');
  cookbookAssert_(slackRouted.data.route.handled === true, 'Slack route fixture was not handled.');
  cookbookAssert_(googleChatVerified.data.verified === true, 'Google Chat token verification failed.');
  cookbookAssert_(listedLogs.data.page.returned >= 1, 'Expected at least one messaging log entry.');

  return {
    status: 'ok',
    entrypoint: 'runCookbookSmoke',
    cookbook: cookbookName_(),
    appName: config.MESSAGING_HUB_APP_NAME,
    astVersion: ASTX.VERSION,
    operationsCount: ASTX.Messaging.operations().length,
    renderedPreview: rendered.data.rendered,
    emailPlan: {
      operation: emailPlan.operation,
      dryRun: emailPlan.dryRun.enabled,
      plannedOperation: emailPlan.dryRun.plannedRequest.operation
    },
    chatPlan: {
      transport: chatPlan.transport,
      dryRun: chatPlan.dryRun.enabled,
      plannedOperation: chatPlan.dryRun.plannedRequest.operation
    },
    trackingEventId: trackingEvent.data.log.eventId,
    logPage: listedLogs.data.page,
    slackVerification: slackVerified.data.verification,
    slackRoute: slackRouted.data.route,
    googleChatVerification: googleChatVerified.data.verification,
    generatedAt: new Date().toISOString()
  };
}

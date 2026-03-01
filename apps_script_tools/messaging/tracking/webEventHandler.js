function astMessagingHandleWebEvent(request = {}, resolvedConfig = {}) {
  const source = request && typeof request === 'object'
    ? request
    : {};

  const query = source.query && typeof source.query === 'object'
    ? source.query
    : (source.parameter && typeof source.parameter === 'object' ? source.parameter : {});

  const eventType = typeof query.eventType === 'string'
    ? query.eventType.trim().toLowerCase()
    : '';
  const deliveryId = typeof query.deliveryId === 'string'
    ? query.deliveryId.trim()
    : '';
  const trackingHash = typeof query.trackingHash === 'string'
    ? query.trackingHash.trim()
    : '';
  const target = typeof query.target === 'string'
    ? query.target.trim()
    : '';
  const signature = typeof query.sig === 'string'
    ? query.sig.trim()
    : '';

  if (!eventType || !deliveryId) {
    throw new AstMessagingTrackingError('tracking.handleWebEvent requires eventType and deliveryId', {
      query
    });
  }

  const secret = resolvedConfig && resolvedConfig.tracking
    ? resolvedConfig.tracking.signingSecret
    : '';

  const payload = astMessagingTrackingBuildCanonicalPayload(eventType, deliveryId, eventType === 'click' ? target : trackingHash);
  if (secret) {
    const valid = astMessagingTrackingVerifySignature(signature, payload, secret);
    if (!valid) {
      throw new AstMessagingTrackingError('Invalid tracking signature', {
        eventType,
        deliveryId
      });
    }
  }

  const recorded = astMessagingRecordTrackingEvent({
    body: {
      eventType,
      deliveryId,
      trackingHash,
      target,
      userAgent: source.userAgent || (source.headers && source.headers['User-Agent']) || '',
      ip: source.ip || '',
      metadata: {
        source: 'web'
      }
    }
  }, resolvedConfig);

  return {
    event: recorded.event,
    redirectUrl: eventType === 'click' ? target : null,
    pixel: eventType === 'open',
    log: recorded.log
  };
}

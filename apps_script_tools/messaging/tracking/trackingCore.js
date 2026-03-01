function astMessagingTrackingNormalizeString(value, fallback = null) {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function astMessagingTrackingNormalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {};
}

function astMessagingTrackingNormalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }
  return fallback;
}

function astMessagingTrackingGenerateId() {
  try {
    if (typeof Utilities !== 'undefined' && Utilities && typeof Utilities.getUuid === 'function') {
      const uuid = astMessagingTrackingNormalizeString(Utilities.getUuid(), '');
      if (uuid) {
        return uuid;
      }
    }
  } catch (_error) {
    // Fallback below.
  }

  return `trk_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
}

function astMessagingTrackingHash(value) {
  const source = String(value || '');
  if (typeof sha256Hash === 'function') {
    try {
      return sha256Hash(source);
    } catch (_error) {
      // Fallback below.
    }
  }

  if (typeof Utilities !== 'undefined' && Utilities && typeof Utilities.computeDigest === 'function') {
    try {
      const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, source, Utilities.Charset.UTF_8);
      return digest
        .map(byte => {
          const normalized = byte < 0 ? byte + 256 : byte;
          return (`0${normalized.toString(16)}`).slice(-2);
        })
        .join('');
    } catch (_error) {
      // Fallback below.
    }
  }

  return `hash_${source.length}_${source.slice(0, 32)}`;
}

function astMessagingTrackingBuildCanonicalPayload(eventType, deliveryId, target = '') {
  return `${eventType}:${deliveryId}:${target}`;
}

function astMessagingTrackingSignPayload(payload, secret) {
  const normalizedSecret = astMessagingTrackingNormalizeString(secret, null);
  if (!normalizedSecret) {
    return null;
  }

  if (typeof Utilities !== 'undefined' && Utilities && typeof Utilities.computeHmacSha256Signature === 'function') {
    try {
      const digest = Utilities.computeHmacSha256Signature(payload, normalizedSecret);
      return digest
        .map(byte => {
          const normalized = byte < 0 ? byte + 256 : byte;
          return (`0${normalized.toString(16)}`).slice(-2);
        })
        .join('');
    } catch (_error) {
      // Fallback below.
    }
  }

  return astMessagingTrackingHash(`${payload}:${normalizedSecret}`);
}

function astMessagingTrackingVerifySignature(signature, payload, secret) {
  const normalizedSignature = astMessagingTrackingNormalizeString(signature, null);
  if (!normalizedSignature) {
    return false;
  }

  const expected = astMessagingTrackingSignPayload(payload, secret);
  return Boolean(expected && expected === normalizedSignature);
}

function astMessagingTrackingEncodeQueryValue(value) {
  return encodeURIComponent(String(value == null ? '' : value));
}

function astMessagingTrackingBuildUrl(baseUrl, pathName, params = {}) {
  const normalizedBase = astMessagingTrackingNormalizeString(baseUrl, '');
  if (!normalizedBase) {
    throw new AstMessagingTrackingError('Tracking base URL is required');
  }

  const query = Object.keys(params)
    .filter(key => typeof params[key] !== 'undefined' && params[key] !== null)
    .map(key => `${astMessagingTrackingEncodeQueryValue(key)}=${astMessagingTrackingEncodeQueryValue(params[key])}`)
    .join('&');

  const path = pathName && pathName.charAt(0) === '/'
    ? pathName
    : `/${pathName || ''}`;

  return `${normalizedBase.replace(/\/$/, '')}${path}${query ? `?${query}` : ''}`;
}

function astMessagingBuildPixelUrl(request = {}, resolvedConfig = {}) {
  const body = astMessagingTrackingNormalizeObject(request.body || request);
  const trackingConfig = astMessagingTrackingNormalizeObject(resolvedConfig.tracking);

  const deliveryId = astMessagingTrackingNormalizeString(body.deliveryId, null);
  if (!deliveryId) {
    throw new AstMessagingTrackingError("Missing required field 'deliveryId' for pixel URL");
  }

  const eventType = astMessagingTrackingNormalizeString(body.eventType, 'open');
  const trackingHash = astMessagingTrackingNormalizeString(body.trackingHash, astMessagingTrackingHash(`${deliveryId}:${eventType}`));
  const baseUrl = astMessagingTrackingNormalizeString(body.baseUrl, trackingConfig.baseUrl || '');

  const payload = astMessagingTrackingBuildCanonicalPayload(eventType, deliveryId, trackingHash);
  const signature = astMessagingTrackingSignPayload(payload, trackingConfig.signingSecret || body.signingSecret || '');

  const url = astMessagingTrackingBuildUrl(baseUrl, '/tracking/event', {
    eventType,
    deliveryId,
    trackingHash,
    sig: signature
  });

  return {
    eventType,
    deliveryId,
    trackingHash,
    url,
    signature
  };
}

function astMessagingWrapLinks(request = {}, resolvedConfig = {}) {
  const body = astMessagingTrackingNormalizeObject(request.body || request);
  const trackingConfig = astMessagingTrackingNormalizeObject(resolvedConfig.tracking);

  const html = astMessagingTrackingNormalizeString(body.html, '');
  const deliveryId = astMessagingTrackingNormalizeString(body.deliveryId, null);
  if (!deliveryId) {
    throw new AstMessagingTrackingError("Missing required field 'deliveryId' for link wrapping");
  }

  const trackingHash = astMessagingTrackingNormalizeString(body.trackingHash, astMessagingTrackingHash(`${deliveryId}:click`));
  const baseUrl = astMessagingTrackingNormalizeString(body.baseUrl, trackingConfig.baseUrl || '');

  let wrappedCount = 0;
  const wrappedHtml = html.replace(/href\s*=\s*(["'])([^"']+)\1/gi, (_match, quote, href) => {
    const original = astMessagingTrackingNormalizeString(href, '');
    if (!original || original.startsWith('#') || original.startsWith('mailto:') || original.startsWith('javascript:')) {
      return `href=${quote}${href}${quote}`;
    }

    const payload = astMessagingTrackingBuildCanonicalPayload('click', deliveryId, original);
    const signature = astMessagingTrackingSignPayload(payload, trackingConfig.signingSecret || body.signingSecret || '');

    const trackedUrl = astMessagingTrackingBuildUrl(baseUrl, '/tracking/event', {
      eventType: 'click',
      deliveryId,
      trackingHash,
      target: original,
      sig: signature
    });

    wrappedCount += 1;
    return `href=${quote}${trackedUrl}${quote}`;
  });

  return {
    html: wrappedHtml,
    wrappedCount,
    deliveryId,
    trackingHash
  };
}

function astMessagingPrepareEmailTracking(body = {}, resolvedConfig = {}) {
  const options = astMessagingTrackingNormalizeObject(body.options);
  const trackOptions = astMessagingTrackingNormalizeObject(options.track);
  const trackingConfig = astMessagingTrackingNormalizeObject(resolvedConfig.tracking);

  const enabled = astMessagingTrackingNormalizeBoolean(trackOptions.enabled, trackingConfig.enabled === true);
  if (!enabled) {
    return {
      enabled: false,
      deliveryId: null,
      trackingHash: null,
      pixelUrl: null,
      clickWrapped: false
    };
  }

  const deliveryId = astMessagingTrackingNormalizeString(body.deliveryId, astMessagingTrackingGenerateId());
  const trackingHash = astMessagingTrackingNormalizeString(body.trackingHash, astMessagingTrackingHash(`${deliveryId}:${Date.now()}`));

  const openEnabled = astMessagingTrackingNormalizeBoolean(trackOptions.open, trackingConfig.openEnabled === true);
  const clickEnabled = astMessagingTrackingNormalizeBoolean(trackOptions.click, trackingConfig.clickEnabled === true);

  let pixelUrl = null;
  if (openEnabled) {
    pixelUrl = astMessagingBuildPixelUrl({
      deliveryId,
      trackingHash,
      eventType: 'open'
    }, resolvedConfig).url;
  }

  return {
    enabled: true,
    openEnabled,
    clickEnabled,
    deliveryId,
    trackingHash,
    pixelUrl,
    clickWrapped: false
  };
}

function astMessagingRecordTrackingEvent(request = {}, resolvedConfig = {}) {
  const body = astMessagingTrackingNormalizeObject(request.body || request);
  const eventType = astMessagingTrackingNormalizeString(body.eventType, null);
  const deliveryId = astMessagingTrackingNormalizeString(body.deliveryId, null);

  if (!eventType) {
    throw new AstMessagingTrackingError("Missing required field 'eventType'");
  }
  if (!deliveryId) {
    throw new AstMessagingTrackingError("Missing required field 'deliveryId'");
  }

  const event = {
    eventType,
    deliveryId,
    trackingHash: astMessagingTrackingNormalizeString(body.trackingHash, ''),
    target: astMessagingTrackingNormalizeString(body.target, ''),
    userAgent: astMessagingTrackingNormalizeString(body.userAgent, ''),
    ip: astMessagingTrackingNormalizeString(body.ip, ''),
    timestamp: new Date().toISOString(),
    metadata: astMessagingTrackingNormalizeObject(body.metadata)
  };

  const log = astMessagingLogWrite({
    operation: 'tracking_record_event',
    channel: 'tracking',
    status: 'ok',
    payload: event,
    metadata: {
      source: 'tracking'
    }
  }, resolvedConfig);

  return {
    event,
    log
  };
}

function astMessagingTrackingNormalizeAllowedDomains(value) {
  const source = Array.isArray(value)
    ? value
    : (typeof value === 'string' ? value.split(',') : []);
  const output = [];
  const seen = {};

  for (let idx = 0; idx < source.length; idx += 1) {
    const raw = typeof source[idx] === 'string' ? source[idx].trim().toLowerCase() : '';
    if (!raw) {
      continue;
    }
    const normalized = raw.replace(/^\./, '').replace(/\.$/, '');
    if (!normalized || seen[normalized]) {
      continue;
    }
    seen[normalized] = true;
    output.push(normalized);
  }

  return output;
}

function astMessagingTrackingIsAllowedRedirectHost(hostname, allowedDomains) {
  if (!allowedDomains || allowedDomains.length === 0) {
    return true;
  }

  const normalizedHost = String(hostname || '').trim().toLowerCase().replace(/\.$/, '');
  if (!normalizedHost) {
    return false;
  }

  for (let idx = 0; idx < allowedDomains.length; idx += 1) {
    const allowed = String(allowedDomains[idx] || '').trim().toLowerCase().replace(/^\./, '').replace(/\.$/, '');
    if (!allowed) {
      continue;
    }
    if (normalizedHost === allowed || normalizedHost.endsWith(`.${allowed}`)) {
      return true;
    }
  }

  return false;
}

function astMessagingTrackingParseRedirectTarget(target) {
  const normalizedTarget = typeof target === 'string' ? target.trim() : '';
  if (!normalizedTarget || /[\u0000-\u001F\u007F]/.test(normalizedTarget)) {
    throw new AstMessagingTrackingError('Invalid click redirect target URL', {
      target: normalizedTarget
    });
  }

  const schemePrefixMatch = normalizedTarget.match(/^([a-z][a-z0-9+.-]*):\/\//i);
  if (schemePrefixMatch) {
    const authorityCandidate = normalizedTarget
      .slice(schemePrefixMatch[0].length)
      .split(/[/?#]/, 1)[0];
    if (authorityCandidate.includes('\\') || /%5c/i.test(authorityCandidate)) {
      throw new AstMessagingTrackingError('Invalid click redirect target URL', {
        target: normalizedTarget
      });
    }
  }

  if (typeof URL === 'function') {
    try {
      const parsedUrl = new URL(normalizedTarget);
      return {
        target: parsedUrl.toString(),
        protocol: String(parsedUrl.protocol || '').toLowerCase(),
        hostname: String(parsedUrl.hostname || '').trim().toLowerCase()
      };
    } catch (_error) {
      // Fallback parser below for runtimes without complete URL support.
    }
  }

  const schemeMatch = normalizedTarget.match(/^([a-z][a-z0-9+.-]*):\/\//i);

  if (!schemeMatch) {
    throw new AstMessagingTrackingError('Invalid click redirect target URL', {
      target: normalizedTarget
    });
  }

  const protocol = `${String(schemeMatch[1] || '').toLowerCase()}:`;
  const afterScheme = normalizedTarget.slice(schemeMatch[0].length);
  const authority = afterScheme.split(/[\/\\?#]/, 1)[0];

  if (!authority || /\s/.test(authority)) {
    throw new AstMessagingTrackingError('Invalid click redirect target URL', {
      target: normalizedTarget
    });
  }

  const userInfoIndex = authority.lastIndexOf('@');
  const hostPort = userInfoIndex >= 0 ? authority.slice(userInfoIndex + 1) : authority;
  let hostname = hostPort;

  if (!hostname) {
    throw new AstMessagingTrackingError('Invalid click redirect target URL', {
      target: normalizedTarget
    });
  }

  if (hostname.charAt(0) === '[') {
    const closingBracket = hostname.indexOf(']');
    if (closingBracket <= 1) {
      throw new AstMessagingTrackingError('Invalid click redirect target URL', {
        target: normalizedTarget
      });
    }
    hostname = hostname.slice(1, closingBracket);
  } else {
    hostname = hostname.split(':', 1)[0];
  }

  hostname = String(hostname || '').trim().toLowerCase();
  if (!hostname) {
    throw new AstMessagingTrackingError('Invalid click redirect target URL', {
      target: normalizedTarget
    });
  }

  return {
    target: normalizedTarget,
    protocol,
    hostname
  };
}

function astMessagingTrackingValidateRedirectTarget(target, allowedDomains) {
  const normalizedTarget = typeof target === 'string' ? target.trim() : '';
  if (!normalizedTarget) {
    throw new AstMessagingTrackingError('tracking.handleWebEvent requires target for click events', {
      target
    });
  }
  const parsed = astMessagingTrackingParseRedirectTarget(normalizedTarget);

  if (parsed.protocol !== 'https:') {
    throw new AstMessagingTrackingError('Click redirect target must use https scheme', {
      target: parsed.target,
      protocol: parsed.protocol
    });
  }

  if (!astMessagingTrackingIsAllowedRedirectHost(parsed.hostname, allowedDomains)) {
    throw new AstMessagingTrackingError('Click redirect target host is not allowed', {
      target: parsed.target,
      hostname: parsed.hostname,
      allowedDomains
    });
  }

  return parsed.target;
}

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
  const allowedDomains = astMessagingTrackingNormalizeAllowedDomains(
    resolvedConfig && resolvedConfig.tracking
      ? resolvedConfig.tracking.allowedDomains
      : []
  );

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

  const validatedTarget = eventType === 'click'
    ? astMessagingTrackingValidateRedirectTarget(target, allowedDomains)
    : target;

  const recorded = astMessagingRecordTrackingEvent({
    body: {
      eventType,
      deliveryId,
      trackingHash,
      target: validatedTarget,
      userAgent: source.userAgent || (source.headers && source.headers['User-Agent']) || '',
      ip: source.ip || '',
      metadata: {
        source: 'web'
      }
    }
  }, resolvedConfig);

  return {
    event: recorded.event,
    redirectUrl: eventType === 'click' ? validatedTarget : null,
    pixel: eventType === 'open',
    log: recorded.log
  };
}

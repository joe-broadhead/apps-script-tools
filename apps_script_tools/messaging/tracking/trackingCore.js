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

const AST_MESSAGING_TRACKING_NON_TRACKABLE_SCHEMES = Object.freeze([
  'mailto',
  'tel',
  'sms',
  'cid'
]);

const AST_MESSAGING_TRACKING_UNSAFE_SCHEMES = Object.freeze([
  'javascript',
  'data',
  'vbscript'
]);

function astMessagingTrackingSafeDecodeUriComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch (_error) {
    return value;
  }
}

function astMessagingTrackingGetUrlScheme(value) {
  const normalized = astMessagingTrackingNormalizeString(value, '');
  if (!normalized) {
    return '';
  }

  // Canonicalize control/whitespace-obfuscated schemes before scheme extraction.
  const sanitized = normalized
    .replace(/^[\s\u0000-\u001F\u007F]+/, '')
    .replace(/[\s\u0000-\u001F\u007F]+/g, '');
  const decoded = astMessagingTrackingSafeDecodeUriComponent(sanitized);
  const lower = decoded.toLowerCase();
  const match = lower.match(/^([a-z][a-z0-9+.-]*):/);
  return match ? match[1] : '';
}

function astMessagingTrackingIsSchemeInList(scheme, values) {
  return Boolean(
    scheme
    && Array.isArray(values)
    && values.indexOf(scheme) !== -1
  );
}

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
      throw new AstMessagingTrackingError('Invalid click redirect target URL', {
        target: normalizedTarget
      });
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
  let portToken = null;

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
    const suffix = hostname.slice(closingBracket + 1);
    if (suffix) {
      if (suffix.charAt(0) !== ':') {
        throw new AstMessagingTrackingError('Invalid click redirect target URL', {
          target: normalizedTarget
        });
      }
      portToken = suffix.slice(1);
    }
    hostname = hostname.slice(1, closingBracket);
  } else {
    const separatorIndex = hostname.indexOf(':');
    if (separatorIndex >= 0) {
      portToken = hostname.slice(separatorIndex + 1);
      hostname = hostname.slice(0, separatorIndex);
    }
  }

  if (portToken != null) {
    if (!/^[0-9]+$/.test(portToken)) {
      throw new AstMessagingTrackingError('Invalid click redirect target URL', {
        target: normalizedTarget
      });
    }
    const portNumber = Number(portToken);
    if (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65535) {
      throw new AstMessagingTrackingError('Invalid click redirect target URL', {
        target: normalizedTarget
      });
    }
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
  return Boolean(expected && astMessagingTrackingConstantTimeEqual(expected, normalizedSignature));
}

function astMessagingTrackingConstantTimeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') {
    return false;
  }

  const leftLength = left.length;
  const rightLength = right.length;
  const compareLength = Math.max(leftLength, rightLength);
  let mismatch = leftLength ^ rightLength;

  for (let idx = 0; idx < compareLength; idx += 1) {
    const leftCode = idx < leftLength ? left.charCodeAt(idx) : 0;
    const rightCode = idx < rightLength ? right.charCodeAt(idx) : 0;
    mismatch |= leftCode ^ rightCode;
  }

  return mismatch === 0;
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
  const allowedDomains = astMessagingTrackingNormalizeAllowedDomains(
    trackingConfig.allowedDomains || body.allowedDomains || []
  );

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
    const scheme = astMessagingTrackingGetUrlScheme(original);
    if (
      !original
      || original.startsWith('#')
      || astMessagingTrackingIsSchemeInList(scheme, AST_MESSAGING_TRACKING_NON_TRACKABLE_SCHEMES)
      || astMessagingTrackingIsSchemeInList(scheme, AST_MESSAGING_TRACKING_UNSAFE_SCHEMES)
    ) {
      return `href=${quote}${href}${quote}`;
    }

    try {
      astMessagingTrackingValidateRedirectTarget(original, allowedDomains);
    } catch (_error) {
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

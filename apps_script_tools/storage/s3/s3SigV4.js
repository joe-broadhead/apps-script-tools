function astS3ToUnsignedByte(value) {
  return value < 0 ? value + 256 : value;
}

function astS3BytesToHex(bytes = []) {
  let output = '';
  for (let idx = 0; idx < bytes.length; idx += 1) {
    const hex = astS3ToUnsignedByte(bytes[idx]).toString(16);
    output += hex.length === 1 ? `0${hex}` : hex;
  }
  return output;
}

function astS3Sha256Hex(data) {
  if (
    typeof Utilities === 'undefined' ||
    !Utilities ||
    typeof Utilities.computeDigest !== 'function' ||
    !Utilities.DigestAlgorithm ||
    !Utilities.DigestAlgorithm.SHA_256
  ) {
    throw new AstStorageAuthError('Utilities.computeDigest with SHA_256 is required for S3 signing');
  }

  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, data);
  return astS3BytesToHex(digest);
}

function astS3HmacSha256(key, message) {
  if (
    typeof Utilities === 'undefined' ||
    !Utilities ||
    typeof Utilities.computeHmacSha256Signature !== 'function'
  ) {
    throw new AstStorageAuthError('Utilities.computeHmacSha256Signature is required for S3 signing');
  }

  return Utilities.computeHmacSha256Signature(message, key);
}

function astS3BuildSigningKey(secretAccessKey, dateStamp, region, service = 's3') {
  const kDate = astS3HmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = astS3HmacSha256(kDate, region);
  const kService = astS3HmacSha256(kRegion, service);
  return astS3HmacSha256(kService, 'aws4_request');
}

function astS3FormatAmzDate(date = new Date()) {
  const iso = new Date(date).toISOString();
  const amzDate = iso.replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  return {
    amzDate,
    dateStamp
  };
}

function astS3EncodeUriPath(location) {
  const bucket = astStorageNormalizeBucket(location.bucket);
  const key = astStorageNormalizeKey(location.key || '');
  const encodedSegments = key
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');

  if (!encodedSegments) {
    return `/${encodeURIComponent(bucket)}`;
  }

  return `/${encodeURIComponent(bucket)}/${encodedSegments}`;
}

function astS3CanonicalQuery(params = {}) {
  const entries = Object.keys(params)
    .filter(key => params[key] !== null && typeof params[key] !== 'undefined')
    .map(key => [String(key), String(params[key])])
    .sort((a, b) => a[0].localeCompare(b[0]));

  return entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

function astS3CanonicalHeaders(headers = {}) {
  const entries = Object.keys(headers)
    .map(key => [String(key).toLowerCase().trim(), String(headers[key]).trim().replace(/\s+/g, ' ')])
    .sort((a, b) => a[0].localeCompare(b[0]));

  return {
    canonicalHeaders: entries.map(([key, value]) => `${key}:${value}\n`).join(''),
    signedHeaders: entries.map(([key]) => key).join(';')
  };
}

function astS3NormalizeEndpoint(endpoint, region) {
  const normalized = astStorageNormalizeString(endpoint, '');

  if (!normalized) {
    return `https://s3.${region}.amazonaws.com`;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized.replace(/\/+$/, '');
  }

  return `https://${normalized.replace(/\/+$/, '')}`;
}

function astS3ExtractHost(endpointUrl) {
  return endpointUrl
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '');
}

function astS3SignRequest({
  method,
  location,
  query = {},
  payload = '',
  headers = {},
  config,
  requestDate = new Date()
}) {
  const endpoint = astS3NormalizeEndpoint(config.endpoint, config.region);
  const host = astS3ExtractHost(endpoint);
  const uriPath = astS3EncodeUriPath(location);
  const canonicalQuery = astS3CanonicalQuery(query);

  const payloadHash = astS3Sha256Hex(payload || '');
  const { amzDate, dateStamp } = astS3FormatAmzDate(requestDate);

  const mergedHeaders = Object.assign({}, headers, {
    host,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash
  });

  if (config.sessionToken) {
    mergedHeaders['x-amz-security-token'] = config.sessionToken;
  }

  const canonicalHeaders = astS3CanonicalHeaders(mergedHeaders);
  const canonicalRequest = [
    method.toUpperCase(),
    uriPath,
    canonicalQuery,
    canonicalHeaders.canonicalHeaders,
    canonicalHeaders.signedHeaders,
    payloadHash
  ].join('\n');

  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    astS3Sha256Hex(canonicalRequest)
  ].join('\n');

  const signingKey = astS3BuildSigningKey(config.secretAccessKey, dateStamp, config.region);
  const signature = astS3BytesToHex(astS3HmacSha256(signingKey, stringToSign));

  const authorization = [
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}`,
    `SignedHeaders=${canonicalHeaders.signedHeaders}`,
    `Signature=${signature}`
  ].join(', ');

  const signedHeaders = Object.assign({}, mergedHeaders, {
    Authorization: authorization
  });

  const baseUrl = `${endpoint}${uriPath}`;
  const url = canonicalQuery ? `${baseUrl}?${canonicalQuery}` : baseUrl;

  return {
    url,
    headers: signedHeaders,
    canonicalRequest,
    stringToSign,
    signature,
    payloadHash
  };
}

function buildUserContext_() {
  var email = '';
  var locale = '';
  var timeZone = '';
  var userKey = '';

  try { email = stringOrEmpty_(Session.getActiveUser().getEmail()); } catch (_e) { email = ''; }
  try { locale = stringOrEmpty_(Session.getActiveUserLocale()); } catch (_e2) { locale = ''; }
  try { timeZone = stringOrEmpty_(Session.getScriptTimeZone()); } catch (_e3) { timeZone = ''; }
  try { userKey = stringOrEmpty_(Session.getTemporaryActiveUserKey()); } catch (_e4) { userKey = ''; }

  var idBase = email || userKey || 'anonymous';
  return {
    email: email,
    emailHash: hashUserIdentifier_(idBase),
    locale: locale,
    timeZone: timeZone,
    userKey: userKey
  };
}

function hashUserIdentifier_(value) {
  var raw = stringOrEmpty_(value);
  if (!raw) return '';

  try {
    var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
    return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '').slice(0, 24);
  } catch (_e) {
    return raw.slice(0, 24);
  }
}

function firstNonEmpty_(values) {
  values = Array.isArray(values) ? values : [values];
  for (var i = 0; i < values.length; i += 1) {
    var value = values[i];
    if (value == null) continue;
    var normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return '';
}

function stringOrEmpty_(value) {
  return value == null ? '' : String(value);
}

function numberOr_(value, fallback) {
  var n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function integerOr_(value, fallback) {
  var n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function booleanOr_(value, fallback) {
  if (typeof value === 'boolean') return value;
  var normalized = stringOrEmpty_(value).toLowerCase();
  if (!normalized) return fallback;
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  return fallback;
}

function nowIso_() {
  return new Date().toISOString();
}

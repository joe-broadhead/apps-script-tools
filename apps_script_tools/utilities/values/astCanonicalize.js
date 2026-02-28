/**
 * Canonicalization helpers used for key-based comparisons across records/arrays.
 *
 * Design goals:
 * - deterministic keys for objects/arrays irrespective of object key order
 * - treat undefined and missing values as null for key comparisons
 * - preserve primitive type distinctions (e.g. "1" vs 1)
 */
function astCanonicalizeValue(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (value instanceof Date) {
    const timestamp = value.getTime();
    if (Number.isNaN(timestamp)) {
      return { __ast_type: 'invalid_date' };
    }
    return { __ast_type: 'date', value: value.toISOString() };
  }

  if (typeof value === 'number') {
    if (Number.isNaN(value)) {
      return { __ast_type: 'nan' };
    }
    if (value === Infinity) {
      return { __ast_type: 'infinity' };
    }
    if (value === -Infinity) {
      return { __ast_type: 'negative_infinity' };
    }
    if (Object.is(value, -0)) {
      return { __ast_type: 'negative_zero' };
    }
    return value;
  }

  if (typeof value === 'bigint') {
    return { __ast_type: 'bigint', value: String(value) };
  }

  if (Array.isArray(value)) {
    return value.map(item => astCanonicalizeValue(item));
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    const out = {};

    for (const key of keys) {
      out[key] = astCanonicalizeValue(value[key]);
    }

    return out;
  }

  if (typeof value === 'symbol') {
    return { __ast_type: 'symbol', value: String(value) };
  }

  if (typeof value === 'function') {
    return { __ast_type: 'function', value: String(value) };
  }

  return value;
}

function astStableKey(value) {
  return JSON.stringify(astCanonicalizeValue(value));
}

function astBuildValuesKey(values) {
  const normalized = new Array(values.length);

  for (let idx = 0; idx < values.length; idx++) {
    normalized[idx] = astCanonicalizeValue(values[idx]);
  }

  return JSON.stringify(normalized);
}

function astBuildRecordKey(record, keys = []) {
  const keyTuples = new Array(keys.length);

  for (let idx = 0; idx < keys.length; idx++) {
    const key = keys[idx];
    const hasKey = Object.prototype.hasOwnProperty.call(record, key);
    const value = hasKey ? record[key] : null;
    keyTuples[idx] = [key, astCanonicalizeValue(value)];
  }

  return JSON.stringify(keyTuples);
}

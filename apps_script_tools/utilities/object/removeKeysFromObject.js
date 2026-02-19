/**
 * @function removeKeysFromObject
 * @description Removes specified keys from an object and returns a new object without those keys.
 * @param {Object} obj
 * @param {Array<String>} [keysToRemove = []]
 * @returns {Object}
 */
function removeKeysFromObject(obj, keysToRemove = []) {
  const blocked = new Set(keysToRemove);
  const out = {};

  for (const key of Object.keys(obj)) {
    if (!blocked.has(key)) {
      out[key] = obj[key];
    }
  }

  return out;
}

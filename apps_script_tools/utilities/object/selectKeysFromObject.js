/**
 * @function selectKeysFromObject
 * @description Selects specific keys from an object and returns a new object containing only those keys.
 * @param {Object} obj
 * @param {Array<String>} [keysToSelect = []]
 * @returns {Object}
 */
function selectKeysFromObject(obj, keysToSelect = []) {
  const out = {};

  for (let idx = 0; idx < keysToSelect.length; idx++) {
    const key = keysToSelect[idx];
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      out[key] = obj[key];
    }
  }

  return out;
}

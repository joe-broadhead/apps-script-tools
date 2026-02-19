/**
 * @function renameKeysInObject
 * @description Renames object keys based on keyMap.
 * @param {Object} obj
 * @param {Object} keyMap
 * @returns {Object}
 */
function renameKeysInObject(obj, keyMap) {
  const out = {};

  for (const key of Object.keys(obj)) {
    const mapped = Object.prototype.hasOwnProperty.call(keyMap, key) ? keyMap[key] : key;
    out[mapped] = obj[key];
  }

  return out;
}

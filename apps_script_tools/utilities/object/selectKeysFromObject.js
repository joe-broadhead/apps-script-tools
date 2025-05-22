/**
 * @function selectKeysFromObject
 * @description Selects specific keys from an object and returns a new object containing only those keys. 
 *              If a key does not exist in the object, it is ignored.
 * @param {Object} obj - The input object from which keys should be selected.
 * @param {Array<String>} [keysToSelect = []] - An array of keys to include in the resulting object.
 * @returns {Object} A new object containing only the specified keys from the input object.
 * @example
 * // Basic usage
 * const obj = { a: 1, b: 2, c: 3 };
 * const keysToSelect = ['a', 'c'];
 * const result = selectKeysFromObject(obj, keysToSelect);
 * console.log(result); // Output: { a: 1, c: 3 }
 *
 * // Handling non-existent keys
 * const obj2 = { x: 10, y: 20 };
 * const result2 = selectKeysFromObject(obj2, ['z']);
 * console.log(result2); // Output: {}
 *
 * // Selecting no keys
 * const result3 = selectKeysFromObject(obj2);
 * console.log(result3); // Output: {}
 * @note
 * - Time Complexity: O(k), where `k` is the number of keys to select. The function iterates through the array of keys.
 * - Space Complexity: O(n), where `n` is the size of the resulting object containing the selected keys.
 * - The function does not mutate the input object and ignores keys that do not exist in the object.
 */
function selectKeysFromObject(obj, keysToSelect = []) {
  return keysToSelect.reduce((acc, key) => {
    if (obj.hasOwnProperty(key)) {
        acc[key] = obj[key];
    };
    return acc;
  }, {});
};

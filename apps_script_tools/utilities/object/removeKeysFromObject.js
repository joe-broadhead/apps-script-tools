/**
 * @function removeKeysFromObject
 * @description Removes specified keys from an object and returns a new object without those keys. The original object remains unmodified.
 * @param {Object} obj - The input object from which keys should be removed.
 * @param {Array<String>} [keysToRemove = []] - An array of keys to remove from the object.
 * @returns {Object} A new object with the specified keys removed.
 * @example
 * // Basic usage
 * const obj = { a: 1, b: 2, c: 3 };
 * const keysToRemove = ['a', 'c'];
 * const result = removeKeysFromObject(obj, keysToRemove);
 * console.log(result); // Output: { b: 2 }
 *
 * // Removing non-existent keys
 * const obj2 = { x: 10, y: 20 };
 * const result2 = removeKeysFromObject(obj2, ['z']);
 * console.log(result2); // Output: { x: 10, y: 20 }
 * @note
 * - Time Complexity: O(k * m), where `k` is the number of keys to remove and `m` is the average size of the object during each iteration.
 * - Space Complexity: O(n), where `n` is the size of the resulting object. The new object excludes the specified keys.
 * - The function uses object destructuring and does not mutate the input object.
 */
function removeKeysFromObject(obj, keysToRemove = []) {
  return keysToRemove.reduce((acc, key) => {
    const { [key]: _, ...rest } = acc;
    return rest;
  }, obj);
};

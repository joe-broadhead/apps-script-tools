/**
 * @function renameKeysInObject
 * @description Renames the keys of an object based on a provided key mapping. If a key in the object exists in the `keyMap`,
 *              it is replaced by the corresponding value from the `keyMap`. Keys not in the `keyMap` are retained as-is.
 * @param {Object} obj - The input object whose keys need to be renamed.
 * @param {Object} keyMap - An object mapping existing keys to their new names.
 * @returns {Object} A new object with keys renamed according to the `keyMap`.
 * @example
 * // Renaming keys in an object
 * const data = { firstName: "John", lastName: "Doe" };
 * const keyMap = { firstName: "first_name", lastName: "last_name" };
 * console.log(renameKeysInObject(data, keyMap));
 * // Output: { first_name: "John", last_name: "Doe" }
 *
 * // Handling keys not in the keyMap
 * const partialKeyMap = { firstName: "first_name" };
 * console.log(renameKeysInObject(data, partialKeyMap));
 * // Output: { first_name: "John", lastName: "Doe" }
 *
 * // Empty keyMap
 * console.log(renameKeysInObject(data, {}));
 * // Output: { firstName: "John", lastName: "Doe" }
 *
 * @note
 * - Behavior:
 *   - Keys present in the `keyMap` are renamed to their mapped values.
 *   - Keys not present in the `keyMap` are retained as-is.
 *   - The function does not modify the input object; it returns a new object.
 * - Time Complexity: O(n), where `n` is the number of keys in the input object. Each key is processed once.
 * - Space Complexity: O(n), as a new object with the same number of keys is created.
 */
function renameKeysInObject(obj, keyMap) {
  return Object.entries(obj).reduce((newObj, [key, value]) => {
    const newKey = keyMap[key] || key;
    newObj[newKey] = value;
    return newObj;
  }, {});
};

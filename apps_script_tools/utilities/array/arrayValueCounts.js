/**
 * @function arrayValueCounts
 * @description Counts the occurrences of each unique value in an array. For objects, a serialized representation 
 *              (via JSON.stringify) is used to determine uniqueness. Handles mixed types by converting all values to strings.
 * @param {Array} array - The input array containing elements to be counted.
 * @returns {Object} An object where the keys are the unique elements (as strings) and the values are their counts in the array.
 * @example
 * // Example with primitives
 * const array = [1, 2, 2, 3, "a", "a", null];
 * console.log(arrayValueCounts(array));
 * // Output: { "1": 1, "2": 2, "3": 1, "a": 2, "null": 1 }
 *
 * // Example with objects
 * const arrayWithObjects = [{ id: 1 }, { id: 2 }, { id: 1 }];
 * console.log(arrayValueCounts(arrayWithObjects));
 * // Output: { '{"id":1}': 2, '{"id":2}': 1 }
 * @note
 * - Time Complexity: O(n * s), where `n` is the length of the array and `s` is the time to serialize each object (if any).
 * - Space Complexity: O(k), where `k` is the number of unique elements in the array.
 */
function arrayValueCounts(array) {
  return array.reduce((acc, value) => {
    let converted = (typeof value === "object" && value !== null) ? JSON.stringify(value) : String(value);
    acc[converted] = (acc[converted] || 0) + 1;
    return acc;
  }, {});
};
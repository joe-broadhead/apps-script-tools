/**
 * @function arrayUnique
 * @description Removes duplicate elements from an array. Handles both primitive values and objects. 
 *              Uniqueness is determined by a serialized representation of each element for objects and by direct comparison for primitives.
 * @param {Array} array - The input array containing elements to be filtered for uniqueness.
 * @returns {Array} A new array containing only unique elements from the input array.
 * @example
 * // Example with primitive values
 * const array = [1, 2, 2, 3, 4, 4];
 * console.log(arrayUnique(array)); // Output: [1, 2, 3, 4]
 *
 * // Example with objects
 * const arrayWithObjects = [{ id: 1 }, { id: 2 }, { id: 1 }];
 * console.log(arrayUnique(arrayWithObjects));
 * // Output: [{ id: 1 }, { id: 2 }]
 * @note
 * - Time Complexity: O(n * s), where `n` is the length of the array and `s` is the time to serialize each element (e.g., JSON.stringify for objects).
 * - Space Complexity: O(n), as the function uses a `Map` to track seen elements.
 */
function arrayUnique(array) {
  const seen = new Map();
  return array.filter(item => {
    const key = typeof item === "object" ? JSON.stringify(item) : item;
    if (!seen.has(key)) {
      seen.set(key, true);
      return true;
    }
    return false;
  });
};

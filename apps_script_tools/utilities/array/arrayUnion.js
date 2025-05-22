/**
 * @function arrayUnion
 * @description Combines two arrays into a single array. Optionally ensures distinct elements, where distinctness
 *              is determined by a serialized representation of each element. Supports objects and primitives.
 * @param {Array} arrayA - The first array.
 * @param {Array} arrayB - The second array.
 * @param {Boolean} [distinct = false] - If `true`, ensures the resulting array contains only unique elements.
 * @returns {Array} A new array containing the union of `arrayA` and `arrayB`.
 * @example
 * // Example without distinct elements
 * const arrayA = [1, 2, 3];
 * const arrayB = [3, 4, 5];
 * console.log(arrayUnion(arrayA, arrayB)); // Output: [1, 2, 3, 3, 4, 5]
 *
 * // Example with distinct elements
 * console.log(arrayUnion(arrayA, arrayB, true)); // Output: [1, 2, 3, 4, 5]
 *
 * // Example with objects and distinct
 * const arrayC = [{ id: 1 }, { id: 2 }];
 * const arrayD = [{ id: 2 }, { id: 3 }];
 * console.log(arrayUnion(arrayC, arrayD, true));
 * // Output: [{ id: 1 }, { id: 2 }, { id: 3 }]
 * @note
 * - Time Complexity:
 *   - Without `distinct`: O(n + m), where `n` is the length of `arrayA` and `m` is the length of `arrayB`.
 *   - With `distinct`: O((n + m) * s), where `s` is the time to serialize each element (e.g., JSON.stringify).
 *   - Space Complexity:
 *   - Without `distinct`: O(n + m), for the combined array.
 *   - With `distinct`: O(n + m), plus additional memory for the `Map` to track uniqueness.
 */
function arrayUnion(arrayA, arrayB, distinct = false) {
  if (!distinct) {
    return [...arrayA, ...arrayB];
  }

  const seen = new Map();
  const result = [];

  [...arrayA, ...arrayB].forEach(item => {
    const serialized = JSON.stringify(item);
    if (!seen.has(serialized)) {
      seen.set(serialized, true);
      result.push(item); // Add the original item (not the serialized version)
    }
  });

  return result;
};

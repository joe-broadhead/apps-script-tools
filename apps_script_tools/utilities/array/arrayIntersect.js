/**
 * @function arrayIntersect
 * @description Computes the intersection of two arrays. Returns elements that are present in both arrays.
 *              Handles both primitive and object elements by serializing objects for comparison.
 * @param {Array} arrayA - The first array.
 * @param {Array} arrayB - The second array.
 * @returns {Array} A new array containing elements present in both `arrayA` and `arrayB`.
 * @example
 * // Example with primitives
 * const arrayA = [1, 2, 3, 4];
 * const arrayB = [2, 4, 6];
 * console.log(arrayIntersect(arrayA, arrayB)); // Output: [2, 4]
 *
 * // Example with objects
 * const arrayA = [{ id: 1 }, { id: 2 }, { id: 3 }];
 * const arrayB = [{ id: 2 }, { id: 4 }];
 * console.log(arrayIntersect(arrayA, arrayB)); // Output: [{ id: 2 }]
 * @note
 * - Time Complexity: O(n + m), where `n` is the length of `arrayA` and `m` is the length of `arrayB`.
 *   Building the hash map from `arrayA` takes O(n), and filtering `arrayB` takes O(m).
 * - Space Complexity: O(n), as the hash map stores elements from `arrayA`.
 */
function arrayIntersect(arrayA, arrayB) {
  const hashMap = arrayA.reduce((output, elem) => {
    const key = typeof elem === "object" ? JSON.stringify(elem) : elem;
    output[key] = true;
    return output;
  }, {});
  return arrayB.filter(elem => {
    const key = typeof elem === "object" ? JSON.stringify(elem) : elem;
    return hashMap[key];
  });
};

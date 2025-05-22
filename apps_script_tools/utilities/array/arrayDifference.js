/**
 * @function arrayDifference
 * @description Computes the difference between two arrays (`arrayA` - `arrayB`). It returns elements from `arrayA`
 *              that are not present in `arrayB`. Handles both primitive and object elements by serializing objects
 *              for comparison.
 * @param {Array} arrayA - The array from which elements will be filtered.
 * @param {Array} arrayB - The array containing elements to exclude from `arrayA`.
 * @returns {Array} A new array containing elements from `arrayA` that are not present in `arrayB`.
 * @example
 * // Example with primitives
 * const arrayA = [1, 2, 3, 4];
 * const arrayB = [2, 4];
 * console.log(arrayDifference(arrayA, arrayB)); // Output: [1, 3]
 *
 * // Example with objects
 * const arrayA = [{ id: 1 }, { id: 2 }, { id: 3 }];
 * const arrayB = [{ id: 2 }];
 * console.log(arrayDifference(arrayA, arrayB)); // Output: [{ id: 1 }, { id: 3 }]
 * @note
 * - Time Complexity: O(n + m), where `n` is the length of `arrayA` and `m` is the length of `arrayB`. The creation
 *   of the `hashMap` from `arrayB` takes O(m), and filtering `arrayA` takes O(n).
 * - Space Complexity: O(m), where `m` is the size of `arrayB`, as a hash map is created to store its elements.
 */
function arrayDifference(arrayA, arrayB) {
  const serialize = elem => typeof elem === "object" ? JSON.stringify(elem) : elem;
  const hashMap = arrayB.reduce((output, elem) => {
    const key = serialize(elem);
    output[key] = true;
    return output;
  }, {});
  return arrayA.filter(elem => {
    const key = serialize(elem);
    return !hashMap[key];
  });
};

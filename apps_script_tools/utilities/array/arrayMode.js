/**
 * @function arrayMode
 * @description Finds the mode (most frequent value) of an array. If multiple values have the same highest frequency,
 *              the first encountered value with that frequency is returned.
 * @param {Array} array - The input array containing numeric, string, or mixed values.
 * @returns {*} The mode of the array, or `undefined` if the array is empty.
 * @example
 * // Example with numeric values
 * const array = [1, 2, 2, 3, 3, 3];
 * console.log(arrayMode(array)); // Output: 3
 *
 * // Example with mixed values
 * const mixedArray = ["a", "b", "a", "c", "b", "b"];
 * console.log(arrayMode(mixedArray)); // Output: "b"
 *
 * // Example with an empty array
 * const emptyArray = [];
 * console.log(arrayMode(emptyArray)); // Output: undefined
 * @note
 * - Time Complexity: O(n), where `n` is the length of the input array. Each element is processed once to build the frequency map.
 * - Space Complexity: O(k), where `k` is the number of unique elements in the array. The frequency map stores a count for each unique value.
 */
function arrayMode(array) {
  const frequency = {};
  let maxCount = 0;
  let mode = undefined;

  for (const value of array) {
    frequency[value] = (frequency[value] || 0) + 1;

    if (frequency[value] > maxCount) {
      maxCount = frequency[value];
      mode = value;
    };
  };

  return mode;
};

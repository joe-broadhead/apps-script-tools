/**
 * @function arrayMedian
 * @description Computes the median of an array, ignoring invalid values such as `null`, `undefined`, or non-numeric values.
 *              The median is the middle value in a sorted list, or the average of the two middle values if the list has an even number of elements.
 * @param {Array} array - The input array containing numeric or mixed values.
 * @returns {Number|Null} The median of the valid numeric values in the array, or `null` if there are no valid numbers.
 * @example
 * const array = [3, null, 1, 2, "4", undefined];
 * console.log(arrayMedian(array)); // Output: 2.5 (valid numbers are [1, 2, 3, 4], median is (2+3)/2)
 *
 * const emptyArray = [];
 * console.log(arrayMedian(emptyArray)); // Output: null
 *
 * const oddArray = [5, 1, 9];
 * console.log(arrayMedian(oddArray)); // Output: 5 (valid numbers are [1, 5, 9], median is 5)
 * @see normalizeValues
 * @note
 * - Time Complexity: O(n log n), where `n` is the number of valid elements in the array. Sorting the valid numbers dominates the time complexity.
 * - Space Complexity: O(n), where `n` is the number of valid elements, as a new array is created to store them.
 */
function arrayMedian(array) {
  const validNumbers = array.reduce((acc, value) => {
    const num = normalizeValues(value);
    if (num !== null) {
      acc.push(num);
    };
    return acc;
  }, []);

  const count = validNumbers.length;
  if (count === 0) return null;

  validNumbers.sort((a, b) => a - b);

  const mid = Math.floor(count / 2);
  return count % 2 === 0
    ? (validNumbers[mid - 1] + validNumbers[mid]) / 2 // Even length: Average of two middle values
    : validNumbers[mid]; // Odd length: Middle value
};

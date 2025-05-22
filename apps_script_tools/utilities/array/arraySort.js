/**
 * @function arraySort
 * @description Sorts an array in ascending or descending order. Handles mixed data types (e.g., numbers and strings)
 *              and separates `null` or `undefined` values, placing them at the end for ascending order or at the beginning
 *              for descending order. Supports an optional custom comparator.
 * @param {Array} array - The input array to be sorted.
 * @param {Boolean} [ascending = true] - Determines the sorting order. If `true`, sorts in ascending order; otherwise, descending.
 * @param {Function|Null} [compareFunction = null] - An optional comparator function. Receives two arguments and should return:
 *   - A negative number if the first argument is less than the second.
 *   - Zero if the first argument is equal to the second.
 *   - A positive number if the first argument is greater than the second.
 * @returns {Array} A new array sorted as specified.
 * @example
 * const array = [3, null, 1, 2, "a", undefined, "b"];
 *
 * // Default ascending order
 * console.log(arraySort(array)); // Output: [1, 2, 3, "a", "b", null, undefined]
 *
 * // Descending order
 * console.log(arraySort(array, false)); // Output: [null, undefined, "b", "a", 3, 2, 1]
 *
 * // Custom sorting (case-insensitive for strings)
 * const customSort = (a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' });
 * console.log(arraySort(array, true, customSort)); // Output: [1, 2, 3, "a", "b", null, undefined]
 * @note
 * - Time Complexity: O(n log n), where `n` is the number of non-null elements in the array. Sorting dominates the complexity.
 * - Space Complexity: O(n), as two arrays are created to separate `null`/`undefined` values and non-null values.
 */
function arraySort(array, ascending = true, compareFunction = null) {
  const nullValues = array.filter(value => value == null);
  const nonNullValues = array.filter(value => value != null);

  const comparator = (a, b) => {
    const typeA = typeof a;
    const typeB = typeof b;

    // Mixed types: Numbers come before strings
    if (typeA !== typeB) {
      if (typeA === 'number') return ascending ? -1 : 1;
      if (typeB === 'number') return ascending ? 1 : -1;
    }

    if (compareFunction) {
      return ascending ? compareFunction(a, b) : compareFunction(b, a);
    }

    // Default sorting (string or numeric)
    if (a < b) return ascending ? -1 : 1;
    if (a > b) return ascending ? 1 : -1;
    return 0;
  };

  // Sort non-null values
  nonNullValues.sort(comparator);

  // Merge null values back
  return ascending
    ? [...nonNullValues, ...nullValues] // Nulls last for ascending
    : [...nullValues, ...nonNullValues]; // Nulls first for descending
};

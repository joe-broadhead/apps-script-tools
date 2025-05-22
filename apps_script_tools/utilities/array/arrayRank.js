/**
 * @function arrayRank
 * @description Computes the rank of each element in an array. Supports different ranking methods, including:
 *              - `'dense'`: Consecutive ranks are assigned, skipping no numbers for ties.
 *              - `'standard'`: Average ranks are assigned to tied values.
 *              Custom sorting is supported through an optional `customSortFunction`.
 * @param {Array} array - The input array containing numeric or mixed values.
 * @param {String} [method = 'dense'] - The ranking method. Must be either `'dense'` or `'standard'`.
 * @param {Function} [customSortFunction = null] - An optional custom comparator for sorting the elements.
 *                                              Receives two arguments and should return a value < 0, 0, or > 0.
 * @returns {Array<Number>} An array of ranks corresponding to the elements in the input array.
 * @throws {Error} If an invalid ranking method is specified.
 * @example
 * // Example with dense ranking
 * const array = [30, 10, 20, 20, 40];
 * console.log(arrayRank(array, 'dense')); // Output: [3, 1, 2, 2, 4]
 *
 * // Example with standard ranking
 * console.log(arrayRank(array, 'standard')); // Output: [4, 1, 2.5, 2.5, 5]
 *
 * // Example with custom sorting
 * const customSort = (a, b) => b - a; // Descending order
 * console.log(arrayRank(array, 'dense', customSort)); // Output: [2, 5, 3, 3, 1]
 * @see arraySort
 * @note
 * - Time Complexity: O(n log n), where `n` is the length of the input array. Sorting dominates the complexity.
 * - Space Complexity: O(n), as additional arrays are created for sorted indices and ranks.
 */
function arrayRank(array, method = 'dense', customSortFunction = null) {

  const sortedIndices = arraySort(
    array.map((_, index) => index),
    true,
    customSortFunction
      ? (a, b) => customSortFunction(array[a], array[b])
      : (a, b) => array[a] - array[b]
  );

  const ranks = Array(array.length).fill(null);
  let rank = 1;

  switch (method) {
    case 'standard': {
      let tieStart = 0;
      for (let i = 0; i <= sortedIndices.length; i++) {
        if (i === sortedIndices.length || (i > 0 && array[sortedIndices[i]] !== array[sortedIndices[i - 1]])) {
          // Resolve ties: average the ranks of tied values
          const tieCount = i - tieStart;
          const averageRank = (rank + rank + tieCount - 1) / 2;
          for (let j = tieStart; j < i; j++) {
            ranks[sortedIndices[j]] = averageRank;
          };
          rank += tieCount;
          tieStart = i;
        };
      };
      break;
    };

    case 'dense': {
      for (let i = 0; i < sortedIndices.length; i++) {
        const currentIndex = sortedIndices[i];
        if (i > 0 && array[currentIndex] !== array[sortedIndices[i - 1]]) {
          rank++;
        };
        ranks[currentIndex] = rank;
      };
      break;
    };

    default:
      throw new Error("Invalid ranking method. Use 'standard' or 'dense'.");
  };

  return ranks;
};

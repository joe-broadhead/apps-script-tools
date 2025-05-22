/**
 * @function arrayTranspose
 * @description Transposes a 2D array (matrix), switching rows with columns. Ensures that the input array is a 
 *              non-jagged matrix where all rows have the same length.
 * @param {Array<Array>} array - The 2D array to transpose.
 * @returns {Array<Array>} A new 2D array that is the transpose of the input array.
 * @throws {Error} If the input array is not a non-jagged matrix (i.e., rows have unequal lengths).
 * @example
 * // Example with a square matrix
 * const array = [
 *   [1, 2, 3],
 *   [4, 5, 6],
 *   [7, 8, 9],
 * ];
 * console.log(arrayTranspose(array));
 * // Output:
 * // [
 * //   [1, 4, 7],
 * //   [2, 5, 8],
 * //   [3, 6, 9],
 * // ]
 *
 * // Example with a rectangular matrix
 * const array = [
 *   [1, 2],
 *   [3, 4],
 *   [5, 6],
 * ];
 * console.log(arrayTranspose(array));
 * // Output:
 * // [
 * //   [1, 3, 5],
 * //   [2, 4, 6],
 * // ]
 *
 * @note
 * - Time Complexity: O(n * m), where `n` is the number of rows and `m` is the number of columns in the input array.
 * - Space Complexity: O(n * m), as a new 2D array of the same size is created for the transpose.
 */
function arrayTranspose(array) {
  if (array.length === 0) return [];

  const rowLength = array[0].length;
  if (!array.every(row => row.length === rowLength)) {
    throw new Error("Input array must be a non-jagged matrix where all rows have the same length.");
  }

  return array[0].map((_, index) => array.map(row => row[index]));
};

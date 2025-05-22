/**
 * @function arrayLen
 * @description Returns the length of the provided array. This is a simple wrapper around the `Array.prototype.length` property.
 * @param {Array} array - The input array whose length will be returned.
 * @returns {Number} The length of the input array.
 * @example
 * const array = [1, 2, 3, 4];
 * console.log(arrayLen(array)); // Output: 4
 * @note
 * - Time Complexity: O(1), as accessing the `length` property of an array is a constant-time operation.
 * - Space Complexity: O(1), as no additional memory is used apart from the return value.
 */
function arrayLen(array) {
  return array.length;
};

/**
 * @function arrayApply
 * @description Applies a sequence of functions with arguments to each element of an array. Each function in the sequence
 *              transforms the value before passing it to the next function in the sequence. This method is useful for 
 *              chaining transformations on array elements.
 * @param {Array} array - The array whose elements will be transformed.
 * @param {Array<Array>} [funcsWithArgs = []] - An array of tuples, where each tuple contains:
 *   - The first element: A function to apply to the value.
 *   - Remaining elements: Arguments to pass to the function.
 * @returns {Array} A new array with the transformed elements.
 * @example
 * const array = [1, 2, 3];
 * const transformations = [
 *   [x => x + 1],              // Increment each element by 1
 *   [(x, factor) => x * factor, 2] // Multiply each element by 2
 * ];
 * const result = arrayApply(array, transformations);
 * console.log(result); // Output: [4, 6, 8]
 * @note
 * - Time Complexity: O(n * m), where `n` is the length of the input array, and `m` is the number of functions in `funcsWithArgs`.
 * - Space Complexity: O(n), where `n` is the size of the input array (the output array occupies the same space).
 */
function arrayApply(array, funcsWithArgs = []) {
  return array.map(value => {
    funcsWithArgs.forEach(([func, ...args]) => {
      value = func(value, ...args);
    });
    return value;
  });
};
